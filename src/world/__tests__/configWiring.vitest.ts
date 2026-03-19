import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { generateBoard } from "../../board/generator";
import type { BoardConfig, GeneratedBoard, TileData } from "../../board/types";
import { initFactions } from "../../ecs/factions/init";
import { runAiTurns } from "../../ecs/systems/aiTurnSystem";
import {
	_reset,
	checkCultistSpawn,
	getStormCultistParams,
} from "../../ecs/systems/cultistSystem";
import { floorTypeForTile } from "../../ecs/terrain/cluster";
import { Board } from "../../ecs/traits/board";
import { Faction } from "../../ecs/traits/faction";
import { ResourcePool } from "../../ecs/traits/resource";
import {
	UnitAttack,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../ecs/traits/unit";
import type { ClimateProfile, Difficulty, StormProfile } from "../config";
import { CLIMATE_PROFILE_SPECS } from "../config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function spawnBoardEntity(
	world: ReturnType<typeof createWorld>,
	storm: StormProfile = "volatile",
	difficulty: Difficulty = "standard",
	climate: ClimateProfile = "temperate",
): void {
	world.spawn(
		Board({
			width: 16,
			height: 16,
			seed: "test",
			tileSizeM: 2.0,
			turn: 1,
			climateProfile: climate,
			stormProfile: storm,
			difficulty,
		}),
	);
}

function spawnPlayerUnit(world: ReturnType<typeof createWorld>): void {
	world.spawn(
		UnitPos({ tileX: 5, tileZ: 5 }),
		UnitFaction({ factionId: "player" }),
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
}

function countCultists(world: ReturnType<typeof createWorld>): number {
	const cultIds = ["static_remnants", "null_monks", "lost_signal"];
	let count = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && cultIds.includes(f.factionId)) count++;
	}
	return count;
}

// ---------------------------------------------------------------------------
// Task #11: Climate profiles — config wiring (BSP generator)
// ---------------------------------------------------------------------------

describe("climate profiles config wiring", () => {
	const seed = "climate-test-seed-42";
	const SIZE = 64;

	it("CLIMATE_PROFILE_SPECS has correct waterLevel values", () => {
		expect(CLIMATE_PROFILE_SPECS.temperate.waterLevel).toBe(0.35);
		expect(CLIMATE_PROFILE_SPECS.wet.waterLevel).toBe(0.55);
		expect(CLIMATE_PROFILE_SPECS.arid.waterLevel).toBe(0.15);
		expect(CLIMATE_PROFILE_SPECS.frozen.waterLevel).toBe(0.45);
	});

	it("floorTypeForTile respects waterLevel parameter", () => {
		// With a very high waterLevel, more tiles should be abyssal
		let highWaterAbyssal = 0;
		let lowWaterAbyssal = 0;
		for (let x = 0; x < 32; x++) {
			for (let z = 0; z < 32; z++) {
				if (floorTypeForTile(x, z, 0, seed, 0.8) === "abyssal_platform")
					highWaterAbyssal++;
				if (floorTypeForTile(x, z, 0, seed, 0.1) === "abyssal_platform")
					lowWaterAbyssal++;
			}
		}
		expect(highWaterAbyssal).toBeGreaterThan(lowWaterAbyssal);
	});

	it("default climate profile in BoardConfig is temperate when omitted", () => {
		const config: BoardConfig = {
			width: 16,
			height: 16,
			seed,
			difficulty: "normal",
		};
		const board = generateBoard(config);
		// Should generate without error
		expect(board.tiles.length).toBe(16);
	});

	it("generateBoard accepts all climate profiles without error", () => {
		for (const climate of ["temperate", "wet", "arid", "frozen"] as const) {
			const config: BoardConfig = {
				width: SIZE,
				height: SIZE,
				seed,
				difficulty: "normal",
				climateProfile: climate,
			};
			const board = generateBoard(config);
			expect(board.tiles.length).toBe(SIZE);
			expect(board.tiles[0]!.length).toBe(SIZE);
		}
	});

	it("BSP generator produces structural_mass perimeters on all climate profiles", () => {
		for (const climate of ["temperate", "wet", "arid", "frozen"] as const) {
			const config: BoardConfig = {
				width: SIZE,
				height: SIZE,
				seed,
				difficulty: "normal",
				climateProfile: climate,
			};
			const board = generateBoard(config);
			let structuralCount = 0;
			for (let z = 0; z < board.config.height; z++) {
				for (let x = 0; x < board.config.width; x++) {
					if (board.tiles[z]![x]!.floorType === "structural_mass")
						structuralCount++;
				}
			}
			// BSP always produces structural perimeters — at least 10% of tiles
			expect(structuralCount / (SIZE * SIZE)).toBeGreaterThanOrEqual(0.1);
		}
	});
});

// ---------------------------------------------------------------------------
// Task #12: Storm profiles affect cultist spawning
// ---------------------------------------------------------------------------

describe("storm profiles affect cultist spawning", () => {
	let world: ReturnType<typeof createWorld>;
	let board: GeneratedBoard;

	beforeEach(() => {
		_reset();
		world = createWorld();
		board = makeBoard(16, 16);
	});

	it("stable storm: grace period is 7 turns, not 5", () => {
		spawnBoardEntity(world, "stable");
		spawnPlayerUnit(world);

		// Turn 5 should NOT spawn (stable grace = 7)
		checkCultistSpawn(world, board, 5);
		expect(countCultists(world)).toBe(0);

		// Turn 7 SHOULD spawn
		checkCultistSpawn(world, board, 7);
		expect(countCultists(world)).toBeGreaterThan(0);
	});

	it("cataclysmic storm: grace period is 3 turns", () => {
		spawnBoardEntity(world, "cataclysmic");
		spawnPlayerUnit(world);

		// Turn 3 should spawn (cataclysmic grace = 3)
		checkCultistSpawn(world, board, 3);
		expect(countCultists(world)).toBeGreaterThan(0);
	});

	it("cataclysmic storm allows more total cultists (20)", () => {
		spawnBoardEntity(world, "cataclysmic");

		// Need 100+ player units to reach escalation tier 4 (tierMax=18)
		// so that effectiveMax = min(20, 18) = 18 > 12
		for (let i = 0; i < 100; i++) {
			world.spawn(
				UnitPos({ tileX: i % 16, tileZ: Math.floor(i / 16) }),
				UnitFaction({ factionId: "player" }),
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
		}

		// Pre-spawn 12 cultists (normal cap)
		for (let i = 0; i < 12; i++) {
			world.spawn(
				UnitPos({ tileX: i, tileZ: 15 }),
				UnitFaction({ factionId: "static_remnants" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
				}),
			);
		}

		// With cataclysmic + tier 4, should still be able to spawn more (cap = min(20, 18) = 18)
		// Use turn 4 — interval=2 at max escalation, so 4%2=0 triggers spawn
		checkCultistSpawn(world, board, 4);
		expect(countCultists(world)).toBeGreaterThan(12);
	});

	it("volatile storm uses default parameters", () => {
		spawnBoardEntity(world, "volatile");
		spawnPlayerUnit(world);

		// Turn 5 should spawn (default grace period = 5)
		checkCultistSpawn(world, board, 5);
		expect(countCultists(world)).toBeGreaterThan(0);
	});

	it("getStormCultistParams returns correct values", () => {
		const stable = getStormCultistParams("stable");
		expect(stable.baseSpawnInterval).toBe(7);
		expect(stable.maxWaveSize).toBe(2);

		const volatile = getStormCultistParams("volatile");
		expect(volatile.baseSpawnInterval).toBe(5);
		expect(volatile.maxWaveSize).toBe(4);

		const cataclysmic = getStormCultistParams("cataclysmic");
		expect(cataclysmic.baseSpawnInterval).toBe(3);
		expect(cataclysmic.maxWaveSize).toBe(6);
		expect(cataclysmic.maxTotalCultists).toBe(20);
	});

	it("stable storm: cap at 12 cultists is unchanged", () => {
		spawnBoardEntity(world, "stable");
		spawnPlayerUnit(world);

		// Pre-spawn 12 cultists
		for (let i = 0; i < 12; i++) {
			world.spawn(
				UnitPos({ tileX: i, tileZ: 0 }),
				UnitFaction({ factionId: "static_remnants" }),
				UnitStats({
					hp: 6,
					maxHp: 6,
					ap: 2,
					maxAp: 2,
					scanRange: 3,
					attack: 3,
					defense: 0,
				}),
			);
		}

		checkCultistSpawn(world, board, 7);
		expect(countCultists(world)).toBe(12);
	});
});

// ---------------------------------------------------------------------------
// Task #13: Difficulty affects resources + AI aggression
// ---------------------------------------------------------------------------

describe("difficulty affects resources and AI aggression", () => {
	describe("starter resources", () => {
		it("story difficulty gives player 2x starter resources", () => {
			const world = createWorld();
			initFactions(world, "story");

			for (const e of world.query(Faction, ResourcePool)) {
				const f = e.get(Faction);
				const r = e.get(ResourcePool);
				if (f?.isPlayer && r) {
					expect(r.scrap_metal).toBe(20); // 10 * 2
					expect(r.ferrous_scrap).toBe(10); // 5 * 2
				}
			}
		});

		it("standard difficulty gives player default starter resources", () => {
			const world = createWorld();
			initFactions(world, "standard");

			for (const e of world.query(Faction, ResourcePool)) {
				const f = e.get(Faction);
				const r = e.get(ResourcePool);
				if (f?.isPlayer && r) {
					expect(r.scrap_metal).toBe(10);
					expect(r.ferrous_scrap).toBe(5);
				}
			}
		});

		it("hard difficulty gives player 0.5x starter resources", () => {
			const world = createWorld();
			initFactions(world, "hard");

			for (const e of world.query(Faction, ResourcePool)) {
				const f = e.get(Faction);
				const r = e.get(ResourcePool);
				if (f?.isPlayer && r) {
					expect(r.scrap_metal).toBe(5); // 10 * 0.5
					expect(r.ferrous_scrap).toBe(3); // Math.round(5 * 0.5)
				}
			}
		});

		it("AI faction resources are NOT affected by difficulty", () => {
			for (const diff of ["story", "standard", "hard"] as Difficulty[]) {
				const world = createWorld();
				initFactions(world, diff);

				for (const e of world.query(Faction, ResourcePool)) {
					const f = e.get(Faction);
					const r = e.get(ResourcePool);
					if (f && !f.isPlayer && r) {
						expect(r.scrap_metal).toBe(30);
						expect(r.ferrous_scrap).toBe(30);
						expect(r.alloy_stock).toBe(12);
					}
				}
			}
		});
	});

	describe("AI aggression", () => {
		function makeAiTestWorld(difficulty: Difficulty) {
			const world = createWorld();
			spawnBoardEntity(world, "volatile", difficulty);

			// AI at (0,0), player at (4,0) — far enough for movement, not attack
			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 8 }),
			);
			world.spawn(
				UnitPos({ tileX: 4, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
			);

			return world;
		}

		it("story difficulty: AI governor runs without errors", () => {
			const world = makeAiTestWorld("story");
			const board = makeBoard(8, 8);
			// GOAP makes strategic decisions — just verify it runs without throwing
			expect(() => runAiTurns(world, board)).not.toThrow();
		});

		it("story difficulty: volt_collective stops moving (aggression 1*0.5=0.5 < 1)", () => {
			const world = createWorld();
			spawnBoardEntity(world, "volatile", "story");

			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "volt_collective" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 8 }),
			);
			world.spawn(
				UnitPos({ tileX: 4, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
			);

			const board = makeBoard(8, 8);
			runAiTurns(world, board);

			// volt_collective aggression=1, *0.5=0.5, 0.5 < 1 → should NOT move
			for (const e of world.query(UnitPos, UnitFaction)) {
				const f = e.get(UnitFaction);
				const p = e.get(UnitPos);
				if (f?.factionId === "volt_collective") {
					expect(p?.tileX).toBe(0); // did not move
				}
			}
		});

		it("hard difficulty: AI governor runs without errors", () => {
			const world = makeAiTestWorld("hard");
			const board = makeBoard(8, 8);
			// GOAP makes strategic decisions — just verify it runs without throwing
			expect(() => runAiTurns(world, board)).not.toThrow();
		});

		it("Board trait stores difficulty correctly", () => {
			const world = createWorld();
			spawnBoardEntity(world, "volatile", "hard");

			for (const e of world.query(Board)) {
				const b = e.get(Board);
				expect(b?.difficulty).toBe("hard");
			}
		});
	});
});
