import {
	createDefaultCityKitLabFilterState,
	formatCitySubcategoryLabel,
	getCityKitLabFilterOptions,
	getCityKitLabViewModel,
} from "./cityKitLabState";

describe("cityKitLabState", () => {
	it("creates a stable default filter state", () => {
		expect(createDefaultCityKitLabFilterState()).toEqual({
			compositableOnly: false,
			family: "all",
			placementType: "all",
			subcategory: "all",
		});
	});

	it("exposes filter options derived from package data", () => {
		const options = getCityKitLabFilterOptions();
		expect(options.familyFilters).toContain("wall");
		expect(options.placementFilters).toContain("edge");
		expect(options.subcategories[0]).toBe("all");
	});

	it("builds a view model with filtered models and summaries", () => {
		const viewModel = getCityKitLabViewModel({
			compositableOnly: true,
			family: "wall",
			placementType: "edge",
			subcategory: "all",
		});
		expect(viewModel.models.length).toBeGreaterThan(0);
		expect(viewModel.models.every((model) => model.family === "wall")).toBe(
			true,
		);
		expect(viewModel.directorySummaries.length).toBeGreaterThan(0);
		expect(viewModel.composites.length).toBeGreaterThan(0);
		expect(viewModel.scenarios.length).toBeGreaterThan(0);
	});

	it("formats subcategory labels for UI consumption", () => {
		expect(formatCitySubcategoryLabel("city/Walls")).toBe("Walls");
		expect(formatCitySubcategoryLabel("city/foo/bar")).toBe("foo / bar");
	});
});
