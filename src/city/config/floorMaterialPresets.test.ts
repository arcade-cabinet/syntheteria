import {
	FLOOR_MATERIAL_PRESETS,
	getDefaultFloorMaterialForZone,
	getFloorMaterialsForZone,
} from "./floorMaterialPresets";

describe("floorMaterialPresets", () => {
	it("provides curated photorealistic floor candidates", () => {
		expect(FLOOR_MATERIAL_PRESETS.length).toBeGreaterThan(0);
		expect(FLOOR_MATERIAL_PRESETS.some((preset) => preset.baseFamily === "concrete")).toBe(true);
		expect(
			FLOOR_MATERIAL_PRESETS.some(
				(preset) => preset.baseFamily === "diamond_plate",
			),
		).toBe(true);
	});

	it("returns zone-specific floor options", () => {
		expect(getFloorMaterialsForZone("fabrication").length).toBeGreaterThan(0);
		expect(getDefaultFloorMaterialForZone("corridor")?.id).toBeTruthy();
	});
});
