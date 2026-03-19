import { resolveAssetUri } from "./assetUri";

describe("resolveAssetUri", () => {
	it("passes through stable string asset URLs", () => {
		expect(resolveAssetUri("/assets/models/city/Wall_1.glb")).toBe(
			"/assets/models/city/Wall_1.glb",
		);
	});

	it("passes through Vite public-dir paths", () => {
		expect(
			resolveAssetUri("/assets/models/robots/player/Companion-bot.glb"),
		).toBe("/assets/models/robots/player/Companion-bot.glb");
	});

	it("throws on empty string input", () => {
		expect(() => resolveAssetUri("")).toThrow();
	});
});
