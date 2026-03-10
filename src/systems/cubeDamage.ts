/**
 * Cube HP, damage, and destruction system.
 *
 * Manages hit points for placed cubes (walls, structures) so they can
 * be attacked and breached. Each cube's max HP is determined by its
 * material type, sourced from config/cubeMaterials.json.
 *
 * When a cube reaches 0 HP it is destroyed:
 *  - Its PlacedAt trait is removed (no longer anchored to the grid)
 *  - Its physics body switches to Dynamic (it falls under gravity)
 *  - A structural integrity check is triggered on neighboring cubes
 */

import cubeMaterialsConfig from "../../config/cubeMaterials.json";

// ---------------------------------------------------------------------------
// Material durability data — sourced from config/cubeMaterials.json
// ---------------------------------------------------------------------------

export interface CubeMaterialData {
	displayName: string;
	durability: number;
	weight: number;
	description: string;
}

/**
 * Canonical durability values per material type.
 * Sourced from config/cubeMaterials.json.
 */
export const CUBE_MATERIALS: Record<string, CubeMaterialData> = Object.fromEntries(
	Object.entries(cubeMaterialsConfig)
		.filter(([_, v]) => typeof v === "object" && v !== null && "durability" in v)
		.map(([key, v]) => [
			key,
			{
				displayName: (v as Record<string, unknown>).name as string,
				durability: (v as Record<string, unknown>).durability as number,
				weight: (v as Record<string, unknown>).weight as number,
				description: (v as Record<string, unknown>).description as string,
			},
		]),
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CubeHP {
	current: number;
	max: number;
}

export interface DamageResult {
	destroyed: boolean;
	remainingHP: number;
}

export interface CubeHPInfo {
	current: number;
	max: number;
	percentage: number;
}

export interface CubePosition {
	x: number;
	y: number;
	z: number;
}

// ---------------------------------------------------------------------------
// Module-level HP storage
// ---------------------------------------------------------------------------

const hpStore = new Map<string, CubeHP>();

// ---------------------------------------------------------------------------
// Callbacks — set by the integration layer to perform ECS side-effects
// ---------------------------------------------------------------------------

export type OnCubeDestroyedCallback = (cubeId: string) => void;

let onCubeDestroyed: OnCubeDestroyedCallback | null = null;

/**
 * Register a callback invoked when a cube is destroyed (reaches 0 HP).
 * The callback should handle removing PlacedAt, switching body to Dynamic,
 * and triggering structural integrity checks on neighbors.
 */
export function setOnCubeDestroyed(cb: OnCubeDestroyedCallback) {
	onCubeDestroyed = cb;
}

// ---------------------------------------------------------------------------
// Position registry — maps cubeId -> world position for spatial queries
// ---------------------------------------------------------------------------

const positionRegistry = new Map<string, CubePosition>();

/**
 * Register or update a cube's world position.
 * Call this when a cube is placed or moved.
 */
export function registerCubePosition(cubeId: string, pos: CubePosition) {
	positionRegistry.set(cubeId, { ...pos });
}

/**
 * Unregister a cube's position (e.g. when it falls / is removed).
 */
export function unregisterCubePosition(cubeId: string) {
	positionRegistry.delete(cubeId);
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Initialise HP for a cube based on its material type.
 * Returns the max HP value. If the material is unknown, defaults to 100.
 */
export function initCubeHP(cubeId: string, materialType: string): number {
	const mat = CUBE_MATERIALS[materialType];
	const maxHP = mat ? mat.durability : 100;
	hpStore.set(cubeId, { current: maxHP, max: maxHP });
	return maxHP;
}

/**
 * Apply damage to a cube. If HP reaches 0 the cube is destroyed.
 */
export function damageCube(cubeId: string, amount: number): DamageResult {
	const hp = hpStore.get(cubeId);
	if (!hp) {
		return { destroyed: false, remainingHP: 0 };
	}

	hp.current = Math.max(0, hp.current - amount);
	const destroyed = hp.current === 0;

	if (destroyed) {
		hpStore.delete(cubeId);
		positionRegistry.delete(cubeId);
		onCubeDestroyed?.(cubeId);
	}

	return { destroyed, remainingHP: hp.current };
}

/**
 * Repair a cube, increasing HP up to its max value.
 */
export function repairCube(cubeId: string, amount: number): number {
	const hp = hpStore.get(cubeId);
	if (!hp) return 0;

	hp.current = Math.min(hp.max, hp.current + amount);
	return hp.current;
}

/**
 * Get current HP information for a cube.
 * Returns null if the cube is not tracked.
 */
export function getCubeHP(cubeId: string): CubeHPInfo | null {
	const hp = hpStore.get(cubeId);
	if (!hp) return null;

	return {
		current: hp.current,
		max: hp.max,
		percentage: hp.max > 0 ? hp.current / hp.max : 0,
	};
}

/**
 * Find the cube with the lowest HP within a given radius of a position.
 * Useful for enemy AI targeting the weakest point in a wall.
 *
 * Returns the cubeId, or null if no cubes are within range.
 */
export function getWeakestCubeInArea(
	position: CubePosition,
	radius: number,
): string | null {
	let weakestId: string | null = null;
	let lowestHP = Number.POSITIVE_INFINITY;
	const r2 = radius * radius;

	for (const [cubeId, pos] of positionRegistry) {
		const dx = pos.x - position.x;
		const dy = pos.y - position.y;
		const dz = pos.z - position.z;
		const dist2 = dx * dx + dy * dy + dz * dz;

		if (dist2 > r2) continue;

		const hp = hpStore.get(cubeId);
		if (!hp) continue;

		if (hp.current < lowestHP) {
			lowestHP = hp.current;
			weakestId = cubeId;
		}
	}

	return weakestId;
}

// ---------------------------------------------------------------------------
// Test / reset helpers
// ---------------------------------------------------------------------------

/**
 * Clear all HP data. Intended for tests and world reset.
 */
export function resetCubeHP() {
	hpStore.clear();
	positionRegistry.clear();
	onCubeDestroyed = null;
}
