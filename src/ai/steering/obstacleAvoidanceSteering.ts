/**
 * Obstacle avoidance steering for all AI-controlled units.
 *
 * Adapts Yuka's ObstacleAvoidanceBehavior to discrete tile-grid movement.
 * Instead of continuous ray-based detection, we scan tiles ahead of the
 * unit in its movement direction and compute a lateral displacement force
 * to steer around structural_mass walls and impassable terrain.
 *
 * This prevents units from getting stuck against walls — they smoothly
 * navigate around obstacles by preferring tiles with clear forward paths.
 */

import type { GeneratedBoard } from "../../board/types";
import type { TilePos } from "./flockingSteering";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How many tiles ahead to scan for obstacles (detection box length). */
const DETECTION_RANGE = 3;

/** Weight of the avoidance force relative to goal direction. */
const AVOIDANCE_WEIGHT = 2.0;

// ---------------------------------------------------------------------------
// Obstacle detection
// ---------------------------------------------------------------------------

/**
 * Check if a tile is an obstacle (impassable or structural_mass wall).
 */
function isObstacle(
	x: number,
	z: number,
	board: GeneratedBoard,
): boolean {
	const { width, height } = board.config;
	if (x < 0 || z < 0 || x >= width || z >= height) return true;
	const tile = board.tiles[z]?.[x];
	if (!tile) return true;
	return !tile.passable;
}

/**
 * Compute an obstacle avoidance direction for a unit moving toward a goal.
 *
 * Scans ahead in the movement direction and generates a lateral steering
 * force to avoid the closest obstacle. The force is stronger when the
 * obstacle is closer.
 *
 * @param unitX - Unit's current tile X.
 * @param unitZ - Unit's current tile Z.
 * @param goalX - Target tile X.
 * @param goalZ - Target tile Z.
 * @param board - The game board for passability checks.
 * @returns An avoidance direction (dx, dz) to blend with the goal direction.
 *          Zero if no obstacles detected ahead.
 */
export function computeObstacleAvoidance(
	unitX: number,
	unitZ: number,
	goalX: number,
	goalZ: number,
	board: GeneratedBoard,
): { dx: number; dz: number } {
	// Goal direction
	const gdx = goalX - unitX;
	const gdz = goalZ - unitZ;
	const gLen = Math.sqrt(gdx * gdx + gdz * gdz);
	if (gLen < 0.001) return { dx: 0, dz: 0 };

	const dirX = gdx / gLen;
	const dirZ = gdz / gLen;

	// Scan tiles ahead along movement direction
	let closestObstDist = Infinity;
	let closestObstX = 0;
	let closestObstZ = 0;
	let foundObstacle = false;

	for (let dist = 1; dist <= DETECTION_RANGE; dist++) {
		// Check center + lateral tiles at this distance
		const checkX = Math.round(unitX + dirX * dist);
		const checkZ = Math.round(unitZ + dirZ * dist);

		if (isObstacle(checkX, checkZ, board)) {
			if (dist < closestObstDist) {
				closestObstDist = dist;
				closestObstX = checkX;
				closestObstZ = checkZ;
				foundObstacle = true;
			}
			break; // Only care about first obstacle in path
		}

		// Also check lateral tiles (unit has width)
		const perpX = -dirZ; // Perpendicular direction
		const perpZ = dirX;
		const leftX = Math.round(unitX + dirX * dist + perpX);
		const leftZ = Math.round(unitZ + dirZ * dist + perpZ);
		const rightX = Math.round(unitX + dirX * dist - perpX);
		const rightZ = Math.round(unitZ + dirZ * dist - perpZ);

		if (isObstacle(leftX, leftZ, board) && dist < closestObstDist) {
			closestObstDist = dist;
			closestObstX = leftX;
			closestObstZ = leftZ;
			foundObstacle = true;
		}
		if (isObstacle(rightX, rightZ, board) && dist < closestObstDist) {
			closestObstDist = dist;
			closestObstX = rightX;
			closestObstZ = rightZ;
			foundObstacle = true;
		}
	}

	if (!foundObstacle) return { dx: 0, dz: 0 };

	// Compute lateral force away from the obstacle
	// The closer the obstacle, the stronger the force
	const multiplier = 1 + (DETECTION_RANGE - closestObstDist) / DETECTION_RANGE;

	// Direction from obstacle to unit (push away)
	const awayX = unitX - closestObstX;
	const awayZ = unitZ - closestObstZ;
	const awayLen = Math.sqrt(awayX * awayX + awayZ * awayZ);

	if (awayLen < 0.001) {
		// Unit is on top of the obstacle — push perpendicular to goal direction
		return { dx: -dirZ * multiplier, dz: dirX * multiplier };
	}

	return {
		dx: (awayX / awayLen) * multiplier * AVOIDANCE_WEIGHT,
		dz: (awayZ / awayLen) * multiplier * AVOIDANCE_WEIGHT,
	};
}

/**
 * Score candidate tiles by combining goal direction with obstacle avoidance.
 *
 * For each candidate, computes a combined score from:
 * 1. Alignment with goal direction
 * 2. Obstacle avoidance force
 * 3. Penalty for tiles adjacent to obstacles (prefer open space)
 *
 * @param unitPos - Current unit position.
 * @param goalPos - Target position.
 * @param candidates - Available neighbor tiles.
 * @param board - Game board for obstacle detection.
 * @returns Best candidate tile, or null if no candidates.
 */
export function pickAvoidanceTile(
	unitPos: TilePos,
	goalPos: TilePos,
	candidates: TilePos[],
	board: GeneratedBoard,
): TilePos | null {
	if (candidates.length === 0) return null;
	if (candidates.length === 1) return candidates[0];

	const avoidance = computeObstacleAvoidance(
		unitPos.x,
		unitPos.z,
		goalPos.x,
		goalPos.z,
		board,
	);

	// Goal direction
	const gdx = goalPos.x - unitPos.x;
	const gdz = goalPos.z - unitPos.z;
	const gLen = Math.sqrt(gdx * gdx + gdz * gdz);
	const normGdx = gLen > 0 ? gdx / gLen : 0;
	const normGdz = gLen > 0 ? gdz / gLen : 0;

	// Combine goal + avoidance
	let totalDx = normGdx + avoidance.dx;
	let totalDz = normGdz + avoidance.dz;
	const totalLen = Math.sqrt(totalDx * totalDx + totalDz * totalDz);
	if (totalLen > 0) {
		totalDx /= totalLen;
		totalDz /= totalLen;
	}

	let bestTile = candidates[0];
	let bestScore = -Infinity;

	for (const tile of candidates) {
		const dx = tile.x - unitPos.x;
		const dz = tile.z - unitPos.z;
		const tileLen = Math.sqrt(dx * dx + dz * dz);
		if (tileLen === 0) continue;

		// Dot product with combined direction
		let score = (dx / tileLen) * totalDx + (dz / tileLen) * totalDz;

		// Penalty for tiles adjacent to obstacles (prefer open tiles)
		let adjObstacles = 0;
		const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		for (const [ddx, ddz] of dirs) {
			if (isObstacle(tile.x + ddx, tile.z + ddz, board)) {
				adjObstacles++;
			}
		}
		score -= adjObstacles * 0.1;

		if (score > bestScore) {
			bestScore = score;
			bestTile = tile;
		}
	}

	return bestTile;
}
