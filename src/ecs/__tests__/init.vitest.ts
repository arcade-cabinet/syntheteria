import type { World } from "koota";
import { createWorld } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import { generateBoard } from "../../board/generator";
import { FACTION_DEFINITIONS } from "../factions/definitions";
import { initWorldFromBoard } from "../init";
import { Board } from "../traits/board";
import { Faction } from "../traits/faction";
import { ResourceDeposit } from "../traits/resource";
import { Tile, TileHighlight } from "../traits/tile";
import { UnitFaction } from "../traits/unit";

describe("initWorldFromBoard", () => {
	let world: World;

	afterEach(() => {
		world.destroy();
	});

	describe("Board singleton", () => {
		it("creates exactly one Board entity", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board);

			expect(world.query(Board).length).toBe(1);
		});

		it("Board entity has matching width, height, and seed", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board);

			const boardEntities = world.query(Board);
			const data = boardEntities[0].get(Board);
			expect(data).toBeDefined();
			expect(data!.width).toBe(8);
			expect(data!.height).toBe(8);
			expect(data!.seed).toBe("init-test");
		});

		it("Board entity starts at turn 1", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board);

			const boardEntities = world.query(Board);
			const data = boardEntities[0].get(Board);
			expect(data!.turn).toBe(1);
		});
	});

	describe("Tile count", () => {
		it("creates width * height Tile entities", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board);

			expect(world.query(Tile).length).toBe(8 * 8);
		});
	});

	describe("TileHighlight", () => {
		it("every Tile entity also has TileHighlight", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board);

			expect(world.query(Tile, TileHighlight).length).toBe(8 * 8);
		});
	});

	describe("ResourceDeposit count", () => {
		it("matches the number of tiles with non-null resourceMaterial", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			const expectedDeposits = board.tiles
				.flat()
				.filter((t) => t.resourceMaterial !== null).length;
			initWorldFromBoard(world, board);

			expect(world.query(ResourceDeposit).length).toBe(expectedDeposits);
		});
	});

	describe("Faction entities", () => {
		it("creates exactly 5 Faction entities matching FACTION_DEFINITIONS", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board);

			// 4 factions, all as AI (no player selected = no factionSlots passed)
			expect(world.query(Faction).length).toBe(FACTION_DEFINITIONS.length);
			expect(world.query(Faction).length).toBe(4);
		});

		it("player faction entity exists when factionSlots are provided", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board, {
				factionSlots: [
					{ factionId: "reclaimers", role: "player" },
					{ factionId: "volt_collective", role: "ai" },
					{ factionId: "signal_choir", role: "ai" },
					{ factionId: "iron_creed", role: "ai" },
				],
			});

			let foundPlayer = false;
			for (const e of world.query(Faction)) {
				const f = e.get(Faction);
				if (f?.id === "player") {
					foundPlayer = true;
					break;
				}
			}
			expect(foundPlayer).toBe(true);
		});
	});

	describe("Robot placement", () => {
		it("places at least one player robot (UnitFaction with factionId 'player')", () => {
			world = createWorld();
			const board = generateBoard({
				width: 8,
				height: 8,
				seed: "init-test",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board, {
				factionSlots: [
					{ factionId: "reclaimers", role: "player" },
					{ factionId: "volt_collective", role: "ai" },
					{ factionId: "signal_choir", role: "ai" },
					{ factionId: "iron_creed", role: "ai" },
				],
			});

			let foundPlayerUnit = false;
			for (const e of world.query(UnitFaction)) {
				const uf = e.get(UnitFaction);
				if (uf?.factionId === "player") {
					foundPlayerUnit = true;
					break;
				}
			}
			expect(foundPlayerUnit).toBe(true);
		});
	});

	describe("Multiple board sizes", () => {
		it("16×16 board produces 256 Tile entities", () => {
			world = createWorld();
			const board = generateBoard({
				width: 16,
				height: 16,
				seed: "init-test-16",
				difficulty: "normal",
			});
			initWorldFromBoard(world, board);

			expect(world.query(Tile).length).toBe(256);
		});
	});
});
