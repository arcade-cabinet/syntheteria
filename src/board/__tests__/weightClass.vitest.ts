import { describe, expect, it } from "vitest";
import { isPassableFor, movementCost, reachableTiles } from "../adjacency";
import type { GeneratedBoard, TileData, WeightClass } from "../types";

/** Helper: create a single TileData with the given floor type. */
function makeTile(
	x: number,
	z: number,
	biomeType: TileData["biomeType"],
	passable = true,
): TileData {
	return {
		x,
		z,
		elevation: 0,
		passable,
		biomeType,
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

/** Helper: create a small board from a 2D array of TileData. */
function makeBoard(tiles: TileData[][]): GeneratedBoard {
	return {
		config: {
			width: tiles[0].length,
			height: tiles.length,
			seed: "weight-test",
			difficulty: "normal",
		},
		tiles,
	};
}

describe("isPassableFor", () => {
	it("light units can traverse wetland", () => {
		const tile = makeTile(0, 0, "wetland");
		expect(isPassableFor(tile, "light")).toBe(true);
	});

	it("medium units cannot traverse wetland", () => {
		const tile = makeTile(0, 0, "wetland");
		expect(isPassableFor(tile, "medium")).toBe(false);
	});

	it("heavy units cannot traverse wetland", () => {
		const tile = makeTile(0, 0, "wetland");
		expect(isPassableFor(tile, "heavy")).toBe(false);
	});

	it("water impassable for all weight classes", () => {
		const tile = makeTile(0, 0, "water", false);
		for (const wc of ["light", "medium", "heavy"] as WeightClass[]) {
			expect(isPassableFor(tile, wc)).toBe(false);
		}
	});

	it("mountain impassable for all weight classes", () => {
		const tile = makeTile(0, 0, "mountain", false);
		for (const wc of ["light", "medium", "heavy"] as WeightClass[]) {
			expect(isPassableFor(tile, wc)).toBe(false);
		}
	});

	it("normal tiles passable for all weight classes at cost 1", () => {
		const normalFloors: TileData["biomeType"][] = [
			"hills",
			"grassland",
			"desert",
			"forest",
			"tundra",
		];
		for (const floor of normalFloors) {
			const tile = makeTile(0, 0, floor);
			for (const wc of ["light", "medium", "heavy"] as WeightClass[]) {
				expect(isPassableFor(tile, wc)).toBe(true);
				expect(movementCost(tile, wc)).toBe(1);
			}
		}
	});
});

describe("movementCost", () => {
	it("wetland costs 2 AP for light units", () => {
		const tile = makeTile(0, 0, "wetland");
		expect(movementCost(tile, "light")).toBe(2);
	});

	it("normal tile costs 1 AP for all weight classes", () => {
		const tile = makeTile(0, 0, "hills");
		for (const wc of ["light", "medium", "heavy"] as WeightClass[]) {
			expect(movementCost(tile, wc)).toBe(1);
		}
	});
});

describe("reachableTiles with weightClass", () => {
	it("light unit can reach wetland tiles (costs 2 AP)", () => {
		// Layout: [hills] [wetland] [hills]
		const tiles = [
			[
				makeTile(0, 0, "hills"),
				makeTile(1, 0, "wetland"),
				makeTile(2, 0, "hills"),
			],
		];
		const board = makeBoard(tiles);

		// With 2 AP, light can reach the abyssal tile (cost 2)
		const reachable = reachableTiles(0, 0, 2, board, "light");
		expect(reachable.has("0,0")).toBe(true);
		expect(reachable.has("1,0")).toBe(true);

		// With 1 AP, light cannot reach it (cost 2 > 1)
		const reachable1 = reachableTiles(0, 0, 1, board, "light");
		expect(reachable1.has("0,0")).toBe(true);
		expect(reachable1.has("1,0")).toBe(false);
	});

	it("medium unit cannot reach wetland tiles", () => {
		const tiles = [
			[
				makeTile(0, 0, "hills"),
				makeTile(1, 0, "wetland"),
				makeTile(2, 0, "hills"),
			],
		];
		const board = makeBoard(tiles);

		const reachable = reachableTiles(0, 0, 5, board, "medium");
		expect(reachable.has("0,0")).toBe(true);
		expect(reachable.has("1,0")).toBe(false);
		// Can't reach tile 2,0 because abyssal blocks medium
		expect(reachable.has("2,0")).toBe(false);
	});

	it("light unit traversal through abyssal costs accumulate correctly", () => {
		// 3-tile row: transit(1) -> abyssal(2) -> transit(1) = need 4 AP to reach tile 2
		const tiles = [
			[
				makeTile(0, 0, "hills"),
				makeTile(1, 0, "wetland"),
				makeTile(2, 0, "hills"),
			],
		];
		const board = makeBoard(tiles);

		// 3 AP: can reach abyssal (cost 2) but not beyond (2+1=3, exactly enough)
		const reachable3 = reachableTiles(0, 0, 3, board, "light");
		expect(reachable3.has("2,0")).toBe(true);

		// 2 AP: can reach abyssal (cost 2) but not transit beyond (2+1=3 > 2)
		const reachable2 = reachableTiles(0, 0, 2, board, "light");
		expect(reachable2.has("1,0")).toBe(true);
		expect(reachable2.has("2,0")).toBe(false);
	});
});
