/**
 * Factory functions for creating and managing wire entities.
 *
 * Wires connect two entities (buildings, relays, etc.) and carry
 * power or signal between them.
 */

import type { Entity } from "./types";
import { wires, world } from "./world";

let nextWireId = 0;

/**
 * Find an entity by ID. Returns undefined if not found.
 */
function getEntityById(id: string): Entity | undefined {
	for (const entity of world) {
		if (entity.id === id) return entity;
	}
	return undefined;
}

/**
 * Create a wire entity connecting two buildings/entities.
 * Calculates length from the worldPositions of the endpoints.
 *
 * @param fromEntityId - Source entity ID
 * @param toEntityId - Destination entity ID
 * @param wireType - "power" or "signal"
 * @returns The created wire entity
 */
export function placeWire(
	fromEntityId: string,
	toEntityId: string,
	wireType: "power" | "signal",
): Entity {
	const fromEntity = getEntityById(fromEntityId);
	const toEntity = getEntityById(toEntityId);

	if (!fromEntity)
		throw new Error(`Wire source entity ${fromEntityId} not found`);
	if (!toEntity) throw new Error(`Wire target entity ${toEntityId} not found`);

	if (!fromEntity.worldPosition)
		throw new Error(`Wire source ${fromEntityId} has no worldPosition`);
	if (!toEntity.worldPosition)
		throw new Error(`Wire target ${toEntityId} has no worldPosition`);

	// Calculate wire length from world positions
	const dx = toEntity.worldPosition.x - fromEntity.worldPosition.x;
	const dy = toEntity.worldPosition.y - fromEntity.worldPosition.y;
	const dz = toEntity.worldPosition.z - fromEntity.worldPosition.z;
	const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

	// Max capacity depends on wire type
	const maxCapacity = wireType === "power" ? 10 : 5;

	return world.add({
		id: `wire_${nextWireId++}`,
		faction: "player" as const,
		wire: {
			wireType,
			fromEntityId,
			toEntityId,
			length,
			currentLoad: 0,
			maxCapacity,
		},
	} as Partial<Entity> as Entity);
}

/**
 * Remove a wire entity from the world.
 */
export function removeWire(wireEntityId: string): void {
	const wireEntity = getEntityById(wireEntityId);
	if (!wireEntity) return;
	world.remove(wireEntity);
}

/**
 * Get all wire entities originating from a given entity.
 */
export function getWiresFrom(entityId: string): Entity[] {
	const result: Entity[] = [];
	for (const wireEntity of wires) {
		if (wireEntity.wire.fromEntityId === entityId) {
			result.push(wireEntity);
		}
	}
	return result;
}

/**
 * Get all wire entities going to a given entity.
 */
export function getWiresTo(entityId: string): Entity[] {
	const result: Entity[] = [];
	for (const wireEntity of wires) {
		if (wireEntity.wire.toEntityId === entityId) {
			result.push(wireEntity);
		}
	}
	return result;
}
