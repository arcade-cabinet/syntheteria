/**
 * Chunk generation tests — validates floorType integrity across many chunks.
 *
 * Regression test for the "undefined floorType" bug where negative world
 * coordinates caused negative modulo results, producing undefined array access.
 */

import { describe, expect, it } from "vitest";
import { CHUNK_SIZE, generateChunk } from "../chunks";
import { FLOOR_DEFS } from "../types";

const VALID_FLOOR_TYPES = new Set(Object.keys(FLOOR_DEFS));

describe("chunk floorType integrity", () => {
	it("no tile has undefined floorType across 100 chunks (positive coords)", {
		timeout: 15000,
	}, () => {
		for (let cx = 0; cx < 10; cx++) {
			for (let cz = 0; cz < 10; cz++) {
				const chunk = generateChunk("floor-test", cx, cz);
				for (let lz = 0; lz < CHUNK_SIZE; lz++) {
					for (let lx = 0; lx < CHUNK_SIZE; lx++) {
						const tile = chunk.tiles[lz]![lx]!;
						expect(
							tile.floorType,
							`undefined floorType at chunk(${cx},${cz}) tile(${lx},${lz})`,
						).toBeDefined();
						expect(
							VALID_FLOOR_TYPES.has(tile.floorType),
							`invalid floorType "${tile.floorType}" at chunk(${cx},${cz}) tile(${lx},${lz})`,
						).toBe(true);
					}
				}
			}
		}
	});

	it("no tile has undefined floorType with negative chunk coordinates", () => {
		// Negative coords are the primary trigger for the modulo bug
		const negativeCoords = [
			[-1, 0],
			[0, -1],
			[-1, -1],
			[-3, -5],
			[-10, -10],
		];
		for (const [cx, cz] of negativeCoords) {
			const chunk = generateChunk("neg-floor-test", cx!, cz!);
			for (let lz = 0; lz < CHUNK_SIZE; lz++) {
				for (let lx = 0; lx < CHUNK_SIZE; lx++) {
					const tile = chunk.tiles[lz]![lx]!;
					expect(
						tile.floorType,
						`undefined floorType at chunk(${cx},${cz}) tile(${lx},${lz})`,
					).toBeDefined();
					expect(
						VALID_FLOOR_TYPES.has(tile.floorType),
						`invalid floorType "${tile.floorType}" at chunk(${cx},${cz}) tile(${lx},${lz})`,
					).toBe(true);
				}
			}
		}
	});

	it("floorType is a valid FloorType string, never 'undefined'", () => {
		// Specifically test the string "undefined" case
		const chunk = generateChunk("str-undef-test", -2, -3);
		const allFloorTypes = chunk.tiles.flat().map((t) => t.floorType);

		expect(allFloorTypes).not.toContain("undefined");
		expect(allFloorTypes).not.toContain(undefined);
		for (const ft of allFloorTypes) {
			expect(VALID_FLOOR_TYPES.has(ft)).toBe(true);
		}
	});
});
