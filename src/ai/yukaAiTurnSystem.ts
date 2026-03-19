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
import {
	countResearchLabs,
	getAvailableTechs,
	getResearchState,
	queueResearch,
} from "../ecs/systems/researchSystem";
import { canAfford, spendResources } from "../ecs/systems/resourceSystem";
import {
	FUSION_RECIPES,
	SynthesisQueue,
	queueSynthesis,
} from "../ecs/systems/synthesisSystem";
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
import { getUnitTaskQueue } from "./tasks/UnitTaskQueue";
import { resetAllTaskQueues } from "./tasks/UnitTaskQueue";
import { pickAITrack, pickAITrackVersion } from "./trackSelection";
import {
	checkCorruptionTriggers,
	checkFactionContact,
	resetCorruptionTriggers,
} from "./triggers/corruptionTrigger";
import { resetAllTerritoryTrackers } from "./triggers/territoryTrigger";
import { resetInfluenceMaps, getFactionInfluenceMap, getTopTiles } from "./planning/influenceMap";
import { evaluateLocalCombat, type CombatUnit } from "./planning/combatEval";
import { decideDiplomacy, executeDiplomacy, resetDiplomaticAi, type DiplomaticContext } from "./planning/diplomaticAi";
import type { UnitInfo } from "./steering/interposeSteering";
import {
	detectFormations,
	getFormationTarget,
	isFormationLeader,
	type FormationUnit,
} from "./steering/formationSteering";

// ---------------------------------------------------------------------------
// Module-level runtime — persists across turns within a game session
// ---------------------------------------------------------------------------

let _runtime = new AIRuntime();

/** Track consecutive idle turns per agent entity id. */
const _idleStreak = new Map<number, number>();

/** Reset the AI runtime (call on new game). */
export function resetAIRuntime(): void {
	_runtime.clear();
	_runtime = new AIRuntime();
	resetAllFactionMemories();
	resetAllTerritoryTrackers();
	resetFactionFSMs();
	resetAllTaskQueues();
	resetCorruptionTriggers();
	clearNavGraphCache();
	resetInfluenceMaps();
	resetDiplomaticAi();
	_idleStreak.clear();
	_lastBuildTurn.clear();
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

		// Count existing buildings per type for dynamic build priority
		const existingBuildingTypes: Record<string, number> = {};
		for (const b of factionBuildings) {
			existingBuildingTypes[b.buildingType] =
				(existingBuildingTypes[b.buildingType] ?? 0) + 1;
		}
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

		// Compute enemy headings from perception memory (previous → current position)
		const enemyHeadings = new Map<number, { dx: number; dz: number }>();
		for (const enemy of factionEnemies) {
			const remembered = factionMem.getRecord(enemy.entityId);
			if (remembered && remembered.turnSeen < currentTurn) {
				const dx = enemy.x - remembered.tileX;
				const dz = enemy.z - remembered.tileZ;
				if (dx !== 0 || dz !== 0) {
					enemyHeadings.set(enemy.entityId, { dx, dz });
				}
			}
		}

		// Research context
		const researchLabCount = countResearchLabs(world, factionId);
		const researchState = getResearchState(world, factionId);
		const hasResearchLab = researchLabCount > 0;
		const isResearching = !!researchState?.currentTechId;
		const researchedTechCount = researchState?.researchedTechs.length ?? 0;

		// Interpose context — detailed ally/enemy info for support units
		const allyUnits: Array<{ entityId: number; x: number; z: number; hp: number; factionId: string }> = [];
		for (const s of factionSnapshots) {
			allyUnits.push({ entityId: s.entityId, x: s.tileX, z: s.tileZ, hp: s.hp, factionId });
		}
		const enemyUnits: Array<{ entityId: number; x: number; z: number; hp: number; factionId: string }> = [];
		for (const e of factionEnemies) {
			// Get HP from ECS for detailed enemy info
			const entity = entityById.get(e.entityId);
			const stats = entity?.get(UnitStats);
			enemyUnits.push({ entityId: e.entityId, x: e.x, z: e.z, hp: stats?.hp ?? 10, factionId: e.factionId });
		}

		// Wormhole context — territory count and strongest faction detection
		const factionTerritoryCount = factionBuildings.length + unitCount;
		// Determine if this is the strongest faction (compare against all other factions)
		let isStrongestFaction = true;
		for (const [otherId, otherSnaps] of agentsByFaction) {
			if (otherId === factionId) continue;
			const otherStrength = getPopulation(world, otherId) + getFactionBuildings(world, otherId).length;
			if (otherStrength > factionTerritoryCount) {
				isStrongestFaction = false;
				break;
			}
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
			enemyHeadings,
			hasResearchLab,
			isResearching,
			researchedTechCount,
			allyUnits,
			enemyUnits,
			factionTerritoryCount,
			isStrongestFaction,
			existingBuildingTypes,
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

		// ── Formation detection: group nearby units for offset pursuit ──
		const formationUnits: FormationUnit[] = factionSnapshots.map((s) => ({
			entityId: s.entityId,
			x: s.tileX,
			z: s.tileZ,
			attack: s.attack,
			factionId,
		}));
		const formations = detectFormations(formationUnits);

		// Arbitrate each agent in this faction
		// Evaluators are added in order: attack, chase, harvest, expand, build, research, scout, floorMine, evade, interpose, wormhole, idle
		// Map FSM bias keys to evaluator indices (research uses build bias, floorMine uses harvest bias)
		const evalBiasMap = [
			"attack", "chase", "harvest", "expand",
			"build", "build", "scout", "harvest", "evade", "evade", "expand", "idle",
		] as const;

		for (const snap of factionSnapshots) {
			const agent = _runtime.getOrCreateAgent(snap);

			// TaskQueue bypass: if unit has an active compound task, skip GOAP
			const taskQueue = getUnitTaskQueue(snap.entityId);
			if (taskQueue) {
				const taskAction = taskQueue.getAction(snap.tileX, snap.tileZ);
				if (taskAction) {
					agent.decidedAction = taskAction;
				} else {
					// Queue completed or aborted — fall through to GOAP
					agent.decidedAction = null;
				}
			}

			if (!agent.decidedAction) {
				// Check if any enemy is adjacent (dist <= 1) — adjacent attacks
				// must bypass FSM bias suppression so units always fight back
				const hasAdjacentEnemy = factionEnemies.some(
					(e) => Math.abs(e.x - snap.tileX) + Math.abs(e.z - snap.tileZ) <= 1,
				);

				// Save original biases, apply FSM overrides
				const origBiases: number[] = [];
				for (let i = 0; i < agent.brain.evaluators.length; i++) {
					const ev = agent.brain.evaluators[i];
					origBiases.push(ev.characterBias);
					const biasKey = evalBiasMap[i] ?? "idle";
					let fsmMult = fsmBias[biasKey];
					// Attack evaluator (index 0): floor FSM mult at 1.0 when adjacent enemy
					if (i === 0 && hasAdjacentEnemy) {
						fsmMult = Math.max(fsmMult, 1.0);
					}
					ev.characterBias *= fsmMult;
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
			}

			// ── Idle-break: guarantee no unit idles 2+ consecutive turns ──
			if (agent.decidedAction?.type === "idle") {
				const prev = _idleStreak.get(snap.entityId) ?? 0;
				_idleStreak.set(snap.entityId, prev + 1);

				if (prev + 1 >= 2) {
					// Override idle with a productive fallback
					if (deposits.length > 0) {
						// Move toward nearest deposit
						let bestDist = Infinity;
						let bestX = boardCenter.x;
						let bestZ = boardCenter.z;
						for (const d of deposits) {
							const dist = sphereManhattan(
								snap.tileX, snap.tileZ, d.x, d.z,
								board.config.width, navGraph.wrapX,
							);
							if (dist < bestDist) {
								bestDist = dist;
								bestX = d.x;
								bestZ = d.z;
							}
						}
						agent.decidedAction = { type: "move", toX: bestX, toZ: bestZ };
					} else if (factionCenter) {
						// Expand: move 5 tiles outward from faction center
						const dx = snap.tileX - factionCenter.x;
						const dz = snap.tileZ - factionCenter.z;
						const len = Math.sqrt(dx * dx + dz * dz) || 1;
						const expandX = Math.round(snap.tileX + (dx / len) * 5);
						const expandZ = Math.round(snap.tileZ + (dz / len) * 5);
						agent.decidedAction = {
							type: "move",
							toX: Math.max(0, Math.min(board.config.width - 1, expandX)),
							toZ: Math.max(0, Math.min(board.config.height - 1, expandZ)),
						};
					} else {
						// Scout toward board center
						agent.decidedAction = { type: "move", toX: boardCenter.x, toZ: boardCenter.z };
					}
					_idleStreak.set(snap.entityId, 0);
				}
			} else {
				_idleStreak.set(snap.entityId, 0);
			}

			// ── Formation overlay: followers snap to offset positions ──
			// If this unit is a follower in a formation and its decided action
			// is "move", redirect it to its formation offset position instead.
			if (
				agent.decidedAction?.type === "move" &&
				!isFormationLeader(snap.entityId, formations)
			) {
				const leaderSnap = formations.find((g) =>
					g.followers.some((f) => f.entityId === snap.entityId),
				);
				if (leaderSnap) {
					// Use the leader's decided move target as the formation goal
					const leaderAgent = _runtime.getOrCreateAgent(
						factionSnapshots.find(
							(s) => s.entityId === leaderSnap.leader.entityId,
						) ?? snap,
					);
					const goalX =
						leaderAgent.decidedAction?.type === "move"
							? leaderAgent.decidedAction.toX
							: leaderSnap.leader.x;
					const goalZ =
						leaderAgent.decidedAction?.type === "move"
							? leaderAgent.decidedAction.toZ
							: leaderSnap.leader.z;

					const formationTarget = getFormationTarget(
						snap.entityId,
						formations,
						goalX,
						goalZ,
					);
					if (formationTarget) {
						agent.decidedAction = {
							type: "move",
							toX: Math.max(
								0,
								Math.min(board.config.width - 1, formationTarget.x),
							),
							toZ: Math.max(
								0,
								Math.min(board.config.height - 1, formationTarget.z),
							),
						};
					}
				}
			}

			// Track last action for momentum bonus next turn
			if (agent.decidedAction) {
				agent.lastActionType = agent.decidedAction.type;
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
								ticksRemaining: 2,
								totalTicks: 2,
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

	// ── Step 6b: AI building — construct missing critical infrastructure ──
	runAiBuilding(world, [...agentsByFaction.keys()], board);

	// ── Step 6c: AI synthesis — queue conversions at idle synthesizers ───
	runAiSynthesis(world, [...agentsByFaction.keys()]);

	// ── Step 6d: AI research — queue tech research when labs are idle ────
	runAiResearch(world, [...agentsByFaction.keys()]);

	// ── Step 6e: AI fabrication — queue units at idle motor pools ────────
	runAiFabrication(world, [...agentsByFaction.keys()]);

	// ── Step 6f: Trigger checks — corruption zones + faction contact ────
	checkCorruptionTriggers(world, currentTurn);
	checkFactionContact(world, currentTurn);

	// ── Step 6g: Diplomatic AI — alliance/war decisions per faction ──────
	runAiDiplomacy(world, [...agentsByFaction.keys()], agentsByFaction, currentTurn);

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
	"storm_transmitter",
	"motor_pool",
	"synthesizer",
	"research_lab",
	"outpost",
	"storage_hub",
	"defense_turret",
	"relay_tower",
	"power_box",
	"resource_refinery",
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
 * Searches near existing faction buildings first (infrastructure cluster),
 * then falls back to near units.
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

	// Count existing buildings per type for this faction
	const existingCounts: Record<string, number> = {};
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) {
			existingCounts[b.buildingType] = (existingCounts[b.buildingType] || 0) + 1;
		}
	}
	// Max allowed per building type — prevents duplicate spam
	const MAX_PER_TYPE: Record<string, number> = {
		storm_transmitter: 2,
		motor_pool: 3,
		synthesizer: 2,
		research_lab: 1,
		outpost: 5,
		storage_hub: 2,
		defense_turret: 4,
		relay_tower: 2,
	};

	// Collect faction building positions for placement search
	const factionBuildingPositions: Array<{ x: number; z: number }> = [];
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) {
			factionBuildingPositions.push({ x: b.tileX, z: b.tileZ });
		}
	}

	for (const type of AI_BUILDABLE) {
		const def = BUILDING_DEFS[type];
		// Skip if already at max count for this type
		const current = existingCounts[type] || 0;
		const max = MAX_PER_TYPE[type] ?? 3;
		if (current >= max) continue;
		if (!canAfford(world, factionId, def.buildCost)) continue;

		// Search near existing buildings first, then near units
		const tile =
			findBuildTileNear(factionBuildingPositions, board, occupiedTiles, wrapX) ??
			findBuildTileNear(
				units.map((u) => ({ x: u.tileX, z: u.tileZ })),
				board,
				occupiedTiles,
				wrapX,
			);
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

/** Find a passable, unoccupied tile near any of the given anchor positions. */
function findBuildTileNear(
	anchors: Array<{ x: number; z: number }>,
	board: GeneratedBoard,
	occupied: Set<string>,
	wrapX = false,
): { x: number; z: number } | null {
	const { width, height } = board.config;

	for (const anchor of anchors) {
		// Search in expanding radius — up to 12 tiles out (matches transmitter
		// powerRadius) to handle tight labyrinth corridors where nearby tiles
		// are occupied by starter buildings/units
		for (let r = 1; r <= 12; r++) {
			for (let dx = -r; dx <= r; dx++) {
				for (let dz = -r; dz <= r; dz++) {
					let x = anchor.x + dx;
					const z = anchor.z + dz;
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
// AI Building — automatic infrastructure construction
// ---------------------------------------------------------------------------

/**
 * Infrastructure priority for automatic building.
 * Unlike the evaluator-driven Build (which competes with harvest/scout/etc),
 * this runs unconditionally after GOAP — one building per faction per turn
 * if affordable and below cap.
 *
 * Priority is dynamic: missing critical buildings come first.
 */
/** Track last build turn per faction to space out construction. */
const _lastBuildTurn = new Map<string, number>();

function runAiBuilding(
	world: World,
	factionIds: string[],
	board: GeneratedBoard,
): void {
	// Read current turn
	let currentTurn = 1;
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) { currentTurn = b.turn; break; }
	}

	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		// Space out building: one building every 2 turns to balance growth with income
		const lastTurn = _lastBuildTurn.get(factionId) ?? 0;
		if (currentTurn - lastTurn < 2 && currentTurn > 1) continue;

		// Count existing buildings per type
		const existing: Record<string, number> = {};
		const buildingPositions: Array<{ x: number; z: number }> = [];
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b && b.factionId === factionId) {
				existing[b.buildingType] = (existing[b.buildingType] ?? 0) + 1;
				buildingPositions.push({ x: b.tileX, z: b.tileZ });
			}
		}

		// Build the occupied set
		const occupiedTiles = new Set<string>();
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b) occupiedTiles.add(`${b.tileX},${b.tileZ}`);
		}

		// Dynamic priority: missing critical buildings first
		const priority = dynamicAiBuildOrder(existing);

		const MAX_PER_TYPE: Record<string, number> = {
			storm_transmitter: 2,
			motor_pool: 3,
			synthesizer: 2,
			research_lab: 1,
			outpost: 5,
			storage_hub: 2,
			defense_turret: 4,
			relay_tower: 2,
			power_box: 3,
			resource_refinery: 2,
		};

		for (const type of priority) {
			const def = BUILDING_DEFS[type as BuildingType];
			if (!def) continue;

			const current = existing[type] ?? 0;
			const max = MAX_PER_TYPE[type] ?? 3;
			if (current >= max) continue;
			if (!canAfford(world, factionId, def.buildCost)) continue;

			// Find placement tile near existing buildings
			const tile = findBuildTileNear(
				buildingPositions,
				board,
				occupiedTiles,
				false,
			);
			if (!tile) continue;

			executeAiBuild(world, factionId, type as BuildingType, tile.x, tile.z);
			_lastBuildTurn.set(factionId, currentTurn);
			break; // One building per faction per turn
		}
	}
}

/**
 * Dynamic build order based on what the faction is missing.
 * Critical gaps jump to the front; then growth buildings cycle.
 */
function dynamicAiBuildOrder(existing: Record<string, number>): string[] {
	const order: string[] = [];

	// Critical infrastructure gaps — these unlock the economy chain
	if ((existing["synthesizer"] ?? 0) === 0) order.push("synthesizer");
	if ((existing["motor_pool"] ?? 0) === 0) order.push("motor_pool");
	if ((existing["storm_transmitter"] ?? 0) === 0) order.push("storm_transmitter");
	if ((existing["research_lab"] ?? 0) === 0) order.push("research_lab");

	// Second motor pool for throughput
	if ((existing["motor_pool"] ?? 0) < 2) order.push("motor_pool");

	// Resource refinery = renewable ferrous_scrap income (+2/turn)
	if ((existing["resource_refinery"] ?? 0) === 0) order.push("resource_refinery");

	// Growth cycle — outposts increase pop cap, turrets defend, then more infrastructure
	order.push(
		"outpost",
		"defense_turret",
		"motor_pool",
		"synthesizer",
		"outpost",
		"storage_hub",
		"storm_transmitter",
		"relay_tower",
		"power_box",
		"resource_refinery",
		"outpost",
		"defense_turret",
	);

	return order;
}

// ---------------------------------------------------------------------------
// AI Research — pick and queue tech research per faction personality
// ---------------------------------------------------------------------------

/**
 * Faction-specific tech priority lists. AI picks the first available tech
 * from its faction's preferred order, falling back to any available tech.
 */
const FACTION_TECH_PRIORITY: Record<string, readonly string[]> = {
	reclaimers: [
		"advanced_harvesting",
		"efficient_fabrication",
		"mark_ii_components",
		"deep_mining",
		"reinforced_chassis",
		"mark_iii_components",
		"signal_amplification",
	],
	volt_collective: [
		"signal_amplification",
		"network_encryption",
		"reinforced_chassis",
		"mark_ii_components",
		"advanced_harvesting",
		"efficient_fabrication",
		"quantum_processors",
	],
	signal_choir: [
		"signal_amplification",
		"reinforced_chassis",
		"mark_ii_components",
		"advanced_harvesting",
		"storm_shielding",
		"mark_iii_components",
		"network_encryption",
	],
	iron_creed: [
		"reinforced_chassis",
		"storm_shielding",
		"mark_ii_components",
		"advanced_harvesting",
		"efficient_fabrication",
		"mark_iii_components",
		"adaptive_armor",
	],
};

/**
 * For each AI faction with a research lab but no active research,
 * pick a tech from the faction's preference list and start researching.
 */
function runAiResearch(world: World, factionIds: string[]): void {
	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		const state = getResearchState(world, factionId);
		if (!state) continue;
		// Already researching — nothing to do
		if (state.currentTechId) continue;
		// No research lab — can't research
		if (state.labCount === 0) continue;

		const available = getAvailableTechs(world, factionId);
		if (available.length === 0) continue;

		const availableIds = new Set(available.map((t) => t.id));

		// Try faction-specific priority first
		const priorities = FACTION_TECH_PRIORITY[factionId];
		if (priorities) {
			for (const techId of priorities) {
				if (availableIds.has(techId)) {
					queueResearch(world, factionId, techId);
					break;
				}
			}
		}

		// Check if we queued something — re-read state
		const afterState = getResearchState(world, factionId);
		if (afterState?.currentTechId) continue;

		// Fallback: pick the first available tech (lowest tier first)
		const sorted = [...available].sort((a, b) => a.tier - b.tier);
		queueResearch(world, factionId, sorted[0].id);
	}
}

// ---------------------------------------------------------------------------
// AI Synthesis — auto-queue conversions on idle powered synthesizers
// ---------------------------------------------------------------------------

/**
 * Synthesis priority: produce the refined materials most needed for
 * upcoming builds. alloy_stock unlocks motor_pool and research_lab.
 * polymer_salvage unlocks storage_hub. silicon_wafer unlocks research_lab.
 */
const SYNTHESIS_PRIORITY: readonly string[] = [
	"alloy_fusion",        // ferrous_scrap → alloy_stock (most needed)
	"polymer_reclamation", // scrap_metal → polymer_salvage
	"wafer_fabrication",   // e_waste → silicon_wafer
	"storm_capacitor",     // ferrous_scrap → storm_charge
	"crystal_synthesis",   // silicon_wafer → el_crystal (late game)
];

/**
 * For each AI faction, find powered synthesizers with no active queue
 * and start the highest-priority affordable recipe.
 *
 * IMPORTANT: Only synthesize when the faction has EXCESS raw materials.
 * Reserve enough for at least one cheap building (power_box = ferrous:2 + conductor:1).
 * Without this reservation, synthesis eats all raw materials and the faction
 * can't afford any buildings.
 */
function runAiSynthesis(world: World, factionIds: string[]): void {
	// Resource floor: keep at least this much of each material in reserve
	// so buildings can be afforded. Values match the most expensive single-material
	// requirement across common buildings.
	const RESERVE: Partial<Record<string, number>> = {
		ferrous_scrap: 8,
		conductor_wire: 6,
		scrap_metal: 4,
		polymer_salvage: 5,
		alloy_stock: 4,
	};

	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		// Check faction resource levels — only synthesize if above reserve
		let pool: Record<string, number> | null = null;
		for (const e of world.query(Faction, ResourcePool)) {
			const f = e.get(Faction);
			if (f?.id !== factionId) continue;
			const r = e.get(ResourcePool);
			if (r) pool = r as unknown as Record<string, number>;
			break;
		}
		if (!pool) continue;

		// Find idle powered synthesizers for this faction
		for (const e of world.query(Building, Powered)) {
			const b = e.get(Building);
			if (!b || b.factionId !== factionId) continue;
			if (b.buildingType !== "synthesizer") continue;
			if (e.has(SynthesisQueue)) continue; // Already converting

			// Try each recipe in priority order
			for (const recipeId of SYNTHESIS_PRIORITY) {
				const recipe = FUSION_RECIPES.find((r) => r.id === recipeId);
				if (!recipe) continue;

				// Check canAfford AND that spending won't drop below reserve
				if (!canAfford(world, factionId, recipe.inputs)) continue;

				let belowReserve = false;
				for (const [mat, amount] of Object.entries(recipe.inputs)) {
					const current = (pool[mat] as number) ?? 0;
					const reserve = RESERVE[mat] ?? 0;
					if (current - (amount ?? 0) < reserve) {
						belowReserve = true;
						break;
					}
				}
				if (belowReserve) continue;

				queueSynthesis(world, e.id(), recipeId);
				break; // One recipe per synthesizer per turn
			}
		}
	}
}

// ---------------------------------------------------------------------------
// AI Fabrication — queue units at idle motor pools using pickAITrack
// ---------------------------------------------------------------------------

/**
 * Compute fabrication priority based on current faction composition.
 * Workers and scouts come first if count is low, then military units.
 */
function computeFabPriority(
	world: World,
	factionId: string,
): RobotClass[] {
	// Count existing units by class
	const counts: Record<string, number> = {
		worker: 0,
		scout: 0,
		infantry: 0,
		cavalry: 0,
		ranged: 0,
		support: 0,
	};
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const f = e.get(UnitFaction);
		const v = e.get(UnitStats);
		if (!f || f.factionId !== factionId || !v) continue;
		// Determine class from attack/defense/scanRange
		// Workers have 0 attack, scouts have high scanRange
		if (v.attack === 0) counts.worker++;
		else if (v.scanRange >= 6) counts.scout++;
		else if (v.mp >= 4) counts.cavalry++;
		else if (v.attackRange >= 2 || v.attack >= 4) counts.ranged++;
		else if (v.attack >= 2) counts.infantry++;
		else counts.support++;
	}

	const priority: RobotClass[] = [];

	// Workers first if < 2
	if (counts.worker < 2) priority.push("worker");
	// Scouts if < 2
	if (counts.scout < 2) priority.push("scout");
	// Then military
	priority.push("infantry", "cavalry", "ranged", "support");
	// Finally workers/scouts if already have enough
	if (counts.worker >= 2) priority.push("worker");
	if (counts.scout >= 2) priority.push("scout");

	return priority;
}

/**
 * For each AI faction, find powered motor pools with open slots and queue
 * units. NEVER leave a motor pool idle when resources are available.
 * Fills ALL available slots, not just one per turn.
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

		// Dynamic priority based on current composition
		const fabPriority = computeFabPriority(world, factionId);

		// Find powered motor pools with open slots.
		// Limit to 1 unit per motor pool per turn to preserve resources for building.
		for (const e of world.query(Building, BotFabricator, Powered)) {
			const b = e.get(Building);
			const fab = e.get(BotFabricator);
			if (!b || !fab || b.factionId !== factionId) continue;

			let openSlots = Math.min(1, fab.fabricationSlots - fab.queueSize);
			while (openSlots > 0) {
				let queued = false;
				// Pick a robot class in priority order
				for (const robotClass of fabPriority) {
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
					if (result.ok) {
						queued = true;
						openSlots--;
						break;
					}
					// If can't afford this class, try the next
					if (result.ok === false && result.reason === "cannot_afford") continue;
					// If pop cap, stop entirely
					if (result.ok === false && result.reason === "pop_cap") {
						openSlots = 0;
						break;
					}
					// Other failures (not_powered, queue_full) — stop this pool
					openSlots = 0;
					break;
				}
				// If nothing was queued in this pass, stop trying
				if (!queued) break;
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

// ---------------------------------------------------------------------------
// Territory counting
// ---------------------------------------------------------------------------

/** Count territory tiles for a faction (building positions + outpost influence). */
function countFactionTerritory(world: World, factionId: string): number {
	let count = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b && b.factionId === factionId) count++;
	}
	return count;
}

/** Check if a faction is the strongest (most units + buildings). */
function checkIsStrongest(
	factionId: string,
	agentsByFaction: Map<string, AgentSnapshot[]>,
	world: World,
): boolean {
	const myStrength =
		(agentsByFaction.get(factionId)?.length ?? 0) +
		countFactionTerritory(world, factionId);

	for (const [otherId] of agentsByFaction) {
		if (otherId === factionId) continue;
		const otherStrength =
			(agentsByFaction.get(otherId)?.length ?? 0) +
			countFactionTerritory(world, otherId);
		if (otherStrength > myStrength) return false;
	}
	return true;
}

// ---------------------------------------------------------------------------
// AI Diplomacy — alliance/war decisions per faction
// ---------------------------------------------------------------------------

/** Personality aggression values (mirrored from AIRuntime FACTION_PERSONALITY, 1-5 scale). */
const FACTION_AGGRESSION: Record<string, number> = {
	reclaimers: 2,
	volt_collective: 1,
	signal_choir: 4,
	iron_creed: 5,
};

/**
 * Run diplomatic AI for each AI faction.
 * Decides whether to propose alliances or declare war based on FSM state.
 */
function runAiDiplomacy(
	world: World,
	factionIds: string[],
	agentsByFaction: Map<string, AgentSnapshot[]>,
	currentTurn: number,
): void {
	// Build unit/building counts for all factions
	const factionUnitCounts = new Map<string, number>();
	const factionBuildingCounts = new Map<string, number>();
	for (const fId of factionIds) {
		factionUnitCounts.set(fId, agentsByFaction.get(fId)?.length ?? 0);
		factionBuildingCounts.set(fId, countFactionTerritory(world, fId));
	}

	const aiFactionIds = factionIds.filter(
		(f) => f !== "player" && !isCultFactionId(f),
	);

	for (const factionId of aiFactionIds) {
		const fsm = getFactionFSM(factionId);
		const ctx: DiplomaticContext = {
			factionId,
			currentTurn,
			fsmState: fsm.currentStateId,
			factionUnitCounts,
			factionBuildingCounts,
			otherFactionIds: aiFactionIds,
			aggression: FACTION_AGGRESSION[factionId] ?? 2,
		};

		const decision = decideDiplomacy(world, ctx);
		executeDiplomacy(world, decision, factionId, currentTurn);
	}
}
