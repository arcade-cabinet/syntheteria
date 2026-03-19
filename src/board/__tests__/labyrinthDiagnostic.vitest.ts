/**
 * Labyrinth diagnostic test — ASCII art visualization + corridor verification.
 *
 * Generates boards at various stages of the pipeline and prints ASCII maps
 * to verify that winding corridors exist between rooms.
 */

import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import { generateLabyrinth } from "../labyrinth";
import { connectRegions, isFullyConnected } from "../labyrinthConnectivity";
import { applyLabyrinthFeatures } from "../labyrinthFeatures";
import { growingTreeMazeFill } from "../labyrinthMaze";
import { seededRng } from "../noise";
import type { BoardConfig, TileData } from "../types";

// ---------------------------------------------------------------------------
// ASCII art helpers
// ---------------------------------------------------------------------------

/**
 * Print an ASCII map of the board.
 * '#' = structural_mass (wall), '.' = passable corridor/room, 'A' = abyssal, 'V' = void
 */
function asciiMap(tiles: TileData[][]): string {
	const lines: string[] = [];
	for (const row of tiles) {
		let line = "";
		for (const t of row) {
			if (t.floorType === "structural_mass") line += "#";
			else if (t.floorType === "void_pit") line += "V";
			else if (t.floorType === "abyssal_platform") line += "~";
			else if (t.passable) line += ".";
			else line += "?";
		}
		lines.push(line);
	}
	return lines.join("\n");
}

function countByType(tiles: TileData[][]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const row of tiles) {
		for (const t of row) {
			counts[t.floorType] = (counts[t.floorType] ?? 0) + 1;
		}
	}
	return counts;
}

function countPassable(tiles: TileData[][]): number {
	let n = 0;
	for (const row of tiles) for (const t of row) if (t.passable) n++;
	return n;
}

// ---------------------------------------------------------------------------
// Phase-by-phase diagnostic
// ---------------------------------------------------------------------------

describe("labyrinth diagnostic — phase-by-phase", () => {
	const seed = "diag-test-1";
	const size = 33; // odd size for clean odd-coordinate grid
	const config: BoardConfig = {
		width: size,
		height: size,
		seed,
		difficulty: "normal",
	};

	it("Phase 1: rooms are carved into solid grid", () => {
		const board = generateLabyrinth(config);
		const passable = countPassable(board.tiles);
		const total = size * size;

		console.log("\n=== Phase 1: Room Placement ===");
		console.log(asciiMap(board.tiles));
		console.log(
			`Passable: ${passable}/${total} (${((passable / total) * 100).toFixed(1)}%)`,
		);
		console.log("Floor types:", countByType(board.tiles));

		// Rooms should exist
		expect(passable).toBeGreaterThan(0);
		// But most tiles should still be walls
		expect(passable / total).toBeLessThan(0.5);
	});

	it("Phase 2: maze corridors fill space between rooms", () => {
		const board = generateLabyrinth(config);
		const passableBefore = countPassable(board.tiles);

		const mazeRng = seededRng(seed + "_maze");
		const carved = growingTreeMazeFill(board.tiles, size, size, mazeRng);

		const passableAfter = countPassable(board.tiles);

		console.log("\n=== Phase 2: After Maze Fill ===");
		console.log(asciiMap(board.tiles));
		console.log(
			`Before maze: ${passableBefore}, After: ${passableAfter}, Carved: ${carved}`,
		);
		console.log("Floor types:", countByType(board.tiles));

		// Maze should have carved substantial corridors
		expect(carved).toBeGreaterThan(50);
		// After maze fill, passable count should roughly double from room-only state
		expect(passableAfter).toBeGreaterThan(passableBefore + 200);
	});

	it("Phase 3: regions connected", () => {
		const board = generateLabyrinth(config);
		const mazeRng = seededRng(seed + "_maze");
		growingTreeMazeFill(board.tiles, size, size, mazeRng);

		const passableBefore = countPassable(board.tiles);
		const result = connectRegions(board.tiles, size, size, seed);
		const passableAfter = countPassable(board.tiles);

		console.log("\n=== Phase 3: After Connectivity ===");
		console.log(asciiMap(board.tiles));
		console.log(
			`Regions: ${result.regionCount}, Spanning: ${result.spanningConnectors}, Loops: ${result.loopConnectors}`,
		);
		console.log(`Passable before: ${passableBefore}, after: ${passableAfter}`);

		expect(isFullyConnected(board.tiles, size, size)).toBe(true);
	});

	it("Phase 4: dead end pruning — should NOT collapse all corridors", () => {
		const board = generateLabyrinth(config);
		const mazeRng = seededRng(seed + "_maze");
		growingTreeMazeFill(board.tiles, size, size, mazeRng);
		connectRegions(board.tiles, size, size, seed);

		const passableBefore = countPassable(board.tiles);
		const result = applyLabyrinthFeatures(board.tiles, size, size, seed);
		const passableAfter = countPassable(board.tiles);

		console.log(
			"\n=== Phase 4: After Features (dead end pruning + bridges + tunnels) ===",
		);
		console.log(asciiMap(board.tiles));
		console.log(
			`Dead ends filled: ${result.deadEndsFilled}, Bridges: ${result.bridgesPlaced}, Tunnels: ${result.tunnelsPunched}`,
		);
		console.log(`Passable before: ${passableBefore}, after: ${passableAfter}`);
		console.log(
			`Corridors lost: ${passableBefore - passableAfter} (${(((passableBefore - passableAfter) / passableBefore) * 100).toFixed(1)}%)`,
		);
		console.log("Floor types:", countByType(board.tiles));

		// CRITICAL: dead end pruning should not remove more than 50% of passable tiles
		// If it does, the labyrinth is collapsing back into rectangular compounds
		const lossPercent = (passableBefore - passableAfter) / passableBefore;
		expect(lossPercent).toBeLessThan(0.5);

		// After pruning, there should still be corridor tiles (transit_deck)
		// If only room floor types remain, corridors were fully pruned
		const types = countByType(board.tiles);
		const corridorCount = types["transit_deck"] ?? 0;
		console.log(`Remaining corridor tiles (transit_deck): ${corridorCount}`);

		// Corridors must survive pruning
		expect(corridorCount).toBeGreaterThan(10);
	});

	it("Full pipeline: final board has winding corridors", () => {
		const board = generateBoard(config);
		const passable = countPassable(board.tiles);
		const total = size * size;

		console.log("\n=== Full Pipeline: Final Board ===");
		console.log(asciiMap(board.tiles));
		console.log(
			`Passable: ${passable}/${total} (${((passable / total) * 100).toFixed(1)}%)`,
		);
		console.log("Floor types:", countByType(board.tiles));

		// The final board should have a good mix of walls and passable space
		expect(passable / total).toBeGreaterThan(0.15);
		expect(passable / total).toBeLessThan(0.85);

		// Verify corridors (not just rooms) exist by checking for 1-wide passages
		let corridorTileCount = 0;
		const { width, height } = board.config;
		for (let z = 1; z < height - 1; z++) {
			for (let x = 1; x < width - 1; x++) {
				const t = board.tiles[z]![x]!;
				if (!t.passable) continue;

				// Count passable cardinal neighbors
				let passableNeighbors = 0;
				if (board.tiles[z - 1]![x]!.passable) passableNeighbors++;
				if (board.tiles[z + 1]![x]!.passable) passableNeighbors++;
				if (board.tiles[z]![x - 1]!.passable) passableNeighbors++;
				if (board.tiles[z]![x + 1]!.passable) passableNeighbors++;

				// A corridor tile has exactly 2 passable neighbors (forming a path)
				if (passableNeighbors === 2) corridorTileCount++;
			}
		}

		console.log(
			`Corridor-like tiles (2 passable neighbors): ${corridorTileCount}`,
		);
		expect(corridorTileCount).toBeGreaterThan(20);
	});
});

// ---------------------------------------------------------------------------
// Board size alignment test
// ---------------------------------------------------------------------------

describe("odd-coordinate grid alignment with board sizes", () => {
	for (const size of [16, 32, 44, 64]) {
		it(`size ${size}: maze fills correctly despite even board size`, () => {
			const config: BoardConfig = {
				width: size,
				height: size,
				seed: `align-${size}`,
				difficulty: "normal",
			};
			const board = generateLabyrinth(config);
			const mazeRng = seededRng(`align-${size}_maze`);
			const carved = growingTreeMazeFill(board.tiles, size, size, mazeRng);

			// Every odd cell within bounds should be carved (passable)
			let oddCells = 0;
			let carvedOddCells = 0;
			for (let z = 1; z < size; z += 2) {
				for (let x = 1; x < size; x += 2) {
					oddCells++;
					if (board.tiles[z]![x]!.passable) carvedOddCells++;
				}
			}

			console.log(
				`Size ${size}: ${carvedOddCells}/${oddCells} odd cells carved, total carved: ${carved}`,
			);

			// All odd cells should be either room cells or maze cells (all passable)
			expect(carvedOddCells).toBe(oddCells);
		});
	}
});

// ---------------------------------------------------------------------------
// Dead end pruning severity
// ---------------------------------------------------------------------------

describe("dead end pruning severity", () => {
	it("measures how much pruning removes at default board size 32x32", () => {
		const config: BoardConfig = {
			width: 32,
			height: 32,
			seed: "prune-severity",
			difficulty: "normal",
		};
		const board = generateLabyrinth(config);
		const mazeRng = seededRng("prune-severity_maze");
		growingTreeMazeFill(board.tiles, 32, 32, mazeRng);
		connectRegions(board.tiles, 32, 32, "prune-severity");

		const passableBefore = countPassable(board.tiles);
		const result = applyLabyrinthFeatures(
			board.tiles,
			32,
			32,
			"prune-severity",
		);
		const passableAfter = countPassable(board.tiles);
		const lossPercent =
			((passableBefore - passableAfter) / passableBefore) * 100;

		console.log(
			`\n32x32 pruning: ${result.deadEndsFilled} dead ends filled (${lossPercent.toFixed(1)}% of passable tiles lost)`,
		);
		console.log(asciiMap(board.tiles));

		// This is the KEY diagnostic — if >60% is pruned, the maze is collapsing
		if (lossPercent > 60) {
			console.error(
				"WARNING: Dead end pruning is too aggressive — corridors are being collapsed!",
			);
		}

		expect(lossPercent).toBeLessThan(70);
	});
});
