/**
 * Tests for story trigger system (US-5.1).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { EntityId, Faction, Position, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	hasPendingStoryTrigger,
	popStoryTrigger,
	registerStoryTrigger,
	resetStoryTriggers,
	storyTriggerSystem,
} from "../storyTriggers";

describe("storyTriggerSystem (US-5.1)", () => {
	beforeEach(() => {
		resetStoryTriggers();
		// Clean up ECS entities
		for (const entity of world.query(Position, Unit)) {
			entity.destroy();
		}
	});

	it("no pending trigger initially", () => {
		expect(hasPendingStoryTrigger()).toBe(false);
		expect(popStoryTrigger()).toBeNull();
	});

	it("registers a trigger zone", () => {
		registerStoryTrigger(100, 200, "shrine", 4);
		// No error thrown = success
		expect(hasPendingStoryTrigger()).toBe(false);
	});

	it("ignores non-story room tags", () => {
		registerStoryTrigger(100, 200, "scatter", 4);
		expect(hasPendingStoryTrigger()).toBe(false);
	});

	it("fires when player unit enters trigger zone", () => {
		// Register a shrine trigger at (10, 10)
		registerStoryTrigger(10, 10, "shrine", 4);

		// Spawn a player unit AT the trigger location
		world.spawn(
			EntityId({ value: "test_unit" }),
			Position({ x: 10, y: 0, z: 10 }),
			Faction({ value: "player" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Test Bot",
				speed: 3,
				selected: false,
			}),
		);

		storyTriggerSystem();

		expect(hasPendingStoryTrigger()).toBe(true);
		const seq = popStoryTrigger();
		expect(seq).not.toBeNull();
		expect(seq!.id).toBe("cult_shrine");
	});

	it("does not fire the same trigger twice", () => {
		registerStoryTrigger(10, 10, "shrine", 4);

		world.spawn(
			EntityId({ value: "test_unit_2" }),
			Position({ x: 10, y: 0, z: 10 }),
			Faction({ value: "player" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Test Bot",
				speed: 3,
				selected: false,
			}),
		);

		storyTriggerSystem();
		popStoryTrigger(); // consume

		// Run again
		storyTriggerSystem();
		expect(hasPendingStoryTrigger()).toBe(false);
	});

	it("does not fire for enemy units", () => {
		registerStoryTrigger(10, 10, "shrine", 4);

		world.spawn(
			EntityId({ value: "enemy_unit" }),
			Position({ x: 10, y: 0, z: 10 }),
			Faction({ value: "cultist" }),
			Unit({
				unitType: "wanderer",
				displayName: "Cult Unit",
				speed: 2,
				selected: false,
			}),
		);

		storyTriggerSystem();
		expect(hasPendingStoryTrigger()).toBe(false);
	});

	it("does not fire when player unit is out of range", () => {
		registerStoryTrigger(100, 100, "shrine", 4);

		world.spawn(
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

		storyTriggerSystem();
		expect(hasPendingStoryTrigger()).toBe(false);
	});
});
