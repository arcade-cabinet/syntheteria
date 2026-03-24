/**
 * Labyrinth generator full pipeline tests.
 *
 * Tests the complete 6-phase pipeline through the public generateBoard API.
 * Verifies seed determinism, board dimensions, passable/wall balance,
 * floor type variety, resource scatter, and player start tile.
 */

import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import type { BoardConfig, TileData } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(seed: string, size = 32): BoardConfig {
	return { width: size, height: size, seed, difficulty: "normal" };
}

function countFloorType(tiles: TileData[][], ft: string): number {
	let n = 0;
	for (const row of tiles) {
		for (const t of row) {
			if (t.floorType === ft) n++;
		}
	}
	return n;
}

function countPassable(tiles: TileData[][]): number {
	let n = 0;
	for (const row of tiles) {
		for (const t of row) {
			if (t.passable) n++;
		}
	}
	return n;
}

function countResources(tiles: TileData[][]): number {
	let n = 0;
	for (const row of tiles) {
		for (const t of row) {
			if (t.resourceMaterial !== null) n++;
		}
	}
	return n;
}

// ---------------------------------------------------------------------------
// Seed determinism
// ---------------------------------------------------------------------------

describe("seed determinism", () => {
	it("same seed produces identical board", () => {
		const config = makeConfig("det-test-42");
		const b1 = generateBoard(config);
		const b2 = generateBoard(config);

		for (let z = 0; z < config.height; z++) {
			for (let x = 0; x < config.width; x++) {
				const t1 = b1.tiles[z]![x]!;
				const t2 = b2.tiles[z]![x]!;
				expect(t1.floorType).toBe(t2.floorType);
				expect(t1.passable).toBe(t2.passable);
				expect(t1.elevation).toBe(t2.elevation);
				expect(t1.resourceMaterial).toBe(t2.resourceMaterial);
				expect(t1.resourceAmount).toBe(t2.resourceAmount);
			}
		}
	});

	it("different seeds produce different boards", () => {
		const b1 = generateBoard(makeConfig("alpha-seed"));
		const b2 = generateBoard(makeConfig("beta-seed"));

		let diffs = 0;
		for (let z = 0; z < 32; z++) {
			for (let x = 0; x < 32; x++) {
				if (b1.tiles[z]![x]!.floorType !== b2.tiles[z]![x]!.floorType) diffs++;
			}
		}
		expect(diffs).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Board structure
// ---------------------------------------------------------------------------

describe("board structure", () => {
	it("returns correct dimensions", () => {
		const board = generateBoard(makeConfig("dim-test", 44));
		expect(board.tiles.length).toBe(44);
		expect(board.tiles[0]!.length).toBe(44);
		expect(board.config.width).toBe(44);
		expect(board.config.height).toBe(44);
	});

	it("has both passable and wall tiles", () => {
		const board = generateBoard(makeConfig("balance-test"));
		const passable = countPassable(board.tiles);
		const walls = countFloorType(board.tiles, "structural_mass");
		const total = 32 * 32;

		expect(passable).toBeGreaterThan(0);
		expect(walls).toBeGreaterThan(0);
		// Passable should be a reasonable fraction (labyrinth carves rooms + corridors)
		expect(passable / total).toBeGreaterThan(0.1);
		expect(passable / total).toBeLessThan(0.9);
	});

	it("has multiple floor types (not just transit_deck and structural_mass)", () => {
		const board = generateBoard(makeConfig("variety-test", 44));
		const floorTypes = new Set<string>();
		for (const row of board.tiles) {
			for (const t of row) {
				floorTypes.add(t.floorType);
			}
		}
		// Should have at least structural_mass + transit_deck + room floors
		expect(floorTypes.size).toBeGreaterThanOrEqual(3);
	});

	it("has resource deposits scattered", () => {
		const board = generateBoard(makeConfig("resource-test"));
		const resources = countResources(board.tiles);
		expect(resources).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Player start
// ---------------------------------------------------------------------------

describe("player start", () => {
	it("center tile is always passable ground", () => {
		for (const seed of ["start-a", "start-b", "start-c"]) {
			const board = generateBoard(makeConfig(seed));
			const cx = Math.floor(32 / 2);
			const cz = Math.floor(32 / 2);
			const center = board.tiles[cz]![cx]!;

			expect(center.passable).toBe(true);
			expect(center.elevation).toBe(0);
			expect(center.floorType).toBe("durasteel_span");
		}
	});
});

// ---------------------------------------------------------------------------
// Climate profiles
// ---------------------------------------------------------------------------

describe("climate profiles", () => {
	it("generates without error for all climate profiles", () => {
		for (const climate of ["temperate", "wet", "arid", "frozen"] as const) {
			const config: BoardConfig = {
				width: 32,
				height: 32,
				seed: "climate-test",
				difficulty: "normal",
				climateProfile: climate,
			};
			const board = generateBoard(config);
			expect(board.tiles.length).toBe(32);
		}
	});

	it("wet climate produces more abyssal tiles than arid", () => {
		const wet = generateBoard({
			width: 64,
			height: 64,
			seed: "abyssal-compare",
			difficulty: "normal",
			climateProfile: "wet",
		});
		const arid = generateBoard({
			width: 64,
			height: 64,
			seed: "abyssal-compare",
			difficulty: "normal",
			climateProfile: "arid",
		});

		const wetAbyssal = countFloorType(wet.tiles, "abyssal_platform");
		const aridAbyssal = countFloorType(arid.tiles, "abyssal_platform");
		expect(wetAbyssal).toBeGreaterThan(aridAbyssal);
	});
});

// ---------------------------------------------------------------------------
// Board sizes
// ---------------------------------------------------------------------------

describe("board sizes", () => {
	it("handles small boards (16x16)", () => {
		const board = generateBoard(makeConfig("small", 16));
		expect(board.tiles.length).toBe(16);
		const passable = countPassable(board.tiles);
		expect(passable).toBeGreaterThan(0);
	});

	it("handles large boards (64x64)", () => {
		const board = generateBoard(makeConfig("large", 64));
		expect(board.tiles.length).toBe(64);
		expect(board.tiles[0]!.length).toBe(64);
		const passable = countPassable(board.tiles);
		expect(passable).toBeGreaterThan(100);
	});
});
