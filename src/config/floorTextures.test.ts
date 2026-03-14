jest.mock("expo-asset", () => ({
	Asset: {
		fromModule: (mod: string | number) => ({
			uri: typeof mod === "string" ? mod : `/resolved/${mod}`,
			localUri: null,
		}),
	},
}));

// Mock all .jpg imports so Jest doesn't try to parse binary files.
// In the real Metro bundle, these resolve to AssetModule (string | number).
jest.mock(
	"../../assets/materials/floors/command_core/ao.jpg",
	() => "/mock/command_core/ao.jpg",
);
jest.mock(
	"../../assets/materials/floors/command_core/color.jpg",
	() => "/mock/command_core/color.jpg",
);
jest.mock(
	"../../assets/materials/floors/command_core/height.jpg",
	() => "/mock/command_core/height.jpg",
);
jest.mock(
	"../../assets/materials/floors/command_core/normal.jpg",
	() => "/mock/command_core/normal.jpg",
);
jest.mock(
	"../../assets/materials/floors/command_core/roughness.jpg",
	() => "/mock/command_core/roughness.jpg",
);
jest.mock(
	"../../assets/materials/floors/corridor_transit/color.jpg",
	() => "/mock/corridor_transit/color.jpg",
);
jest.mock(
	"../../assets/materials/floors/corridor_transit/height.jpg",
	() => "/mock/corridor_transit/height.jpg",
);
jest.mock(
	"../../assets/materials/floors/corridor_transit/normal.jpg",
	() => "/mock/corridor_transit/normal.jpg",
);
jest.mock(
	"../../assets/materials/floors/corridor_transit/roughness.jpg",
	() => "/mock/corridor_transit/roughness.jpg",
);
jest.mock(
	"../../assets/materials/floors/fabrication/ao.jpg",
	() => "/mock/fabrication/ao.jpg",
);
jest.mock(
	"../../assets/materials/floors/fabrication/color.jpg",
	() => "/mock/fabrication/color.jpg",
);
jest.mock(
	"../../assets/materials/floors/fabrication/height.jpg",
	() => "/mock/fabrication/height.jpg",
);
jest.mock(
	"../../assets/materials/floors/fabrication/normal.jpg",
	() => "/mock/fabrication/normal.jpg",
);
jest.mock(
	"../../assets/materials/floors/fabrication/roughness.jpg",
	() => "/mock/fabrication/roughness.jpg",
);
jest.mock(
	"../../assets/materials/floors/habitation/ao.jpg",
	() => "/mock/habitation/ao.jpg",
);
jest.mock(
	"../../assets/materials/floors/habitation/color.jpg",
	() => "/mock/habitation/color.jpg",
);
jest.mock(
	"../../assets/materials/floors/habitation/height.jpg",
	() => "/mock/habitation/height.jpg",
);
jest.mock(
	"../../assets/materials/floors/habitation/normal.jpg",
	() => "/mock/habitation/normal.jpg",
);
jest.mock(
	"../../assets/materials/floors/habitation/roughness.jpg",
	() => "/mock/habitation/roughness.jpg",
);

import { resolveAssetUri } from "./assetUri";
import {
	type FloorZoneId,
	floorTextureAssets,
	floorZoneIds,
	getFloorTextureSet,
	getFloorZoneLabel,
} from "./floorTextureAssets";
import floorTexturesConfig from "./floorTextures.json";

describe("floorTextures.json config", () => {
	const configZoneIds = Object.keys(floorTexturesConfig.zones);

	it("JSON config zones match exported floorZoneIds", () => {
		expect(floorZoneIds.sort()).toEqual(configZoneIds.sort());
	});

	it("every JSON-defined zone has a corresponding asset entry", () => {
		for (const zoneId of configZoneIds) {
			expect(floorTextureAssets[zoneId as FloorZoneId]).toBeDefined();
		}
	});

	it("every zone has required color, normal, roughness textures", () => {
		for (const zoneId of floorZoneIds) {
			const textureSet = floorTextureAssets[zoneId];
			expect(textureSet.color).toBeDefined();
			expect(textureSet.normal).toBeDefined();
			expect(textureSet.roughness).toBeDefined();
		}
	});

	it("all JSON texture keys resolve to asset entries for each zone", () => {
		const requiredKeys = ["color", "normal", "roughness"] as const;
		for (const zoneId of floorZoneIds) {
			const zoneConfig = Object.entries(floorTexturesConfig.zones).find(
				([id]) => id === zoneId,
			)?.[1];
			expect(zoneConfig).toBeDefined();
			const assetSet = floorTextureAssets[zoneId];
			for (const key of requiredKeys) {
				expect(zoneConfig!.textures[key]).toBeDefined();
				expect(assetSet[key]).toBeDefined();
			}
			const textures = zoneConfig!.textures as Record<string, string>;
			for (const key of ["ao", "height"]) {
				if (key in textures && textures[key]) {
					expect(assetSet[key as keyof typeof assetSet]).toBeDefined();
				}
			}
		}
	});

	it("all texture assets resolve to valid URIs via resolveAssetUri", () => {
		for (const zoneId of floorZoneIds) {
			const textureSet = floorTextureAssets[zoneId];

			const colorUri = resolveAssetUri(textureSet.color);
			expect(typeof colorUri).toBe("string");
			expect(colorUri.length).toBeGreaterThan(0);

			const normalUri = resolveAssetUri(textureSet.normal);
			expect(typeof normalUri).toBe("string");
			expect(normalUri.length).toBeGreaterThan(0);

			const roughnessUri = resolveAssetUri(textureSet.roughness);
			expect(typeof roughnessUri).toBe("string");
			expect(roughnessUri.length).toBeGreaterThan(0);

			if (textureSet.ao) {
				const aoUri = resolveAssetUri(textureSet.ao);
				expect(typeof aoUri).toBe("string");
				expect(aoUri.length).toBeGreaterThan(0);
			}

			if (textureSet.height) {
				const heightUri = resolveAssetUri(textureSet.height);
				expect(typeof heightUri).toBe("string");
				expect(heightUri.length).toBeGreaterThan(0);
			}
		}
	});

	it("every zone has a label in the JSON config", () => {
		for (const zoneId of floorZoneIds) {
			const label = getFloorZoneLabel(zoneId);
			expect(typeof label).toBe("string");
			expect(label.length).toBeGreaterThan(0);
		}
	});

	it("getFloorTextureSet throws for unknown zone", () => {
		expect(() => getFloorTextureSet("nonexistent_zone")).toThrow(
			/No floor texture set configured for zone/,
		);
	});
});
