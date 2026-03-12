import type {
	CityCompositeDefinition,
	CityLayoutScenario,
	CityModelDefinition,
	CityPlacementLayer,
	CityPlacementType,
} from "./types";

export interface CityConfigIssue {
	code:
		| "duplicate_model_id"
		| "duplicate_composite_id"
		| "duplicate_scenario_id"
		| "invalid_footprint"
		| "invalid_bounds"
		| "missing_zone_affinity"
		| "missing_source_asset"
		| "missing_preview_asset"
		| "unknown_model_reference"
		| "incompatible_layer"
		| "invalid_composite_role"
		| "empty_composite"
		| "duplicate_composite_part_anchor";
	message: string;
	scope: "model" | "composite" | "scenario";
	targetId: string;
}

const LAYER_COMPATIBILITY: Record<CityPlacementLayer, CityPlacementType[]> = {
	detail: ["detail", "prop", "cell"],
	floor: ["cell", "corner"],
	prop: ["prop", "cell", "detail"],
	roof: ["roof", "corner", "cell"],
	structure: ["edge", "corner", "vertical"],
};

function placementMatchesLayer(
	layer: CityPlacementLayer,
	placementType: CityPlacementType,
) {
	return LAYER_COMPATIBILITY[layer].includes(placementType);
}

export function validateCityModelDefinitions(models: CityModelDefinition[]) {
	const issues: CityConfigIssue[] = [];
	const seenIds = new Set<string>();

	for (const model of models) {
		if (seenIds.has(model.id)) {
			issues.push({
				code: "duplicate_model_id",
				message: `Model ${model.id} is duplicated in the manifest.`,
				scope: "model",
				targetId: model.id,
			});
			continue;
		}
		seenIds.add(model.id);

		if (
			model.footprint.width <= 0 ||
			model.footprint.depth <= 0 ||
			model.footprint.height <= 0
		) {
			issues.push({
				code: "invalid_footprint",
				message: `Model ${model.id} has a non-positive footprint.`,
				scope: "model",
				targetId: model.id,
			});
		}

		if (
			model.bounds.width <= 0 ||
			model.bounds.depth <= 0 ||
			model.bounds.height <= 0
		) {
			issues.push({
				code: "invalid_bounds",
				message: `Model ${model.id} has non-positive measured bounds.`,
				scope: "model",
				targetId: model.id,
			});
		}

		if (model.zoneAffinity.length === 0) {
			issues.push({
				code: "missing_zone_affinity",
				message: `Model ${model.id} is missing zone affinity metadata.`,
				scope: "model",
				targetId: model.id,
			});
		}

		if (!model.sourceAssetPath) {
			issues.push({
				code: "missing_source_asset",
				message: `Model ${model.id} is missing a source asset path.`,
				scope: "model",
				targetId: model.id,
			});
		}

		if (!model.previewAssetPath) {
			issues.push({
				code: "missing_preview_asset",
				message: `Model ${model.id} is missing a preview asset path.`,
				scope: "model",
				targetId: model.id,
			});
		}
	}

	return issues;
}

export function validateCityComposites(
	models: CityModelDefinition[],
	composites: CityCompositeDefinition[],
) {
	const issues: CityConfigIssue[] = [];
	const modelIds = new Set(models.map((model) => model.id));
	const seenIds = new Set<string>();

	for (const composite of composites) {
		if (seenIds.has(composite.id)) {
			issues.push({
				code: "duplicate_composite_id",
				message: `Composite ${composite.id} is duplicated.`,
				scope: "composite",
				targetId: composite.id,
			});
			continue;
		}
		seenIds.add(composite.id);

		if (!composite.gameplayRole.trim()) {
			issues.push({
				code: "invalid_composite_role",
				message: `Composite ${composite.id} is missing a gameplay role.`,
				scope: "composite",
				targetId: composite.id,
			});
		}

		if (composite.parts.length === 0) {
			issues.push({
				code: "empty_composite",
				message: `Composite ${composite.id} has no parts.`,
				scope: "composite",
				targetId: composite.id,
			});
		}

		const anchors = new Set<string>();

		for (const part of composite.parts) {
			if (!modelIds.has(part.modelId)) {
				issues.push({
					code: "unknown_model_reference",
					message: `Composite ${composite.id} references unknown model ${part.modelId}.`,
					scope: "composite",
					targetId: composite.id,
				});
			}

			const anchorKey = [
				part.modelId,
				part.offset.x,
				part.offset.y,
				part.offset.z,
				part.rotationQuarterTurns ?? 0,
			].join(":");
			if (anchors.has(anchorKey)) {
				issues.push({
					code: "duplicate_composite_part_anchor",
					message: `Composite ${composite.id} repeats part ${part.modelId} at the same offset/rotation.`,
					scope: "composite",
					targetId: composite.id,
				});
				continue;
			}
			anchors.add(anchorKey);
		}
	}

	return issues;
}

export function validateCityScenarios(
	models: CityModelDefinition[],
	scenarios: CityLayoutScenario[],
) {
	const issues: CityConfigIssue[] = [];
	const modelsById = new Map(models.map((model) => [model.id, model]));
	const modelIds = new Set(modelsById.keys());
	const seenIds = new Set<string>();

	for (const scenario of scenarios) {
		if (seenIds.has(scenario.id)) {
			issues.push({
				code: "duplicate_scenario_id",
				message: `Scenario ${scenario.id} is duplicated.`,
				scope: "scenario",
				targetId: scenario.id,
			});
			continue;
		}
		seenIds.add(scenario.id);

		for (const placement of scenario.placements) {
			if (!modelIds.has(placement.modelId)) {
				issues.push({
					code: "unknown_model_reference",
					message: `Scenario ${scenario.id} references unknown model ${placement.modelId}.`,
					scope: "scenario",
					targetId: scenario.id,
				});
				continue;
			}

			if (placement.layer === "composite") {
				continue;
			}

			const model = modelsById.get(placement.modelId);
			if (
				model &&
				!placementMatchesLayer(placement.layer, model.placementType)
			) {
				issues.push({
					code: "incompatible_layer",
					message: `Scenario ${scenario.id} places model ${placement.modelId} on incompatible layer ${placement.layer}.`,
					scope: "scenario",
					targetId: scenario.id,
				});
			}
		}
	}

	return issues;
}

export function validateCityConfigSet(args: {
	composites: CityCompositeDefinition[];
	models: CityModelDefinition[];
	scenarios: CityLayoutScenario[];
}) {
	return [
		...validateCityModelDefinitions(args.models),
		...validateCityComposites(args.models, args.composites),
		...validateCityScenarios(args.models, args.scenarios),
	];
}
