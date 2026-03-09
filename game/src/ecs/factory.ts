/**
 * Factory functions for spawning entities.
 */

import { createFragment, getFragment, getTerrainHeight } from "./terrain";
import type { Entity, UnitComponent, UnitEntity } from "./types";
import { world } from "./world";

let nextEntityId = 0;

/**
 * Spawn a maintenance bot at a world position.
 * Components determine what the bot can do (camera for vision, arms for repair, etc.)
 */
export function spawnUnit(options: {
	x: number;
	z: number;
	fragmentId?: string;
	type?: "maintenance_bot" | "utility_drone";
	displayName?: string;
	speed?: number;
	components: UnitComponent[];
}): UnitEntity {
	const {
		x,
		z,
		type = "maintenance_bot",
		displayName = "Maintenance Bot",
		speed = 3,
		components,
	} = options;

	// Create or reuse fragment
	let fragment;
	if (options.fragmentId) {
		fragment = getFragment(options.fragmentId);
		if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);
	} else {
		fragment = createFragment();
	}

	const y = getTerrainHeight(x, z);

	const entity = world.add({
		id: `unit_${nextEntityId++}`,
		faction: "player" as const,
		worldPosition: { x, y, z },
		mapFragment: { fragmentId: fragment.id },
		unit: {
			type,
			displayName,
			speed,
			selected: false,
			components,
		},
		navigation: { path: [], pathIndex: 0, moving: false },
	} as Partial<Entity> as Entity);

	return entity as UnitEntity;
}

/**
 * Spawn a fabrication unit — an immobile unit with building power tracking.
 * Has both `unit` (for selection/UI/components) and `building` (for power system).
 */
export function spawnFabricationUnit(options: {
	x: number;
	z: number;
	fragmentId: string;
	powered?: boolean;
	displayName?: string;
	components?: UnitComponent[];
}): Entity {
	const fragment = getFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const y = getTerrainHeight(options.x, options.z);
	const powered = options.powered ?? false;

	return world.add({
		id: `fab_${nextEntityId++}`,
		faction: "player" as const,
		worldPosition: { x: options.x, y, z: options.z },
		mapFragment: { fragmentId: options.fragmentId },
		unit: {
			type: "fabrication_unit" as const,
			displayName: options.displayName ?? "Fabrication Unit",
			speed: 0,
			selected: false,
			components: options.components ?? [
				{ name: "power_supply", functional: false, material: "electronic" },
				{ name: "fabrication_arm", functional: true, material: "metal" },
				{ name: "material_hopper", functional: true, material: "metal" },
			],
		},
		navigation: { path: [], pathIndex: 0, moving: false },
		building: {
			type: "fabrication_unit",
			powered,
			operational: powered,
			selected: false,
			components: [],
		},
	} as Partial<Entity> as Entity);
}

/**
 * Spawn an otter — a small furry creature that wanders the ruins and countryside.
 */
export function spawnOtter(options: { x: number; z: number }): Entity {
	const y = getTerrainHeight(options.x, options.z);
	const angle = Math.random() * Math.PI * 2;

	return world.add({
		id: `otter_${nextEntityId++}`,
		faction: "wildlife" as const,
		worldPosition: { x: options.x, y, z: options.z },
		otter: {
			speed: 1.5,
			wanderTimer: 2 + Math.floor(Math.random() * 6),
			wanderDir: { x: Math.cos(angle), z: Math.sin(angle) },
		},
	} as Partial<Entity> as Entity);
}

export function spawnLightningRod(options: {
	x: number;
	z: number;
	fragmentId: string;
}): Entity {
	const fragment = getFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const y = getTerrainHeight(options.x, options.z);

	return world.add({
		id: `bldg_${nextEntityId++}`,
		faction: "player" as const,
		worldPosition: { x: options.x, y, z: options.z },
		mapFragment: { fragmentId: options.fragmentId },
		building: {
			type: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
		lightningRod: {
			rodCapacity: 10,
			currentOutput: 7,
			protectionRadius: 8,
		},
	} as Partial<Entity> as Entity);
}
