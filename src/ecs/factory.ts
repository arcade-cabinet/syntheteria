import buildingsConfig from "../config/buildings.json";
import unitsConfig from "../config/units.json";
import { createFragment, getFragment, getTerrainHeight } from "./terrain";
import type { Entity, UnitComponent, UnitEntity } from "./traits";
import {
	Building,
	Identity,
	LightningRod,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "./traits";
import { world } from "./world";

/**
 * Factory functions for spawning entities.
 */

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
	const type = options.type || "maintenance_bot";
	const config = unitsConfig[type];

	const {
		x,
		z,
		displayName = config.displayName,
		speed = config.speed,
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

	const entity = world.spawn(
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);
	entity.set(Identity, {
		id: `unit_${nextEntityId++}`,
		faction: "player" as const,
	});
	entity.set(WorldPosition, { x, y, z });
	entity.set(MapFragment, { fragmentId: fragment.id });
	entity.set(Unit, { type, displayName, speed, selected: false, components });
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });

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

	const config = buildingsConfig.fabrication_unit;
	const y = getTerrainHeight(options.x, options.z);
	const powered = options.powered ?? false;

	const entity = world.spawn(
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
		Building,
	);
	entity.set(Identity, {
		id: `fab_${nextEntityId++}`,
		faction: "player" as const,
	});
	entity.set(WorldPosition, { x: options.x, y, z: options.z });
	entity.set(MapFragment, { fragmentId: options.fragmentId });
	entity.set(Unit, {
		type: "fabrication_unit" as const,
		displayName: options.displayName ?? config.displayName,
		speed: 0,
		selected: false,
		components:
			options.components ?? (config.defaultComponents as UnitComponent[]),
	});
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });
	entity.set(Building, {
		type: "fabrication_unit",
		powered,
		operational: powered,
		selected: false,
		components: [],
	});

	return entity;
}

export function spawnLightningRod(options: {
	x: number;
	z: number;
	fragmentId: string;
}): Entity {
	const fragment = getFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const config = buildingsConfig.lightning_rod;
	const y = getTerrainHeight(options.x, options.z);

	const entity = world.spawn(
		Identity,
		WorldPosition,
		MapFragment,
		Building,
		LightningRod,
	);
	entity.set(Identity, {
		id: `bldg_${nextEntityId++}`,
		faction: "player" as const,
	});
	entity.set(WorldPosition, { x: options.x, y, z: options.z });
	entity.set(MapFragment, { fragmentId: options.fragmentId });
	entity.set(Building, {
		type: "lightning_rod",
		powered: true,
		operational: true,
		selected: false,
		components: [],
	});
	entity.set(LightningRod, {
		rodCapacity: config.rodCapacity,
		currentOutput: config.currentOutput,
		protectionRadius: config.protectionRadius,
	});

	return entity;
}
