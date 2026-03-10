/**
 * Cube pile tracker — spatial clustering of cubes into "piles" for world-space UI.
 *
 * Paper playtesting showed the player's cube pile is their wealth — visible to
 * everyone — but there was no world-space UI showing cube counts, materials,
 * or total value. This system groups nearby cubes into piles using grid-based
 * spatial hashing and provides data for world-space labels.
 *
 * Clustering algorithm: spatial grid hashing with configurable cell size.
 * Round each cube's XZ position to a grid cell via floor(coord / cellSize).
 * Cubes in the same cell belong to the same pile. O(n) complexity.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CubeInfo {
	cubeId: string;
	materialType: string;
	position: { x: number; y: number; z: number };
	ownerFaction: string;
}

export interface CubePile {
	pileId: string;
	center: { x: number; y: number; z: number };
	cubeCount: number;
	materialBreakdown: Record<string, number>;
	totalEconomicValue: number;
	ownerFaction: string;
	topY: number;
}

// ---------------------------------------------------------------------------
// Economic values (hardcoded per spec)
// ---------------------------------------------------------------------------

const MATERIAL_VALUES: Record<string, number> = {
	scrap_iron: 5,
	iron: 25,
	copper: 15,
	e_waste: 10,
	fiber_optics: 60,
	rare_alloy: 100,
};

const DEFAULT_VALUE = 5;

function getMaterialValue(materialType: string): number {
	return MATERIAL_VALUES[materialType] ?? DEFAULT_VALUE;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** All registered cubes indexed by cubeId. */
let cubes = new Map<string, CubeInfo>();

/** Computed piles from the last recalculation. */
let piles: CubePile[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellKey(x: number, z: number, cellSize: number): string {
	const cx = Math.floor(x / cellSize);
	const cz = Math.floor(z / cellSize);
	return `${cx},${cz}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a cube for pile tracking.
 */
export function registerCube(cube: CubeInfo): void {
	cubes.set(cube.cubeId, { ...cube, position: { ...cube.position } });
}

/**
 * Remove a cube from tracking (grabbed, destroyed, etc.).
 */
export function unregisterCube(cubeId: string): void {
	cubes.delete(cubeId);
}

/**
 * Update a tracked cube's position.
 */
export function updateCubePosition(
	cubeId: string,
	position: { x: number; y: number; z: number },
): void {
	const cube = cubes.get(cubeId);
	if (cube) {
		cube.position = { ...position };
	}
}

/**
 * Re-cluster all tracked cubes into piles using grid-based spatial hashing.
 *
 * Two cubes are in the same pile if they share the same grid cell, where
 * the cell is determined by floor(x / clusterRadius) and floor(z / clusterRadius).
 *
 * Within each cell, cubes are further grouped by ownerFaction so that
 * different factions' cubes in the same area form separate piles.
 */
export function recalculatePiles(clusterRadius: number): void {
	// Group cubes by (cellKey, ownerFaction)
	const groups = new Map<string, CubeInfo[]>();

	for (const cube of cubes.values()) {
		const cell = cellKey(cube.position.x, cube.position.z, clusterRadius);
		const groupKey = `${cell}|${cube.ownerFaction}`;

		let group = groups.get(groupKey);
		if (!group) {
			group = [];
			groups.set(groupKey, group);
		}
		group.push(cube);
	}

	// Build piles from groups
	const result: CubePile[] = [];
	let pileIndex = 0;

	for (const [_groupKey, groupCubes] of groups.entries()) {
		pileIndex++;

		// Compute center as average position
		let sumX = 0;
		let sumY = 0;
		let sumZ = 0;
		let topY = -Infinity;
		const materialBreakdown: Record<string, number> = {};
		let totalValue = 0;

		for (const cube of groupCubes) {
			sumX += cube.position.x;
			sumY += cube.position.y;
			sumZ += cube.position.z;

			if (cube.position.y > topY) {
				topY = cube.position.y;
			}

			materialBreakdown[cube.materialType] =
				(materialBreakdown[cube.materialType] ?? 0) + 1;

			totalValue += getMaterialValue(cube.materialType);
		}

		const count = groupCubes.length;

		result.push({
			pileId: `pile_${pileIndex}`,
			center: {
				x: sumX / count,
				y: sumY / count,
				z: sumZ / count,
			},
			cubeCount: count,
			materialBreakdown,
			totalEconomicValue: totalValue,
			ownerFaction: groupCubes[0].ownerFaction,
			topY,
		});
	}

	piles = result;
}

/**
 * Get all computed piles.
 */
export function getPiles(): CubePile[] {
	return piles;
}

/**
 * Get piles belonging to a specific faction.
 */
export function getPilesByFaction(faction: string): CubePile[] {
	return piles.filter((p) => p.ownerFaction === faction);
}

/**
 * Get the pile with the most cubes, or null if no piles exist.
 */
export function getLargestPile(): CubePile | null {
	if (piles.length === 0) return null;

	let largest = piles[0];
	for (let i = 1; i < piles.length; i++) {
		if (piles[i].cubeCount > largest.cubeCount) {
			largest = piles[i];
		}
	}
	return largest;
}

/**
 * Get the total economic value of all piles owned by a faction.
 */
export function getTotalValueByFaction(faction: string): number {
	let total = 0;
	for (const pile of piles) {
		if (pile.ownerFaction === faction) {
			total += pile.totalEconomicValue;
		}
	}
	return total;
}

/**
 * Find the pile nearest to a position within a given radius.
 * Returns null if no pile center is within the radius.
 */
export function getPileAt(
	position: { x: number; y: number; z: number },
	radius: number,
): CubePile | null {
	const radiusSq = radius * radius;
	let nearest: CubePile | null = null;
	let nearestDistSq = Infinity;

	for (const pile of piles) {
		const dx = pile.center.x - position.x;
		const dy = pile.center.y - position.y;
		const dz = pile.center.z - position.z;
		const distSq = dx * dx + dy * dy + dz * dz;

		if (distSq <= radiusSq && distSq < nearestDistSq) {
			nearest = pile;
			nearestDistSq = distSq;
		}
	}

	return nearest;
}

/**
 * Clear all tracking state. For testing and new-game initialization.
 */
export function reset(): void {
	cubes = new Map();
	piles = [];
}
