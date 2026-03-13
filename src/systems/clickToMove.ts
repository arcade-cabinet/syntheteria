/**
 * Click-to-Move System — compute path, check MP, issue move command.
 *
 * When a player clicks a cell on the world grid:
 *   1. Find the currently selected player unit
 *   2. Compute an A* path from unit position to target cell
 *   3. Calculate total MP cost for the path
 *   4. If the unit has enough MP, set the navigation path
 *   5. If insufficient MP, return an error for UI display
 *
 * The actual movement execution is handled by movementSystem —
 * this module only validates affordability and issues the command.
 */

import { Identity, Navigation, Unit, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { gridToWorld, worldToGrid } from "../world/sectorCoordinates";
import { findPathWithCost, type PathResult } from "./pathfinding";
import { getUnitTurnState, hasMovementPoints } from "./turnSystem";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MoveCommandResult =
	| { ok: true; path: { q: number; r: number }[]; cost: number }
	| { ok: false; reason: MoveFailReason };

export type MoveFailReason =
	| "no_selected_unit"
	| "not_player_unit"
	| "no_path"
	| "insufficient_mp"
	| "no_movement_points"
	| "already_there";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Find the currently selected player unit.
 * Returns null if no unit is selected or the selected unit isn't a player unit.
 */
export function getSelectedPlayerUnit() {
	for (const unit of units) {
		const identity = unit.get(Identity);
		const unitData = unit.get(Unit);
		if (!identity || !unitData) continue;
		if (identity.faction === "player" && unitData.selected) {
			return unit;
		}
	}
	return null;
}

/**
 * Attempt to issue a click-to-move command to the target world position.
 *
 * Validates:
 *   - A player unit is selected
 *   - A valid path exists
 *   - The path's total MP cost is affordable
 *
 * On success, sets the unit's navigation path and marks it as moving.
 */
export function issueClickToMove(
	targetX: number,
	targetZ: number,
): MoveCommandResult {
	const entity = getSelectedPlayerUnit();
	if (!entity) {
		return { ok: false, reason: "no_selected_unit" };
	}

	const identity = entity.get(Identity);
	if (!identity || identity.faction !== "player") {
		return { ok: false, reason: "not_player_unit" };
	}

	// Check if the unit has any MP at all
	if (!hasMovementPoints(identity.id)) {
		return { ok: false, reason: "no_movement_points" };
	}

	const pos = entity.get(WorldPosition);
	if (!pos) {
		return { ok: false, reason: "no_selected_unit" };
	}

	// Check if the unit is already at the target cell
	const currentGrid = worldToGrid(pos.x, pos.z);
	const targetGrid = worldToGrid(targetX, targetZ);
	if (currentGrid.q === targetGrid.q && currentGrid.r === targetGrid.r) {
		return { ok: false, reason: "already_there" };
	}

	// Compute path using A* pathfinding
	const result = findPathWithCost(
		pos,
		{ x: targetX, y: 0, z: targetZ },
		identity.id,
	);
	if (!result.valid || result.path.length === 0) {
		return { ok: false, reason: "no_path" };
	}

	// Check MP affordability
	const turnState = getUnitTurnState(identity.id);
	if (!turnState) {
		return { ok: false, reason: "no_movement_points" };
	}

	// Trim path to what the unit can afford with current MP
	const affordablePath = trimPathToMP(result, turnState.movementPoints);

	if (affordablePath.length === 0) {
		return { ok: false, reason: "insufficient_mp" };
	}

	// Issue the move command by setting navigation
	const nav = entity.get(Navigation);
	if (nav) {
		nav.path = affordablePath;
		nav.pathIndex = 0;
		nav.moving = true;
	}

	return {
		ok: true,
		path: affordablePath,
		cost: Math.min(result.cost, turnState.movementPoints),
	};
}

/**
 * Preview a move command without executing it.
 * Returns the path, cost, and whether it's affordable.
 */
export function previewClickToMove(
	targetX: number,
	targetZ: number,
): {
	path: { q: number; r: number }[];
	totalCost: number;
	affordable: boolean;
	availableMP: number;
	affordableSteps: number;
} {
	const entity = getSelectedPlayerUnit();
	if (!entity) {
		return {
			path: [],
			totalCost: 0,
			affordable: false,
			availableMP: 0,
			affordableSteps: 0,
		};
	}

	const identity = entity.get(Identity);
	const pos = entity.get(WorldPosition);
	if (!identity || !pos) {
		return {
			path: [],
			totalCost: 0,
			affordable: false,
			availableMP: 0,
			affordableSteps: 0,
		};
	}

	const result = findPathWithCost(
		pos,
		{ x: targetX, y: 0, z: targetZ },
		identity.id,
	);
	if (!result.valid) {
		return {
			path: [],
			totalCost: 0,
			affordable: false,
			availableMP: 0,
			affordableSteps: 0,
		};
	}

	const turnState = getUnitTurnState(identity.id);
	const availableMP = turnState?.movementPoints ?? 0;
	const affordablePath = trimPathToMP(result, availableMP);

	return {
		path: result.path,
		totalCost: result.cost,
		affordable: result.cost <= availableMP,
		availableMP,
		affordableSteps: affordablePath.length,
	};
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Trim a path to only include steps the unit can afford.
 * Each step costs 1 MP (movement system spends 1 MP per cell traversed).
 */
function trimPathToMP(
	result: PathResult,
	availableMP: number,
): { q: number; r: number }[] {
	// Each cell in the path costs 1 MP in the movement system
	// (movement.ts spends 1 MP per waypoint reached)
	const maxSteps = Math.floor(availableMP);
	if (maxSteps <= 0) return [];
	return result.path.slice(0, maxSteps);
}
