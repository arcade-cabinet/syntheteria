import { getCityComposites, getCityModelById } from "../catalog/cityCatalog";
import type {
	CityCompositeDefinition,
	CityFamily,
	CityModelDefinition,
} from "../config/types";

export interface CityCompositeSemanticIssue {
	code:
		| "missing_floor_anchor"
		| "missing_structure_shell"
		| "missing_roof_cap"
		| "tower_missing_vertical_connector"
		| "storage_missing_storage_prop"
		| "fabrication_missing_work_prop";
	compositeId: string;
	message: string;
}

export interface CityCompositeSemanticSummary {
	id: string;
	label: string;
	families: CityFamily[];
	hasFloor: boolean;
	hasRoof: boolean;
	hasStructure: boolean;
	hasVerticalConnector: boolean;
	propTags: string[];
}

function getCompositeModels(composite: CityCompositeDefinition) {
	return composite.parts
		.map((part) => getCityModelById(part.modelId))
		.filter((model): model is CityModelDefinition => model !== null);
}

export function summarizeCompositeSemantics(
	composite: CityCompositeDefinition,
): CityCompositeSemanticSummary {
	const models = getCompositeModels(composite);
	return {
		id: composite.id,
		label: composite.label,
		families: Array.from(new Set(models.map((model) => model.family))).sort(),
		hasFloor: models.some((model) => model.family === "floor"),
		hasRoof: models.some((model) => model.family === "roof"),
		hasStructure: models.some((model) =>
			["wall", "door", "column"].includes(model.family),
		),
		hasVerticalConnector: models.some(
			(model) =>
				["stair", "column"].includes(model.family) ||
				model.passabilityEffect === "vertical_connector",
		),
		propTags: Array.from(
			new Set(models.flatMap((model) => model.tags.filter(Boolean))),
		).sort(),
	};
}

export function validateCompositeSemantics(
	composites: CityCompositeDefinition[] = getCityComposites(),
) {
	const issues: CityCompositeSemanticIssue[] = [];

	for (const composite of composites) {
		const isOverworld = composite.tags.includes("overworld");
		const summary = summarizeCompositeSemantics(composite);
		if (!isOverworld && !summary.hasFloor) {
			issues.push({
				code: "missing_floor_anchor",
				compositeId: composite.id,
				message: `Composite ${composite.id} has no floor anchor.`,
			});
		}
		if (
			!isOverworld &&
			(composite.tags.includes("tower") ||
				composite.tags.includes("service") ||
				composite.tags.includes("storage")) &&
			!summary.hasStructure
		) {
			issues.push({
				code: "missing_structure_shell",
				compositeId: composite.id,
				message: `Composite ${composite.id} has no enclosing structural family.`,
			});
		}
		if (!isOverworld && !summary.hasRoof) {
			issues.push({
				code: "missing_roof_cap",
				compositeId: composite.id,
				message: `Composite ${composite.id} has no roof cap.`,
			});
		}
		if (composite.tags.includes("tower") && !summary.hasVerticalConnector) {
			issues.push({
				code: "tower_missing_vertical_connector",
				compositeId: composite.id,
				message: `Tower composite ${composite.id} lacks a stair or vertical connector.`,
			});
		}
		if (
			composite.tags.includes("storage") &&
			!summary.propTags.some((tag) =>
				["container", "crate", "shelf", "cargo", "storage_prop"].includes(tag),
			)
		) {
			issues.push({
				code: "storage_missing_storage_prop",
				compositeId: composite.id,
				message: `Storage composite ${composite.id} lacks cargo/storage props.`,
			});
		}
		if (
			(composite.tags.includes("workshop") ||
				(composite.tags.includes("fabrication") &&
					!composite.tags.includes("service"))) &&
			!summary.propTags.some((tag) =>
				["computer", "teleporter", "workshop", "console", "operator_prop", "teleport"].includes(tag),
			)
		) {
			issues.push({
				code: "fabrication_missing_work_prop",
				compositeId: composite.id,
				message: `Fabrication composite ${composite.id} lacks compute or fabrication props.`,
			});
		}
	}

	return issues;
}
