jest.mock("expo-asset", () => ({
	Asset: {
		fromModule: (mod: string | number) => ({
			uri: typeof mod === "string" ? mod : `/resolved/${mod}`,
			localUri: null,
		}),
	},
}));

import {
	collectAllAssetEntries,
	getSkipAssetValidation,
	setSkipAssetValidation,
	validateAssetManifest,
} from "../assetValidation";
import { modelAssets } from "../modelAssets";

afterEach(() => {
	setSkipAssetValidation(false);
});

describe("collectAllAssetEntries", () => {
	it("returns a non-empty array of asset entries", () => {
		const entries = collectAllAssetEntries();
		expect(entries.length).toBeGreaterThan(0);
	});

	it("includes modelAssets entries", () => {
		const entries = collectAllAssetEntries();
		const modelEntries = entries.filter((e) =>
			e.source.startsWith("modelAssets"),
		);
		expect(modelEntries.length).toBeGreaterThan(0);
	});

	it("includes uiMenuAssets entries", () => {
		const entries = collectAllAssetEntries();
		const menuEntries = entries.filter((e) =>
			e.source.startsWith("uiMenuAssets"),
		);
		expect(menuEntries.length).toBe(3);
	});

	it("includes uiBrandAssets entries", () => {
		const entries = collectAllAssetEntries();
		const brandEntries = entries.filter((e) =>
			e.source.startsWith("uiBrandAssets"),
		);
		expect(brandEntries.length).toBe(3);
	});

	it("includes floorTextures.json entries", () => {
		const entries = collectAllAssetEntries();
		const floorEntries = entries.filter((e) =>
			e.source.startsWith("floorTextures.json"),
		);
		expect(floorEntries.length).toBeGreaterThan(0);
	});

	it("includes units.json cross-reference entries", () => {
		const entries = collectAllAssetEntries();
		const unitEntries = entries.filter((e) =>
			e.source.startsWith("units.json"),
		);
		expect(unitEntries.length).toBeGreaterThan(0);
	});
});

describe("validateAssetManifest", () => {
	it("passes validation with complete assets (mocked)", () => {
		// With the jest fileAssetMock returning "asset-mock" for all imports,
		// every AssetModule is a non-empty string, so resolveAssetUri succeeds.
		expect(() => validateAssetManifest()).not.toThrow();
	});

	it("respects the skip flag — validation is bypassed", () => {
		setSkipAssetValidation(true);
		expect(getSkipAssetValidation()).toBe(true);
		// Even if we were to break something, it should not throw
		expect(() => validateAssetManifest()).not.toThrow();
	});

	it("skip flag defaults to false", () => {
		expect(getSkipAssetValidation()).toBe(false);
	});
});

describe("validateAssetManifest — failure cases", () => {
	// Save original modelAssets to restore after mutation
	const savedAssets: Record<string, unknown> = {};

	beforeEach(() => {
		Object.assign(savedAssets, modelAssets);
	});

	afterEach(() => {
		// Remove injected keys
		for (const key of Object.keys(modelAssets)) {
			if (!(key in savedAssets)) {
				delete modelAssets[key];
			}
		}
		// Restore originals
		Object.assign(modelAssets, savedAssets);
	});

	it("throws listing ALL missing assets, not just the first", () => {
		// Inject two broken entries — empty strings trigger resolveAssetUri's throw
		modelAssets["BrokenModel_A.glb"] = "";
		modelAssets["BrokenModel_B.glb"] = "";

		expect(() => validateAssetManifest()).toThrow(
			/Asset manifest validation failed/,
		);

		try {
			validateAssetManifest();
		} catch (err) {
			const message = (err as Error).message;
			expect(message).toContain("BrokenModel_A.glb");
			expect(message).toContain("BrokenModel_B.glb");
			// Should report the count
			expect(message).toMatch(/2 asset\(s\)/);
		}
	});

	it("error message includes the source location of each failure", () => {
		modelAssets["Missing.glb"] = "";

		try {
			validateAssetManifest();
		} catch (err) {
			const message = (err as Error).message;
			expect(message).toContain('modelAssets["Missing.glb"]');
			expect(message).toContain("empty string");
		}
	});
});
