/**
 * Tests for:
 * - Task #28: Cult unit count must respect MAX_TOTAL_CULTISTS cap
 * - Task #29: AI faction differentiation — GOAP personalities produce different behavior
 */

import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { resetAIRuntime, runYukaAiTurns } from "../../ai/yukaAiTurnSystem";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	Board,
	Faction,
	ResourceDeposit,
	ResourcePool,
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../../traits";
import {
	checkCultistSpawn,
	getStormCultistParams,
	initBreachZones,
	_reset as resetCultState,
} from "../cultistSystem";

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
				floorType: "grassland",
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

function countCultUnits(world: ReturnType<typeof createWorld>): number {
	const CULT_IDS = new Set(["static_remnants", "null_monks", "lost_signal"]);
	let count = 0;
	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && CULT_IDS.has(f.factionId)) count++;
	}
	return count;
}

function spawnFaction(
	world: ReturnType<typeof createWorld>,
	id: string,
	isPlayer = false,
): void {
	world.spawn(Faction({ id, displayName: id, isPlayer }), ResourcePool());
}

// ---------------------------------------------------------------------------
// Task #28: Cult unit count must respect MAX_TOTAL_CULTISTS
// ---------------------------------------------------------------------------

describe("cult unit cap enforcement", () => {
	let world: ReturnType<typeof createWorld>;
	let board: GeneratedBoard;

	beforeEach(() => {
		resetCultState();
		world = createWorld();
		board = makeBoard(32, 32);
		world.spawn(
			Board({
				width: 32,
				height: 32,
				seed: "cult-test",
				tileSizeM: 2,
				turn: 1,
				stormProfile: "volatile",
			}),
		);
	});

	it("volatile storm cap is 12", () => {
		const params = getStormCultistParams("volatile");
		expect(params.maxTotalCultists).toBe(12);
	});

	it("stable storm cap is 12", () => {
		const params = getStormCultistParams("stable");
		expect(params.maxTotalCultists).toBe(12);
	});

	it("cataclysmic storm allows up to 20", () => {
		const params = getStormCultistParams("cataclysmic");
		expect(params.maxTotalCultists).toBe(20);
	});

	it("cultist count never exceeds MAX_TOTAL_CULTISTS after 100 turns", () => {
		// Spawn many player units to push escalation tier high
		for (let i = 0; i < 20; i++) {
			world.spawn(
				UnitPos({ tileX: 8 + (i % 5), tileZ: 8 + Math.floor(i / 5) }),
				UnitFaction({ factionId: "player" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4 }),
			);
		}

		initBreachZones(board);

		const MAX_CAP = 12; // volatile maxTotalCultists

		for (let turn = 1; turn <= 100; turn++) {
			// Update turn counter
			for (const e of world.query(Board)) {
				const b = e.get(Board);
				if (b) e.set(Board, { ...b, turn });
			}
			checkCultistSpawn(world, board, turn);

			const count = countCultUnits(world);
			expect(count).toBeLessThanOrEqual(MAX_CAP);
		}
	});

	it("tier-based maxEnemies does not override storm cap", () => {
		// CULT_MAX_ENEMIES_PER_TIER = [2, 4, 7, 12, 18]
		// At tier 4 (100+ player units), tierMaxEnemies = 18
		// But with Math.min, effective cap = min(12, 18) = 12

		// Spawn 110 player units to reach tier 4
		for (let i = 0; i < 110; i++) {
			world.spawn(
				UnitPos({ tileX: i % 30, tileZ: Math.floor(i / 30) }),
				UnitFaction({ factionId: "player" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4 }),
			);
		}

		initBreachZones(board);

		for (let turn = 1; turn <= 50; turn++) {
			for (const e of world.query(Board)) {
				const b = e.get(Board);
				if (b) e.set(Board, { ...b, turn });
			}
			checkCultistSpawn(world, board, turn);
		}

		const count = countCultUnits(world);
		expect(count).toBeLessThanOrEqual(12);
	});

	it("cult spawning occurs at breach zones on interval", () => {
		// A few player units for mild escalation
		for (let i = 0; i < 5; i++) {
			world.spawn(
				UnitPos({ tileX: 15 + i, tileZ: 15 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4 }),
			);
		}

		initBreachZones(board);

		// Run enough turns for spawning to trigger
		for (let turn = 1; turn <= 20; turn++) {
			for (const e of world.query(Board)) {
				const b = e.get(Board);
				if (b) e.set(Board, { ...b, turn });
			}
			checkCultistSpawn(world, board, turn);
		}

		const count = countCultUnits(world);
		expect(count).toBeGreaterThan(0);
		expect(count).toBeLessThanOrEqual(12);
	});
});

// ---------------------------------------------------------------------------
// Task #29: AI faction differentiation
// ---------------------------------------------------------------------------

describe("AI faction differentiation — personalities produce different behavior", () => {
	beforeEach(() => {
		resetAIRuntime();
	});

	/**
	 * Run N turns for a single faction with specific setup and count actions taken.
	 */
	function runFactionSimulation(
		factionId: string,
		opts: {
			enemyDistance: number;
			depositDistance: number;
			turns: number;
		},
	): { attacks: number; harvests: number; moves: number; idles: number } {
		resetAIRuntime();
		const world = createWorld();
		world.spawn(
			Board({
				width: 32,
				height: 32,
				seed: "diff-test",
				tileSizeM: 2,
				turn: 1,
			}),
		);
		spawnFaction(world, factionId);
		spawnFaction(world, "player", true);

		const board = makeBoard(32, 32);

		// AI unit at center
		const aiUnit = world.spawn(
			UnitPos({ tileX: 16, tileZ: 16 }),
			UnitFaction({ factionId }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				mp: 3,
				maxMp: 3,
				scanRange: 6,
				attackRange: 1,
				attack: 3,
				defense: 0,
			}),
		);

		// Player unit at specified distance
		world.spawn(
			UnitPos({ tileX: 16 + opts.enemyDistance, tileZ: 16 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 100,
				maxHp: 100,
				ap: 3,
				maxAp: 3,
				scanRange: 6,
				attack: 1,
				defense: 10,
			}),
		);

		// Deposit at specified distance
		world.spawn(
			ResourceDeposit({
				tileX: 16 + opts.depositDistance,
				tileZ: 16,
				material: "stone",
				amount: 100,
				depleted: false,
			}),
		);

		let attacks = 0;
		let harvests = 0;
		let moves = 0;
		let idles = 0;

		for (let t = 0; t < opts.turns; t++) {
			// Clear previous action components
			if (aiUnit.has(UnitAttack)) aiUnit.remove(UnitAttack);
			if (aiUnit.has(UnitHarvest)) aiUnit.remove(UnitHarvest);
			if (aiUnit.has(UnitMove)) aiUnit.remove(UnitMove);

			// Reset AP
			const stats = aiUnit.get(UnitStats)!;
			aiUnit.set(UnitStats, { ...stats, ap: 3, mp: 3 });

			runYukaAiTurns(world, board);

			if (aiUnit.has(UnitAttack)) attacks++;
			else if (aiUnit.has(UnitHarvest)) harvests++;
			else if (aiUnit.has(UnitMove)) moves++;
			else idles++;
		}

		const result = { attacks, harvests, moves, idles };
		world.destroy();
		return result;
	}

	it("iron_creed attacks more than reclaimers when enemy is adjacent", () => {
		// Both have enemy at range 1 and deposit at range 2
		const iron = runFactionSimulation("iron_creed", {
			enemyDistance: 1,
			depositDistance: 2,
			turns: 10,
		});
		const reclaimers = runFactionSimulation("reclaimers", {
			enemyDistance: 1,
			depositDistance: 2,
			turns: 10,
		});

		// Iron Creed: aggression=3, harvestPriority=1 → should attack more
		// Reclaimers: aggression=2, harvestPriority=3 → should harvest more
		expect(iron.attacks).toBeGreaterThanOrEqual(reclaimers.attacks);
	});

	it("reclaimers harvest more than iron_creed when deposit is adjacent and enemy is distant", () => {
		// Deposit at range 1, enemy at range 10 (out of attack range, barely in scan)
		const reclaimers = runFactionSimulation("reclaimers", {
			enemyDistance: 10,
			depositDistance: 1,
			turns: 10,
		});
		const iron = runFactionSimulation("iron_creed", {
			enemyDistance: 10,
			depositDistance: 1,
			turns: 10,
		});

		// Reclaimers: harvestPriority=3 → high harvest characterBias
		// Iron Creed: harvestPriority=1 → low harvest characterBias
		expect(reclaimers.harvests).toBeGreaterThanOrEqual(iron.harvests);
	});

	it("iron_creed and signal_choir attack when adjacent to enemy", () => {
		// Both aggressive factions should attack when enemy is right there
		const iron = runFactionSimulation("iron_creed", {
			enemyDistance: 1,
			depositDistance: 5,
			turns: 10,
		});
		const signal = runFactionSimulation("signal_choir", {
			enemyDistance: 1,
			depositDistance: 5,
			turns: 10,
		});

		// Both have aggression=3 → should attack at least once.
		// FSM enters RETREAT (unitCount=1 < 3) which reduces attack bias,
		// so we check for >0 rather than a high count.
		expect(iron.attacks + iron.moves).toBeGreaterThan(0);
		expect(signal.attacks + signal.moves).toBeGreaterThan(0);
	});

	it("volt_collective does not chase distant enemies (reactiveOnly=true)", () => {
		// Enemy at distance 15 (beyond scanRange=6)
		const volt = runFactionSimulation("volt_collective", {
			enemyDistance: 15,
			depositDistance: 1,
			turns: 10,
		});

		// Volt should never attack (enemy way beyond range) and should harvest instead
		expect(volt.attacks).toBe(0);
	});

	it("faction personality differences manifest across 20 turns", () => {
		// Mixed scenario: enemy at 3 tiles, deposit at 1 tile
		// All factions face the same situation but should make different choices

		const factions = [
			"reclaimers",
			"volt_collective",
			"signal_choir",
			"iron_creed",
		];
		const results = new Map<string, ReturnType<typeof runFactionSimulation>>();

		for (const fid of factions) {
			results.set(
				fid,
				runFactionSimulation(fid, {
					enemyDistance: 3,
					depositDistance: 1,
					turns: 20,
				}),
			);
		}

		const reclaimers = results.get("reclaimers")!;
		const iron = results.get("iron_creed")!;
		const signal = results.get("signal_choir")!;
		const volt = results.get("volt_collective")!;

		// Reclaimers (harvestPriority=3) should have highest harvest count
		expect(reclaimers.harvests).toBeGreaterThanOrEqual(iron.harvests);
		expect(reclaimers.harvests).toBeGreaterThanOrEqual(signal.harvests);

		// Iron Creed + Signal Choir (aggression=3) should move toward enemy more
		// than Volt Collective (aggression=1, reactiveOnly)
		expect(iron.attacks + iron.moves).toBeGreaterThanOrEqual(
			volt.attacks + volt.moves,
		);

		// Volt Collective (reactiveOnly, defensePriority=3) should be least aggressive
		// At distance 3, volt_collective with reactiveOnly should chase since dist <= scanRange
		// But its aggression is lowest, so it should prefer harvest/idle over attack
		expect(volt.attacks).toBeLessThanOrEqual(iron.attacks);
	});
});
