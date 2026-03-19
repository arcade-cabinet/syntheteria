import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	BotFabricator,
	Building,
	Powered,
	Faction,
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
				ferrous_scrap: 20,
				alloy_stock: 20,
				polymer_salvage: 20,
				conductor_wire: 20,
				electrolyte: 20,
				silicon_wafer: 20,
				storm_charge: 20,
				el_crystal: 20,
				scrap_metal: 20,
				e_waste: 20,
				intact_components: 20,
				thermal_fluid: 20,
				depth_salvage: 20,
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
			// Fill the single slot
			queueFabrication(world, pool, "scout");

			const result = queueFabrication(world, pool, "worker");

			expect(result).toEqual({ ok: false, reason: "queue_full" });
			expect(world.query(FabricationJob).length).toBe(1);
		});

		it("rejects when cannot afford", () => {
			// Drain all resources
			for (const e of world.query(ResourcePool, Faction)) {
				e.set(ResourcePool, {
					ferrous_scrap: 0,
					alloy_stock: 0,
					polymer_salvage: 0,
					conductor_wire: 0,
					electrolyte: 0,
					silicon_wafer: 0,
					storm_charge: 0,
					el_crystal: 0,
					scrap_metal: 0,
					e_waste: 0,
					intact_components: 0,
					thermal_fluid: 0,
					depth_salvage: 0,
				});
			}
			const pool = spawnMotorPool(true);

			const result = queueFabrication(world, pool, "ranged");

			expect(result).toEqual({ ok: false, reason: "cannot_afford" });
		});

		it("deducts resources on success", () => {
			const pool = spawnMotorPool(true);
			queueFabrication(world, pool, "scout");

			// Scout costs: ferrous_scrap: 2, conductor_wire: 1
			for (const e of world.query(ResourcePool, Faction)) {
				const r = e.get(ResourcePool)!;
				expect(r.ferrous_scrap).toBe(18); // 20 - 2
				expect(r.conductor_wire).toBe(19); // 20 - 1
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
