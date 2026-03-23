import type { CityLayoutScenario } from "../config/types";
import {
	resolveCityPlacement,
	resolveCityScenarioPlacements,
} from "./layoutResolution";

describe("layoutResolution", () => {
	const scenario: CityLayoutScenario = {
		id: "resolution_test",
		label: "Resolution Test",
		description: "Minimal scenario for deterministic placement resolution.",
		gridWidth: 4,
		gridHeight: 4,
		cellSize: 2,
		placements: [
			{
				modelId: "floortile_basic",
				cellX: 1,
				cellY: 1,
				layer: "floor",
				rotationQuarterTurns: 0,
			},
			{
				modelId: "walls_wall_1",
				cellX: 1,
				cellY: 1,
				layer: "structure",
				edge: "east",
				rotationQuarterTurns: 1,
			},
			{
				modelId: "props_computer",
				cellX: 2,
				cellY: 2,
				layer: "prop",
				rotationQuarterTurns: 3,
			},
		],
	};

	it("resolves center-cell floor placement to scene coordinates", () => {
		const placement = resolveCityPlacement(scenario, scenario.placements[0]!);
		expect(placement).toMatchObject({
			modelId: "floortile_basic",
			position: { x: -1, y: 0, z: -1 },
			targetSpan: 1.76,
		});
	});

	it("applies edge offsets and structure span rules", () => {
		const placement = resolveCityPlacement(scenario, scenario.placements[1]!);
		expect(placement).toMatchObject({
			modelId: "walls_wall_1",
			position: { x: -0.040000000000000036, y: 0, z: -1 },
			targetSpan: 1.64,
		});
		expect(placement?.rotationY).toBeCloseTo(Math.PI / 2);
	});

	it("filters unknown models when resolving full scenarios", () => {
		const placements = resolveCityScenarioPlacements({
			...scenario,
			placements: [
				...scenario.placements,
				{
					modelId: "missing_model",
					cellX: 0,
					cellY: 0,
					layer: "detail",
					rotationQuarterTurns: 0,
				},
			],
		});

		expect(placements).toHaveLength(3);
		expect(placements.map((placement) => placement.modelId)).not.toContain(
			"missing_model",
		);
	});
});
