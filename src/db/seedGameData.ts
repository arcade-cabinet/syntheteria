import chunksConfig from "../config/chunks.json";
import floorTexturesJson from "../config/floorTextures.json";
import modelDefinitionsJson from "../config/modelDefinitions.json";
import unitsJson from "../config/units.json";
import { FLOOR_MATERIALS } from "../world/gen/types";
import type { SyncDatabase } from "./types";

// ─── Session-scoped dedup (mirrors bootstrap.ts WeakSet pattern) ────────────
const seededDatabases = new WeakSet<object>();

// ─── Floor color constants (hex int -> CSS hex) ─────────────────────────────
// Source of truth: src/rendering/StructuralFloorRenderer.tsx FLOOR_COLORS
const ZONE_TILE_DEFINITIONS: {
	id: string;
	zoneType: string;
	baseColorHex: string;
	emissiveTintHex: string | null;
}[] = [
	{
		id: "tile_command",
		zoneType: "command",
		baseColorHex: "#5e7385",
		emissiveTintHex: "#18383a",
	},
	{
		id: "tile_fabrication",
		zoneType: "fabrication",
		baseColorHex: "#7a634a",
		emissiveTintHex: null,
	},
	{
		id: "tile_transit",
		zoneType: "transit",
		baseColorHex: "#71879b",
		emissiveTintHex: "#27414d",
	},
	{
		id: "tile_power",
		zoneType: "power",
		baseColorHex: "#62658a",
		emissiveTintHex: "#5268a6",
	},
	{
		id: "tile_breach",
		zoneType: "breach",
		baseColorHex: "#50545f",
		emissiveTintHex: "#ff4422",
	},
	{
		id: "tile_storage",
		zoneType: "storage",
		baseColorHex: "#75614f",
		emissiveTintHex: null,
	},
	{
		id: "tile_habitation",
		zoneType: "habitation",
		baseColorHex: "#5a7f8f",
		emissiveTintHex: null,
	},
	{
		id: "tile_corridor",
		zoneType: "corridor",
		baseColorHex: "#71879b",
		emissiveTintHex: "#27414d",
	},
	{
		id: "tile_perimeter",
		zoneType: "perimeter",
		baseColorHex: "#50545f",
		emissiveTintHex: null,
	},
	{
		id: "tile_wasteland",
		zoneType: "wasteland",
		baseColorHex: "#3a3a3a",
		emissiveTintHex: null,
	},
];

// ─── Zone -> floor texture set mapping ──────────────────────────────────────
// Maps tile zone types to their texture JSON from floorTextures.json
const ZONE_TO_FLOOR_TEXTURE_KEY: Record<string, string | null> = {
	command: "command_core",
	fabrication: "fabrication",
	transit: "corridor_transit",
	corridor: "corridor_transit",
	habitation: "habitation",
	// These zones don't have dedicated texture sets in floorTextures.json
	power: null,
	breach: null,
	storage: null,
	perimeter: null,
	wasteland: null,
};

// ─── Robot ID -> units.json key mapping ─────────────────────────────────────
// Maps model definition IDs to the units.json keys for stat merging
const ROBOT_TO_UNIT_KEY: Record<string, string | null> = {
	companion_bot: "maintenance_bot",
	recon_bot: "utility_drone",
	arachnoid: "feral_drone",
	mobile_storage_bot: "fabrication_unit",
	// These robots don't have entries in units.json
	mecha_trooper: null,
	quadruped_tank: null,
	mecha_golem: null,
	field_fighter: null,
	mecha01: null,
};

interface ElevationProfile {
	supportsBridging?: boolean;
	isRamp?: boolean;
	isVerticalSupport?: boolean;
}

interface ModelDef {
	id: string;
	displayName: string;
	category: string;
	family: string;
	tags: string[];
	assetPath: string;
	bounds: { width: number; height: number; depth: number };
	gridFootprint: { width: number; depth: number };
	passable: boolean;
	blocksSight: boolean;
	initialPlacement: boolean;
	buildable: boolean;
	factionRestrictions: string[];
	allowedZones?: string[];
	elevationProfile?: ElevationProfile;
	harvest: unknown;
	interaction: unknown;
	combat: unknown;
	economy: unknown;
	rendering: unknown;
}

interface UnitDef {
	displayName: string;
	speed: number;
	powerDemand: number;
	movingPowerBonus: number;
	model: string;
	scale: number;
}

// ─── Main seeder ────────────────────────────────────────────────────────────

export function seedGameDataSync(database: SyncDatabase): void {
	if (seededDatabases.has(database as object)) {
		return;
	}

	seedModelDefinitions(database);
	seedTileDefinitions(database);
	seedRobotDefinitions(database);
	seedGameConfig(database);

	seededDatabases.add(database as object);
}

// ─── Game config (chunks, floor materials) ──────────────────────────────────

function seedGameConfig(database: SyncDatabase): void {
	const stmt =
		`INSERT OR REPLACE INTO game_config (key, value_json) VALUES (?, ?)`;

	database.runSync(stmt, "chunks", JSON.stringify(chunksConfig));
	database.runSync(
		stmt,
		"floor_materials",
		JSON.stringify([...FLOOR_MATERIALS]),
	);
	// Undermaterials for pit interiors (harvested floor tiles).
	// Ingest from /Volumes/home/assets/2DPhotorealistic (Textures/polyhaven, TERRAIN).
	database.runSync(
		stmt,
		"undermaterials",
		JSON.stringify([] as { id: string; texturePath: string }[]),
	);
}

// ─── Model definitions ──────────────────────────────────────────────────────

function seedModelDefinitions(database: SyncDatabase): void {
	const models = (modelDefinitionsJson as { models: ModelDef[] }).models;

	const stmt =
		`INSERT OR REPLACE INTO model_definitions ` +
		`(id, category, family, display_name, asset_path, bounds_json, ` +
		`grid_footprint_json, placement_rules_json, interactions_json, ` +
		`rendering_json, mechanics_json, passable, blocks_sight, ` +
		`initial_placement, buildable, faction_restricted, tags) ` +
		`VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

	for (const model of models) {
		const placementRules = JSON.stringify({
			allowedZones: model.allowedZones ?? [],
			elevationProfile: model.elevationProfile ?? null,
		});
		const interactions = JSON.stringify(model.interaction ?? {});
		const rendering = JSON.stringify(model.rendering ?? {});
		const mechanics = JSON.stringify({
			harvest: model.harvest ?? null,
			combat: model.combat ?? null,
			economy: model.economy ?? null,
		});
		const factionRestricted =
			model.factionRestrictions && model.factionRestrictions.length > 0
				? JSON.stringify(model.factionRestrictions)
				: null;

		database.runSync(
			stmt,
			model.id,
			model.category,
			model.family,
			model.displayName,
			model.assetPath,
			JSON.stringify(model.bounds),
			JSON.stringify(model.gridFootprint),
			placementRules,
			interactions,
			rendering,
			mechanics,
			model.passable ? 1 : 0,
			model.blocksSight ? 1 : 0,
			model.initialPlacement ? 1 : 0,
			model.buildable ? 1 : 0,
			factionRestricted,
			JSON.stringify(model.tags),
		);
	}
}

// ─── Tile definitions ───────────────────────────────────────────────────────

function seedTileDefinitions(database: SyncDatabase): void {
	const floorZones = (
		floorTexturesJson as {
			zones: Record<
				string,
				{
					label: string;
					textures: Record<string, string>;
				}
			>;
		}
	).zones;

	const stmt =
		`INSERT OR REPLACE INTO tile_definitions ` +
		`(id, zone_type, texture_set_json, seamless, base_color_hex, emissive_tint_hex) ` +
		`VALUES (?, ?, ?, ?, ?, ?)`;

	for (const tileDef of ZONE_TILE_DEFINITIONS) {
		const floorKey = ZONE_TO_FLOOR_TEXTURE_KEY[tileDef.zoneType];
		const textureSet =
			floorKey && floorZones[floorKey]
				? JSON.stringify(floorZones[floorKey].textures)
				: "{}";

		database.runSync(
			stmt,
			tileDef.id,
			tileDef.zoneType,
			textureSet,
			1, // seamless
			tileDef.baseColorHex,
			tileDef.emissiveTintHex,
		);
	}
}

// ─── Robot definitions ──────────────────────────────────────────────────────

function seedRobotDefinitions(database: SyncDatabase): void {
	const models = (modelDefinitionsJson as { models: ModelDef[] }).models;
	const units = unitsJson as Record<string, UnitDef>;

	const robotModels = models.filter((m) => m.category === "robot");

	const stmt =
		`INSERT OR REPLACE INTO robot_definitions ` +
		`(id, chassis_type, display_name, asset_path, stats_json, abilities_json) ` +
		`VALUES (?, ?, ?, ?, ?, ?)`;

	for (const robot of robotModels) {
		const unitKey = ROBOT_TO_UNIT_KEY[robot.id] ?? null;
		const unitStats = unitKey ? units[unitKey] ?? null : null;

		const chassisType = robot.family.replace("robot_", "");

		const stats = unitStats
			? {
					speed: unitStats.speed,
					powerDemand: unitStats.powerDemand,
					movingPowerBonus: unitStats.movingPowerBonus,
					scale: unitStats.scale,
					bounds: robot.bounds,
				}
			: {
					speed: 0,
					powerDemand: 0,
					movingPowerBonus: 0,
					scale: 1.0,
					bounds: robot.bounds,
				};

		// Derive abilities from family/tags
		const abilities: string[] = [];
		if (robot.family === "robot_player") {
			abilities.push("move", "interact");
		}
		if (robot.family === "robot_hostile") {
			abilities.push("move", "attack");
		}
		if (robot.family === "robot_industrial") {
			abilities.push("haul", "fabricate");
		}
		if (robot.tags.includes("companion")) {
			abilities.push("follow", "repair");
		}

		database.runSync(
			stmt,
			robot.id,
			chassisType,
			robot.displayName,
			robot.assetPath,
			JSON.stringify(stats),
			JSON.stringify(abilities),
		);
	}
}

// ─── Test helper ────────────────────────────────────────────────────────────

export function resetSeedGameDataForTests(database: SyncDatabase): void {
	seededDatabases.delete(database as object);
}
