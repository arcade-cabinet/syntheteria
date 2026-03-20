import type {
	CityCompositeDefinition,
	CityFamily,
	CityModelDefinition,
	CityPassabilityEffect,
	CityPlacementType,
} from "../config/types";
import { CITY_LAYOUT_SCENARIOS } from "../grammar/cityScenarios";
import {
	CITY_MODELS,
	getCityCatalogSubcategories,
	getCityComposites,
} from "./cityCatalog";

export const CITY_FAMILY_FILTERS: Array<CityFamily | "all"> = [
	"all",
	"floor",
	"wall",
	"door",
	"roof",
	"prop",
	"detail",
	"column",
	"stair",
	"utility",
];

export const CITY_PLACEMENT_FILTERS: Array<CityPlacementType | "all"> = [
	"all",
	"cell",
	"edge",
	"corner",
	"roof",
	"prop",
	"detail",
	"vertical",
];

export type CitySnapClass =
	| "floor_cell"
	| "edge_wall"
	| "portal_edge"
	| "corner_cap"
	| "roof_cap"
	| "detail_overlay"
	| "prop_insert"
	| "vertical_connector";

export type CityFootprintClass = "compact" | "medium" | "large" | "tower";

export type CityPassabilityClass =
	| "passable"
	| "impassable"
	| "transitional"
	| "support"
	| "vertical";

export type CityStructuralRole =
	| "surface"
	| "barrier"
	| "portal"
	| "cover"
	| "column"
	| "stair"
	| "roof"
	| "detail"
	| "prop"
	| "utility";

export interface CityModelUnderstanding {
	id: string;
	label: string;
	directory: string;
	footprintClass: CityFootprintClass;
	heightClass: "low" | "mid" | "tall";
	snapClass: CitySnapClass;
	passabilityClass: CityPassabilityClass;
	structuralRole: CityStructuralRole;
	composable: boolean;
	rotationPolicy: "locked" | "opposed" | "quarter_turn";
	summary: string;
}

export interface CityDirectorySummary {
	directory: string;
	modelCount: number;
	families: CityFamily[];
	composableCount: number;
	passabilityClasses: CityPassabilityClass[];
	snapClasses: CitySnapClass[];
}

export interface CityCompositeSummary {
	id: string;
	label: string;
	gameplayRole: string;
	partCount: number;
	families: CityFamily[];
}

export interface CityScenarioSummary {
	id: string;
	label: string;
	description: string;
	grid: string;
	layers: string[];
	placementCount: number;
}

export function getCityDirectoryPath(model: CityModelDefinition) {
	const parts = model.sourceAssetPath.split("/");
	return parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
}

export function formatCitySubcategoryLabel(value: string) {
	return value.replace(/^city\//, "").replace(/\//g, " / ");
}

export function deriveCitySnapClass(model: CityModelDefinition): CitySnapClass {
	if (
		model.placementType === "vertical" ||
		model.family === "stair" ||
		model.passabilityEffect === "vertical_connector"
	) {
		return "vertical_connector";
	}
	if (model.family === "door" || model.passabilityEffect === "portal") {
		return "portal_edge";
	}
	if (model.family === "wall" || model.placementType === "edge") {
		return "edge_wall";
	}
	if (model.family === "roof" || model.placementType === "roof") {
		return "roof_cap";
	}
	if (model.placementType === "corner") {
		return "corner_cap";
	}
	if (model.family === "detail" || model.placementType === "detail") {
		return "detail_overlay";
	}
	if (model.family === "prop" || model.placementType === "prop") {
		return "prop_insert";
	}
	return "floor_cell";
}

export function deriveCityPassabilityClass(
	passabilityEffect: CityPassabilityEffect,
): CityPassabilityClass {
	switch (passabilityEffect) {
		case "walkable":
			return "passable";
		case "portal":
			return "transitional";
		case "vertical_connector":
			return "vertical";
		case "cover":
		case "guidance":
			return "support";
		case "blocking":
		default:
			return "impassable";
	}
}

export function deriveCityStructuralRole(
	model: Pick<CityModelDefinition, "family" | "passabilityEffect">,
): CityStructuralRole {
	if (model.family === "door" || model.passabilityEffect === "portal") {
		return "portal";
	}
	if (model.family === "wall" || model.passabilityEffect === "blocking") {
		return "barrier";
	}
	if (model.family === "column") {
		return "column";
	}
	if (
		model.family === "stair" ||
		model.passabilityEffect === "vertical_connector"
	) {
		return "stair";
	}
	if (model.family === "roof") {
		return "roof";
	}
	if (model.family === "detail") {
		return "detail";
	}
	if (model.family === "prop") {
		return "prop";
	}
	if (model.family === "utility") {
		return "utility";
	}
	if (model.passabilityEffect === "cover") {
		return "cover";
	}
	return "surface";
}

export function deriveCityFootprintClass(
	model: Pick<CityModelDefinition, "bounds" | "footprint">,
): CityFootprintClass {
	const span = Math.max(
		model.footprint.width,
		model.footprint.depth,
		model.bounds.width,
		model.bounds.depth,
	);
	const height = Math.max(model.footprint.height, model.bounds.height);
	if (height >= 3.5) {
		return "tower";
	}
	if (span >= 2.1) {
		return "large";
	}
	if (span >= 1.2) {
		return "medium";
	}
	return "compact";
}

export function summarizeCityModel(
	model: CityModelDefinition,
): CityModelUnderstanding {
	const snapClass = deriveCitySnapClass(model);
	const passabilityClass = deriveCityPassabilityClass(model.passabilityEffect);
	const structuralRole = deriveCityStructuralRole(model);
	const footprintClass = deriveCityFootprintClass(model);
	const height = Math.max(model.footprint.height, model.bounds.height);
	const heightClass = height >= 3.5 ? "tall" : height >= 1.5 ? "mid" : "low";
	const rotationPolicy =
		model.rotationSymmetry === 1
			? "locked"
			: model.rotationSymmetry === 2
				? "opposed"
				: "quarter_turn";
	const composable =
		model.compositeEligibility.length > 0 ||
		model.family === "wall" ||
		model.family === "door" ||
		model.family === "column" ||
		model.family === "roof";

	return {
		id: model.id,
		label: model.label,
		directory: getCityDirectoryPath(model),
		footprintClass,
		heightClass,
		snapClass,
		passabilityClass,
		structuralRole,
		composable,
		rotationPolicy,
		summary: `${model.family} in ${formatCitySubcategoryLabel(model.subcategory)} with ${snapClass} behavior, ${passabilityClass} passability, and ${footprintClass} footprint.`,
	};
}

export function buildCityDirectorySummaries(
	models: CityModelDefinition[] = CITY_MODELS,
) {
	const grouped = new Map<string, CityModelDefinition[]>();
	for (const model of models) {
		const directory = getCityDirectoryPath(model);
		const current = grouped.get(directory) ?? [];
		current.push(model);
		grouped.set(directory, current);
	}

	return Array.from(grouped.entries())
		.map(([directory, entries]) => {
			const understandings = entries.map(summarizeCityModel);
			return {
				directory,
				modelCount: entries.length,
				families: Array.from(
					new Set(entries.map((entry) => entry.family)),
				).sort(),
				composableCount: understandings.filter((entry) => entry.composable)
					.length,
				passabilityClasses: Array.from(
					new Set(understandings.map((entry) => entry.passabilityClass)),
				).sort(),
				snapClasses: Array.from(
					new Set(understandings.map((entry) => entry.snapClass)),
				).sort(),
			} satisfies CityDirectorySummary;
		})
		.sort((left, right) => left.directory.localeCompare(right.directory));
}

export function summarizeComposite(
	composite: CityCompositeDefinition,
	models: CityModelDefinition[] = CITY_MODELS,
): CityCompositeSummary {
	const modelLookup = new Map(models.map((model) => [model.id, model]));
	return {
		id: composite.id,
		label: composite.label,
		gameplayRole: composite.gameplayRole,
		partCount: composite.parts.length,
		families: Array.from(
			new Set(
				composite.parts
					.map((part) => modelLookup.get(part.modelId)?.family)
					.filter((family): family is CityFamily => Boolean(family)),
			),
		).sort(),
	};
}

export function summarizeScenarioSet() {
	return CITY_LAYOUT_SCENARIOS.map((scenario) => ({
		id: scenario.id,
		label: scenario.label,
		description: scenario.description,
		grid: `${scenario.gridWidth}x${scenario.gridHeight}`,
		layers: Array.from(
			new Set(scenario.placements.map((placement) => placement.layer)),
		).sort(),
		placementCount: scenario.placements.length,
	})) satisfies CityScenarioSummary[];
}

export function buildCityUnderstandingSnapshot() {
	return {
		directories: buildCityDirectorySummaries(),
		models: CITY_MODELS.map(summarizeCityModel),
		subcategories: getCityCatalogSubcategories().map(
			formatCitySubcategoryLabel,
		),
		composites: getCityComposites().map((composite) =>
			summarizeComposite(composite),
		),
		scenarios: summarizeScenarioSet(),
	};
}
