/**
 * GOAP (Goal-Oriented Action Planning) module for civilization AI.
 *
 * Provides a complete strategic AI system for NPC factions:
 *   - GoalTypes: defines the strategic goals factions can pursue
 *   - ActionTypes: defines GOAP actions with preconditions, effects, and costs
 *   - GOAPPlanner: A* planner that finds cheapest action sequences
 *   - FactionPersonality: maps config biases to goal weights with situational modifiers
 *   - CivilizationGovernor: main AI director that ties it all together
 *
 * Usage:
 * ```ts
 * import { CivilizationGovernor } from './ai/goap';
 * import civilizations from '../../config/civilizations.json';
 *
 * const governor = new CivilizationGovernor('reclaimers', civilizations);
 * // Each tick:
 * const action = governor.tick(situation, worldState);
 * if (action) executeAction(action);
 * ```
 */

// Action definitions and world state
export {
	ALL_ACTIONS,
	AssignMiners,
	BuildOutpost,
	BuildWalls,
	type GOAPAction,
	HoardCubes,
	LaunchRaid,
	ResearchTech,
	SendScoutParty,
	TradeOffer,
	type WorldState,
	WorldStateKey,
} from "./ActionTypes.ts";
// Governor
export { CivilizationGovernor } from "./CivilizationGovernor.ts";
// Action executor — bridges GOAP decisions to game systems
export {
	GovernorActionExecutor,
	type ExecutionContext,
	type IActionExecutor,
} from "./GovernorActionExecutor.ts";
// Faction personality
export {
	applySituationalModifiers,
	type CivilizationsConfig,
	computeBaseWeights,
	type FactionConfig,
	type FactionSituation,
	type GoalWeights,
	type GovernorBias,
	loadFactionWeights,
} from "./FactionPersonality.ts";
// Planner
export { planActions } from "./GOAPPlanner.ts";
// Goal definitions
export { CivGoal, type GoalState } from "./GoalTypes.ts";
