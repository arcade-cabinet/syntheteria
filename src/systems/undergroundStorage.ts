/**
 * Underground storage system — players build underground vaults to hide
 * cube stockpiles from AI perception.
 *
 * Enemy civilizations use Yuka perception (vision cones, memory) to spot
 * exposed cube piles and target them for raids. Underground storage removes
 * cubes from the world, making them invisible to AI, at the cost of slower
 * retrieval (deeper = slower).
 *
 * Key mechanics:
 *  - Cubes deposited are removed from the physical world (hidden from AI)
 *  - LIFO stack: most recently deposited cube is withdrawn first
 *  - Depth (1–3) scales retrieval time: depth * 0.5 seconds
 *  - Vaults have durability; when destroyed all cubes "spill" and become visible
 *  - Overflowing storage (more cubes than capacity) breaks concealment
 *
 * No config dependency — all values are hardcoded in this module.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Position {
	x: number;
	y: number;
	z: number;
}

export interface StoredCube {
	cubeId: string;
	materialType: string;
	depositedAt: number; // timestamp
}

export interface UndergroundStorage {
	id: string;
	position: Position;
	ownerFaction: string;
	capacity: number;
	depth: number; // 1–3
	durability: number;
	maxDurability: number;
	destroyed: boolean;
	cubes: StoredCube[];
	spilledCubes: StoredCube[];
}

export interface StorageCapacity {
	current: number;
	max: number;
}

export interface CubeInfo {
	cubeId: string;
	materialType: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DURABILITY = 100;
const RETRIEVAL_TIME_PER_DEPTH = 0.5; // seconds per depth level
const MIN_DEPTH = 1;
const MAX_DEPTH = 3;

/** Economic value per material type for getTotalHiddenValue */
const MATERIAL_VALUES: Record<string, number> = {
	scrap_iron: 5,
	iron: 25,
	copper: 15,
	e_waste: 10,
	fiber_optics: 60,
	rare_alloy: 100,
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const storages = new Map<string, UndergroundStorage>();
let nextId = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampDepth(depth: number): number {
	return Math.max(MIN_DEPTH, Math.min(MAX_DEPTH, Math.floor(depth)));
}

function getMaterialValue(materialType: string): number {
	return MATERIAL_VALUES[materialType] ?? 0;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Register a new underground storage vault.
 * Returns the storage ID.
 */
export function createStorage(
	position: Position,
	ownerFaction: string,
	capacity: number,
	depth: number,
): string {
	const id = `storage-${nextId++}`;
	const storage: UndergroundStorage = {
		id,
		position: { ...position },
		ownerFaction,
		capacity: Math.max(1, Math.floor(capacity)),
		depth: clampDepth(depth),
		durability: MAX_DURABILITY,
		maxDurability: MAX_DURABILITY,
		destroyed: false,
		cubes: [],
		spilledCubes: [],
	};
	storages.set(id, storage);
	return id;
}

/**
 * Remove a storage building. Does not spill cubes — they are simply lost.
 * Use damageStorage to simulate destruction with cube spillage.
 */
export function removeStorage(id: string): void {
	storages.delete(id);
}

/**
 * Deposit a cube into underground storage.
 * Returns true if successfully stored, false if storage is full, destroyed,
 * or does not exist.
 */
export function depositCube(
	storageId: string,
	cubeId: string,
	materialType: string,
): boolean {
	const storage = storages.get(storageId);
	if (!storage) return false;
	if (storage.destroyed) return false;
	if (storage.cubes.length >= storage.capacity) return false;

	storage.cubes.push({
		cubeId,
		materialType,
		depositedAt: Date.now(),
	});
	return true;
}

/**
 * Withdraw the most recently deposited cube (LIFO).
 * Returns cube info or null if empty/destroyed/nonexistent.
 */
export function withdrawCube(storageId: string): CubeInfo | null {
	const storage = storages.get(storageId);
	if (!storage) return null;
	if (storage.destroyed) return null;
	if (storage.cubes.length === 0) return null;

	const cube = storage.cubes.pop()!;
	return { cubeId: cube.cubeId, materialType: cube.materialType };
}

/**
 * Withdraw a cube of a specific material type.
 * Searches from most recently deposited (top of stack) downward.
 * Returns cube info or null if not found.
 */
export function withdrawByMaterial(
	storageId: string,
	materialType: string,
): CubeInfo | null {
	const storage = storages.get(storageId);
	if (!storage) return null;
	if (storage.destroyed) return null;

	// Search from top of stack (most recent) down
	for (let i = storage.cubes.length - 1; i >= 0; i--) {
		if (storage.cubes[i].materialType === materialType) {
			const [cube] = storage.cubes.splice(i, 1);
			return { cubeId: cube.cubeId, materialType: cube.materialType };
		}
	}
	return null;
}

/**
 * Get all cubes currently stored, with material types.
 * Returns a copy of the stored cubes array.
 */
export function getStorageContents(storageId: string): StoredCube[] {
	const storage = storages.get(storageId);
	if (!storage) return [];
	return storage.cubes.map((c) => ({ ...c }));
}

/**
 * Get current and max capacity for a storage vault.
 */
export function getStorageCapacity(storageId: string): StorageCapacity {
	const storage = storages.get(storageId);
	if (!storage) return { current: 0, max: 0 };
	return { current: storage.cubes.length, max: storage.capacity };
}

/**
 * Get all storages belonging to a faction.
 */
export function getStoragesByFaction(faction: string): UndergroundStorage[] {
	const result: UndergroundStorage[] = [];
	for (const storage of storages.values()) {
		if (storage.ownerFaction === faction) {
			result.push({
				...storage,
				position: { ...storage.position },
				cubes: storage.cubes.map((c) => ({ ...c })),
				spilledCubes: storage.spilledCubes.map((c) => ({ ...c })),
			});
		}
	}
	return result;
}

/**
 * Check if cubes in this storage are hidden from AI perception.
 * Returns true unless the storage is destroyed or overflowing
 * (more cubes than capacity).
 */
export function isHiddenFromPerception(storageId: string): boolean {
	const storage = storages.get(storageId);
	if (!storage) return false;
	if (storage.destroyed) return false;
	if (storage.cubes.length > storage.capacity) return false;
	return true;
}

/**
 * Get the retrieval time in seconds for withdrawing cubes from this storage.
 * Deeper storage = longer retrieval time: depth * 0.5 seconds.
 */
export function getRetrievalTime(storageId: string): number {
	const storage = storages.get(storageId);
	if (!storage) return 0;
	return storage.depth * RETRIEVAL_TIME_PER_DEPTH;
}

/**
 * Apply damage to a storage vault. If durability reaches 0, the storage
 * is marked as destroyed and all cubes are moved to the spilled list,
 * making them visible to AI perception again.
 *
 * Returns the remaining durability.
 */
export function damageStorage(storageId: string, amount: number): number {
	const storage = storages.get(storageId);
	if (!storage) return 0;
	if (storage.destroyed) return 0;

	storage.durability = Math.max(0, storage.durability - amount);

	if (storage.durability <= 0) {
		storage.destroyed = true;
		// All cubes spill out and become visible
		storage.spilledCubes = [...storage.cubes];
		storage.cubes = [];
	}

	return storage.durability;
}

/**
 * Get cubes that spilled when a storage was destroyed.
 * Returns empty array if storage is intact, nonexistent, or had no cubes.
 */
export function getSpilledCubes(storageId: string): StoredCube[] {
	const storage = storages.get(storageId);
	if (!storage) return [];
	return storage.spilledCubes.map((c) => ({ ...c }));
}

/**
 * Calculate the total economic value of all hidden cubes for a faction.
 * Only counts cubes in non-destroyed storages (truly hidden).
 */
export function getTotalHiddenValue(faction: string): number {
	let total = 0;
	for (const storage of storages.values()) {
		if (storage.ownerFaction !== faction) continue;
		if (storage.destroyed) continue;
		for (const cube of storage.cubes) {
			total += getMaterialValue(cube.materialType);
		}
	}
	return total;
}

/**
 * Reset all state. For tests and world reset.
 */
export function reset(): void {
	storages.clear();
	nextId = 1;
}
