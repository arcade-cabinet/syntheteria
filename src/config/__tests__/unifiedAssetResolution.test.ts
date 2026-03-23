jest.mock("expo-asset", () => ({
	Asset: {
		fromModule: (mod: string | number) => ({
			uri: typeof mod === "string" ? mod : `/resolved/${mod}`,
			localUri: null,
		}),
	},
}));

import fs from "fs";
import path from "path";
import { resolveAssetUri } from "../assetUri";
import { modelAssets } from "../modelAssets";
import { uiBrandAssets } from "../uiBrandAssets";
import { uiMenuAssets } from "../uiMenuAssets";
import unitsConfigJson from "../units.json";

const unitsConfig = unitsConfigJson as Record<string, { model: string }>;

describe("resolveAssetUri", () => {
	it("passes through string assets unchanged", () => {
		expect(resolveAssetUri("https://example.com/foo.png")).toBe(
			"https://example.com/foo.png",
		);
	});

	it("passes through relative path strings unchanged", () => {
		expect(resolveAssetUri("assets/ui/background.png")).toBe(
			"assets/ui/background.png",
		);
	});

	it("resolves numeric module IDs via expo-asset", () => {
		expect(resolveAssetUri(42)).toBe("/resolved/42");
	});
});

describe("unified asset resolution — UI brand assets", () => {
	it("background has a resolvable imageAsset", () => {
		const asset = uiBrandAssets.background.imageAsset;
		expect(asset).toBeDefined();
		expect(typeof resolveAssetUri(asset)).toBe("string");
	});

	it("mark has a resolvable imageAsset", () => {
		const asset = uiBrandAssets.mark.imageAsset;
		expect(asset).toBeDefined();
		expect(typeof resolveAssetUri(asset)).toBe("string");
	});

	it("logos atlas has a resolvable imageAsset", () => {
		const asset = uiBrandAssets.logos.imageAsset;
		expect(asset).toBeDefined();
		expect(typeof resolveAssetUri(asset)).toBe("string");
	});

	it("logos atlas defines four regions", () => {
		expect(uiBrandAssets.logos.regions).toHaveLength(4);
		const regionIds = uiBrandAssets.logos.regions.map((r) => r.id);
		expect(regionIds).toEqual(
			expect.arrayContaining(["brand_mark", "wordmark", "lockup", "app_icon"]),
		);
	});
});

describe("unified asset resolution — UI menu button assets", () => {
	const buttonIds = ["new_game", "load_game", "settings"] as const;

	for (const buttonId of buttonIds) {
		it(`${buttonId} has a resolvable imageAsset`, () => {
			const asset = uiMenuAssets[buttonId].imageAsset;
			expect(asset).toBeDefined();
			expect(typeof resolveAssetUri(asset)).toBe("string");
		});
	}

	it("every menu button has positive dimensions", () => {
		for (const buttonId of buttonIds) {
			const button = uiMenuAssets[buttonId];
			expect(button.width).toBeGreaterThan(0);
			expect(button.height).toBeGreaterThan(0);
		}
	});
});

describe("unified asset resolution — 3D model assets", () => {
	it("every model in units.json resolves through modelAssets", () => {
		for (const [, config] of Object.entries(unitsConfig)) {
			const modelKey = config.model;
			expect(modelAssets[modelKey]).toBeDefined();
			const uri = resolveAssetUri(modelAssets[modelKey]);
			expect(typeof uri).toBe("string");
		}
	});

	it("every unit model key exists in the modelAssets registry", () => {
		for (const [, config] of Object.entries(unitsConfig)) {
			expect(config.model in modelAssets).toBe(true);
		}
	});
});

describe("no hardcoded asset paths in source files", () => {
	it("TitleScreen does not use direct asset imports for background", () => {
		// This test documents the architectural constraint:
		// TitleScreen.tsx must NOT import directly from ../../assets/ui/background.png.
		// The current TitleScreen uses a live 3D Canvas scene (TitleMenuScene) instead
		// of a static image background. If it were to revert to image-based backgrounds,
		// it should route through uiBrandAssets.background.imageAsset + resolveAssetUri.
		const titleScreenPath = path.resolve(__dirname, "../../ui/TitleScreen.tsx");
		const content = fs.readFileSync(titleScreenPath, "utf-8");

		// Should NOT have a direct asset import for background
		expect(content).not.toMatch(
			/import\s+\w+\s+from\s+["'].*assets\/ui\/background\.png["']/,
		);
	});
});
