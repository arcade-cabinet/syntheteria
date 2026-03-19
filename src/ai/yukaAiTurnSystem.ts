/**
 * Yuka-based AI turn system — replaces the ad-hoc GOAP in aiTurnSystem.ts.
 *
 * Flow per turn:
 * 1. Snapshot all AI units from ECS → AgentSnapshots
 * 2. Sync or create SyntheteriaAgent per unit via AIRuntime
 * 3. Prune agents for dead entities
 * 4. Update faction perception (scan for enemies, record sightings)
 * 5. Build TurnContext with fuzzy-modulated scores
 * 6. Call agent.arbitrate() → each agent's Think brain picks the best evaluator
 * 7. Read decidedAction from each agent → write back as ECS components
 * 8. Refresh AI AP
 */

import type { World } from "koota";
import { playSfx } from "../audio/sfx";
import type { GeneratedBoard } from "../board/types";
import { BUILDING_DEFS } from "../ecs/buildings/definitions";
import { getRelation } from "../ecs/factions/relations";
import { TRACK_REGISTRY } from "../ecs/robots/specializations/trackRegistry";
import type { RobotClass } from "../ecs/robots/types";
import { queueFabrication } from "../ecs/systems/fabricationSystem";
import { getPopCap, getPopulation } from "../ecs/systems/populationSystem";
import { getResearchState } from "../ecs/systems/researchSystem";
import { canAfford, spendResources } from "../ecs/systems/resourceSystem";
import { TileFloor } from "../ecs/terrain/traits";
import type { ResourceMaterial } from "../ecs/terrain/types";
import { Board } from "../ecs/traits/board";
import {
	BotFabricator,
	Building,
	type BuildingType,
	Powered,
	PowerGrid,
	StorageCapacity,
} from "../ecs/traits/building";
import { Faction } from "../ecs/traits/faction";
import { ResourceDeposit, ResourcePool } from "../ecs/traits/resource";
import { Tile } from "../ecs/traits/tile";
import {
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMine,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../ecs/traits/unit";
import type { Difficulty } from "../world/config";
import type { AgentSnapshot } from "./agents/SyntheteriaAgent";
import { assessSituationFuzzy } from "./fuzzy/situationModule";
import {
	type BuildOption,
	isAIDiagnosticsEnabled,
	logEvaluatorChoice,
	setTurnContext,
	type TurnContext,
} from "./goals/evaluators";
import {
	clearNavGraphCache,
	getOrBuildNavGraph,
	sphereManhattan,
	yukaShortestPath,
} from "./navigation/boardNavGraph";
import {
	getFactionMemory,
	resetAllFactionMemories,
	updateFactionPerception,
} from "./perception/factionMemory";
import {
	type FactionBiasOverride,
	getFactionFSM,
	resetFactionFSMs,
} from "./fsm/FactionFSM";
import { AIRuntime } from "./runtime/AIRuntime";
import { pickAITrack, pickAITrackVersion } from "./trackSelection";
import { resetAllTerritoryTrackers } from "./triggers/territoryTrigger";

// ---------------------------------------------------------------------------
// Module-level runtime — persists across turns within a game session
// ---------------------------------------------------------------------------

let _runtime = new AIRuntime();

/** Reset the AI runtime (call on new game). */
export function resetAIRuntime(): void {
	_runtime.clear();
	_runtime = new AIRuntime();
	resetAllFactionMemories();
	resetAllTerritoryTrackers();
	resetFactionFSMs();
	clearNavGraphCache();
}

/** Get the current runtime (for testing). */
export function getAIRuntime(): AIRuntime {
	return _runtime;
}

// ---------------------------------------------------------------------------
// Difficulty → aggression multiplier
// ---------------------------------------------------------------------------

const DIFFICULTY_AGGRESSION_MULT: Record<Difficulty, number> = {
	story: 0.5,
	standard: 1,
	hard: 2,
};

function readDifficulty(world: World): Difficulty {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.difficulty;
	}
	return "standard";
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function runYukaAiTurns(world: World, board: GeneratedBoard): void {
	const difficulty = readDifficulty(world);
	const aggressionMult = DIFFICULTY_AGGRESSION_MULT[difficulty];

	// ── Step 1: Snapshot all AI units ────────────────────────────────────
	const snapshots: AgentSnapshot[] = [];
	const liveIds = new Set<number>();

	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const faction = e.get(UnitFaction);
		const pos = e.get(UnitPos);
		const stats = e.get(UnitStats);
		if (!faction || !pos || !stats) continue;
		if (faction.factionId === "player") continue;
		// Cult factions use their own patrol system (cultistSystem.ts), not GOAP
		if (isCultFactionId(faction.factionId)) continue;
		if (stats.ap <= 0 && stats.mp <= 0) continue;

		const snap: AgentSnapshot = {
			entityId: e.id(),
			factionId: faction.factionId,
			tileX: pos.tileX,
			tileZ: pos.tileZ,
			hp: stats.hp,
			ap: stats.ap,
			maxAp: stats.maxAp,
			mp: stats.mp,
			maxMp: stats.maxMp,
			scanRange: stats.scanRange,
			attackRange: stats.attackRange,
			attack: stats.attack,
			defense: stats.defense,
		};
		snapshots.push(snap);
		liveIds.add(e.id());
	}

	// ── Step 2+3: Sync agents, prune dead ───────────────────────────────
	for (const snap of snapshots) {
		_runtime.getOrCreateAgent(snap);
	}
	_runtime.pruneStaleAgents(liveIds);

	if (snapshots.length === 0) return;

	// Read current turn number
	let currentTurn = 1;
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) {
			currentTurn = b.turn;
			break;
		}
	}

	// ── Step 4: Build enemy/deposit lists + NavGraph ────────────────────
	const enemies: TurnContext["enemies"] = [];
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const f = e.get(UnitFaction);
		const p = e.get(UnitPos);
		if (!f || !p) continue;
		enemies.push({
			entityId: e.id(),
			x: p.tileX,
			z: p.tileZ,
			factionId: f.factionId,
		});
	}

	const deposits: TurnContext["deposits"] = [];
	for (const e of world.query(ResourceDeposit)) {
		const dep = e.get(ResourceDeposit);
		if (!dep || dep.depleted) continue;
		deposits.push({ entityId: e.id(), x: dep.tileX, z: dep.tileZ });
	}

	const boardCenter = {
		x: Math.floor(board.config.width / 2),
		z: Math.floor(board.config.height / 2),
	};

	// Build NavGraph (cached per board)
	const navGraph = getOrBuildNavGraph(board);

	// ── Step 5: Arbitrate per-faction with perception + fuzzy ───────────
	const entityById = new Map<number, ReturnType<World["query"]>[number]>();
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		entityById.set(e.id(), e);
	}

	// Group agents by faction
	const agentsByFaction = new Map<string, AgentSnapshot[]>();
	for (const snap of snapshots) {
		let list = agentsByFaction.get(snap.factionId);
		if (!list) {
			list = [];
			agentsByFaction.set(snap.factionId, list);
		}
		list.push(snap);
	}

	for (const [factionId, factionSnapshots] of agentsByFaction) {
		// Filter enemies: exclude own faction and allies
		const factionEnemies = enemies.filter((e) => {
			if (e.factionId === factionId) return false;
			if (getRelation(world, factionId, e.factionId) === "ally") return false;
			return true;
		});

		// ── Perception: update memory with visible enemies ──────────
		const myUnits = factionSnapshots.map((s) => ({
			tileX: s.tileX,
			tileZ: s.tileZ,
			scanRange: s.scanRange,
		}));
		const enemiesForPerception = factionEnemies.map((e) => ({
			entityId: e.entityId,
			factionId: e.factionId,
			tileX: e.x,
			tileZ: e.z,
		}));
		updateFactionPerception(
			factionId,
			myUnits,
			enemiesForPerception,
			currentTurn,
		);

		// ── Fuzzy scoring: modulate aggression with situation ────────
		const factionResources = getFactionResourceScore(world, factionId);
		const nearestEnemyDist = getNearestEnemyDist(
			factionSnapshots,
			factionEnemies,
			board.config.width,
			navGraph.wrapX,
		);
		const territoryPct = 0; // Territory tracking is opt-in, default 0
		const fuzzyScores = assessSituationFuzzy(
			factionResources,
			nearestEnemyDist,
			territoryPct,
		);

		// Fuzzy attack desirability modulates the aggression multiplier
		// Scale from 0-100 fuzzy score to 0.5-1.5 multiplier
		const fuzzyAttackMod = 0.5 + fuzzyScores.attackDesirability / 100;
		const effectiveAggressionMult = aggressionMult * fuzzyAttackMod;

		// ── Build context: buildings, affordability, placement ──────────
		const factionBuildings = getFactionBuildings(world, factionId);
		const factionBuildingCount = factionBuildings.length;
		const motorPoolCount = factionBuildings.filter(
			(b) => b.buildingType === "motor_pool",
		).length;
		const occupiedTiles = new Set(
			factionBuildings.map((b) => `${b.tileX},${b.tileZ}`),
		);
		// Also mark ALL buildings (not just this faction) as occupied
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b) occupiedTiles.add(`${b.tileX},${b.tileZ}`);
		}

		const buildOptions = computeBuildOptions(
			world,
			factionId,
			factionSnapshots,
			board,
			occupiedTiles,
			navGraph.wrapX,
		);

		// Compute faction center (centroid of owned units)
		let fcX = 0;
		let fcZ = 0;
		for (const s of factionSnapshots) {
			fcX += s.tileX;
			fcZ += s.tileZ;
		}
		const factionCenter = {
			x: Math.round(fcX / factionSnapshots.length),
			z: Math.round(fcZ / factionSnapshots.length),
		};

		// Remembered enemies from perception memory (not currently visible)
		const factionMem = getFactionMemory(factionId);
		const rememberedEnemies = factionMem
			.getRememberedRecords(currentTurn)
			.map((r) => ({
				entityId: r.entityId,
				x: r.tileX,
				z: r.tileZ,
				factionId: r.factionId,
			}));

		// Scan for mineable tiles near faction units
		const mineableTiles = findMineableTilesNearUnits(
			world,
			factionSnapshots,
			board.config.width,
			navGraph.wrapX,
		);

		// Population data for build priority decisions
		const unitCount = getPopulation(world, factionId);
		const popCap = getPopCap(world, factionId);

		// Cult threat positions (for EvadeEvaluator)
		const cultThreats: Array<{ x: number; z: number }> = [];
		const factionAllies: Array<{ x: number; z: number }> = [];
		for (const e of enemies) {
			if (isCultFactionId(e.factionId)) {
				cultThreats.push({ x: e.x, z: e.z });
			} else if (e.factionId === factionId) {
				factionAllies.push({ x: e.x, z: e.z });
			}
		}
		// Also add own faction snapshots as allies
		for (const s of factionSnapshots) {
			factionAllies.push({ x: s.tileX, z: s.tileZ });
		}

		// Set context for this faction's evaluators
		setTurnContext({
			enemies: factionEnemies,
			deposits,
			boardCenter,
			boardSize: { width: board.config.width, height: board.config.height },
			aggressionMult: effectiveAggressionMult,
			buildOptions,
			factionBuildingCount,
			motorPoolCount,
			totalDeposits: deposits.length,
			currentTurn,
			rememberedEnemies,
			factionCenter,
			mineableTiles,
			unitCount,
			popCap,
			cultThreats,
			factionAllies,
		});

		// ── Faction FSM: macro strategy bias overrides ──────────────
		const nearbyThreats = countNearbyThreats(
			factionBuildings,
			[...factionEnemies, ...cultThreats.map((c) => ({ ...c, entityId: 0, factionId: "" }))],
		);
		const enemyFactionContacted =
			factionEnemies.some((e) => !isCultFactionId(e.factionId)) ||
			rememberedEnemies.some((e) => !isCultFactionId(e.factionId));

		const fsm = getFactionFSM(factionId);
		const fsmBias = fsm.update({
			currentTurn,
			unitCount,
			popCap,
			nearbyThreats,
			enemyFactionContacted,
			territoryPct: 0, // Territory tracking is opt-in
			buildingCount: factionBuildingCount,
			motorPoolCount,
		});

		// Arbitrate each agent in this faction
		// Evaluators are added in order: attack, chase, harvest, expand, build, scout, floorMine, evade, idle
		// Map FSM bias keys to evaluator indices (floorMine uses harvest bias)
		const evalBiasMap = [
			"attack", "chase", "harvest", "expand",
			"build", "scout", "harvest", "evade", "idle",
		] as const;

		for (const snap of factionSnapshots) {
			const agent = _runtime.getOrCreateAgent(snap);

			// Save original biases, apply FSM overrides
			const origBiases: number[] = [];
			for (let i = 0; i < agent.brain.evaluators.length; i++) {
				const ev = agent.brain.evaluators[i];
				origBiases.push(ev.characterBias);
				const biasKey = evalBiasMap[i] ?? "idle";
				ev.characterBias *= fsmBias[biasKey];
			}

			agent.arbitrate();

			// Restore original biases so they stay stable across turns
			for (let i = 0; i < agent.brain.evaluators.length; i++) {
				agent.brain.evaluators[i].characterBias = origBiases[i];
			}

			// Diagnostic logging — shows which evaluator won for each unit
			if (isAIDiagnosticsEnabled()) {
				logEvaluatorChoice(agent, agent.brain.evaluators);
			}

			const entity = entityById.get(snap.entityId);
			if (!entity || !agent.decidedAction) continue;

			const action = agent.decidedAction;
			switch (action.type) {
				case "attack": {
					if (!entity.has(UnitAttack)) {
						entity.add(
							UnitAttack({
								targetEntityId: action.targetEntityId,
								damage: action.damage,
							}),
						);
					}
					break;
				}
				case "move": {
					if (!entity.has(UnitMove)) {
						moveToward(
							entity,
							snap.tileX,
							snap.tileZ,
							action.toX,
							action.toZ,
							board,
						);
					}
					break;
				}
				case "harvest": {
					if (!entity.has(UnitHarvest)) {
						entity.add(
							UnitHarvest({
								depositEntityId: action.depositEntityId,
								ticksRemaining: 3,
								totalTicks: 3,
								targetX: action.targetX,
								targetZ: action.targetZ,
							}),
						);
					}
					break;
				}
				case "build": {
					executeAiBuild(
						world,
						factionId,
						action.buildingType as BuildingType,
						action.tileX,
						action.tileZ,
					);
					break;
				}
				case "mine": {
					if (!entity.has(UnitMine)) {
						const tileFloor = findTileFloorAt(
							world,
							action.targetX,
							action.targetZ,
						);
						if (tileFloor && tileFloor.mineable && tileFloor.hardness > 0) {
							entity.add(
								UnitMine({
									targetX: action.targetX,
									targetZ: action.targetZ,
									ticksRemaining: tileFloor.hardness,
									totalTicks: tileFloor.hardness,
								}),
							);
						}
					}
					break;
				}
				case "idle":
				default:
					break;
			}
		}
	}

	// ── Step 6b: AI fabrication — queue units at idle motor pools ────────
	runAiFabrication(world, [...agentsByFaction.keys()]);

	// ── Step 7: Refresh AI AP ───────────────────────────────────────────
	for (const e of world.query(UnitFaction, UnitStats)) {
		const faction = e.get(UnitFaction);
		const stats = e.get(UnitStats);
		if (!faction || !stats) continue;
		if (faction.factionId !== "player") {
			e.set(UnitStats, { ...stats, ap: stats.maxAp, mp: stats.maxMp });
		}
	}
}

// ---------------------------------------------------------------------------
// Movement helper — uses Yuka NavGraph A* when available, falls back to manual
// ---------------------------------------------------------------------------

function moveToward(
	entity: ReturnType<World["query"]>[number],
	fromX: number,
	fromZ: number,
	targetX: number,
	targetZ: number,
	board: GeneratedBoard,
): void {
	// Try Yuka NavGraph pathfinding first
	const navGraph = getOrBuildNavGraph(board);
	const path = yukaShortestPath(fromX, fromZ, targetX, targetZ, navGraph);

	if (path.length >= 2) {
		const next = path[1];
		entity.add(
			UnitMove({
				fromX,
				fromZ,
				toX: next.x,
				toZ: next.z,
				progress: 0,
				mpCost: 1,
			}),
		);
	}
}

// ---------------------------------------------------------------------------
// Helpers for fuzzy scoring
// ---------------------------------------------------------------------------

/**
 * Get a normalized resource score (0-100) for a faction.
 * Based on total stockpile across all resource types.
 */
function getFactionResourceScore(world: World, factionId: string): number {
	for (const e of world.query(Faction, ResourcePool)) {
		const f = e.get(Faction);
		const r = e.get(ResourcePool);
		if (f?.id === factionId && r) {
			const total =
				r.scrap_metal +
				r.ferrous_scrap +
				r.alloy_stock +
				r.polymer_salvage +
				r.conductor_wire +
				r.electrolyte +
				r.silicon_wafer +
				r.storm_charge +
				r.el_crystal +
				r.e_waste +
				r.intact_components +
				r.thermal_fluid +
				r.depth_salvage;
			// Normalize: 0 resources = 0, 200+ = 100
			return Math.min(100, (total / 200) * 100);
		}
	}
	return 50; // Default if no faction entity found
}

/**
 * Get Manhattan distance to nearest enemy from any faction unit.
 * Sphere-aware: wraps X axis when wrapX is true.
 */
function getNearestEnemyDist(
	myUnits: AgentSnapshot[],
	enemies: TurnContext["enemies"],
	boardWidth = 0,
	wrapX = false,
): number {
	if (myUnits.length === 0 || enemies.length === 0) return 30;
	let minDist = 30;
	for (const unit of myUnits) {
		for (const enemy of enemies) {
			const dist = sphereManhattan(
				unit.tileX,
				unit.tileZ,
				enemy.x,
				enemy.z,
				boardWidth,
				wrapX,
			);
			if (dist < minDist) minDist = dist;
		}
	}
	return minDist;
}

// ---------------------------------------------------------------------------
// AI Building helpers
// ---------------------------------------------------------------------------

/** Building types the AI is allowed to construct (excludes wormhole_stabilizer). */
const AI_BUILDABLE: BuildingType[] = [
	"motor_pool",
	"storage_hub",
	"storm_transmitter",
	"defense_turret",
	"relay_tower",
	"outpost",
	"power_box",
];

interface FactionBuildingInfo {
	buildingType: BuildingType;
	tileX: number;
	tileZ: number;
}

/** Get all buildings owned by a faction. */
function getFactionBuildings(
	world: World,
	factionId: string,
): FactionBuildingInfo[] {
	const result: FactionBuildingInfo[] = [];
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) {
			result.push({
				buildingType: b.buildingType as BuildingType,
				tileX: b.tileX,
				tileZ: b.tileZ,
			});
		}
	}
	return result;
}

/**
 * Compute which buildings the AI can afford and where to place them.
 * Finds a passable, unoccupied tile near the faction's units.
 */
function computeBuildOptions(
	world: World,
	factionId: string,
	units: AgentSnapshot[],
	board: GeneratedBoard,
	occupiedTiles: Set<string>,
	wrapX = false,
): BuildOption[] {
	const options: BuildOption[] = [];

	for (const type of AI_BUILDABLE) {
		const def = BUILDING_DEFS[type];
		if (!canAfford(world, factionId, def.buildCost)) continue;

		// Find a placement tile near one of this faction's units
		const tile = findBuildTileNearUnits(units, board, occupiedTiles, wrapX);
		if (tile) {
			options.push({
				buildingType: type,
				tileX: tile.x,
				tileZ: tile.z,
			});
		}
	}

	return options;
}

/** Find a passable, unoccupied tile near any of the faction's units. */
function findBuildTileNearUnits(
	units: AgentSnapshot[],
	board: GeneratedBoard,
	occupied: Set<string>,
	wrapX = false,
): { x: number; z: number } | null {
	const { width, height } = board.config;

	for (const unit of units) {
		// Search in expanding radius around this unit
		for (let r = 1; r <= 3; r++) {
			for (let dx = -r; dx <= r; dx++) {
				for (let dz = -r; dz <= r; dz++) {
					let x = unit.tileX + dx;
					const z = unit.tileZ + dz;
					// Wrap X on sphere (longitude wraps east-west)
					if (wrapX) x = ((x % width) + width) % width;
					if (x < 0 || z < 0 || x >= width || z >= height) continue;
					const key = `${x},${z}`;
					if (occupied.has(key)) continue;
					const tile = board.tiles[z]?.[x];
					if (tile?.passable) return { x, z };
				}
			}
		}
	}
	return null;
}

/** Execute an AI build action — spawn building, deduct resources. */
function executeAiBuild(
	world: World,
	factionId: string,
	buildingType: BuildingType,
	tileX: number,
	tileZ: number,
): void {
	const def = BUILDING_DEFS[buildingType];

	// Double-check affordability (resources may have changed)
	if (!canAfford(world, factionId, def.buildCost)) return;

	// Deduct resources
	for (const [mat, amount] of Object.entries(def.buildCost)) {
		if (amount && amount > 0) {
			spendResources(world, factionId, mat as ResourceMaterial, amount);
		}
	}

	// Spawn building entity
	const entity = world.spawn(
		Building({
			tileX,
			tileZ,
			buildingType,
			modelId: def.modelId,
			factionId,
			hp: def.hp,
			maxHp: def.hp,
		}),
	);

	// Attach power grid if relevant
	if (
		def.powerDelta !== 0 ||
		def.powerRadius > 0 ||
		buildingType === "power_box"
	) {
		entity.add(
			PowerGrid({
				powerDelta: def.powerDelta,
				storageCapacity: def.storageCapacity,
				currentCharge: 0,
				powerRadius: def.powerRadius,
			}),
		);
	}

	// Attach storage if relevant
	if (def.storageCapacity > 0 && def.powerDelta === 0) {
		entity.add(StorageCapacity({ capacity: def.storageCapacity }));
	}

	// Attach fabricator if relevant
	if (def.fabricationSlots > 0) {
		entity.add(
			BotFabricator({
				fabricationSlots: def.fabricationSlots,
				queueSize: 0,
			}),
		);
	}

	playSfx("build_complete");
}

// ---------------------------------------------------------------------------
// Cult faction exclusion
// ---------------------------------------------------------------------------

const CULT_FACTION_IDS = new Set([
	"static_remnants",
	"null_monks",
	"lost_signal",
]);

function isCultFactionId(factionId: string): boolean {
	return CULT_FACTION_IDS.has(factionId);
}

// ---------------------------------------------------------------------------
// FSM helpers
// ---------------------------------------------------------------------------

/** Count enemy/cult units within 5 tiles of any faction building. */
function countNearbyThreats(
	factionBuildings: Array<{ tileX: number; tileZ: number }>,
	threats: Array<{ x: number; z: number }>,
): number {
	let count = 0;
	for (const t of threats) {
		for (const b of factionBuildings) {
			const dist = Math.abs(t.x - b.tileX) + Math.abs(t.z - b.tileZ);
			if (dist <= 5) {
				count++;
				break; // Count each threat once even if near multiple buildings
			}
		}
	}
	return count;
}

// ---------------------------------------------------------------------------
// Floor mining helpers
// ---------------------------------------------------------------------------

/** Find mineable tiles within scan range of faction units. */
function findMineableTilesNearUnits(
	world: World,
	units: AgentSnapshot[],
	boardWidth = 0,
	wrapX = false,
): Array<{ x: number; z: number; material: string }> {
	const results: Array<{ x: number; z: number; material: string }> = [];
	const seen = new Set<string>();

	for (const e of world.query(Tile, TileFloor)) {
		const tile = e.get(Tile);
		const floor = e.get(TileFloor);
		if (!tile || !floor || !floor.mineable || !floor.resourceMaterial) continue;

		const key = `${tile.x},${tile.z}`;
		if (seen.has(key)) continue;

		// Check if any faction unit is within scan range * 2
		for (const unit of units) {
			const dist = sphereManhattan(
				unit.tileX,
				unit.tileZ,
				tile.x,
				tile.z,
				boardWidth,
				wrapX,
			);
			if (dist <= unit.scanRange * 2) {
				results.push({
					x: tile.x,
					z: tile.z,
					material: floor.resourceMaterial,
				});
				seen.add(key);
				break;
			}
		}
	}

	return results;
}

// ---------------------------------------------------------------------------
// AI Fabrication — queue units at idle motor pools using pickAITrack
// ---------------------------------------------------------------------------

/** Priority order for AI fabrication. */
const AI_FAB_PRIORITY: RobotClass[] = [
	"worker",
	"scout",
	"infantry",
	"cavalry",
	"ranged",
	"support",
];

/**
 * For each AI faction, find powered motor pools with open slots and queue
 * a unit using faction track preferences via pickAITrack.
 */
function runAiFabrication(world: World, factionIds: string[]): void {
	// Build gate and v2 tech maps from the track registry
	const gateTechIds = new Map<string, string>();
	const v2TechIds = new Map<string, string>();
	for (const [trackId, entry] of TRACK_REGISTRY) {
		gateTechIds.set(trackId, entry.gateTechId);
		if (entry.v2TechId) v2TechIds.set(trackId, entry.v2TechId);
	}

	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		// Get researched techs for this faction
		const researchState = getResearchState(world, factionId);
		const researched = new Set(researchState?.researchedTechs ?? []);

		// Find powered motor pools with open slots
		for (const e of world.query(Building, BotFabricator, Powered)) {
			const b = e.get(Building);
			const fab = e.get(BotFabricator);
			if (!b || !fab || b.factionId !== factionId) continue;
			if (fab.queueSize >= fab.fabricationSlots) continue;

			// Pick a robot class in priority order
			for (const robotClass of AI_FAB_PRIORITY) {
				const trackId = pickAITrack(
					factionId,
					robotClass,
					researched,
					gateTechIds,
				);
				const trackVersion = pickAITrackVersion(trackId, researched, v2TechIds);

				const result = queueFabrication(
					world,
					e,
					robotClass,
					trackId,
					trackVersion,
				);
				if (result.ok) break; // One unit per motor pool per turn
			}
		}
	}
}

/** Find TileFloor data at a specific coordinate. */
function findTileFloorAt(
	world: World,
	x: number,
	z: number,
): {
	mineable: boolean;
	hardness: number;
	resourceMaterial: string | null;
} | null {
	for (const e of world.query(Tile, TileFloor)) {
		const tile = e.get(Tile);
		if (tile && tile.x === x && tile.z === z) {
			const floor = e.get(TileFloor);
			if (floor) return floor;
		}
	}
	return null;
}
