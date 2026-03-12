import { createStartingRoster } from "../bots";
import type { PersistableWorldEntity } from "./snapshots";
import type { GeneratedEcumenopolisData } from "./generation";
import { gridToWorld } from "./sectorCoordinates";

function parseSpawnAnchorKey(spawnAnchorKey: string) {
	const [spawnQ, spawnR] = spawnAnchorKey
		.split(",")
		.map((value) => Number.parseInt(value, 10));

	return { spawnQ, spawnR };
}

export function createInitialCampaignEntities(
	generatedWorld: GeneratedEcumenopolisData,
): PersistableWorldEntity[] {
	const { spawnQ, spawnR } = parseSpawnAnchorKey(
		generatedWorld.ecumenopolis.spawnAnchorKey,
	);
	const roster = createStartingRoster({ spawnQ, spawnR });
	const scienceCampus = generatedWorld.pointsOfInterest.find(
		(poi) => poi.type === "science_campus",
	);
	const cultWards = generatedWorld.pointsOfInterest.find(
		(poi) => poi.type === "northern_cult_site",
	);

	if (scienceCampus) {
		const scienceWorld = gridToWorld(scienceCampus.q, scienceCampus.r);
		roster.push(
			{
				entityId: "unit_6",
				sceneLocation: "world",
				sceneBuildingId: null,
				faction: "rogue",
				unitType: "mecha_scout",
				botArchetypeId: "field_technician",
				markLevel: 2,
				speechProfile: "scout",
				buildingType: null,
				displayName: "Rival Survey Strider",
				fragmentId: "world_primary",
				x: scienceWorld.x + 0.8,
				y: 0,
				z: scienceWorld.z - 0.6,
				speed: 3.8,
				selected: false,
				components: [
					{ name: "processor", functional: true, material: "electronic" },
					{ name: "sensor_cluster", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
					{ name: "signal_array", functional: true, material: "electronic" },
				],
				navigation: { path: [], pathIndex: 0, moving: false },
				aiRole: "hostile_machine",
				aiStateJson: null,
				powered: null,
				operational: null,
				rodCapacity: null,
				currentOutput: null,
				protectionRadius: null,
			},
			{
				entityId: "unit_7",
				sceneLocation: "world",
				sceneBuildingId: null,
				faction: "rogue",
				unitType: "quadruped_tank",
				botArchetypeId: "defense_sentry",
				markLevel: 2,
				speechProfile: "warden",
				buildingType: null,
				displayName: "Rival Defense Sentry",
				fragmentId: "world_primary",
				x: scienceWorld.x - 0.9,
				y: 0,
				z: scienceWorld.z + 0.9,
				speed: 2.8,
				selected: false,
				components: [
					{ name: "processor", functional: true, material: "electronic" },
					{ name: "sensor_cluster", functional: true, material: "electronic" },
					{ name: "stabilizers", functional: true, material: "metal" },
					{ name: "weapon_mount", functional: true, material: "metal" },
				],
				navigation: { path: [], pathIndex: 0, moving: false },
				aiRole: "hostile_machine",
				aiStateJson: null,
				powered: null,
				operational: null,
				rodCapacity: null,
				currentOutput: null,
				protectionRadius: null,
			},
		);
	}

	if (cultWards) {
		const cultWorld = gridToWorld(cultWards.q, cultWards.r);
		roster.push(
			{
				entityId: "unit_8",
				sceneLocation: "world",
				sceneBuildingId: null,
				faction: "cultist",
				unitType: "mecha_trooper",
				botArchetypeId: "cult_conduit",
				markLevel: 2,
				speechProfile: "cult",
				buildingType: null,
				displayName: "Cult Conduit",
				fragmentId: "world_primary",
				x: cultWorld.x + 0.4,
				y: 0,
				z: cultWorld.z + 0.6,
				speed: 3.2,
				selected: false,
				components: [
					{ name: "processor", functional: true, material: "electronic" },
					{ name: "relay_spine", functional: true, material: "electronic" },
					{ name: "storm_channel", functional: true, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				],
				navigation: { path: [], pathIndex: 0, moving: false },
				aiRole: "cultist",
				aiStateJson: null,
				powered: null,
				operational: null,
				rodCapacity: null,
				currentOutput: null,
				protectionRadius: null,
			},
			{
				entityId: "unit_9",
				sceneLocation: "world",
				sceneBuildingId: null,
				faction: "cultist",
				unitType: "field_fighter",
				botArchetypeId: "assault_strider",
				markLevel: 2,
				speechProfile: "cult",
				buildingType: null,
				displayName: "Cult Shock Frame",
				fragmentId: "world_primary",
				x: cultWorld.x - 0.8,
				y: 0,
				z: cultWorld.z - 0.7,
				speed: 3.2,
				selected: false,
				components: [
					{ name: "processor", functional: true, material: "electronic" },
					{ name: "sensor_cluster", functional: true, material: "electronic" },
					{ name: "weapon_mount", functional: true, material: "metal" },
					{ name: "legs", functional: true, material: "metal" },
				],
				navigation: { path: [], pathIndex: 0, moving: false },
				aiRole: "cultist",
				aiStateJson: null,
				powered: null,
				operational: null,
				rodCapacity: null,
				currentOutput: null,
				protectionRadius: null,
			},
		);
	}

	return roster;
}
