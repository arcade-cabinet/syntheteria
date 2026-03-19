/**
 * GoalEvaluators barrel -- re-exports from split modules.
 *
 * Each evaluator calculates a desirability score (0-1) and its characterBias
 * is set from the faction personality. Think.arbitrate() picks the highest
 * (desirability * characterBias) and calls setGoal() on the winner.
 */

// --- Combat evaluators ---
export {
	AttackEvaluator,
	ChaseEnemyEvaluator,
	EvadeEvaluator,
} from "./combatEvaluators";
// --- Diagnostics ---
export {
	enableAIDiagnostics,
	isAIDiagnosticsEnabled,
	logEvaluatorChoice,
} from "./diagnostics";
// --- Economy evaluators ---
export {
	BuildEvaluator,
	FloorMineEvaluator,
	HarvestEvaluator,
} from "./economyEvaluators";
// --- Strategy evaluators ---
export {
	ExpandEvaluator,
	IdleEvaluator,
	InterposeEvaluator,
	ResearchEvaluator,
	ScoutEvaluator,
	WormholeEvaluator,
} from "./strategyEvaluators";
export type { BuildOption, TurnContext } from "./turnContext";
// --- Turn context (shared state + math helpers) ---
export { getTurnContext, setTurnContext } from "./turnContext";
