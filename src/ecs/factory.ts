import {
	type BotUnitType,
	createBotUnitState,
	getBotDefinition,
} from "../bots";
import buildingsConfig from "../config/buildings.json";
import {
	getStructuralFragment,
	getSurfaceHeightAtWorldPosition,
	requirePrimaryStructuralFragment,
} from "../world/structuralSpace";
import type { Entity, UnitComponent, UnitEntity } from "./traits";
import {
	AIController,
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

export function resetFactoryEntityIds() {
	nextEntityId = 0;
}

export function registerExistingEntityId(id: string) {
	const match = id.match(/_(\d+)$/);
	if (!match) {
		return;
	}

	const numericId = Number.parseInt(match[1], 10);
	if (Number.isNaN(numericId)) {
		return;
	}

	nextEntityId = Math.max(nextEntityId, numericId + 1);
}

/**
 * Spawn a maintenance bot at a world position.
 * Components determine what the bot can do (camera for vision, arms for repair, etc.)
 */
export function spawnUnit(options: {
	x: number;
	z: number;
	fragmentId?: string;
	type?: BotUnitType;
	displayName?: string;
	speed?: number;
	components: UnitComponent[];
}): UnitEntity {
	const type = options.type || "maintenance_bot";
	const config = getBotDefinition(type);

	const {
		x,
		z,
		displayName = config.label,
		speed = config.baseSpeed,
		components,
	} = options;

	// Create or reuse fragment
	let fragment;
	if (options.fragmentId) {
		fragment = getStructuralFragment(options.fragmentId);
		if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);
	} else {
		fragment = requirePrimaryStructuralFragment();
	}

	const y = getSurfaceHeightAtWorldPosition(x, z);

	const entity = world.spawn(
		AIController,
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
	entity.set(AIController, {
		role: config.defaultAiRole,
		enabled: true,
		stateJson: null,
	});
	entity.set(WorldPosition, { x, y, z });
	entity.set(MapFragment, { fragmentId: fragment.id });
	entity.set(
		Unit,
		createBotUnitState({ unitType: type, displayName, speed, components }),
	);
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
	const fragment = getStructuralFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const config = buildingsConfig.fabrication_unit;
	const y = getSurfaceHeightAtWorldPosition(options.x, options.z);
	const powered = options.powered ?? false;

	const entity = world.spawn(
		AIController,
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
	entity.set(AIController, {
		role: getBotDefinition("fabrication_unit").defaultAiRole,
		enabled: true,
		stateJson: null,
	});
	entity.set(WorldPosition, { x: options.x, y, z: options.z });
	entity.set(MapFragment, { fragmentId: options.fragmentId });
	entity.set(
		Unit,
		createBotUnitState({
			unitType: "fabrication_unit",
			displayName: options.displayName ?? config.displayName,
			speed: 0,
			components:
				options.components ?? (config.defaultComponents as UnitComponent[]),
		}),
	);
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

/**
 * Spawn a generic building entity (motor_pool, relay_tower, defense_turret, etc.)
 * These are non-unit buildings — no Unit trait, no AI, just Building + position.
 */
export function spawnBuilding(options: {
	x: number;
	z: number;
	fragmentId: string;
	type: string;
	powered?: boolean;
	faction?: "player" | "cultist" | "rogue" | "feral" | "wildlife";
}): Entity {
	const fragment = getStructuralFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const _buildingConfig =
		buildingsConfig[options.type as keyof typeof buildingsConfig];
	const y = getSurfaceHeightAtWorldPosition(options.x, options.z);
	const powered = options.powered ?? false;

	const entity = world.spawn(Identity, WorldPosition, MapFragment, Building);
	entity.set(Identity, {
		id: `bldg_${nextEntityId++}`,
		faction: options.faction ?? ("player" as const),
	});
	entity.set(WorldPosition, { x: options.x, y, z: options.z });
	entity.set(MapFragment, { fragmentId: options.fragmentId });
	entity.set(Building, {
		type: options.type,
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
	const fragment = getStructuralFragment(options.fragmentId);
	if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`);

	const config = buildingsConfig.lightning_rod;
	const y = getSurfaceHeightAtWorldPosition(options.x, options.z);

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
