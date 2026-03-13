import {
	getDistrictStructures,
	summarizeDistrictStructures,
} from "../districtStructures";

describe("districtStructures", () => {
	it("builds online player substation structure sets for founded home base districts", () => {
		const structures = getDistrictStructures({
			poiType: "home_base",
			state: "founded",
		});

		expect(structures.map((structure) => structure.id)).toEqual([
			"substation_core",
			"relay_spine",
			"storage_block",
			"fabrication_block",
			"power_sink_array",
			"defensive_gate",
		]);
		expect(structures.every((structure) => structure.status === "online")).toBe(
			true,
		);
		expect(summarizeDistrictStructures(structures)).toContain(
			"Online structures",
		);
	});

	it("builds hostile cult structure sets for cult wards", () => {
		const structures = getDistrictStructures({
			poiType: "northern_cult_site",
			state: "surveyed",
		});

		expect(
			structures.every((structure) => structure.status === "hostile"),
		).toBe(true);
		expect(structures.map((structure) => structure.id)).toContain(
			"cult_incursion_structure",
		);
		expect(summarizeDistrictStructures(structures)).toContain(
			"Hostile structures",
		);
	});
});
