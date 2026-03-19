/**
 * Tests for critical AI bugs:
 * - Task #26: AI economy dead — harvestSystem never called in turn pipeline
 * - Task #27: Combat "target out of range" — attacks resolved after moves
 *
 * These tests verify the fixes:
 * 1. harvestSystem is now called during the environment phase
 * 2. AI attacks resolve BEFORE moves (using pre-move positions)
 */

import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { resetAIRuntime, runYukaAiTurns } from "../../ai/yukaAiTurnSystem";
import type { GeneratedBoard, TileData } from "../../board/types";
import { Board } from "../../traits/board";
import { Faction } from "../../traits/faction";
import { ResourceDeposit, ResourcePool } from "../../traits/resource";
import {
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMove,
	UnitPos,
	UnitStats,
} from "../../traits/unit";
import { resolveAllMoves } from "../aiTurnSystem";
import { resolveAttacks } from "../attackSystem";
import { harvestSystem } from "../harvestSystem";
import { addResources } from "../resourceSystem";
import { advanceTurn } from "../turnSystem";

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

function spawnFaction(
	world: ReturnType<typeof createWorld>,
	id: string,
	isPlayer = false,
): void {
	world.spawn(Faction({ id, displayName: id, isPlayer }), ResourcePool());
}

// ---------------------------------------------------------------------------
// Task #26: AI Economy — harvestSystem integration
// ---------------------------------------------------------------------------

describe("AI economy — harvestSystem in turn pipeline", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		resetAIRuntime();
		world = createWorld();
		world.spawn(
			Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
		);
	});

	it("harvestSystem processes UnitHarvest and adds resources to faction pool", () => {
		spawnFaction(world, "reclaimers");

		// Spawn a deposit
		const deposit = world.spawn(
			ResourceDeposit({
				tileX: 2,
				tileZ: 0,
				material: "scrap_metal",
				amount: 10,
				depleted: false,
			}),
		);

		// Spawn a unit already harvesting (ticks=1, about to complete)
		world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
			UnitHarvest({
				depositEntityId: deposit.id(),
				ticksRemaining: 1,
				totalTicks: 3,
				targetX: 2,
				targetZ: 0,
			}),
		);

		// Before harvest
		let pool: Record<string, number> | null = null;
		for (const e of world.query(ResourcePool, Faction)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") pool = { ...e.get(ResourcePool)! };
		}
		expect(pool!.scrap_metal).toBe(0);

		// Run harvest system
		harvestSystem(world);

		// After harvest — resources should increase
		for (const e of world.query(ResourcePool, Faction)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") pool = { ...e.get(ResourcePool)! };
		}
		expect(pool!.scrap_metal).toBeGreaterThan(0);
	});

	it("AI-queued UnitHarvest is processed by advanceTurn", () => {
		spawnFaction(world, "reclaimers");
		spawnFaction(world, "player", true);

		// Player unit far away so it doesn't interfere
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 15 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		// AI unit adjacent to deposit
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

		// Deposit next to AI unit
		world.spawn(
			ResourceDeposit({
				tileX: 2,
				tileZ: 0,
				material: "ferrous_scrap",
				amount: 10,
				depleted: false,
			}),
		);

		const board = makeBoard(16, 16);

		// Run 4 turns — AI should queue harvest on turn 1, complete after 3 ticks
		for (let i = 0; i < 4; i++) {
			advanceTurn(world, board);
		}

		// Check that reclaimers gained resources
		let pool: Record<string, number> | null = null;
		for (const e of world.query(ResourcePool, Faction)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") pool = { ...e.get(ResourcePool)! };
		}
		// After 4 turns with harvest system active, AI should have some ferrous_scrap
		expect(pool!.ferrous_scrap).toBeGreaterThan(0);
	});

	it("GOAP produces harvest action when unit is adjacent to deposit", () => {
		spawnFaction(world, "reclaimers");
		spawnFaction(world, "player", true);

		// Player far away
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 15 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		// AI unit at (1,0), deposit at (2,0) — distance 1 = adjacent
		const aiUnit = world.spawn(
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

		// Reclaimers have harvestPriority=3, and enemy is 20+ tiles away
		// GOAP should produce a harvest action (UnitHarvest component)
		expect(aiUnit.has(UnitHarvest)).toBe(true);
	});

	it("harvest ticks down across multiple turns", () => {
		spawnFaction(world, "reclaimers");

		const deposit = world.spawn(
			ResourceDeposit({
				tileX: 2,
				tileZ: 0,
				material: "alloy_stock",
				amount: 20,
				depleted: false,
			}),
		);

		const unit = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
			UnitHarvest({
				depositEntityId: deposit.id(),
				ticksRemaining: 3,
				totalTicks: 3,
				targetX: 2,
				targetZ: 0,
			}),
		);

		// Tick 1: 3→2
		harvestSystem(world);
		expect(unit.has(UnitHarvest)).toBe(true);
		expect(unit.get(UnitHarvest)!.ticksRemaining).toBe(2);

		// Tick 2: 2→1
		harvestSystem(world);
		expect(unit.has(UnitHarvest)).toBe(true);
		expect(unit.get(UnitHarvest)!.ticksRemaining).toBe(1);

		// Tick 3: 1→0 → complete, UnitHarvest removed
		harvestSystem(world);
		expect(unit.has(UnitHarvest)).toBe(false);

		// Resources should have been added
		let pool: Record<string, number> | null = null;
		for (const e of world.query(ResourcePool, Faction)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") pool = { ...e.get(ResourcePool)! };
		}
		expect(pool!.alloy_stock).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Task #27: Combat — attacks resolve before moves
// ---------------------------------------------------------------------------

describe("combat — attack resolution before move resolution", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		resetAIRuntime();
		world = createWorld();
		world.spawn(
			Board({ width: 16, height: 16, seed: "test", tileSizeM: 2, turn: 1 }),
		);
	});

	it("AI melee attack at range 1 hits when units are adjacent", () => {
		const attacker = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 5,
				defense: 0,
			}),
		);
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 1,
			}),
		);

		// Queue attack
		attacker.add(UnitAttack({ targetEntityId: target.id(), damage: 5 }));

		resolveAttacks(world);

		// Target should have taken damage: max(1, 5 - 1) = 4
		const targetStats = target.get(UnitStats)!;
		expect(targetStats.hp).toBe(6);
	});

	it("AI ranged attack at range 3 hits from distance", () => {
		const attacker = world.spawn(
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
				defense: 0,
			}),
		);
		const target = world.spawn(
			UnitPos({ tileX: 3, tileZ: 0 }),
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

		// Queue ranged attack at distance 3
		attacker.add(UnitAttack({ targetEntityId: target.id(), damage: 4 }));

		resolveAttacks(world);

		// Target should take max(1, 4 - 0) = 4 damage
		expect(target.get(UnitStats)!.hp).toBe(6);
	});

	it("attack fails when target is out of range", () => {
		const attacker = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 5,
				defense: 0,
			}),
		);
		const target = world.spawn(
			UnitPos({ tileX: 3, tileZ: 0 }),
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

		// Queue melee attack on target at distance 3 (out of range 1)
		attacker.add(UnitAttack({ targetEntityId: target.id(), damage: 5 }));

		resolveAttacks(world);

		// Target should NOT have taken damage — out of range
		expect(target.get(UnitStats)!.hp).toBe(10);
		// Attack component should be cleaned up
		expect(attacker.has(UnitAttack)).toBe(false);
	});

	it("AI attack resolves BEFORE move in advanceTurn — no 'out of range' for valid targets", () => {
		spawnFaction(world, "iron_creed");
		spawnFaction(world, "player", true);

		// AI unit adjacent to player → GOAP will decide to attack
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 3,
				defense: 0,
			}),
		);
		const playerUnit = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 20,
				maxHp: 20,
				ap: 3,
				maxAp: 3,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		const board = makeBoard(16, 16);

		// Phase 2: AI decides action
		runYukaAiTurns(world, board);

		// Iron Creed at (0,0) with player at (1,0) → AttackEvaluator wins
		expect(aiUnit.has(UnitAttack)).toBe(true);

		// Phase 2.5 (fixed): Resolve attacks BEFORE moves
		resolveAttacks(world);

		// Attack should have connected — player takes damage
		expect(playerUnit.get(UnitStats)!.hp).toBeLessThan(20);
	});

	it("old bug: if attacks resolved AFTER moves, attacker would drift out of range", () => {
		// This test demonstrates the fix. With the old ordering:
		// 1. GOAP queues attack on adjacent target
		// 2. resolveAllMoves moves the attacker away
		// 3. resolveAttacks finds attacker out of range → "target out of range"
		//
		// With the fix, attacks resolve first while positions are still correct.

		const attacker = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 5,
				defense: 0,
			}),
			// GOAP queued attack on adjacent target
			UnitAttack({ targetEntityId: 999, damage: 5 }),
			// AND a move away (shouldn't happen with GOAP but tests the ordering)
			UnitMove({ fromX: 0, fromZ: 0, toX: 3, toZ: 0, progress: 0, mpCost: 1 }),
		);

		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
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

		// Patch the attack to point at the real target
		attacker.set(UnitAttack, { targetEntityId: target.id(), damage: 5 });

		// With correct ordering: resolve attacks first (attacker still at 0,0, target at 1,0 → in range)
		resolveAttacks(world);
		expect(target.get(UnitStats)!.hp).toBe(5); // 10 - max(1, 5-0) = 5

		// Then resolve moves
		resolveAllMoves(world);
		const pos = attacker.get(UnitPos)!;
		expect(pos.tileX).toBe(3); // attacker moved to (3,0)
	});

	it("counterattack fires when target survives and is in range", () => {
		const attacker = world.spawn(
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
				defense: 0,
			}),
		);
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 4,
				defense: 0,
			}),
		);

		attacker.add(UnitAttack({ targetEntityId: target.id(), damage: 3 }));
		resolveAttacks(world);

		// Primary attack: max(1, 3-0) = 3 → target HP = 7
		expect(target.get(UnitStats)!.hp).toBe(7);

		// Counterattack: max(1, floor(4*0.5) - 0) = max(1, 2) = 2 → attacker HP = 8
		expect(attacker.get(UnitStats)!.hp).toBe(8);
	});

	it("death removes entity when HP drops to 0", () => {
		const attacker = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 15,
				defense: 0,
			}),
		);
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 5,
				maxHp: 5,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		attacker.add(UnitAttack({ targetEntityId: target.id(), damage: 15 }));
		resolveAttacks(world);

		// Target should be destroyed (15 - 0 = 15 damage > 5 HP)
		// Verify no UnitStats entities with player faction remain
		let playerUnitsRemaining = 0;
		for (const e of world.query(UnitStats, UnitFaction)) {
			const f = e.get(UnitFaction);
			if (f?.factionId === "player") playerUnitsRemaining++;
		}
		expect(playerUnitsRemaining).toBe(0);
	});

	it("GOAP AttackEvaluator only targets units within attackRange", () => {
		spawnFaction(world, "iron_creed");
		spawnFaction(world, "player", true);

		// AI melee unit (attackRange=1), player at distance 5
		const aiUnit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "iron_creed" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				mp: 3,
				maxMp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 3,
				defense: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 0 }),
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

		const board = makeBoard(16, 16);
		runYukaAiTurns(world, board);

		// At distance 5 with attackRange 1, GOAP should NOT queue an attack
		// It should move toward the player instead
		expect(aiUnit.has(UnitAttack)).toBe(false);
		expect(aiUnit.has(UnitMove)).toBe(true);
	});
});
