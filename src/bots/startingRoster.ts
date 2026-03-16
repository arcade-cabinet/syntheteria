import { gridToWorld } from "../world/sectorCoordinates";
import type { PersistableWorldEntity } from "../world/snapshots";
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
		// ─── Starting Roster: 5 player bots (per BOT_AND_ECONOMY_REDESIGN) ──
		// Technician (broken camera — tutorial repair target)
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
		// Scout
		createStartingBotEntity({
			id: "unit_1",
			unitType: "mecha_scout",
			archetypeId: "relay_hauler",
			speechProfile: "scout",
			x: spawn.x + 2,
			z: spawn.z - 1,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "sensor_array", functional: true, material: "electronic" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		}),
		// Striker
		createStartingBotEntity({
			id: "unit_2",
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
		// Fabricator
		createStartingBotEntity({
			id: "unit_3",
			unitType: "fabrication_unit",
			archetypeId: "fabrication_rig",
			speechProfile: "fabricator",
			x: spawn.x - 2,
			z: spawn.z + 1,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "manipulator_arm", functional: true, material: "metal" },
				{ name: "fabricator_head", functional: true, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_core", functional: true, material: "electronic" },
			],
		}),
		// Guardian
		createStartingBotEntity({
			id: "unit_4",
			unitType: "mecha_golem",
			archetypeId: "defense_sentry",
			speechProfile: "warden",
			x: spawn.x + 1,
			z: spawn.z + 2,
			components: [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "stabilizers", functional: true, material: "metal" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "armor_plating", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		}),
		// ─── Starting Buildings ──────────────────────────────────────────────
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
		// Motor Pool — key Expand structure; fabricates new bots
		{
			entityId: "bldg_6",
			sceneLocation: "world",
			sceneBuildingId: null,
			faction: "player",
			unitType: null,
			botArchetypeId: null,
			markLevel: null,
			speechProfile: null,
			buildingType: "motor_pool",
			displayName: "Motor Pool",
			fragmentId: "world_primary",
			x: spawn.x - 3,
			y: 0,
			z: spawn.z - 1,
			speed: null,
			selected: false,
			components: [],
			navigation: null,
			aiRole: null,
			aiStateJson: null,
			powered: true,
			operational: true,
			rodCapacity: null,
			currentOutput: null,
			protectionRadius: null,
		},
	];
}
