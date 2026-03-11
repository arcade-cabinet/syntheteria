/**
 * ActionTypes — GOAP actions available to civilization governors.
 *
 * Each GOAPAction defines:
 *   - preconditions: world state keys that must be true before this action can run
 *   - effects: world state keys that become true after this action completes
 *   - cost: planning cost used by the A* planner to find the cheapest plan
 *
 * The planner treats world state as a Record<string, boolean> and searches
 * for the cheapest sequence of actions whose combined effects satisfy the
 * goal state, given the current world state satisfies all preconditions
 * along the chain.
 */

// ---------------------------------------------------------------------------
// World state keys
// ---------------------------------------------------------------------------

/**
 * Keys used in the GOAP world state.
 * Each key represents a boolean condition about the faction's situation.
 */
export const WorldStateKey = {
	/** Faction has idle units available for assignment */
	HAS_IDLE_UNITS: "has_idle_units",
	/** Faction has enough resources to build structures */
	HAS_RESOURCES: "has_resources",
	/** Faction has explored enough map to know where to expand */
	HAS_SCOUTED: "has_scouted",
	/** Faction has an outpost or forward base */
	HAS_OUTPOST: "has_outpost",
	/** Faction's territory has defensive structures */
	HAS_DEFENSES: "has_defenses",
	/** Faction has a target enemy location identified */
	HAS_ENEMY_TARGET: "has_enemy_target",
	/** Faction has active miners producing resources */
	HAS_MINERS: "has_miners",
	/** Faction has completed a tech research */
	HAS_TECH_PROGRESS: "has_tech_progress",
	/** Faction has a trade partner available */
	HAS_TRADE_PARTNER: "has_trade_partner",
	/** Faction territory has been expanded */
	TERRITORY_EXPANDED: "territory_expanded",
	/** Faction resources have been gathered this cycle */
	RESOURCES_GATHERED: "resources_gathered",
	/** Faction defenses are built */
	DEFENSES_BUILT: "defenses_built",
	/** Faction has researched new tech */
	TECH_RESEARCHED: "tech_researched",
	/** Faction has launched an attack */
	ATTACK_LAUNCHED: "attack_launched",
	/** Faction has scouted new areas */
	MAP_SCOUTED: "map_scouted",
	/** Faction has completed a trade */
	TRADE_COMPLETE: "trade_complete",
	/** Faction has hoarded cubes */
	CUBES_HOARDED: "cubes_hoarded",
} as const;
export type WorldStateKey = (typeof WorldStateKey)[keyof typeof WorldStateKey];

/** World state is a partial boolean map over WorldStateKey values. */
export type WorldState = Partial<Record<WorldStateKey, boolean>>;

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

/**
 * A single GOAP action that the planner can chain together.
 * Preconditions must hold in the current (or accumulated) world state;
 * effects are applied to the world state after the action is executed.
 */
export interface GOAPAction {
	/** Unique identifier for this action type */
	name: string;
	/** Human-readable label for debug/UI display */
	label: string;
	/**
	 * World state conditions that must be true before this action can execute.
	 * The planner checks these against the accumulated state during search.
	 */
	preconditions: WorldState;
	/**
	 * World state changes produced by executing this action.
	 * Applied to the accumulated state during planning.
	 */
	effects: WorldState;
	/**
	 * Planning cost. The A* planner minimizes total cost.
	 * Lower-cost actions are preferred when multiple paths exist.
	 */
	cost: number;
	/**
	 * When true, the executing bot should "phone home" to its nearest base
	 * for a concrete task assignment rather than acting autonomously.
	 * Set by the governor's fallback path when no real plan is available.
	 */
	needsBaseAssignment?: boolean;
}

// ---------------------------------------------------------------------------
// Action catalog
// ---------------------------------------------------------------------------

/**
 * Send a group of scouts to explore unknown map regions.
 * Requires idle units. Produces scouted map data.
 */
export const SendScoutParty: GOAPAction = {
	name: "send_scout_party",
	label: "Send Scout Party",
	preconditions: {
		[WorldStateKey.HAS_IDLE_UNITS]: true,
	},
	effects: {
		[WorldStateKey.HAS_SCOUTED]: true,
		[WorldStateKey.MAP_SCOUTED]: true,
	},
	cost: 2,
};

/**
 * Build an outpost at a scouted location to claim territory.
 * Requires scouted area and resources.
 */
export const BuildOutpost: GOAPAction = {
	name: "build_outpost",
	label: "Build Outpost",
	preconditions: {
		[WorldStateKey.HAS_SCOUTED]: true,
		[WorldStateKey.HAS_RESOURCES]: true,
	},
	effects: {
		[WorldStateKey.HAS_OUTPOST]: true,
		[WorldStateKey.TERRITORY_EXPANDED]: true,
	},
	cost: 4,
};

/**
 * Assign idle units to mine resources at known deposits.
 * Requires idle units. Produces active miners and resources.
 */
export const AssignMiners: GOAPAction = {
	name: "assign_miners",
	label: "Assign Miners",
	preconditions: {
		[WorldStateKey.HAS_IDLE_UNITS]: true,
	},
	effects: {
		[WorldStateKey.HAS_MINERS]: true,
		[WorldStateKey.HAS_RESOURCES]: true,
		[WorldStateKey.RESOURCES_GATHERED]: true,
	},
	cost: 2,
};

/**
 * Build walls and turrets around controlled territory.
 * Requires resources and an outpost or base to defend.
 */
export const BuildWalls: GOAPAction = {
	name: "build_walls",
	label: "Build Defensive Walls",
	preconditions: {
		[WorldStateKey.HAS_RESOURCES]: true,
		[WorldStateKey.HAS_OUTPOST]: true,
	},
	effects: {
		[WorldStateKey.HAS_DEFENSES]: true,
		[WorldStateKey.DEFENSES_BUILT]: true,
	},
	cost: 5,
};

/**
 * Invest resources into advancing through the technology tree.
 * Requires resources. Produces tech progress.
 */
export const ResearchTech: GOAPAction = {
	name: "research_tech",
	label: "Research Technology",
	preconditions: {
		[WorldStateKey.HAS_RESOURCES]: true,
	},
	effects: {
		[WorldStateKey.HAS_TECH_PROGRESS]: true,
		[WorldStateKey.TECH_RESEARCHED]: true,
	},
	cost: 6,
};

/**
 * Launch a military raid against an identified enemy position.
 * Requires idle units and a known enemy target.
 */
export const LaunchRaid: GOAPAction = {
	name: "launch_raid",
	label: "Launch Raid",
	preconditions: {
		[WorldStateKey.HAS_IDLE_UNITS]: true,
		[WorldStateKey.HAS_ENEMY_TARGET]: true,
	},
	effects: {
		[WorldStateKey.ATTACK_LAUNCHED]: true,
	},
	cost: 7,
};

/**
 * Propose a trade deal with a neighboring faction.
 * Requires resources and an identified trade partner.
 */
export const TradeOffer: GOAPAction = {
	name: "trade_offer",
	label: "Propose Trade",
	preconditions: {
		[WorldStateKey.HAS_RESOURCES]: true,
		[WorldStateKey.HAS_TRADE_PARTNER]: true,
	},
	effects: {
		[WorldStateKey.TRADE_COMPLETE]: true,
	},
	cost: 3,
};

/**
 * Collect and stockpile material cubes for future use.
 * Requires active miners. Produces hoarded cubes.
 */
export const HoardCubes: GOAPAction = {
	name: "hoard_cubes",
	label: "Hoard Material Cubes",
	preconditions: {
		[WorldStateKey.HAS_MINERS]: true,
	},
	effects: {
		[WorldStateKey.CUBES_HOARDED]: true,
	},
	cost: 3,
};

/**
 * Zero-precondition resource gathering. Always available regardless of world
 * state — ensures the GOAP planner can always find SOME plan from any starting
 * state. Higher cost than AssignMiners so the planner prefers specialized
 * actions when their preconditions are met.
 */
export const BasicHarvest: GOAPAction = {
	name: "basic_harvest",
	label: "Basic Resource Gathering",
	preconditions: {},
	effects: {
		[WorldStateKey.HAS_RESOURCES]: true,
		[WorldStateKey.RESOURCES_GATHERED]: true,
	},
	cost: 3,
};

/**
 * Produce a new unit from resources. Bridges the gap between "have resources"
 * and "have idle units" so the planner can reach goals requiring units from
 * an empty-unit state.
 */
export const ProduceUnit: GOAPAction = {
	name: "produce_unit",
	label: "Produce New Unit",
	preconditions: {
		[WorldStateKey.HAS_RESOURCES]: true,
	},
	effects: {
		[WorldStateKey.HAS_IDLE_UNITS]: true,
	},
	cost: 5,
};

/**
 * All available GOAP actions. The planner searches this set to build plans.
 * Order does not matter; the planner evaluates all applicable actions.
 */
export const ALL_ACTIONS: readonly GOAPAction[] = [
	SendScoutParty,
	BuildOutpost,
	AssignMiners,
	BuildWalls,
	ResearchTech,
	LaunchRaid,
	TradeOffer,
	HoardCubes,
	BasicHarvest,
	ProduceUnit,
] as const;
