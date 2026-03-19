import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	BotFabricator,
	Building,
	PowerGrid,
	SignalNode,
	StorageCapacity,
	TurretStats,
} from "../building";

describe("Building trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(Building);
		const b = e.get(Building)!;
		expect(b.tileX).toBe(0);
		expect(b.tileZ).toBe(0);
		expect(b.buildingType).toBe("storage_hub");
		expect(b.modelId).toBe("");
		expect(b.factionId).toBe("");
		expect(b.hp).toBe(50);
		expect(b.maxHp).toBe(50);
	});

	it("spawns with custom buildingType", () => {
		const e = world.spawn(
			Building({ buildingType: "defense_turret", factionId: "player" }),
		);
		const b = e.get(Building)!;
		expect(b.buildingType).toBe("defense_turret");
		expect(b.factionId).toBe("player");
	});
});

describe("PowerGrid trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(PowerGrid);
		const p = e.get(PowerGrid)!;
		expect(p.powerDelta).toBe(0);
		expect(p.storageCapacity).toBe(0);
		expect(p.currentCharge).toBe(0);
		expect(p.powerRadius).toBe(0);
	});

	it("spawns with custom values", () => {
		const e = world.spawn(
			PowerGrid({ powerDelta: 5, storageCapacity: 20, powerRadius: 12 }),
		);
		const p = e.get(PowerGrid)!;
		expect(p.powerDelta).toBe(5);
		expect(p.storageCapacity).toBe(20);
		expect(p.powerRadius).toBe(12);
	});
});

describe("SignalNode trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(SignalNode);
		const s = e.get(SignalNode)!;
		expect(s.range).toBe(0);
		expect(s.strength).toBe(1.0);
	});
});

describe("TurretStats trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(TurretStats);
		const t = e.get(TurretStats)!;
		expect(t.attackDamage).toBe(3);
		expect(t.attackRange).toBe(8);
		expect(t.cooldownTurns).toBe(2);
		expect(t.currentCooldown).toBe(0);
	});
});

describe("BotFabricator trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(BotFabricator);
		const f = e.get(BotFabricator)!;
		expect(f.fabricationSlots).toBe(1);
		expect(f.queueSize).toBe(0);
	});
});

describe("StorageCapacity trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(StorageCapacity);
		const s = e.get(StorageCapacity)!;
		expect(s.capacity).toBe(50);
	});
});
