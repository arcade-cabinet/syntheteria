import {
	clearEntityAnimationStates,
	deriveAnimationState,
	getEntityAnimationState,
	setEntityAnimationState,
} from "./AnimationState";

describe("AnimationState", () => {
	afterEach(() => {
		clearEntityAnimationStates();
	});

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

	describe("entity animation state store", () => {
		it("returns idle for unknown entities", () => {
			expect(getEntityAnimationState("unknown-entity")).toBe("idle");
		});

		it("stores and retrieves animation state", () => {
			setEntityAnimationState("bot-1", "walking");
			expect(getEntityAnimationState("bot-1")).toBe("walking");
		});

		it("overwrites previous state", () => {
			setEntityAnimationState("bot-1", "walking");
			setEntityAnimationState("bot-1", "harvesting");
			expect(getEntityAnimationState("bot-1")).toBe("harvesting");
		});

		it("clears all states", () => {
			setEntityAnimationState("bot-1", "walking");
			setEntityAnimationState("bot-2", "attacking");
			clearEntityAnimationStates();
			expect(getEntityAnimationState("bot-1")).toBe("idle");
			expect(getEntityAnimationState("bot-2")).toBe("idle");
		});

		it("tracks multiple entities independently", () => {
			setEntityAnimationState("bot-1", "walking");
			setEntityAnimationState("bot-2", "harvesting");
			setEntityAnimationState("bot-3", "building");
			expect(getEntityAnimationState("bot-1")).toBe("walking");
			expect(getEntityAnimationState("bot-2")).toBe("harvesting");
			expect(getEntityAnimationState("bot-3")).toBe("building");
		});
	});
});
