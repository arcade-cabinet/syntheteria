import { beforeEach, describe, expect, it } from "vitest";
import type { AgentSnapshot } from "../agents/SyntheteriaAgent";
import {
	AIRuntime,
	DEFAULT_PERSONALITY,
	FACTION_PERSONALITY,
	personalityToBias,
} from "../runtime/AIRuntime";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnap(overrides: Partial<AgentSnapshot> = {}): AgentSnapshot {
	return {
		entityId: 1,
		factionId: "reclaimers",
		tileX: 0,
		tileZ: 0,
		hp: 10,
		ap: 2,
		maxAp: 2,
		mp: 3,
		maxMp: 3,
		scanRange: 4,
		attackRange: 1,
		attack: 2,
		defense: 0,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AIRuntime", () => {
	let runtime: AIRuntime;

	beforeEach(() => {
		runtime = new AIRuntime();
	});

	it("creates agent on first call", () => {
		const agent = runtime.getOrCreateAgent(makeSnap());
		expect(agent).toBeDefined();
		expect(agent.entityId).toBe(1);
		expect(agent.factionId).toBe("reclaimers");
		expect(runtime.size).toBe(1);
	});

	it("returns same agent for same entityId", () => {
		const a1 = runtime.getOrCreateAgent(makeSnap({ entityId: 10 }));
		const a2 = runtime.getOrCreateAgent(makeSnap({ entityId: 10 }));
		expect(a1).toBe(a2);
		expect(runtime.size).toBe(1);
	});

	it("creates separate agents for different entities", () => {
		runtime.getOrCreateAgent(makeSnap({ entityId: 1 }));
		runtime.getOrCreateAgent(
			makeSnap({ entityId: 2, factionId: "iron_creed" }),
		);
		expect(runtime.size).toBe(2);
	});

	it("syncs snapshot data on each call", () => {
		const agent = runtime.getOrCreateAgent(makeSnap({ tileX: 0, tileZ: 0 }));
		expect(agent.tileX).toBe(0);

		runtime.getOrCreateAgent(makeSnap({ tileX: 5, tileZ: 3 }));
		expect(agent.tileX).toBe(5);
		expect(agent.tileZ).toBe(3);
	});

	it("prunes agents for dead entities", () => {
		runtime.getOrCreateAgent(makeSnap({ entityId: 1 }));
		runtime.getOrCreateAgent(
			makeSnap({ entityId: 2, factionId: "iron_creed" }),
		);
		expect(runtime.size).toBe(2);

		runtime.pruneStaleAgents(new Set([1])); // Entity 2 is dead
		expect(runtime.size).toBe(1);
	});

	it("clear removes all agents", () => {
		runtime.getOrCreateAgent(makeSnap({ entityId: 1 }));
		runtime.getOrCreateAgent(
			makeSnap({ entityId: 2, factionId: "iron_creed" }),
		);
		runtime.clear();
		expect(runtime.size).toBe(0);
	});

	it("agents have 9 evaluators", () => {
		const agent = runtime.getOrCreateAgent(makeSnap());
		// Brain should have all 9 evaluators: Attack, Chase, Harvest, Expand, Build, Scout, FloorMine, Evade, Idle
		expect(agent.brain.evaluators.length).toBe(9);
	});

	it("unknown faction gets default personality", () => {
		const agent = runtime.getOrCreateAgent(
			makeSnap({ factionId: "static_remnants" }),
		);
		// Should not throw, uses DEFAULT_PERSONALITY
		expect(agent.brain.evaluators.length).toBe(9);
	});
});

describe("personalityToBias", () => {
	it("maps aggression 1 to low attack bias", () => {
		const bias = personalityToBias({ ...DEFAULT_PERSONALITY, aggression: 1 });
		expect(bias.attack).toBeCloseTo(0.467, 1);
	});

	it("maps aggression 3 to high attack bias", () => {
		const bias = personalityToBias({ ...DEFAULT_PERSONALITY, aggression: 3 });
		expect(bias.attack).toBeCloseTo(1.0, 1);
	});

	it("maps harvestPriority 3 to high harvest bias", () => {
		const bias = personalityToBias({
			...DEFAULT_PERSONALITY,
			harvestPriority: 3,
		});
		expect(bias.harvest).toBeCloseTo(1.0, 1);
	});

	it("reactiveOnly is preserved", () => {
		const biasReactive = personalityToBias({
			...DEFAULT_PERSONALITY,
			reactiveOnly: true,
		});
		expect(biasReactive.reactiveOnly).toBe(true);

		const biasNot = personalityToBias({
			...DEFAULT_PERSONALITY,
			reactiveOnly: false,
		});
		expect(biasNot.reactiveOnly).toBe(false);
	});
});

describe("FACTION_PERSONALITY", () => {
	it("has entries for all four factions", () => {
		expect(FACTION_PERSONALITY.reclaimers).toBeDefined();
		expect(FACTION_PERSONALITY.volt_collective).toBeDefined();
		expect(FACTION_PERSONALITY.signal_choir).toBeDefined();
		expect(FACTION_PERSONALITY.iron_creed).toBeDefined();
	});

	it("volt_collective is reactiveOnly", () => {
		expect(FACTION_PERSONALITY.volt_collective.reactiveOnly).toBe(true);
	});

	it("signal_choir has highest aggression", () => {
		expect(FACTION_PERSONALITY.signal_choir.aggression).toBe(3);
	});

	it("reclaimers have highest harvestPriority", () => {
		expect(FACTION_PERSONALITY.reclaimers.harvestPriority).toBe(3);
	});
});
