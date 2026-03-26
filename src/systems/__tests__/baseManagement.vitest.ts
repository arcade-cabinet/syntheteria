/**
 * Tests for the base management system.
 *
 * Covers base founding validation, production ticks,
 * power calculation, and storage operations.
 */

import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import { Base, EntityId, Faction, Position } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	addToBaseStorage,
	basePowerTick,
	baseProductionTick,
	enqueueProduction,
	foundBase,
	getBaseStorage,
	getProductionQueue,
	parseInfrastructure,
	parseProductionQueue,
	parseStorage,
	removeFromBaseStorage,
	resetBaseIdCounter,
	serializeInfrastructure,
	serializeProductionQueue,
	serializeStorage,
	validateBaseLocation,
} from "../baseManagement";

// ─── Cleanup ─────────────────────────────────────────────────────────────────

const entities: Entity[] = [];

afterEach(() => {
	for (const entity of entities) {
		try {
			entity.destroy();
		} catch {
			// Entity may already be destroyed
		}
	}
	entities.length = 0;
	resetBaseIdCounter();
});

/** Found a base and track the entity for cleanup. */
function testFoundBase(
	tileX: number,
	tileZ: number,
	factionId: string,
	name: string,
): Entity {
	const entity = foundBase(world, tileX, tileZ, factionId, name);
	entities.push(entity);
	return entity;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("JSON helpers", () => {
	it("parseProductionQueue handles empty and valid JSON", () => {
		expect(parseProductionQueue("[]")).toEqual([]);
		const items = [
			{ unitType: "drone", progress: 0.5, cost: { scrapMetal: 5 } },
		];
		expect(parseProductionQueue(JSON.stringify(items))).toEqual(items);
	});

	it("parseProductionQueue handles invalid JSON gracefully", () => {
		expect(parseProductionQueue("INVALID")).toEqual([]);
	});

	it("serializeProductionQueue round-trips", () => {
		const items = [{ unitType: "bot", progress: 0, cost: { circuitry: 3 } }];
		expect(parseProductionQueue(serializeProductionQueue(items))).toEqual(
			items,
		);
	});

	it("parseInfrastructure handles empty and valid JSON", () => {
		expect(parseInfrastructure("[]")).toEqual([]);
		const items = [{ type: "lightning_rod", count: 2 }];
		expect(parseInfrastructure(JSON.stringify(items))).toEqual(items);
	});

	it("parseStorage handles empty and valid JSON", () => {
		expect(parseStorage("{}")).toEqual({});
		const storage = { scrapMetal: 10, circuitry: 5 };
		expect(parseStorage(JSON.stringify(storage))).toEqual(storage);
	});

	it("serializeStorage round-trips", () => {
		const storage = { durasteel: 15, powerCells: 3 };
		expect(parseStorage(serializeStorage(storage))).toEqual(storage);
	});
});

describe("validateBaseLocation", () => {
	it("rejects player base in enemy territory (northern zone)", () => {
		// z=10 is well within enemy zone (nz < 0.25 -> z < 64 in WORLD_EXTENT=256)
		const error = validateBaseLocation(world, 128, 10, "player");
		expect(error).toBe("Cannot found a base in enemy territory");
	});

	it("allows player base in city zone", () => {
		// z=128, x=128 -> normalized (0.5, 0.5), city zone
		const error = validateBaseLocation(world, 128, 128, "player");
		expect(error).toBeNull();
	});

	it("allows cult base in enemy territory", () => {
		const error = validateBaseLocation(world, 128, 10, "cultist");
		expect(error).toBeNull();
	});

	it("rejects base too close to another base", () => {
		// Place one base
		testFoundBase(128, 128, "player", "First Base");

		// Try to place another within MIN_BASE_SPACING (8)
		const error = validateBaseLocation(world, 130, 130, "player");
		expect(error).toContain("Too close to existing base");
	});

	it("allows base at sufficient distance", () => {
		testFoundBase(128, 128, "player", "First Base");

		// Place another at 20 tiles away -- well beyond MIN_BASE_SPACING
		const error = validateBaseLocation(world, 148, 128, "player");
		expect(error).toBeNull();
	});
});

describe("foundBase", () => {
	it("spawns a base entity with correct traits", () => {
		const entity = testFoundBase(128, 128, "player", "Alpha Base");

		expect(entity.has(Base)).toBe(true);
		expect(entity.has(Position)).toBe(true);
		expect(entity.has(Faction)).toBe(true);
		expect(entity.has(EntityId)).toBe(true);

		const base = entity.get(Base)!;
		expect(base.name).toBe("Alpha Base");
		expect(base.tileX).toBe(128);
		expect(base.tileZ).toBe(128);
		expect(base.factionId).toBe("player");
		expect(base.power).toBe(0);
	});

	it("sets Position from tile coordinates using TILE_SIZE_M", () => {
		const entity = testFoundBase(128, 128, "player", "Test");
		const pos = entity.get(Position)!;
		// TILE_SIZE_M = 2.0
		expect(pos.x).toBe(256); // 128 * 2
		expect(pos.z).toBe(256); // 128 * 2
	});

	it("generates unique EntityId for each base", () => {
		const b1 = testFoundBase(100, 128, "player", "Base 1");
		const b2 = testFoundBase(200, 128, "player", "Base 2");

		const id1 = b1.get(EntityId)!.value;
		const id2 = b2.get(EntityId)!.value;
		expect(id1).not.toBe(id2);
		expect(id1).toMatch(/^base_/);
		expect(id2).toMatch(/^base_/);
	});

	it("throws on invalid location", () => {
		expect(() => {
			foundBase(world, 128, 10, "player", "Bad Base");
		}).toThrow("Cannot found a base in enemy territory");
	});

	it("allows cult base in enemy territory", () => {
		const entity = testFoundBase(100, 10, "cultist", "Cult Fort");
		expect(entity.get(Faction)!.value).toBe("cultist");
		expect(entity.get(Base)!.factionId).toBe("cultist");
	});
});

describe("baseProductionTick", () => {
	it("advances production progress", () => {
		const entity = testFoundBase(128, 128, "player", "Prod Base");
		enqueueProduction(entity, "maintenance_bot", { scrapMetal: 10 });

		// Run 1 second of production (rate = 0.1 per sec)
		baseProductionTick(world, 1.0);

		const queue = getProductionQueue(entity);
		expect(queue.length).toBe(1);
		expect(queue[0]!.progress).toBeCloseTo(0.1);
	});

	it("completes production when progress reaches 1.0", () => {
		const entity = testFoundBase(128, 128, "player", "Prod Base");
		enqueueProduction(entity, "utility_drone", { circuitry: 5 });

		// Run 10 seconds (0.1 * 10 = 1.0 -> complete)
		const completed = baseProductionTick(world, 10.0);

		expect(completed.length).toBe(1);
		expect(completed[0]!.item.unitType).toBe("utility_drone");
		expect(completed[0]!.item.progress).toBe(1);

		// Queue should be empty after completion
		const queue = getProductionQueue(entity);
		expect(queue.length).toBe(0);
	});

	it("only advances the first item in the queue", () => {
		const entity = testFoundBase(128, 128, "player", "Prod Base");
		enqueueProduction(entity, "drone_a", { scrapMetal: 5 });
		enqueueProduction(entity, "drone_b", { scrapMetal: 5 });

		baseProductionTick(world, 1.0);

		const queue = getProductionQueue(entity);
		expect(queue.length).toBe(2);
		expect(queue[0]!.progress).toBeCloseTo(0.1);
		expect(queue[1]!.progress).toBe(0); // Second item untouched
	});

	it("does nothing for bases with empty queues", () => {
		testFoundBase(128, 128, "player", "Empty Base");
		const completed = baseProductionTick(world, 5.0);
		expect(completed.length).toBe(0);
	});
});

describe("basePowerTick", () => {
	it("calculates power from lightning rod infrastructure", () => {
		const entity = testFoundBase(128, 128, "player", "Power Base");

		// Add infrastructure
		const infra = [{ type: "lightning_rod", count: 3 }];
		entity.set(Base, {
			infrastructureJson: serializeInfrastructure(infra),
		});

		basePowerTick(world);

		const base = entity.get(Base)!;
		expect(base.power).toBe(15); // 3 * 5 kW per rod
	});

	it("sets power to 0 with no infrastructure", () => {
		const entity = testFoundBase(128, 128, "player", "No Power");
		basePowerTick(world);
		expect(entity.get(Base)!.power).toBe(0);
	});

	it("handles multiple infrastructure types", () => {
		const entity = testFoundBase(128, 128, "player", "Multi Base");
		const infra = [
			{ type: "lightning_rod", count: 2 },
			{ type: "solar_panel", count: 4 }, // Unknown type, contributes 0
		];
		entity.set(Base, {
			infrastructureJson: serializeInfrastructure(infra),
		});

		basePowerTick(world);
		expect(entity.get(Base)!.power).toBe(10); // Only lightning rods counted
	});
});

describe("storage operations", () => {
	it("getBaseStorage returns empty object for new base", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		const storage = getBaseStorage(entity);
		expect(storage).toEqual({});
	});

	it("addToBaseStorage adds materials", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		addToBaseStorage(entity, "scrapMetal", 10);
		addToBaseStorage(entity, "circuitry", 5);

		const storage = getBaseStorage(entity);
		expect(storage.scrapMetal).toBe(10);
		expect(storage.circuitry).toBe(5);
	});

	it("addToBaseStorage accumulates", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		addToBaseStorage(entity, "scrapMetal", 10);
		addToBaseStorage(entity, "scrapMetal", 7);

		expect(getBaseStorage(entity).scrapMetal).toBe(17);
	});

	it("removeFromBaseStorage removes materials and returns true", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		addToBaseStorage(entity, "durasteel", 20);

		const result = removeFromBaseStorage(entity, "durasteel", 8);
		expect(result).toBe(true);
		expect(getBaseStorage(entity).durasteel).toBe(12);
	});

	it("removeFromBaseStorage returns false when insufficient", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		addToBaseStorage(entity, "powerCells", 3);

		const result = removeFromBaseStorage(entity, "powerCells", 10);
		expect(result).toBe(false);
		// Should not have changed
		expect(getBaseStorage(entity).powerCells).toBe(3);
	});

	it("removeFromBaseStorage cleans up zero entries", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		addToBaseStorage(entity, "scrapMetal", 5);
		removeFromBaseStorage(entity, "scrapMetal", 5);

		const storage = getBaseStorage(entity);
		expect("scrapMetal" in storage).toBe(false);
	});

	it("removeFromBaseStorage returns false for missing material", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		const result = removeFromBaseStorage(entity, "nonexistent", 1);
		expect(result).toBe(false);
	});
});

describe("enqueueProduction", () => {
	it("adds items to the production queue", () => {
		const entity = testFoundBase(128, 128, "player", "Queue Base");
		enqueueProduction(entity, "maintenance_bot", {
			scrapMetal: 10,
			circuitry: 3,
		});

		const queue = getProductionQueue(entity);
		expect(queue.length).toBe(1);
		expect(queue[0]!.unitType).toBe("maintenance_bot");
		expect(queue[0]!.progress).toBe(0);
		expect(queue[0]!.cost).toEqual({ scrapMetal: 10, circuitry: 3 });
	});

	it("appends to existing queue", () => {
		const entity = testFoundBase(128, 128, "player", "Queue Base");
		enqueueProduction(entity, "drone_a", { scrapMetal: 5 });
		enqueueProduction(entity, "drone_b", { circuitry: 8 });

		const queue = getProductionQueue(entity);
		expect(queue.length).toBe(2);
		expect(queue[0]!.unitType).toBe("drone_a");
		expect(queue[1]!.unitType).toBe("drone_b");
	});
});
