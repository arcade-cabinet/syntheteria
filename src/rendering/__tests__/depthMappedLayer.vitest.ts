/**
 * DepthMappedLayer data model tests.
 *
 * Tests the core data structure that replaces BiomeRenderer + DepthRenderer + MinedPitRenderer
 * with a single unified layer abstraction.
 *
 * A DepthMappedLayer is a 2D grid where each cell has:
 *   - depth: always 0 or negative (0 = surface, -1 = shallow, -2 = deep)
 *   - biomeIndex: atlas cell index (0-8) for texture assignment
 *
 * The layer has a base Y position (world-space elevation of its depth-0 surface).
 */

import { describe, expect, it } from "vitest";
import {
	createDepthMappedLayer,
	type DepthMappedLayer,
} from "../depthMappedLayer";

describe("DepthMappedLayer data model", () => {
	it("creates a layer with specified dimensions and base Y", () => {
		const layer = createDepthMappedLayer(10, 8, 0);

		expect(layer.width).toBe(10);
		expect(layer.height).toBe(8);
		expect(layer.baseY).toBe(0);
	});

	it("all cells default to depth 0", () => {
		const layer = createDepthMappedLayer(4, 4, 0);

		for (let z = 0; z < 4; z++) {
			for (let x = 0; x < 4; x++) {
				expect(layer.getDepth(x, z)).toBe(0);
			}
		}
	});

	it("sets and gets depth at specific cells", () => {
		const layer = createDepthMappedLayer(5, 5, 0);

		layer.setDepth(2, 3, -1);
		expect(layer.getDepth(2, 3)).toBe(-1);

		layer.setDepth(0, 0, -2);
		expect(layer.getDepth(0, 0)).toBe(-2);
	});

	it("depth is clamped to 0 or negative — no positive values allowed", () => {
		const layer = createDepthMappedLayer(4, 4, 0);

		layer.setDepth(1, 1, 3); // attempt positive
		expect(layer.getDepth(1, 1)).toBeLessThanOrEqual(0);

		layer.setDepth(2, 2, 1); // attempt positive
		expect(layer.getDepth(2, 2)).toBeLessThanOrEqual(0);
	});

	it("sets and gets biome/texture index per cell", () => {
		const layer = createDepthMappedLayer(4, 4, 0);

		layer.setBiome(1, 2, 3); // collapsed_zone
		expect(layer.getBiome(1, 2)).toBe(3);

		layer.setBiome(0, 0, 7); // abyssal_platform (grating)
		expect(layer.getBiome(0, 0)).toBe(7);
	});

	it("default biome index is 8 (void)", () => {
		const layer = createDepthMappedLayer(4, 4, 0);
		expect(layer.getBiome(0, 0)).toBe(8);
	});

	it("out-of-bounds getDepth returns 0", () => {
		const layer = createDepthMappedLayer(4, 4, 0);

		expect(layer.getDepth(-1, 0)).toBe(0);
		expect(layer.getDepth(4, 0)).toBe(0);
		expect(layer.getDepth(0, -1)).toBe(0);
		expect(layer.getDepth(0, 4)).toBe(0);
		expect(layer.getDepth(100, 100)).toBe(0);
	});

	it("out-of-bounds getBiome returns 8 (void texture)", () => {
		const layer = createDepthMappedLayer(4, 4, 0);

		expect(layer.getBiome(-1, 0)).toBe(8);
		expect(layer.getBiome(4, 0)).toBe(8);
		expect(layer.getBiome(0, -1)).toBe(8);
		expect(layer.getBiome(0, 4)).toBe(8);
	});

	it("layer with base Y > 0 represents elevated platform", () => {
		const layer = createDepthMappedLayer(3, 3, 1);
		expect(layer.baseY).toBe(1);
		// Depth 0 at baseY=1 means world Y = 1
		expect(layer.getDepth(0, 0)).toBe(0);
	});

	it("setDepth does not affect adjacent cells", () => {
		const layer = createDepthMappedLayer(4, 4, 0);

		layer.setDepth(2, 2, -1);

		expect(layer.getDepth(1, 2)).toBe(0);
		expect(layer.getDepth(3, 2)).toBe(0);
		expect(layer.getDepth(2, 1)).toBe(0);
		expect(layer.getDepth(2, 3)).toBe(0);
	});

	it("out-of-bounds setDepth is silently ignored", () => {
		const layer = createDepthMappedLayer(4, 4, 0);

		// Should not throw
		layer.setDepth(-1, 0, -1);
		layer.setDepth(4, 0, -1);
		layer.setDepth(0, -1, -1);
		layer.setDepth(0, 4, -1);

		// All in-bounds cells remain at 0
		for (let z = 0; z < 4; z++) {
			for (let x = 0; x < 4; x++) {
				expect(layer.getDepth(x, z)).toBe(0);
			}
		}
	});

	it("multiple depth levels coexist in the same layer", () => {
		const layer = createDepthMappedLayer(5, 5, 0);

		layer.setDepth(0, 0, 0);
		layer.setDepth(1, 1, -1);
		layer.setDepth(2, 2, -2);
		layer.setDepth(3, 3, -3);

		expect(layer.getDepth(0, 0)).toBe(0);
		expect(layer.getDepth(1, 1)).toBe(-1);
		expect(layer.getDepth(2, 2)).toBe(-2);
		expect(layer.getDepth(3, 3)).toBe(-3);
	});
});
