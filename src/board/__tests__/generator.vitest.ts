import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import type { BoardConfig } from "../types";

const DEFAULT_CONFIG: BoardConfig = {
	width: 32,
	height: 32,
	seed: "test-seed-alpha",
	difficulty: "normal",
};

describe("generateBoard", () => {
	it("produces identical boards from the same seed and config (determinism)", () => {
		const board1 = generateBoard(DEFAULT_CONFIG);
		const board2 = generateBoard(DEFAULT_CONFIG);

		for (let z = 0; z < DEFAULT_CONFIG.height; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.width; x++) {
				const t1 = board1.tiles[z][x];
				const t2 = board2.tiles[z][x];
				expect(t1.elevation).toBe(t2.elevation);
				expect(t1.passable).toBe(t2.passable);
				expect(t1.floorType).toBe(t2.floorType);
				expect(t1.resourceMaterial).toBe(t2.resourceMaterial);
				expect(t1.resourceAmount).toBe(t2.resourceAmount);
			}
		}
	});

	it("board dimensions match config.width x config.height", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		expect(board.tiles.length).toBe(DEFAULT_CONFIG.height);
	});

	it("tiles[z].length === config.width for all z", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		for (let z = 0; z < DEFAULT_CONFIG.height; z++) {
			expect(board.tiles[z].length).toBe(DEFAULT_CONFIG.width);
		}
	});

	it("player start tile at center-south is passable at elevation 0", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		const cx = Math.floor(DEFAULT_CONFIG.width / 2);
		const cz = Math.floor(DEFAULT_CONFIG.height * 0.65);
		const start = board.tiles[cz][cx];

		expect(start.passable).toBe(true);
		expect(start.elevation).toBe(0);
	});

	it("at least 40% of tiles are passable on a 32x32 board", () => {
		const board = generateBoard(DEFAULT_CONFIG);
		let passableCount = 0;
		const total = DEFAULT_CONFIG.width * DEFAULT_CONFIG.height;

		for (let z = 0; z < DEFAULT_CONFIG.height; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.width; x++) {
				if (board.tiles[z][x].passable) passableCount++;
			}
		}

		expect(passableCount / total).toBeGreaterThanOrEqual(0.4);
	});

	it("resource tiles have amount > 0; non-resource tiles have amount = 0", () => {
		const board = generateBoard(DEFAULT_CONFIG);

		for (let z = 0; z < DEFAULT_CONFIG.height; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.width; x++) {
				const tile = board.tiles[z][x];
				if (tile.resourceMaterial !== null) {
					expect(tile.resourceAmount).toBeGreaterThan(0);
				} else {
					expect(tile.resourceAmount).toBe(0);
				}
			}
		}
	});

	it("different seeds produce different boards", () => {
		const board1 = generateBoard({ ...DEFAULT_CONFIG, seed: "seed-one" });
		const board2 = generateBoard({ ...DEFAULT_CONFIG, seed: "seed-two" });

		let differences = 0;
		for (let z = 0; z < DEFAULT_CONFIG.height; z++) {
			for (let x = 0; x < DEFAULT_CONFIG.width; x++) {
				if (board1.tiles[z][x].elevation !== board2.tiles[z][x].elevation) {
					differences++;
				}
			}
		}

		expect(differences).toBeGreaterThan(0);
	});
});
