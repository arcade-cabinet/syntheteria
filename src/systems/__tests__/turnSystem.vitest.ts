import { createWorld } from "koota";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	Board,
	UnitAttack,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../traits";
import { advanceTurn, getCurrentTurn } from "../turnSystem";

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
				biomeType: "grassland",
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

	it("advanceTurn does not refresh AI AP when AI has no resources", () => {
		const e = world.spawn(
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 0,
				maxAp: 3,
				mp: 0,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitFaction({ factionId: "reclaimers" }),
			UnitPos({ tileX: 10, tileZ: 10 }),
		);

		// AI unit has ap=0 AND mp=0, so runYukaAiTurns skips it (no snapshots).
		// The turnSystem itself only refreshes player AP/MP.
		world.spawn(
			Board({ width: 10, height: 10, seed: "test", tileSizeM: 2, turn: 1 }),
		);
		advanceTurn(world, board);

		expect(e.get(UnitStats)!.ap).toBe(0);
		expect(e.get(UnitStats)!.mp).toBe(0);
	});

	it("resolves player attacks before AI acts", () => {
		// Player has a pending attack on an AI unit
		const aiUnit = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 4,
				defense: 0,
			}),
			UnitAttack({ targetEntityId: aiUnit.id(), damage: 0 }),
		);

		world.spawn(
			Board({ width: 10, height: 10, seed: "test", tileSizeM: 2, turn: 1 }),
		);
		advanceTurn(world, board);

		// AI unit took 4 damage from player attack (10→6), then AI attacks player
		// in phase 2 and player counterattacks AI for floor(4*0.5)-0 = 2 damage (6→4)
		const stats = aiUnit.get(UnitStats);
		expect(stats!.hp).toBe(4);
	});

	it("multi-phase turn runs all phases in sequence", () => {
		world.spawn(
			Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
		);

		// Player unit with 0 AP
		const player = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 0,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		advanceTurn(world, board);

		// Turn should increment
		expect(getCurrentTurn(world)).toBe(2);
		// Player AP should be refreshed
		expect(player.get(UnitStats)!.ap).toBe(3);
	});
});
