/**
 * Generator integration tests for DepthMappedLayer.
 *
 * Verifies that the board generator correctly produces DepthMappedLayer
 * instances with proper biome assignments, abyssal zones, bridges, and
 * enclosed platforms.
 */

import { describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import { FLOOR_INDEX_MAP } from "../../terrain/types";
import { boardToDepthLayers, createDepthLayerStack } from "../depthLayerStack";
import {
	buildLayerGeometry,
	createDepthMappedLayer,
	GRATING_ATLAS_INDEX,
} from "../depthMappedLayer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTile(
	x: number,
	z: number,
	elevation: -1 | 0 | 1 | 2,
	floorType: string = "durasteel_span",
): TileData {
	return {
		x,
		z,
		elevation,
		passable: elevation >= 0 && floorType !== "structural_mass",
		floorType: floorType as TileData["floorType"],
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

function makeBoard(
	width: number,
	height: number,
	overrides: Array<{
		x: number;
		z: number;
		elevation: -1 | 0 | 1 | 2;
		floorType?: string;
	}> = [],
): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push(makeTile(x, z, 0));
		}
		tiles.push(row);
	}
	for (const o of overrides) {
		tiles[o.z][o.x] = makeTile(o.x, o.z, o.elevation, o.floorType);
	}
	return {
		config: { width, height, seed: "test-gen", difficulty: "normal" },
		tiles,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generator → depth layer integration", () => {
	it("generator produces layer 0 with correct biome assignments", () => {
		const board = makeBoard(4, 4, [
			{ x: 0, z: 0, elevation: 0, floorType: "structural_mass" },
			{ x: 1, z: 0, elevation: 0, floorType: "transit_deck" },
			{ x: 2, z: 0, elevation: 0, floorType: "dust_district" },
			{ x: 3, z: 0, elevation: 0, floorType: "bio_district" },
		]);

		const stack = boardToDepthLayers(board);
		const layer0 = stack.getLayer(0);

		expect(layer0.getBiome(0, 0)).toBe(FLOOR_INDEX_MAP["structural_mass"]);
		expect(layer0.getBiome(1, 0)).toBe(FLOOR_INDEX_MAP["transit_deck"]);
		expect(layer0.getBiome(2, 0)).toBe(FLOOR_INDEX_MAP["dust_district"]);
		expect(layer0.getBiome(3, 0)).toBe(FLOOR_INDEX_MAP["bio_district"]);
	});

	it("abyssal zones in layer 0 have deep negative depth", () => {
		const board = makeBoard(6, 6, [
			{ x: 2, z: 2, elevation: -1, floorType: "abyssal_platform" },
			{ x: 3, z: 2, elevation: -1, floorType: "abyssal_platform" },
			{ x: 2, z: 3, elevation: -1, floorType: "abyssal_platform" },
			{ x: 3, z: 3, elevation: -1, floorType: "abyssal_platform" },
		]);

		const stack = boardToDepthLayers(board);
		const layer0 = stack.getLayer(0);

		// Abyssal tiles (elevation -1) should map to negative depth
		expect(layer0.getDepth(2, 2)).toBeLessThan(0);
		expect(layer0.getDepth(3, 2)).toBeLessThan(0);
		expect(layer0.getDepth(2, 3)).toBeLessThan(0);
		expect(layer0.getDepth(3, 3)).toBeLessThan(0);

		// Should have grating texture
		expect(layer0.getBiome(2, 2)).toBe(GRATING_ATLAS_INDEX);
	});

	it("generator identifies bridge tiles and creates layer 1 instances", () => {
		const board = makeBoard(6, 6, [
			// Bridge tiles at elevation 1
			{ x: 2, z: 3, elevation: 1, floorType: "durasteel_span" },
			{ x: 3, z: 3, elevation: 1, floorType: "durasteel_span" },
			{ x: 4, z: 3, elevation: 1, floorType: "durasteel_span" },
		]);

		const stack = boardToDepthLayers(board);

		// Should have at least 2 layers: ground + bridge
		expect(stack.layerCount).toBeGreaterThanOrEqual(2);

		// Layer 1 should contain the bridge tiles
		const layer1 = stack.getLayer(1);
		expect(layer1.baseY).toBe(1);
	});

	it("bridge layer 1 has depth -1 at endpoints (ramp connections)", () => {
		const board = makeBoard(8, 8, [
			// Bridge spanning 3 tiles, with ground tiles on either side
			{ x: 3, z: 4, elevation: 1, floorType: "durasteel_span" },
			{ x: 4, z: 4, elevation: 1, floorType: "durasteel_span" },
			{ x: 5, z: 4, elevation: 1, floorType: "durasteel_span" },
		]);

		const stack = boardToDepthLayers(board);

		if (stack.layerCount >= 2) {
			const layer1 = stack.getLayer(1);

			// Endpoint tiles should have depth ramps connecting down
			// The exact implementation determines which cells get -1
			// but the bridge endpoints should facilitate connection to layer 0
			const hasRampEndpoint =
				layer1.getDepth(3, 4) === -1 || layer1.getDepth(5, 4) === -1;
			expect(hasRampEndpoint).toBe(true);
		}
	});

	it("enclosed platforms have perimeter depth drops (auto-walls)", () => {
		const board = makeBoard(8, 8, [
			// 3x3 platform at elevation 1
			{ x: 3, z: 3, elevation: 1, floorType: "durasteel_span" },
			{ x: 4, z: 3, elevation: 1, floorType: "durasteel_span" },
			{ x: 5, z: 3, elevation: 1, floorType: "durasteel_span" },
			{ x: 3, z: 4, elevation: 1, floorType: "durasteel_span" },
			{ x: 4, z: 4, elevation: 1, floorType: "durasteel_span" },
			{ x: 5, z: 4, elevation: 1, floorType: "durasteel_span" },
			{ x: 3, z: 5, elevation: 1, floorType: "durasteel_span" },
			{ x: 4, z: 5, elevation: 1, floorType: "durasteel_span" },
			{ x: 5, z: 5, elevation: 1, floorType: "durasteel_span" },
		]);

		const stack = boardToDepthLayers(board);

		if (stack.layerCount >= 2) {
			const layer1 = stack.getLayer(1);

			// The platform should exist on layer 1
			// Center cell should be at depth 0 (full height)
			expect(layer1.getDepth(4, 4)).toBe(0);

			// Perimeter cells should either have depth drops or
			// the geometry should produce wall edges at the platform boundary
			const geo = buildLayerGeometry(layer1);
			const hasPerimeterGeometry =
				geo.wallQuads.length > 0 || geo.rampQuads.length > 0;
			expect(hasPerimeterGeometry).toBe(true);
		}
	});

	it("flat board with no bridges produces only layer 0", () => {
		const board = makeBoard(6, 6);
		const stack = boardToDepthLayers(board);

		expect(stack.layerCount).toBe(1);
		expect(stack.getLayer(0).baseY).toBe(0);
	});

	it("all ground tiles (elevation 0) have depth 0 on layer 0", () => {
		const board = makeBoard(4, 4);
		const stack = boardToDepthLayers(board);
		const layer0 = stack.getLayer(0);

		for (let z = 0; z < 4; z++) {
			for (let x = 0; x < 4; x++) {
				expect(layer0.getDepth(x, z)).toBe(0);
			}
		}
	});

	it("structural mass tiles get correct atlas index", () => {
		const board = makeBoard(4, 4, [
			{ x: 1, z: 1, elevation: 0, floorType: "structural_mass" },
			{ x: 2, z: 2, elevation: 0, floorType: "aerostructure" },
		]);

		const stack = boardToDepthLayers(board);
		const layer0 = stack.getLayer(0);

		expect(layer0.getBiome(1, 1)).toBe(FLOOR_INDEX_MAP["structural_mass"]);
		expect(layer0.getBiome(2, 2)).toBe(FLOOR_INDEX_MAP["aerostructure"]);
	});

	it("void_pit tiles get void atlas index on layer 0", () => {
		const board = makeBoard(4, 4, [
			{ x: 1, z: 1, elevation: -1, floorType: "void_pit" },
		]);

		const stack = boardToDepthLayers(board);
		const layer0 = stack.getLayer(0);

		expect(layer0.getBiome(1, 1)).toBe(FLOOR_INDEX_MAP["void_pit"]);
		expect(layer0.getDepth(1, 1)).toBeLessThan(0);
	});

	it("mixed elevation board produces correct layer count", () => {
		const board = makeBoard(8, 8, [
			// Abyssal
			{ x: 0, z: 0, elevation: -1, floorType: "abyssal_platform" },
			// Ground (default)
			// Bridge
			{ x: 4, z: 4, elevation: 1, floorType: "durasteel_span" },
			// Upper structure
			{ x: 6, z: 6, elevation: 2, floorType: "aerostructure" },
		]);

		const stack = boardToDepthLayers(board);

		// Should have layers for ground + bridge + upper (at minimum 2)
		expect(stack.layerCount).toBeGreaterThanOrEqual(2);
	});
});
