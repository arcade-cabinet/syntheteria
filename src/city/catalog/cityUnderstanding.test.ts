import { CITY_MODELS } from "./cityCatalog";
import {
	buildCityDirectorySummaries,
	buildCityUnderstandingSnapshot,
	deriveCityFootprintClass,
	deriveCitySnapClass,
	summarizeCityModel,
} from "./cityUnderstanding";

describe("cityUnderstanding", () => {
	it("classifies snap behavior for core families", () => {
		const floor = CITY_MODELS.find((model) => model.family === "floor");
		const wall = CITY_MODELS.find((model) => model.family === "wall");
		const door = CITY_MODELS.find((model) => model.family === "door");
		const stair = CITY_MODELS.find((model) => model.family === "stair");

		expect(floor && deriveCitySnapClass(floor)).toBe("floor_cell");
		expect(wall && deriveCitySnapClass(wall)).toBe("edge_wall");
		expect(door && deriveCitySnapClass(door)).toBe("portal_edge");
		expect(stair && deriveCitySnapClass(stair)).toBe("vertical_connector");
	});

	it("derives footprint classes from model bounds and height", () => {
		expect(
			deriveCityFootprintClass({
				footprint: { width: 0.8, depth: 0.8, height: 1 },
				bounds: { width: 0.8, depth: 0.8, height: 1 },
			}),
		).toBe("compact");
		expect(
			deriveCityFootprintClass({
				footprint: { width: 1.5, depth: 1.3, height: 1.2 },
				bounds: { width: 1.5, depth: 1.3, height: 1.2 },
			}),
		).toBe("medium");
		expect(
			deriveCityFootprintClass({
				footprint: { width: 2.4, depth: 2.1, height: 1.4 },
				bounds: { width: 2.4, depth: 2.1, height: 1.4 },
			}),
		).toBe("large");
		expect(
			deriveCityFootprintClass({
				footprint: { width: 1.2, depth: 1.2, height: 4.4 },
				bounds: { width: 1.2, depth: 1.2, height: 4.4 },
			}),
		).toBe("tower");
	});

	it("builds directory summaries for all city kit subdirectories", () => {
		const summaries = buildCityDirectorySummaries();
		expect(summaries.map((summary) => summary.directory)).toEqual([
			".",
			"Details",
			"Walls",
		]);
		expect(
			summaries.find((summary) => summary.directory === "Walls")?.families,
		).toContain("wall");
	});

	it("produces a full understanding snapshot for downstream tooling", () => {
		const firstModel = CITY_MODELS[0];
		if (!firstModel) {
			throw new Error("Expected city model manifest to be populated.");
		}

		const snapshot = buildCityUnderstandingSnapshot();
		expect(snapshot.models).toHaveLength(CITY_MODELS.length);
		expect(snapshot.composites.length).toBeGreaterThan(0);
		expect(snapshot.scenarios.length).toBeGreaterThan(0);
		expect(summarizeCityModel(firstModel).summary).toContain(firstModel.family);
	});
});
