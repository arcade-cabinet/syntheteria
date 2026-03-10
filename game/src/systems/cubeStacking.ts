/**
 * Cube stacking system — place held cubes onto the grid.
 *
 * Bridges the grabber system (US-009) with the cube placement system
 * (US-012) by providing placement preview (ghost snap) and the
 * place-held-cube action. Uses grid snap math (US-011) for coordinate
 * conversion and adjacency.
 *
 * All functions are pure — dependencies are injected as parameters.
 * No module-level state.
 */

import type { CubeEntity, Vec3 } from "./grabber";
import type { GridCoord } from "./gridSnap";
import { gridKey, gridToWorld, snapToGrid } from "./gridSnap";

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

// ---------------------------------------------------------------------------
// Placement preview
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
	let coord = snapToGrid(hit.point);

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
 * Orchestrates the drop → place flow:
 * 1. Returns false if preview is invalid or no cube is held.
 * 2. Looks up the cube entity to get its material.
 * 3. Drops the cube (releases from hand via grabber system).
 * 4. Places the cube into the placement registry.
 * 5. Returns true on success.
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
