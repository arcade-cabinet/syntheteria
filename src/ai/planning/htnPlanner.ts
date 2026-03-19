/**
 * HTN (Hierarchical Task Network) planner for multi-turn strategies.
 *
 * Decomposes high-level goals into concrete sub-task sequences.
 * The FSM state determines which high-level goal is active.
 * The HTN decomposes it into TaskQueue steps that bypass per-turn GOAP.
 *
 * High-level goals:
 *   "grow_economy"     → [build motor pool, fabricate worker, harvest, synthesize]
 *   "expand_territory" → [build outpost far away, send scout, claim tiles]
 *   "attack_enemy"     → [gather army (3+ units), move toward enemy base, attack]
 *   "research_tech"    → [build research lab, start research, wait for completion]
 */

import type { FactionStateId } from "../fsm/FactionFSM";
import type { DecidedAction } from "../agents/SyntheteriaAgent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A concrete step in a decomposed plan. */
export interface HTNStep {
	/** Human-readable step name. */
	name: string;
	/** Precondition check — returns true if this step can execute. */
	canExecute: (ctx: HTNContext) => boolean;
	/** Generate the action for this step. */
	getAction: (ctx: HTNContext) => DecidedAction | null;
}

/** High-level goal that decomposes into steps. */
export interface HTNGoal {
	id: string;
	/** Display name for debugging. */
	name: string;
	/** Which FSM states activate this goal. */
	fsmStates: FactionStateId[];
	/** Priority (higher = preferred when multiple goals match). */
	priority: number;
	/** Decompose this goal into concrete steps given current context. */
	decompose: (ctx: HTNContext) => HTNStep[];
}

/** Context available to HTN planning — snapshot of faction state. */
export interface HTNContext {
	factionId: string;
	currentTurn: number;
	unitCount: number;
	popCap: number;
	buildingCount: number;
	motorPoolCount: number;
	hasResearchLab: boolean;
	isResearching: boolean;
	researchedTechCount: number;
	/** Total resources (rough estimate). */
	resourceScore: number;
	/** Faction center position. */
	factionCenter: { x: number; z: number };
	/** Board dimensions. */
	boardSize: { width: number; height: number };
	/** Known enemy positions. */
	enemies: ReadonlyArray<{ x: number; z: number; factionId: string }>;
	/** Nearest enemy faction base (estimated from enemy centroid). */
	enemyCentroid: { x: number; z: number } | null;
	/** Whether affordable build options exist. */
	hasBuildOptions: boolean;
	/** Whether there are affordable buildings of specific types. */
	canBuildMotorPool: boolean;
	canBuildOutpost: boolean;
	canBuildResearchLab: boolean;
}

// ---------------------------------------------------------------------------
// Goal definitions
// ---------------------------------------------------------------------------

const GROW_ECONOMY: HTNGoal = {
	id: "grow_economy",
	name: "Grow Economy",
	fsmStates: ["EXPLORE", "EXPAND"],
	priority: 2,
	decompose(ctx) {
		const steps: HTNStep[] = [];

		// Step 1: Build motor pool if none exists
		if (ctx.motorPoolCount === 0) {
			steps.push({
				name: "build_motor_pool",
				canExecute: (c) => c.canBuildMotorPool,
				getAction: () => ({ type: "idle" }), // Signal to build system
			});
		}

		// Step 2: Fabricate workers if unit count is low
		if (ctx.unitCount < ctx.popCap * 0.5) {
			steps.push({
				name: "fabricate_worker",
				canExecute: (c) => c.motorPoolCount > 0,
				getAction: () => ({ type: "idle" }), // Fabrication runs via runAiFabrication
			});
		}

		// Step 3: Harvest — move toward resources
		steps.push({
			name: "harvest_resources",
			canExecute: () => true,
			getAction: () => null, // Defers to HarvestEvaluator
		});

		return steps;
	},
};

const EXPAND_TERRITORY: HTNGoal = {
	id: "expand_territory",
	name: "Expand Territory",
	fsmStates: ["EXPAND"],
	priority: 3,
	decompose(ctx) {
		const steps: HTNStep[] = [];

		// Step 1: Build outpost at frontier
		if (ctx.canBuildOutpost && ctx.buildingCount >= 3) {
			steps.push({
				name: "build_outpost",
				canExecute: (c) => c.canBuildOutpost,
				getAction: () => ({ type: "idle" }), // Build system handles
			});
		}

		// Step 2: Send scout to frontier
		steps.push({
			name: "scout_frontier",
			canExecute: () => true,
			getAction: (c) => {
				// Move toward furthest unexplored quadrant from faction center
				const { width, height } = c.boardSize;
				const fc = c.factionCenter;
				// Pick the quadrant furthest from center
				const quadrants = [
					{ x: Math.floor(width * 0.2), z: Math.floor(height * 0.2) },
					{ x: Math.floor(width * 0.8), z: Math.floor(height * 0.2) },
					{ x: Math.floor(width * 0.2), z: Math.floor(height * 0.8) },
					{ x: Math.floor(width * 0.8), z: Math.floor(height * 0.8) },
				];
				let best = quadrants[0];
				let bestDist = 0;
				for (const q of quadrants) {
					const dist =
						Math.abs(fc.x - q.x) + Math.abs(fc.z - q.z);
					if (dist > bestDist) {
						bestDist = dist;
						best = q;
					}
				}
				return { type: "move", toX: best.x, toZ: best.z };
			},
		});

		return steps;
	},
};

const ATTACK_ENEMY: HTNGoal = {
	id: "attack_enemy",
	name: "Attack Enemy",
	fsmStates: ["ATTACK"],
	priority: 4,
	decompose(ctx) {
		const steps: HTNStep[] = [];

		// Step 1: Gather army — need 3+ military units before attacking
		if (ctx.unitCount < 3) {
			steps.push({
				name: "gather_army",
				canExecute: (c) => c.motorPoolCount > 0,
				getAction: () => ({ type: "idle" }), // Fabrication fills the army
			});
			return steps; // Don't proceed to attack without army
		}

		// Step 2: Move toward enemy base
		if (ctx.enemyCentroid) {
			steps.push({
				name: "march_to_enemy",
				canExecute: () => true,
				getAction: (c) => {
					if (!c.enemyCentroid) return null;
					return {
						type: "move",
						toX: c.enemyCentroid.x,
						toZ: c.enemyCentroid.z,
					};
				},
			});
		}

		// Step 3: Attack
		steps.push({
			name: "engage_enemy",
			canExecute: () => true,
			getAction: () => null, // Defers to AttackEvaluator
		});

		return steps;
	},
};

const RESEARCH_TECH: HTNGoal = {
	id: "research_tech",
	name: "Research Tech",
	fsmStates: ["EXPLORE", "EXPAND", "FORTIFY"],
	priority: 1,
	decompose(ctx) {
		const steps: HTNStep[] = [];

		// Step 1: Build research lab if none exists
		if (!ctx.hasResearchLab) {
			steps.push({
				name: "build_research_lab",
				canExecute: (c) => c.canBuildResearchLab,
				getAction: () => ({ type: "idle" }), // Build system handles
			});
		}

		// Step 2: Start research if lab exists but not researching
		if (ctx.hasResearchLab && !ctx.isResearching) {
			steps.push({
				name: "start_research",
				canExecute: (c) => c.hasResearchLab && !c.isResearching,
				getAction: () => ({ type: "idle" }), // Research runs via runAiResearch
			});
		}

		return steps;
	},
};

// ---------------------------------------------------------------------------
// Goal registry
// ---------------------------------------------------------------------------

const ALL_GOALS: HTNGoal[] = [
	GROW_ECONOMY,
	EXPAND_TERRITORY,
	ATTACK_ENEMY,
	RESEARCH_TECH,
];

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

/**
 * Select the best HTN goal for the current FSM state and decompose it.
 * Returns the ordered list of steps the faction should execute.
 */
export function planForState(
	fsmState: FactionStateId,
	ctx: HTNContext,
): HTNStep[] {
	// Find all goals that match the current FSM state
	const candidates = ALL_GOALS.filter((g) =>
		g.fsmStates.includes(fsmState),
	);

	if (candidates.length === 0) return [];

	// Sort by priority (highest first)
	candidates.sort((a, b) => b.priority - a.priority);

	// Decompose the highest-priority applicable goal
	for (const goal of candidates) {
		const steps = goal.decompose(ctx);
		if (steps.length > 0) return steps;
	}

	return [];
}

/**
 * Get the first executable action from a plan.
 * Walks through steps and returns the first one whose precondition passes.
 */
export function getNextAction(
	steps: HTNStep[],
	ctx: HTNContext,
): DecidedAction | null {
	for (const step of steps) {
		if (step.canExecute(ctx)) {
			const action = step.getAction(ctx);
			if (action) return action;
		}
	}
	return null;
}

/**
 * Full HTN pipeline: select goal → decompose → get first executable action.
 */
export function htnDecide(
	fsmState: FactionStateId,
	ctx: HTNContext,
): DecidedAction | null {
	const steps = planForState(fsmState, ctx);
	return getNextAction(steps, ctx);
}

// Re-export for testing
export { ALL_GOALS, GROW_ECONOMY, EXPAND_TERRITORY, ATTACK_ENEMY, RESEARCH_TECH };
