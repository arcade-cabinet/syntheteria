jest.mock("expo-asset", () => ({
	Asset: {
		fromModule: (mod: string | number) => ({
			uri: typeof mod === "string" ? mod : `/resolved/${mod}`,
			localUri: null,
		}),
	},
}));

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

	it("resolves numeric module IDs via expo-asset", () => {
		expect(resolveAssetUri(42)).toBe("/resolved/42");
	});

	it("throws on empty string input", () => {
		expect(() => resolveAssetUri("")).toThrow("empty string");
	});
});
