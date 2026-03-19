import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { Faction } from "../../traits/faction";
import { ResourceDeposit, ResourcePool } from "../../traits/resource";
import { UnitFaction, UnitHarvest, UnitStats } from "../../traits/unit";
import { harvestSystem, startHarvest } from "../harvestSystem";

describe("harvestSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	function spawnFaction(id: string, isPlayer: boolean) {
		return world.spawn(
			Faction({
				id,
				displayName: id,
				color: 0xffffff,
				persona: "otter",
				isPlayer,
				aggression: 0,
			}),
			ResourcePool({ scrap_metal: 10, ferrous_scrap: 5 }),
		);
	}

	function spawnUnit(factionId: string, ap = 3) {
		return world.spawn(
			UnitFaction({ factionId }),
			UnitStats({ hp: 10, maxHp: 10, ap, maxAp: 3, scanRange: 4 }),
		);
	}

	function spawnDeposit(material = "scrap_metal" as const, amount = 10) {
		return world.spawn(
			ResourceDeposit({
				tileX: 3,
				tileZ: 5,
				material,
				amount,
				depleted: false,
			}),
		);
	}

	it("tick-down decrements ticksRemaining", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player");
		unit.add(
			UnitHarvest({
				depositEntityId: 999,
				ticksRemaining: 3,
				totalTicks: 3,
				targetX: 0,
				targetZ: 0,
			}),
		);

		harvestSystem(world);

		const harvest = unit.get(UnitHarvest);
		expect(harvest?.ticksRemaining).toBe(2);
	});

	it("does not remove UnitHarvest before completion", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player");
		unit.add(
			UnitHarvest({
				depositEntityId: 999,
				ticksRemaining: 3,
				totalTicks: 3,
				targetX: 0,
				targetZ: 0,
			}),
		);

		harvestSystem(world);
		expect(unit.has(UnitHarvest)).toBe(true);

		harvestSystem(world);
		expect(unit.has(UnitHarvest)).toBe(true);
	});

	it("completion yields resources to faction pool", () => {
		const factionEntity = spawnFaction("player", true);
		const deposit = spawnDeposit("scrap_metal", 10);
		const unit = spawnUnit("player");
		unit.add(
			UnitHarvest({
				depositEntityId: deposit.id(),
				ticksRemaining: 1,
				totalTicks: 3,
				targetX: 3,
				targetZ: 5,
			}),
		);

		harvestSystem(world);

		// UnitHarvest removed on completion
		expect(unit.has(UnitHarvest)).toBe(false);

		// Resources increased (yield is 1-3)
		const pool = factionEntity.get(ResourcePool);
		expect(pool?.scrap_metal).toBeGreaterThan(10);
		expect(pool?.scrap_metal).toBeLessThanOrEqual(13);
	});

	it("deposit amount decreases after harvest", () => {
		spawnFaction("player", true);
		const deposit = spawnDeposit("scrap_metal", 10);
		const unit = spawnUnit("player");
		unit.add(
			UnitHarvest({
				depositEntityId: deposit.id(),
				ticksRemaining: 1,
				totalTicks: 3,
				targetX: 3,
				targetZ: 5,
			}),
		);

		harvestSystem(world);

		const dep = deposit.get(ResourceDeposit);
		expect(dep?.amount).toBeLessThan(10);
	});

	it("deposit becomes depleted when amount reaches 0", () => {
		spawnFaction("player", true);
		const deposit = spawnDeposit("scrap_metal", 1);
		const unit = spawnUnit("player");
		unit.add(
			UnitHarvest({
				depositEntityId: deposit.id(),
				ticksRemaining: 1,
				totalTicks: 3,
				targetX: 3,
				targetZ: 5,
			}),
		);

		harvestSystem(world);

		const dep = deposit.get(ResourceDeposit);
		expect(dep?.depleted).toBe(true);
		expect(dep?.amount).toBe(0);
	});
});

describe("startHarvest", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	function spawnFaction(id: string, isPlayer: boolean) {
		return world.spawn(
			Faction({
				id,
				displayName: id,
				color: 0xffffff,
				persona: "otter",
				isPlayer,
				aggression: 0,
			}),
			ResourcePool({ scrap_metal: 10 }),
		);
	}

	function spawnUnit(factionId: string, ap = 3) {
		return world.spawn(
			UnitFaction({ factionId }),
			UnitStats({ hp: 10, maxHp: 10, ap, maxAp: 3, scanRange: 4 }),
		);
	}

	function spawnDeposit(material = "scrap_metal" as const, amount = 10) {
		return world.spawn(
			ResourceDeposit({
				tileX: 3,
				tileZ: 5,
				material,
				amount,
				depleted: false,
			}),
		);
	}

	it("deducts 1 AP on success", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player", 3);
		const deposit = spawnDeposit();

		const result = startHarvest(world, unit.id(), deposit.id());

		expect(result).toBe(true);
		expect(unit.get(UnitStats)?.ap).toBe(2);
	});

	it("adds UnitHarvest trait to unit", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player");
		const deposit = spawnDeposit();

		startHarvest(world, unit.id(), deposit.id());

		expect(unit.has(UnitHarvest)).toBe(true);
		const harvest = unit.get(UnitHarvest);
		expect(harvest?.depositEntityId).toBe(deposit.id());
		expect(harvest?.ticksRemaining).toBe(3);
		expect(harvest?.targetX).toBe(3);
		expect(harvest?.targetZ).toBe(5);
	});

	it("returns false when unit has 0 AP", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player", 0);
		const deposit = spawnDeposit();

		expect(startHarvest(world, unit.id(), deposit.id())).toBe(false);
	});

	it("returns false for depleted deposit", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player");
		const deposit = world.spawn(
			ResourceDeposit({
				tileX: 1,
				tileZ: 1,
				material: "scrap_metal",
				amount: 0,
				depleted: true,
			}),
		);

		expect(startHarvest(world, unit.id(), deposit.id())).toBe(false);
	});

	it("returns false if unit is already harvesting", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player");
		const deposit = spawnDeposit();

		expect(startHarvest(world, unit.id(), deposit.id())).toBe(true);
		expect(startHarvest(world, unit.id(), deposit.id())).toBe(false);
	});

	it("returns false for nonexistent unit", () => {
		spawnFaction("player", true);
		const deposit = spawnDeposit();

		expect(startHarvest(world, 99999, deposit.id())).toBe(false);
	});

	it("returns false for nonexistent deposit", () => {
		spawnFaction("player", true);
		const unit = spawnUnit("player");

		expect(startHarvest(world, unit.id(), 99999)).toBe(false);
	});
});
