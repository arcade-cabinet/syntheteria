/**
 * Syntheteria ECS type definitions and component helpers.
 *
 * Navigation uses continuous 3D positions (no grid/tiles).
 * Units move freely through the world via navmesh pathfinding.
 * Units have functional/broken parts instead of hit points.
 */

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** A physical component that can be functional or broken */
export interface UnitComponent {
	name: string;
	functional: boolean;
	/** Material needed to fabricate a replacement */
	material: "metal" | "plastic" | "electronic";
}

// --- JSON serialization helpers for Koota trait fields ---

import { GameError } from "../errors";

export function parseComponents(json: string | undefined): UnitComponent[] {
	if (!json) return [];
	try {
		return JSON.parse(json) as UnitComponent[];
	} catch (e) {
		throw new GameError(
			`Invalid components JSON: ${json.slice(0, 80)}`,
			"ecs/parseComponents",
			{ cause: e },
		);
	}
}

export function serializeComponents(components: UnitComponent[]): string {
	return JSON.stringify(components);
}

export function parsePath(json: string | undefined): Vec3[] {
	if (!json) return [];
	try {
		return JSON.parse(json) as Vec3[];
	} catch (e) {
		throw new GameError(
			`Invalid path JSON: ${json.slice(0, 80)}`,
			"ecs/parsePath",
			{ cause: e },
		);
	}
}

export function serializePath(path: Vec3[]): string {
	return JSON.stringify(path);
}

// --- Component helpers ---

export function hasCamera(components: UnitComponent[]): boolean {
	return components.some((c) => c.name === "camera" && c.functional);
}

export function hasArms(components: UnitComponent[]): boolean {
	return components.some((c) => c.name === "arms" && c.functional);
}

export function hasFunctionalComponent(
	components: UnitComponent[],
	name: string,
): boolean {
	return components.some((c) => c.name === name && c.functional);
}

export function getBrokenComponents(
	components: UnitComponent[],
): UnitComponent[] {
	return components.filter((c) => !c.functional);
}

export function getFunctionalComponents(
	components: UnitComponent[],
): UnitComponent[] {
	return components.filter((c) => c.functional);
}

// --- Inventory helpers ---

/** A map of material type → quantity carried by a unit */
export type InventoryMap = Record<string, number>;

export function parseInventory(json: string | undefined): InventoryMap {
	if (!json || json === "{}") return {};
	try {
		return JSON.parse(json) as InventoryMap;
	} catch (e) {
		throw new GameError(
			`Invalid inventory JSON: ${json.slice(0, 80)}`,
			"ecs/parseInventory",
			{ cause: e },
		);
	}
}

export function serializeInventory(inventory: InventoryMap): string {
	return JSON.stringify(inventory);
}

/** Get the quantity of a specific material in an inventory */
export function getInventoryAmount(
	inventory: InventoryMap,
	material: string,
): number {
	return inventory[material] ?? 0;
}

/** Return a new inventory with the specified amount added */
export function addToInventory(
	inventory: InventoryMap,
	material: string,
	amount: number,
): InventoryMap {
	return { ...inventory, [material]: (inventory[material] ?? 0) + amount };
}

/** Return a new inventory with the specified amount removed. Returns null if insufficient. */
export function removeFromInventory(
	inventory: InventoryMap,
	material: string,
	amount: number,
): InventoryMap | null {
	const current = inventory[material] ?? 0;
	if (current < amount) return null;
	const next = { ...inventory, [material]: current - amount };
	if (next[material] === 0) delete next[material];
	return next;
}
