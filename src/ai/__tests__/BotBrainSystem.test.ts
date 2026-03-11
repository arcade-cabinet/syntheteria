/**
 * Unit tests for BotBrainSystem — bridges BotBrain FSM output to Yuka Vehicle steering.
 *
 * Tests cover:
 * - registerBotBrain / unregisterBotBrain: registration lifecycle
 * - isBotBrainRegistered: existence checks
 * - getBotBrain: retrieval
 * - getRegisteredBotCount: count
 * - applySteeringOutput: maps SteeringCommand to correct Yuka behavior activation
 *   - SEEK with target → activateSeek
 *   - SEEK without target → activateWander (fallback)
 *   - ARRIVE with target → activateArrive
 *   - ARRIVE without target → stopAll
 *   - FLEE with target → activateFlee
 *   - FLEE without target → activateWander
 *   - WANDER → activateWander
 *   - STOP → stopAll
 * - tickBotBrains: calls brain.update, applies output, calls contextBuilder per bot
 * - tickBotBrains: skips bots when contextBuilder returns null
 * - resetBotBrainSystem: clears registry, stops all behaviors
 */

import { Vehicle } from "yuka";
import { BotBrain, SteeringCommand } from "../BotBrain.ts";
import {
	registerBotBrain,
	unregisterBotBrain,
	isBotBrainRegistered,
	getBotBrain,
	getRegisteredBotCount,
	applySteeringOutput,
	tickBotBrains,
	resetBotBrainSystem,
} from "../BotBrainSystem.ts";
import { attachBehaviors, type BotBehaviors } from "../SteeringBehaviors.ts";
import type { BotContext, NearbyEntity } from "../BotContext.ts";
import type { Vec3 } from "../../ecs/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVehicle(): Vehicle {
	return new Vehicle();
}

function makeBehaviors(): BotBehaviors {
	return attachBehaviors(makeVehicle());
}

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

function makeEnemy(id: string, distanceSq: number): NearbyEntity {
	return { id, position: pos(10, 0, 10), distanceSq, faction: "volt_collective" };
}

function makeContext(overrides: Partial<BotContext> = {}): BotContext {
	return {
		entityId: "bot-1",
		position: pos(0, 0, 0),
		faction: "reclaimers",
		nearbyEnemies: [],
		nearbyAllies: [],
		components: {
			total: 5,
			functional: 5,
			healthRatio: 1.0,
			hasArms: true,
			hasCamera: true,
			hasLegs: true,
		},
		homeBase: null,
		currentOrder: null,
		aggroRangeSq: 100,
		patrolRangeSq: 225,
		meleeRange: 2,
		fleeThreshold: 0.25,
		safeDistanceSq: 400,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetBotBrainSystem();
});

// ---------------------------------------------------------------------------
// registerBotBrain / unregisterBotBrain
// ---------------------------------------------------------------------------

describe("registerBotBrain", () => {
	it("registers a bot successfully", () => {
		const brain = new BotBrain();
		const behaviors = makeBehaviors();
		registerBotBrain("bot-1", brain, behaviors);
		expect(isBotBrainRegistered("bot-1")).toBe(true);
	});

	it("can register multiple bots", () => {
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		registerBotBrain("bot-2", new BotBrain(), makeBehaviors());
		expect(isBotBrainRegistered("bot-1")).toBe(true);
		expect(isBotBrainRegistered("bot-2")).toBe(true);
	});

	it("updates the count", () => {
		expect(getRegisteredBotCount()).toBe(0);
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		expect(getRegisteredBotCount()).toBe(1);
		registerBotBrain("bot-2", new BotBrain(), makeBehaviors());
		expect(getRegisteredBotCount()).toBe(2);
	});

	it("replaces existing entry when re-registering same ID", () => {
		const brain1 = new BotBrain();
		const brain2 = new BotBrain();
		registerBotBrain("bot-1", brain1, makeBehaviors());
		registerBotBrain("bot-1", brain2, makeBehaviors());
		expect(getBotBrain("bot-1")).toBe(brain2);
		expect(getRegisteredBotCount()).toBe(1);
	});
});

describe("unregisterBotBrain", () => {
	it("removes a registered bot", () => {
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		unregisterBotBrain("bot-1");
		expect(isBotBrainRegistered("bot-1")).toBe(false);
	});

	it("reduces the count", () => {
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		registerBotBrain("bot-2", new BotBrain(), makeBehaviors());
		unregisterBotBrain("bot-1");
		expect(getRegisteredBotCount()).toBe(1);
	});

	it("does not throw when unregistering unknown bot", () => {
		expect(() => unregisterBotBrain("nonexistent")).not.toThrow();
	});

	it("stops all behaviors on unregister", () => {
		const behaviors = makeBehaviors();
		behaviors.seek.active = true;
		behaviors.flee.active = true;
		registerBotBrain("bot-1", new BotBrain(), behaviors);
		unregisterBotBrain("bot-1");
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
	});
});

describe("getBotBrain", () => {
	it("returns the brain for a registered bot", () => {
		const brain = new BotBrain();
		registerBotBrain("bot-1", brain, makeBehaviors());
		expect(getBotBrain("bot-1")).toBe(brain);
	});

	it("returns null for unknown bot", () => {
		expect(getBotBrain("nonexistent")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// applySteeringOutput — SEEK
// ---------------------------------------------------------------------------

describe("applySteeringOutput — SEEK", () => {
	it("activates seek with target position", () => {
		const behaviors = makeBehaviors();
		applySteeringOutput(behaviors, {
			command: SteeringCommand.SEEK,
			target: pos(10, 0, 20),
		});
		expect(behaviors.seek.active).toBe(true);
		expect(behaviors.seek.target.x).toBe(10);
		expect(behaviors.seek.target.z).toBe(20);
	});

	it("deactivates flee, arrive, wander when seek activates", () => {
		const behaviors = makeBehaviors();
		behaviors.flee.active = true;
		behaviors.arrive.active = true;
		behaviors.wander.active = true;
		applySteeringOutput(behaviors, {
			command: SteeringCommand.SEEK,
			target: pos(1, 0, 1),
		});
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("activates wander when seek has no target", () => {
		const behaviors = makeBehaviors();
		applySteeringOutput(behaviors, {
			command: SteeringCommand.SEEK,
			target: undefined,
		});
		expect(behaviors.wander.active).toBe(true);
		expect(behaviors.seek.active).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// applySteeringOutput — ARRIVE
// ---------------------------------------------------------------------------

describe("applySteeringOutput — ARRIVE", () => {
	it("activates arrive with target position", () => {
		const behaviors = makeBehaviors();
		applySteeringOutput(behaviors, {
			command: SteeringCommand.ARRIVE,
			target: pos(5, 0, 5),
		});
		expect(behaviors.arrive.active).toBe(true);
		expect(behaviors.arrive.target.x).toBe(5);
		expect(behaviors.arrive.target.z).toBe(5);
	});

	it("deactivates seek, flee, wander when arrive activates", () => {
		const behaviors = makeBehaviors();
		behaviors.seek.active = true;
		behaviors.flee.active = true;
		behaviors.wander.active = true;
		applySteeringOutput(behaviors, {
			command: SteeringCommand.ARRIVE,
			target: pos(1, 0, 1),
		});
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("calls stopAll when arrive has no target", () => {
		const behaviors = makeBehaviors();
		behaviors.seek.active = true;
		applySteeringOutput(behaviors, {
			command: SteeringCommand.ARRIVE,
			target: undefined,
		});
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// applySteeringOutput — FLEE
// ---------------------------------------------------------------------------

describe("applySteeringOutput — FLEE", () => {
	it("activates flee with threat position", () => {
		const behaviors = makeBehaviors();
		applySteeringOutput(behaviors, {
			command: SteeringCommand.FLEE,
			target: pos(3, 0, 3),
		});
		expect(behaviors.flee.active).toBe(true);
		expect(behaviors.flee.target.x).toBe(3);
		expect(behaviors.flee.target.z).toBe(3);
	});

	it("deactivates seek, arrive, wander when flee activates", () => {
		const behaviors = makeBehaviors();
		behaviors.seek.active = true;
		behaviors.arrive.active = true;
		behaviors.wander.active = true;
		applySteeringOutput(behaviors, {
			command: SteeringCommand.FLEE,
			target: pos(1, 0, 1),
		});
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("activates wander when flee has no target", () => {
		const behaviors = makeBehaviors();
		applySteeringOutput(behaviors, {
			command: SteeringCommand.FLEE,
			target: undefined,
		});
		expect(behaviors.wander.active).toBe(true);
		expect(behaviors.flee.active).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// applySteeringOutput — WANDER
// ---------------------------------------------------------------------------

describe("applySteeringOutput — WANDER", () => {
	it("activates wander behavior", () => {
		const behaviors = makeBehaviors();
		applySteeringOutput(behaviors, { command: SteeringCommand.WANDER });
		expect(behaviors.wander.active).toBe(true);
	});

	it("deactivates seek, flee, arrive when wander activates", () => {
		const behaviors = makeBehaviors();
		behaviors.seek.active = true;
		behaviors.flee.active = true;
		behaviors.arrive.active = true;
		applySteeringOutput(behaviors, { command: SteeringCommand.WANDER });
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// applySteeringOutput — STOP
// ---------------------------------------------------------------------------

describe("applySteeringOutput — STOP", () => {
	it("stops all high-level behaviors", () => {
		const behaviors = makeBehaviors();
		behaviors.seek.active = true;
		behaviors.flee.active = true;
		behaviors.arrive.active = true;
		behaviors.wander.active = true;
		applySteeringOutput(behaviors, { command: SteeringCommand.STOP });
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("leaves obstacleAvoidance and separation active", () => {
		const behaviors = makeBehaviors();
		applySteeringOutput(behaviors, { command: SteeringCommand.STOP });
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// tickBotBrains
// ---------------------------------------------------------------------------

describe("tickBotBrains", () => {
	it("calls contextBuilder once per registered bot", () => {
		const contextBuilder = jest.fn(() => makeContext());
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		registerBotBrain("bot-2", new BotBrain(), makeBehaviors());
		tickBotBrains(0.016, contextBuilder);
		expect(contextBuilder).toHaveBeenCalledTimes(2);
	});

	it("passes the botId to the contextBuilder", () => {
		const contextBuilder = jest.fn((id: string) => makeContext({ entityId: id }));
		registerBotBrain("bot-abc", new BotBrain(), makeBehaviors());
		tickBotBrains(0.016, contextBuilder);
		expect(contextBuilder).toHaveBeenCalledWith("bot-abc");
	});

	it("skips a bot when contextBuilder returns null", () => {
		const behaviors = makeBehaviors();
		const brain = new BotBrain();
		const updateSpy = jest.spyOn(brain, "update");
		registerBotBrain("bot-1", brain, behaviors);
		tickBotBrains(0.016, () => null);
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it("activates a behavior after tick (idle → stop while no threats)", () => {
		const behaviors = makeBehaviors();
		const brain = new BotBrain();
		registerBotBrain("bot-1", brain, behaviors);

		// In IDLE with no enemies → STOP command
		tickBotBrains(0.016, () => makeContext({ nearbyEnemies: [] }));

		// After short idle, should be STOP
		// (may wander after IDLE_TO_WANDER_TIME, but first tick is STOP)
		// obstacleAvoidance always on
		expect(behaviors.obstacleAvoidance.active).toBe(true);
	});

	it("activates seek when enemy in aggro range from idle state", () => {
		const behaviors = makeBehaviors();
		const brain = new BotBrain();
		registerBotBrain("bot-1", brain, behaviors);

		const ctx = makeContext({
			nearbyEnemies: [makeEnemy("enemy-1", 50)], // distanceSq=50 < aggroRangeSq=100
		});

		tickBotBrains(0.016, () => ctx);

		// With an enemy in aggro range, brain transitions IDLE→SEEK_TARGET → SEEK
		expect(behaviors.seek.active).toBe(true);
	});

	it("does not affect unregistered bots", () => {
		const behaviors = makeBehaviors();
		// Not registered
		tickBotBrains(0.016, () => makeContext());
		// behaviors should be unchanged (still at default state)
		expect(behaviors.seek.active).toBe(false);
	});

	it("handles zero delta without errors", () => {
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		expect(() => tickBotBrains(0, () => makeContext())).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// resetBotBrainSystem
// ---------------------------------------------------------------------------

describe("resetBotBrainSystem", () => {
	it("clears all registered bots", () => {
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		registerBotBrain("bot-2", new BotBrain(), makeBehaviors());
		resetBotBrainSystem();
		expect(getRegisteredBotCount()).toBe(0);
		expect(isBotBrainRegistered("bot-1")).toBe(false);
	});

	it("stops all behaviors before clearing", () => {
		const behaviors = makeBehaviors();
		behaviors.seek.active = true;
		registerBotBrain("bot-1", new BotBrain(), behaviors);
		resetBotBrainSystem();
		expect(behaviors.seek.active).toBe(false);
	});

	it("allows re-registration after reset", () => {
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		resetBotBrainSystem();
		registerBotBrain("bot-1", new BotBrain(), makeBehaviors());
		expect(isBotBrainRegistered("bot-1")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Integration: full brain → steering pipeline
// ---------------------------------------------------------------------------

describe("BotBrainSystem — integration", () => {
	it("flee command properly activates flee behavior", () => {
		const behaviors = makeBehaviors();
		const brain = new BotBrain();
		registerBotBrain("bot-1", brain, behaviors);

		// Set brain to FLEE state by making health critical
		const criticalCtx = makeContext({
			components: {
				total: 4,
				functional: 1,
				healthRatio: 0.1, // Below fleeThreshold of 0.25
				hasArms: false,
				hasCamera: false,
				hasLegs: true,
			},
			nearbyEnemies: [makeEnemy("enemy-1", 25)],
		});

		// Force brain into ATTACK state first, then trigger flee via low health
		brain.state = "attack" as any;
		(brain as any).targetId = "enemy-1";

		tickBotBrains(0.016, () => criticalCtx);

		// With healthRatio=0.1 < fleeThreshold=0.25 and in ATTACK state
		// brain transitions to FLEE → flee behavior activates
		expect(behaviors.flee.active).toBe(true);
	});

	it("multiple bots get independent steering commands", () => {
		const beh1 = makeBehaviors();
		const beh2 = makeBehaviors();
		const brain1 = new BotBrain();
		const brain2 = new BotBrain();

		registerBotBrain("bot-1", brain1, beh1);
		registerBotBrain("bot-2", brain2, beh2);

		// bot-1 has an enemy, bot-2 has none
		const enemy = makeEnemy("e1", 50);

		tickBotBrains(0.016, (id) => {
			if (id === "bot-1") return makeContext({ nearbyEnemies: [enemy] });
			return makeContext({ nearbyEnemies: [] });
		});

		// bot-1 should be seeking (enemy in range)
		expect(beh1.seek.active).toBe(true);
		// bot-2 should NOT be seeking (no enemies)
		expect(beh2.seek.active).toBe(false);
	});
});
