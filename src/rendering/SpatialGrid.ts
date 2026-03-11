/**
 * SpatialGrid — 2D uniform grid for spatial partitioning.
 *
 * Provides O(1) average-case cell lookup and O(k) neighbor queries
 * (where k is the number of entities in nearby cells). Used by:
 *
 *   - Physics optimization: skip broad-phase collision checks for
 *     entities in distant cells
 *   - AI perception: find nearby enemies/allies efficiently
 *   - Rendering: determine which entities are in visible cells
 *
 * Uses XZ plane (ignores Y) since the game world is terrain-based.
 *
 * Implementation: flat Map<cellKey, Set<entityId>> where cellKey is
 * the integer pair (cellX, cellZ) encoded as a string.
 *
 * All query functions are pure and exported for unit tests.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GridPosition {
	id: string;
	x: number;
	z: number;
}

export interface GridCell {
	cellX: number;
	cellZ: number;
}

// ---------------------------------------------------------------------------
// Pure utilities — exported for tests
// ---------------------------------------------------------------------------

/**
 * Compute the cell indices for a world position.
 *
 * @param x - World X coordinate
 * @param z - World Z coordinate
 * @param cellSize - Grid cell size in world units
 * @returns Integer cell coordinates
 */
export function worldToCell(x: number, z: number, cellSize: number): GridCell {
	return {
		cellX: Math.floor(x / cellSize),
		cellZ: Math.floor(z / cellSize),
	};
}

/**
 * Encode a cell coordinate pair as a unique string key.
 */
export function cellKey(cellX: number, cellZ: number): string {
	return `${cellX},${cellZ}`;
}

/**
 * Decode a cell key back to integer coordinates.
 */
export function decodeCellKey(key: string): GridCell {
	const parts = key.split(",");
	return {
		cellX: parseInt(parts[0] ?? "0", 10),
		cellZ: parseInt(parts[1] ?? "0", 10),
	};
}

/**
 * Get all cell keys that overlap a circle defined by center + radius.
 * Returns an array of cell keys to check for nearby entities.
 *
 * @param cx - Circle center X
 * @param cz - Circle center Z
 * @param radius - Search radius in world units
 * @param cellSize - Grid cell size
 * @returns Array of cell key strings
 */
export function getCellsInRadius(
	cx: number,
	cz: number,
	radius: number,
	cellSize: number,
): string[] {
	const minCellX = Math.floor((cx - radius) / cellSize);
	const maxCellX = Math.floor((cx + radius) / cellSize);
	const minCellZ = Math.floor((cz - radius) / cellSize);
	const maxCellZ = Math.floor((cz + radius) / cellSize);

	const keys: string[] = [];
	for (let cx2 = minCellX; cx2 <= maxCellX; cx2++) {
		for (let cz2 = minCellZ; cz2 <= maxCellZ; cz2++) {
			keys.push(cellKey(cx2, cz2));
		}
	}
	return keys;
}

/**
 * Compute the squared distance between two XZ positions.
 */
export function sqDistXZ(ax: number, az: number, bx: number, bz: number): number {
	const dx = ax - bx;
	const dz = az - bz;
	return dx * dx + dz * dz;
}

// ---------------------------------------------------------------------------
// SpatialGrid class
// ---------------------------------------------------------------------------

/**
 * 2D uniform spatial grid for fast neighbor queries.
 *
 * Entities are stored by their cell. Moving entities must call
 * move() to keep the grid consistent.
 *
 * Usage:
 *   const grid = new SpatialGrid(10); // 10-unit cells
 *   grid.insert({ id: "bot_1", x: 15, z: 22 });
 *   const nearby = grid.query(15, 22, 12); // all within 12m
 */
export class SpatialGrid {
	private readonly cellSize: number;
	/** Map from cell key → Set of entity IDs */
	private readonly cells = new Map<string, Set<string>>();
	/** Map from entity ID → current cell key (for O(1) removal) */
	private readonly entityCell = new Map<string, string>();
	/** Map from entity ID → position (for radius filtering) */
	private readonly positions = new Map<string, { x: number; z: number }>();

	constructor(cellSize = 10) {
		this.cellSize = cellSize;
	}

	/**
	 * Insert an entity at the given position.
	 * No-op if the entity already exists (use move() to update position).
	 */
	insert(entity: GridPosition): void {
		if (this.entityCell.has(entity.id)) {
			this.move(entity);
			return;
		}
		const { cellX, cellZ } = worldToCell(entity.x, entity.z, this.cellSize);
		const key = cellKey(cellX, cellZ);

		let cell = this.cells.get(key);
		if (!cell) {
			cell = new Set();
			this.cells.set(key, cell);
		}
		cell.add(entity.id);

		this.entityCell.set(entity.id, key);
		this.positions.set(entity.id, { x: entity.x, z: entity.z });
	}

	/**
	 * Remove an entity from the grid.
	 * No-op if the entity is not in the grid.
	 */
	remove(id: string): void {
		const key = this.entityCell.get(id);
		if (!key) return;

		const cell = this.cells.get(key);
		if (cell) {
			cell.delete(id);
			if (cell.size === 0) {
				this.cells.delete(key);
			}
		}

		this.entityCell.delete(id);
		this.positions.delete(id);
	}

	/**
	 * Move an entity to a new position.
	 * Efficient: only updates the cell if the entity crossed a cell boundary.
	 */
	move(entity: GridPosition): void {
		const oldKey = this.entityCell.get(entity.id);
		const { cellX: newCX, cellZ: newCZ } = worldToCell(entity.x, entity.z, this.cellSize);
		const newKey = cellKey(newCX, newCZ);

		if (oldKey === newKey) {
			// Same cell — just update position
			this.positions.set(entity.id, { x: entity.x, z: entity.z });
			return;
		}

		// Remove from old cell
		if (oldKey) {
			const oldCell = this.cells.get(oldKey);
			if (oldCell) {
				oldCell.delete(entity.id);
				if (oldCell.size === 0) this.cells.delete(oldKey);
			}
		}

		// Add to new cell
		let newCell = this.cells.get(newKey);
		if (!newCell) {
			newCell = new Set();
			this.cells.set(newKey, newCell);
		}
		newCell.add(entity.id);

		this.entityCell.set(entity.id, newKey);
		this.positions.set(entity.id, { x: entity.x, z: entity.z });
	}

	/**
	 * Query all entity IDs within a circle.
	 * Returns entities whose stored position is within `radius` of (cx, cz).
	 *
	 * @param cx - Center X
	 * @param cz - Center Z
	 * @param radius - Search radius in world units
	 * @param excludeId - Optional entity ID to exclude from results
	 * @returns Array of entity IDs within the radius
	 */
	query(cx: number, cz: number, radius: number, excludeId?: string): string[] {
		const candidateCells = getCellsInRadius(cx, cz, radius, this.cellSize);
		const radiusSq = radius * radius;
		const results: string[] = [];

		for (const key of candidateCells) {
			const cell = this.cells.get(key);
			if (!cell) continue;
			for (const id of cell) {
				if (id === excludeId) continue;
				const pos = this.positions.get(id);
				if (!pos) continue;
				if (sqDistXZ(cx, cz, pos.x, pos.z) <= radiusSq) {
					results.push(id);
				}
			}
		}

		return results;
	}

	/**
	 * Get the current position of an entity by ID.
	 * Returns null if the entity is not in the grid.
	 */
	getPosition(id: string): { x: number; z: number } | null {
		return this.positions.get(id) ?? null;
	}

	/**
	 * Check if an entity is in the grid.
	 */
	has(id: string): boolean {
		return this.entityCell.has(id);
	}

	/**
	 * Get the total number of entities in the grid.
	 */
	get entityCount(): number {
		return this.entityCell.size;
	}

	/**
	 * Get the total number of occupied cells.
	 */
	get cellCount(): number {
		return this.cells.size;
	}

	/**
	 * Clear all entities from the grid.
	 */
	clear(): void {
		this.cells.clear();
		this.entityCell.clear();
		this.positions.clear();
	}
}
