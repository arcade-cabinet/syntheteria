/**
 * Wander steering for cult units in WANDERER stage.
 *
 * Adapts Yuka's WanderBehavior to discrete tile-grid movement.
 * Instead of continuous forces, we maintain a persistent wander target
 * on a circle projected ahead of the unit, jitter it each turn,
 * and pick the neighbor tile that best aligns with the resulting direction.
 *
 * This produces organic, meandering movement rather than deterministic
 * back-and-forth or beelining.
 */

import type { TilePos } from "./flockingSteering";

// ---------------------------------------------------------------------------
// Wander state — persisted per-unit across turns
// ---------------------------------------------------------------------------

/** Per-unit wander state keyed by "x,z" of the unit's current position hash. */
const _wanderTargets = new Map<number, { tx: number; tz: number }>();

/** Seeded PRNG for deterministic wander jitter. */
function seededRandom(seed: number): number {
	// mulberry32
	let t = (seed + 0x6d2b79f5) | 0;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Core wander computation
// ---------------------------------------------------------------------------

/**
 * Compute a wander direction for a unit.
 *
 * Maintains a target point on a circle of `radius` projected `distance`
 * tiles ahead of the unit. Each call jitters that target point by up to
 * `jitter` tiles, then returns the resulting direction.
 *
 * @param unitId - Unique identifier for wander state persistence.
 * @param unitX - Unit's current tile X.
 * @param unitZ - Unit's current tile Z.
 * @param headingX - Last movement direction X (-1, 0, or 1).
 * @param headingZ - Last movement direction Z (-1, 0, or 1).
 * @param turnSeed - Seed for deterministic jitter (e.g. turn * 31 + unitId).
 * @param radius - Wander circle radius (default 2).
 * @param distance - Projection distance ahead (default 3).
 * @param jitter - Max jitter displacement per turn (default 1.5).
 * @returns Normalized direction vector (dx, dz).
 */
export function computeWanderDirection(
	unitId: number,
	unitX: number,
	unitZ: number,
	headingX: number,
	headingZ: number,
	turnSeed: number,
	radius = 2,
	distance = 3,
	jitter = 1.5,
): { dx: number; dz: number } {
	// Get or initialize wander target on the circle
	let target = _wanderTargets.get(unitId);
	if (!target) {
		// Initialize on the circle using seed
		const theta = seededRandom(unitId * 7919) * Math.PI * 2;
		target = {
			tx: radius * Math.cos(theta),
			tz: radius * Math.sin(theta),
		};
		_wanderTargets.set(unitId, target);
	}

	// Jitter the target
	const r1 = seededRandom(turnSeed);
	const r2 = seededRandom(turnSeed + 1);
	target.tx += (r1 * 2 - 1) * jitter;
	target.tz += (r2 * 2 - 1) * jitter;

	// Re-project onto the circle (normalize then scale by radius)
	const len = Math.sqrt(target.tx * target.tx + target.tz * target.tz);
	if (len > 0.001) {
		target.tx = (target.tx / len) * radius;
		target.tz = (target.tz / len) * radius;
	}

	// Project the circle center ahead of the unit along its heading
	let hx = headingX;
	let hz = headingZ;
	const hlen = Math.sqrt(hx * hx + hz * hz);
	if (hlen < 0.001) {
		// No heading — use a random direction from seed
		const angle = seededRandom(unitId * 1013) * Math.PI * 2;
		hx = Math.cos(angle);
		hz = Math.sin(angle);
	} else {
		hx /= hlen;
		hz /= hlen;
	}

	// World-space wander target = unit + heading * distance + circleTarget
	const worldX = hx * distance + target.tx;
	const worldZ = hz * distance + target.tz;

	// Normalize the direction
	const dirLen = Math.sqrt(worldX * worldX + worldZ * worldZ);
	if (dirLen < 0.001) return { dx: hx, dz: hz };

	return { dx: worldX / dirLen, dz: worldZ / dirLen };
}

/**
 * Pick the best neighbor tile for a wandering unit.
 *
 * Combines wander direction with a patrol-center bias to keep the unit
 * within patrol radius while meandering organically.
 *
 * @param unitId - Unique identifier for wander state.
 * @param unitPos - Current tile position.
 * @param headingX - Last movement direction X.
 * @param headingZ - Last movement direction Z.
 * @param candidates - Passable neighbor tiles.
 * @param patrolCenter - Center to loosely orbit around.
 * @param patrolRadius - Max distance from center before bias kicks in.
 * @param turnSeed - Seed for deterministic jitter.
 * @returns Best tile to move to, or null if no candidates.
 */
export function pickWanderTile(
	unitId: number,
	unitPos: TilePos,
	headingX: number,
	headingZ: number,
	candidates: TilePos[],
	patrolCenter: TilePos,
	patrolRadius: number,
	turnSeed: number,
): TilePos | null {
	if (candidates.length === 0) return null;
	if (candidates.length === 1) return candidates[0];

	const wander = computeWanderDirection(
		unitId,
		unitPos.x,
		unitPos.z,
		headingX,
		headingZ,
		turnSeed,
	);

	// Check if we're near the edge of patrol radius — bias toward center
	const distToCenter =
		Math.abs(unitPos.x - patrolCenter.x) + Math.abs(unitPos.z - patrolCenter.z);

	let finalDx = wander.dx;
	let finalDz = wander.dz;

	if (distToCenter > patrolRadius * 0.7) {
		// Blend in a return-to-center bias proportional to how far out we are
		const overshoot = Math.min(
			1,
			(distToCenter - patrolRadius * 0.7) / (patrolRadius * 0.3),
		);
		const toCenterX = patrolCenter.x - unitPos.x;
		const toCenterZ = patrolCenter.z - unitPos.z;
		const tcLen = Math.sqrt(toCenterX * toCenterX + toCenterZ * toCenterZ);
		if (tcLen > 0) {
			finalDx = finalDx * (1 - overshoot) + (toCenterX / tcLen) * overshoot;
			finalDz = finalDz * (1 - overshoot) + (toCenterZ / tcLen) * overshoot;
		}
	}

	// Score candidates by dot product with final direction
	let bestTile = candidates[0];
	let bestScore = -Infinity;

	for (const tile of candidates) {
		const dx = tile.x - unitPos.x;
		const dz = tile.z - unitPos.z;
		const tileLen = Math.sqrt(dx * dx + dz * dz);
		if (tileLen === 0) continue;

		const dot = (dx / tileLen) * finalDx + (dz / tileLen) * finalDz;
		if (dot > bestScore) {
			bestScore = dot;
			bestTile = tile;
		}
	}

	return bestTile;
}

/** Clear all wander state (call on new game). */
export function resetWanderState(): void {
	_wanderTargets.clear();
}
