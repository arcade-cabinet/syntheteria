/**
 * Pursuit steering for faction units.
 *
 * Instead of always seeking the enemy's current position, pursuit
 * predicts where the enemy will be based on their last-known heading
 * and computes an intercept point. This makes faction chase behavior
 * smarter — units cut off fleeing enemies instead of tailing them.
 *
 * Translates Yuka's PursuitBehavior concept to tile-grid coordinates.
 */

/**
 * Compute an intercept target for pursuit.
 *
 * Given a target's current position and last-known heading, predict
 * where they'll be in `lookAhead` turns and return that tile as the
 * pursuit target.
 *
 * @param chaserX - Chaser's current tile X.
 * @param chaserZ - Chaser's current tile Z.
 * @param targetX - Target's current tile X.
 * @param targetZ - Target's current tile Z.
 * @param targetHeadingX - Target's movement direction X (from previous turn).
 * @param targetHeadingZ - Target's movement direction Z (from previous turn).
 * @param boardWidth - Board width for clamping.
 * @param boardHeight - Board height for clamping.
 * @returns The predicted intercept tile.
 */
export function computeInterceptTarget(
	chaserX: number,
	chaserZ: number,
	targetX: number,
	targetZ: number,
	targetHeadingX: number,
	targetHeadingZ: number,
	boardWidth: number,
	boardHeight: number,
): { x: number; z: number } {
	// If target has no heading (stationary), just seek current position
	if (targetHeadingX === 0 && targetHeadingZ === 0) {
		return { x: targetX, z: targetZ };
	}

	// Distance between chaser and target (manhattan)
	const dist =
		Math.abs(chaserX - targetX) + Math.abs(chaserZ - targetZ);

	// Look-ahead time: proportional to distance
	// At dist=1, predict 1 turn ahead; at dist=10, predict 3 turns
	const lookAhead = Math.min(4, Math.max(1, Math.floor(dist / 3)));

	// Predicted position = current + heading * lookAhead
	const predictedX = targetX + targetHeadingX * lookAhead;
	const predictedZ = targetZ + targetHeadingZ * lookAhead;

	// Clamp to board bounds
	return {
		x: Math.max(0, Math.min(boardWidth - 1, Math.round(predictedX))),
		z: Math.max(0, Math.min(boardHeight - 1, Math.round(predictedZ))),
	};
}

/**
 * Determine whether pursuit intercept should be used instead of direct seek.
 *
 * Pursuit is beneficial when:
 *   - The target is moving (has a heading)
 *   - The target is not adjacent (dist > 2)
 *   - The target is moving away from the chaser (flee detection)
 *
 * @returns true if pursuit intercept should be preferred.
 */
export function shouldUsePursuit(
	chaserX: number,
	chaserZ: number,
	targetX: number,
	targetZ: number,
	targetHeadingX: number,
	targetHeadingZ: number,
): boolean {
	if (targetHeadingX === 0 && targetHeadingZ === 0) return false;

	const dist =
		Math.abs(chaserX - targetX) + Math.abs(chaserZ - targetZ);
	if (dist <= 2) return false; // Close enough to seek directly

	// Check if target is moving away from chaser
	// Vector from target to chaser
	const toChaseX = chaserX - targetX;
	const toChaseZ = chaserZ - targetZ;

	// Dot product: if positive, target heading is toward chaser (no pursuit needed)
	// If negative, target is fleeing — pursuit intercept helps
	const dot = toChaseX * targetHeadingX + toChaseZ * targetHeadingZ;

	return dot <= 0; // Target moving away or perpendicular
}
