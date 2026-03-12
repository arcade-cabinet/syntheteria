jest.mock("expo-asset", () => ({
	Asset: {
		fromModule: (asset: string | number) => ({
			uri: typeof asset === "string" ? asset : `/mocked/${asset}`,
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
});
