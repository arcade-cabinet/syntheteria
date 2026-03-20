/**
 * Points of Interest definitions — named locations placed on the map.
 *
 * Converted from pending/config/pois.json to TypeScript const objects.
 *
 * POIs are fixed landmarks placed relative to the board dimensions.
 * Each has a type (home_base, resource_depot, etc.), a human-readable name,
 * and relative coordinates (0-1 range) that scale to any board size.
 *
 * Some POIs are discovered at game start, others must be explored.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type POIType =
	| "home_base"
	| "resource_depot"
	| "research_site"
	| "faction_outpost"
	| "ruin_depot"
	| "ruin_factory"
	| "ruin_outpost"
	| "ruin_research"
	| "ruin_military"
	| "northern_cult_site"
	| "deep_sea_gateway"
	| "science_campus"
	| "holocron_observatory"
	| "holocron_bunker"
	| "holocron_ai_lab"
	| "holocron_el_site"
	| "holocron_satellite"
	| "holocron_storm_station"
	| "holocron_archive"
	| "holocron_beacon";

export interface POIDef {
	readonly type: POIType;
	readonly name: string;
	/** X position as fraction of board width [0, 1]. */
	readonly relativeX: number;
	/** Z position as fraction of board height [0, 1]. */
	readonly relativeZ: number;
	/** Whether this POI is visible from the start. */
	readonly discoveredAtStart: boolean;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/** Manhattan-distance tile radius for discovering a POI. */
export const POI_DISCOVERY_RADIUS = 5;

/** Additional fringe radius for "almost discovered" visual hints. */
export const POI_DISCOVERY_FRINGE_RADIUS = 2;

/** POI types that can be founded by the player as new bases. */
export const FOUNDABLE_POI_TYPES: readonly POIType[] = [
	"home_base",
	"resource_depot",
	"research_site",
	"science_campus",
	"ruin_depot",
	"ruin_factory",
	"ruin_outpost",
	"ruin_research",
	"ruin_military",
	"holocron_observatory",
	"holocron_bunker",
	"holocron_ai_lab",
	"holocron_el_site",
	"holocron_satellite",
	"holocron_storm_station",
	"holocron_archive",
	"holocron_beacon",
] as const;

// ─── Data ────────────────────────────────────────────────────────────────────

export const POI_DEFINITIONS: readonly POIDef[] = [
	{
		type: "home_base",
		name: "Command Nexus",
		relativeX: 0.5,
		relativeZ: 0.5,
		discoveredAtStart: true,
	},
	{
		type: "resource_depot",
		name: "Salvage Yard",
		relativeX: 0.2,
		relativeZ: 0.3,
		discoveredAtStart: false,
	},
	{
		type: "research_site",
		name: "Signal Lab",
		relativeX: 0.75,
		relativeZ: 0.25,
		discoveredAtStart: false,
	},
	{
		type: "faction_outpost",
		name: "Iron Creed Outpost",
		relativeX: 0.8,
		relativeZ: 0.7,
		discoveredAtStart: false,
	},
	{
		type: "ruin_depot",
		name: "Ruined Supply Depot",
		relativeX: 0.2,
		relativeZ: 0.3,
		discoveredAtStart: false,
	},
	{
		type: "ruin_factory",
		name: "Abandoned Factory",
		relativeX: 0.7,
		relativeZ: 0.2,
		discoveredAtStart: false,
	},
	{
		type: "ruin_outpost",
		name: "Collapsed Outpost",
		relativeX: 0.3,
		relativeZ: 0.7,
		discoveredAtStart: false,
	},
	{
		type: "ruin_research",
		name: "Derelict Research Lab",
		relativeX: 0.6,
		relativeZ: 0.6,
		discoveredAtStart: false,
	},
	{
		type: "ruin_military",
		name: "Military Wreckage",
		relativeX: 0.5,
		relativeZ: 0.15,
		discoveredAtStart: false,
	},
	{
		type: "northern_cult_site",
		name: "Fracture Rift",
		relativeX: 0.15,
		relativeZ: 0.15,
		discoveredAtStart: false,
	},
	{
		type: "deep_sea_gateway",
		name: "Sunken Conduit",
		relativeX: 0.9,
		relativeZ: 0.9,
		discoveredAtStart: false,
	},
	// ── Holocron POIs ─────────────────────────────────────────────────────
	{
		type: "holocron_observatory",
		name: "Shattered Observatory",
		relativeX: 0.1,
		relativeZ: 0.85,
		discoveredAtStart: false,
	},
	{
		type: "holocron_bunker",
		name: "Pre-Storm Bunker",
		relativeX: 0.85,
		relativeZ: 0.4,
		discoveredAtStart: false,
	},
	{
		type: "holocron_ai_lab",
		name: "Genesis AI Lab",
		relativeX: 0.35,
		relativeZ: 0.1,
		discoveredAtStart: false,
	},
	{
		type: "holocron_el_site",
		name: "EL Arrival Crater",
		relativeX: 0.65,
		relativeZ: 0.85,
		discoveredAtStart: false,
	},
	{
		type: "holocron_satellite",
		name: "Fallen Satellite Array",
		relativeX: 0.4,
		relativeZ: 0.45,
		discoveredAtStart: false,
	},
	{
		type: "holocron_storm_station",
		name: "Storm Research Station",
		relativeX: 0.25,
		relativeZ: 0.55,
		discoveredAtStart: false,
	},
	{
		type: "holocron_archive",
		name: "Digital Archive Vault",
		relativeX: 0.7,
		relativeZ: 0.35,
		discoveredAtStart: false,
	},
	{
		type: "holocron_beacon",
		name: "Ancient Signal Beacon",
		relativeX: 0.55,
		relativeZ: 0.75,
		discoveredAtStart: false,
	},
] as const;

/** Fast lookup by POI type. */
export const POI_BY_TYPE: ReadonlyMap<POIType, POIDef> = new Map(
	POI_DEFINITIONS.map((p) => [p.type, p]),
);

/** All holocron POI types. */
export const HOLOCRON_POI_TYPES: readonly POIType[] = [
	"holocron_observatory",
	"holocron_bunker",
	"holocron_ai_lab",
	"holocron_el_site",
	"holocron_satellite",
	"holocron_storm_station",
	"holocron_archive",
	"holocron_beacon",
] as const;

/** Check whether a POI type is a holocron discovery site. */
export function isHolocronPOI(type: POIType): boolean {
	return (HOLOCRON_POI_TYPES as readonly string[]).includes(type);
}

/**
 * Convert relative POI coordinates to tile coordinates for a given board size.
 */
export function poiToTile(
	poi: POIDef,
	boardWidth: number,
	boardHeight: number,
): { x: number; z: number } {
	return {
		x: Math.floor(poi.relativeX * boardWidth),
		z: Math.floor(poi.relativeZ * boardHeight),
	};
}
