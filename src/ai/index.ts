/**
 * @package ai
 *
 * Yuka GOAP AI runtime — agents, goals, navigation, steering, planning, and triggers.
 */

export type { AgentSnapshot, DecidedAction } from "./agents/SyntheteriaAgent";
// --- Agents ---
export { SyntheteriaAgent } from "./agents/SyntheteriaAgent";
export type {
	FactionBiasOverride,
	FactionStateContext,
	FactionStateId,
} from "./fsm/FactionFSM";
// --- FSM ---
export { FactionFSM, getFactionFSM, resetFactionFSMs } from "./fsm/FactionFSM";
export type { FuzzyScores } from "./fuzzy/situationModule";
// --- Fuzzy logic ---
export { assessSituationFuzzy } from "./fuzzy/situationModule";
export type { BuildOption, TurnContext } from "./goals/evaluators";
// --- Goals ---
export {
	AttackEvaluator,
	BuildEvaluator,
	ChaseEnemyEvaluator,
	EvadeEvaluator,
	ExpandEvaluator,
	FloorMineEvaluator,
	HarvestEvaluator,
	IdleEvaluator,
	InterposeEvaluator,
	ResearchEvaluator,
	ScoutEvaluator,
	setTurnContext,
	WormholeEvaluator,
} from "./goals/evaluators";
export type { NavGraphResult } from "./navigation/boardNavGraph";
// --- Navigation ---
export {
	buildNavGraph,
	clearNavGraphCache,
	getOrBuildNavGraph,
	sphereManhattan,
	updateTileCost,
	yukaShortestPath,
} from "./navigation/boardNavGraph";
export type { SightingRecord } from "./perception/factionMemory";
// --- Perception ---
export {
	FactionMemory,
	getFactionMemory,
	resetAllFactionMemories,
	updateFactionPerception,
} from "./perception/factionMemory";
export type {
	CombatDecision,
	CombatEvalResult,
	CombatUnit,
} from "./planning/combatEval";
// --- Planning ---
export {
	computeArmyStrength,
	computeLocalStrength,
	evaluateCombat,
	evaluateLocalCombat,
} from "./planning/combatEval";
export type {
	DiplomaticContext,
	DiplomaticDecision,
} from "./planning/diplomaticAi";
export {
	decideDiplomacy,
	executeDiplomacy,
	resetDiplomaticAi,
} from "./planning/diplomaticAi";
export type { HTNContext, HTNGoal, HTNStep } from "./planning/htnPlanner";
export {
	getNextAction,
	htnDecide,
	planForState,
} from "./planning/htnPlanner";
export type {
	InfluenceCell,
	InfluenceInput,
	InfluenceMap,
} from "./planning/influenceMap";
export {
	computeInfluenceMap,
	findHighValueTile,
	getFactionInfluenceMap,
	getTopTiles,
	needsRefresh,
	resetInfluenceMaps,
} from "./planning/influenceMap";
// --- Steering ---
export {
	computeEvadeDesirability,
	computeFleeDirection,
	countAlliesInRadius,
	countThreatsInRadius,
} from "./steering/evasionSteering";
export type { TilePos } from "./steering/flockingSteering";
export {
	computeFlockingForce,
	pickFlockingTile,
} from "./steering/flockingSteering";
export type {
	FormationGroup,
	FormationUnit,
} from "./steering/formationSteering";
export {
	computeFormationOffsets,
	detectFormations,
	FORMATION_MIN_UNITS,
	FORMATION_RADIUS,
	getFormationTarget,
	isFormationLeader,
} from "./steering/formationSteering";
export {
	computeInterposeDesirability,
	computeInterposePoint,
	findInterposeTarget,
	pickInterposeTile,
} from "./steering/interposeSteering";
export {
	computeObstacleAvoidance,
	pickAvoidanceTile,
} from "./steering/obstacleAvoidanceSteering";
export {
	computeInterceptTarget,
	shouldUsePursuit,
} from "./steering/pursuitSteering";
export {
	computeWanderDirection,
	pickWanderTile,
	resetWanderState,
} from "./steering/wanderSteering";
export type { TaskStep, TaskStepType } from "./tasks/UnitTaskQueue";
// --- Tasks ---
export {
	clearUnitTaskQueue,
	createHarvestAndReturnTask,
	createScoutPatrolTask,
	getUnitTaskQueue,
	resetAllTaskQueues,
	setUnitTaskQueue,
	UnitTaskQueue,
} from "./tasks/UnitTaskQueue";
// --- Track selection ---
export { pickAITrack, pickAITrackVersion } from "./trackSelection";
export type { CorruptionEvent } from "./triggers/corruptionTrigger";

// --- Triggers ---
export {
	checkCorruptionTriggers,
	checkFactionContact,
	resetCorruptionTriggers,
} from "./triggers/corruptionTrigger";
export type {
	TerritoryEvent,
	TerritoryEventType,
} from "./triggers/territoryTrigger";
export {
	countEnemiesInTerritory,
	getTerritoryTracker,
	resetAllTerritoryTrackers,
	TerritoryTracker,
} from "./triggers/territoryTrigger";
// --- Runtime entry points ---
export {
	getAIRuntime,
	resetAIRuntime,
	runYukaAiTurns,
} from "./yukaAiTurnSystem";
