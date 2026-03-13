/**
 * Unit Selection State — centralized selection tracking.
 *
 * Provides a module-level store for selected unit state that the
 * UnitInput, UnitRenderer, HUD panels, and overlay renderers can
 * all read from. Selection is still set via ECS trait mutation
 * (Unit.selected / Building.selected) but this module tracks
 * the latest selected entity ID + metadata for UI consumers.
 */

import type { Entity } from "../ecs/traits";
import { Building, Identity, Unit, WorldPosition } from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import { getUnitTurnState, type UnitTurnState } from "./turnSystem";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectedUnitInfo {
	entityId: string;
	faction: string;
	type: "unit" | "building";
	unitType: string;
	displayName: string;
	markLevel: number;
	turnState: UnitTurnState | undefined;
	worldX: number;
	worldY: number;
	worldZ: number;
}

// ─── State ──────────────────────────────────────────────────────────────────

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

export function subscribeSelection(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Read the currently selected entity from ECS state.
 * Returns null if nothing is selected.
 */
export function getSelectedUnitInfo(): SelectedUnitInfo | null {
	for (const entity of units) {
		const unit = entity.get(Unit);
		if (!unit?.selected) continue;

		const identity = entity.get(Identity);
		if (!identity) continue;

		const pos = entity.get(WorldPosition);
		if (!pos) continue;

		return {
			entityId: identity.id,
			faction: identity.faction,
			type: "unit",
			unitType: unit.type,
			displayName: unit.displayName,
			markLevel: unit.markLevel,
			turnState: getUnitTurnState(identity.id),
			worldX: pos.x,
			worldY: pos.y,
			worldZ: pos.z,
		};
	}

	for (const entity of buildings) {
		const building = entity.get(Building);
		if (!building?.selected) continue;

		const identity = entity.get(Identity);
		if (!identity) continue;

		const pos = entity.get(WorldPosition);
		if (!pos) continue;

		return {
			entityId: identity.id,
			faction: identity.faction,
			type: "building",
			unitType: building.type,
			displayName: building.type.replace(/_/g, " "),
			markLevel: 0,
			turnState: getUnitTurnState(identity.id),
			worldX: pos.x,
			worldY: pos.y,
			worldZ: pos.z,
		};
	}

	return null;
}

/**
 * Notify listeners that selection changed.
 * Call this from UnitInput after selecting/deselecting.
 */
export function notifySelectionChanged() {
	notify();
}

/**
 * Deselect all entities and notify.
 */
export function deselectAll() {
	for (const u of units) {
		u.get(Unit)!.selected = false;
	}
	for (const b of buildings) {
		b.get(Building)!.selected = false;
	}
	notify();
}

/**
 * Select a specific entity by reference and notify.
 */
export function selectEntity(entity: Entity) {
	deselectAllSilent();
	const unit = entity.get(Unit);
	if (unit) {
		unit.selected = true;
	}
	const building = entity.get(Building);
	if (building) {
		building.selected = true;
	}
	notify();
}

function deselectAllSilent() {
	for (const u of units) {
		u.get(Unit)!.selected = false;
	}
	for (const b of buildings) {
		b.get(Building)!.selected = false;
	}
}
