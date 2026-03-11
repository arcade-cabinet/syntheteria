/**
 * LODManager — distance-based Level of Detail for renderable objects.
 *
 * Classifies objects into LOD buckets based on squared distance to camera.
 * Objects in distant buckets receive simplified geometry descriptors and
 * reduced update frequency.
 *
 * Design goals:
 *   - Zero allocations per frame — uses pre-allocated result arrays
 *   - Pure query functions for testability
 *   - Config-driven thresholds (config/rendering.json lodDistances)
 *   - LOD levels: HIGH (<20m), MEDIUM (20-80m), LOW (>80m), CULLED (>200m)
 *
 * Integration:
 *   - BuildingRenderer calls getLODLevel() per building to choose geometry
 *   - UnitRenderer calls getLODLevel() to skip non-essential animations
 *   - OreDepositRenderer uses LOD to switch between detailed/simple meshes
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LODLevel = "high" | "medium" | "low" | "culled";

export interface LODConfig {
	/** Squared distance for HIGH/MEDIUM boundary (default 20m = 400) */
	highMediumSq: number;
	/** Squared distance for MEDIUM/LOW boundary (default 80m = 6400) */
	mediumLowSq: number;
	/** Squared distance for LOW/CULLED boundary (default 200m = 40000) */
	lowCulledSq: number;
}

export interface LODEntry {
	/** Entity ID */
	id: string;
	/** Current LOD level */
	level: LODLevel;
	/** Squared distance to camera at last classify() call */
	distanceSq: number;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_LOD_CONFIG: LODConfig = {
	highMediumSq: 20 * 20,    // 400  — 20m
	mediumLowSq: 80 * 80,     // 6400 — 80m
	lowCulledSq: 200 * 200,   // 40000 — 200m
};

// ---------------------------------------------------------------------------
// Pure utilities — exported for tests
// ---------------------------------------------------------------------------

/**
 * Classify a single object by its squared distance to camera.
 *
 * @param distanceSq - Squared distance from camera to object center
 * @param config - LOD distance config
 * @returns The LOD level for this object
 */
export function classifyLOD(distanceSq: number, config: LODConfig = DEFAULT_LOD_CONFIG): LODLevel {
	if (distanceSq < config.highMediumSq) return "high";
	if (distanceSq < config.mediumLowSq) return "medium";
	if (distanceSq < config.lowCulledSq) return "low";
	return "culled";
}

/**
 * Compute squared XZ distance between two 2D positions.
 * Y is ignored — relevant for terrain-grounded objects.
 */
export function distanceSqXZ(
	ax: number, az: number,
	bx: number, bz: number,
): number {
	const dx = ax - bx;
	const dz = az - bz;
	return dx * dx + dz * dz;
}

/**
 * Classify a batch of objects by distance to camera position.
 * Returns an array of LODEntry objects.
 * Reuses the provided output array to avoid allocation.
 *
 * @param objects - Array of {id, x, z} world positions
 * @param cameraX - Camera world X
 * @param cameraZ - Camera world Z
 * @param config - LOD thresholds
 * @param out - Output array to write to (will be resized if needed)
 * @returns The out array, populated with LODEntry items
 */
export function classifyBatch(
	objects: ReadonlyArray<{ id: string; x: number; z: number }>,
	cameraX: number,
	cameraZ: number,
	config: LODConfig = DEFAULT_LOD_CONFIG,
	out: LODEntry[] = [],
): LODEntry[] {
	out.length = objects.length;
	for (let i = 0; i < objects.length; i++) {
		const o = objects[i];
		const dsq = distanceSqXZ(o.x, o.z, cameraX, cameraZ);
		const level = classifyLOD(dsq, config);
		const entry = out[i];
		if (entry) {
			entry.id = o.id;
			entry.level = level;
			entry.distanceSq = dsq;
		} else {
			out[i] = { id: o.id, level, distanceSq: dsq };
		}
	}
	return out;
}

/**
 * Count how many objects fall into each LOD level.
 * Useful for HUD debug display and profiling.
 */
export function countByLevel(entries: ReadonlyArray<LODEntry>): Record<LODLevel, number> {
	const counts: Record<LODLevel, number> = { high: 0, medium: 0, low: 0, culled: 0 };
	for (const e of entries) {
		counts[e.level]++;
	}
	return counts;
}

/**
 * Return only the entries that should be rendered (not culled).
 * Writes to the provided output array.
 */
export function filterVisible(
	entries: ReadonlyArray<LODEntry>,
	out: LODEntry[] = [],
): LODEntry[] {
	let j = 0;
	for (const e of entries) {
		if (e.level !== "culled") {
			out[j++] = e;
		}
	}
	out.length = j;
	return out;
}

/**
 * Determine how many frames to skip between updates for an LOD level.
 * HIGH objects update every frame; MEDIUM every 2; LOW every 4.
 * CULLED objects are never updated (caller must check level === 'culled').
 */
export function updateFrequency(level: LODLevel): number {
	switch (level) {
		case "high": return 1;
		case "medium": return 2;
		case "low": return 4;
		case "culled": return Infinity;
	}
}

/**
 * Check if an object should be updated on the current frame number.
 *
 * @param level - The object's current LOD level
 * @param frameIndex - Current frame counter (monotonically increasing)
 * @param objectIndex - Object's stable index (for staggering updates across frames)
 * @returns true if this object should be updated this frame
 */
export function shouldUpdate(level: LODLevel, frameIndex: number, objectIndex: number): boolean {
	if (level === "culled") return false;
	const freq = updateFrequency(level);
	return (frameIndex + objectIndex) % freq === 0;
}

// ---------------------------------------------------------------------------
// LODManager class
// ---------------------------------------------------------------------------

/**
 * Stateful LOD manager. Maintains a per-entity LOD cache and provides
 * efficient per-frame batch classification.
 *
 * Usage:
 *   const lod = new LODManager();
 *   // Each frame:
 *   lod.update(worldObjects, cameraX, cameraZ);
 *   const level = lod.getLevel(entityId);
 */
export class LODManager {
	private readonly config: LODConfig;
	private readonly levels = new Map<string, LODLevel>();
	private frameIndex = 0;
	private _batchOut: LODEntry[] = [];

	constructor(config: Partial<LODConfig> = {}) {
		this.config = { ...DEFAULT_LOD_CONFIG, ...config };
	}

	/**
	 * Update LOD levels for all objects in the scene.
	 * Call once per frame before querying individual levels.
	 */
	update(
		objects: ReadonlyArray<{ id: string; x: number; z: number }>,
		cameraX: number,
		cameraZ: number,
	): void {
		classifyBatch(objects, cameraX, cameraZ, this.config, this._batchOut);
		for (const entry of this._batchOut) {
			this.levels.set(entry.id, entry.level);
		}
		this.frameIndex++;
	}

	/**
	 * Get the current LOD level for an entity ID.
	 * Returns "culled" if the entity was not in the last update() call.
	 */
	getLevel(id: string): LODLevel {
		return this.levels.get(id) ?? "culled";
	}

	/**
	 * Check if an entity should be updated this frame (based on its LOD level).
	 */
	shouldUpdate(id: string, entityIndex: number): boolean {
		return shouldUpdate(this.getLevel(id), this.frameIndex, entityIndex);
	}

	/**
	 * Get stats on the current LOD distribution.
	 */
	getStats(): Record<LODLevel, number> {
		const counts: Record<LODLevel, number> = { high: 0, medium: 0, low: 0, culled: 0 };
		for (const level of this.levels.values()) {
			counts[level]++;
		}
		return counts;
	}

	/**
	 * Remove a specific entity from the cache (e.g. on despawn).
	 */
	remove(id: string): void {
		this.levels.delete(id);
	}

	/**
	 * Clear all cached LOD levels.
	 */
	clear(): void {
		this.levels.clear();
		this.frameIndex = 0;
	}
}
