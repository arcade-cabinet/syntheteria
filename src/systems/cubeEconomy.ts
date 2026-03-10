/**
 * Cube economy system.
 *
 * Tracks per-faction cube inventories, spawning, pickup/drop,
 * theft/trade transfers, and economic value calculations.
 *
 * Material values and properties come from config/cubeMaterials.json.
 * Every cube is a physical 0.5m rigid body with position, health,
 * and an optional holder (entity carrying it).
 *
 * Exports a tick function (cubeEconomySystem) and query helpers.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CubeInfo {
	id: string;
	faction: string;
	materialType: string;
	x: number;
	z: number;
	heldBy: string | null;
	value: number;
	health: number;
}

export interface TheftRecord {
	cubeId: string;
	materialType: string;
	fromFaction: string;
	toFaction: string;
	timestamp: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const cubeMaterials: Record<
	string,
	{ value: number; durability: number; [key: string]: unknown }
> = config.cubeMaterials as Record<
	string,
	{ value: number; durability: number; [key: string]: unknown }
>;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let cubes = new Map<string, CubeInfo>();
let nextCubeId = 1;
let theftLog: TheftRecord[] = [];
let tickCount = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaterialValue(materialType: string): number {
	const mat = cubeMaterials[materialType];
	return mat ? mat.value : 0;
}

function getMaterialDurability(materialType: string): number {
	const mat = cubeMaterials[materialType];
	return mat ? mat.durability : 100;
}

function generateCubeId(): string {
	return `cube_${nextCubeId++}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Spawn a new cube for a faction at a world position.
 * Called when compression completes.
 *
 * Returns the new cube's ID.
 */
export function spawnCube(
	faction: string,
	materialType: string,
	x: number,
	z: number,
): string {
	const id = generateCubeId();
	const cube: CubeInfo = {
		id,
		faction,
		materialType,
		x,
		z,
		heldBy: null,
		value: getMaterialValue(materialType),
		health: getMaterialDurability(materialType),
	};
	cubes.set(id, cube);
	return id;
}

/**
 * Pick up a cube by an entity. The cube must exist and not already
 * be held by another entity.
 *
 * Returns true if pickup succeeded.
 */
export function pickupCube(cubeId: string, entityId: string): boolean {
	const cube = cubes.get(cubeId);
	if (!cube) return false;
	if (cube.heldBy !== null) return false;

	cube.heldBy = entityId;
	return true;
}

/**
 * Drop a cube at a world position. The cube must exist and be held.
 */
export function dropCube(cubeId: string, x: number, z: number): void {
	const cube = cubes.get(cubeId);
	if (!cube) return;

	cube.heldBy = null;
	cube.x = x;
	cube.z = z;
}

/**
 * Transfer ownership of a cube from one faction to another.
 * Used for theft (raiding enemy stockpiles) and trade.
 *
 * The cube must exist and currently belong to fromFaction.
 * Returns true if transfer succeeded.
 */
export function transferCube(
	cubeId: string,
	fromFaction: string,
	toFaction: string,
): boolean {
	const cube = cubes.get(cubeId);
	if (!cube) return false;
	if (cube.faction !== fromFaction) return false;
	if (fromFaction === toFaction) return false;

	theftLog.push({
		cubeId,
		materialType: cube.materialType,
		fromFaction,
		toFaction,
		timestamp: tickCount,
	});

	cube.faction = toFaction;
	return true;
}

/**
 * Get the count of cubes owned by a faction.
 * If materialType is provided, count only cubes of that type.
 */
export function getCubeCount(faction: string, materialType?: string): number {
	let count = 0;
	for (const cube of cubes.values()) {
		if (cube.faction !== faction) continue;
		if (materialType !== undefined && cube.materialType !== materialType)
			continue;
		count++;
	}
	return count;
}

/**
 * Get the total economic value of all cubes owned by a faction.
 */
export function getCubeValue(faction: string): number {
	let total = 0;
	for (const cube of cubes.values()) {
		if (cube.faction === faction) {
			total += cube.value;
		}
	}
	return total;
}

/**
 * Get all cubes owned by a faction.
 * Returns copies to prevent external mutation.
 */
export function getCubesByFaction(faction: string): CubeInfo[] {
	const result: CubeInfo[] = [];
	for (const cube of cubes.values()) {
		if (cube.faction === faction) {
			result.push({ ...cube });
		}
	}
	return result;
}

/**
 * Get the theft log — all transfer events recorded so far.
 * Returns copies to prevent external mutation.
 */
export function getTheftLog(): TheftRecord[] {
	return theftLog.map((r) => ({ ...r }));
}

/**
 * Get a single cube by ID. Returns a copy or undefined.
 */
export function getCube(cubeId: string): CubeInfo | undefined {
	const cube = cubes.get(cubeId);
	return cube ? { ...cube } : undefined;
}

/**
 * Tick-level system entry point.
 *
 * - Decays health of damaged cubes (health < max durability lose 1 hp/tick)
 * - Removes cubes whose health reaches 0
 * - Recalculates cube values based on current health ratio
 *
 * Returns an array of cube IDs that were destroyed this tick.
 */
export function cubeEconomySystem(): string[] {
	tickCount++;
	const destroyed: string[] = [];

	for (const [id, cube] of cubes.entries()) {
		const maxHealth = getMaterialDurability(cube.materialType);

		// Only decay cubes that have been damaged below max health
		if (cube.health < maxHealth) {
			cube.health -= 1;
		}

		// Recalculate value based on health ratio
		const baseValue = getMaterialValue(cube.materialType);
		cube.value = Math.max(0, Math.floor(baseValue * (cube.health / maxHealth)));

		// Destroy cubes at zero health
		if (cube.health <= 0) {
			destroyed.push(id);
			cubes.delete(id);
		}
	}

	return destroyed;
}

/**
 * Inflict damage on a cube. Returns the remaining health.
 * Returns -1 if cube does not exist.
 */
export function damageCube(cubeId: string, amount: number): number {
	const cube = cubes.get(cubeId);
	if (!cube) return -1;

	cube.health = Math.max(0, cube.health - amount);
	return cube.health;
}

/**
 * Reset all cube economy state. Used for tests and new-game initialization.
 */
export function resetCubeEconomy(): void {
	cubes = new Map();
	nextCubeId = 1;
	theftLog = [];
	tickCount = 0;
}
