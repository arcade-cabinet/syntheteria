import { cityModelManifest } from "../../config/generated/cityModelManifest";
import { CITY_COMPOSITES } from "../composites/cityComposites";
import { CITY_MODEL_SEMANTICS } from "../config/cityModelSemantics";
import type {
	CityCompositeDefinition,
	CityFamily,
	CityModelDefinition,
	CityPassabilityEffect,
	CityPlacementType,
	CityZone,
} from "../config/types";

export interface CityCatalogFilter {
	compositableOnly?: boolean;
	family?: CityFamily | "all";
	passabilityRole?: CityPassabilityEffect | "all";
	placementType?: CityPlacementType | "all";
	subcategory?: string | "all";
	zone?: CityZone | "all";
}

const GENERATED_CITY_MODELS = cityModelManifest.models as CityModelDefinition[];
export const CITY_MODELS = GENERATED_CITY_MODELS.map((model) => {
	const semantics = CITY_MODEL_SEMANTICS[model.id];
	if (!semantics) {
		throw new Error(`Missing authored semantics for city model ${model.id}.`);
	}
	return {
		...model,
		...semantics,
	} satisfies CityModelDefinition;
});

export function getCityModelById(id: string) {
	return CITY_MODELS.find((model) => model.id === id) ?? null;
}

export function getCityModelsByFamily(family: CityFamily) {
	return CITY_MODELS.filter((model) => model.family === family);
}

export function getCityModelsBySubcategory(subcategory: string) {
	return CITY_MODELS.filter((model) => model.subcategory === subcategory);
}

export function getCityCatalogSubcategories() {
	return Array.from(
		new Set(CITY_MODELS.map((model) => model.subcategory)),
	).sort();
}

export function groupCityModelsBySubcategory() {
	return getCityCatalogSubcategories().map((subcategory) => ({
		subcategory,
		models: getCityModelsBySubcategory(subcategory),
	}));
}

export function filterCityModels(filter: CityCatalogFilter) {
	return CITY_MODELS.filter((model) => {
		if (
			filter.family &&
			filter.family !== "all" &&
			model.family !== filter.family
		) {
			return false;
		}
		if (
			filter.subcategory &&
			filter.subcategory !== "all" &&
			model.subcategory !== filter.subcategory
		) {
			return false;
		}
		if (
			filter.placementType &&
			filter.placementType !== "all" &&
			model.placementType !== filter.placementType
		) {
			return false;
		}
		if (
			filter.passabilityRole &&
			filter.passabilityRole !== "all" &&
			model.passabilityEffect !== filter.passabilityRole
		) {
			return false;
		}
		if (
			filter.zone &&
			filter.zone !== "all" &&
			!model.zoneAffinity.includes(filter.zone)
		) {
			return false;
		}
		if (filter.compositableOnly && model.compositeEligibility.length === 0) {
			return false;
		}
		return true;
	});
}

export function selectZoneModel(
	zone: CityZone,
	family: CityFamily,
	preferredTags: string[] = [],
) {
	const candidates = CITY_MODELS.filter(
		(model) => model.family === family && model.zoneAffinity.includes(zone),
	);
	if (candidates.length === 0) {
		return null;
	}
	const tagged = preferredTags.length
		? candidates.filter((model) =>
				preferredTags.every((tag) => model.tags.includes(tag)),
			)
		: candidates;
	return tagged[0] ?? candidates[0] ?? null;
}

export function getPlayableCitySubset() {
	return CITY_MODELS.filter(
		(model) =>
			model.family !== "detail" ||
			model.tags.includes("vent") ||
			model.tags.includes("arrow"),
	);
}

export function getDeferredCitySubset() {
	const playableIds = new Set(getPlayableCitySubset().map((model) => model.id));
	return CITY_MODELS.filter((model) => !playableIds.has(model.id));
}

export function getCityComposites(): CityCompositeDefinition[] {
	return CITY_COMPOSITES;
}
