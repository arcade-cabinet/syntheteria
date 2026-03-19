/**
 * TurnContext — shared mutable state injected before each faction's AI arbitration.
 *
 * Every GoalEvaluator reads from `getTurnContext()` to calculate desirability.
 * The context is set once per faction turn via `setTurnContext()`.
 */

import type { UnitInfo } from "../steering/interposeSteering";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";

// Context injected before arbitration — shared mutable state per faction turn
export interface BuildOption {
	buildingType: string;
	tileX: number;
	tileZ: number;
}

export interface TurnContext {
	enemies: Array<{ entityId: number; x: number; z: number; factionId: string }>;
	deposits: Array<{ entityId: number; x: number; z: number }>;
	boardCenter: { x: number; z: number };
	boardSize: { width: number; height: number };
	aggressionMult: number;
	/** Available buildings the faction can afford + valid placement tiles. */
	buildOptions: BuildOption[];
	/** Existing building count for the faction this turn. */
	factionBuildingCount: number;
	/** Number of motor pools the faction has (for fabrication throughput). */
	motorPoolCount: number;
	/** Number of non-depleted deposits on the entire board. */
	totalDeposits: number;
	/** Current game turn (1-based). */
	currentTurn: number;
	/** Enemy positions remembered from perception (may include stale intel). */
	rememberedEnemies: Array<{
		entityId: number;
		x: number;
		z: number;
		factionId: string;
	}>;
	/** Faction's average unit position — centroid of owned units. */
	factionCenter: { x: number; z: number };
	/** Mineable tiles near faction units (for floor mining backstop). */
	mineableTiles: Array<{ x: number; z: number; material: string }>;
	/** Current unit count for this faction. */
	unitCount: number;
	/** Population cap for this faction (base + outposts + power plants). */
	popCap: number;
	/** Positions of cult units on the board (for evasion calculations). */
	cultThreats: Array<{ x: number; z: number }>;
	/** Positions of friendly faction units (for local force ratio). */
	factionAllies: Array<{ x: number; z: number }>;
	/** Enemy headings derived from perception memory (entity ID → heading vector). */
	enemyHeadings: Map<number, { dx: number; dz: number }>;
	/** Whether the faction has a research lab. */
	hasResearchLab: boolean;
	/** Whether the faction is currently researching a tech. */
	isResearching: boolean;
	/** Number of techs already researched by this faction. */
	researchedTechCount: number;
	/** Detailed ally info for interpose (support units). */
	allyUnits: UnitInfo[];
	/** Detailed enemy info for interpose (support units). */
	enemyUnits: UnitInfo[];
	/** Faction's total territory tile count (for wormhole evaluator). */
	factionTerritoryCount: number;
	/** Whether the faction is the strongest (most territory + units). */
	isStrongestFaction: boolean;
	/** Count of each building type the faction currently owns. */
	existingBuildingTypes: Record<string, number>;
}

let _ctx: TurnContext = {
	enemies: [],
	deposits: [],
	boardCenter: { x: 8, z: 8 },
	boardSize: { width: 16, height: 16 },
	aggressionMult: 1,
	buildOptions: [],
	factionBuildingCount: 0,
	motorPoolCount: 0,
	totalDeposits: 0,
	currentTurn: 1,
	rememberedEnemies: [],
	factionCenter: { x: 8, z: 8 },
	mineableTiles: [],
	unitCount: 0,
	popCap: 12,
	cultThreats: [],
	factionAllies: [],
	enemyHeadings: new Map(),
	hasResearchLab: false,
	isResearching: false,
	researchedTechCount: 0,
	allyUnits: [],
	enemyUnits: [],
	factionTerritoryCount: 0,
	isStrongestFaction: false,
	existingBuildingTypes: {},
};

export function setTurnContext(ctx: TurnContext): void {
	_ctx = ctx;
}

export function getTurnContext(): TurnContext {
	return _ctx;
}

// ---------------------------------------------------------------------------
// Response curve helpers — smooth scoring, no if/else thresholds
// ---------------------------------------------------------------------------

export function manhattan(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

/** Logistic curve: smooth ramp from 0 to 1, centered at midpoint. k controls steepness. */
export function logistic(x: number, midpoint: number, k = 1): number {
	return 1 / (1 + Math.exp(-k * (x - midpoint)));
}

/** Quadratic decay: 1.0 at dist=0, 0 at dist=maxDist, never negative. */
export function quadraticDecay(dist: number, maxDist: number): number {
	const t = Math.min(1, dist / maxDist);
	return Math.max(0, 1 - t * t);
}

/**
 * Momentum bonus: +0.1 if the agent's last action matches the given type.
 * Encourages units to finish what they started. NEVER applies to idle.
 */
export function momentumBonus(agent: SyntheteriaAgent, actionType: string): number {
	if (actionType === "idle") return 0;
	return agent.lastActionType === actionType ? 0.1 : 0;
}
