import { CITY_MODELS, getCityComposites } from "../catalog/cityCatalog";
import { CITY_LAYOUT_SCENARIOS } from "../grammar/cityScenarios";
import {
	validateCityConfigSet,
	validateCityModelDefinitions,
	validateCityScenarios,
} from "./cityConfigValidation";

describe("cityConfigValidation", () => {
	it("accepts the current city model/composite/scenario set", () => {
		expect(
			validateCityConfigSet({
				models: CITY_MODELS,
				composites: getCityComposites(),
				scenarios: CITY_LAYOUT_SCENARIOS,
			}),
		).toEqual([]);
	});

	it("flags duplicate model ids and invalid footprint metadata", () => {
		const [model] = CITY_MODELS;
		if (!model) {
			throw new Error("Expected at least one city model for validation test.");
		}

		const issues = validateCityModelDefinitions([
			model,
			{
				...model,
				id: `${model.id}_invalid`,
				footprint: { width: 0, depth: model.footprint.depth, height: 0 },
			},
			{
				...model,
			},
		]);

		expect(issues.map((issue) => issue.code)).toEqual(
			expect.arrayContaining(["duplicate_model_id", "invalid_footprint"]),
		);
	});

	it("flags incompatible scenario layer usage", () => {
		const [floor] = CITY_MODELS.filter((model) => model.family === "floor");
		if (!floor) {
			throw new Error("Expected at least one floor model for validation test.");
		}

		const issues = validateCityScenarios(CITY_MODELS, [
			{
				id: "invalid_layer",
				label: "Invalid Layer",
				description: "Places floor geometry on structure layer.",
				gridWidth: 1,
				gridHeight: 1,
				cellSize: 2,
				placements: [
					{
						modelId: floor.id,
						cellX: 0,
						cellY: 0,
						layer: "structure",
						rotationQuarterTurns: 0,
					},
				],
			},
		]);

		expect(issues.map((issue) => issue.code)).toContain("incompatible_layer");
	});

	it("flags empty and duplicate-anchored composites", () => {
		const [model] = CITY_MODELS;
		if (!model) {
			throw new Error("Expected city model manifest to be populated.");
		}

		const issues = validateCityConfigSet({
			models: CITY_MODELS,
			composites: [
				{
					id: "empty",
					label: "Empty",
					tags: [],
					gameplayRole: " ",
					parts: [],
				},
				{
					id: "duplicate_anchor",
					label: "Duplicate Anchor",
					tags: [],
					gameplayRole: "Test composite",
					parts: [
						{ modelId: model.id, offset: { x: 0, y: 0, z: 0 } },
						{ modelId: model.id, offset: { x: 0, y: 0, z: 0 } },
					],
				},
			],
			scenarios: [],
		});

		expect(issues.map((issue) => issue.code)).toEqual(
			expect.arrayContaining([
				"invalid_composite_role",
				"empty_composite",
				"duplicate_composite_part_anchor",
			]),
		);
	});
});
