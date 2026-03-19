/**
 * Move command with MP affordability check.
 *
 * Wraps issueMoveCommand with A* pathfinding cost calculation,
 * MP validation, and movement feedback toasts.
 */

import { issueMoveCommand } from "../ai";
import type { Vec3 } from "../ecs/traits";
import { showMovementToast } from "./movementFeedback";
import { findPathWithCost, type PathResult } from "./pathfinding";
import { invalidateUnitPathCache } from "./pathfindingCache";
import { getUnitTurnState, spendMovementPoints } from "./turnSystem";

export interface MoveCommandResult {
	success: boolean;
	reason?: "no_path" | "insufficient_mp" | "no_turn_state";
	path?: PathResult;
}

/**
 * Attempt to move a player unit to a target position.
 * Computes A* path, checks MP affordability, deducts MP, and issues move.
 */
export function tryMoveUnit(
	entityId: string,
	currentPosition: Vec3,
	targetPosition: Vec3,
): MoveCommandResult {
	const turnState = getUnitTurnState(entityId);
	if (!turnState) {
		showMovementToast("No turn state");
		return { success: false, reason: "no_turn_state" };
	}

	const pathResult = findPathWithCost(
		currentPosition,
		targetPosition,
		entityId,
	);

	if (!pathResult.valid) {
		showMovementToast("No path available");
		return { success: false, reason: "no_path", path: pathResult };
	}

	if (pathResult.cost > turnState.movementPoints) {
		showMovementToast("Not enough MP");
		return { success: false, reason: "insufficient_mp", path: pathResult };
	}

	// Deduct MP upfront for the full path cost
	const spent = spendMovementPoints(entityId, pathResult.cost);
	if (!spent) {
		showMovementToast("Not enough MP");
		return { success: false, reason: "insufficient_mp", path: pathResult };
	}

	// Invalidate this unit's path cache since it will be at a new position
	invalidateUnitPathCache(entityId);

	// Issue the actual move command through the AI system
	issueMoveCommand(entityId, targetPosition);

	return { success: true, path: pathResult };
}
