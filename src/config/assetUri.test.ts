import { resolveAssetUri } from "./assetUri";

describe("resolveAssetUri", () => {
	it("preserves expo web unstable asset paths so metro can serve them", () => {
		expect(
			resolveAssetUri(
				"/assets/?unstable_path=.%2Fassets%2Fmodels%2Frobots%2Fplayer%2FCompanion-bot.glb",
			),
		).toBe(
			"/assets/?unstable_path=.%2Fassets%2Fmodels%2Frobots%2Fplayer%2FCompanion-bot.glb",
		);
	});

	it("passes through stable string asset URLs", () => {
		expect(resolveAssetUri("/assets/models/city/Wall_1.glb")).toBe(
			"/assets/models/city/Wall_1.glb",
		);
	});

	it("resolves numeric module IDs via globalThis.require + expo-asset", () => {
		const originalRequire = (globalThis as any).require;
		(globalThis as any).require = (specifier: string) => {
			if (specifier === "expo-asset") {
				return {
					Asset: {
						fromModule: (mod: string | number) => ({
							uri: typeof mod === "string" ? mod : `/resolved/${mod}`,
						}),
					},
				};
			}
			throw new Error(`Unknown module: ${specifier}`);
		};
		try {
			expect(resolveAssetUri(42)).toBe("/resolved/42");
		} finally {
			if (originalRequire) {
				(globalThis as any).require = originalRequire;
			} else {
				delete (globalThis as any).require;
			}
		}
	});

	it("returns empty string for numeric IDs when no module runtime exists", () => {
		// In Jest, globalThis.require is typically undefined — matches web behavior
		const originalRequire = (globalThis as any).require;
		delete (globalThis as any).require;
		try {
			expect(resolveAssetUri(123)).toBe("");
		} finally {
			if (originalRequire) {
				(globalThis as any).require = originalRequire;
			}
		}
	});

	it("still passes through strings when no module runtime exists", () => {
		const originalRequire = (globalThis as any).require;
		delete (globalThis as any).require;
		try {
			expect(resolveAssetUri("/assets/test.glb")).toBe("/assets/test.glb");
		} finally {
			if (originalRequire) {
				(globalThis as any).require = originalRequire;
			}
		}
	});
});
