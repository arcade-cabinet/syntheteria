// Mock all .jpg imports so Jest doesn't try to parse binary files.
jest.mock(
	"../../../assets/materials/floors/command_core/ao.jpg",
	() => "/mock/command_core/ao.jpg",
);
jest.mock(
	"../../../assets/materials/floors/command_core/color.jpg",
	() => "/mock/command_core/color.jpg",
);
jest.mock(
	"../../../assets/materials/floors/command_core/height.jpg",
	() => "/mock/command_core/height.jpg",
);
jest.mock(
	"../../../assets/materials/floors/command_core/normal.jpg",
	() => "/mock/command_core/normal.jpg",
);
jest.mock(
	"../../../assets/materials/floors/command_core/roughness.jpg",
	() => "/mock/command_core/roughness.jpg",
);
jest.mock(
	"../../../assets/materials/floors/corridor_transit/color.jpg",
	() => "/mock/corridor_transit/color.jpg",
);
jest.mock(
	"../../../assets/materials/floors/corridor_transit/height.jpg",
	() => "/mock/corridor_transit/height.jpg",
);
jest.mock(
	"../../../assets/materials/floors/corridor_transit/normal.jpg",
	() => "/mock/corridor_transit/normal.jpg",
);
jest.mock(
	"../../../assets/materials/floors/corridor_transit/roughness.jpg",
	() => "/mock/corridor_transit/roughness.jpg",
);
jest.mock(
	"../../../assets/materials/floors/fabrication/ao.jpg",
	() => "/mock/fabrication/ao.jpg",
);
jest.mock(
	"../../../assets/materials/floors/fabrication/color.jpg",
	() => "/mock/fabrication/color.jpg",
);
jest.mock(
	"../../../assets/materials/floors/fabrication/height.jpg",
	() => "/mock/fabrication/height.jpg",
);
jest.mock(
	"../../../assets/materials/floors/fabrication/normal.jpg",
	() => "/mock/fabrication/normal.jpg",
);
jest.mock(
	"../../../assets/materials/floors/fabrication/roughness.jpg",
	() => "/mock/fabrication/roughness.jpg",
);
jest.mock(
	"../../../assets/materials/floors/habitation/ao.jpg",
	() => "/mock/habitation/ao.jpg",
);
jest.mock(
	"../../../assets/materials/floors/habitation/color.jpg",
	() => "/mock/habitation/color.jpg",
);
jest.mock(
	"../../../assets/materials/floors/habitation/height.jpg",
	() => "/mock/habitation/height.jpg",
);
jest.mock(
	"../../../assets/materials/floors/habitation/normal.jpg",
	() => "/mock/habitation/normal.jpg",
);
jest.mock(
	"../../../assets/materials/floors/habitation/roughness.jpg",
	() => "/mock/habitation/roughness.jpg",
);

import {
	FLOOR_MATERIAL_PRESETS,
	getDefaultFloorMaterialForZone,
	getFloorMaterialsForZone,
} from "./floorMaterialPresets";

describe("floorMaterialPresets", () => {
	it("provides curated photorealistic floor candidates", () => {
		expect(FLOOR_MATERIAL_PRESETS.length).toBeGreaterThan(0);
		expect(
			FLOOR_MATERIAL_PRESETS.some((preset) => preset.baseFamily === "concrete"),
		).toBe(true);
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

	it("every preset has required texture channels", () => {
		for (const preset of FLOOR_MATERIAL_PRESETS) {
			expect(preset.textureSet.color).toBeDefined();
			expect(preset.textureSet.normal).toBeDefined();
			expect(preset.textureSet.roughness).toBeDefined();
		}
	});

	it("every preset has at least one zone affinity", () => {
		for (const preset of FLOOR_MATERIAL_PRESETS) {
			expect(preset.zoneAffinity.length).toBeGreaterThan(0);
		}
	});
});
