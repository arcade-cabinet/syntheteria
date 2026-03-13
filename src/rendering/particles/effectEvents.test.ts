import {
	pushEffect,
	drainEffects,
	getEffectQueueLength,
	clearEffects,
	type EffectEvent,
} from "./effectEvents";

describe("effectEvents", () => {
	beforeEach(() => {
		clearEffects();
	});

	it("starts with an empty queue", () => {
		expect(getEffectQueueLength()).toBe(0);
	});

	it("pushes an effect event", () => {
		pushEffect({
			type: "combat_hit",
			x: 1,
			y: 2,
			z: 3,
			color: 0xff0000,
		});
		expect(getEffectQueueLength()).toBe(1);
	});

	it("drains all queued events and empties the queue", () => {
		pushEffect({ type: "sparks", x: 0, y: 0, z: 0 });
		pushEffect({ type: "smoke", x: 1, y: 0, z: 1 });
		pushEffect({ type: "dust", x: 2, y: 0, z: 2 });

		const events = drainEffects();
		expect(events).toHaveLength(3);
		expect(events[0].type).toBe("sparks");
		expect(events[1].type).toBe("smoke");
		expect(events[2].type).toBe("dust");

		// Queue should be empty after drain
		expect(getEffectQueueLength()).toBe(0);
	});

	it("returns empty array when draining empty queue", () => {
		const events = drainEffects();
		expect(events).toHaveLength(0);
	});

	it("preserves optional fields", () => {
		pushEffect({
			type: "hack_progress",
			x: 5,
			y: 1,
			z: 5,
			targetX: 10,
			targetY: 1,
			targetZ: 10,
			progress: 0.5,
			entityId: "hacker-1",
		});

		const events = drainEffects();
		expect(events[0].targetX).toBe(10);
		expect(events[0].targetY).toBe(1);
		expect(events[0].targetZ).toBe(10);
		expect(events[0].progress).toBe(0.5);
		expect(events[0].entityId).toBe("hacker-1");
	});

	it("clearEffects removes all pending events", () => {
		pushEffect({ type: "combat_hit", x: 0, y: 0, z: 0 });
		pushEffect({ type: "combat_destroy", x: 0, y: 0, z: 0 });
		expect(getEffectQueueLength()).toBe(2);

		clearEffects();
		expect(getEffectQueueLength()).toBe(0);
	});

	it("supports all effect types", () => {
		const types: EffectEvent["type"][] = [
			"combat_hit",
			"combat_destroy",
			"harvest_tick",
			"harvest_complete",
			"hack_beam",
			"hack_progress",
			"hack_complete",
			"construction_stage",
			"sparks",
			"smoke",
			"dust",
		];

		for (const type of types) {
			pushEffect({ type, x: 0, y: 0, z: 0 });
		}

		const events = drainEffects();
		expect(events).toHaveLength(types.length);
		for (let i = 0; i < types.length; i++) {
			expect(events[i].type).toBe(types[i]);
		}
	});

	it("preserves event order (FIFO)", () => {
		pushEffect({ type: "combat_hit", x: 1, y: 0, z: 0 });
		pushEffect({ type: "smoke", x: 2, y: 0, z: 0 });
		pushEffect({ type: "sparks", x: 3, y: 0, z: 0 });

		const events = drainEffects();
		expect(events[0].x).toBe(1);
		expect(events[1].x).toBe(2);
		expect(events[2].x).toBe(3);
	});

	it("handles text and intensity fields", () => {
		pushEffect({
			type: "combat_hit",
			x: 0,
			y: 0,
			z: 0,
			text: "LEFT ARM",
			intensity: 0.8,
		});

		const events = drainEffects();
		expect(events[0].text).toBe("LEFT ARM");
		expect(events[0].intensity).toBe(0.8);
	});
});
