/**
 * Mining integration tests for DepthMappedLayer.
 *
 * Verifies that floor mining operations correctly modify the depth layer:
 *   - DAISY dig: center + 4 cardinal cells go to depth -1
 *   - Targeted dig: single cell depth to -1
 *   - Deep dig: second pass takes cells from -1 to -2
 *   - Texture swaps to gravel on dug cells
 *   - Adjacent undug cells get ramp edges toward dug cells
 */

import { describe, expect, it } from "vitest";
import {
	applyDaisyDig,
	applyDeepDig,
	applyTargetedDig,
	buildLayerGeometry,
	classifyEdges,
	createDepthMappedLayer,
	GRAVEL_ATLAS_INDEX,
} from "../depthMappedLayer";

describe("mining integration", () => {
	it("DAISY dig modifies layer 0 depth: center + 4 cardinal cells go to -1", () => {
		const layer = createDepthMappedLayer(7, 7, 0);
		// Set initial biomes for the dig area
		for (let z = 0; z < 7; z++) {
			for (let x = 0; x < 7; x++) {
				layer.setBiome(x, z, 1); // durasteel
			}
		}

		applyDaisyDig(layer, 3, 3);

		// Center
		expect(layer.getDepth(3, 3)).toBe(-1);
		// 4 cardinal neighbors
		expect(layer.getDepth(2, 3)).toBe(-1);
		expect(layer.getDepth(4, 3)).toBe(-1);
		expect(layer.getDepth(3, 2)).toBe(-1);
		expect(layer.getDepth(3, 4)).toBe(-1);
	});

	it("DAISY dig does not affect diagonal or distant cells", () => {
		const layer = createDepthMappedLayer(7, 7, 0);
		applyDaisyDig(layer, 3, 3);

		// Diagonals should NOT be dug
		expect(layer.getDepth(2, 2)).toBe(0);
		expect(layer.getDepth(4, 4)).toBe(0);
		expect(layer.getDepth(2, 4)).toBe(0);
		expect(layer.getDepth(4, 2)).toBe(0);

		// Distant cells should be unaffected
		expect(layer.getDepth(0, 0)).toBe(0);
		expect(layer.getDepth(6, 6)).toBe(0);
	});

	it("targeted dig modifies single cell depth to -1", () => {
		const layer = createDepthMappedLayer(5, 5, 0);
		layer.setBiome(2, 2, 1); // durasteel

		applyTargetedDig(layer, 2, 2);

		expect(layer.getDepth(2, 2)).toBe(-1);
		// Neighbors unaffected
		expect(layer.getDepth(1, 2)).toBe(0);
		expect(layer.getDepth(3, 2)).toBe(0);
		expect(layer.getDepth(2, 1)).toBe(0);
		expect(layer.getDepth(2, 3)).toBe(0);
	});

	it("deep dig (second pass) takes cells from -1 to -2", () => {
		const layer = createDepthMappedLayer(5, 5, 0);

		// First dig
		applyTargetedDig(layer, 2, 2);
		expect(layer.getDepth(2, 2)).toBe(-1);

		// Deep dig (second pass)
		applyDeepDig(layer, 2, 2);
		expect(layer.getDepth(2, 2)).toBe(-2);
	});

	it("deep dig on undug cell (depth 0) goes to -1, not -2", () => {
		const layer = createDepthMappedLayer(5, 5, 0);

		// Deep dig on fresh cell should behave like first dig
		applyDeepDig(layer, 2, 2);
		expect(layer.getDepth(2, 2)).toBe(-1);
	});

	it("texture swaps to gravel on dug cells", () => {
		const layer = createDepthMappedLayer(5, 5, 0);
		layer.setBiome(2, 2, 1); // durasteel initially

		applyTargetedDig(layer, 2, 2);

		expect(layer.getBiome(2, 2)).toBe(GRAVEL_ATLAS_INDEX);
	});

	it("DAISY dig swaps texture on all 5 dug cells", () => {
		const layer = createDepthMappedLayer(7, 7, 0);
		for (let z = 0; z < 7; z++) {
			for (let x = 0; x < 7; x++) {
				layer.setBiome(x, z, 1); // durasteel
			}
		}

		applyDaisyDig(layer, 3, 3);

		// All 5 DAISY cells should have gravel texture
		expect(layer.getBiome(3, 3)).toBe(GRAVEL_ATLAS_INDEX);
		expect(layer.getBiome(2, 3)).toBe(GRAVEL_ATLAS_INDEX);
		expect(layer.getBiome(4, 3)).toBe(GRAVEL_ATLAS_INDEX);
		expect(layer.getBiome(3, 2)).toBe(GRAVEL_ATLAS_INDEX);
		expect(layer.getBiome(3, 4)).toBe(GRAVEL_ATLAS_INDEX);
	});

	it("adjacent undug cells get ramp edges toward dug cells", () => {
		const layer = createDepthMappedLayer(5, 5, 0);
		applyTargetedDig(layer, 2, 2);

		const edges = classifyEdges(layer);
		const ramps = edges.filter((e) => e.type === "ramp");

		// Single dug cell at -1 surrounded by depth 0 → 4 ramp edges
		expect(ramps.length).toBe(4);

		// Each ramp should be adjacent to the dug cell
		for (const ramp of ramps) {
			expect(ramp.x).toBe(2);
			expect(ramp.z).toBe(2);
		}
	});

	it("deep-dug cell adjacent to undug creates wall edges, not ramps", () => {
		const layer = createDepthMappedLayer(5, 5, 0);
		applyTargetedDig(layer, 2, 2);
		applyDeepDig(layer, 2, 2);
		// Cell (2,2) at depth -2, neighbors at 0 → diff = 2 → walls

		const edges = classifyEdges(layer);
		const walls = edges.filter(
			(e) => e.type === "wall" && e.x === 2 && e.z === 2,
		);

		expect(walls.length).toBe(4);
	});

	it("DAISY dig on edge of map only digs valid cells", () => {
		const layer = createDepthMappedLayer(5, 5, 0);

		// Dig at corner — only 2 cardinal neighbors are in bounds
		applyDaisyDig(layer, 0, 0);

		expect(layer.getDepth(0, 0)).toBe(-1); // center
		expect(layer.getDepth(1, 0)).toBe(-1); // east
		expect(layer.getDepth(0, 1)).toBe(-1); // south
		// North and west are out of bounds — no crash
		expect(layer.getDepth(-1, 0)).toBe(0); // OOB returns default
		expect(layer.getDepth(0, -1)).toBe(0); // OOB returns default
	});

	it("dig produces correct geometry with floor at lower Y", () => {
		const layer = createDepthMappedLayer(5, 5, 0);
		applyTargetedDig(layer, 2, 2);

		const geo = buildLayerGeometry(layer);

		// The dug cell should have a floor quad at worldY = baseY + depth = 0 + (-1) = -1
		const dugFloor = geo.floorQuads.find((q) => q.x === 2 && q.z === 2);
		expect(dugFloor).toBeDefined();
		expect(dugFloor!.worldY).toBe(-1);
	});
});
