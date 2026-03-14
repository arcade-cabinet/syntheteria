import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { BotArchetypeId, BotSpeechProfile, BotUnitType } from "../bots";
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
	sectorScale: text("sector_scale").notNull().default("standard"),
	difficulty: text("difficulty").notNull().default("standard"),
	climateProfile: text("climate_profile").notNull().default("temperate"),
	stormProfile: text("storm_profile").notNull().default("volatile"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	lastPlayedAt: integer("last_played_at", { mode: "timestamp" }).notNull(),
	playtimeSeconds: integer("playtime_seconds").notNull().default(0),
});

export const ecumenopolisMaps = sqliteTable("ecumenopolis_maps", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	width: integer("width").notNull(),
	height: integer("height").notNull(),
	sectorScale: text("sector_scale").notNull(),
	climateProfile: text("climate_profile").notNull(),
	stormProfile: text("storm_profile").notNull(),
	spawnSectorId: text("spawn_sector_id").notNull(),
	spawnAnchorKey: text("spawn_anchor_key").notNull(),
	generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
});

export const sectorCells = sqliteTable("sector_cells", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ecumenopolisId: integer("ecumenopolis_id")
		.notNull()
		.references(() => ecumenopolisMaps.id, { onDelete: "cascade" }),
	q: integer("q").notNull(),
	r: integer("r").notNull(),
	structuralZone: text("structural_zone").notNull(),
	floorPresetId: text("floor_preset_id").notNull(),
	discoveryState: integer("discovery_state").notNull().default(0),
	passable: integer("passable").notNull().default(1),
	sectorArchetype: text("sector_archetype").notNull().default("service_plate"),
	stormExposure: text("storm_exposure").notNull().default("shielded"),
	impassableClass: text("impassable_class").notNull().default("none"),
	anchorKey: text("anchor_key").notNull().default("0,0"),
});

export const sectorStructures = sqliteTable("sector_structures", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ecumenopolisId: integer("ecumenopolis_id")
		.notNull()
		.references(() => ecumenopolisMaps.id, { onDelete: "cascade" }),
	districtStructureId: text("district_structure_id").notNull(),
	anchorKey: text("anchor_key").notNull(),
	q: integer("q").notNull(),
	r: integer("r").notNull(),
	modelId: text("model_id").notNull(),
	placementLayer: text("placement_layer").notNull(),
	edge: text("edge"),
	rotationQuarterTurns: integer("rotation_quarter_turns").notNull().default(0),
	offsetX: real("offset_x").notNull().default(0),
	offsetY: real("offset_y").notNull().default(0),
	offsetZ: real("offset_z").notNull().default(0),
	targetSpan: real("target_span").notNull().default(1),
	sectorArchetype: text("sector_archetype").notNull().default("service_plate"),
	source: text("source").notNull().default("seeded_district"),
	controllerFaction: text("controller_faction"),
});

export const worldPointsOfInterest = sqliteTable("world_points_of_interest", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ecumenopolisId: integer("ecumenopolis_id")
		.notNull()
		.references(() => ecumenopolisMaps.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	name: text("name").notNull(),
	q: integer("q").notNull(),
	r: integer("r").notNull(),
	discovered: integer("discovered").notNull().default(0),
});

export const cityInstances = sqliteTable("city_instances", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	ecumenopolisId: integer("ecumenopolis_id")
		.notNull()
		.references(() => ecumenopolisMaps.id, { onDelete: "cascade" }),
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
	unitType: text("unit_type").$type<BotUnitType | null>(),
	botArchetypeId: text("bot_archetype_id").$type<BotArchetypeId | null>(),
	markLevel: integer("mark_level"),
	speechProfile: text("speech_profile").$type<BotSpeechProfile | null>(),
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

export const harvestStates = sqliteTable("harvest_states", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	consumedStructureIdsJson: text("consumed_structure_ids_json")
		.notNull()
		.default("[]"),
	activeHarvestsJson: text("active_harvests_json").notNull().default("[]"),
	lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }).notNull(),
});

export const turnStates = sqliteTable("turn_states", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	turnNumber: integer("turn_number").notNull().default(1),
	phase: text("phase").notNull().default("player"),
	activeFaction: text("active_faction").notNull().default("player"),
	unitStatesJson: text("unit_states_json").notNull().default("[]"),
	lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }).notNull(),
});

export const factionResourceStates = sqliteTable("faction_resource_states", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	factionId: text("faction_id").notNull(),
	resourcesJson: text("resources_json").notNull().default("{}"),
	lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }).notNull(),
});

export const campaignStatistics = sqliteTable("campaign_statistics", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	statsJson: text("stats_json").notNull().default("{}"),
	lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }).notNull(),
});

export const turnEventLogs = sqliteTable("turn_event_logs", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id")
		.notNull()
		.references(() => saveGames.id, { onDelete: "cascade" }),
	turnNumber: integer("turn_number").notNull(),
	eventsJson: text("events_json").notNull().default("[]"),
});

// ─── Model Definitions ──────────────────────────────────────────────────────
export const modelDefinitions = sqliteTable("model_definitions", {
	id: text("id").primaryKey(),
	category: text("category").notNull(),
	family: text("family").notNull(),
	displayName: text("display_name").notNull(),
	assetPath: text("asset_path").notNull(),
	boundsJson: text("bounds_json")
		.notNull()
		.default('{"width":1,"height":1,"depth":1}'),
	gridFootprintJson: text("grid_footprint_json")
		.notNull()
		.default('{"width":1,"depth":1}'),
	placementRulesJson: text("placement_rules_json").notNull().default("{}"),
	interactionsJson: text("interactions_json").notNull().default("{}"),
	renderingJson: text("rendering_json").notNull().default("{}"),
	mechanicsJson: text("mechanics_json").notNull().default("{}"),
	passable: integer("passable").notNull().default(1),
	blocksSight: integer("blocks_sight").notNull().default(0),
	initialPlacement: integer("initial_placement").notNull().default(0),
	buildable: integer("buildable").notNull().default(0),
	factionRestricted: text("faction_restricted"),
	tags: text("tags").notNull().default("[]"),
});

// ─── Tile Definitions ───────────────────────────────────────────────────────
export const tileDefinitions = sqliteTable("tile_definitions", {
	id: text("id").primaryKey(),
	zoneType: text("zone_type").notNull(),
	textureSetJson: text("texture_set_json").notNull().default("{}"),
	seamless: integer("seamless").notNull().default(1),
	baseColorHex: text("base_color_hex").notNull().default("#808080"),
	emissiveTintHex: text("emissive_tint_hex"),
});

// ─── Robot Definitions ──────────────────────────────────────────────────────
export const robotDefinitions = sqliteTable("robot_definitions", {
	id: text("id").primaryKey(),
	chassisType: text("chassis_type").notNull(),
	displayName: text("display_name").notNull(),
	assetPath: text("asset_path").notNull(),
	statsJson: text("stats_json").notNull().default("{}"),
	abilitiesJson: text("abilities_json").notNull().default("[]"),
});

// ─── Game Map Tiles ─────────────────────────────────────────────────────────
export const gameMapTiles = sqliteTable("game_map_tiles", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id").notNull(),
	tileX: integer("tile_x").notNull(),
	tileY: integer("tile_y").notNull(),
	level: integer("level").notNull().default(0),
	elevationY: real("elevation_y").notNull().default(0),
	clearanceAbove: real("clearance_above").notNull().default(100),
	zoneType: text("zone_type").notNull(),
	tileDefinitionId: text("tile_definition_id"),
	passable: integer("passable").notNull().default(1),
	discoveryState: integer("discovery_state").notNull().default(0),
	placedModelId: text("placed_model_id"),
	placedModelRotation: integer("placed_model_rotation").notNull().default(0),
	isRamp: integer("is_ramp").notNull().default(0),
	isBridge: integer("is_bridge").notNull().default(0),
	controllerFaction: text("controller_faction"),
	resourceRemaining: integer("resource_remaining"),
	deltaJson: text("delta_json"),
});

// ─── Map Deltas ─────────────────────────────────────────────────────────────
export const mapDeltas = sqliteTable("map_deltas", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id").notNull(),
	turnNumber: integer("turn_number").notNull(),
	tileX: integer("tile_x").notNull(),
	tileY: integer("tile_y").notNull(),
	changeType: text("change_type").notNull(),
	changeJson: text("change_json").notNull().default("{}"),
});
