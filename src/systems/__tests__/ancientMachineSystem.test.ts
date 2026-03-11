/**
 * Unit tests for the ancient machine awakening system.
 *
 * Tests cover:
 * - evaluateAwakenCondition: tech_level_gte, game_minute_gte, compound
 * - spawnAncientMachine: correct initial state
 * - Proximity awakening: DORMANT → AWARE → ACTIVE
 * - Tech-gated awakening: condition not met blocks transition
 * - Colossus dual-condition awakening
 * - damageMachine: HP reduction, destruction, state escalation
 * - notifyStructureDamaged: Crawler becomes hostile
 * - Guardian phase transitions
 * - Swarm drones go directly to hostile from active
 * - getAwakeningEvents drains queue
 * - resetAncientMachineSystem
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		combat: {
			ancientMachines: {
				swarm_drone: {
					hp: 30,
					damage: 1,
					range: 4,
					speed: 4.0,
					triggerRadius: 10,
					loot: {},
				},
				sentinel: {
					hp: 200,
					damage: 5,
					range: 20,
					speed: 0,
					triggerRadius: 10,
					loot: {},
				},
				crawler: {
					hp: 150,
					damage: 4,
					range: 8,
					speed: 2,
					triggerRadius: 8,
					loot: {},
				},
				guardian: {
					hp: 500,
					damage: 10,
					range: 12,
					speed: 1.0,
					triggerRadius: 15,
					awakenCondition: "tech_level_gte_3",
					loot: {},
				},
				colossus: {
					hp: 1500,
					damage: 30,
					range: 15,
					speed: 0.5,
					triggerRadius: 20,
					awakenCondition: "tech_level_gte_5_and_game_minute_gte_60",
					loot: {},
				},
			},
		},
	},
}));

const mockEmit = jest.fn();
jest.mock("../eventBus", () => ({
	emit: (...args: unknown[]) => mockEmit(...args),
}));

import {
	evaluateAwakenCondition,
	isWithinTriggerRadius,
	spawnAncientMachine,
	getAncientMachine,
	getAllAncientMachines,
	getMachinesByType,
	damageMachine,
	notifyStructureDamaged,
	ancientMachineSystem,
	getAwakeningEvents,
	resetAncientMachineSystem,
} from "../ancientMachineSystem";
import type { WorldContext, Vec3 } from "../ancientMachineSystem";

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
const FAR: Vec3 = { x: 1000, y: 0, z: 1000 };

function makeCtx(overrides: Partial<WorldContext> = {}): WorldContext {
	return {
		playerTechLevel: 0,
		gameTick: 1,
		gameMinutesElapsed: 0,
		playerCubeCount: 0,
		recentlyDamagedStructureIds: new Set(),
		...overrides,
	};
}

beforeEach(() => {
	resetAncientMachineSystem();
	mockEmit.mockClear();
});

// ---------------------------------------------------------------------------
// evaluateAwakenCondition
// ---------------------------------------------------------------------------

describe("evaluateAwakenCondition", () => {
	it("returns true when condition is undefined", () => {
		expect(evaluateAwakenCondition(undefined, makeCtx())).toBe(true);
	});

	it("returns true when condition is empty string", () => {
		expect(evaluateAwakenCondition("", makeCtx())).toBe(true);
	});

	it("tech_level_gte_3 passes when tech >= 3", () => {
		expect(
			evaluateAwakenCondition("tech_level_gte_3", makeCtx({ playerTechLevel: 3 })),
		).toBe(true);
	});

	it("tech_level_gte_3 fails when tech < 3", () => {
		expect(
			evaluateAwakenCondition("tech_level_gte_3", makeCtx({ playerTechLevel: 2 })),
		).toBe(false);
	});

	it("tech_level_gte_3 passes when tech = 5 (greater than)", () => {
		expect(
			evaluateAwakenCondition("tech_level_gte_3", makeCtx({ playerTechLevel: 5 })),
		).toBe(true);
	});

	it("compound condition: both must pass", () => {
		expect(
			evaluateAwakenCondition(
				"tech_level_gte_5_and_game_minute_gte_60",
				makeCtx({ playerTechLevel: 5, gameMinutesElapsed: 60 }),
			),
		).toBe(true);
	});

	it("compound condition: fails if tech not met", () => {
		expect(
			evaluateAwakenCondition(
				"tech_level_gte_5_and_game_minute_gte_60",
				makeCtx({ playerTechLevel: 4, gameMinutesElapsed: 90 }),
			),
		).toBe(false);
	});

	it("compound condition: fails if time not met", () => {
		expect(
			evaluateAwakenCondition(
				"tech_level_gte_5_and_game_minute_gte_60",
				makeCtx({ playerTechLevel: 5, gameMinutesElapsed: 30 }),
			),
		).toBe(false);
	});

	it("unknown condition clause returns false (fail safe)", () => {
		expect(
			evaluateAwakenCondition("totally_unknown_condition", makeCtx()),
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isWithinTriggerRadius
// ---------------------------------------------------------------------------

describe("isWithinTriggerRadius", () => {
	it("returns true when player is inside radius", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		expect(isWithinTriggerRadius(m, { x: 5, y: 0, z: 0 }, 10)).toBe(true);
	});

	it("returns false when player is outside radius", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		expect(isWithinTriggerRadius(m, { x: 15, y: 0, z: 0 }, 10)).toBe(false);
	});

	it("returns true at exact boundary", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		expect(isWithinTriggerRadius(m, { x: 10, y: 0, z: 0 }, 10)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// spawnAncientMachine
// ---------------------------------------------------------------------------

describe("spawnAncientMachine", () => {
	it("creates machine with correct initial state", () => {
		const m = spawnAncientMachine("sentinel", { x: 10, y: 0, z: 20 }, 5);
		expect(m.type).toBe("sentinel");
		expect(m.state).toBe("dormant");
		expect(m.hp).toBe(200);
		expect(m.maxHp).toBe(200);
		expect(m.position).toEqual({ x: 10, y: 0, z: 20 });
		expect(m.spawnTick).toBe(5);
	});

	it("assigns unique IDs", () => {
		const m1 = spawnAncientMachine("sentinel", ORIGIN, 1);
		const m2 = spawnAncientMachine("crawler", ORIGIN, 1);
		expect(m1.id).not.toBe(m2.id);
	});

	it("registers in getAncientMachine", () => {
		const m = spawnAncientMachine("guardian", ORIGIN, 1);
		expect(getAncientMachine(m.id)).toBe(m);
	});

	it("appears in getAllAncientMachines", () => {
		spawnAncientMachine("sentinel", ORIGIN, 1);
		spawnAncientMachine("crawler", ORIGIN, 1);
		expect(getAllAncientMachines()).toHaveLength(2);
	});

	it("stores maintainedStructureId for crawler", () => {
		const m = spawnAncientMachine("crawler", ORIGIN, 1, "structure_42");
		expect(m.maintainedStructureId).toBe("structure_42");
	});

	it("copies position to prevent mutation", () => {
		const pos: Vec3 = { x: 10, y: 0, z: 20 };
		const m = spawnAncientMachine("sentinel", pos, 1);
		pos.x = 999;
		expect(m.position.x).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Proximity awakening: Sentinel (no tech condition)
// ---------------------------------------------------------------------------

describe("sentinel proximity awakening", () => {
	it("stays dormant when player is far away", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		const ctx = makeCtx({ gameTick: 1 });
		ancientMachineSystem(ctx, FAR);
		expect(m.state).toBe("dormant");
	});

	it("becomes aware when player enters trigger radius", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		const ctx = makeCtx({ gameTick: 1 });
		ancientMachineSystem(ctx, { x: 5, y: 0, z: 0 });
		expect(m.state).toBe("aware");
	});

	it("stays aware for fewer than 20 ticks, then becomes active", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		const nearPos: Vec3 = { x: 5, y: 0, z: 0 };

		// Tick 1: dormant → aware (stateTicksElapsed resets to 0)
		ancientMachineSystem(makeCtx({ gameTick: 1 }), nearPos);
		expect(m.state).toBe("aware");

		// Ticks 2..20: stateTicksElapsed goes 1..19 (19 ticks, not yet >= 20)
		for (let t = 2; t <= 20; t++) {
			ancientMachineSystem(makeCtx({ gameTick: t }), nearPos);
		}
		// stateTicksElapsed is 19 — not yet 20
		expect(m.state).toBe("aware");

		// Tick 21: stateTicksElapsed reaches 20 → active
		ancientMachineSystem(makeCtx({ gameTick: 21 }), nearPos);
		expect(m.state).toBe("active");
	});

	it("returns to dormant if player leaves within 60 ticks of becoming aware", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);

		// Tick 1: dormant → aware
		ancientMachineSystem(makeCtx({ gameTick: 1 }), { x: 5, y: 0, z: 0 });
		expect(m.state).toBe("aware");

		// Player leaves — tick 60 times while far (stateTicksElapsed reaches 60)
		for (let t = 2; t <= 61; t++) {
			ancientMachineSystem(makeCtx({ gameTick: t }), FAR);
		}
		// stateTicksElapsed = 60 → returns to dormant
		expect(m.state).toBe("dormant");
	});
});

// ---------------------------------------------------------------------------
// Tech-gated awakening: Guardian
// ---------------------------------------------------------------------------

describe("guardian tech-gated awakening", () => {
	it("stays dormant when player tech < 3 even if nearby", () => {
		const m = spawnAncientMachine("guardian", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 2, gameTick: 1 }),
			{ x: 5, y: 0, z: 0 },
		);
		expect(m.state).toBe("dormant");
	});

	it("awakens when tech >= 3 and player nearby", () => {
		const m = spawnAncientMachine("guardian", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 3, gameTick: 1 }),
			{ x: 5, y: 0, z: 0 },
		);
		expect(m.state).toBe("guardian_phase_1");
	});

	it("emits ancient_machine_hostile when guardian awakens", () => {
		spawnAncientMachine("guardian", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 3, gameTick: 1 }),
			{ x: 5, y: 0, z: 0 },
		);
		const call = mockEmit.mock.calls.find(
			(c) => (c[0] as { type: string }).type === "ancient_machine_hostile",
		);
		expect(call).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Colossus dual-condition awakening
// ---------------------------------------------------------------------------

describe("colossus awakening", () => {
	it("stays dormant if only tech is met", () => {
		const m = spawnAncientMachine("colossus", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 5, gameMinutesElapsed: 30, gameTick: 1 }),
			{ x: 5, y: 0, z: 0 },
		);
		expect(m.state).toBe("dormant");
	});

	it("stays dormant if only time is met", () => {
		const m = spawnAncientMachine("colossus", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 3, gameMinutesElapsed: 61, gameTick: 1 }),
			{ x: 5, y: 0, z: 0 },
		);
		expect(m.state).toBe("dormant");
	});

	it("awakens when both conditions are met and player nearby", () => {
		const m = spawnAncientMachine("colossus", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 5, gameMinutesElapsed: 60, gameTick: 1 }),
			{ x: 10, y: 0, z: 0 },
		);
		expect(m.state).toBe("active");
	});

	it("emits colossus_awakening event", () => {
		spawnAncientMachine("colossus", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 5, gameMinutesElapsed: 60, gameTick: 100 }),
			{ x: 10, y: 0, z: 0 },
		);
		const call = mockEmit.mock.calls.find(
			(c) => (c[0] as { type: string }).type === "colossus_awakening",
		);
		expect(call).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// damageMachine
// ---------------------------------------------------------------------------

describe("damageMachine", () => {
	it("reduces HP", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		damageMachine(m.id, 50, 1);
		expect(m.hp).toBe(150);
	});

	it("returns true when machine is destroyed", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		const destroyed = damageMachine(m.id, 200, 1);
		expect(destroyed).toBe(true);
		expect(m.state).toBe("destroyed");
	});

	it("HP does not go below 0", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		damageMachine(m.id, 9999, 1);
		expect(m.hp).toBe(0);
	});

	it("sentinel becomes hostile on first damage", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		damageMachine(m.id, 10, 1);
		expect(m.state).toBe("hostile");
	});

	it("crawler becomes hostile on damage", () => {
		const m = spawnAncientMachine("crawler", ORIGIN, 1);
		damageMachine(m.id, 10, 1);
		expect(m.state).toBe("hostile");
	});

	it("returns false for unknown machine ID", () => {
		expect(damageMachine("not_real", 100, 1)).toBe(false);
	});

	it("returns false for already-destroyed machine", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		damageMachine(m.id, 200, 1); // destroy
		const result = damageMachine(m.id, 10, 2); // try again
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Guardian phase transitions
// ---------------------------------------------------------------------------

describe("guardian phase transitions", () => {
	it("starts in dormant, awakens to phase_1 on proximity + tech", () => {
		const m = spawnAncientMachine("guardian", ORIGIN, 1);
		ancientMachineSystem(
			makeCtx({ playerTechLevel: 3, gameTick: 1 }),
			{ x: 5, y: 0, z: 0 },
		);
		expect(m.state).toBe("guardian_phase_1");
	});

	it("transitions to phase_2 when HP drops to 50% or below", () => {
		const m = spawnAncientMachine("guardian", ORIGIN, 1);
		// First awaken
		ancientMachineSystem(makeCtx({ playerTechLevel: 3, gameTick: 1 }), ORIGIN);
		expect(m.state).toBe("guardian_phase_1");

		// Damage to 50% (HP = 250 out of 500)
		damageMachine(m.id, 250, 2);
		expect(m.state).toBe("guardian_phase_2");
	});

	it("transitions to phase_3 when HP drops below 25%", () => {
		const m = spawnAncientMachine("guardian", ORIGIN, 1);
		ancientMachineSystem(makeCtx({ playerTechLevel: 3, gameTick: 1 }), ORIGIN);

		// Damage to 25% (HP = 125 out of 500)
		damageMachine(m.id, 375, 2);
		expect(m.state).toBe("guardian_phase_3");
	});
});

// ---------------------------------------------------------------------------
// Crawler: structure damage hostility
// ---------------------------------------------------------------------------

describe("crawler structure damage", () => {
	it("becomes hostile when maintained structure is damaged", () => {
		const m = spawnAncientMachine("crawler", ORIGIN, 1, "structure_99");
		expect(m.state).toBe("dormant");

		const ctx = makeCtx({
			gameTick: 1,
			recentlyDamagedStructureIds: new Set(["structure_99"]),
		});
		ancientMachineSystem(ctx, FAR);
		expect(m.state).toBe("hostile");
	});

	it("does not become hostile if different structure is damaged", () => {
		const m = spawnAncientMachine("crawler", ORIGIN, 1, "structure_99");
		const ctx = makeCtx({
			gameTick: 1,
			recentlyDamagedStructureIds: new Set(["structure_77"]),
		});
		ancientMachineSystem(ctx, FAR);
		expect(m.state).toBe("dormant");
	});

	it("notifyStructureDamaged triggers hostility directly", () => {
		const m = spawnAncientMachine("crawler", ORIGIN, 1, "structure_42");
		notifyStructureDamaged("structure_42", 1);
		expect(m.state).toBe("hostile");
	});
});

// ---------------------------------------------------------------------------
// Swarm drone
// ---------------------------------------------------------------------------

describe("swarm_drone awakening", () => {
	it("goes directly to hostile from active on proximity", () => {
		const m = spawnAncientMachine("swarm_drone", ORIGIN, 1);
		// Tick once to become aware
		ancientMachineSystem(makeCtx({ gameTick: 1 }), { x: 5, y: 0, z: 0 });
		expect(m.state).toBe("aware");
		// Wait 20 dwell-ticks to become active (t=2..21), then one more tick
		// processes the active case and transitions to hostile (t=22)
		for (let t = 2; t <= 22; t++) {
			ancientMachineSystem(makeCtx({ gameTick: t }), { x: 5, y: 0, z: 0 });
		}
		expect(m.state).toBe("hostile");
	});
});

// ---------------------------------------------------------------------------
// getMachinesByType
// ---------------------------------------------------------------------------

describe("getMachinesByType", () => {
	it("returns only machines of specified type", () => {
		spawnAncientMachine("sentinel", ORIGIN, 1);
		spawnAncientMachine("sentinel", { x: 50, y: 0, z: 50 }, 1);
		spawnAncientMachine("crawler", ORIGIN, 1);
		expect(getMachinesByType("sentinel")).toHaveLength(2);
		expect(getMachinesByType("crawler")).toHaveLength(1);
	});

	it("excludes destroyed machines", () => {
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		damageMachine(m.id, 9999, 1);
		expect(getMachinesByType("sentinel")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// getAwakeningEvents
// ---------------------------------------------------------------------------

describe("getAwakeningEvents", () => {
	it("records awakening event on state transition", () => {
		spawnAncientMachine("sentinel", ORIGIN, 1);
		ancientMachineSystem(makeCtx({ gameTick: 1 }), { x: 5, y: 0, z: 0 });
		const events = getAwakeningEvents();
		expect(events).toHaveLength(1);
		expect(events[0].toState).toBe("aware");
	});

	it("drains the queue on each call", () => {
		spawnAncientMachine("sentinel", ORIGIN, 1);
		ancientMachineSystem(makeCtx({ gameTick: 1 }), { x: 5, y: 0, z: 0 });
		getAwakeningEvents(); // drain
		expect(getAwakeningEvents()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetAncientMachineSystem", () => {
	it("clears all machines", () => {
		spawnAncientMachine("sentinel", ORIGIN, 1);
		spawnAncientMachine("crawler", ORIGIN, 1);
		resetAncientMachineSystem();
		expect(getAllAncientMachines()).toHaveLength(0);
	});

	it("resets ID counter", () => {
		spawnAncientMachine("sentinel", ORIGIN, 1);
		resetAncientMachineSystem();
		const m = spawnAncientMachine("sentinel", ORIGIN, 1);
		expect(m.id).toBe("ancient_1");
	});

	it("clears awakening events", () => {
		spawnAncientMachine("sentinel", ORIGIN, 1);
		ancientMachineSystem(makeCtx({ gameTick: 1 }), { x: 5, y: 0, z: 0 });
		resetAncientMachineSystem();
		expect(getAwakeningEvents()).toHaveLength(0);
	});
});
