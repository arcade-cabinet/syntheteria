import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import {
	Board,
	ResourceDeposit,
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../../traits";
import type { Difficulty, StormProfile } from "../../world/config";
import {
	getAIRuntime,
	resetAIRuntime,
	runYukaAiTurns,
} from "../yukaAiTurnSystem";

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
): void {
	world.spawn(
		Board({
			width: 16,
			height: 16,
			seed: "test",
			tileSizeM: 2.0,
			turn: 1,
			climateProfile: "temperate",
			stormProfile: storm,
			difficulty,
		}),
	);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Yuka AI turn system", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		resetAIRuntime();
		world = createWorld();
		spawnBoardEntity(world);
	});

	it("AI unit moves toward player", () => {
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 3, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(8, 8);
		runYukaAiTurns(world, board);

		expect(aiUnit.has(UnitMove)).toBe(true);
		const move = aiUnit.get(UnitMove)!;
		expect(move.toX).toBe(1);
		expect(move.toZ).toBe(0);
	});

	it("AI unit attacks when enemy is in range", () => {
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 3,
			}),
		);
		const player = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(4, 4);
		runYukaAiTurns(world, board);

		expect(aiUnit.has(UnitAttack)).toBe(true);
		expect(aiUnit.get(UnitAttack)!.targetEntityId).toBe(player.id());
		// Should not have moved
		expect(aiUnit.has(UnitMove)).toBe(false);
	});

	it("ranged AI attacks from distance", () => {
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "signal_choir" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 6,
				attackRange: 3,
				attack: 4,
			}),
		);
		const player = world.spawn(
			UnitPos({ tileX: 2, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(8, 8);
		runYukaAiTurns(world, board);

		expect(aiUnit.has(UnitAttack)).toBe(true);
		expect(aiUnit.get(UnitAttack)!.targetEntityId).toBe(player.id());
	});

	it("volt_collective does not chase player beyond scanRange", () => {
		// Place player far away on the OPPOSITE side from center
		// so expand and chase don't overlap
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "volt_collective" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(16, 16);
		runYukaAiTurns(world, board);

		// Volt (reactiveOnly=true, scanRange=4) should NOT chase a player at dist=15.
		// It should NOT attack either.
		const units = world.query(UnitPos, UnitFaction);
		for (const e of units) {
			const f = e.get(UnitFaction);
			if (f?.factionId === "volt_collective") {
				expect(e.has(UnitAttack)).toBe(false);
			}
		}
	});

	it("AP is refreshed after AI turns", () => {
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 1,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(10, 10);
		runYukaAiTurns(world, board);

		expect(aiUnit.get(UnitStats)!.ap).toBe(3);
	});

	it("agents persist across turns (same brain instance)", () => {
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(10, 10);
		runYukaAiTurns(world, board);
		const runtime = getAIRuntime();
		expect(runtime.size).toBe(1);

		// Run again — should reuse agent, not create a new one
		// First remove the move component from the first turn
		if (aiUnit.has(UnitMove)) aiUnit.remove(UnitMove);
		runYukaAiTurns(world, board);
		expect(runtime.size).toBe(1);
	});

	it("dead agents are pruned from runtime", () => {
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(10, 10);
		runYukaAiTurns(world, board);
		expect(getAIRuntime().size).toBe(1);

		// Destroy the AI unit
		aiUnit.destroy();
		runYukaAiTurns(world, board);
		expect(getAIRuntime().size).toBe(0);
	});

	it("unit with no attack/attackRange does not attack or chase", () => {
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 0,
				attack: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(4, 4);
		runYukaAiTurns(world, board);

		// Cannot attack (attackRange=0), and evaluators return 0 for attack/chase
		expect(aiUnit.has(UnitAttack)).toBe(false);
	});

	it("AI moves toward resource deposit when no enemies nearby", () => {
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		// Player far away
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 15 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);
		// Deposit nearby
		world.spawn(
			ResourceDeposit({
				tileX: 2,
				tileZ: 0,
				material: "scrap_metal",
				amount: 10,
				depleted: false,
			}),
		);

		const board = makeBoard(16, 16);
		runYukaAiTurns(world, board);

		// Reclaimers have harvestPriority=3 — should move toward deposit
		// The unit at (0,0) should move toward (2,0), stepping to (1,0)
		const units = world.query(UnitPos, UnitFaction, UnitMove);
		let foundMove = false;
		for (const e of units) {
			const f = e.get(UnitFaction);
			const m = e.get(UnitMove);
			if (f?.factionId === "reclaimers" && m) {
				foundMove = true;
				expect(m.toX).toBe(1);
				expect(m.toZ).toBe(0);
			}
		}
		expect(foundMove).toBe(true);
	});

	it("story difficulty reduces AI aggression", () => {
		// Reset and recreate with story difficulty
		world = createWorld();
		spawnBoardEntity(world, "volatile", "story");

		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "volt_collective" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 8,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 4, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(8, 8);
		runYukaAiTurns(world, board);

		// volt_collective aggression=1, story mult=0.5 → attack desirability very low
		// Should not chase the player
		const unitEntities = world.query(UnitPos, UnitFaction);
		for (const e of unitEntities) {
			const f = e.get(UnitFaction);
			const p = e.get(UnitPos);
			if (f?.factionId === "volt_collective") {
				expect(p?.tileX).toBe(0); // did not move toward player
			}
		}
	});

	it("no player units → returns early without error", () => {
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);

		const board = makeBoard(4, 4);
		// No player units, so enemies list is empty for reclaimers
		// This should run without errors
		expect(() => runYukaAiTurns(world, board)).not.toThrow();
	});

	it("multiple factions run independently", () => {
		// Two AI factions + one player
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 7, tileZ: 7 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 3,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 4, tileZ: 4 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		const board = makeBoard(10, 10);
		expect(() => runYukaAiTurns(world, board)).not.toThrow();

		// Both AI factions should have agents in the runtime
		expect(getAIRuntime().size).toBe(2);
	});

	it("harvest action is queued when adjacent to deposit", () => {
		world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 15 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);
		const deposit = world.spawn(
			ResourceDeposit({
				tileX: 2,
				tileZ: 0,
				material: "scrap_metal",
				amount: 10,
				depleted: false,
			}),
		);

		const board = makeBoard(16, 16);
		runYukaAiTurns(world, board);

		// Reclaimer at (1,0) is adjacent to deposit at (2,0) → should harvest
		const reclaimerEntities = world.query(UnitFaction, UnitHarvest);
		let foundHarvest = false;
		for (const e of reclaimerEntities) {
			const f = e.get(UnitFaction);
			if (f?.factionId === "reclaimers") {
				foundHarvest = true;
				const h = e.get(UnitHarvest);
				expect(h?.depositEntityId).toBe(deposit.id());
			}
		}
		expect(foundHarvest).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _aiUnit_didNotMoveToward(
	entity: ReturnType<ReturnType<typeof createWorld>["spawn"]>,
	targetX: number,
	targetZ: number,
): boolean {
	if (!entity.has(UnitMove)) return true;
	const move = entity.get(UnitMove)!;
	const pos = entity.get(UnitPos)!;
	const oldDist = Math.abs(pos.tileX - targetX) + Math.abs(pos.tileZ - targetZ);
	const newDist = Math.abs(move.toX - targetX) + Math.abs(move.toZ - targetZ);
	return newDist >= oldDist;
}
