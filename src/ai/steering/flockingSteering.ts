/**
 * Flocking steering for cult units.
 *
 * Translates Yuka's continuous steering behaviors (Alignment, Cohesion,
 * Separation) into discrete tile-grid movement. Instead of computing a
 * displacement vector for real-time movement, we evaluate the combined
 * flocking force and pick the neighbor tile whose direction best aligns
 * with it.
 *
 * The result: cult units naturally swarm together, maintaining cohesion
 * while avoiding stacking on the same tile.
 */

import {
	AlignmentBehavior,
	CohesionBehavior,
	SeparationBehavior,
	Vector3,
	Vehicle,
} from "yuka";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TilePos {
	x: number;
	z: number;
}

// ---------------------------------------------------------------------------
// Flocking force computation
// ---------------------------------------------------------------------------

/** Weights for the three flocking components. */
const SEPARATION_WEIGHT = 2.0;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 1.0;

/** Reusable behavior instances (stateless calculation, safe to share). */
const _alignment = new AlignmentBehavior();
const _cohesion = new CohesionBehavior();
const _separation = new SeparationBehavior();

_alignment.weight = ALIGNMENT_WEIGHT;
_cohesion.weight = COHESION_WEIGHT;
_separation.weight = SEPARATION_WEIGHT;

/** Scratch vectors to avoid per-call allocation. */
const _forceA = new Vector3();
const _forceC = new Vector3();
const _forceS = new Vector3();
const _combined = new Vector3();

/**
 * Compute a flocking force for a cult unit given its neighbors.
 *
 * We create lightweight Vehicle proxies just for the steering math —
 * position.x = tileX, position.z = tileZ, y = 0. The returned Vector3
 * is a direction hint (not a tile coordinate).
 *
 * @param unit - The cult unit's tile position.
 * @param heading - Unit's current heading (dx, dz from last move, or 0,0).
 * @param neighbors - Positions of nearby cult units (same sect or all cult).
 * @returns A 2D direction vector (x, z) representing the flocking force.
 *          Zero-length if no neighbors or forces cancel out.
 */
export function computeFlockingForce(
	unit: TilePos,
	heading: TilePos,
	neighbors: TilePos[],
): { dx: number; dz: number } {
	if (neighbors.length === 0) return { dx: 0, dz: 0 };

	// Build the "self" vehicle
	const self = new Vehicle();
	self.position.set(unit.x, 0, unit.z);
	// Set velocity from heading so AlignmentBehavior can read direction
	self.velocity.set(heading.x, 0, heading.z);
	if (self.velocity.squaredLength() > 0) {
		self.velocity.normalize();
	}

	// Build neighbor vehicles and attach to self.neighbors
	const neighborVehicles: Vehicle[] = [];
	for (const n of neighbors) {
		const nv = new Vehicle();
		nv.position.set(n.x, 0, n.z);
		// Give neighbors a default heading matching the unit (reasonable assumption)
		nv.velocity.set(heading.x, 0, heading.z);
		if (nv.velocity.squaredLength() > 0) {
			nv.velocity.normalize();
		}
		neighborVehicles.push(nv);
	}

	// Yuka steering reads vehicle.neighbors (populated externally)
	(self as Vehicle & { neighbors: Vehicle[] }).neighbors = neighborVehicles;

	// Calculate each flocking component
	_forceA.set(0, 0, 0);
	_forceC.set(0, 0, 0);
	_forceS.set(0, 0, 0);

	_alignment.calculate(self, _forceA);
	_cohesion.calculate(self, _forceC);
	_separation.calculate(self, _forceS);

	// Combine with weights
	_combined.set(0, 0, 0);
	_combined.add(_forceA.multiplyScalar(ALIGNMENT_WEIGHT));
	_combined.add(_forceC.multiplyScalar(COHESION_WEIGHT));
	_combined.add(_forceS.multiplyScalar(SEPARATION_WEIGHT));

	return { dx: _combined.x, dz: _combined.z };
}

/**
 * Pick the best neighbor tile for a cult unit using flocking forces,
 * combined with a goal direction (toward enemy, toward patrol center, etc.).
 *
 * @param unit - Current tile position.
 * @param heading - Movement heading from last turn.
 * @param cultNeighbors - Positions of nearby cult units.
 * @param candidateTiles - Passable neighbor tiles the unit can move to.
 * @param goalDirection - Optional goal direction (e.g. toward enemy). If provided,
 *                        it's blended with the flocking force.
 * @param goalWeight - Weight for the goal direction (default 1.5 — slightly
 *                     stronger than flocking to ensure cult units still pursue).
 * @returns The best tile to move to, or null if no candidates.
 */
export function pickFlockingTile(
	unit: TilePos,
	heading: TilePos,
	cultNeighbors: TilePos[],
	candidateTiles: TilePos[],
	goalDirection?: { dx: number; dz: number },
	goalWeight = 1.5,
): TilePos | null {
	if (candidateTiles.length === 0) return null;
	if (candidateTiles.length === 1) return candidateTiles[0];

	const flock = computeFlockingForce(unit, heading, cultNeighbors);

	// Combine flocking force with goal direction
	let totalDx = flock.dx;
	let totalDz = flock.dz;
	if (goalDirection) {
		totalDx += goalDirection.dx * goalWeight;
		totalDz += goalDirection.dz * goalWeight;
	}

	// If combined force is negligible, return null (let caller use default behavior)
	const forceMag = Math.abs(totalDx) + Math.abs(totalDz);
	if (forceMag < 0.01) return null;

	// Normalize the combined direction
	const len = Math.sqrt(totalDx * totalDx + totalDz * totalDz);
	const ndx = totalDx / len;
	const ndz = totalDz / len;

	// Score each candidate tile by dot product with the combined direction
	let bestTile = candidateTiles[0];
	let bestScore = -Infinity;

	for (const tile of candidateTiles) {
		const dx = tile.x - unit.x;
		const dz = tile.z - unit.z;
		const tileLen = Math.sqrt(dx * dx + dz * dz);
		if (tileLen === 0) continue; // Skip current position

		const dot = (dx / tileLen) * ndx + (dz / tileLen) * ndz;
		if (dot > bestScore) {
			bestScore = dot;
			bestTile = tile;
		}
	}

	return bestTile;
}
