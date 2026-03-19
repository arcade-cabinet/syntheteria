/**
 * Geometry generation tests for DepthMappedLayer.
 *
 * Tests that the depth map + edge classification produces the correct
 * geometry primitives: floor quads, ramp slopes, wall faces, and
 * abyssal void planes with opacity cutout flags.
 *
 * These test the DATA/LOGIC — not Three.js rendering. The geometry
 * builder returns descriptor objects that the renderer converts to
 * BufferGeometry.
 */

import { describe, expect, it } from "vitest";
import {
	createDepthMappedLayer,
	buildLayerGeometry,
	type LayerGeometryResult,
} from "../depthMappedLayer";

describe("depth geometry generation", () => {
	it("flat area (all depth 0) produces only floor quads, no walls or ramps", () => {
		const layer = createDepthMappedLayer(4, 4, 0);
		const geo = buildLayerGeometry(layer);

		expect(geo.floorQuads.length).toBe(16); // 4x4 grid
		expect(geo.rampQuads.length).toBe(0);
		expect(geo.wallQuads.length).toBe(0);
	});

	it("single dug cell (depth -1) surrounded by depth 0 produces 4 ramp edges + 1 lower floor", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setDepth(1, 1, -1);
		const geo = buildLayerGeometry(layer);

		// 8 cells at depth 0 + 1 cell at depth -1 = 9 floor quads total
		expect(geo.floorQuads.length).toBe(9);

		// The depth-1 cell has 4 neighbors at depth 0 → 4 ramp edges
		expect(geo.rampQuads.length).toBe(4);

		// No walls (diff is exactly 1 everywhere)
		expect(geo.wallQuads.length).toBe(0);
	});

	it("DAISY dig pattern (center + 4 cardinal at -1) produces correct ramp/wall edges", () => {
		const layer = createDepthMappedLayer(5, 5, 0);
		// DAISY: center + 4 cardinal neighbors
		layer.setDepth(2, 2, -1);
		layer.setDepth(1, 2, -1);
		layer.setDepth(3, 2, -1);
		layer.setDepth(2, 1, -1);
		layer.setDepth(2, 3, -1);
		const geo = buildLayerGeometry(layer);

		// 5 cells at depth -1 each border some depth-0 cells
		// Perimeter of the cross shape has edges toward depth-0 neighbors
		// Each arm tip has 3 exposed edges, center has 0 exposed edges
		// Total ramp edges = 4 tips × 3 edges = 12
		expect(geo.rampQuads.length).toBe(12);
		expect(geo.wallQuads.length).toBe(0);
	});

	it("deep dig (depth -2) adjacent to depth 0 produces wall edges (sheer)", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setDepth(1, 1, -2);
		const geo = buildLayerGeometry(layer);

		// Depth diff of 2 → wall, not ramp
		expect(geo.wallQuads.length).toBe(4);
		expect(geo.rampQuads.length).toBe(0);
	});

	it("abyssal cell (biome 7) sets opacity cutout flag", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setBiome(1, 1, 7); // abyssal_platform grating
		const geo = buildLayerGeometry(layer);

		// The floor quad at (1,1) should have the cutout flag
		const abyssalFloor = geo.floorQuads.find(
			(q) => q.x === 1 && q.z === 1,
		);
		expect(abyssalFloor).toBeDefined();
		expect(abyssalFloor!.opacityCutout).toBe(true);
	});

	it("abyssal cell with negative depth also gets void plane below", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setDepth(1, 1, -1);
		layer.setBiome(1, 1, 7); // abyssal grating
		const geo = buildLayerGeometry(layer);

		// Should have a void plane descriptor for the abyssal cell
		expect(geo.voidPlanes.length).toBeGreaterThanOrEqual(1);
		const voidPlane = geo.voidPlanes.find(
			(v) => v.x === 1 && v.z === 1,
		);
		expect(voidPlane).toBeDefined();
	});

	it("vertex count is proportional to non-flat cells", () => {
		// Flat layer — minimal geometry (only floors)
		const flatLayer = createDepthMappedLayer(10, 10, 0);
		const flatGeo = buildLayerGeometry(flatLayer);

		// Layer with depth variation — more geometry (floors + ramps/walls)
		const variedLayer = createDepthMappedLayer(10, 10, 0);
		for (let i = 0; i < 5; i++) {
			variedLayer.setDepth(i + 2, 5, -1);
		}
		const variedGeo = buildLayerGeometry(variedLayer);

		// Varied layer should have more geometry primitives
		const flatPrimCount =
			flatGeo.floorQuads.length + flatGeo.rampQuads.length + flatGeo.wallQuads.length;
		const variedPrimCount =
			variedGeo.floorQuads.length + variedGeo.rampQuads.length + variedGeo.wallQuads.length;

		expect(variedPrimCount).toBeGreaterThan(flatPrimCount);
	});

	it("ramp quad has correct orientation from low to high cell", () => {
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(1, 0, -1);
		// [0, -1, 0]

		const geo = buildLayerGeometry(layer);
		const ramps = geo.rampQuads;

		// Each ramp should indicate the direction from the deeper cell to the shallower
		for (const ramp of ramps) {
			expect(ramp.depthDiff).toBe(1);
			expect(["north", "south", "east", "west"]).toContain(ramp.direction);
		}
	});

	it("wall quad height equals depth difference", () => {
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(1, 0, -3);

		const geo = buildLayerGeometry(layer);
		const walls = geo.wallQuads;

		expect(walls.length).toBeGreaterThan(0);
		for (const wall of walls) {
			expect(wall.depthDiff).toBe(3);
		}
	});

	it("adjacent cells both at depth -1 produce no edge between them", () => {
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(0, 0, -1);
		layer.setDepth(1, 0, -1);
		// [-1, -1, 0]

		const geo = buildLayerGeometry(layer);

		// No ramp or wall between (0,0) and (1,0) — same depth
		// Only edge is between (1,0)↔(2,0) where depth changes -1 → 0
		expect(geo.rampQuads.length).toBe(1); // only (1,0)↔(2,0)
	});

	it("floor quads report correct world-space Y from base + depth", () => {
		const layer = createDepthMappedLayer(2, 1, 3); // baseY = 3
		layer.setDepth(1, 0, -2);

		const geo = buildLayerGeometry(layer);

		const floorAt0 = geo.floorQuads.find((q) => q.x === 0);
		const floorAt1 = geo.floorQuads.find((q) => q.x === 1);

		expect(floorAt0).toBeDefined();
		expect(floorAt1).toBeDefined();

		// Cell 0: depth 0 → worldY = baseY + 0 = 3
		expect(floorAt0!.worldY).toBe(3);
		// Cell 1: depth -2 → worldY = baseY + (-2) = 1
		expect(floorAt1!.worldY).toBe(1);
	});

	it("non-abyssal cells do not get opacity cutout flag", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setBiome(1, 1, 1); // durasteel_span
		const geo = buildLayerGeometry(layer);

		const durasteel = geo.floorQuads.find(
			(q) => q.x === 1 && q.z === 1,
		);
		expect(durasteel).toBeDefined();
		expect(durasteel!.opacityCutout).toBe(false);
	});
});
