/**
 * Wire builder system — wire creation logic with validation and preview.
 *
 * Handles the player-facing wire placement flow:
 *   1. Player selects a source entity (must have a wire port)
 *   2. Player moves cursor to a target entity
 *   3. Ghost wire preview shows valid/invalid connection
 *   4. Player confirms to create the wire
 *
 * Validation rules:
 *   - Both entities must have wire ports (buildings, signal relays)
 *   - Wire length must not exceed wireMaxLength from config
 *   - No duplicate wire between the same two entities
 *   - Source and target must be different entities
 *
 * Tunables sourced from config/power.json.
 */

import { config } from "../../config";
import type { Entity, Vec3 } from "../ecs/types";
import { placeWire, removeWire } from "../ecs/wireFactory";
import { getEntityById, wires } from "../ecs/koota/compat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WireBuildMode = "power" | "signal" | null;

export interface WirePreview {
	fromPosition: Vec3;
	toPosition: Vec3;
	valid: boolean;
	wireType: "power" | "signal";
	/** Reason the connection is invalid, or null if valid */
	invalidReason: string | null;
	/** Wire length in world units */
	length: number;
}

/** Entity types that can accept wire connections (from config/power.json) */
const CONNECTABLE_TYPES = new Set(config.power.connectableTypes);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let buildMode: WireBuildMode = null;
let sourceEntityId: string | null = null;
let preview: WirePreview | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distanceBetween(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Check if an entity has a wire port (can be connected with wires).
 *
 * Wire ports are available on:
 *   - Buildings (lightning rods, fabrication units, etc.)
 *   - Signal relays
 *   - Miners and processors (via building component)
 */
export function hasWirePort(entity: Entity): boolean {
	// Signal relays always have wire ports
	if (entity.signalRelay) return true;

	// Buildings with connectable types
	if (entity.building) {
		return CONNECTABLE_TYPES.has(entity.building.type);
	}

	// Processors have wire ports (they have a building component)
	if (entity.processor) return true;

	// Miners have wire ports
	if (entity.miner) return true;

	return false;
}

/**
 * Check if two entities can be connected by a wire.
 * Returns { valid, reason } where reason is null if valid.
 */
export function canConnect(
	entityA: Entity,
	entityB: Entity,
): { valid: boolean; reason: string | null } {
	// Same entity check
	if (entityA.id === entityB.id) {
		return { valid: false, reason: "Cannot connect entity to itself" };
	}

	// Wire port check
	if (!hasWirePort(entityA)) {
		return { valid: false, reason: `${entityA.id} has no wire port` };
	}
	if (!hasWirePort(entityB)) {
		return { valid: false, reason: `${entityB.id} has no wire port` };
	}

	// Position check
	if (!entityA.worldPosition || !entityB.worldPosition) {
		return { valid: false, reason: "Entity missing world position" };
	}

	// Length check
	const length = distanceBetween(
		entityA.worldPosition,
		entityB.worldPosition,
	);
	const maxLength = config.power.wireMaxLength;
	if (length > maxLength) {
		return {
			valid: false,
			reason: `Too far apart (${length.toFixed(1)} > ${maxLength})`,
		};
	}

	// Duplicate wire check
	for (const wireEntity of wires) {
		if (!wireEntity.wire) continue;
		const { fromEntityId, toEntityId } = wireEntity.wire;
		if (
			(fromEntityId === entityA.id && toEntityId === entityB.id) ||
			(fromEntityId === entityB.id && toEntityId === entityA.id)
		) {
			return { valid: false, reason: "Wire already exists between these entities" };
		}
	}

	return { valid: true, reason: null };
}

// ---------------------------------------------------------------------------
// Wire creation / deletion
// ---------------------------------------------------------------------------

/**
 * Create a wire between two entities.
 * Validates the connection before creating.
 *
 * @returns The created wire entity, or null if validation failed.
 */
export function createWire(
	fromId: string,
	toId: string,
	wireType: "power" | "signal" = "power",
): Entity | null {
	const fromEntity = getEntityById(fromId);
	const toEntity = getEntityById(toId);

	if (!fromEntity || !toEntity) return null;

	const { valid } = canConnect(fromEntity, toEntity);
	if (!valid) return null;

	return placeWire(fromId, toId, wireType);
}

/**
 * Delete a wire entity from the world.
 */
export function deleteWire(wireEntityId: string): void {
	removeWire(wireEntityId);
}

/**
 * Get all wires connected to a specific entity (either end).
 */
export function getWiresForEntity(entityId: string): Entity[] {
	const result: Entity[] = [];
	for (const wireEntity of wires) {
		if (!wireEntity.wire) continue;
		if (
			wireEntity.wire.fromEntityId === entityId ||
			wireEntity.wire.toEntityId === entityId
		) {
			result.push(wireEntity);
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Build mode state machine
// ---------------------------------------------------------------------------

/**
 * Enter wire build mode. Player can now select source and target entities.
 */
export function startWireBuild(wireType: "power" | "signal" = "power"): void {
	buildMode = wireType;
	sourceEntityId = null;
	preview = null;
}

/**
 * Cancel wire build mode.
 */
export function cancelWireBuild(): void {
	buildMode = null;
	sourceEntityId = null;
	preview = null;
}

/**
 * Get the current wire build mode.
 */
export function getWireBuildMode(): WireBuildMode {
	return buildMode;
}

/**
 * Set the source entity for wire placement.
 * Returns false if the entity cannot be a wire endpoint.
 */
export function setWireSource(entityId: string): boolean {
	if (!buildMode) return false;

	const entity = getEntityById(entityId);
	if (!entity || !hasWirePort(entity)) return false;

	sourceEntityId = entityId;
	preview = null;
	return true;
}

/**
 * Get the current source entity ID.
 */
export function getWireSource(): string | null {
	return sourceEntityId;
}

/**
 * Update the wire preview (ghost wire) for a target entity.
 * Called as the player hovers over potential targets.
 */
export function updateWirePreview(targetEntityId: string): void {
	if (!buildMode || !sourceEntityId) {
		preview = null;
		return;
	}

	const sourceEntity = getEntityById(sourceEntityId);
	const targetEntity = getEntityById(targetEntityId);

	if (
		!sourceEntity?.worldPosition ||
		!targetEntity?.worldPosition
	) {
		preview = null;
		return;
	}

	const length = distanceBetween(
		sourceEntity.worldPosition,
		targetEntity.worldPosition,
	);

	const { valid, reason } = canConnect(sourceEntity, targetEntity);

	preview = {
		fromPosition: { ...sourceEntity.worldPosition },
		toPosition: { ...targetEntity.worldPosition },
		valid,
		wireType: buildMode,
		invalidReason: reason,
		length,
	};
}

/**
 * Update the wire preview to a free world position (no target entity yet).
 * Shows where the wire would go but always invalid (no target).
 */
export function updateWirePreviewPosition(position: Vec3): void {
	if (!buildMode || !sourceEntityId) {
		preview = null;
		return;
	}

	const sourceEntity = getEntityById(sourceEntityId);
	if (!sourceEntity?.worldPosition) {
		preview = null;
		return;
	}

	const length = distanceBetween(sourceEntity.worldPosition, position);

	preview = {
		fromPosition: { ...sourceEntity.worldPosition },
		toPosition: { ...position },
		valid: false,
		wireType: buildMode,
		invalidReason: "No target entity",
		length,
	};
}

/**
 * Get the current wire preview state.
 */
export function getWirePreview(): WirePreview | null {
	return preview;
}

/**
 * Confirm wire placement to the target entity.
 * Creates the wire if validation passes.
 *
 * @returns true if the wire was created successfully.
 */
export function confirmWirePlacement(targetEntityId: string): boolean {
	if (!buildMode || !sourceEntityId) return false;

	const wire = createWire(sourceEntityId, targetEntityId, buildMode);
	if (!wire) return false;

	// Reset for next wire (keep build mode active for chaining)
	sourceEntityId = null;
	preview = null;

	return true;
}
