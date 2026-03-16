/**
 * City & POI type contracts.
 *
 * These types define the vocabulary for the POI/city system.
 * The POI system sits ON TOP of the world map — these contracts
 * are stable even as the underlying terrain generation changes.
 */

export type WorldPoiType =
	| "home_base"
	| "resource_depot"
	| "research_site"
	| "faction_outpost"
	| "ruin"
	| "science_campus"
	| "northern_cult_site"
	| "deep_sea_gateway"
	| "coast_mines";

export const WORLD_POI_TYPES: readonly WorldPoiType[] = [
	"home_base",
	"resource_depot",
	"research_site",
	"faction_outpost",
	"ruin",
	"science_campus",
	"northern_cult_site",
	"deep_sea_gateway",
	"coast_mines",
];

/** POI types that can be founded as cities */
const FOUNDABLE_POI_TYPES: readonly WorldPoiType[] = [
	"home_base",
	"resource_depot",
	"research_site",
	"science_campus",
];

export function isFoundableCityPoiType(poiType: WorldPoiType): boolean {
	return (FOUNDABLE_POI_TYPES as readonly string[]).includes(poiType);
}

export type CityGenerationStatus =
	| "pending"
	| "generating"
	| "ready"
	| "failed"
	| "reserved"
	| "instanced";

export const DEFAULT_CITY_GENERATION_STATUS: CityGenerationStatus = "pending";

/** City lifecycle states — progression from undiscovered to active */
export type CityInstanceState = "latent" | "surveyed" | "founded";

export const DEFAULT_CITY_INSTANCE_STATE: CityInstanceState = "latent";
