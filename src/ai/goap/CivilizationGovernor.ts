/**
 * CivilizationGovernor — main AI director for an NPC faction.
 *
 * One governor exists per AI-controlled faction. Each tick it:
 *   1. Reads the faction's current world state
 *   2. Scores all CivGoals using personality weights + situational modifiers
 *   3. Picks the highest-priority goal
 *   4. Runs the GOAP planner to find the cheapest action sequence
 *   5. Executes the first action in the plan (or continues an in-progress plan)
 *
 * The governor manages a pool of units assigned to it (via the faction system)
 * and issues directives derived from its current plan.
 *
 * Usage:
 * ```ts
 * import civilizations from '../../../config/civilizations.json';
 * const governor = new CivilizationGovernor('reclaimers', civilizations);
 * // Each game tick:
 * governor.tick(situation, worldState);
 * const plan = governor.getCurrentPlan();
 * const goal = governor.getCurrentGoal();
 * ```
 */

import {
	ALL_ACTIONS,
	BasicHarvest,
	type GOAPAction,
	type WorldState,
	WorldStateKey,
} from "./ActionTypes.ts";
import {
	applySituationalModifiers,
	type CivilizationsConfig,
	type FactionSituation,
	type GoalWeights,
	loadFactionWeights,
} from "./FactionPersonality.ts";
import { planActions } from "./GOAPPlanner.ts";
import { CivGoal, type GoalState } from "./GoalTypes.ts";
import type { IActionExecutor, ExecutionContext } from "./GovernorActionExecutor.ts";

// ---------------------------------------------------------------------------
// Goal -> desired world state mapping
// ---------------------------------------------------------------------------

/**
 * Maps each CivGoal to the world state conditions the planner should achieve.
 * These are the "desired end states" the GOAP planner targets.
 */
const GOAL_DESIRED_STATE: Record<CivGoal, WorldState> = {
	expand_territory: { [WorldStateKey.TERRITORY_EXPANDED]: true },
	gather_resources: { [WorldStateKey.RESOURCES_GATHERED]: true },
	build_defenses: { [WorldStateKey.DEFENSES_BUILT]: true },
	research_tech: { [WorldStateKey.TECH_RESEARCHED]: true },
	attack_enemy: { [WorldStateKey.ATTACK_LAUNCHED]: true },
	scout_map: { [WorldStateKey.MAP_SCOUTED]: true },
	trade: { [WorldStateKey.TRADE_COMPLETE]: true },
	hoard_cubes: { [WorldStateKey.CUBES_HOARDED]: true },
};

// ---------------------------------------------------------------------------
// Governor
// ---------------------------------------------------------------------------

/**
 * AI governor that drives a single NPC faction's strategic behavior.
 *
 * The governor is stateful: it retains its current plan across ticks and
 * only re-plans when the current plan completes, fails, or a higher-priority
 * goal emerges.
 */
export class CivilizationGovernor {
	/** Faction identifier (matches key in civilizations.json) */
	readonly civId: string;

	/** Faction display name */
	readonly factionName: string;

	/** Base personality weights computed from config */
	private baseWeights: GoalWeights;

	/** Current effective weights after situational modifiers */
	private effectiveWeights: GoalWeights;

	/** All goals scored and sorted by priority (most recent evaluation) */
	private scoredGoals: GoalState[] = [];

	/** Currently pursued goal, or null if idle */
	private currentGoal: CivGoal | null = null;

	/** Current action plan from the GOAP planner */
	private currentPlan: GOAPAction[] | null = null;

	/** Index of the next action to execute in the current plan */
	private planStep = 0;

	/**
	 * Ticks remaining before re-evaluating goals.
	 * The governor does not re-plan every single tick to avoid thrashing.
	 */
	private reevalCooldown = 0;

	/** How many ticks between goal re-evaluations */
	private static readonly REEVAL_INTERVAL = 10;

	/**
	 * Priority threshold: if a new goal's priority exceeds the current goal's
	 * priority by this margin, the governor abandons the current plan and
	 * switches to the new goal immediately.
	 */
	private static readonly PRIORITY_OVERRIDE_THRESHOLD = 0.2;

	/**
	 * Optional action executor — dispatches GOAP actions to game systems
	 * (raid, tech research, etc.). When set, the governor calls
	 * `executor.execute(action, context)` for every action it dispatches.
	 * When null the governor still returns the action descriptor but no
	 * system calls are made (useful in tests that only verify GOAP planning).
	 */
	private actionExecutor: IActionExecutor | null = null;

	/**
	 * Execution context provided externally and updated each tick so the
	 * executor has the faction's current runtime state.
	 */
	private executionContext: ExecutionContext | null = null;

	/**
	 * Create a governor for the specified faction.
	 *
	 * @param civId - Faction key (e.g., "reclaimers", "iron_creed")
	 * @param config - Full civilizations config loaded from civilizations.json
	 * @throws Error if the civId is not found in the config
	 */
	constructor(civId: string, config: CivilizationsConfig) {
		this.civId = civId;

		const faction = config[civId];
		if (!faction) {
			throw new Error(
				`CivilizationGovernor: unknown faction "${civId}". ` +
					`Available: ${Object.keys(config).join(", ")}`,
			);
		}

		this.factionName = faction.name;

		const weights = loadFactionWeights(config, civId);
		if (!weights) {
			throw new Error(
				`CivilizationGovernor: failed to load weights for "${civId}"`,
			);
		}

		this.baseWeights = weights;
		this.effectiveWeights = { ...weights };
	}

	/**
	 * Main update — call once per game tick.
	 *
	 * Evaluates the faction's situation, scores goals, and either continues
	 * the current plan or generates a new one if priorities have shifted.
	 *
	 * @param situation - Snapshot of the faction's current game state
	 * @param worldState - Current GOAP world state for this faction
	 * @returns The action to execute this tick, or null if idle/planning
	 */
	tick(situation: FactionSituation, worldState: WorldState): GOAPAction {
		// Apply situational modifiers to personality weights
		this.effectiveWeights = applySituationalModifiers(
			this.baseWeights,
			situation,
		);

		// Periodically re-evaluate goals
		this.reevalCooldown--;
		if (this.reevalCooldown <= 0) {
			this.reevalCooldown = CivilizationGovernor.REEVAL_INTERVAL;
			this.evaluateGoals(worldState);

			const topGoal = this.scoredGoals.length > 0 ? this.scoredGoals[0] : null;

			if (topGoal && this.shouldSwitchGoal(topGoal)) {
				this.currentGoal = topGoal.goal;
				this.replan(worldState);
			}
		}

		// Execute the current plan
		const action = this.executeNextAction();
		if (action) {
			this.dispatchAction(action);
			return action;
		}

		// Fallback: force gather_resources goal and replan
		this.currentGoal = CivGoal.GATHER_RESOURCES;
		this.replan(worldState);
		const fallbackAction = this.executeNextAction();
		if (fallbackAction) {
			this.dispatchAction(fallbackAction);
			return fallbackAction;
		}

		// Ultimate fallback: BasicHarvest with phone-home flag.
		// This GUARANTEES the governor never returns null — bots always have work.
		const phoneHome = { ...BasicHarvest, needsBaseAssignment: true };
		this.dispatchAction(phoneHome);
		return phoneHome;
	}

	/**
	 * Get the currently active goal.
	 * @returns The CivGoal being pursued, or null if the governor is idle
	 */
	getCurrentGoal(): CivGoal | null {
		return this.currentGoal;
	}

	/**
	 * Get the current action plan.
	 * @returns The remaining actions in the plan, or null if no plan exists
	 */
	getCurrentPlan(): readonly GOAPAction[] | null {
		if (!this.currentPlan) return null;
		return this.currentPlan.slice(this.planStep);
	}

	/**
	 * Get all scored goals from the most recent evaluation, sorted by priority.
	 * Useful for debug UI to see what the governor is "thinking".
	 * @returns Sorted array of scored goals (highest priority first)
	 */
	getScoredGoals(): readonly GoalState[] {
		return this.scoredGoals;
	}

	/**
	 * Get the effective (post-situational-modifier) weights.
	 * Useful for debug UI to see how the personality shifts with game state.
	 * @returns Current effective goal weights
	 */
	getEffectiveWeights(): Readonly<GoalWeights> {
		return this.effectiveWeights;
	}

	/**
	 * Force the governor to re-evaluate goals and replan on the next tick.
	 * Call this when a major event occurs (e.g., faction attacked, unit destroyed).
	 */
	forceReevaluation(): void {
		this.reevalCooldown = 0;
	}

	/**
	 * Attach an action executor that bridges GOAP decisions to game systems.
	 *
	 * Call this once after construction. The executor is called every tick
	 * when the governor dispatches a plan action. Passing null detaches the
	 * executor (no system calls will be made, useful for isolated tests).
	 *
	 * @param executor - The executor to use, or null to detach.
	 */
	setActionExecutor(executor: IActionExecutor | null): void {
		this.actionExecutor = executor;
	}

	/**
	 * Update the runtime execution context used by the action executor.
	 *
	 * Should be called before each `tick()` with the faction's current
	 * unit roster, home position, and game tick. The governor stores this
	 * context and passes it to the executor when dispatching actions.
	 *
	 * @param context - Current faction runtime state for executor dispatch.
	 */
	setExecutionContext(context: ExecutionContext): void {
		this.executionContext = context;
	}

	/**
	 * Notify the governor that the current action has been completed.
	 * Advances the plan step so the next tick returns the next action.
	 */
	completeCurrentAction(): void {
		this.planStep++;
		if (this.currentPlan && this.planStep >= this.currentPlan.length) {
			// Plan complete — clear it so we re-evaluate next tick
			this.currentPlan = null;
			this.currentGoal = null;
			this.planStep = 0;
			this.reevalCooldown = 0; // force re-evaluation
		}
	}

	// -----------------------------------------------------------------------
	// Private
	// -----------------------------------------------------------------------

	/**
	 * Dispatch an action to the attached executor (if any).
	 * Called for every action the governor produces — both planned actions
	 * and fallback actions. No-op when no executor is attached.
	 */
	private dispatchAction(action: GOAPAction): void {
		if (!this.actionExecutor || !this.executionContext) return;
		this.actionExecutor.execute(action, this.executionContext);
	}

	/**
	 * Score all CivGoals using effective weights and sort by priority descending.
	 * Goals whose desired state is already satisfied in worldState get a penalty.
	 */
	private evaluateGoals(worldState: WorldState): void {
		this.scoredGoals = (Object.values(CivGoal) as CivGoal[]).map((goal) => {
			let priority = this.effectiveWeights[goal] ?? 0.5;

			// Penalize goals that are already satisfied
			const desiredState = GOAL_DESIRED_STATE[goal];
			if (desiredState) {
				let allSatisfied = true;
				for (const key of Object.keys(desiredState) as (keyof WorldState)[]) {
					if (worldState[key] !== desiredState[key]) {
						allSatisfied = false;
						break;
					}
				}
				if (allSatisfied) {
					priority *= 0.1; // heavily penalize already-achieved goals
				}
			}

			return { goal, priority } as GoalState;
		});

		this.scoredGoals.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Determine whether the governor should abandon its current goal
	 * in favor of the new top-priority goal.
	 */
	private shouldSwitchGoal(topGoal: GoalState): boolean {
		// No current goal — always switch
		if (this.currentGoal === null || this.currentPlan === null) {
			return true;
		}

		// Same goal — no switch needed
		if (topGoal.goal === this.currentGoal) {
			return false;
		}

		// New goal significantly outprioritizes current goal
		const currentScore = this.scoredGoals.find(
			(g) => g.goal === this.currentGoal,
		);
		if (!currentScore) {
			return true;
		}

		return (
			topGoal.priority - currentScore.priority >
			CivilizationGovernor.PRIORITY_OVERRIDE_THRESHOLD
		);
	}

	/**
	 * Run the GOAP planner to find an action plan for the current goal.
	 */
	private replan(worldState: WorldState): void {
		this.planStep = 0;

		if (!this.currentGoal) {
			this.currentPlan = null;
			return;
		}

		const desiredState = GOAL_DESIRED_STATE[this.currentGoal];
		if (!desiredState) {
			this.currentPlan = null;
			return;
		}

		this.currentPlan = planActions(worldState, desiredState, ALL_ACTIONS);
	}

	/**
	 * Return the next action to execute from the current plan, or null if
	 * no plan is active or the plan is exhausted.
	 */
	private executeNextAction(): GOAPAction | null {
		if (!this.currentPlan || this.planStep >= this.currentPlan.length) {
			return null;
		}
		return this.currentPlan[this.planStep];
	}
}
