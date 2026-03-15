import {
	AnimationState as AnimationStateTrait,
	Identity,
	MapFragment,
	Unit,
	WorldPosition,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	clearEntityAnimationStates,
	deriveAnimationState,
	getEntityAnimationState,
	setEntityAnimationState,
} from "./AnimationState";

// Helper: spawn a minimal unit entity with AnimationState trait for tests
function spawnTestUnit(id: string) {
	const entity = world.spawn(
		Identity,
		Unit,
		WorldPosition,
		MapFragment,
		AnimationStateTrait,
	);
	entity.set(Identity, { id, faction: "player" });
	entity.set(WorldPosition, { x: 0, y: 0, z: 0 });
	entity.set(MapFragment, { fragmentId: "test" });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "mentor",
		displayName: "Test Bot",
		speed: 1,
		selected: false,
		components: [],
	});
	entity.set(AnimationStateTrait, {
		clipName: "",
		playhead: 0,
		blendWeight: 1,
	});
	return entity;
}

afterEach(() => {
	for (const e of world.query(AnimationStateTrait)) e.destroy();
});

describe("AnimationState", () => {
	describe("deriveAnimationState", () => {
		it("returns walking when navigating", () => {
			expect(deriveAnimationState("navigating", null, 0)).toBe("walking");
		});

		it("returns walking when velocity is above threshold", () => {
			expect(deriveAnimationState("idle", null, 0.5)).toBe("walking");
		});

		it("returns idle when idle with no velocity", () => {
			expect(deriveAnimationState("idle", null, 0)).toBe("idle");
		});

		it("returns idle when velocity is below threshold", () => {
			expect(deriveAnimationState("idle", null, 0.05)).toBe("idle");
		});

		it("returns harvesting when executing harvest task", () => {
			expect(deriveAnimationState("executing_task", "harvest", 0)).toBe(
				"harvesting",
			);
		});

		it("returns harvesting for harvest_structure task", () => {
			expect(
				deriveAnimationState("executing_task", "harvest_structure", 0),
			).toBe("harvesting");
		});

		it("returns attacking for attack_target task", () => {
			expect(deriveAnimationState("executing_task", "attack_target", 0)).toBe(
				"attacking",
			);
		});

		it("returns attacking for hack_target task", () => {
			expect(deriveAnimationState("executing_task", "hack_target", 0)).toBe(
				"attacking",
			);
		});

		it("returns building for build_structure task", () => {
			expect(deriveAnimationState("executing_task", "build_structure", 0)).toBe(
				"building",
			);
		});

		it("returns building for repair_structure task", () => {
			expect(
				deriveAnimationState("executing_task", "repair_structure", 0),
			).toBe("building");
		});

		it("returns idle for unknown task kinds", () => {
			expect(deriveAnimationState("executing_task", "unknown_task", 0)).toBe(
				"idle",
			);
		});

		it("prioritizes walking when navigating even with a task", () => {
			expect(deriveAnimationState("navigating", "harvest", 2.0)).toBe(
				"walking",
			);
		});
	});

	describe("entity animation state store (Koota trait-backed)", () => {
		it("returns idle for unknown entities (not in world)", () => {
			expect(getEntityAnimationState("unknown-entity")).toBe("idle");
		});

		it("stores and retrieves animation state via entity trait", () => {
			spawnTestUnit("bot-1");
			setEntityAnimationState("bot-1", "walking");
			expect(getEntityAnimationState("bot-1")).toBe("walking");
		});

		it("overwrites previous state", () => {
			spawnTestUnit("bot-1");
			setEntityAnimationState("bot-1", "walking");
			setEntityAnimationState("bot-1", "harvesting");
			expect(getEntityAnimationState("bot-1")).toBe("harvesting");
		});

		it("clears all states", () => {
			spawnTestUnit("bot-1");
			spawnTestUnit("bot-2");
			setEntityAnimationState("bot-1", "walking");
			setEntityAnimationState("bot-2", "attacking");
			clearEntityAnimationStates();
			expect(getEntityAnimationState("bot-1")).toBe("idle");
			expect(getEntityAnimationState("bot-2")).toBe("idle");
		});

		it("tracks multiple entities independently", () => {
			spawnTestUnit("bot-1");
			spawnTestUnit("bot-2");
			spawnTestUnit("bot-3");
			setEntityAnimationState("bot-1", "walking");
			setEntityAnimationState("bot-2", "harvesting");
			setEntityAnimationState("bot-3", "building");
			expect(getEntityAnimationState("bot-1")).toBe("walking");
			expect(getEntityAnimationState("bot-2")).toBe("harvesting");
			expect(getEntityAnimationState("bot-3")).toBe("building");
		});
	});
});
