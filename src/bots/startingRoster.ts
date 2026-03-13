import type { PersistableWorldEntity } from "../world/snapshots";
import { gridToWorld } from "../world/sectorCoordinates";
import { getBotDefinition } from "./definitions";
import type { BotArchetypeId, BotUnitType } from "./types";

type StartingBotSpec = {
	id: string;
	unitType: BotUnitType;
	archetypeId: BotArchetypeId;
	speechProfile: PersistableWorldEntity["speechProfile"];
	x: number;
	z: number;
	selected?: boolean;
	components: PersistableWorldEntity["components"];
	buildingType?: string | null;
	powered?: boolean | null;
	operational?: boolean | null;
};

function createStartingBotEntity(
	spec: StartingBotSpec,
): PersistableWorldEntity {
	const definition = getBotDefinition(spec.unitType);

	return {
		entityId: spec.id,
		sceneLocation: "world",
		sceneBuildingId: null,
		faction: "player",
		unitType: spec.unitType,
		botArchetypeId: spec.archetypeId,
		markLevel: 1,
		speechProfile: spec.speechProfile,
		buildingType: spec.buildingType ?? null,
		displayName: definition.label,
		fragmentId: "world_primary",
		x: spec.x,
		y: 0,
		z: spec.z,
		speed: definition.baseSpeed,
		selected: spec.selected ?? false,
		components: spec.components,
		navigation: { path: [], pathIndex: 0, moving: false },
		aiRole: null,
		aiStateJson: null,
		powered: spec.powered ?? null,
		operational: spec.operational ?? null,
		rodCapacity: null,
		currentOutput: null,
		protectionRadius: null,
	};
}

export function createStartingRoster(args: {
	spawnQ: number;
	spawnR: number;
}): PersistableWorldEntity[] {
	const { spawnQ, spawnR } = args;
	const spawn = gridToWorld(spawnQ, spawnR);

	return [
		createStartingBotEntity({
			id: "unit_0",
			unitType: "maintenance_bot",
			archetypeId: "field_technician",
			speechProfile: "mentor",
			x: spawn.x,
			z: spawn.z,
			selected: true,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		}),
		createStartingBotEntity({
			id: "unit_1",
			unitType: "utility_drone",
			archetypeId: "relay_hauler",
			speechProfile: "quartermaster",
			x: spawn.x + 2,
			z: spawn.z - 1,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "thrusters", functional: true, material: "metal" },
				{ name: "cargo_bay", functional: true, material: "metal" },
				{ name: "signal_array", functional: true, material: "electronic" },
			],
		}),
		createStartingBotEntity({
			id: "unit_2",
			unitType: "fabrication_unit",
			archetypeId: "fabrication_rig",
			speechProfile: "fabricator",
			x: spawn.x - 2,
			z: spawn.z + 1,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "manipulator_arm", functional: true, material: "metal" },
				{ name: "fabricator_head", functional: true, material: "electronic" },
				{ name: "power_core", functional: true, material: "electronic" },
			],
			buildingType: "fabrication_unit",
			powered: true,
			operational: true,
		}),
		createStartingBotEntity({
			id: "unit_3",
			unitType: "mecha_golem",
			archetypeId: "substation_engineer",
			speechProfile: "warden",
			x: spawn.x + 1,
			z: spawn.z + 2,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "stabilizers", functional: true, material: "metal" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
				{ name: "ground_anchor", functional: true, material: "metal" },
			],
		}),
		createStartingBotEntity({
			id: "unit_4",
			unitType: "field_fighter",
			archetypeId: "assault_strider",
			speechProfile: "warden",
			x: spawn.x - 1,
			z: spawn.z - 2,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "sensor_cluster", functional: true, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "weapon_mount", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		}),
		{
			entityId: "bldg_5",
			sceneLocation: "world",
			sceneBuildingId: null,
			faction: "player",
			unitType: null,
			botArchetypeId: null,
			markLevel: null,
			speechProfile: null,
			buildingType: "lightning_rod",
			displayName: "Lightning Rod",
			fragmentId: "world_primary",
			x: spawn.x + 3,
			y: 0,
			z: spawn.z + 1,
			speed: null,
			selected: false,
			components: [],
			navigation: null,
			aiRole: null,
			aiStateJson: null,
			powered: true,
			operational: true,
			rodCapacity: 12,
			currentOutput: 4,
			protectionRadius: 8,
		},
	];
}
