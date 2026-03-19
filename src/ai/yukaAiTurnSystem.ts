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
import { playSfx } from "../audio";
import type { GeneratedBoard } from "../board";
import { BUILDING_DEFS } from "../buildings";
import { getRelation } from "../factions";
import { TRACK_REGISTRY, type RobotClass } from "../robots";
import {
	queueFabrication,
	getPopCap,
	getPopulation,
	countResearchLabs,
	getAvailableTechs,
	getResearchState,
	queueResearch,
	canAfford,
	spendResources,
	FUSION_RECIPES,
	SynthesisQueue,
	queueSynthesis,
} from "../systems";
import { TileFloor } from "../terrain";
import type { ResourceMaterial } from "../terrain";
import {
	Board,
	BotFabricator,
	Building,
	type BuildingType,
	Powered,
	PowerGrid,
	StorageCapacity,
	Faction,
	ResourceDeposit,
	ResourcePool,
	Tile,
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMine,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../traits";
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
import {
	isCultFactionId,
	DIFFICULTY_AGGRESSION_MULT,
	readDifficulty,
	getFactionBuildings,
	getFactionResourceScore,
	getNearestEnemyDist,
	countNearbyThreats,
	findMineableTilesNearUnits,
	findTileFloorAt,
	moveToward,
} from "./aiHelpers";
import { computeBuildOptions, executeAiBuild, runAiBuilding, _lastBuildTurn } from "./aiBuilding";
import { runAiResearch } from "./aiResearch";
import { runAiSynthesis } from "./aiSynthesis";
import { runAiFabrication } from "./aiFabrication";
import { runAiDiplomacy } from "./aiDiplomacy";

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
