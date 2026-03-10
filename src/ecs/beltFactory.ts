/**
 * Belt factory — functions for placing, removing, and querying conveyor belts.
 *
 * Belts snap to a 1-unit grid. When placed, they auto-link to adjacent belts
 * based on direction: a neighbor pointing toward this belt becomes its predecessor,
 * and if this belt points toward a neighbor, that neighbor becomes its successor.
 */

import { getTerrainHeight } from "./terrain";
import type { BeltComponent, BeltDirection, BeltTier, Entity } from "./types";
import { belts, world } from "./world";

/** Direction vectors for each belt direction */
const DIRECTION_VECTORS: Record<BeltDirection, { x: number; z: number }> = {
	north: { x: 0, z: -1 },
	south: { x: 0, z: 1 },
	east: { x: 1, z: 0 },
	west: { x: -1, z: 0 },
};

/** Speed multiplier per tier */
const TIER_SPEEDS: Record<BeltTier, number> = {
	basic: 1.0,
	fast: 2.0,
	express: 4.0,
};

/** Unique ID counter for belt entities */
let beltIdCounter = 0;

/**
 * Find the belt entity at a given grid position.
 * Returns undefined if no belt exists there.
 */
export function getBeltAt(x: number, z: number): Entity | undefined {
	const gx = Math.round(x);
	const gz = Math.round(z);

	for (const entity of belts) {
		if (
			Math.round(entity.worldPosition.x) === gx &&
			Math.round(entity.worldPosition.z) === gz
		) {
			return entity;
		}
	}
	return undefined;
}

/**
 * Check if a direction from (fromX, fromZ) points toward (toX, toZ).
 */
function directionPointsTo(
	dir: BeltDirection,
	fromX: number,
	fromZ: number,
	toX: number,
	toZ: number,
): boolean {
	const vec = DIRECTION_VECTORS[dir];
	return fromX + vec.x === toX && fromZ + vec.z === toZ;
}

/**
 * Place a new conveyor belt at the given world position.
 * Coordinates are snapped to the nearest integer grid.
 * Auto-links to adjacent belts based on direction.
 *
 * @returns The created belt entity, or null if a belt already exists at that position.
 */
export function placeBelt(
	x: number,
	z: number,
	direction: BeltDirection,
	tier: BeltTier = "basic",
): Entity | null {
	const gx = Math.round(x);
	const gz = Math.round(z);

	// Don't place on top of an existing belt
	if (getBeltAt(gx, gz)) return null;

	const terrainY = getTerrainHeight(gx, gz);

	const beltComponent: BeltComponent = {
		direction,
		speed: TIER_SPEEDS[tier],
		tier,
		carrying: null,
		nextBeltId: null,
		prevBeltId: null,
		itemProgress: 0,
	};

	const entity = world.add({
		id: `belt_${beltIdCounter++}`,
		faction: "player",
		worldPosition: { x: gx, y: terrainY, z: gz },
		belt: beltComponent,
	} as Entity);

	// Auto-link: check all four neighbors
	const neighbors: { dir: BeltDirection; nx: number; nz: number }[] = [
		{ dir: "north", nx: gx, nz: gz - 1 },
		{ dir: "south", nx: gx, nz: gz + 1 },
		{ dir: "east", nx: gx + 1, nz: gz },
		{ dir: "west", nx: gx - 1, nz: gz },
	];

	for (const { nx, nz } of neighbors) {
		const neighbor = getBeltAt(nx, nz);
		if (!neighbor || !neighbor.belt) continue;

		const ngx = Math.round(neighbor.worldPosition!.x);
		const ngz = Math.round(neighbor.worldPosition!.z);

		// If the neighbor's direction points toward this belt, it feeds into us
		if (directionPointsTo(neighbor.belt.direction, ngx, ngz, gx, gz)) {
			neighbor.belt.nextBeltId = entity.id;
			beltComponent.prevBeltId = neighbor.id;
		}

		// If this belt's direction points toward the neighbor, we feed into it
		if (directionPointsTo(direction, gx, gz, ngx, ngz)) {
			beltComponent.nextBeltId = neighbor.id;
			neighbor.belt.prevBeltId = entity.id;
		}
	}

	return entity;
}

/**
 * Remove a belt entity and unlink its neighbors.
 *
 * @returns true if the belt was found and removed.
 */
export function removeBelt(entityId: string): boolean {
	let target: Entity | undefined;
	for (const entity of belts) {
		if (entity.id === entityId) {
			target = entity;
			break;
		}
	}

	if (!target || !target.belt) return false;

	// Unlink neighbors that reference this belt
	for (const entity of belts) {
		if (entity.id === entityId) continue;

		if (entity.belt.nextBeltId === entityId) {
			entity.belt.nextBeltId = null;
		}
		if (entity.belt.prevBeltId === entityId) {
			entity.belt.prevBeltId = null;
		}
	}

	world.remove(target);
	return true;
}
