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
