/**
 * Factory functions for spawning entities using Koota ECS.
 */

import type { Entity } from "koota";
import type { CultMechType } from "../config/cultDefs";
import { CULT_MECH_DEFS } from "../config/cultDefs";
import {
	createFragment,
	getFragment,
	getTerrainHeight,
	type MapFragment,
} from "./terrain";
import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	LightningRod,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "./traits";
import type { UnitComponent } from "./types";
import { serializeComponents } from "./types";
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
}): Entity {
	const {
		x,
		z,
		type = "maintenance_bot",
		displayName = "Maintenance Bot",
		speed = 3,
		components,
	} = options;

	// Create or reuse fragment
	let fragment: MapFragment | undefined;
	if (options.fragmentId) {
		fragment = getFragment(options.fragmentId);
		if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);
	} else {
		fragment = createFragment();
	}

	const y = getTerrainHeight(x, z);
	const id = `unit_${nextEntityId++}`;

	return world.spawn(
		EntityId({ value: id }),
		Position({ x, y, z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: fragment.id }),
		Unit({ unitType: type, displayName, speed, selected: false }),
		UnitComponents({ componentsJson: serializeComponents(components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
}

/**
 * Spawn a fabrication unit -- an immobile unit with building power tracking.
 * Has both Unit (for selection/UI/components) and BuildingTrait (for power system).
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
	const id = `fab_${nextEntityId++}`;

	const components = options.components ?? [
		{
			name: "power_supply",
			functional: false,
			material: "electronic" as const,
		},
		{ name: "fabrication_arm", functional: true, material: "metal" as const },
		{ name: "material_hopper", functional: true, material: "metal" as const },
	];

	return world.spawn(
		EntityId({ value: id }),
		Position({ x: options.x, y, z: options.z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: options.fragmentId }),
		Unit({
			unitType: "fabrication_unit",
			displayName: options.displayName ?? "Fabrication Unit",
			speed: 0,
			selected: false,
		}),
		UnitComponents({ componentsJson: serializeComponents(components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		BuildingTrait({
			buildingType: "fabrication_unit",
			powered,
			operational: powered,
			selected: false,
			buildingComponentsJson: "[]",
		}),
	);
}

/**
 * Spawn a lightning rod building at a world position.
 */
export function spawnLightningRod(options: {
	x: number;
	z: number;
	fragmentId: string;
}): Entity {
	const fragment = getFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const y = getTerrainHeight(options.x, options.z);
	const id = `bldg_${nextEntityId++}`;

	return world.spawn(
		EntityId({ value: id }),
		Position({ x: options.x, y, z: options.z }),
		Faction({ value: "player" }),
		Fragment({ fragmentId: options.fragmentId }),
		BuildingTrait({
			buildingType: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			buildingComponentsJson: "[]",
		}),
		LightningRod({
			rodCapacity: 10,
			currentOutput: 7,
			protectionRadius: 8,
		}),
	);
}

/**
 * Spawn a cult mech at a world position.
 * Uses cult mech definitions for component loadout, speed, etc.
 */
export function spawnCultUnit(options: {
	x: number;
	z: number;
	mechType: CultMechType;
	displayName?: string;
}): Entity {
	const { x, z, mechType } = options;
	const def = CULT_MECH_DEFS[mechType];
	const fragment = createFragment();
	const y = getTerrainHeight(x, z);
	const id = `cult_${nextEntityId++}`;

	// Deep-copy components so each entity gets independent state
	const components = def.components.map((c) => ({ ...c }));

	return world.spawn(
		EntityId({ value: id }),
		Position({ x, y, z }),
		Faction({ value: "cultist" }),
		Fragment({ fragmentId: fragment.id }),
		Unit({
			unitType: def.unitType,
			displayName:
				options.displayName ??
				`${def.displayName} ${id.slice(-2).toUpperCase()}`,
			speed: def.speed,
			selected: false,
		}),
		UnitComponents({ componentsJson: serializeComponents(components) }),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
}
