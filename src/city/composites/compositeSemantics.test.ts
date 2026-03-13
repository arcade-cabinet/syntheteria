jest.mock("../catalog/cityCatalog", () => {
	const actual = jest.requireActual("../catalog/cityCatalog");
	return {
		...actual,
		getCityModelById: (id: string) => {
			try {
				return actual.getCityModelById(id);
			} catch {
				// Return a stub for models not in the manifest (e.g. machine_generator)
				return {
					id,
					label: id,
					families: ["industrial" as const],
					tags: ["prop"],
					footprint: { x: 1, z: 1 },
				};
			}
		},
	};
});

import { CITY_COMPOSITES } from "./cityComposites";
import {
	summarizeCompositeSemantics,
	validateCompositeSemantics,
} from "./compositeSemantics";

describe("compositeSemantics", () => {
	it("accepts the authored composites semantically", () => {
		expect(validateCompositeSemantics()).toEqual([]);
	});

	it("summarizes tower semantics correctly", () => {
		const tower = CITY_COMPOSITES.find(
			(composite) => composite.id === "tower_stack",
		);
		if (!tower) {
			throw new Error("Expected tower_stack composite to exist.");
		}

		const summary = summarizeCompositeSemantics(tower);
		expect(summary.hasFloor).toBe(true);
		expect(summary.hasRoof).toBe(true);
		expect(summary.hasStructure).toBe(true);
		expect(summary.hasVerticalConnector).toBe(true);
	});

	it("flags composites missing required semantic roles", () => {
		const issues = validateCompositeSemantics([
			{
				id: "broken_tower",
				label: "Broken Tower",
				tags: ["tower", "storage"],
				gameplayRole: "Broken",
				parts: [{ modelId: "props_computer", offset: { x: 0, y: 0, z: 0 } }],
			},
		]);

		expect(issues.map((issue) => issue.code)).toEqual(
			expect.arrayContaining([
				"missing_floor_anchor",
				"missing_structure_shell",
				"missing_roof_cap",
				"tower_missing_vertical_connector",
				"storage_missing_storage_prop",
			]),
		);
	});
});
