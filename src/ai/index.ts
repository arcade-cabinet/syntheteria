/**
 * @package ai
 *
 * Yuka GOAP AI runtime — agents, goals, navigation, steering, planning, and triggers.
 */

// --- Runtime entry points ---
export {
	resetAIRuntime,
	getAIRuntime,
	runYukaAiTurns,
} from "./yukaAiTurnSystem";

// --- Track selection ---
export { pickAITrack, pickAITrackVersion } from "./trackSelection";

// --- Agents ---
export { SyntheteriaAgent } from "./agents/SyntheteriaAgent";
export type { AgentSnapshot, DecidedAction } from "./agents/SyntheteriaAgent";

// --- FSM ---
export { FactionFSM, getFactionFSM, resetFactionFSMs } from "./fsm/FactionFSM";
export type {
	FactionBiasOverride,
	FactionStateContext,
	FactionStateId,
} from "./fsm/FactionFSM";

// --- Fuzzy logic ---
export { assessSituationFuzzy } from "./fuzzy/situationModule";
export type { FuzzyScores } from "./fuzzy/situationModule";

// --- Goals ---
export {
	setTurnContext,
	AttackEvaluator,
	ChaseEnemyEvaluator,
	HarvestEvaluator,
	ExpandEvaluator,
	BuildEvaluator,
	ResearchEvaluator,
	ScoutEvaluator,
	FloorMineEvaluator,
	EvadeEvaluator,
	InterposeEvaluator,
	WormholeEvaluator,
	IdleEvaluator,
} from "./goals/evaluators";
export type { BuildOption, TurnContext } from "./goals/evaluators";

// --- Navigation ---
export {
	buildNavGraph,
	updateTileCost,
	yukaShortestPath,
	getOrBuildNavGraph,
	clearNavGraphCache,
	sphereManhattan,
} from "./navigation/boardNavGraph";
export type { NavGraphResult } from "./navigation/boardNavGraph";

// --- Perception ---
export {
	FactionMemory,
	getFactionMemory,
	resetAllFactionMemories,
	updateFactionPerception,
} from "./perception/factionMemory";
export type { SightingRecord } from "./perception/factionMemory";

// --- Planning ---
export {
	computeArmyStrength,
	computeLocalStrength,
	evaluateCombat,
	evaluateLocalCombat,
} from "./planning/combatEval";
export type { CombatUnit, CombatDecision, CombatEvalResult } from "./planning/combatEval";
export {
	resetDiplomaticAi,
	decideDiplomacy,
	executeDiplomacy,
} from "./planning/diplomaticAi";
export type { DiplomaticContext, DiplomaticDecision } from "./planning/diplomaticAi";
export {
	planForState,
	getNextAction,
	htnDecide,
} from "./planning/htnPlanner";
export type { HTNStep, HTNGoal, HTNContext } from "./planning/htnPlanner";
export {
	computeInfluenceMap,
	findHighValueTile,
	getTopTiles,
	needsRefresh,
	getFactionInfluenceMap,
	resetInfluenceMaps,
} from "./planning/influenceMap";
export type { InfluenceCell, InfluenceMap, InfluenceInput } from "./planning/influenceMap";

// --- Steering ---
export {
	countThreatsInRadius,
	countAlliesInRadius,
	computeFleeDirection,
	computeEvadeDesirability,
} from "./steering/evasionSteering";
export { computeFlockingForce, pickFlockingTile } from "./steering/flockingSteering";
export type { TilePos } from "./steering/flockingSteering";
export {
	FORMATION_RADIUS,
	FORMATION_MIN_UNITS,
	detectFormations,
	computeFormationOffsets,
	getFormationTarget,
	isFormationLeader,
} from "./steering/formationSteering";
export type { FormationUnit, FormationGroup } from "./steering/formationSteering";
export {
	findInterposeTarget,
	computeInterposePoint,
	pickInterposeTile,
	computeInterposeDesirability,
} from "./steering/interposeSteering";
export { computeObstacleAvoidance, pickAvoidanceTile } from "./steering/obstacleAvoidanceSteering";
export { computeInterceptTarget, shouldUsePursuit } from "./steering/pursuitSteering";
export {
	computeWanderDirection,
	pickWanderTile,
	resetWanderState,
} from "./steering/wanderSteering";

// --- Tasks ---
export {
	UnitTaskQueue,
	createHarvestAndReturnTask,
	createScoutPatrolTask,
	getUnitTaskQueue,
	setUnitTaskQueue,
	clearUnitTaskQueue,
	resetAllTaskQueues,
} from "./tasks/UnitTaskQueue";
export type { TaskStepType, TaskStep } from "./tasks/UnitTaskQueue";

// --- Triggers ---
export {
	checkCorruptionTriggers,
	checkFactionContact,
	resetCorruptionTriggers,
} from "./triggers/corruptionTrigger";
export type { CorruptionEvent } from "./triggers/corruptionTrigger";
export {
	TerritoryTracker,
	getTerritoryTracker,
	resetAllTerritoryTrackers,
	countEnemiesInTerritory,
} from "./triggers/territoryTrigger";
export type { TerritoryEventType, TerritoryEvent } from "./triggers/territoryTrigger";
