/**
 * GoalEvaluators barrel -- re-exports from split modules.
 *
 * Each evaluator calculates a desirability score (0-1) and its characterBias
 * is set from the faction personality. Think.arbitrate() picks the highest
 * (desirability * characterBias) and calls setGoal() on the winner.
 */

// --- Turn context (shared state + math helpers) ---
export { setTurnContext, getTurnContext } from "./turnContext";
export type { BuildOption, TurnContext } from "./turnContext";

// --- Combat evaluators ---
export { AttackEvaluator, ChaseEnemyEvaluator, EvadeEvaluator } from "./combatEvaluators";

// --- Economy evaluators ---
export { HarvestEvaluator, BuildEvaluator, FloorMineEvaluator } from "./economyEvaluators";

// --- Strategy evaluators ---
export {
	ExpandEvaluator,
	ScoutEvaluator,
	ResearchEvaluator,
	InterposeEvaluator,
	WormholeEvaluator,
	IdleEvaluator,
} from "./strategyEvaluators";

// --- Diagnostics ---
export {
	enableAIDiagnostics,
	isAIDiagnosticsEnabled,
	logEvaluatorChoice,
} from "./diagnostics";
