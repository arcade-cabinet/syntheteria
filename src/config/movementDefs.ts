/**
 * Movement profile definitions per robot class.
 *
 * Each robot class has distinct movement characteristics:
 *   - movesPerTurn:    how many separate move actions per turn
 *   - cellsPerMove:    max Manhattan distance per single move
 *
 * Staging is per-ACTION, not per-unit — see classActions.ts.
 * Complex actions (ranged attack, build, deep harvest) require staging;
 * simple actions (melee, quick harvest, move) do not.
 *
 * movesPerTurn × cellsPerMove = total cells per turn.
 * Example: Scout (2 × 3 = 6 cells), Infantry (1 × 2 = 2 cells).
 */

import type { RobotClass } from "../robots/types";

export interface MovementProfile {
	/** How many separate move commands per turn. */
	readonly movesPerTurn: number;
	/** Max Manhattan distance per single move. */
	readonly cellsPerMove: number;
}

/**
 * Movement profiles indexed by robot class.
 *
 * Design philosophy:
 * - Scout/Cavalry are mobile (2 moves/turn) — scout has longest range
 * - Infantry is steady (1 move, 2 cells) — reliable march
 * - Ranged/Worker/Support have limited movement but powerful staged actions
 */
export const MOVEMENT_PROFILES: Readonly<Record<RobotClass, MovementProfile>> =
	{
		// ── Faction bots ──────────────────────────────────────────────────────
		scout: { movesPerTurn: 2, cellsPerMove: 3 },
		cavalry: { movesPerTurn: 2, cellsPerMove: 2 },
		infantry: { movesPerTurn: 1, cellsPerMove: 2 },
		ranged: { movesPerTurn: 1, cellsPerMove: 1 },
		support: { movesPerTurn: 1, cellsPerMove: 2 },
		worker: { movesPerTurn: 1, cellsPerMove: 1 },

		// ── Cult mechs ────────────────────────────────────────────────────────
		cult_infantry: { movesPerTurn: 1, cellsPerMove: 2 },
		cult_ranged: { movesPerTurn: 1, cellsPerMove: 1 },
		cult_cavalry: { movesPerTurn: 2, cellsPerMove: 2 },
	} as const;

/**
 * Compute total MP (movement points) for a robot class.
 * MP = movesPerTurn × cellsPerMove.
 */
export function computeMaxMp(robotClass: RobotClass): number {
	const profile = MOVEMENT_PROFILES[robotClass];
	return profile.movesPerTurn * profile.cellsPerMove;
}

/**
 * Get movement profile for a robot class.
 */
export function getMovementProfile(robotClass: RobotClass): MovementProfile {
	return MOVEMENT_PROFILES[robotClass];
}

/** Subset of UnitStats needed for movement checks. */
interface UnitMovementState {
	readonly mp: number;
	readonly movesPerTurn: number;
	readonly cellsPerMove: number;
	readonly movesUsed: number;
	readonly staged: boolean;
}

/**
 * Can this unit issue another move command this turn?
 * Checks: has remaining move commands AND has MP AND not staged.
 */
export function canUnitMove(stats: UnitMovementState): boolean {
	if (stats.staged) return false;
	if (stats.movesUsed >= stats.movesPerTurn) return false;
	if (stats.mp <= 0) return false;
	return true;
}

/**
 * Can this unit use a specific action given its staging state?
 * Staging is per-ACTION — some actions require staging, others don't.
 * Use classActions.ts `canUseAction()` for full action validation.
 */
export function canUnitAct(
	stats: UnitMovementState,
	actionRequiresStaging: boolean,
): boolean {
	if (actionRequiresStaging && !stats.staged) return false;
	return true;
}

/**
 * Max Manhattan distance for this unit's next move command.
 * Clamped to remaining MP so the unit can't overshoot.
 */
export function maxMoveDistance(stats: UnitMovementState): number {
	return Math.min(stats.cellsPerMove, stats.mp);
}
