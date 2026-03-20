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
} from "../../traits";
import {
	FabricationJob,
	queueFabrication,
	ROBOT_COSTS,
	runFabrication,
} from "../fabricationSystem";

describe("fabricationSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		// Spawn player faction with resources
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
				iron_ore: 20,
				steel: 20,
				timber: 20,
				circuits: 20,
				coal: 20,
				glass: 20,
				fuel: 20,
				quantum_crystal: 20,
				stone: 20,
				sand: 20,
				alloy: 20,
			}),
		);
	});

	afterEach(() => {
		world.destroy();
	});

	function spawnMotorPool(powered: boolean) {
		const entity = world.spawn(
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
		if (powered) {
			entity.add(Powered);
		}
		return entity;
	}

	describe("queueFabrication", () => {
		it("queues a job when powered and affordable", () => {
			const pool = spawnMotorPool(true);

			const result = queueFabrication(world, pool, "scout");

			expect(result).toEqual({ ok: true });
			expect(pool.get(BotFabricator)!.queueSize).toBe(1);

			// Job entity should exist
			const jobs = world.query(FabricationJob);
			expect(jobs.length).toBe(1);
			const job = jobs[0]!.get(FabricationJob)!;
			expect(job.robotClass).toBe("scout");
			expect(job.turnsRemaining).toBe(ROBOT_COSTS.scout.buildTime);
			expect(job.factionId).toBe("player");
		});

		it("rejects when not powered", () => {
			const pool = spawnMotorPool(false);

			const result = queueFabrication(world, pool, "scout");

			expect(result).toEqual({ ok: false, reason: "not_powered" });
			expect(world.query(FabricationJob).length).toBe(0);
		});

		it("rejects when queue is full", () => {
			const pool = spawnMotorPool(true);
			// Tier 1 motor pool has 2 effective slots — fill both
			queueFabrication(world, pool, "scout");
			queueFabrication(world, pool, "scout");

			const result = queueFabrication(world, pool, "worker");

			expect(result).toEqual({ ok: false, reason: "queue_full" });
			expect(world.query(FabricationJob).length).toBe(2);
		});

		it("rejects when cannot afford", () => {
			// Drain all resources
			for (const e of world.query(ResourcePool, Faction)) {
				e.set(ResourcePool, {
					iron_ore: 0,
					steel: 0,
					timber: 0,
					circuits: 0,
					coal: 0,
					glass: 0,
					fuel: 0,
					quantum_crystal: 0,
					stone: 0,
					sand: 0,
					alloy: 0,
				});
			}
			const pool = spawnMotorPool(true);

			const result = queueFabrication(world, pool, "infantry");

			expect(result).toEqual({ ok: false, reason: "cannot_afford" });
		});

		it("deducts resources on success", () => {
			const pool = spawnMotorPool(true);
			queueFabrication(world, pool, "scout");

			// Scout costs: iron_ore: 2, circuits: 1
			for (const e of world.query(ResourcePool, Faction)) {
				const r = e.get(ResourcePool)!;
				expect(r.iron_ore).toBe(18); // 20 - 2
				expect(r.circuits).toBe(19); // 20 - 1
			}
		});
	});

	describe("runFabrication", () => {
		it("ticks down turnsRemaining each turn", () => {
			const pool = spawnMotorPool(true);
			queueFabrication(world, pool, "scout");

			runFabrication(world);

			const jobs = world.query(FabricationJob);
			expect(jobs.length).toBe(1);
			expect(jobs[0]!.get(FabricationJob)!.turnsRemaining).toBe(
				ROBOT_COSTS.scout.buildTime - 1,
			);
		});

		it("does not tick when motor pool is unpowered", () => {
			const pool = spawnMotorPool(true);
			queueFabrication(world, pool, "scout");

			// Remove power
			pool.remove(Powered);

			runFabrication(world);

			const jobs = world.query(FabricationJob);
			expect(jobs.length).toBe(1);
			expect(jobs[0]!.get(FabricationJob)!.turnsRemaining).toBe(
				ROBOT_COSTS.scout.buildTime,
			);
		});

		it("spawns robot and removes job on completion", () => {
			const pool = spawnMotorPool(true);
			queueFabrication(world, pool, "scout");

			// Tick down to completion
			const buildTime = ROBOT_COSTS.scout.buildTime;
			for (let i = 0; i < buildTime; i++) {
				runFabrication(world);
			}

			// Job should be gone
			expect(world.query(FabricationJob).length).toBe(0);

			// Robot should exist at motor pool tile
			const units = world.query(UnitPos, UnitStats, UnitFaction);
			expect(units.length).toBe(1);
			const pos = units[0]!.get(UnitPos)!;
			expect(pos.tileX).toBe(5);
			expect(pos.tileZ).toBe(5);
			const faction = units[0]!.get(UnitFaction)!;
			expect(faction.factionId).toBe("player");
		});

		it("frees fabrication slot on completion", () => {
			const pool = spawnMotorPool(true);
			queueFabrication(world, pool, "scout");
			expect(pool.get(BotFabricator)!.queueSize).toBe(1);

			const buildTime = ROBOT_COSTS.scout.buildTime;
			for (let i = 0; i < buildTime; i++) {
				runFabrication(world);
			}

			expect(pool.get(BotFabricator)!.queueSize).toBe(0);
		});

		it("removes orphaned jobs when motor pool is destroyed", () => {
			const pool = spawnMotorPool(true);
			queueFabrication(world, pool, "scout");

			// Destroy the motor pool
			pool.destroy();

			runFabrication(world);

			// Job should be cleaned up
			expect(world.query(FabricationJob).length).toBe(0);
			// No robot should have spawned
			expect(world.query(UnitPos).length).toBe(0);
		});
	});
});
