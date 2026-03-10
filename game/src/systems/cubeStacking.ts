/**
 * Cube stacking system — snap-stack grid, placement preview, and topple detection.
 *
 * Manages the stackRegistry: a module-level Map tracking all stacked cubes
 * by grid position. Provides grid-snapped placement, structural integrity
 * checks, and topple detection when support is removed.
 *
 * Also bridges the grabber system with the cube placement system by providing
 * placement preview (ghost snap) and the place-held-cube action.
 *
 * Depends on gridSnap.ts for grid math utilities.
 */

import type { CubeEntity, Vec3 } from "./grabber";
import type { GridCoord } from "./gridSnap";
import {
	getAdjacentSlots,
	gridKey,
	gridToWorld,
	snapToGrid as gridSnapToGrid,
} from "./gridSnap";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum raycast distance for placement preview (meters). */
const DEFAULT_MAX_RANGE = 5.0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raycast hit data from Rapier or similar physics engine. */
export interface RaycastHit {
	/** World-space hit point. */
	point: Vec3;
	/** Surface normal at hit point (unit vector). */
	normal: Vec3;
	/** Optional entity ID of the hit object. */
	entityId?: string;
}

/** Placement preview result shown as a ghost/hologram to the player. */
export interface PlacementPreview {
	/** Target grid coordinate for placement. */
	coord: GridCoord;
	/** World-space center of the target grid cell. */
	worldPosition: Vec3;
	/** Whether the placement is valid (no overlap, has support). */
	valid: boolean;
	/** Human-readable reason if invalid. */
	reason?: string;
}

/** Data stored for each cube in the stack registry. */
export interface StackedCubeData {
	/** Cube entity ID (matches grabber CubeEntity.id). */
	entityId: string;
	/** Material type (e.g. "iron", "scrap_metal"). */
	material: string;
	/** Grid coordinate where this cube is stacked. */
	gridCoord: GridCoord;
}

// ---------------------------------------------------------------------------
// Module state — stack registry
// ---------------------------------------------------------------------------

/**
 * Registry of all stacked cubes, keyed by gridKey string.
 *
 * This is the canonical source of truth for which grid positions
 * contain stacked cubes and their metadata.
 */
const stackRegistry = new Map<string, StackedCubeData>();

// ---------------------------------------------------------------------------
// Stack registry API
// ---------------------------------------------------------------------------

/**
 * Snap a world-space position to the nearest 0.5m grid position.
 *
 * Returns the world-space center of the target grid cell. Wraps
 * gridSnap.snapToGrid with world-space output for convenience.
 */
export function snapToGrid(worldPos: Vec3): Vec3 {
	const coord = gridSnapToGrid(worldPos);
	return gridToWorld(coord);
}

/**
 * Check whether a cube can be placed at the given grid coordinate.
 *
 * Rules:
 * 1. The slot must not already be occupied in the stackRegistry.
 * 2. The cube must either be at ground level (y === 0) or have a
 *    cube directly below it (y - 1 slot occupied in stackRegistry).
 */
export function canPlaceAt(gridPos: GridCoord): boolean {
	// Rule 1: slot must be free
	if (stackRegistry.has(gridKey(gridPos))) {
		return false;
	}

	// Rule 2: must have support (ground or cube below)
	if (gridPos.y === 0) {
		return true;
	}

	const below: GridCoord = { x: gridPos.x, y: gridPos.y - 1, z: gridPos.z };
	return stackRegistry.has(gridKey(below));
}

/**
 * Get all stacked cubes at a given XZ column, sorted by Y ascending.
 */
export function getStackAt(x: number, z: number): StackedCubeData[] {
	const result: StackedCubeData[] = [];
	for (const data of stackRegistry.values()) {
		if (data.gridCoord.x === x && data.gridCoord.z === z) {
			result.push(data);
		}
	}
	result.sort((a, b) => a.gridCoord.y - b.gridCoord.y);
	return result;
}

/**
 * Get the height (number of stacked cubes) at a given XZ column.
 */
export function getStackHeight(x: number, z: number): number {
	let count = 0;
	for (const data of stackRegistry.values()) {
		if (data.gridCoord.x === x && data.gridCoord.z === z) {
			count++;
		}
	}
	return count;
}

/**
 * Register a cube in the stack registry.
 *
 * Does NOT validate placement — call canPlaceAt() first.
 * Returns false if the slot is already occupied.
 */
export function registerStackedCube(
	entityId: string,
	gridPos: GridCoord,
	material: string,
): boolean {
	const key = gridKey(gridPos);
	if (stackRegistry.has(key)) {
		return false;
	}
	stackRegistry.set(key, {
		entityId,
		material,
		gridCoord: { ...gridPos },
	});
	return true;
}

/**
 * Remove a cube from the stack registry at the given grid coordinate.
 *
 * Returns the removed cube data, or undefined if the slot was empty.
 */
export function unregisterStackedCube(
	gridPos: GridCoord,
): StackedCubeData | undefined {
	const key = gridKey(gridPos);
	const data = stackRegistry.get(key);
	if (data) {
		stackRegistry.delete(key);
	}
	return data;
}

/**
 * Look up a stacked cube by grid coordinate.
 */
export function getStackedCubeAt(
	gridPos: GridCoord,
): StackedCubeData | undefined {
	return stackRegistry.get(gridKey(gridPos));
}

/**
 * Get the set of all occupied grid keys in the stack registry.
 */
export function getStackOccupiedSlots(): Set<string> {
	return new Set(stackRegistry.keys());
}

/**
 * Get the full stack registry as a read-only map.
 */
export function getAllStackedCubes(): ReadonlyMap<string, StackedCubeData> {
	return stackRegistry;
}

// ---------------------------------------------------------------------------
// Topple detection
// ---------------------------------------------------------------------------

/**
 * Find all stacked cubes that lack structural support.
 *
 * Uses BFS from all ground-level cubes (y === 0) through face-adjacent
 * occupied slots. Any cube not reachable from the ground set is
 * considered unsupported and should topple (fall under physics).
 *
 * @returns Array of StackedCubeData for unsupported cubes.
 */
export function findUnsupportedCubes(): StackedCubeData[] {
	if (stackRegistry.size === 0) {
		return [];
	}

	const occupiedKeys = new Set(stackRegistry.keys());

	// Seed BFS with all ground-level cubes
	const visited = new Set<string>();
	const queue: string[] = [];

	for (const [key, data] of stackRegistry) {
		if (data.gridCoord.y === 0) {
			visited.add(key);
			queue.push(key);
		}
	}

	// BFS: expand through face-adjacent occupied neighbors
	while (queue.length > 0) {
		const currentKey = queue.shift()!;
		const currentData = stackRegistry.get(currentKey)!;
		const neighbors = getAdjacentSlots(currentData.gridCoord);

		for (const neighbor of neighbors) {
			const neighborKey = gridKey(neighbor);
			if (occupiedKeys.has(neighborKey) && !visited.has(neighborKey)) {
				visited.add(neighborKey);
				queue.push(neighborKey);
			}
		}
	}

	// Any occupied slot not visited is unsupported
	const unsupported: StackedCubeData[] = [];
	for (const [key, data] of stackRegistry) {
		if (!visited.has(key)) {
			unsupported.push(data);
		}
	}

	return unsupported;
}

/**
 * Remove a cube and trigger topple detection.
 *
 * Removes the cube at the given position, then checks for any cubes
 * that have lost structural support. Returns the list of cubes that
 * should topple (fall). Those cubes are also removed from the registry.
 *
 * @returns Array of StackedCubeData that lost support and should fall.
 */
export function removeAndTopple(gridPos: GridCoord): StackedCubeData[] {
	const removed = unregisterStackedCube(gridPos);
	if (!removed) {
		return [];
	}

	const unsupported = findUnsupportedCubes();

	// Remove all unsupported cubes from the registry
	for (const cube of unsupported) {
		stackRegistry.delete(gridKey(cube.gridCoord));
	}

	return unsupported;
}

// ---------------------------------------------------------------------------
// Placement preview (pure — uses injected occupied set)
// ---------------------------------------------------------------------------

/**
 * Compute a placement preview from a raycast hit.
 *
 * 1. Returns null if hit is null or the hit point exceeds maxRange.
 * 2. Snaps the hit point to the nearest grid coordinate.
 * 3. If that grid slot is already occupied, offsets by the surface
 *    normal direction to find the adjacent empty slot.
 * 4. Validates the target slot via canPlaceCube rules.
 * 5. Returns a PlacementPreview with coord, worldPosition, and validity.
 *
 * @param hit            Raycast result from the physics engine, or null.
 * @param occupiedSlots  Set of gridKey strings for all occupied slots.
 * @param maxRange       Maximum hit distance in world units (default 5.0).
 */
export function getPlacementPreview(
	hit: RaycastHit | null,
	occupiedSlots: Set<string>,
	maxRange: number = DEFAULT_MAX_RANGE,
): PlacementPreview | null {
	// No surface hit
	if (hit === null) {
		return null;
	}

	// Range check — distance from origin is approximated by hit point magnitude
	const dist = Math.sqrt(
		hit.point.x * hit.point.x +
			hit.point.y * hit.point.y +
			hit.point.z * hit.point.z,
	);
	if (dist > maxRange) {
		return null;
	}

	// Snap hit point to nearest grid cell
	let coord = gridSnapToGrid(hit.point);

	// If the snapped slot is occupied, offset by the surface normal
	// to get the adjacent empty slot (e.g. stacking on top)
	if (occupiedSlots.has(gridKey(coord))) {
		coord = {
			x: coord.x + Math.round(hit.normal.x),
			y: coord.y + Math.round(hit.normal.y),
			z: coord.z + Math.round(hit.normal.z),
		};
	}

	// Validate placement at the target coordinate
	const result = canPlaceCubeCheck(coord, occupiedSlots);

	const worldPosition = gridToWorld(coord);

	return {
		coord,
		worldPosition,
		valid: result.valid,
		reason: result.reason,
	};
}

// ---------------------------------------------------------------------------
// Place held cube
// ---------------------------------------------------------------------------

/**
 * Place the currently held cube at a previewed grid position.
 *
 * Orchestrates the drop → snap → register flow:
 * 1. Returns false if preview is invalid or no cube is held.
 * 2. Looks up the cube entity to get its material.
 * 3. Drops the cube (releases from hand via grabber system).
 * 4. Places the cube into the placement registry.
 * 5. Registers the cube in the stackRegistry.
 * 6. Returns true on success.
 *
 * All dependencies are injected to keep this function pure and testable.
 *
 * @param preview      The validated placement preview.
 * @param getHeldCubeFn  Returns the ID of the held cube, or null.
 * @param dropCubeFn     Drops the held cube at a world position.
 * @param placeCubeFn    Registers a cube in the placement grid.
 * @param getCubeFn      Looks up a cube entity by ID (for material).
 */
export function placeHeldCube(
	preview: PlacementPreview,
	getHeldCubeFn: () => string | null,
	dropCubeFn: (dropPosition: Vec3) => boolean,
	placeCubeFn: (entityId: string, coord: GridCoord, material: string) => boolean,
	getCubeFn: (id: string) => CubeEntity | undefined,
): boolean {
	// Must have a valid preview
	if (!preview.valid) {
		return false;
	}

	// Must be holding a cube
	const heldId = getHeldCubeFn();
	if (heldId === null) {
		return false;
	}

	// Look up the cube to get its material
	const cube = getCubeFn(heldId);
	if (!cube) {
		return false;
	}

	const { material } = cube;

	// Drop the cube at the target world position (releases from hand)
	const dropped = dropCubeFn(preview.worldPosition);
	if (!dropped) {
		return false;
	}

	// Place into the grid registry
	const placed = placeCubeFn(heldId, preview.coord, material);
	if (!placed) {
		return false;
	}

	// Register in the stack registry for stacking/topple tracking
	registerStackedCube(heldId, preview.coord, material);

	return true;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Inline placement validation matching canPlaceCube from cubePlacement.ts.
 *
 * Duplicated here to keep getPlacementPreview pure (no module-state
 * dependency on cubePlacement's registry). The same rules apply:
 * 1. Slot must not be occupied.
 * 2. Must be at ground level (y === 0) or have support below.
 */
function canPlaceCubeCheck(
	coord: GridCoord,
	occupiedSlots: Set<string>,
): { valid: boolean; reason?: string } {
	// Rule 1: slot must be free
	if (occupiedSlots.has(gridKey(coord))) {
		return { valid: false, reason: "Slot is already occupied" };
	}

	// Rule 2: must have support (ground or cube below)
	if (coord.y === 0) {
		return { valid: true };
	}

	const below: GridCoord = { x: coord.x, y: coord.y - 1, z: coord.z };
	if (occupiedSlots.has(gridKey(below))) {
		return { valid: true };
	}

	return { valid: false, reason: "No support below — cube would float" };
}

// ---------------------------------------------------------------------------
// Test / reset helpers
// ---------------------------------------------------------------------------

/**
 * Reset the stack registry. Test-only — not for production use.
 */
export function _resetStackRegistry(): void {
	stackRegistry.clear();
}
