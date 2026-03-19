/**
 * Density verification tests.
 *
 * Validates that the Rooms-and-Mazes labyrinth generator produces
 * terrain distributions within design targets:
 *   - structural_mass: 40-75% of total tiles (maze walls + room perimeters)
 *   - salvage props: 15-30% of passable tiles
 *   - passable tiles: at least 20% of total (rooms + corridors + connectors)
 *
 * The labyrinth has higher wall density than BSP because corridors are
 * 1-tile wide separated by walls, and rooms have wall perimeters.
 *
 * Uses a 64x64 board across multiple seeds to reduce noise sensitivity.
 */

import { createWorld } from "koota";
import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import type { BoardConfig } from "../types";
import { isPassableFloor } from "../../ecs/terrain/types";
import { SalvageProp } from "../../ecs/traits/salvage";
import { placeSalvageProps } from "../../ecs/systems/salvagePlacement";

const SEEDS = ["density-alpha", "density-beta", "density-gamma"];

function makeConfig(seed: string): BoardConfig {
	return { width: 64, height: 64, seed, difficulty: "normal" };
}

describe("density verification", () => {
	it("structural_mass covers 40-75% of the board (labyrinth maze walls)", () => {
		for (const seed of SEEDS) {
			const board = generateBoard(makeConfig(seed));
			const total = board.config.width * board.config.height;
			let structuralCount = 0;

			for (let z = 0; z < board.config.height; z++) {
				for (let x = 0; x < board.config.width; x++) {
					if (board.tiles[z]![x]!.floorType === "structural_mass") {
						structuralCount++;
					}
				}
			}

			const ratio = structuralCount / total;
			expect(
				ratio,
				`seed "${seed}": structural_mass ${(ratio * 100).toFixed(1)}% — expected 40-75%`,
			).toBeGreaterThanOrEqual(0.40);
			expect(
				ratio,
				`seed "${seed}": structural_mass ${(ratio * 100).toFixed(1)}% — expected 40-75%`,
			).toBeLessThanOrEqual(0.75);
		}
	});

	it("salvage props cover 15-30% of passable tiles", () => {
		for (const seed of SEEDS) {
			const board = generateBoard(makeConfig(seed));
			let passableCount = 0;

			for (let z = 0; z < board.config.height; z++) {
				for (let x = 0; x < board.config.width; x++) {
					if (isPassableFloor(board.tiles[z]![x]!.floorType)) {
						passableCount++;
					}
				}
			}

			const world = createWorld();
			placeSalvageProps(world, board);

			// Count only salvage on passable tiles
			let passableSalvage = 0;
			for (const entity of world.query(SalvageProp)) {
				const prop = entity.get(SalvageProp)!;
				const tile = board.tiles[prop.tileZ]![prop.tileX]!;
				if (isPassableFloor(tile.floorType)) passableSalvage++;
			}
			world.destroy();

			const ratio = passableSalvage / passableCount;
			expect(
				ratio,
				`seed "${seed}": salvage ${(ratio * 100).toFixed(1)}% of passable — expected 15-30%`,
			).toBeGreaterThanOrEqual(0.15);
			expect(
				ratio,
				`seed "${seed}": salvage ${(ratio * 100).toFixed(1)}% of passable — expected 15-30%`,
			).toBeLessThanOrEqual(0.30);
		}
	});

	it("at least 20% of tiles are passable (rooms + corridors + connectors)", () => {
		for (const seed of SEEDS) {
			const board = generateBoard(makeConfig(seed));
			const total = board.config.width * board.config.height;
			let passableCount = 0;

			for (let z = 0; z < board.config.height; z++) {
				for (let x = 0; x < board.config.width; x++) {
					if (board.tiles[z]![x]!.passable) {
						passableCount++;
					}
				}
			}

			const ratio = passableCount / total;
			expect(
				ratio,
				`seed "${seed}": passable ${(ratio * 100).toFixed(1)}% — expected >= 20%`,
			).toBeGreaterThanOrEqual(0.20);
		}
	});
});
