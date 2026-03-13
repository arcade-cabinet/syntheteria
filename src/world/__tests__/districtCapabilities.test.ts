import {
	getDistrictCapabilities,
	summarizeDistrictCapabilities,
} from "../districtCapabilities";

describe("districtCapabilities", () => {
	it("surfaces online substation capabilities for founded home base districts", () => {
		const capabilities = getDistrictCapabilities({
			poiType: "home_base",
			state: "founded",
		});

		expect(capabilities.map((capability) => capability.id)).toEqual([
			"relay",
			"fabrication",
			"substation",
			"storage",
			"salvage",
			"power_sink",
			"defense",
		]);
		expect(capabilities.every((capability) => capability.status === "online")).toBe(true);
		expect(summarizeDistrictCapabilities(capabilities)).toContain("Online district functions");
	});

	it("marks cult districts as hostile instead of latent", () => {
		const capabilities = getDistrictCapabilities({
			poiType: "northern_cult_site",
			state: "surveyed",
		});

		expect(capabilities.every((capability) => capability.status === "hostile")).toBe(true);
		expect(summarizeDistrictCapabilities(capabilities)).toContain("Hostile systems");
	});
});
