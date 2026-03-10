/**
 * GoalTypes — defines the strategic goals a civilization governor can pursue.
 *
 * Each CivGoal represents a high-level objective. The governor scores all goals
 * each tick using faction personality weights and current world state, then
 * feeds the highest-priority goal to the GOAP planner to produce an action plan.
 */

/**
 * All strategic goals available to civilization governors.
 * These map to the `evaluatorWeights` keys in the CivilizationGovernorSchema.
 */
export enum CivGoal {
	/** Claim new territory by establishing outposts */
	EXPAND_TERRITORY = "expand_territory",
	/** Collect resources (scrap, e-waste, cubes) from the world */
	GATHER_RESOURCES = "gather_resources",
	/** Build walls and turrets around controlled territory */
	BUILD_DEFENSES = "build_defenses",
	/** Advance through the technology tree */
	RESEARCH_TECH = "research_tech",
	/** Launch an attack against an enemy faction or the player */
	ATTACK_ENEMY = "attack_enemy",
	/** Send scouts to reveal unexplored map regions */
	SCOUT_MAP = "scout_map",
	/** Propose a trade deal with another faction */
	TRADE = "trade",
	/** Accumulate material cubes for future use */
	HOARD_CUBES = "hoard_cubes",
}

/**
 * A scored goal ready for prioritization by the governor.
 * The governor evaluates all CivGoals, scores each one, and picks the
 * highest-priority goal to plan actions around.
 */
export interface GoalState {
	/** Which strategic goal this represents */
	goal: CivGoal;
	/**
	 * Priority score in the range 0..1 after applying faction weights
	 * and world-state modifiers. Higher = more urgent.
	 */
	priority: number;
	/** Optional world-space target location for spatially-oriented goals */
	target?: { x: number; z: number };
}
