/**
 * Control groups — Ctrl+1-9 assigns selected units, 1-9 recalls them.
 *
 * Groups are stored as Maps of group number → entity references.
 * Dead entities are pruned on recall.
 */

import type { Entity } from "koota";
import { Unit } from "../ecs/traits";
import { world } from "../ecs/world";
import { deselectAll } from "./selection";

/** Module-level store: group number (1-9) → entity array */
const groups = new Map<number, Entity[]>();

/** Assign all currently selected units to a control group. */
export function assignGroup(groupNumber: number): void {
	const selected: Entity[] = [];
	for (const entity of world.query(Unit)) {
		if (entity.get(Unit)!.selected) {
			selected.push(entity);
		}
	}
	if (selected.length === 0) return;
	groups.set(groupNumber, [...selected]);
}

/**
 * Recall (select) a control group.
 * Deselects all first, then selects the group members.
 * Dead entities are pruned automatically.
 */
export function recallGroup(groupNumber: number): void {
	const members = groups.get(groupNumber);
	if (!members) return;

	// Prune dead entities
	const alive = members.filter((e) => e.isAlive());
	if (alive.length === 0) {
		groups.delete(groupNumber);
		return;
	}
	groups.set(groupNumber, alive);

	deselectAll();
	for (const entity of alive) {
		if (entity.has(Unit)) {
			entity.set(Unit, { selected: true });
		}
	}
}

/** Get the entities in a control group (for testing/inspection). */
export function getGroup(groupNumber: number): readonly Entity[] {
	return groups.get(groupNumber) ?? [];
}

/** Clear all control groups (for testing). */
export function clearAllGroups(): void {
	groups.clear();
}
