/**
 * Tests for BasePanel component logic.
 *
 * Tests base data extraction and display logic by querying
 * the ECS directly — same logic BasePanel uses internally.
 */

import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import { Base, EntityId, Faction, Position, Unit } from "../../../ecs/traits";
import { world } from "../../../ecs/world";
import {
	addToBaseStorage,
	enqueueProduction,
	foundBase,
	getBaseStorage,
	getInfrastructure,
	getProductionQueue,
	resetBaseIdCounter,
	serializeInfrastructure,
} from "../../../systems/baseManagement";
import { getSelectedBaseId, selectBase } from "../BasePanel";

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
	selectBase(null);
	resetBaseIdCounter();
});

/** Found a base and track for cleanup. */
function testFoundBase(
	tileX: number,
	tileZ: number,
	faction: string,
	name: string,
): Entity {
	const entity = foundBase(world, tileX, tileZ, faction, name);
	entities.push(entity);
	return entity;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("base selection state", () => {
	it("starts with no base selected", () => {
		expect(getSelectedBaseId()).toBeNull();
	});

	it("selectBase sets the selected base ID", () => {
		selectBase("base_0");
		expect(getSelectedBaseId()).toBe("base_0");
	});

	it("selectBase(null) clears selection", () => {
		selectBase("base_0");
		selectBase(null);
		expect(getSelectedBaseId()).toBeNull();
	});
});

describe("base data display", () => {
	it("shows base name and faction", () => {
		const entity = testFoundBase(128, 128, "player", "Alpha Base");

		const base = entity.get(Base)!;
		const faction = entity.get(Faction)!.value;

		expect(base.name).toBe("Alpha Base");
		expect(faction).toBe("player");
	});

	it("shows cult faction for cult bases", () => {
		const entity = testFoundBase(100, 10, "cultist", "Cult Stronghold");

		const faction = entity.get(Faction)!.value;
		expect(faction).toBe("cultist");
	});

	it("shows production queue", () => {
		const entity = testFoundBase(128, 128, "player", "Prod Base");
		enqueueProduction(entity, "maintenance_bot", { scrapMetal: 10 });
		enqueueProduction(entity, "utility_drone", { circuitry: 5 });

		const queue = getProductionQueue(entity);
		expect(queue).toHaveLength(2);
		expect(queue[0]!.unitType).toBe("maintenance_bot");
		expect(queue[1]!.unitType).toBe("utility_drone");
	});

	it("shows empty production queue message", () => {
		const entity = testFoundBase(128, 128, "player", "Empty Base");

		const queue = getProductionQueue(entity);
		expect(queue).toHaveLength(0);
	});

	it("shows infrastructure list", () => {
		const entity = testFoundBase(128, 128, "player", "Infra Base");
		const infra = [
			{ type: "lightning_rod", count: 2 },
			{ type: "solar_panel", count: 1 },
		];
		entity.set(Base, {
			infrastructureJson: serializeInfrastructure(infra),
		});

		const items = getInfrastructure(entity);
		expect(items).toHaveLength(2);
		expect(items[0]!.type).toBe("lightning_rod");
		expect(items[0]!.count).toBe(2);
	});

	it("shows power gauge", () => {
		const entity = testFoundBase(128, 128, "player", "Power Base");

		const base = entity.get(Base)!;
		expect(base.power).toBe(0); // No infrastructure yet
	});

	it("shows storage grid", () => {
		const entity = testFoundBase(128, 128, "player", "Store Base");
		addToBaseStorage(entity, "scrapMetal", 15);
		addToBaseStorage(entity, "circuitry", 8);

		const storage = getBaseStorage(entity);
		expect(storage.scrapMetal).toBe(15);
		expect(storage.circuitry).toBe(8);
	});

	it("shows empty storage message", () => {
		const entity = testFoundBase(128, 128, "player", "Empty Store");

		const storage = getBaseStorage(entity);
		expect(Object.keys(storage)).toHaveLength(0);
	});
});

describe("garrison detection", () => {
	it("finds player units near base", () => {
		testFoundBase(128, 128, "player", "Garrison Base");
		const baseTileX = 128;
		const baseTileZ = 128;
		const baseWorldX = baseTileX * 2; // TILE_SIZE_M = 2
		const baseWorldZ = baseTileZ * 2;

		// Spawn a player unit near the base
		const unit = world.spawn(
			EntityId({ value: "garrison_unit" }),
			Position({ x: baseWorldX + 2, y: 0, z: baseWorldZ + 2 }),
			Faction({ value: "player" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Near Bot",
				speed: 3,
				selected: false,
			}),
		);
		entities.push(unit);

		// Simulate GarrisonSection logic: find player units within GARRISON_RANGE=10
		const GARRISON_RANGE = 10;
		const units: string[] = [];
		for (const entity of world.query(Unit, Position, EntityId, Faction)) {
			if (entity.get(Faction)!.value !== "player") continue;
			const pos = entity.get(Position)!;
			const dx = pos.x - baseWorldX;
			const dz = pos.z - baseWorldZ;
			if (Math.sqrt(dx * dx + dz * dz) <= GARRISON_RANGE) {
				units.push(entity.get(EntityId)!.value);
			}
		}

		expect(units).toContain("garrison_unit");
	});

	it("does not count distant units as garrisoned", () => {
		testFoundBase(128, 128, "player", "Garrison Base");
		const baseWorldX = 128 * 2;
		const baseWorldZ = 128 * 2;

		// Spawn a unit far from the base
		const farUnit = world.spawn(
			EntityId({ value: "far_unit" }),
			Position({ x: 0, y: 0, z: 0 }),
			Faction({ value: "player" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Far Bot",
				speed: 3,
				selected: false,
			}),
		);
		entities.push(farUnit);

		const GARRISON_RANGE = 10;
		const units: string[] = [];
		for (const entity of world.query(Unit, Position, EntityId, Faction)) {
			if (entity.get(Faction)!.value !== "player") continue;
			const pos = entity.get(Position)!;
			const dx = pos.x - baseWorldX;
			const dz = pos.z - baseWorldZ;
			if (Math.sqrt(dx * dx + dz * dz) <= GARRISON_RANGE) {
				units.push(entity.get(EntityId)!.value);
			}
		}

		expect(units).not.toContain("far_unit");
	});
});
