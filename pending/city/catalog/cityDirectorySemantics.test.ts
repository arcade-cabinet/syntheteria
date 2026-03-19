import {
	CITY_DIRECTORY_SEMANTICS,
	getCityDirectorySemantics,
	validateCityDirectoryCoverage,
} from "./cityDirectorySemantics";

describe("cityDirectorySemantics", () => {
	it("covers every discovered city kit directory", () => {
		expect(validateCityDirectoryCoverage()).toBe(true);
	});

	it("defines the expected semantic roles for key directories", () => {
		expect(CITY_DIRECTORY_SEMANTICS).toHaveLength(3);
		expect(getCityDirectorySemantics(".")?.defaultPassabilityExpectation).toBe(
			"mixed",
		);
		expect(
			getCityDirectorySemantics("Walls")?.defaultPassabilityExpectation,
		).toBe("impassable");
		expect(
			getCityDirectorySemantics("Details")?.defaultPassabilityExpectation,
		).toBe("support");
	});
});
