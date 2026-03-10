/**
 * GOAPPlanner — A* search planner for Goal-Oriented Action Planning.
 *
 * Given a current world state, a desired goal state, and a set of available
 * actions, the planner finds the cheapest ordered sequence of actions whose
 * cumulative effects transform the current state into one that satisfies
 * every condition in the goal state.
 *
 * The search is an A* over a graph where:
 *   - Each node is a world state snapshot
 *   - Each edge is a GOAPAction whose preconditions are met
 *   - Edge cost is the action's cost
 *   - The heuristic counts unsatisfied goal conditions (admissible)
 *
 * The planner returns null if no valid plan exists (no action sequence can
 * bridge the gap between current and goal state).
 */

import type { GOAPAction, WorldState } from "./ActionTypes.ts";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A node in the A* search graph. */
interface PlannerNode {
	/** Accumulated world state at this node */
	state: WorldState;
	/** Action that was taken to arrive at this node (null for the start node) */
	action: GOAPAction | null;
	/** Parent node in the search tree */
	parent: PlannerNode | null;
	/** Cost from start to this node (g-cost) */
	gCost: number;
	/** Estimated total cost: g + heuristic (f-cost) */
	fCost: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the given state satisfies all conditions in the goal.
 * A condition is satisfied if the state has the same boolean value for that key.
 */
function goalSatisfied(state: WorldState, goal: WorldState): boolean {
	for (const key of Object.keys(goal) as (keyof WorldState)[]) {
		if (state[key] !== goal[key]) {
			return false;
		}
	}
	return true;
}

/**
 * Check whether the given state satisfies all preconditions of an action.
 */
function preconditionsMet(state: WorldState, action: GOAPAction): boolean {
	for (const key of Object.keys(action.preconditions) as (keyof WorldState)[]) {
		if (state[key] !== action.preconditions[key]) {
			return false;
		}
	}
	return true;
}

/**
 * Apply an action's effects to a state, returning a new state (immutable).
 */
function applyEffects(state: WorldState, action: GOAPAction): WorldState {
	return { ...state, ...action.effects };
}

/**
 * Admissible heuristic: count the number of goal conditions not yet satisfied.
 * This never overestimates because each action can satisfy at most a few conditions,
 * and each action has cost >= 1.
 */
function heuristic(state: WorldState, goal: WorldState): number {
	let unsatisfied = 0;
	for (const key of Object.keys(goal) as (keyof WorldState)[]) {
		if (state[key] !== goal[key]) {
			unsatisfied++;
		}
	}
	return unsatisfied;
}

/**
 * Reconstruct the action plan by walking parent pointers from the goal node
 * back to the start node. Returns actions in execution order (start to goal).
 */
function reconstructPlan(node: PlannerNode): GOAPAction[] {
	const plan: GOAPAction[] = [];
	let current: PlannerNode | null = node;
	while (current !== null) {
		if (current.action !== null) {
			plan.unshift(current.action);
		}
		current = current.parent;
	}
	return plan;
}

/**
 * Generate a stable string key for a world state so we can detect revisits.
 * Sorts keys alphabetically for determinism.
 */
function stateKey(state: WorldState): string {
	const entries = Object.entries(state).sort(([a], [b]) => a.localeCompare(b));
	return entries.map(([k, v]) => `${k}:${v ? 1 : 0}`).join("|");
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

/** Maximum number of nodes to expand before giving up (prevents infinite loops). */
const MAX_ITERATIONS = 1000;

/**
 * Plan a sequence of actions to transform `currentState` into a state
 * that satisfies all conditions in `goalState`.
 *
 * @param currentState - The faction's current world state
 * @param goalState - Conditions that must be true for the goal to be achieved
 * @param availableActions - Pool of actions the planner can use
 * @returns Ordered array of actions to execute, or null if no plan exists
 *
 * @example
 * ```ts
 * const plan = planActions(
 *   { has_idle_units: true, has_resources: false },
 *   { territory_expanded: true },
 *   ALL_ACTIONS
 * );
 * // plan might be: [SendScoutParty, AssignMiners, BuildOutpost]
 * ```
 */
export function planActions(
	currentState: WorldState,
	goalState: WorldState,
	availableActions: readonly GOAPAction[],
): GOAPAction[] | null {
	// Early exit: goal already satisfied
	if (goalSatisfied(currentState, goalState)) {
		return [];
	}

	const startNode: PlannerNode = {
		state: { ...currentState },
		action: null,
		parent: null,
		gCost: 0,
		fCost: heuristic(currentState, goalState),
	};

	// Open set as a simple sorted array (adequate for the small action spaces
	// in civilization AI — typically < 20 actions and plans of length 1-4).
	const open: PlannerNode[] = [startNode];
	const closed = new Set<string>();

	let iterations = 0;

	while (open.length > 0 && iterations < MAX_ITERATIONS) {
		iterations++;

		// Pop the node with lowest fCost
		open.sort((a, b) => a.fCost - b.fCost);
		const current = open.shift()!;

		// Check if this state satisfies the goal
		if (goalSatisfied(current.state, goalState)) {
			return reconstructPlan(current);
		}

		const key = stateKey(current.state);
		if (closed.has(key)) {
			continue;
		}
		closed.add(key);

		// Expand: try every action whose preconditions are met
		for (const action of availableActions) {
			if (!preconditionsMet(current.state, action)) {
				continue;
			}

			const newState = applyEffects(current.state, action);
			const newKey = stateKey(newState);

			if (closed.has(newKey)) {
				continue;
			}

			const gCost = current.gCost + action.cost;
			const fCost = gCost + heuristic(newState, goalState);

			open.push({
				state: newState,
				action,
				parent: current,
				gCost,
				fCost,
			});
		}
	}

	// No plan found
	return null;
}
