/**
 * AI fabrication — verifies factions can fabricate units at powered motor pools.
 *
 * Root cause of #112: factions accumulate resources but never produce units,
 * because the fabrication chain requires:
 *   1. A motor_pool building (which requires advanced materials to construct)
 *   2. The motor_pool must be Powered (within storm_transmitter radius)
 *   3. The faction must afford the robot's material cost
 *   4. Population must be under cap
 *
 * These tests verify the full chain works end-to-end.
 */

import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import type { GeneratedBoard, TileData } from "../../board/types";
import { BUILDING_DEFS } from "../../buildings/definitions";
import { Faction } from "../../traits/faction";
import { ResourcePool } from "../../traits/resource";
import {
	BotFabricator,
	Building,
	type BuildingType,
	Powered,
	PowerGrid,
} from "../../traits/building";
import { Board } from "../../traits/board";
import {
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../traits/unit";
import { FabricationJob, queueFabrication, ROBOT_COSTS } from "../../systems/fabricationSystem";
import { runPowerGrid } from "../../systems/powerSystem";
import { resetAIRuntime, runYukaAiTurns } from "../yukaAiTurnSystem";

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

function spawnFactionEntity(
	world: ReturnType<typeof createWorld>,
	factionId: string,
	resources: Partial<Record<string, number>> = {},
) {
	world.spawn(
		Faction({ id: factionId, isPlayer: false }),
		ResourcePool({
			scrap_metal: 0,
			ferrous_scrap: 0,
			alloy_stock: 0,
			polymer_salvage: 0,
			conductor_wire: 0,
			electrolyte: 0,
			silicon_wafer: 0,
			storm_charge: 0,
			el_crystal: 0,
			e_waste: 0,
			intact_components: 0,
			thermal_fluid: 0,
			depth_salvage: 0,
			...resources,
		}),
	);
}

function spawnMotorPool(
	world: ReturnType<typeof createWorld>,
	factionId: string,
	tileX: number,
	tileZ: number,
) {
	const def = BUILDING_DEFS.motor_pool;
	const entity = world.spawn(
		Building({
			tileX,
			tileZ,
			buildingType: "motor_pool",
			modelId: def.modelId,
			factionId,
			hp: def.hp,
			maxHp: def.hp,
		}),
		PowerGrid({
			powerDelta: def.powerDelta,
			storageCapacity: 0,
			currentCharge: 0,
			powerRadius: 0,
		}),
		BotFabricator({
			fabricationSlots: def.fabricationSlots,
			queueSize: 0,
		}),
	);
	return entity;
}

function spawnTransmitter(
	world: ReturnType<typeof createWorld>,
	factionId: string,
	tileX: number,
	tileZ: number,
) {
	const def = BUILDING_DEFS.storm_transmitter;
	return world.spawn(
		Building({
			tileX,
			tileZ,
			buildingType: "storm_transmitter",
			modelId: def.modelId,
			factionId,
			hp: def.hp,
			maxHp: def.hp,
		}),
		PowerGrid({
			powerDelta: def.powerDelta,
			storageCapacity: 0,
			currentCharge: 0,
			powerRadius: def.powerRadius,
		}),
	);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AI fabrication chain", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		resetAIRuntime();
		world = createWorld();
		world.spawn(
			Board({
				width: 16,
				height: 16,
				seed: "test",
				tileSizeM: 2.0,
				turn: 5,
				climateProfile: "temperate",
				stormProfile: "volatile",
				difficulty: "standard",
			}),
		);
	});

	it("motor pool within transmitter range gets Powered after runPowerGrid", () => {
		spawnTransmitter(world, "reclaimers", 5, 5);
		const pool = spawnMotorPool(world, "reclaimers", 6, 5);

		// Before power grid: not powered
		expect(pool.has(Powered)).toBe(false);

		runPowerGrid(world);

		// After power grid: within radius 12 → powered
		expect(pool.has(Powered)).toBe(true);
	});

	it("motor pool outside transmitter range is NOT Powered", () => {
		spawnTransmitter(world, "reclaimers", 0, 0);
		const pool = spawnMotorPool(world, "reclaimers", 15, 15);

		runPowerGrid(world);

		// Manhattan distance 30 > radius 12 → not powered
		expect(pool.has(Powered)).toBe(false);
	});

	it("queueFabrication succeeds with powered motor pool + resources", () => {
		spawnTransmitter(world, "reclaimers", 5, 5);
		const pool = spawnMotorPool(world, "reclaimers", 6, 5);
		spawnFactionEntity(world, "reclaimers", {
			ferrous_scrap: 20,
			conductor_wire: 10,
		});

		runPowerGrid(world);

		const result = queueFabrication(world, pool, "scout");
		expect(result.ok).toBe(true);

		// Should have created a FabricationJob
		const jobs = world.query(FabricationJob);
		let found = false;
		for (const e of jobs) {
			const j = e.get(FabricationJob);
			if (j && j.factionId === "reclaimers") {
				found = true;
				expect(j.robotClass).toBe("scout");
			}
		}
		expect(found).toBe(true);
	});

	it("queueFabrication fails without power", () => {
		const pool = spawnMotorPool(world, "reclaimers", 6, 5);
		// No transmitter → not powered
		spawnFactionEntity(world, "reclaimers", {
			ferrous_scrap: 20,
			conductor_wire: 10,
		});

		const result = queueFabrication(world, pool, "scout");
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.reason).toBe("not_powered");
	});

	it("queueFabrication fails without resources", () => {
		spawnTransmitter(world, "reclaimers", 5, 5);
		const pool = spawnMotorPool(world, "reclaimers", 6, 5);
		spawnFactionEntity(world, "reclaimers", {}); // Empty resources

		runPowerGrid(world);

		const result = queueFabrication(world, pool, "scout");
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.reason).toBe("cannot_afford");
	});

	it("runYukaAiTurns queues fabrication when faction has powered motor pool + resources", () => {
		// Setup: faction with transmitter + motor pool + plenty of resources + one unit
		spawnTransmitter(world, "reclaimers", 5, 5);
		spawnMotorPool(world, "reclaimers", 6, 5);
		spawnFactionEntity(world, "reclaimers", {
			ferrous_scrap: 50,
			conductor_wire: 20,
			alloy_stock: 10,
			polymer_salvage: 10,
			silicon_wafer: 5,
		});
		// Need at least one AI unit for the turn system to run
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
			UnitStats({
				hp: 10, maxHp: 10,
				ap: 3, maxAp: 3,
				mp: 3, maxMp: 3,
				scanRange: 4,
				attackRange: 1,
				attack: 2,
				defense: 1,
			}),
		);
		// Player far away so AI doesn't just chase
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 15 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
		);

		// Power grid must run BEFORE the AI turn
		runPowerGrid(world);

		const board = makeBoard(16, 16);
		runYukaAiTurns(world, board);

		// Verify a fabrication job was created for reclaimers
		let jobCount = 0;
		for (const e of world.query(FabricationJob)) {
			const j = e.get(FabricationJob);
			if (j && j.factionId === "reclaimers") jobCount++;
		}
		expect(jobCount).toBeGreaterThanOrEqual(1);
	});

	it("starter buildings include a motor_pool for each faction", async () => {
		const { placeStarterBuildings } = await import("../../systems/buildingPlacement");
		const { computeSpawnCenters } = await import("../../robots/placement");

		const board = makeBoard(32, 32);

		// Setup spawn centers — use null player so all factions are AI
		// (playerFactionId=null means all factions use their real ID as key)
		const boardInfo = {
			width: 32,
			height: 32,
			isPassable: () => true,
			getFloorType: () => "durasteel_span" as const,
		};
		computeSpawnCenters(boardInfo, null, [
			"reclaimers",
			"volt_collective",
		]);

		placeStarterBuildings(world, board);
		runPowerGrid(world);

		// Check that each faction has at least one motor_pool
		const factionMotorPools = new Map<string, number>();
		for (const e of world.query(Building)) {
			const b = e.get(Building);
			if (b && b.buildingType === "motor_pool") {
				factionMotorPools.set(
					b.factionId,
					(factionMotorPools.get(b.factionId) ?? 0) + 1,
				);
			}
		}

		// Every active faction should have a motor pool
		for (const fid of ["reclaimers", "volt_collective"]) {
			expect(
				factionMotorPools.get(fid) ?? 0,
				`${fid} should have a motor_pool`,
			).toBeGreaterThanOrEqual(1);
		}

		// Motor pools should be powered (within transmitter range)
		let poweredMotorPools = 0;
		for (const e of world.query(Building, BotFabricator, Powered)) {
			const b = e.get(Building);
			if (b && b.buildingType === "motor_pool") poweredMotorPools++;
		}
		expect(poweredMotorPools).toBeGreaterThanOrEqual(2);
	});
});
