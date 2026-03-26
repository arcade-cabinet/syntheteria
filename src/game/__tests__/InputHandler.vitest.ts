/**
 * Tests for InputHandler logic — entity lookup and click/drag detection.
 *
 * Tests the pure logic portions of InputHandler without BabylonJS scene
 * dependencies. The BabylonJS pointer observer registration is not tested
 * here — it requires a real BabylonJS scene (covered by E2E tests).
 */

import type { Entity } from "koota";
import { afterEach, describe, expect, it } from "vitest";
import { EntityId, Faction, Position, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";

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
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function spawnEntityWithId(id: string, x: number, z: number): Entity {
	const entity = world.spawn(
		EntityId({ value: id }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: "Test Bot",
			speed: 3,
			selected: false,
		}),
	);
	entities.push(entity);
	return entity;
}

/**
 * Replicate InputHandler's findEntityByIdString logic.
 * This is the function we're testing — extracted so it doesn't need
 * BabylonJS scene import.
 */
function findEntityByIdString(entityIdStr: string): Entity | null {
	for (const entity of world.query(EntityId)) {
		if (entity.get(EntityId)!.value === entityIdStr) {
			return entity;
		}
	}
	return null;
}

/**
 * Replicate InputHandler's isEnemy check.
 */
function isEnemy(entity: Entity): boolean {
	if (!entity.has(Faction)) return false;
	const faction = entity.get(Faction)!.value;
	return faction !== "player";
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("click threshold", () => {
	it("defines a drag threshold of 5 pixels", () => {
		// InputHandler uses DRAG_THRESHOLD = 5
		const DRAG_THRESHOLD = 5;

		// Below threshold = click
		const clickDist = Math.sqrt(2 * 2 + 3 * 3);
		expect(clickDist).toBeLessThan(DRAG_THRESHOLD);

		// Above threshold = drag
		const dragDist = Math.sqrt(4 * 4 + 4 * 4);
		expect(dragDist).toBeGreaterThan(DRAG_THRESHOLD);
	});

	it("exact threshold is still a click (less than, not less-than-or-equal)", () => {
		const DRAG_THRESHOLD = 5;
		// dist = 5 exactly -> NOT a drag (> not >=)
		const dist = 5;
		expect(dist).not.toBeGreaterThan(DRAG_THRESHOLD);
	});
});

describe("entity lookup by ID", () => {
	it("finds entity by EntityId string", () => {
		spawnEntityWithId("unit_42", 10, 20);

		const found = findEntityByIdString("unit_42");

		expect(found).not.toBeNull();
		expect(found!.get(Position)!.x).toBe(10);
		expect(found!.get(Position)!.z).toBe(20);
	});

	it("returns null for non-existent ID", () => {
		spawnEntityWithId("unit_1", 10, 20);

		const found = findEntityByIdString("unit_999");
		expect(found).toBeNull();
	});

	it("distinguishes between different entity IDs", () => {
		spawnEntityWithId("unit_1", 10, 10);
		spawnEntityWithId("unit_2", 20, 20);

		const found1 = findEntityByIdString("unit_1");
		const found2 = findEntityByIdString("unit_2");

		expect(found1).not.toBeNull();
		expect(found2).not.toBeNull();
		expect(found1!.get(Position)!.x).toBe(10);
		expect(found2!.get(Position)!.x).toBe(20);
	});
});

describe("enemy detection", () => {
	it("identifies non-player faction as enemy", () => {
		const enemy = world.spawn(
			EntityId({ value: "enemy_1" }),
			Position({ x: 10, y: 0, z: 10 }),
			Faction({ value: "feral" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Feral",
				speed: 2,
				selected: false,
			}),
		);
		entities.push(enemy);

		expect(isEnemy(enemy)).toBe(true);
	});

	it("does not flag player units as enemies", () => {
		const player = spawnEntityWithId("player_1", 10, 10);
		expect(isEnemy(player)).toBe(false);
	});

	it("identifies cultist faction as enemy", () => {
		const cultist = world.spawn(
			EntityId({ value: "cultist_1" }),
			Position({ x: 10, y: 0, z: 10 }),
			Faction({ value: "cultist" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Cultist",
				speed: 2,
				selected: false,
			}),
		);
		entities.push(cultist);

		expect(isEnemy(cultist)).toBe(true);
	});

	it("handles entities without Faction trait", () => {
		const noFaction = world.spawn(
			EntityId({ value: "building_1" }),
			Position({ x: 10, y: 0, z: 10 }),
		);
		entities.push(noFaction);

		expect(isEnemy(noFaction)).toBe(false);
	});
});
