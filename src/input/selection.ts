/**
 * Pure ECS selection and movement logic.
 *
 * Extracted from UnitInput.tsx so that selection, deselection, and
 * move-command logic can be unit-tested without R3F/Three.js dependencies.
 */

import type { Entity } from "koota";
import { getFragment } from "../ecs/terrain";
import {
	BuildingTrait,
	Fragment,
	Navigation,
	Position,
	Unit,
} from "../ecs/traits";
import { serializePath } from "../ecs/types";
import { world } from "../ecs/world";
import { findPath } from "../systems/pathfinding";

/** Find the closest unit or building to a display-space point. */
export function findEntityAtPoint(
	px: number,
	pz: number,
	threshold: number = 1.5,
): Entity | null {
	let closest: Entity | null = null;
	let closestDist = threshold;

	// Check mobile units
	for (const entity of world.query(Position, Unit, Fragment)) {
		const pos = entity.get(Position)!;
		// Fragment may not be registered yet during entity setup — fall back to no offset
		const frag = getFragment(entity.get(Fragment)?.fragmentId ?? "");
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		const dx = pos.x + ox - px;
		const dz = pos.z + oz - pz;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = entity;
			closestDist = dist;
		}
	}

	// Check buildings (larger click target)
	for (const entity of world.query(Position, BuildingTrait, Fragment)) {
		const pos = entity.get(Position)!;
		// Buildings may lack a fragment ID during placement preview — fall back to no offset
		const fragmentId = entity.get(Fragment)?.fragmentId ?? "";
		const frag = fragmentId ? getFragment(fragmentId) : null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		const dx = pos.x + ox - px;
		const dz = pos.z + oz - pz;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = entity;
			closestDist = dist;
		}
	}

	return closest;
}

/** Issue a move command. Converts display-space target to real-world position. */
export function issueMoveTo(
	entity: Entity,
	displayX: number,
	displayZ: number,
) {
	// Fragment offset needed to convert display-space back to world-space
	// Falls back to zero offset if fragment not yet registered
	const frag = getFragment(entity.get(Fragment)?.fragmentId ?? "");
	const ox = frag?.displayOffset.x ?? 0;
	const oz = frag?.displayOffset.z ?? 0;

	const realX = displayX - ox;
	const realZ = displayZ - oz;

	const pos = entity.get(Position)!;
	const path = findPath(pos, { x: realX, y: 0, z: realZ });

	if (path.length > 0 && entity.has(Navigation)) {
		entity.set(Navigation, {
			pathJson: serializePath(path),
			pathIndex: 0,
			moving: true,
		});
	}
}

/** Get the currently selected entity (unit or building). */
export function getSelectedEntity(): Entity | null {
	for (const entity of world.query(Unit)) {
		if (entity.get(Unit)!.selected) return entity;
	}
	for (const entity of world.query(BuildingTrait)) {
		if (entity.get(BuildingTrait)!.selected) return entity;
	}
	return null;
}

/** Deselect all units and buildings. */
export function deselectAll() {
	for (const entity of world.query(Unit)) {
		if (entity.get(Unit)!.selected) {
			entity.set(Unit, { selected: false });
		}
	}
	for (const entity of world.query(BuildingTrait)) {
		if (entity.get(BuildingTrait)!.selected) {
			entity.set(BuildingTrait, { selected: false });
		}
	}
}

/** Select a specific entity (deselects all others first). */
export function selectEntity(entity: Entity) {
	deselectAll();
	if (entity.has(Unit)) {
		entity.set(Unit, { selected: true });
	} else if (entity.has(BuildingTrait)) {
		entity.set(BuildingTrait, { selected: true });
	}
}
