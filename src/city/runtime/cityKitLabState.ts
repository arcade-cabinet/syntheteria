import {
	filterCityModels,
	getCityCatalogSubcategories,
	getCityComposites,
} from "../catalog/cityCatalog";
import {
	buildCityDirectorySummaries,
	CITY_FAMILY_FILTERS,
	CITY_PLACEMENT_FILTERS,
	formatCitySubcategoryLabel,
	summarizeScenarioSet,
} from "../catalog/cityUnderstanding";
import { FLOOR_MATERIAL_PRESETS } from "../config/floorMaterialPresets";
import type { CityFamily, CityPlacementType } from "../config/types";

export interface CityKitLabFilterState {
	compositableOnly: boolean;
	family: CityFamily | "all";
	placementType: CityPlacementType | "all";
	subcategory: string | "all";
}

export function createDefaultCityKitLabFilterState(): CityKitLabFilterState {
	return {
		compositableOnly: false,
		family: "all",
		placementType: "all",
		subcategory: "all",
	};
}

export function getCityKitLabFilterOptions() {
	return {
		familyFilters: CITY_FAMILY_FILTERS,
		placementFilters: CITY_PLACEMENT_FILTERS,
		subcategories: ["all", ...getCityCatalogSubcategories()],
	};
}

export function getCityKitLabViewModel(filter: CityKitLabFilterState) {
	return {
		directorySummaries: buildCityDirectorySummaries(),
		filterOptions: getCityKitLabFilterOptions(),
		floorPresets: FLOOR_MATERIAL_PRESETS,
		models: filterCityModels(filter),
		composites: getCityComposites(),
		scenarios: summarizeScenarioSet(),
	};
}

export { formatCitySubcategoryLabel };
