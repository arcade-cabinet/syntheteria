/**
 * Spatial index — grid-based spatial hashing for fast proximity queries.
 *
 * Used by combat, perception, interaction, and hazard systems to find
 * nearby entities without O(n²) distance checks.
 *
 * Grid cells are square with configurable size. Entities are tracked
 * by their current cell. Queries check the entity's cell and its
 * neighbors (3x3 grid for single-cell queries, larger for range queries).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpatialEntity {
	id: string;
	x: number;
	z: number;
}

export interface QueryResult {
	id: string;
	x: number;
	z: number;
	distanceSq: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CELL_SIZE = 16;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let cellSize = DEFAULT_CELL_SIZE;

/** Map from cell key "cx,cz" to Set of entity IDs. */
const grid = new Map<string, Set<string>>();

/** Map from entity ID to its current position and cell key. */
const entities = new Map<
	string,
	{ x: number; z: number; cellKey: string }
>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellKey(x: number, z: number): string {
	const cx = Math.floor(x / cellSize);
	const cz = Math.floor(z / cellSize);
	return `${cx},${cz}`;
}

function cellCoords(x: number, z: number): [number, number] {
	return [Math.floor(x / cellSize), Math.floor(z / cellSize)];
}

function addToCell(key: string, id: string): void {
	let cell = grid.get(key);
	if (!cell) {
		cell = new Set();
		grid.set(key, cell);
	}
	cell.add(id);
}

function removeFromCell(key: string, id: string): void {
	const cell = grid.get(key);
	if (cell) {
		cell.delete(id);
		if (cell.size === 0) {
			grid.delete(key);
		}
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set the grid cell size. Smaller = more precise but more cells.
 * Must be called before inserting entities (or call reset first).
 */
export function setCellSize(size: number): void {
	cellSize = Math.max(1, size);
}

/**
 * Get the current cell size.
 */
export function getCellSize(): number {
	return cellSize;
}

/**
 * Insert or update an entity's position in the spatial index.
 */
export function updateEntity(id: string, x: number, z: number): void {
	const newKey = cellKey(x, z);
	const existing = entities.get(id);

	if (existing) {
		if (existing.cellKey !== newKey) {
			removeFromCell(existing.cellKey, id);
			addToCell(newKey, id);
		}
		existing.x = x;
		existing.z = z;
		existing.cellKey = newKey;
	} else {
		addToCell(newKey, id);
		entities.set(id, { x, z, cellKey: newKey });
	}
}

/**
 * Remove an entity from the spatial index.
 */
export function removeEntity(id: string): void {
	const existing = entities.get(id);
	if (existing) {
		removeFromCell(existing.cellKey, id);
		entities.delete(id);
	}
}

/**
 * Query all entities within a radius of a point.
 * Returns results sorted by distance (closest first).
 */
export function queryRadius(
	x: number,
	z: number,
	radius: number,
): QueryResult[] {
	const radiusSq = radius * radius;
	const results: QueryResult[] = [];

	// Determine which cells to check
	const [minCx, minCz] = cellCoords(x - radius, z - radius);
	const [maxCx, maxCz] = cellCoords(x + radius, z + radius);

	for (let cx = minCx; cx <= maxCx; cx++) {
		for (let cz = minCz; cz <= maxCz; cz++) {
			const key = `${cx},${cz}`;
			const cell = grid.get(key);
			if (!cell) continue;

			for (const id of cell) {
				const e = entities.get(id);
				if (!e) continue;

				const dx = e.x - x;
				const dz = e.z - z;
				const distSq = dx * dx + dz * dz;

				if (distSq <= radiusSq) {
					results.push({ id, x: e.x, z: e.z, distanceSq: distSq });
				}
			}
		}
	}

	results.sort((a, b) => a.distanceSq - b.distanceSq);
	return results;
}

/**
 * Query the nearest entity to a point within a maximum radius.
 * Returns null if no entity found.
 */
export function queryNearest(
	x: number,
	z: number,
	maxRadius: number,
): QueryResult | null {
	const results = queryRadius(x, z, maxRadius);
	return results.length > 0 ? results[0] : null;
}

/**
 * Query all entities within a rectangular region.
 */
export function queryRect(
	minX: number,
	minZ: number,
	maxX: number,
	maxZ: number,
): QueryResult[] {
	const results: QueryResult[] = [];
	const centerX = (minX + maxX) / 2;
	const centerZ = (minZ + maxZ) / 2;

	const [cellMinX, cellMinZ] = cellCoords(minX, minZ);
	const [cellMaxX, cellMaxZ] = cellCoords(maxX, maxZ);

	for (let cx = cellMinX; cx <= cellMaxX; cx++) {
		for (let cz = cellMinZ; cz <= cellMaxZ; cz++) {
			const key = `${cx},${cz}`;
			const cell = grid.get(key);
			if (!cell) continue;

			for (const id of cell) {
				const e = entities.get(id);
				if (!e) continue;

				if (e.x >= minX && e.x <= maxX && e.z >= minZ && e.z <= maxZ) {
					const dx = e.x - centerX;
					const dz = e.z - centerZ;
					results.push({
						id,
						x: e.x,
						z: e.z,
						distanceSq: dx * dx + dz * dz,
					});
				}
			}
		}
	}

	results.sort((a, b) => a.distanceSq - b.distanceSq);
	return results;
}

/**
 * Get the total number of tracked entities.
 */
export function getEntityCount(): number {
	return entities.size;
}

/**
 * Get the number of occupied cells.
 */
export function getCellCount(): number {
	return grid.size;
}

/**
 * Check if an entity is tracked.
 */
export function hasEntity(id: string): boolean {
	return entities.has(id);
}

/**
 * Get an entity's current position.
 */
export function getEntityPosition(
	id: string,
): { x: number; z: number } | null {
	const e = entities.get(id);
	if (!e) return null;
	return { x: e.x, z: e.z };
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Clear all spatial index state. For testing.
 */
export function resetSpatialIndex(): void {
	grid.clear();
	entities.clear();
	cellSize = DEFAULT_CELL_SIZE;
}
