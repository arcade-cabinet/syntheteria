import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	BotFabricator,
	Building,
	Faction,
	Powered,
	ResourcePool,
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../../traits";
import { FabricationJob, queueFabrication } from "../fabricationSystem";
import {
	BASE_POP_CAP,
	canSpawnUnit,
	getPopCap,
	getPopulation,
	POP_PER_OUTPOST,
	POP_PER_POWER_PLANT,
} from "../populationSystem";

describe("populationSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		// Player faction with plenty of resources
		world.spawn(
			Faction({
				id: "player",
				displayName: "Player",
				color: 0x00ff00,
				persona: "otter",
				isPlayer: true,
				aggression: 0,
			}),
			ResourcePool({
				iron_ore: 99,
				steel: 99,
				timber: 99,
				circuits: 99,
				coal: 99,
				glass: 99,
				fuel: 99,
				quantum_crystal: 99,
				stone: 99,
				sand: 99,
				alloy: 99,
			}),
		);
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnUnit(factionId: string, tileX = 0, tileZ = 0) {
		return world.spawn(
			UnitPos({ tileX, tileZ }),
			UnitStats({
				hp: 5,
				maxHp: 5,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 1,
				defense: 0,
				attackRange: 1,
			}),
			UnitVisual({ modelId: "scout", scale: 1.0, facingAngle: 0 }),
			UnitFaction({ factionId }),
		);
	}

	function spawnBuilding(
		type: "outpost" | "power_plant",
		factionId: string,
		powered: boolean,
	) {
		const e = world.spawn(
			Building({
				tileX: 10,
				tileZ: 10,
				buildingType: type,
				modelId: "test",
				factionId,
				hp: 50,
				maxHp: 50,
			}),
		);
		if (powered) e.add(Powered);
		return e;
	}

	function spawnMotorPool(powered: boolean) {
		const e = world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				buildingType: "motor_pool",
				modelId: "test",
				factionId: "player",
				hp: 80,
				maxHp: 80,
			}),
			BotFabricator({ fabricationSlots: 1, queueSize: 0 }),
		);
		if (powered) e.add(Powered);
		return e;
	}

	// ─── getPopulation ────────────────────────────────────────────────────

	describe("getPopulation", () => {
		it("returns 0 when no units exist", () => {
			expect(getPopulation(world, "player")).toBe(0);
		});

		it("counts only units of the specified faction", () => {
			spawnUnit("player");
			spawnUnit("player");
			spawnUnit("iron_creed");

			expect(getPopulation(world, "player")).toBe(2);
			expect(getPopulation(world, "iron_creed")).toBe(1);
		});
	});

	// ─── getPopCap ────────────────────────────────────────────────────────

	describe("getPopCap", () => {
		it("returns base cap when no buildings exist", () => {
			expect(getPopCap(world, "player")).toBe(BASE_POP_CAP);
		});

		it("adds POP_PER_OUTPOST for each powered outpost", () => {
			spawnBuilding("outpost", "player", true);
			spawnBuilding("outpost", "player", true);

			expect(getPopCap(world, "player")).toBe(
				BASE_POP_CAP + 2 * POP_PER_OUTPOST,
			);
		});

		it("adds POP_PER_POWER_PLANT for each powered power plant", () => {
			spawnBuilding("power_plant", "player", true);

			expect(getPopCap(world, "player")).toBe(
				BASE_POP_CAP + POP_PER_POWER_PLANT,
			);
		});

		it("combines outposts and power plants", () => {
			spawnBuilding("outpost", "player", true);
			spawnBuilding("power_plant", "player", true);

			expect(getPopCap(world, "player")).toBe(
				BASE_POP_CAP + POP_PER_OUTPOST + POP_PER_POWER_PLANT,
			);
		});

		it("ignores unpowered buildings", () => {
			spawnBuilding("outpost", "player", false);
			spawnBuilding("power_plant", "player", false);

			expect(getPopCap(world, "player")).toBe(BASE_POP_CAP);
		});

		it("ignores buildings belonging to other factions", () => {
			spawnBuilding("outpost", "iron_creed", true);

			expect(getPopCap(world, "player")).toBe(BASE_POP_CAP);
			expect(getPopCap(world, "iron_creed")).toBe(
				BASE_POP_CAP + POP_PER_OUTPOST,
			);
		});
	});

	// ─── canSpawnUnit ─────────────────────────────────────────────────────

	describe("canSpawnUnit", () => {
		it("returns true when under cap", () => {
			spawnUnit("player");
			expect(canSpawnUnit(world, "player")).toBe(true);
		});

		it("returns false when at cap", () => {
			// Base cap = 6, spawn exactly 6
			for (let i = 0; i < BASE_POP_CAP; i++) {
				spawnUnit("player", i, 0);
			}

			expect(canSpawnUnit(world, "player")).toBe(false);
		});

		it("returns true when at cap but an outpost raises it", () => {
			for (let i = 0; i < BASE_POP_CAP; i++) {
				spawnUnit("player", i, 0);
			}
			spawnBuilding("outpost", "player", true);

			expect(canSpawnUnit(world, "player")).toBe(true);
		});

		it("always returns true for cult factions", () => {
			// Spawn way more than any cap would allow
			for (let i = 0; i < 20; i++) {
				spawnUnit("cult_abyss", i, 0);
			}

			expect(canSpawnUnit(world, "cult_abyss")).toBe(true);
		});
	});

	// ─── Integration with fabrication ─────────────────────────────────────

	describe("fabrication pop cap integration", () => {
		it("queueFabrication rejects when at pop cap", () => {
			const pool = spawnMotorPool(true);

			// Fill up to base cap
			for (let i = 0; i < BASE_POP_CAP; i++) {
				spawnUnit("player", i, 0);
			}

			const result = queueFabrication(world, pool, "scout");
			expect(result).toEqual({ ok: false, reason: "pop_cap" });
			expect(world.query(FabricationJob).length).toBe(0);
		});

		it("queueFabrication succeeds when under pop cap", () => {
			const pool = spawnMotorPool(true);

			// Spawn fewer than base cap
			spawnUnit("player");

			const result = queueFabrication(world, pool, "scout");
			expect(result).toEqual({ ok: true });
		});

		it("queueFabrication succeeds at cap with outpost boost", () => {
			const pool = spawnMotorPool(true);
			spawnBuilding("outpost", "player", true);

			// Fill up to base cap (but outpost provides +4 more)
			for (let i = 0; i < BASE_POP_CAP; i++) {
				spawnUnit("player", i, 0);
			}

			const result = queueFabrication(world, pool, "scout");
			expect(result).toEqual({ ok: true });
		});
	});
});
