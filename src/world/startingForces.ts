/**
 * Starting forces — creates initial campaign entities for a new game.
 *
 * Spawns the player's starting units at the spawn position.
 * Reads unit config from config/units.json.
 */

import type { PersistableWorldEntity } from "./snapshots";
import type { GeneratedEcumenopolisData } from "./generation";
import { SECTOR_LATTICE_SIZE } from "./sectorCoordinates";

/**
 * Create the initial set of entities for a new campaign.
 * Places the player's starting bot at the spawn position.
 */
export function createInitialCampaignEntities(
	world: GeneratedEcumenopolisData,
): PersistableWorldEntity[] {
	const spawnQ = Math.floor(world.ecumenopolis.width / 2);
	const spawnR = Math.floor(world.ecumenopolis.height / 2);
	const spawnX = spawnQ * SECTOR_LATTICE_SIZE;
	const spawnZ = spawnR * SECTOR_LATTICE_SIZE;

	return [
		{
			entityId: "player_bot_0",
			sceneLocation: "world",
			sceneBuildingId: null,
			faction: "player",
			unitType: "maintenance_bot",
			botArchetypeId: null,
			markLevel: 1,
			speechProfile: null,
			buildingType: null,
			displayName: "Unit-01",
			fragmentId: null,
			x: spawnX,
			y: 0,
			z: spawnZ,
			speed: 2,
			selected: false,
			components: [],
			navigation: null,
			aiRole: "player_unit",
			aiStateJson: null,
			powered: null,
			operational: null,
			rodCapacity: null,
			currentOutput: null,
			protectionRadius: null,
		},
		{
			entityId: "player_bot_1",
			sceneLocation: "world",
			sceneBuildingId: null,
			faction: "player",
			unitType: "mecha_scout",
			botArchetypeId: null,
			markLevel: 1,
			speechProfile: null,
			buildingType: null,
			displayName: "Scout-01",
			fragmentId: null,
			x: spawnX + SECTOR_LATTICE_SIZE,
			y: 0,
			z: spawnZ,
			speed: 4,
			selected: false,
			components: [],
			navigation: null,
			aiRole: "player_unit",
			aiStateJson: null,
			powered: null,
			operational: null,
			rodCapacity: null,
			currentOutput: null,
			protectionRadius: null,
		},
	];
}
