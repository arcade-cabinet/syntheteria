import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import { advanceTurn, getCurrentTurn } from "../systems/turnSystem";
import { Board } from "../traits/board";
import { UnitFaction, UnitStats } from "../traits/unit";

/** Build a W×H board where every tile is passable and flat. */
function makeBoard(width: number, height: number): GeneratedBoard {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				z,
				elevation: 0,
				passable: true,
				floorType: "durasteel_span",
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return {
		config: { width, height, seed: "test", difficulty: "normal" },
		tiles,
	};
}

describe("turnSystem", () => {
	let world: ReturnType<typeof createWorld>;
	let board: GeneratedBoard;

	beforeEach(() => {
		world = createWorld();
		board = makeBoard(16, 16);
	});

	it("getCurrentTurn returns 1 with no board", () => {
		expect(getCurrentTurn(world)).toBe(1);
	});

	it("getCurrentTurn reads from Board entity", () => {
		world.spawn(
			Board({ width: 10, height: 10, seed: "test", tileSizeM: 2, turn: 5 }),
		);
		expect(getCurrentTurn(world)).toBe(5);
	});

	it("advanceTurn increments turn counter", () => {
		world.spawn(
			Board({ width: 10, height: 10, seed: "test", tileSizeM: 2, turn: 1 }),
		);
		advanceTurn(world, board);
		expect(getCurrentTurn(world)).toBe(2);
	});

	it("advanceTurn refreshes player AP", () => {
		const e = world.spawn(
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 0,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitFaction({ factionId: "player" }),
		);

		world.spawn(
			Board({ width: 10, height: 10, seed: "test", tileSizeM: 2, turn: 1 }),
		);
		advanceTurn(world, board);

		expect(e.get(UnitStats)!.ap).toBe(3);
	});

	it("advanceTurn resets movesUsed and staged for player units", () => {
		const e = world.spawn(
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 0,
				maxAp: 2,
				mp: 0,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
				movesUsed: 2,
				staged: true,
			}),
			UnitFaction({ factionId: "player" }),
		);

		world.spawn(
			Board({ width: 10, height: 10, seed: "test", tileSizeM: 2, turn: 1 }),
		);
		advanceTurn(world, board);

		const stats = e.get(UnitStats)!;
		expect(stats.movesUsed).toBe(0);
		expect(stats.staged).toBe(false);
		expect(stats.ap).toBe(2);
		expect(stats.mp).toBe(3);
	});

	it("advanceTurn does not refresh AI AP (when no player present)", () => {
		const e = world.spawn(
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 0,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitFaction({ factionId: "reclaimers" }),
		);

		advanceTurn(world, board);

		expect(e.get(UnitStats)!.ap).toBe(0);
	});
});
