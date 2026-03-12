import {
	CITY_MODELS,
	filterCityModels,
	getCityCatalogSubcategories,
	getCityComposites,
	getDeferredCitySubset,
	getPlayableCitySubset,
} from "./cityCatalog";
import { cityModelManifest } from "../../config/generated/cityModelManifest";
import { CITY_MODEL_SEMANTICS } from "../config/cityModelSemantics";

describe("city catalog", () => {
	it("covers the full copied city kit", () => {
		expect(CITY_MODELS).toHaveLength(91);
		expect(getCityCatalogSubcategories()).toEqual(
			expect.arrayContaining(["Details", "Walls", "floor"]),
		);
	});

	it("requires explicit authored semantics for every generated model id", () => {
		const manifestIds = cityModelManifest.models.map((model) => model.id).sort();
		const semanticIds = Object.keys(CITY_MODEL_SEMANTICS).sort();
		expect(semanticIds).toEqual(manifestIds);
	});

	it("supports family and placement filtering", () => {
		expect(filterCityModels({ family: "wall" }).length).toBeGreaterThan(0);
		expect(filterCityModels({ placementType: "edge" }).length).toBeGreaterThan(
			0,
		);
		expect(
			filterCityModels({ family: "prop", compositableOnly: true }).length,
		).toBeGreaterThan(0);
	});

	it("defines playable and deferred subsets against the same source kit", () => {
		expect(getPlayableCitySubset().length).toBeGreaterThan(0);
		expect(getDeferredCitySubset().length).toBeGreaterThan(0);
		expect(
			getPlayableCitySubset().length + getDeferredCitySubset().length,
		).toBe(CITY_MODELS.length);
	});

	it("keeps composite definitions bound to real model ids", () => {
		const modelIds = new Set(CITY_MODELS.map((model) => model.id));
		for (const composite of getCityComposites()) {
			for (const part of composite.parts) {
				expect(modelIds.has(part.modelId)).toBe(true);
			}
		}
	});
});
