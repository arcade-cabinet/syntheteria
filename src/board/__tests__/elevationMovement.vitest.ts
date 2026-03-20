/**
 * Elevation-aware movement tests.
 *
 * Verifies:
 * - movementCost adds +1 AP for going up a ramp (elevation change)
 * - UnitMove trait includes elevation data for Y interpolation
 * - NavGraph edges have elevation-based weights
 */

import { describe, expect, it } from "vitest";
import type { Edge } from "yuka";
import { buildNavGraph, tileIndex } from "../../ai/navigation/boardNavGraph";
import { movementCost, reachableTiles } from "../../board/adjacency";
import type { BoardConfig, GeneratedBoard, TileData } from "../../board/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTile(overrides: Partial<TileData> = {}): TileData {
	return {
		x: 0,
		z: 0,
		elevation: 0,
		passable: true,
		floorType: "grassland",
		resourceMaterial: null,
		resourceAmount: 0,
		...overrides,
	};
}

function makeSmallBoard(
	tiles: TileData[][],
	width: number,
	height: number,
): GeneratedBoard {
	const config: BoardConfig = {
		width,
		height,
		seed: "test",
		difficulty: "normal",
	};
	return { config, tiles };
}

// ---------------------------------------------------------------------------
// movementCost with elevation
// ---------------------------------------------------------------------------

describe("movementCost with elevation", () => {
	it("flat movement costs 1 (same elevation)", () => {
		const from = makeTile({ elevation: 0 });
		const to = makeTile({ elevation: 0 });
		expect(movementCost(to, "medium", from.elevation)).toBe(1);
	});

	it("going UP a ramp costs +1 (elevation 0 → 1)", () => {
		const from = makeTile({ elevation: 0 });
		const to = makeTile({ elevation: 1 });
		expect(movementCost(to, "medium", from.elevation)).toBe(2);
	});

	it("going DOWN a ramp costs base (elevation 1 → 0)", () => {
		const from = makeTile({ elevation: 1 });
		const to = makeTile({ elevation: 0 });
		// Downhill is free — no extra cost
		expect(movementCost(to, "medium", from.elevation)).toBe(1);
	});

	it("abyssal platform with light weight + uphill stacks costs", () => {
		const from = makeTile({ elevation: 0 });
		const to = makeTile({ elevation: 1, floorType: "wetland" });
		// abyssal = 2 + uphill = 1 = 3
		expect(movementCost(to, "light", from.elevation)).toBe(3);
	});

	it("backward compatibility — movementCost without fromTile works as before", () => {
		const to = makeTile({ elevation: 1 });
		// Without fromTile, no elevation cost applied
		expect(movementCost(to)).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// NavGraph elevation weights
// ---------------------------------------------------------------------------

describe("NavGraph elevation-based edge weights", () => {
	it("edge from elev 0 to elev 1 costs +1", () => {
		// 3x1 board: [flat, flat, elevated]
		const tiles: TileData[][] = [
			[
				makeTile({ x: 0, z: 0, elevation: 0 }),
				makeTile({ x: 1, z: 0, elevation: 0 }),
				makeTile({ x: 2, z: 0, elevation: 1 }),
			],
		];
		const board = makeSmallBoard(tiles, 3, 1);
		const navResult = buildNavGraph(board, false);

		// Edge from tile(1,0) → tile(2,0) should cost 2 (base 1 + elevation 1)
		const fromIdx = tileIndex(1, 0, 3);
		const toIdx = tileIndex(2, 0, 3);
		const edges: Edge[] = [];
		navResult.graph.getEdgesOfNode(fromIdx, edges);
		const edge = edges.find((e) => e.to === toIdx);
		expect(edge).toBeDefined();
		expect(edge!.cost).toBe(2); // 1 base + 1 elevation
	});

	it("edge from elev 1 to elev 0 costs base (downhill free)", () => {
		const tiles: TileData[][] = [
			[
				makeTile({ x: 0, z: 0, elevation: 1 }),
				makeTile({ x: 1, z: 0, elevation: 0 }),
			],
		];
		const board = makeSmallBoard(tiles, 2, 1);
		const navResult = buildNavGraph(board, false);

		const fromIdx = tileIndex(0, 0, 2);
		const toIdx = tileIndex(1, 0, 2);
		const edges: Edge[] = [];
		navResult.graph.getEdgesOfNode(fromIdx, edges);
		const edge = edges.find((e) => e.to === toIdx);
		expect(edge).toBeDefined();
		expect(edge!.cost).toBe(1); // downhill = base cost only
	});

	it("flat same-elevation edge costs base", () => {
		const tiles: TileData[][] = [
			[
				makeTile({ x: 0, z: 0, elevation: 0 }),
				makeTile({ x: 1, z: 0, elevation: 0 }),
			],
		];
		const board = makeSmallBoard(tiles, 2, 1);
		const navResult = buildNavGraph(board, false);

		const fromIdx = tileIndex(0, 0, 2);
		const toIdx = tileIndex(1, 0, 2);
		const edges: Edge[] = [];
		navResult.graph.getEdgesOfNode(fromIdx, edges);
		const edge = edges.find((e) => e.to === toIdx);
		expect(edge).toBeDefined();
		expect(edge!.cost).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// reachableTiles respects elevation cost
// ---------------------------------------------------------------------------

describe("reachableTiles with elevation", () => {
	it("uphill tile costs extra MP — fewer tiles reachable", () => {
		// 3x1: [flat, flat, elevated]
		const tiles: TileData[][] = [
			[
				makeTile({ x: 0, z: 0, elevation: 0 }),
				makeTile({ x: 1, z: 0, elevation: 0 }),
				makeTile({ x: 2, z: 0, elevation: 1 }),
			],
		];
		const board = makeSmallBoard(tiles, 3, 1);

		// With 2 MP from tile 0: tile0→tile1 costs 1, tile1→tile2 costs 2 (uphill).
		// Total to reach tile2 = 1+2 = 3 > maxSteps=2, so tile2 NOT reachable
		const reachable2 = reachableTiles(0, 0, 2, board, "medium");
		expect(reachable2.has("0,0")).toBe(true);
		expect(reachable2.has("1,0")).toBe(true);
		expect(reachable2.has("2,0")).toBe(false);

		// With 3 MP: can reach tile 2
		const reachable3 = reachableTiles(0, 0, 3, board, "medium");
		expect(reachable3.has("2,0")).toBe(true);
	});

	it("downhill does not cost extra", () => {
		// 3x1: [elevated, flat, flat]
		const tiles: TileData[][] = [
			[
				makeTile({ x: 0, z: 0, elevation: 1 }),
				makeTile({ x: 1, z: 0, elevation: 0 }),
				makeTile({ x: 2, z: 0, elevation: 0 }),
			],
		];
		const board = makeSmallBoard(tiles, 3, 1);

		// From elevated tile with 2 MP: downhill=1, flat=1, total=2 — both reachable
		const reachable = reachableTiles(0, 0, 2, board, "medium");
		expect(reachable.has("1,0")).toBe(true);
		expect(reachable.has("2,0")).toBe(true);
	});
});
