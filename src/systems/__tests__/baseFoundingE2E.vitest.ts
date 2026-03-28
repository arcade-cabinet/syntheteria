/**
 * End-to-end tests for the base founding workflow in the ECS layer.
 *
 * Exercises the full lifecycle: found a base, validate location constraints,
 * enqueue production, advance production ticks, and verify completed units.
 * No browser or rendering required — pure ECS + system logic.
 */

import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TILE_SIZE_M } from "../../board/coords";
import { ROBOT_DEFS } from "../../config/robotDefs";
import { Base, EntityId, Faction, Position, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	baseProductionTick,
	enqueueProduction,
	foundBase,
	getProductionQueue,
	resetBaseIdCounter,
	resetProductionUnitId,
	spawnCompletedProduction,
	validateBaseLocation,
} from "../baseManagement";
import {
	addResource,
	getResources,
	resetResources,
	spendResource,
} from "../resources";

// ─── Cleanup ─────────────────────────────────────────────────────────────────

const entities: Entity[] = [];

import { UnitComponents } from "../../ecs/traits";
import { parseComponents } from "../../ecs/types";

beforeEach(() => {
	resetResources();
	resetProductionUnitId();
});

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

describe("base founding E2E", () => {
	describe("foundBase creates a base entity with correct traits", () => {
		it("has Base trait with name, tileX, tileZ", () => {
			const entity = testFoundBase(5, 10, "player", "Nexus Prime");

			expect(entity.has(Base)).toBe(true);
			const base = entity.get(Base)!;
			expect(base.name).toBe("Nexus Prime");
			expect(base.tileX).toBe(5);
			expect(base.tileZ).toBe(10);
			expect(base.factionId).toBe("player");
		});

		it("has Position derived from tile coordinates", () => {
			const entity = testFoundBase(5, 10, "player", "Nexus Prime");
			const pos = entity.get(Position)!;
			expect(pos.x).toBe(5 * TILE_SIZE_M);
			expect(pos.z).toBe(10 * TILE_SIZE_M);
		});

		it("has Faction and EntityId traits", () => {
			const entity = testFoundBase(5, 10, "player", "Nexus Prime");

			expect(entity.has(Faction)).toBe(true);
			expect(entity.get(Faction)!.value).toBe("player");

			expect(entity.has(EntityId)).toBe(true);
			expect(entity.get(EntityId)!.value).toMatch(/^base_/);
		});

		it("initializes with empty production queue and zero power", () => {
			const entity = testFoundBase(5, 10, "player", "Nexus Prime");
			const base = entity.get(Base)!;
			expect(base.power).toBe(0);
			expect(getProductionQueue(entity)).toEqual([]);
		});
	});

	describe("validateBaseLocation rejects duplicate locations", () => {
		it("rejects a second base at the same tile", () => {
			testFoundBase(0, 0, "player", "First Outpost");

			const error = validateBaseLocation(world, 0, 0, "player");
			expect(error).not.toBeNull();
			expect(error).toContain("Too close to existing base");
		});

		it("rejects a base within MIN_BASE_SPACING (8 tiles)", () => {
			testFoundBase(0, 0, "player", "First Outpost");

			const error = validateBaseLocation(world, 3, 3, "player");
			expect(error).not.toBeNull();
			expect(error).toContain("Too close");
		});

		it("accepts a base beyond MIN_BASE_SPACING", () => {
			testFoundBase(0, 0, "player", "First Outpost");

			const error = validateBaseLocation(world, 20, 0, "player");
			expect(error).toBeNull();
		});
	});

	describe("enqueueProduction adds to queue", () => {
		it("enqueues a maintenance_bot with correct cost", () => {
			const base = testFoundBase(0, 0, "player", "Factory Alpha");
			const cost = { scrapMetal: 10, circuitry: 3 };

			enqueueProduction(base, "maintenance_bot", cost);

			const queue = getProductionQueue(base);
			expect(queue.length).toBe(1);
			expect(queue[0]!.unitType).toBe("maintenance_bot");
			expect(queue[0]!.progress).toBe(0);
			expect(queue[0]!.cost).toEqual(cost);
		});

		it("appends multiple items in order", () => {
			const base = testFoundBase(0, 0, "player", "Factory Alpha");

			enqueueProduction(base, "maintenance_bot", { scrapMetal: 10 });
			enqueueProduction(base, "guard_bot", { scrapMetal: 6, durasteel: 2 });

			const queue = getProductionQueue(base);
			expect(queue.length).toBe(2);
			expect(queue[0]!.unitType).toBe("maintenance_bot");
			expect(queue[1]!.unitType).toBe("guard_bot");
		});
	});

	describe("production queue progresses with ticks", () => {
		it("advances progress each tick", () => {
			const base = testFoundBase(0, 0, "player", "Tick Base");
			enqueueProduction(base, "maintenance_bot", { scrapMetal: 10 });

			// PRODUCTION_RATE = 0.1 per second, so 1 second = 0.1 progress
			baseProductionTick(world, 1.0);

			const queue1 = getProductionQueue(base);
			expect(queue1.length).toBe(1);
			expect(queue1[0]!.progress).toBeCloseTo(0.1);

			// Another 2 seconds = 0.2 more = 0.3 total
			baseProductionTick(world, 2.0);

			const queue2 = getProductionQueue(base);
			expect(queue2.length).toBe(1);
			expect(queue2[0]!.progress).toBeCloseTo(0.3);
		});

		it("only advances the first item in a multi-item queue", () => {
			const base = testFoundBase(0, 0, "player", "Tick Base");
			enqueueProduction(base, "maintenance_bot", { scrapMetal: 10 });
			enqueueProduction(base, "guard_bot", { scrapMetal: 6 });

			baseProductionTick(world, 2.0);

			const queue = getProductionQueue(base);
			expect(queue[0]!.progress).toBeCloseTo(0.2);
			expect(queue[1]!.progress).toBe(0); // untouched
		});
	});

	describe("production completes and spawns unit", () => {
		it("completes when progress reaches 1.0 and returns completed item", () => {
			const base = testFoundBase(0, 0, "player", "Spawn Base");

			// Seed resources to cover the cost (not consumed by baseProductionTick
			// itself, but representing that the player has paid)
			addResource("scrapMetal", 100);
			addResource("circuitry", 50);

			const cost = { scrapMetal: 10, circuitry: 3 };
			enqueueProduction(base, "maintenance_bot", cost);

			// PRODUCTION_RATE = 0.1/sec, need 10 seconds to reach 1.0
			const completed = baseProductionTick(world, 10.0);

			expect(completed.length).toBe(1);
			expect(completed[0]!.item.unitType).toBe("maintenance_bot");
			expect(completed[0]!.item.progress).toBe(1);
			expect(completed[0]!.baseEntityId).toMatch(/^base_/);

			// Queue should be empty after completion
			expect(getProductionQueue(base)).toEqual([]);
		});

		it("spawns a Unit entity near the base from completed production", () => {
			const base = testFoundBase(0, 0, "player", "Spawn Base");

			addResource("scrapMetal", 100);
			addResource("circuitry", 50);

			enqueueProduction(base, "maintenance_bot", {
				scrapMetal: 10,
				circuitry: 3,
			});

			// Run enough ticks to complete
			const completed = baseProductionTick(world, 10.0);
			expect(completed.length).toBe(1);

			// Simulate the caller/higher-level system spawning the unit
			// (baseProductionTick returns completed items; spawning is the
			// caller's responsibility per the module doc)
			const basePos = base.get(Position)!;
			const def =
				ROBOT_DEFS[completed[0]!.item.unitType as keyof typeof ROBOT_DEFS];
			const markStats = def.marks[0].stats;

			const unitEntity = world.spawn(
				EntityId({ value: `unit_prod_0` }),
				Position({ x: basePos.x + 1, y: 0, z: basePos.z + 1 }),
				Faction({ value: "player" }),
				Unit({
					unitType: completed[0]!.item.unitType,
					displayName: def.displayName,
					speed: markStats.speed,
					selected: false,
					mark: 1,
				}),
			);
			entities.push(unitEntity);

			// Verify the spawned unit
			expect(unitEntity.has(Unit)).toBe(true);
			const unit = unitEntity.get(Unit)!;
			expect(unit.unitType).toBe("maintenance_bot");
			expect(unit.displayName).toBe("Maintenance Bot");
			expect(unit.speed).toBe(2.5);
			expect(unit.mark).toBe(1);

			// Verify position is near the base
			const unitPos = unitEntity.get(Position)!;
			const dx = unitPos.x - basePos.x;
			const dz = unitPos.z - basePos.z;
			const dist = Math.sqrt(dx * dx + dz * dz);
			expect(dist).toBeLessThan(5); // within 5 world units of base
		});

		it("deducts resources for production cost", () => {
			const base = testFoundBase(0, 0, "player", "Econ Base");

			addResource("scrapMetal", 20);
			addResource("circuitry", 10);

			const cost = { scrapMetal: 10, circuitry: 3 };

			// Spend resources before enqueuing (as the game would)
			const spentMetal = spendResource("scrapMetal", cost.scrapMetal);
			const spentCircuits = spendResource("circuitry", cost.circuitry);
			expect(spentMetal).toBe(true);
			expect(spentCircuits).toBe(true);

			enqueueProduction(base, "maintenance_bot", cost);

			// Complete production
			baseProductionTick(world, 10.0);

			// Verify remaining resources
			const pool = getResources();
			expect(pool.scrapMetal).toBe(10); // 20 - 10
			expect(pool.circuitry).toBe(7); // 10 - 3
		});

		it("completes multiple queued items sequentially", () => {
			const base = testFoundBase(0, 0, "player", "Multi Base");

			addResource("scrapMetal", 200);
			addResource("circuitry", 100);

			enqueueProduction(base, "maintenance_bot", { scrapMetal: 10 });
			enqueueProduction(base, "guard_bot", { scrapMetal: 6 });

			// Complete first item (10 seconds)
			const batch1 = baseProductionTick(world, 10.0);
			expect(batch1.length).toBe(1);
			expect(batch1[0]!.item.unitType).toBe("maintenance_bot");

			// Queue should now have guard_bot at front with 0 progress
			const queue = getProductionQueue(base);
			expect(queue.length).toBe(1);
			expect(queue[0]!.unitType).toBe("guard_bot");
			expect(queue[0]!.progress).toBe(0);

			// Complete second item (10 more seconds)
			const batch2 = baseProductionTick(world, 10.0);
			expect(batch2.length).toBe(1);
			expect(batch2[0]!.item.unitType).toBe("guard_bot");

			// Queue now empty
			expect(getProductionQueue(base)).toEqual([]);
		});

		it("spawnCompletedProduction creates a Unit entity with full traits", () => {
			const base = testFoundBase(5, 5, "player", "Spawn Test Base");

			addResource("scrapMetal", 100);
			addResource("circuitry", 50);

			enqueueProduction(base, "maintenance_bot", {
				scrapMetal: 5,
				circuitry: 2,
			});

			const completed = baseProductionTick(world, 10.0);
			expect(completed.length).toBe(1);

			// Use the new spawnCompletedProduction function
			spawnCompletedProduction(world, completed);

			// Find the spawned unit
			let spawnedUnit: Entity | null = null;
			for (const entity of world.query(Unit, Faction, EntityId)) {
				const eid = entity.get(EntityId)!.value;
				if (eid.startsWith("prod_")) {
					spawnedUnit = entity;
					break;
				}
			}

			expect(spawnedUnit, "should have spawned a unit").not.toBeNull();

			// Verify unit traits
			const unit = spawnedUnit!.get(Unit)!;
			expect(unit.unitType).toBe("maintenance_bot");
			expect(unit.speed).toBeGreaterThan(0);
			expect(unit.mark).toBe(1);

			// Verify faction is player
			expect(spawnedUnit!.get(Faction)!.value).toBe("player");

			// Verify position is near the base
			const basePos = base.get(Position)!;
			const unitPos = spawnedUnit!.get(Position)!;
			const dist = Math.sqrt(
				(unitPos.x - basePos.x) ** 2 + (unitPos.z - basePos.z) ** 2,
			);
			expect(dist, "spawned unit should be near base").toBeLessThan(5);

			// Verify has full components (camera, arms, legs, power_cell)
			const comps = parseComponents(
				spawnedUnit!.get(UnitComponents)!.componentsJson,
			);
			expect(comps.length).toBe(4);
			expect(comps.every((c) => c.functional)).toBe(true);

			// Cleanup
			spawnedUnit!.destroy();
		});
	});
});
