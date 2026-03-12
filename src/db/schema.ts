import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
	DEFAULT_CITY_GENERATION_STATUS,
	DEFAULT_CITY_INSTANCE_STATE,
} from "../world/contracts";

// Separate long-term persistence from short-term Koota ECS ticks.
// These tables represent the "save file" of the player.

export const saveGames = sqliteTable("save_games", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	worldSeed: integer("world_seed").notNull().default(42),
	mapSize: text("map_size").notNull().default("standard"),
	difficulty: text("difficulty").notNull().default("standard"),
	climateProfile: text("climate_profile").notNull().default("temperate"),
	stormProfile: text("storm_profile").notNull().default("volatile"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	lastPlayedAt: integer("last_played_at", { mode: "timestamp" }).notNull(),
	playtimeSeconds: integer("playtime_seconds").notNull().default(0),
});

export const worldMaps = sqliteTable("world_maps", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	width: integer("width").notNull(),
	height: integer("height").notNull(),
	mapSize: text("map_size").notNull(),
	climateProfile: text("climate_profile").notNull(),
	stormProfile: text("storm_profile").notNull(),
	spawnQ: integer("spawn_q").notNull(),
	spawnR: integer("spawn_r").notNull(),
	generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
});

export const worldTiles = sqliteTable("world_tiles", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	worldMapId: integer("world_map_id")
		.notNull()
		.references(() => worldMaps.id, { onDelete: "cascade" }),
	q: integer("q").notNull(),
	r: integer("r").notNull(),
	biome: text("biome").notNull(),
	terrainSetId: text("terrain_set_id").notNull(),
	fogState: integer("fog_state").notNull().default(0),
	passable: integer("passable").notNull().default(1),
});

export const worldPointsOfInterest = sqliteTable("world_points_of_interest", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	worldMapId: integer("world_map_id")
		.notNull()
		.references(() => worldMaps.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	name: text("name").notNull(),
	q: integer("q").notNull(),
	r: integer("r").notNull(),
	discovered: integer("discovered").notNull().default(0),
});

export const cityInstances = sqliteTable("city_instances", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	worldMapId: integer("world_map_id")
		.notNull()
		.references(() => worldMaps.id, { onDelete: "cascade" }),
	poiId: integer("poi_id").references(() => worldPointsOfInterest.id, {
		onDelete: "set null",
	}),
	name: text("name").notNull(),
	worldQ: integer("world_q").notNull(),
	worldR: integer("world_r").notNull(),
	layoutSeed: integer("layout_seed").notNull(),
	generationStatus: text("generation_status")
		.notNull()
		.default(DEFAULT_CITY_GENERATION_STATUS),
	state: text("state").notNull().default(DEFAULT_CITY_INSTANCE_STATE),
});

export const worldEntities = sqliteTable("world_entities", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	entityId: text("entity_id").notNull(),
	sceneLocation: text("scene_location").notNull().default("world"),
	sceneBuildingId: text("scene_building_id"),
	faction: text("faction").notNull(),
	unitType: text("unit_type"),
	buildingType: text("building_type"),
	displayName: text("display_name"),
	fragmentId: text("fragment_id"),
	x: real("x").notNull(),
	y: real("y").notNull(),
	z: real("z").notNull(),
	speed: real("speed"),
	selected: integer("selected").notNull().default(0),
	componentsJson: text("components_json").notNull().default("[]"),
	navigationJson: text("navigation_json"),
	aiRole: text("ai_role"),
	aiStateJson: text("ai_state_json"),
	powered: integer("powered"),
	operational: integer("operational"),
	rodCapacity: real("rod_capacity"),
	currentOutput: real("current_output"),
	protectionRadius: real("protection_radius"),
});

export const campaignStates = sqliteTable("campaign_states", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	activeScene: text("active_scene").notNull().default("world"),
	activeCityInstanceId: integer("active_city_instance_id").references(
		() => cityInstances.id,
		{
			onDelete: "set null",
		},
	),
	currentTick: integer("current_tick").notNull().default(0),
	lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }).notNull(),
});

export const resourceStates = sqliteTable("resource_states", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	scrapMetal: integer("scrap_metal").notNull().default(0),
	eWaste: integer("e_waste").notNull().default(0),
	intactComponents: integer("intact_components").notNull().default(0),
	lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }).notNull(),
});

export const unlockedTechniques = sqliteTable("unlocked_techniques", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id").references(() => saveGames.id, {
		onDelete: "cascade",
	}),
	techniqueId: text("technique_id").notNull(),
	unlockedAt: integer("unlocked_at", { mode: "timestamp" }).notNull(),
});

export const mapDiscovery = sqliteTable("map_discovery", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id").references(() => saveGames.id, {
		onDelete: "cascade",
	}),
	chunkX: integer("chunk_x").notNull(),
	chunkY: integer("chunk_y").notNull(),
	discoveredState: text("discovered_state").notNull(), // 'unexplored', 'abstract', 'detailed'
});
