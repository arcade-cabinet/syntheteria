import { getVisionRadius } from "./exploration";

describe("exploration — vision radius", () => {
	it("returns base radius (6) for non-scout units", () => {
		expect(getVisionRadius("maintenance_bot")).toBe(6);
		expect(getVisionRadius("field_fighter")).toBe(6);
		expect(getVisionRadius("mecha_golem")).toBe(6);
		expect(getVisionRadius("utility_drone")).toBe(6);
		expect(getVisionRadius("fabrication_unit")).toBe(6);
	});

	it("returns 2x radius (12) for scout units", () => {
		expect(getVisionRadius("mecha_scout")).toBe(12);
	});

	it("returns base radius for hostile units", () => {
		expect(getVisionRadius("feral_drone")).toBe(6);
		expect(getVisionRadius("mecha_trooper")).toBe(6);
		expect(getVisionRadius("quadruped_tank")).toBe(6);
	});

	it("returns base radius for null/undefined unit types", () => {
		expect(getVisionRadius(null)).toBe(6);
		expect(getVisionRadius(undefined)).toBe(6);
	});
});
