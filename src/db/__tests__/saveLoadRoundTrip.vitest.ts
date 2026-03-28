/**
 * Save/load round-trip tests for the serialization layer.
 *
 * Tests serializeUnits/applyUnits, serializeResources/applyResources
 * directly — no DB adapter or SQL needed. Exercises the ECS <-> record
 * conversion that sits between the Koota world and the persistence repo.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import {
	addResource,
	getResources,
	resetResources,
} from "../../systems/resources";
import {
	applyResources,
	applyUnits,
	serializeResources,
	serializeUnits,
} from "../serialize";

// ---------------------------------------------------------------------------
// serializeUnits / applyUnits
// ---------------------------------------------------------------------------

describe("serializeWorld captures unit entities", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("serializes spawned units into UnitRecord[]", () => {
		world.spawn(
			EntityId({ value: "scout_1" }),
			Position({ x: 4, y: 0.5, z: 12 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_a" }),
			Unit({
				unitType: "scout_bot",
				displayName: "Scout Alpha",
				speed: 5,
				selected: false,
			}),
			UnitComponents({
				componentsJson: JSON.stringify([
					{ name: "camera", functional: true, material: "electronic" },
				]),
			}),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		);

		world.spawn(
			EntityId({ value: "maint_2" }),
			Position({ x: 20, y: 0, z: 30 }),
			Faction({ value: "cultist" }),
			Fragment({ fragmentId: "frag_b" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Cult Drone",
				speed: 3,
				selected: false,
			}),
			UnitComponents({ componentsJson: "[]" }),
			Navigation({
				pathJson: JSON.stringify([
					{ x: 20, y: 0, z: 31 },
					{ x: 21, y: 0, z: 32 },
				]),
				pathIndex: 1,
				moving: true,
			}),
		);

		const records = serializeUnits(world, "game_test");

		expect(records).toHaveLength(2);

		const scout = records.find((r) => r.entityId === "scout_1");
		expect(scout).toBeDefined();
		expect(scout!.unitType).toBe("scout_bot");
		expect(scout!.displayName).toBe("Scout Alpha");
		expect(scout!.x).toBe(4);
		expect(scout!.y).toBe(0.5);
		expect(scout!.z).toBe(12);
		expect(scout!.speed).toBe(5);
		expect(scout!.faction).toBe("player");
		expect(scout!.fragmentId).toBe("frag_a");
		expect(scout!.gameId).toBe("game_test");

		const cultDrone = records.find((r) => r.entityId === "maint_2");
		expect(cultDrone).toBeDefined();
		expect(cultDrone!.faction).toBe("cultist");
		expect(cultDrone!.moving).toBe(true);
		expect(cultDrone!.pathIndex).toBe(1);

		// Path JSON should survive as-is
		const path = JSON.parse(cultDrone!.pathJson);
		expect(path).toHaveLength(2);
		expect(path[1].z).toBe(32);
	});

	it("returns empty array when no unit entities exist", () => {
		const records = serializeUnits(world, "game_empty");
		expect(records).toHaveLength(0);
	});
});

describe("deserializeWorld restores entities", () => {
	let world: ReturnType<typeof createWorld>;
	let world2: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		world2 = createWorld();
	});

	afterEach(() => {
		world.destroy();
		world2.destroy();
	});

	it("serialize then apply restores all unit trait data", () => {
		// Spawn two units in the source world
		world.spawn(
			EntityId({ value: "u_a" }),
			Position({ x: 7, y: 1, z: 14 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_main" }),
			Unit({
				unitType: "scout_bot",
				displayName: "Alpha",
				speed: 6,
				selected: true,
			}),
			UnitComponents({
				componentsJson: JSON.stringify([
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "arms", functional: false, material: "metal" },
				]),
			}),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		);

		world.spawn(
			EntityId({ value: "u_b" }),
			Position({ x: -3, y: 0, z: 8 }),
			Faction({ value: "rogue" }),
			Fragment({ fragmentId: "frag_outer" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Rogue X",
				speed: 2,
				selected: false,
			}),
			UnitComponents({ componentsJson: "[]" }),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		);

		// Serialize from source world
		const records = serializeUnits(world, "g1");
		expect(records).toHaveLength(2);

		// Apply to a fresh world
		applyUnits(world2, records);

		// Verify restored entities
		const restored = [...world2.query(Unit, EntityId, Position, Faction)];
		expect(restored).toHaveLength(2);

		const alpha = restored.find((e) => e.get(EntityId)!.value === "u_a");
		expect(alpha).toBeDefined();
		expect(alpha!.get(Position)!.x).toBe(7);
		expect(alpha!.get(Position)!.y).toBe(1);
		expect(alpha!.get(Position)!.z).toBe(14);
		expect(alpha!.get(Unit)!.unitType).toBe("scout_bot");
		expect(alpha!.get(Unit)!.displayName).toBe("Alpha");
		expect(alpha!.get(Unit)!.speed).toBe(6);
		expect(alpha!.get(Faction)!.value).toBe("player");
		expect(alpha!.get(Fragment)!.fragmentId).toBe("frag_main");

		// Component damage state preserved
		const comps = JSON.parse(alpha!.get(UnitComponents)!.componentsJson);
		expect(comps).toHaveLength(2);
		expect(comps[0].name).toBe("camera");
		expect(comps[0].functional).toBe(true);
		expect(comps[1].name).toBe("arms");
		expect(comps[1].functional).toBe(false);

		const rogueX = restored.find((e) => e.get(EntityId)!.value === "u_b");
		expect(rogueX).toBeDefined();
		expect(rogueX!.get(Faction)!.value).toBe("rogue");
		expect(rogueX!.get(Position)!.x).toBe(-3);
	});

	it("applyUnits clears existing units before restoring", () => {
		// Existing unit in target world
		world2.spawn(
			EntityId({ value: "old_unit" }),
			Position({ x: 0, y: 0, z: 0 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_old" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Old Bot",
				speed: 3,
				selected: false,
			}),
			UnitComponents({ componentsJson: "[]" }),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		);

		// Serialize from source world (one new unit)
		world.spawn(
			EntityId({ value: "new_unit" }),
			Position({ x: 10, y: 0, z: 20 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_new" }),
			Unit({
				unitType: "scout_bot",
				displayName: "New Bot",
				speed: 5,
				selected: false,
			}),
			UnitComponents({ componentsJson: "[]" }),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		);

		const records = serializeUnits(world, "g2");

		// Apply should replace old_unit with new_unit
		applyUnits(world2, records);

		const all = [...world2.query(Unit, EntityId)];
		expect(all).toHaveLength(1);
		expect(all[0]!.get(EntityId)!.value).toBe("new_unit");
	});

	it("navigation path and moving state survive round-trip", () => {
		const waypoints = [
			{ x: 1, y: 0, z: 2 },
			{ x: 3, y: 0, z: 4 },
			{ x: 5, y: 0, z: 6 },
		];

		world.spawn(
			EntityId({ value: "nav_unit" }),
			Position({ x: 1, y: 0, z: 2 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "f1" }),
			Unit({
				unitType: "scout_bot",
				displayName: "Nav Bot",
				speed: 4,
				selected: false,
			}),
			UnitComponents({ componentsJson: "[]" }),
			Navigation({
				pathJson: JSON.stringify(waypoints),
				pathIndex: 2,
				moving: true,
			}),
		);

		const records = serializeUnits(world, "g3");
		applyUnits(world2, records);

		const restored = [...world2.query(Navigation, EntityId)];
		expect(restored).toHaveLength(1);

		const nav = restored[0]!.get(Navigation)!;
		expect(nav.moving).toBe(true);
		expect(nav.pathIndex).toBe(2);

		const restoredPath = JSON.parse(nav.pathJson);
		expect(restoredPath).toHaveLength(3);
		expect(restoredPath[2].x).toBe(5);
		expect(restoredPath[2].z).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// serializeResources / applyResources
// ---------------------------------------------------------------------------

describe("resource pool round-trips correctly", () => {
	beforeEach(() => {
		resetResources();
	});

	it("serializes current resource pool into a record", () => {
		addResource("scrapMetal", 25);
		addResource("circuitry", 12);
		addResource("powerCells", 7);
		addResource("durasteel", 4);

		const record = serializeResources("game_res");

		expect(record.gameId).toBe("game_res");
		expect(record.scrapMetal).toBe(25);
		expect(record.circuitry).toBe(12);
		expect(record.powerCells).toBe(7);
		expect(record.durasteel).toBe(4);
	});

	it("applyResources restores the global resource pool from a record", () => {
		// Set initial state
		addResource("scrapMetal", 100);
		addResource("circuitry", 50);

		// Apply a saved record with different amounts
		applyResources({
			gameId: "game_load",
			scrapMetal: 15,
			circuitry: 8,
			powerCells: 3,
			durasteel: 2,
		});

		const pool = getResources();
		expect(pool.scrapMetal).toBe(15);
		expect(pool.circuitry).toBe(8);
		expect(pool.powerCells).toBe(3);
		expect(pool.durasteel).toBe(2);
	});

	it("full round-trip: set resources -> serialize -> clear -> apply -> verify", () => {
		// Step 1: Set resources
		addResource("scrapMetal", 42);
		addResource("circuitry", 19);
		addResource("powerCells", 11);
		addResource("durasteel", 6);

		// Step 2: Serialize
		const saved = serializeResources("game_rt");

		// Step 3: Clear (simulate a fresh session)
		resetResources();
		const cleared = getResources();
		expect(cleared.scrapMetal).toBe(0);
		expect(cleared.circuitry).toBe(0);
		expect(cleared.powerCells).toBe(0);
		expect(cleared.durasteel).toBe(0);

		// Step 4: Apply
		applyResources(saved);

		// Step 5: Verify
		const restored = getResources();
		expect(restored.scrapMetal).toBe(42);
		expect(restored.circuitry).toBe(19);
		expect(restored.powerCells).toBe(11);
		expect(restored.durasteel).toBe(6);
	});

	it("applyResources with all zeros sets pool to zero", () => {
		addResource("scrapMetal", 99);
		addResource("durasteel", 50);

		applyResources({
			gameId: "game_zero",
			scrapMetal: 0,
			circuitry: 0,
			powerCells: 0,
			durasteel: 0,
		});

		const pool = getResources();
		expect(pool.scrapMetal).toBe(0);
		expect(pool.circuitry).toBe(0);
		expect(pool.powerCells).toBe(0);
		expect(pool.durasteel).toBe(0);
	});
});
