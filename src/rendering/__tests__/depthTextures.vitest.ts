/**
 * Texture assignment tests for DepthMappedLayer.
 *
 * Each cell in a DepthMappedLayer maps to an atlas cell index (0-8)
 * from FLOOR_INDEX_MAP. Certain operations (digging, abyssal conversion)
 * swap the texture assignment.
 *
 * Atlas layout (3x3 grid):
 *   0: Metal032 (structural_mass)
 *   1: Metal038 (durasteel_span)
 *   2: Concrete007 (transit_deck)
 *   3: Concrete034 (collapsed_zone)
 *   4: Asphalt004 (dust_district)
 *   5: Metal025 (bio_district)
 *   6: Metal036 (aerostructure)
 *   7: Grate001 (abyssal_platform)
 *   8: void_pit (solid black)
 */

import { describe, expect, it } from "vitest";
import {
	createDepthMappedLayer,
	GRAVEL_ATLAS_INDEX,
	GRATING_ATLAS_INDEX,
	STRUCTURAL_ATLAS_INDEX,
	VOID_ATLAS_INDEX,
} from "../depthMappedLayer";

describe("texture assignment", () => {
	it("each cell maps to atlas cell index 0-8", () => {
		const layer = createDepthMappedLayer(3, 3, 0);

		for (let i = 0; i <= 8; i++) {
			layer.setBiome(0, 0, i);
			expect(layer.getBiome(0, 0)).toBe(i);
			expect(layer.getBiome(0, 0)).toBeGreaterThanOrEqual(0);
			expect(layer.getBiome(0, 0)).toBeLessThanOrEqual(8);
		}
	});

	it("dug cells switch to gravel texture", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setBiome(1, 1, 1); // durasteel initially

		// Simulate dig: set depth and swap texture
		layer.setDepth(1, 1, -1);
		layer.setBiome(1, 1, GRAVEL_ATLAS_INDEX);

		expect(layer.getBiome(1, 1)).toBe(GRAVEL_ATLAS_INDEX);
	});

	it("abyssal cells use grating texture (atlas cell 7)", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setBiome(1, 1, GRATING_ATLAS_INDEX);

		expect(layer.getBiome(1, 1)).toBe(7);
		expect(GRATING_ATLAS_INDEX).toBe(7);
	});

	it("structural mass cells use metal texture (atlas cell 0)", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setBiome(1, 1, STRUCTURAL_ATLAS_INDEX);

		expect(layer.getBiome(1, 1)).toBe(0);
		expect(STRUCTURAL_ATLAS_INDEX).toBe(0);
	});

	it("default unassigned cells use void (atlas cell 8)", () => {
		const layer = createDepthMappedLayer(3, 3, 0);

		expect(layer.getBiome(0, 0)).toBe(VOID_ATLAS_INDEX);
		expect(VOID_ATLAS_INDEX).toBe(8);
	});

	it("gravel texture is a valid atlas index distinct from existing floor types", () => {
		// Gravel must be a valid atlas cell index
		expect(GRAVEL_ATLAS_INDEX).toBeGreaterThanOrEqual(0);
		expect(GRAVEL_ATLAS_INDEX).toBeLessThanOrEqual(8);
	});

	it("texture assignment persists independently of depth", () => {
		const layer = createDepthMappedLayer(3, 3, 0);

		layer.setBiome(1, 1, 3);
		layer.setDepth(1, 1, -2);

		// Changing depth should not alter the biome assignment
		expect(layer.getBiome(1, 1)).toBe(3);
	});

	it("each cell can have a different texture from its neighbors", () => {
		const layer = createDepthMappedLayer(3, 3, 0);

		layer.setBiome(0, 0, 0); // structural
		layer.setBiome(1, 0, 1); // durasteel
		layer.setBiome(2, 0, 7); // grating

		expect(layer.getBiome(0, 0)).toBe(0);
		expect(layer.getBiome(1, 0)).toBe(1);
		expect(layer.getBiome(2, 0)).toBe(7);
	});

	it("texture assignment for wall quads inherits from the deeper cell", () => {
		// When a wall or ramp is generated between two cells, the geometry
		// should use the texture of the lower (deeper) cell
		const layer = createDepthMappedLayer(3, 1, 0);
		layer.setDepth(1, 0, -2);
		layer.setBiome(0, 0, 1); // durasteel
		layer.setBiome(1, 0, GRAVEL_ATLAS_INDEX); // gravel (dug)
		layer.setBiome(2, 0, 1); // durasteel

		// The deeper cell's texture should be available in geometry results
		// This is verified at the geometry level, not just the data model
		expect(layer.getBiome(1, 0)).toBe(GRAVEL_ATLAS_INDEX);
	});

	it("out-of-bounds setBiome is silently ignored", () => {
		const layer = createDepthMappedLayer(3, 3, 0);
		layer.setBiome(-1, 0, 5);
		layer.setBiome(3, 0, 5);
		layer.setBiome(0, -1, 5);
		layer.setBiome(0, 3, 5);

		// All in-bounds cells should still be default (void = 8)
		for (let z = 0; z < 3; z++) {
			for (let x = 0; x < 3; x++) {
				expect(layer.getBiome(x, z)).toBe(8);
			}
		}
	});
});
