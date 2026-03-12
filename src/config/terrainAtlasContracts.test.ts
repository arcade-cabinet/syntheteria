import {
	getTerrainHexMetrics,
	summarizeTerrainAtlasManifest,
	validateTerrainTilesetManifest,
} from "./terrainAtlasContracts";

describe("terrainAtlasContracts", () => {
	it("accepts the generated terrain tileset manifest", () => {
		expect(validateTerrainTilesetManifest()).toEqual([]);
	});

	it("reports consistent terrain hex metrics", () => {
		const metrics = getTerrainHexMetrics();
		expect(metrics.tilePixelWidth).toBe(96);
		expect(metrics.tilePixelHeight).toBe(83);
		expect(metrics.pixelAspectRatio).toBeCloseTo(96 / 83);
		expect(metrics.renderAspectRatio).toBeGreaterThan(1);
	});

	it("summarizes the terrain atlas manifest", () => {
		const summary = summarizeTerrainAtlasManifest();
		expect(summary.tilesetCount).toBe(10);
		expect(summary.totalTileCount).toBe(500);
		expect(summary.gridShapes).toEqual(["5x10"]);
	});
});
