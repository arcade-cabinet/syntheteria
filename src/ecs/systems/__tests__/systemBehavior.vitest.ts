/**
 * COMPREHENSIVE SYSTEM BEHAVIOR TESTS
 *
 * Verifies that every ECS system produces the correct OUTPUT changes,
 * not just that functions exist. Each test sets up a minimal world,
 * triggers a system, and asserts the result.
 *
 * Covers:
 *   1.  attackSystem — damage reduces HP, counterattack fires, death removes entity
 *   2.  harvestSystem — resources added to faction pool, deposit depleted
 *   3.  movementSystem — MP consumed, UnitPos updated, UnitMove removed
 *   4.  fogRevealSystem — tiles explored, fringe gradient applied
 *   5.  powerSystem — transmitters charge boxes, consumers gain Powered
 *   6.  turretSystem — turrets damage nearest hostile, enter cooldown
 *   7.  repairSystem — maintenance bays heal friendly units
 *   8.  signalSystem — relay coverage halves out-of-range scanRange
 *   9.  fabricationSystem — motor pool ticks down job, spawns robot
 *   10. synthesisSystem — fusion converts inputs to outputs
 *   11. resourceRenewalSystem — powered transmitters generate storm_charge
 *   12. resourceSystem — add/spend/canAfford CRUD
 *   13. territorySystem — unit/building proximity paints territory
 *   14. victorySystem — defeat on elimination, victory thresholds
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board } from "../../traits/board";
import { Tile, TileHighlight } from "../../traits/tile";
import {
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../../traits/unit";
import { Faction } from "../../traits/faction";
import { ResourceDeposit, ResourcePool } from "../../traits/resource";
import {
	Building,
	BotFabricator,
	PowerGrid,
	Powered,
	SignalNode,
	TurretStats,
} from "../../traits/building";
import { resolveAttacks } from "../attackSystem";
import { harvestSystem, startHarvest } from "../harvestSystem";
import { movementSystem } from "../movementSystem";
import { revealFog } from "../fogRevealSystem";
import { runPowerGrid } from "../powerSystem";
import { runTurrets } from "../turretSystem";
import { runRepairs } from "../repairSystem";
import { runSignalNetwork } from "../signalSystem";
import { FabricationJob, queueFabrication, runFabrication } from "../fabricationSystem";
import { queueSynthesis, runSynthesis, SynthesisQueue } from "../synthesisSystem";
import { runResourceRenewal } from "../resourceRenewalSystem";
import { addResources, canAfford, spendResources } from "../resourceSystem";
import { computeTerritory, getTerritoryPercent } from "../territorySystem";
import { checkVictoryConditions } from "../victorySystem";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function spawnFaction(world: ReturnType<typeof createWorld>, id: string, isPlayer = false) {
	return world.spawn(
		Faction({ id, displayName: id, color: 0x00ffaa, isPlayer, aggression: 0 }),
		ResourcePool({}),
	);
}

function spawnBoard(world: ReturnType<typeof createWorld>, turn = 1, w = 16, h = 16) {
	return world.spawn(
		Board({ width: w, height: h, seed: "test", tileSizeM: 2, turn, climateProfile: "temperate", stormProfile: "volatile", difficulty: "standard" }),
	);
}

function spawnTileGrid(world: ReturnType<typeof createWorld>, size: number) {
	for (let z = 0; z < size; z++) {
		for (let x = 0; x < size; x++) {
			world.spawn(
				Tile({ x, z, elevation: 0, passable: true, explored: false, visibility: 0 }),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
			);
		}
	}
}

// =============================================================================
// 1. attackSystem
// =============================================================================

describe("attackSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); spawnBoard(world); });
	afterEach(() => { world.destroy(); });

	it("damage actually reduces target HP", () => {
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "enemy" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 1 }),
		);
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 4, defense: 0 }),
			UnitAttack({ targetEntityId: target.id(), damage: 0 }),
		);

		resolveAttacks(world);

		// damage = max(1, 4-1) = 3 → HP 10-3 = 7
		expect(target.get(UnitStats)?.hp).toBe(7);
	});

	it("counterattack fires when defender survives and is in range", () => {
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "enemy" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 8, defense: 0, attackRange: 1 }),
		);
		const attacker = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 3, defense: 0, attackRange: 1 }),
			UnitAttack({ targetEntityId: target.id(), damage: 0 }),
		);

		resolveAttacks(world);

		// Primary: 3-0 = 3 → target HP 7
		expect(target.get(UnitStats)?.hp).toBe(7);
		// Counter: max(1, floor(8*0.5)-0) = 4 → attacker HP 6
		expect(attacker.get(UnitStats)?.hp).toBe(6);
	});

	it("death removes entity from world queries", () => {
		const target = world.spawn(
			UnitPos({ tileX: 1, tileZ: 0 }),
			UnitFaction({ factionId: "enemy" }),
			UnitStats({ hp: 1, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 0, defense: 0 }),
		);
		const targetId = target.id();
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 5, defense: 0 }),
			UnitAttack({ targetEntityId: targetId, damage: 0 }),
		);

		resolveAttacks(world);

		let found = false;
		for (const e of world.query(UnitStats)) {
			if (e.id() === targetId) found = true;
		}
		expect(found).toBe(false);
	});
});

// =============================================================================
// 2. harvestSystem
// =============================================================================

describe("harvestSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); spawnBoard(world); });
	afterEach(() => { world.destroy(); });

	it("harvest completion adds resources to faction pool", () => {
		const playerFac = spawnFaction(world, "player", true);
		const deposit = world.spawn(
			ResourceDeposit({ tileX: 1, tileZ: 0, material: "ferrous_scrap", amount: 10, depleted: false }),
		);
		const unit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 0, defense: 0 }),
			UnitXP({ xp: 0, markLevel: 1, killCount: 0, harvestCount: 0 }),
			UnitVisual({ modelId: "worker", scale: 1, facingAngle: 0 }),
		);

		startHarvest(world, unit.id(), deposit.id());
		harvestSystem(world);
		harvestSystem(world);
		harvestSystem(world); // 3 ticks → complete

		const pool = playerFac.get(ResourcePool);
		expect((pool as Record<string, number>).ferrous_scrap).toBeGreaterThan(0);
	});

	it("harvest deducts AP from the unit", () => {
		spawnFaction(world, "player", true);
		const deposit = world.spawn(
			ResourceDeposit({ tileX: 1, tileZ: 0, material: "scrap_metal", amount: 5, depleted: false }),
		);
		const unit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 0, defense: 0 }),
		);

		const before = unit.get(UnitStats)!.ap;
		startHarvest(world, unit.id(), deposit.id());
		expect(unit.get(UnitStats)!.ap).toBe(before - 1);
	});

	it("depleted deposit cannot be harvested again", () => {
		spawnFaction(world, "player", true);
		const deposit = world.spawn(
			ResourceDeposit({ tileX: 1, tileZ: 0, material: "scrap_metal", amount: 1, depleted: true }),
		);
		const unit = world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 0, defense: 0 }),
		);

		const result = startHarvest(world, unit.id(), deposit.id());
		expect(result).toBe(false);
	});
});

// =============================================================================
// 3. movementSystem
// =============================================================================

describe("movementSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); spawnTileGrid(world, 10); });
	afterEach(() => { world.destroy(); });

	it("movement consumes MP and updates UnitPos", () => {
		const unit = world.spawn(
			UnitPos({ tileX: 2, tileZ: 2 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4, attack: 0, defense: 0, movesUsed: 0 }),
			UnitMove({ fromX: 2, fromZ: 2, toX: 3, toZ: 2, progress: 0, mpCost: 1 }),
		);

		// Run movement with enough delta to complete (1.0 / 4.0 speed = 0.25s)
		movementSystem(world, 1.0);

		const pos = unit.get(UnitPos);
		expect(pos?.tileX).toBe(3);
		expect(pos?.tileZ).toBe(2);

		const stats = unit.get(UnitStats);
		expect(stats?.mp).toBe(2); // 3 - 1
		expect(stats?.movesUsed).toBe(1);

		// UnitMove should be removed
		expect(unit.has(UnitMove)).toBe(false);
	});

	it("partial movement does not update UnitPos", () => {
		const unit = world.spawn(
			UnitPos({ tileX: 2, tileZ: 2 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, mp: 3, maxMp: 3, scanRange: 4, attack: 0, defense: 0 }),
			UnitMove({ fromX: 2, fromZ: 2, toX: 3, toZ: 2, progress: 0, mpCost: 1 }),
		);

		// Very small delta — movement not complete
		movementSystem(world, 0.01);

		expect(unit.get(UnitPos)?.tileX).toBe(2);
		expect(unit.has(UnitMove)).toBe(true);
	});
});

// =============================================================================
// 4. fogRevealSystem
// =============================================================================

describe("fogRevealSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); spawnTileGrid(world, 12); });
	afterEach(() => { world.destroy(); });

	it("revealFog marks tiles within scanRange as explored", () => {
		revealFog(world, 5, 5, 3);

		let exploredCount = 0;
		for (const e of world.query(Tile)) {
			const t = e.get(Tile);
			if (!t) continue;
			const dist = Math.abs(t.x - 5) + Math.abs(t.z - 5);
			if (dist <= 3) {
				expect(t.explored).toBe(true);
				expect(t.visibility).toBe(1.0);
				exploredCount++;
			}
		}
		expect(exploredCount).toBeGreaterThan(0);
	});

	it("fringe tiles get partial visibility (gradient, not hard cutoff)", () => {
		revealFog(world, 5, 5, 2);

		const fringeTiles: number[] = [];
		for (const e of world.query(Tile)) {
			const t = e.get(Tile);
			if (!t) continue;
			const dist = Math.abs(t.x - 5) + Math.abs(t.z - 5);
			if (dist === 3 && t.visibility > 0) {
				fringeTiles.push(t.visibility);
			}
		}
		expect(fringeTiles.length).toBeGreaterThan(0);
		for (const v of fringeTiles) {
			expect(v).toBeLessThan(1.0);
			expect(v).toBeGreaterThan(0);
		}
	});
});

// =============================================================================
// 5. powerSystem
// =============================================================================

describe("powerSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("transmitter charges power box within radius", () => {
		world.spawn(
			Building({ tileX: 0, tileZ: 0, buildingType: "storm_transmitter", modelId: "a", factionId: "player", hp: 40, maxHp: 40 }),
			PowerGrid({ powerDelta: 5, storageCapacity: 0, currentCharge: 0, powerRadius: 12 }),
		);
		const box = world.spawn(
			Building({ tileX: 3, tileZ: 0, buildingType: "power_box", modelId: "b", factionId: "player", hp: 30, maxHp: 30 }),
			PowerGrid({ powerDelta: 0, storageCapacity: 20, currentCharge: 0, powerRadius: 0 }),
		);

		runPowerGrid(world);

		expect(box.get(PowerGrid)?.currentCharge).toBe(5);
	});

	it("consumer gains Powered when power box has enough charge", () => {
		world.spawn(
			Building({ tileX: 0, tileZ: 0, buildingType: "storm_transmitter", modelId: "a", factionId: "player", hp: 40, maxHp: 40 }),
			PowerGrid({ powerDelta: 5, storageCapacity: 0, currentCharge: 0, powerRadius: 12 }),
		);
		world.spawn(
			Building({ tileX: 2, tileZ: 0, buildingType: "power_box", modelId: "b", factionId: "player", hp: 30, maxHp: 30 }),
			PowerGrid({ powerDelta: 0, storageCapacity: 20, currentCharge: 0, powerRadius: 0 }),
		);
		const consumer = world.spawn(
			Building({ tileX: 4, tileZ: 0, buildingType: "synthesizer", modelId: "c", factionId: "player", hp: 60, maxHp: 60 }),
			PowerGrid({ powerDelta: -4, storageCapacity: 0, currentCharge: 0, powerRadius: 0 }),
		);

		runPowerGrid(world);
		runPowerGrid(world);

		expect(consumer.has(Powered)).toBe(true);
	});

	it("power box charge capped at storageCapacity", () => {
		world.spawn(
			Building({ tileX: 0, tileZ: 0, buildingType: "storm_transmitter", modelId: "a", factionId: "player", hp: 40, maxHp: 40 }),
			PowerGrid({ powerDelta: 100, storageCapacity: 0, currentCharge: 0, powerRadius: 12 }),
		);
		const box = world.spawn(
			Building({ tileX: 1, tileZ: 0, buildingType: "power_box", modelId: "b", factionId: "player", hp: 30, maxHp: 30 }),
			PowerGrid({ powerDelta: 0, storageCapacity: 20, currentCharge: 0, powerRadius: 0 }),
		);

		runPowerGrid(world);

		expect(box.get(PowerGrid)?.currentCharge).toBeLessThanOrEqual(20);
	});
});

// =============================================================================
// 6. turretSystem
// =============================================================================

describe("turretSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("powered turret damages nearest hostile within range", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "defense_turret", modelId: "t", factionId: "player", hp: 50, maxHp: 50 }),
			TurretStats({ attackDamage: 3, attackRange: 8, cooldownTurns: 2, currentCooldown: 0 }),
			Powered(),
		);
		const hostile = world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "enemy" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runTurrets(world);

		expect(hostile.get(UnitStats)?.hp).toBe(7); // 10 - 3
	});

	it("turret enters cooldown after firing", () => {
		const turret = world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "defense_turret", modelId: "t", factionId: "player", hp: 50, maxHp: 50 }),
			TurretStats({ attackDamage: 3, attackRange: 8, cooldownTurns: 2, currentCooldown: 0 }),
			Powered(),
		);
		world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "enemy" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runTurrets(world);

		expect(turret.get(TurretStats)?.currentCooldown).toBe(2);
	});

	it("turret does not fire when on cooldown", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "defense_turret", modelId: "t", factionId: "player", hp: 50, maxHp: 50 }),
			TurretStats({ attackDamage: 3, attackRange: 8, cooldownTurns: 2, currentCooldown: 2 }),
			Powered(),
		);
		const hostile = world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "enemy" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runTurrets(world);

		// Should NOT take damage — turret on cooldown
		expect(hostile.get(UnitStats)?.hp).toBe(10);
	});

	it("turret does not fire at friendly units", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "defense_turret", modelId: "t", factionId: "player", hp: 50, maxHp: 50 }),
			TurretStats({ attackDamage: 3, attackRange: 8, cooldownTurns: 2, currentCooldown: 0 }),
			Powered(),
		);
		const friendly = world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runTurrets(world);

		expect(friendly.get(UnitStats)?.hp).toBe(10);
	});
});

// =============================================================================
// 7. repairSystem
// =============================================================================

describe("repairSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("powered maintenance bay heals friendly unit within range by +2", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "maintenance_bay", modelId: "m", factionId: "player", hp: 45, maxHp: 45 }),
			Powered(),
		);
		const unit = world.spawn(
			UnitPos({ tileX: 5, tileZ: 6 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 5, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runRepairs(world);

		expect(unit.get(UnitStats)?.hp).toBe(7); // 5 + 2
	});

	it("repair does not exceed maxHp", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "maintenance_bay", modelId: "m", factionId: "player", hp: 45, maxHp: 45 }),
			Powered(),
		);
		const unit = world.spawn(
			UnitPos({ tileX: 5, tileZ: 6 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 9, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runRepairs(world);

		expect(unit.get(UnitStats)?.hp).toBe(10);
	});

	it("repair does not affect enemy units", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "maintenance_bay", modelId: "m", factionId: "player", hp: 45, maxHp: 45 }),
			Powered(),
		);
		const enemy = world.spawn(
			UnitPos({ tileX: 5, tileZ: 6 }),
			UnitFaction({ factionId: "enemy" }),
			UnitStats({ hp: 5, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runRepairs(world);

		expect(enemy.get(UnitStats)?.hp).toBe(5);
	});

	it("repair does not reach units beyond manhattan distance 2", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "maintenance_bay", modelId: "m", factionId: "player", hp: 45, maxHp: 45 }),
			Powered(),
		);
		const farUnit = world.spawn(
			UnitPos({ tileX: 8, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 5, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		runRepairs(world);

		expect(farUnit.get(UnitStats)?.hp).toBe(5);
	});
});

// =============================================================================
// 8. signalSystem
// =============================================================================

describe("signalSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("units outside signal coverage have scanRange halved", () => {
		world.spawn(
			Building({ tileX: 0, tileZ: 0, buildingType: "relay_tower", modelId: "r", factionId: "player", hp: 35, maxHp: 35 }),
			SignalNode({ range: 5, strength: 1.0 }),
			Powered(),
		);
		const outUnit = world.spawn(
			UnitPos({ tileX: 50, tileZ: 50 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 8, attack: 2, defense: 0 }),
		);

		runSignalNetwork(world);

		expect(outUnit.get(UnitStats)?.scanRange).toBe(4);
	});

	it("units inside signal coverage keep full scanRange", () => {
		world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "relay_tower", modelId: "r", factionId: "player", hp: 35, maxHp: 35 }),
			SignalNode({ range: 10, strength: 1.0 }),
			Powered(),
		);
		const inUnit = world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 8, attack: 2, defense: 0 }),
		);

		runSignalNetwork(world);

		expect(inUnit.get(UnitStats)?.scanRange).toBe(8);
	});
});

// =============================================================================
// 9. fabricationSystem
// =============================================================================

describe("fabricationSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("motor pool spawns robot after buildTime ticks", () => {
		spawnFaction(world, "player", true);
		addResources(world, "player", "ferrous_scrap", 20);
		addResources(world, "player", "conductor_wire", 10);

		const pool = world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "motor_pool", modelId: "mp", factionId: "player", hp: 80, maxHp: 80 }),
			BotFabricator({ fabricationSlots: 1, queueSize: 0 }),
			Powered(),
		);

		const result = queueFabrication(world, pool, "scout");
		expect(result.ok).toBe(true);

		// scout buildTime = 2
		runFabrication(world); // tick 1
		runFabrication(world); // tick 2 → spawns

		// Check a new unit appeared at the motor pool tile
		let foundUnit = false;
		for (const e of world.query(UnitPos, UnitFaction)) {
			const pos = e.get(UnitPos);
			const fac = e.get(UnitFaction);
			if (pos?.tileX === 5 && pos?.tileZ === 5 && fac?.factionId === "player") {
				foundUnit = true;
			}
		}
		expect(foundUnit).toBe(true);
	});

	it("unpowered motor pool rejects fabrication", () => {
		spawnFaction(world, "player", true);
		addResources(world, "player", "ferrous_scrap", 20);

		const pool = world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "motor_pool", modelId: "mp", factionId: "player", hp: 80, maxHp: 80 }),
			BotFabricator({ fabricationSlots: 1, queueSize: 0 }),
			// NOTE: no Powered trait
		);

		const result = queueFabrication(world, pool, "scout");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe("not_powered");
	});
});

// =============================================================================
// 10. synthesisSystem
// =============================================================================

describe("synthesisSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("fusion converts inputs to outputs after tick-down", () => {
		spawnFaction(world, "player", true);
		addResources(world, "player", "ferrous_scrap", 10);
		addResources(world, "player", "conductor_wire", 10);

		const synth = world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "synthesizer", modelId: "s", factionId: "player", hp: 60, maxHp: 60 }),
			Powered(),
		);

		const queued = queueSynthesis(world, synth.id(), "alloy_fusion");
		expect(queued).toBe(true);

		// alloy_fusion: 3 ferrous_scrap + 2 conductor_wire → 1 alloy_stock
		// Verify inputs spent (10 - 3 = 7 ferrous_scrap remaining, 10 - 2 = 8 conductor_wire)
		expect(canAfford(world, "player", { ferrous_scrap: 7 })).toBe(true);
		expect(canAfford(world, "player", { ferrous_scrap: 8 })).toBe(false);
		expect(canAfford(world, "player", { conductor_wire: 8 })).toBe(true);
		expect(canAfford(world, "player", { conductor_wire: 9 })).toBe(false);

		// Tick down (3 ticks to complete)
		runSynthesis(world);
		runSynthesis(world);
		runSynthesis(world);

		// Output deposited
		expect(canAfford(world, "player", { alloy_stock: 1 })).toBe(true);
	});

	it("synthesis queue removed after completion", () => {
		spawnFaction(world, "player", true);
		addResources(world, "player", "ferrous_scrap", 10);
		addResources(world, "player", "conductor_wire", 10);

		const synth = world.spawn(
			Building({ tileX: 5, tileZ: 5, buildingType: "synthesizer", modelId: "s", factionId: "player", hp: 60, maxHp: 60 }),
			Powered(),
		);

		queueSynthesis(world, synth.id(), "alloy_fusion");
		expect(synth.has(SynthesisQueue)).toBe(true);

		runSynthesis(world);
		runSynthesis(world);
		runSynthesis(world);

		expect(synth.has(SynthesisQueue)).toBe(false);
	});
});

// =============================================================================
// 11. resourceRenewalSystem
// =============================================================================

describe("resourceRenewalSystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("powered storm_transmitter generates storm_charge", () => {
		spawnFaction(world, "player", true);
		world.spawn(
			Building({ tileX: 0, tileZ: 0, buildingType: "storm_transmitter", modelId: "a", factionId: "player", hp: 40, maxHp: 40 }),
			Powered(),
		);

		const total = runResourceRenewal(world);

		expect(total).toBe(1);
		expect(canAfford(world, "player", { storm_charge: 1 })).toBe(true);
	});

	it("unpowered transmitter does NOT generate resources", () => {
		spawnFaction(world, "player", true);
		world.spawn(
			Building({ tileX: 0, tileZ: 0, buildingType: "storm_transmitter", modelId: "a", factionId: "player", hp: 40, maxHp: 40 }),
			// No Powered trait
		);

		const total = runResourceRenewal(world);

		expect(total).toBe(0);
		expect(canAfford(world, "player", { storm_charge: 1 })).toBe(false);
	});
});

// =============================================================================
// 12. resourceSystem
// =============================================================================

describe("resourceSystem — CRUD behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("addResources increases pool; spendResources decreases it", () => {
		spawnFaction(world, "player", true);

		addResources(world, "player", "alloy_stock", 10);
		expect(canAfford(world, "player", { alloy_stock: 10 })).toBe(true);

		spendResources(world, "player", "alloy_stock", 4);
		expect(canAfford(world, "player", { alloy_stock: 6 })).toBe(true);
		expect(canAfford(world, "player", { alloy_stock: 7 })).toBe(false);
	});

	it("spendResources returns false when insufficient", () => {
		spawnFaction(world, "player", true);
		addResources(world, "player", "silicon_wafer", 3);

		const result = spendResources(world, "player", "silicon_wafer", 5);
		expect(result).toBe(false);
		// Pool should be unchanged
		expect(canAfford(world, "player", { silicon_wafer: 3 })).toBe(true);
	});

	it("canAfford checks multiple materials simultaneously", () => {
		spawnFaction(world, "player", true);
		addResources(world, "player", "ferrous_scrap", 5);
		addResources(world, "player", "conductor_wire", 2);

		expect(canAfford(world, "player", { ferrous_scrap: 3, conductor_wire: 2 })).toBe(true);
		expect(canAfford(world, "player", { ferrous_scrap: 3, conductor_wire: 3 })).toBe(false);
	});
});

// =============================================================================
// 13. territorySystem
// =============================================================================

describe("territorySystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); });
	afterEach(() => { world.destroy(); });

	it("unit claims territory within TERRITORY_UNIT_RADIUS", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);

		const territory = computeTerritory(world, 16, 16);
		const pct = getTerritoryPercent(territory, "player");
		expect(pct).toBeGreaterThan(0);

		// Check specific tile within radius 2
		const claimed = territory.tiles.get("5,5");
		expect(claimed?.factionId).toBe("player");
	});

	it("building claims territory within TERRITORY_BUILDING_RADIUS", () => {
		world.spawn(
			Building({ tileX: 8, tileZ: 8, buildingType: "storage_hub", modelId: "s", factionId: "reclaimers", hp: 40, maxHp: 40 }),
		);

		const territory = computeTerritory(world, 16, 16);
		const pct = getTerritoryPercent(territory, "reclaimers");
		expect(pct).toBeGreaterThan(0);
	});

	it("contested tiles marked when two factions overlap", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);
		world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const territory = computeTerritory(world, 16, 16);

		// Tile between units should be contested
		let hasContested = false;
		for (const [, tt] of territory.tiles) {
			if (tt.contested) {
				hasContested = true;
				break;
			}
		}
		expect(hasContested).toBe(true);
	});
});

// =============================================================================
// 14. victorySystem
// =============================================================================

describe("victorySystem — behavior", () => {
	let world: ReturnType<typeof createWorld>;
	beforeEach(() => { world = createWorld(); spawnBoard(world); });
	afterEach(() => { world.destroy(); });

	it("defeat when all player units eliminated", () => {
		spawnFaction(world, "player", true);
		// No player units spawned → defeat

		const result = checkVictoryConditions(world);
		expect(result.result).toBe("defeat");
		if (result.result === "defeat") {
			expect(result.reason).toBe("elimination");
		}
	});

	it("playing when player has units and no victory met", () => {
		spawnFaction(world, "player", true);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 2, maxAp: 2, scanRange: 4, attack: 2, defense: 0 }),
		);

		const result = checkVictoryConditions(world);
		expect(result.result).toBe("playing");
	});
});
