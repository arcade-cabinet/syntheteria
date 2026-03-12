export const WORLD_POI_TYPES = [
	"home_base",
	"coast_mines",
	"science_campus",
	"northern_cult_site",
	"deep_sea_gateway",
] as const;

export type WorldPoiType = (typeof WORLD_POI_TYPES)[number];

export const CITY_INSTANCE_STATES = ["latent", "surveyed", "founded"] as const;
export type CityInstanceState = (typeof CITY_INSTANCE_STATES)[number];

export const CITY_GENERATION_STATUSES = ["reserved", "instanced"] as const;
export type CityGenerationStatus = (typeof CITY_GENERATION_STATUSES)[number];

export const DEFAULT_CITY_GENERATION_STATUS: CityGenerationStatus = "reserved";
export const DEFAULT_CITY_INSTANCE_STATE: CityInstanceState = "latent";

export const FOUNDABLE_CITY_POI_TYPES = [
	"home_base",
	"coast_mines",
	"science_campus",
] as const satisfies readonly WorldPoiType[];

export type FoundableCityPoiType = (typeof FOUNDABLE_CITY_POI_TYPES)[number];

export function isWorldPoiType(value: string): value is WorldPoiType {
	return WORLD_POI_TYPES.includes(value as WorldPoiType);
}

export function isCityInstanceState(value: string): value is CityInstanceState {
	return CITY_INSTANCE_STATES.includes(value as CityInstanceState);
}

export function isCityGenerationStatus(
	value: string,
): value is CityGenerationStatus {
	return CITY_GENERATION_STATUSES.includes(value as CityGenerationStatus);
}

export function isFoundableCityPoiType(
	poiType: WorldPoiType,
): poiType is FoundableCityPoiType {
	return FOUNDABLE_CITY_POI_TYPES.includes(poiType as FoundableCityPoiType);
}
