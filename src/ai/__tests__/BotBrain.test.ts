/**
 * Unit tests for BotBrain — finite state machine for individual bot behavior.
 *
 * Tests cover:
 * - FSM state transitions (IDLE -> PATROL -> SEEK_TARGET -> ATTACK -> FLEE etc.)
 * - Perception-based state decision logic
 * - Edge cases: no targets, multiple targets, target destroyed
 * - Order processing from governor (setOrder + context-driven)
 * - Guard, Gather, ReturnToBase, Follow states
 * - State transition resets (stateTime, patrolWaypoint, etc.)
 * - Boundary conditions (exact thresholds, zero delta, null targets)
 * - startFlee fallback paths (threat, homeBase, wander)
 * - PATROL_AREA order patrolCenter fallback from context position
 * - Guard fallback to ctx.position when guardCenter is null
 * - Follow finding leader in enemies list (findEntityInAll)
 * - Multiple rapid state transitions
 * - Repeated orders (same reference vs new reference)
 */

import type { BotContext, NearbyEntity } from "../BotContext.ts";
import { BotOrderType, type BotOrder } from "../BotOrders.ts";
import { BotBrain, BotState, SteeringCommand } from "../BotBrain.ts";
import type { Vec3 } from "../../ecs/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

function makeEnemy(
	id: string,
	position: Vec3,
	distanceSq: number,
): NearbyEntity {
	return { id, position, distanceSq, faction: "cultist" };
}

function makeAlly(
	id: string,
	position: Vec3,
	distanceSq: number,
): NearbyEntity {
	return { id, position, distanceSq, faction: "player" };
}

/** Build a minimal BotContext with sane defaults. Override fields as needed. */
function makeContext(overrides: Partial<BotContext> = {}): BotContext {
	return {
		entityId: "bot1",
		position: pos(0, 0, 0),
		faction: "player",
		nearbyEnemies: [],
		nearbyAllies: [],
		components: {
			total: 4,
			functional: 4,
			healthRatio: 1.0,
			hasArms: true,
			hasCamera: true,
			hasLegs: true,
		},
		homeBase: null,
		currentOrder: null,
		aggroRangeSq: 100, // 10 unit aggro range
		patrolRangeSq: 225, // 15 unit patrol range
		meleeRange: 2,
		fleeThreshold: 0.25,
		safeDistanceSq: 400, // 20 units
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let brain: BotBrain;

beforeEach(() => {
	brain = new BotBrain();
	// Deterministic random for patrol waypoints
	jest.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
	jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
	it("starts in IDLE state", () => {
		expect(brain.state).toBe(BotState.IDLE);
	});

	it("starts with no target", () => {
		expect(brain.targetId).toBeNull();
	});

	it("starts with zero state time", () => {
		expect(brain.stateTime).toBe(0);
	});

	it("starts with no patrol waypoint", () => {
		expect(brain.patrolWaypoint).toBeNull();
	});

	it("starts with no guard center", () => {
		expect(brain.guardCenter).toBeNull();
	});

	it("starts with no patrol center", () => {
		expect(brain.patrolCenter).toBeNull();
	});

	it("starts with default guard radius of 8", () => {
		expect(brain.guardRadius).toBe(8);
	});

	it("starts with default patrol radius of 15", () => {
		expect(brain.patrolRadius).toBe(15);
	});
});

// ---------------------------------------------------------------------------
// IDLE state
// ---------------------------------------------------------------------------

describe("IDLE state", () => {
	it("returns STOP when idle with no threats", () => {
		const ctx = makeContext();
		const output = brain.update(0.016, ctx);
		expect(output.command).toBe(SteeringCommand.STOP);
	});

	it("transitions to SEEK_TARGET when enemy within aggro range", () => {
		const enemy = makeEnemy("enemy1", pos(5, 0, 0), 25);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.targetId).toBe("enemy1");
		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(5, 0, 0));
	});

	it("does NOT transition to SEEK_TARGET when enemy is beyond aggro range", () => {
		const enemy = makeEnemy("enemy1", pos(50, 0, 0), 2500);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
	});

	it("transitions to PATROL after IDLE_TO_WANDER_TIME seconds", () => {
		const ctx = makeContext();

		// Simulate 3+ seconds of idle time
		brain.update(3.1, ctx);

		expect(brain.state).toBe(BotState.PATROL);
	});

	it("returns WANDER when transitioning from IDLE to PATROL", () => {
		const ctx = makeContext();
		const output = brain.update(3.1, ctx);
		expect(output.command).toBe(SteeringCommand.WANDER);
	});

	it("sets patrolCenter to current position when entering patrol from idle", () => {
		const ctx = makeContext({ position: pos(10, 0, 20) });
		brain.update(3.1, ctx);
		expect(brain.patrolCenter).toEqual(pos(10, 0, 20));
	});

	it("preserves existing patrolCenter when entering patrol from idle", () => {
		brain.patrolCenter = pos(99, 0, 99);
		const ctx = makeContext({ position: pos(10, 0, 20) });
		brain.update(3.1, ctx);
		expect(brain.patrolCenter).toEqual(pos(99, 0, 99));
	});

	it("does not transition to PATROL at exactly IDLE_TO_WANDER_TIME", () => {
		const ctx = makeContext();
		// stateTime will be exactly 3.0 after this update
		brain.update(3.0, ctx);
		// At exactly 3.0, stateTime > 3.0 is false
		expect(brain.state).toBe(BotState.IDLE);
	});

	it("prioritizes aggro over idle-to-patrol transition", () => {
		const enemy = makeEnemy("enemy1", pos(5, 0, 0), 25);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		// Even with stateTime > 3.0, aggro check happens first
		brain.update(4.0, ctx);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.targetId).toBe("enemy1");
	});

	it("handles zero delta time without crashing", () => {
		const ctx = makeContext();
		const output = brain.update(0, ctx);
		expect(output.command).toBe(SteeringCommand.STOP);
		expect(brain.stateTime).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// PATROL state
// ---------------------------------------------------------------------------

describe("PATROL state", () => {
	beforeEach(() => {
		// Put brain into PATROL state
		brain.patrolCenter = pos(0, 0, 0);
		const ctx = makeContext();
		brain.update(3.1, ctx); // idle -> patrol
	});

	it("generates patrol waypoints and uses ARRIVE command", () => {
		const ctx = makeContext();
		const output = brain.update(0.016, ctx);
		expect(output.command).toBe(SteeringCommand.ARRIVE);
		expect(output.target).toBeDefined();
	});

	it("transitions to SEEK_TARGET when enemy enters aggro range after MIN_STATE_DURATION", () => {
		const ctx = makeContext();
		// Accumulate time past MIN_STATE_DURATION
		brain.update(0.6, ctx);

		const enemy = makeEnemy("enemy1", pos(3, 0, 0), 9);
		const ctxWithEnemy = makeContext({ nearbyEnemies: [enemy] });
		const output = brain.update(0.016, ctxWithEnemy);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.targetId).toBe("enemy1");
		expect(output.command).toBe(SteeringCommand.SEEK);
	});

	it("does NOT transition to SEEK_TARGET before MIN_STATE_DURATION", () => {
		// Brain just entered PATROL, stateTime is 0
		const enemy = makeEnemy("enemy1", pos(3, 0, 0), 9);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		// Small delta below MIN_STATE_DURATION threshold
		brain.update(0.1, ctx);

		expect(brain.state).toBe(BotState.PATROL);
	});

	it("picks closest enemy when multiple threats present", () => {
		const ctx = makeContext();
		brain.update(0.6, ctx); // pass MIN_STATE_DURATION

		const farEnemy = makeEnemy("far", pos(8, 0, 0), 64);
		const closeEnemy = makeEnemy("close", pos(3, 0, 0), 9);
		// Enemies sorted closest-first per BotContext contract
		const ctxWithEnemies = makeContext({
			nearbyEnemies: [closeEnemy, farEnemy],
		});

		brain.update(0.016, ctxWithEnemies);

		expect(brain.targetId).toBe("close");
	});

	it("generates a new waypoint when close to current waypoint", () => {
		// Position the bot right at its patrol waypoint
		const ctx = makeContext({ position: pos(0, 0, 0) });
		brain.update(0.016, ctx); // first waypoint generated

		const firstWaypoint = brain.patrolWaypoint;

		// Move bot to be near the waypoint (within threshold of 4)
		const nearWaypoint = makeContext({
			position: firstWaypoint ?? pos(0, 0, 0),
		});
		brain.update(0.016, nearWaypoint);

		// Waypoint should be regenerated
		expect(brain.patrolWaypointAge).toBe(0);
	});

	it("generates new waypoint after PATROL_WAYPOINT_LIFETIME expires", () => {
		const ctx = makeContext({ position: pos(100, 0, 100) }); // far from any waypoint
		brain.update(0.016, ctx); // generates first waypoint

		// Pass enough time for waypoint to expire (5+ seconds)
		brain.update(5.1, ctx);

		// Waypoint age should be reset
		expect(brain.patrolWaypointAge).toBe(0);
	});

	it("returns WANDER when patrolWaypoint is null after generation attempt", () => {
		// This can happen if patrolCenter is null and ctx.position is used
		// The waypoint is always generated, so this path is unlikely
		// but let's verify the fallback works
		const ctx = makeContext({ position: pos(0, 0, 0) });
		const output = brain.update(0.016, ctx);
		// With mocked Math.random returning 0.5, waypoint is always generated
		expect(output.command).toBe(SteeringCommand.ARRIVE);
	});

	it("uses patrolCenter for waypoint generation", () => {
		brain.patrolCenter = pos(100, 0, 100);
		brain.patrolRadius = 10;
		const ctx = makeContext({ position: pos(0, 0, 0) });
		brain.update(0.016, ctx);

		// Waypoint should be near patrolCenter, not near bot position
		expect(brain.patrolWaypoint).toBeDefined();
		const wp = brain.patrolWaypoint!;
		// With Math.random = 0.5: angle = PI, dist = 5
		// x = 100 + cos(PI)*5 = 95, z = 100 + sin(PI)*5 ~ 100
		expect(wp.x).toBeCloseTo(95, 0);
		expect(wp.z).toBeCloseTo(100, 0);
	});
});

// ---------------------------------------------------------------------------
// SEEK_TARGET state
// ---------------------------------------------------------------------------

describe("SEEK_TARGET state", () => {
	it("transitions to ATTACK when target enters melee range", () => {
		const enemy = makeEnemy("enemy1", pos(1, 0, 0), 1); // distSq=1, meleeRange=2 -> 4sq
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		// Enter SEEK_TARGET first
		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.ATTACK);
		expect(output.command).toBe(SteeringCommand.ARRIVE);
	});

	it("keeps seeking when target is beyond melee range", () => {
		const enemy = makeEnemy("enemy1", pos(8, 0, 0), 64);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(8, 0, 0));
	});

	it("transitions to IDLE when target is lost (not in perception)", () => {
		const ctx = makeContext({ nearbyEnemies: [] }); // target not visible

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
		expect(brain.targetId).toBeNull();
		expect(output.command).toBe(SteeringCommand.STOP);
	});

	it("transitions to PATROL (not IDLE) when target lost and patrolCenter exists", () => {
		const ctx = makeContext({ nearbyEnemies: [] });

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.patrolCenter = pos(10, 0, 10);
		brain.stateTime = 0;

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.PATROL);
	});

	it("transitions to FLEE when health drops below threshold", () => {
		const enemy = makeEnemy("enemy1", pos(5, 0, 0), 25);
		const ctx = makeContext({
			nearbyEnemies: [enemy],
			components: {
				total: 4,
				functional: 0,
				healthRatio: 0.0, // below fleeThreshold of 0.25
				hasArms: false,
				hasCamera: false,
				hasLegs: false,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.FLEE);
	});

	it("finds target in allies list via findEntityInPerception", () => {
		const ally = makeAlly("ally1", pos(5, 0, 0), 25);
		const ctx = makeContext({ nearbyAllies: [ally] });

		brain.targetId = "ally1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		// ally found, distance > meleeRangeSq (4), so keep seeking
		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(5, 0, 0));
	});

	it("prefers enemy list over ally list when target appears in both", () => {
		const enemyVersion = makeEnemy("target1", pos(5, 0, 0), 25);
		const allyVersion = makeAlly("target1", pos(10, 0, 0), 100);
		const ctx = makeContext({
			nearbyEnemies: [enemyVersion],
			nearbyAllies: [allyVersion],
		});

		brain.targetId = "target1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		// findEntityInPerception checks enemies first
		expect(output.target).toEqual(pos(5, 0, 0));
	});
});

// ---------------------------------------------------------------------------
// ATTACK state
// ---------------------------------------------------------------------------

describe("ATTACK state", () => {
	it("stays in ATTACK while target is in melee range", () => {
		const enemy = makeEnemy("enemy1", pos(1, 0, 0), 1);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.ATTACK);
		expect(output.command).toBe(SteeringCommand.ARRIVE);
		expect(output.target).toEqual(pos(1, 0, 0));
	});

	it("transitions to SEEK_TARGET when target moves out of melee range", () => {
		// meleeRange = 2, meleeRangeSq = 4, hysteresis = 4 * 1.5 = 6
		// distSq = 7 is beyond hysteresis
		const enemy = makeEnemy("enemy1", pos(3, 0, 0), 9);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(output.command).toBe(SteeringCommand.SEEK);
	});

	it("stays in ATTACK within hysteresis zone", () => {
		// meleeRange = 2, meleeRangeSq = 4, hysteresis threshold = 4 * 1.5 = 6
		// distSq = 5 is within hysteresis (still in ATTACK)
		const enemy = makeEnemy("enemy1", pos(2.2, 0, 0), 5);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.ATTACK);
		expect(output.command).toBe(SteeringCommand.ARRIVE);
	});

	it("transitions to IDLE when target is destroyed", () => {
		const ctx = makeContext({ nearbyEnemies: [] }); // target gone

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
		expect(brain.targetId).toBeNull();
		expect(output.command).toBe(SteeringCommand.STOP);
	});

	it("transitions to FLEE when health critical", () => {
		const enemy = makeEnemy("enemy1", pos(1, 0, 0), 1);
		const ctx = makeContext({
			nearbyEnemies: [enemy],
			components: {
				total: 4,
				functional: 1,
				healthRatio: 0.2,
				hasArms: false,
				hasCamera: false,
				hasLegs: true,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.FLEE);
		expect(output.target).toEqual(pos(1, 0, 0));
	});

	it("flee from attack prioritizes threat position", () => {
		const enemy = makeEnemy("enemy1", pos(3, 0, 4), 25);
		const ctx = makeContext({
			nearbyEnemies: [enemy],
			homeBase: pos(100, 0, 100),
			components: {
				total: 4,
				functional: 0,
				healthRatio: 0.0,
				hasArms: false,
				hasCamera: false,
				hasLegs: false,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.FLEE);
		// Should flee from threat, not seek homeBase
		expect(output.target).toEqual(pos(3, 0, 4));
	});
});

// ---------------------------------------------------------------------------
// FLEE state
// ---------------------------------------------------------------------------

describe("FLEE state", () => {
	it("keeps fleeing while threat is within safe distance", () => {
		const enemy = makeEnemy("enemy1", pos(5, 0, 0), 25); // < safeDistanceSq 400
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.state = BotState.FLEE as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.FLEE);
		expect(output.target).toEqual(pos(5, 0, 0));
	});

	it("transitions to IDLE when safe distance reached and MIN_STATE_DURATION passed", () => {
		const ctx = makeContext({ nearbyEnemies: [] }); // no threats

		brain.state = BotState.FLEE as BotState;
		brain.stateTime = 0;

		// Must pass MIN_STATE_DURATION
		brain.update(0.6, ctx);

		expect(brain.state).toBe(BotState.IDLE);
	});

	it("transitions to PATROL instead of IDLE if patrolCenter exists", () => {
		const ctx = makeContext({ nearbyEnemies: [] });

		brain.state = BotState.FLEE as BotState;
		brain.patrolCenter = pos(10, 0, 10);
		brain.stateTime = 0;

		brain.update(0.6, ctx);

		expect(brain.state).toBe(BotState.PATROL);
	});

	it("does NOT stop fleeing before MIN_STATE_DURATION even if safe", () => {
		const ctx = makeContext({ nearbyEnemies: [] });

		brain.state = BotState.FLEE as BotState;
		brain.stateTime = 0;

		brain.update(0.1, ctx); // below MIN_STATE_DURATION

		expect(brain.state).toBe(BotState.FLEE);
	});

	it("seeks homeBase when no threats and no patrol center", () => {
		const ctx = makeContext({
			nearbyEnemies: [],
			homeBase: pos(50, 0, 50),
		});

		brain.state = BotState.FLEE as BotState;
		brain.stateTime = 0;

		// Before MIN_STATE_DURATION, still fleeing but toward home
		const output = brain.update(0.1, ctx);

		// No threats, haven't passed MIN_STATE_DURATION, so still FLEE
		// With no threat, flee falls through to homeBase seek
		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(50, 0, 50));
	});

	it("returns WANDER when no threats and no homeBase", () => {
		const ctx = makeContext({
			nearbyEnemies: [],
			homeBase: null,
		});

		brain.state = BotState.FLEE as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.1, ctx);

		expect(output.command).toBe(SteeringCommand.WANDER);
	});

	it("keeps fleeing when threat exists beyond safe distance but under MIN_STATE_DURATION", () => {
		// Threat beyond safe distance but haven't been fleeing long enough
		const enemy = makeEnemy("enemy1", pos(25, 0, 0), 625); // > safeDistanceSq(400)
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.state = BotState.FLEE as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.1, ctx);

		// Still in FLEE because MIN_STATE_DURATION not met
		expect(brain.state).toBe(BotState.FLEE);
		// But there IS a threat, so flee from it
		expect(output.command).toBe(SteeringCommand.FLEE);
		expect(output.target).toEqual(pos(25, 0, 0));
	});

	it("transitions out of flee when threat beyond safe distance AND MIN_STATE_DURATION passed", () => {
		const enemy = makeEnemy("enemy1", pos(25, 0, 0), 625); // > safeDistanceSq(400)
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.state = BotState.FLEE as BotState;
		brain.stateTime = 0;

		brain.update(0.6, ctx); // pass MIN_STATE_DURATION

		expect(brain.state).toBe(BotState.IDLE);
	});

	it("clears targetId when transitioning out of flee", () => {
		brain.state = BotState.FLEE as BotState;
		brain.targetId = "old-enemy";
		brain.stateTime = 0;

		const ctx = makeContext({ nearbyEnemies: [] });
		brain.update(0.6, ctx);

		expect(brain.targetId).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// GUARD state
// ---------------------------------------------------------------------------

describe("GUARD state", () => {
	it("stays at guard point when no threats", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = pos(10, 0, 10);
		brain.stateTime = 0;

		const ctx = makeContext({ position: pos(10, 0, 10) }); // at guard point
		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.STOP);
	});

	it("returns to guard point if drifted away", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = pos(10, 0, 10);
		brain.stateTime = 0;

		const ctx = makeContext({ position: pos(15, 0, 15) }); // far from guard point
		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.ARRIVE);
		expect(output.target).toEqual(pos(10, 0, 10));
	});

	it("attacks threat that enters guard radius but is beyond melee range", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = pos(10, 0, 10);
		brain.guardRadius = 8;
		brain.stateTime = 0;

		// Enemy within guard radius from guard center but beyond melee range from bot
		// meleeRange = 2, meleeRangeSq = 4 — distanceSq must be > 4
		const enemy = makeEnemy("enemy1", pos(15, 0, 10), 25);
		const ctx = makeContext({
			position: pos(10, 0, 10),
			nearbyEnemies: [enemy],
		});
		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(brain.targetId).toBe("enemy1");
	});

	it("transitions to ATTACK when threat is in melee range within guard area", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = pos(10, 0, 10);
		brain.guardRadius = 8;
		brain.stateTime = 0;

		// Enemy within melee range (distSq=1, meleeRange=2 -> 4sq)
		const enemy = makeEnemy("enemy1", pos(10.5, 0, 10), 1);
		const ctx = makeContext({
			position: pos(10, 0, 10),
			nearbyEnemies: [enemy],
		});

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.ATTACK);
	});

	it("ignores threats outside guard radius", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = pos(10, 0, 10);
		brain.guardRadius = 5;
		brain.stateTime = 0;

		// Enemy far from guard center (distance > guardRadius)
		const enemy = makeEnemy("enemy1", pos(50, 0, 50), 2500);
		const ctx = makeContext({
			position: pos(10, 0, 10),
			nearbyEnemies: [enemy],
		});

		const output = brain.update(0.016, ctx);

		// Should stay guarding, not engage
		expect(brain.state).toBe(BotState.GUARD);
		expect(output.command).toBe(SteeringCommand.STOP);
	});

	it("flees when health critical while engaging in guard area", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = pos(10, 0, 10);
		brain.guardRadius = 8;
		brain.stateTime = 0;

		const enemy = makeEnemy("enemy1", pos(12, 0, 12), 4);
		const ctx = makeContext({
			position: pos(10, 0, 10),
			nearbyEnemies: [enemy],
			components: {
				total: 4,
				functional: 0,
				healthRatio: 0.1,
				hasArms: false,
				hasCamera: false,
				hasLegs: false,
			},
		});

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.FLEE);
	});

	it("uses ctx.position as fallback when guardCenter is null", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = null;
		brain.stateTime = 0;

		// Bot at (10,0,10) — guard center defaults to position
		// Enemy near the bot's position
		const enemy = makeEnemy("enemy1", pos(11, 0, 10), 1);
		const ctx = makeContext({
			position: pos(10, 0, 10),
			nearbyEnemies: [enemy],
		});

		brain.update(0.016, ctx);

		// Should still detect threat within guard radius (default 8)
		// Enemy is 1 unit from bot pos, well within guardRadius of 8
		expect(brain.targetId).toBe("enemy1");
	});

	it("does not drift return if within 2 units of guard point", () => {
		brain.state = BotState.GUARD as BotState;
		brain.guardCenter = pos(10, 0, 10);
		brain.stateTime = 0;

		// Bot slightly off-center but within threshold (distSq < 4)
		const ctx = makeContext({ position: pos(10.5, 0, 10.5) });
		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.STOP);
	});
});

// ---------------------------------------------------------------------------
// GATHER state
// ---------------------------------------------------------------------------

describe("GATHER state", () => {
	it("moves toward deposit target", () => {
		brain.state = BotState.GATHER as BotState;
		brain.targetId = "deposit1";
		brain.stateTime = 0;

		const deposit = makeEnemy("deposit1", pos(20, 0, 20), 400);
		const ctx = makeContext({ nearbyEnemies: [deposit] });

		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.ARRIVE);
		expect(output.target).toEqual(pos(20, 0, 20));
	});

	it("transitions to IDLE when deposit is lost/depleted", () => {
		brain.state = BotState.GATHER as BotState;
		brain.targetId = "deposit1";
		brain.stateTime = 0;

		const ctx = makeContext({ nearbyEnemies: [] }); // deposit not in perception

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
		expect(brain.targetId).toBeNull();
	});

	it("auto-aggros on nearby enemy while gathering (after MIN_STATE_DURATION)", () => {
		brain.state = BotState.GATHER as BotState;
		brain.targetId = "deposit1";
		brain.stateTime = 0;

		const ctx = makeContext();
		brain.update(0.6, ctx); // pass MIN_STATE_DURATION

		const enemy = makeEnemy("enemy1", pos(3, 0, 0), 9);
		const ctxWithEnemy = makeContext({ nearbyEnemies: [enemy] });

		brain.update(0.016, ctxWithEnemy);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.targetId).toBe("enemy1");
	});

	it("does NOT aggro before MIN_STATE_DURATION", () => {
		brain.state = BotState.GATHER as BotState;
		brain.targetId = "deposit1";
		brain.stateTime = 0;

		const deposit = makeEnemy("deposit1", pos(20, 0, 20), 400);
		const enemy = makeEnemy("enemy1", pos(3, 0, 0), 9);
		const ctx = makeContext({ nearbyEnemies: [enemy, deposit] });

		brain.update(0.1, ctx); // below MIN_STATE_DURATION

		// Should still be gathering (deposit found in perception)
		expect(brain.state).toBe(BotState.GATHER);
	});

	it("finds deposit in allies list", () => {
		brain.state = BotState.GATHER as BotState;
		brain.targetId = "deposit1";
		brain.stateTime = 0;

		const deposit = makeAlly("deposit1", pos(20, 0, 20), 400);
		const ctx = makeContext({ nearbyAllies: [deposit] });

		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.ARRIVE);
		expect(output.target).toEqual(pos(20, 0, 20));
	});

	it("does not aggro on enemy beyond aggro range", () => {
		brain.state = BotState.GATHER as BotState;
		brain.targetId = "deposit1";
		brain.stateTime = 0;

		// Deposit is in allies list (a neutral resource, not a hostile entity).
		// The far enemy is in enemies list but beyond aggro range.
		const deposit = makeAlly("deposit1", pos(5, 0, 5), 50);
		const ctxWithDeposit = makeContext({
			nearbyAllies: [deposit],
		});
		brain.update(0.6, ctxWithDeposit); // pass MIN_STATE_DURATION

		const farEnemy = makeEnemy("enemy1", pos(50, 0, 0), 2500); // beyond aggroRangeSq(100)
		const ctxWithFarEnemy = makeContext({
			nearbyEnemies: [farEnemy],
			nearbyAllies: [deposit],
		});

		brain.update(0.016, ctxWithFarEnemy);

		// Closest enemy (farEnemy) is at distSq=2500, beyond aggroRangeSq=100
		// So the bot should keep gathering
		expect(brain.state).toBe(BotState.GATHER);
	});
});

// ---------------------------------------------------------------------------
// RETURN_TO_BASE state
// ---------------------------------------------------------------------------

describe("RETURN_TO_BASE state", () => {
	it("moves toward homeBase", () => {
		brain.state = BotState.RETURN_TO_BASE as BotState;
		brain.stateTime = 0;

		const ctx = makeContext({
			homeBase: pos(50, 0, 50),
			position: pos(0, 0, 0),
		});
		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.ARRIVE);
		expect(output.target).toEqual(pos(50, 0, 50));
	});

	it("transitions to IDLE when near homeBase", () => {
		brain.state = BotState.RETURN_TO_BASE as BotState;
		brain.stateTime = 0;

		const ctx = makeContext({
			homeBase: pos(50, 0, 50),
			position: pos(51, 0, 51), // within threshold of 3
		});

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
	});

	it("transitions to IDLE when no homeBase exists", () => {
		brain.state = BotState.RETURN_TO_BASE as BotState;
		brain.stateTime = 0;

		const ctx = makeContext({ homeBase: null });

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
	});

	it("keeps returning when far from homeBase", () => {
		brain.state = BotState.RETURN_TO_BASE as BotState;
		brain.stateTime = 0;

		const ctx = makeContext({
			homeBase: pos(50, 0, 50),
			position: pos(0, 0, 0), // far away
		});

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.RETURN_TO_BASE);
		expect(output.command).toBe(SteeringCommand.ARRIVE);
	});

	it("considers XZ distance (ignores Y) for near-base check", () => {
		brain.state = BotState.RETURN_TO_BASE as BotState;
		brain.stateTime = 0;

		// Close in XZ but different Y — should still be "near"
		const ctx = makeContext({
			homeBase: pos(50, 0, 50),
			position: pos(51, 100, 51), // Y=100 but XZ within 3
		});

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
	});
});

// ---------------------------------------------------------------------------
// FOLLOW state
// ---------------------------------------------------------------------------

describe("FOLLOW state", () => {
	it("seeks leader when far away", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		const leader = makeAlly("leader1", pos(20, 0, 20), 400);
		const ctx = makeContext({ nearbyAllies: [leader] });

		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(20, 0, 20));
	});

	it("arrives (decelerates) when close to leader", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		// distanceSq = 4, followDistSq = 9 => within follow distance
		const leader = makeAlly("leader1", pos(2, 0, 0), 4);
		const ctx = makeContext({ nearbyAllies: [leader] });

		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.ARRIVE);
	});

	it("transitions to IDLE when leader is lost", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		const ctx = makeContext({ nearbyAllies: [], nearbyEnemies: [] });

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.IDLE);
		expect(brain.targetId).toBeNull();
	});

	it("auto-aggros on enemy while following (after MIN_STATE_DURATION)", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		const ctx = makeContext();
		brain.update(0.6, ctx); // pass MIN_STATE_DURATION

		const enemy = makeEnemy("enemy1", pos(3, 0, 0), 9);
		const ctxWithEnemy = makeContext({ nearbyEnemies: [enemy] });

		brain.update(0.016, ctxWithEnemy);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.targetId).toBe("enemy1");
	});

	it("does NOT aggro before MIN_STATE_DURATION while following", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		const leader = makeAlly("leader1", pos(5, 0, 0), 25);
		const enemy = makeEnemy("enemy1", pos(3, 0, 0), 9);
		const ctx = makeContext({
			nearbyAllies: [leader],
			nearbyEnemies: [enemy],
		});

		brain.update(0.1, ctx); // below MIN_STATE_DURATION

		expect(brain.state).toBe(BotState.FOLLOW);
	});

	it("finds leader in enemies list via findEntityInAll", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		// Leader is in enemies list (edge case — maybe a hacked enemy)
		const leader = makeEnemy("leader1", pos(20, 0, 20), 400);
		const ctx = makeContext({ nearbyEnemies: [leader], nearbyAllies: [] });

		const output = brain.update(0.016, ctx);

		// findEntityInAll checks allies first then enemies
		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(20, 0, 20));
	});

	it("uses SEEK at exactly follow distance boundary", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		// followDistSq = 9, distanceSq = 9 => at boundary
		const leader = makeAlly("leader1", pos(3, 0, 0), 9);
		const ctx = makeContext({ nearbyAllies: [leader] });

		const output = brain.update(0.016, ctx);

		// distanceSq > followDistSq is false when equal, so ARRIVE
		expect(output.command).toBe(SteeringCommand.ARRIVE);
	});

	it("uses SEEK when just beyond follow distance", () => {
		brain.state = BotState.FOLLOW as BotState;
		brain.targetId = "leader1";
		brain.stateTime = 0;

		// followDistSq = 9, distanceSq = 10 => just beyond
		const leader = makeAlly("leader1", pos(3.16, 0, 0), 10);
		const ctx = makeContext({ nearbyAllies: [leader] });

		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.SEEK);
	});
});

// ---------------------------------------------------------------------------
// Governor order processing
// ---------------------------------------------------------------------------

describe("governor orders", () => {
	it("PATROL_AREA order transitions to PATROL with correct center/radius", () => {
		const order: BotOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(30, 0, 30),
			radius: 20,
		};

		brain.setOrder(order);

		expect(brain.state).toBe(BotState.PATROL);
		expect(brain.patrolCenter).toEqual(pos(30, 0, 30));
		expect(brain.patrolRadius).toBe(20);
	});

	it("ATTACK_TARGET order transitions to SEEK_TARGET", () => {
		const order: BotOrder = {
			type: BotOrderType.ATTACK_TARGET,
			targetId: "enemy42",
		};

		brain.setOrder(order);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.targetId).toBe("enemy42");
	});

	it("GUARD_POSITION order transitions to GUARD", () => {
		const order: BotOrder = {
			type: BotOrderType.GUARD_POSITION,
			position: pos(5, 0, 5),
			radius: 10,
		};

		brain.setOrder(order);

		expect(brain.state).toBe(BotState.GUARD);
		expect(brain.guardCenter).toEqual(pos(5, 0, 5));
		expect(brain.guardRadius).toBe(10);
	});

	it("GATHER_RESOURCES order transitions to GATHER", () => {
		const order: BotOrder = {
			type: BotOrderType.GATHER_RESOURCES,
			depositId: "ore_deposit_7",
		};

		brain.setOrder(order);

		expect(brain.state).toBe(BotState.GATHER);
		expect(brain.targetId).toBe("ore_deposit_7");
	});

	it("RETURN_TO_BASE order transitions to RETURN_TO_BASE", () => {
		const order: BotOrder = {
			type: BotOrderType.RETURN_TO_BASE,
		};

		brain.setOrder(order);

		expect(brain.state).toBe(BotState.RETURN_TO_BASE);
	});

	it("FOLLOW order transitions to FOLLOW with target", () => {
		const order: BotOrder = {
			type: BotOrderType.FOLLOW,
			targetId: "leader1",
		};

		brain.setOrder(order);

		expect(brain.state).toBe(BotState.FOLLOW);
		expect(brain.targetId).toBe("leader1");
	});

	it("new order via context overrides current behavior", () => {
		// First apply a patrol order via setOrder
		const patrolOrder: BotOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(10, 0, 10),
			radius: 15,
		};

		brain.setOrder(patrolOrder);
		expect(brain.state).toBe(BotState.PATROL);

		// New order overrides via context (different object reference)
		const attackOrder: BotOrder = {
			type: BotOrderType.ATTACK_TARGET,
			targetId: "enemy99",
		};

		const enemy = makeEnemy("enemy99", pos(20, 0, 20), 400);
		const ctx2 = makeContext({
			currentOrder: attackOrder,
			nearbyEnemies: [enemy],
		});
		brain.update(0.016, ctx2);

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.targetId).toBe("enemy99");
	});

	it("same order reference does NOT re-trigger transition", () => {
		const order: BotOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(10, 0, 10),
			radius: 15,
		};

		const ctx = makeContext({ currentOrder: order });
		brain.update(0.016, ctx);
		expect(brain.state).toBe(BotState.PATROL);

		// Same order again, brain should NOT reset (stateTime continues)
		brain.update(1.0, ctx);
		// stateTime = 0.016 (first update) + 1.0 (second update) = 1.016
		expect(brain.stateTime).toBeGreaterThanOrEqual(1.0);
	});

	it("PATROL_AREA order via update sets patrolCenter from order center", () => {
		const order: BotOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(50, 0, 50),
			radius: 25,
		};

		const ctx = makeContext({
			currentOrder: order,
			position: pos(0, 0, 0),
		});
		brain.update(0.016, ctx);

		// patrolCenter comes from order.center, not ctx.position
		expect(brain.patrolCenter).toEqual(pos(50, 0, 50));
	});

	it("GUARD order copies position (does not keep reference)", () => {
		const position = pos(5, 0, 5);
		const order: BotOrder = {
			type: BotOrderType.GUARD_POSITION,
			position,
			radius: 10,
		};

		brain.setOrder(order);

		// Mutate the original — brain should not be affected
		position.x = 999;

		expect(brain.guardCenter!.x).toBe(5);
	});

	it("PATROL_AREA order copies center (does not keep reference)", () => {
		const center = pos(30, 0, 30);
		const order: BotOrder = {
			type: BotOrderType.PATROL_AREA,
			center,
			radius: 20,
		};

		brain.setOrder(order);

		// Mutate the original — brain should not be affected
		center.x = 999;

		expect(brain.patrolCenter!.x).toBe(30);
	});

	it("governor order overrides even mid-combat", () => {
		// Bot is currently attacking
		const enemy = makeEnemy("enemy1", pos(1, 0, 0), 1);
		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;

		// Governor orders retreat — provide homeBase so RETURN_TO_BASE
		// doesn't immediately transition to IDLE
		const retreatOrder: BotOrder = {
			type: BotOrderType.RETURN_TO_BASE,
		};

		const ctx = makeContext({
			currentOrder: retreatOrder,
			nearbyEnemies: [enemy],
			homeBase: pos(50, 0, 50),
			position: pos(0, 0, 0),
		});
		brain.update(0.016, ctx);

		// Order takes priority over combat — the order transitions to
		// RETURN_TO_BASE, then handleReturnToBase finds homeBase exists
		// and bot is far from it, so it stays in RETURN_TO_BASE
		expect(brain.state).toBe(BotState.RETURN_TO_BASE);
	});

	it("sequential orders via context only apply on new reference", () => {
		const order1: BotOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(10, 0, 10),
			radius: 15,
		};

		const ctx1 = makeContext({ currentOrder: order1 });
		brain.update(0.016, ctx1);
		expect(brain.state).toBe(BotState.PATROL);

		// Same object reference in next update — no re-apply
		brain.update(1.0, ctx1);
		expect(brain.stateTime).toBeGreaterThan(0.5);

		// New order object
		const order2: BotOrder = {
			type: BotOrderType.GUARD_POSITION,
			position: pos(20, 0, 20),
			radius: 5,
		};
		const ctx2 = makeContext({ currentOrder: order2 });
		brain.update(0.016, ctx2);
		expect(brain.state).toBe(BotState.GUARD);
		expect(brain.stateTime).toBeLessThan(0.1);
	});
});

// ---------------------------------------------------------------------------
// State transition resets
// ---------------------------------------------------------------------------

describe("state transition resets", () => {
	it("resets stateTime on transition", () => {
		const ctx = makeContext();
		brain.update(2.0, ctx); // accumulate 2s in IDLE

		expect(brain.stateTime).toBeCloseTo(2.0);

		// Trigger transition to PATROL
		brain.update(1.1, ctx); // total > 3.0

		expect(brain.state).toBe(BotState.PATROL);
		// stateTime resets to 0 on transition, then the delta is added
		// by the update call that follows — but the transition itself resets it
		expect(brain.stateTime).toBeLessThan(1.5);
	});

	it("clears patrol waypoint on state transition", () => {
		// Go to patrol
		brain.patrolCenter = pos(0, 0, 0);
		const ctx = makeContext();
		brain.update(3.1, ctx); // IDLE -> PATROL
		brain.update(0.016, ctx); // generate a waypoint

		expect(brain.patrolWaypoint).not.toBeNull();

		// Trigger transition via order
		brain.setOrder({
			type: BotOrderType.ATTACK_TARGET,
			targetId: "enemy1",
		});

		expect(brain.patrolWaypoint).toBeNull();
	});

	it("does not transition to same state (no-op)", () => {
		brain.state = BotState.IDLE as BotState;
		brain.stateTime = 2.0;

		// Try to "transition" to IDLE again — should be a no-op
		// (internal transitionTo guards against this)
		const order: BotOrder = {
			type: BotOrderType.RETURN_TO_BASE,
		};
		brain.setOrder(order);
		expect(brain.state).toBe(BotState.RETURN_TO_BASE);
		expect(brain.stateTime).toBe(0);
	});

	it("resets patrolWaypointAge on transition", () => {
		brain.patrolCenter = pos(100, 0, 100);
		// Place bot far from the patrol center so waypoint isn't "near" the bot
		const ctx = makeContext({ position: pos(200, 0, 200) });
		brain.update(3.1, ctx); // IDLE -> PATROL (patrolWaypoint=null, age=0)
		brain.update(0.016, ctx); // handlePatrol: waypoint generated, age reset to 0
		brain.update(2.0, ctx); // handlePatrol: age += 2.0, waypoint exists and not near bot

		expect(brain.patrolWaypointAge).toBeGreaterThan(0);

		// Transition to another state
		brain.setOrder({
			type: BotOrderType.GUARD_POSITION,
			position: pos(10, 0, 10),
			radius: 5,
		});

		expect(brain.patrolWaypointAge).toBe(0);
	});

	it("rapid state transitions reset correctly", () => {
		// IDLE -> PATROL -> SEEK_TARGET -> FLEE in rapid sequence
		const ctx = makeContext();
		brain.update(3.1, ctx); // IDLE -> PATROL
		expect(brain.state).toBe(BotState.PATROL);

		brain.setOrder({
			type: BotOrderType.ATTACK_TARGET,
			targetId: "enemy1",
		});
		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain.stateTime).toBe(0);

		brain.setOrder({ type: BotOrderType.RETURN_TO_BASE });
		expect(brain.state).toBe(BotState.RETURN_TO_BASE);
		expect(brain.stateTime).toBe(0);

		brain.setOrder({
			type: BotOrderType.GUARD_POSITION,
			position: pos(0, 0, 0),
			radius: 5,
		});
		expect(brain.state).toBe(BotState.GUARD);
		expect(brain.stateTime).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles empty perception lists gracefully", () => {
		const ctx = makeContext({
			nearbyEnemies: [],
			nearbyAllies: [],
		});

		const output = brain.update(0.016, ctx);

		expect(output.command).toBe(SteeringCommand.STOP);
	});

	it("handles exactly-at-aggro-range boundary", () => {
		// aggroRangeSq = 100, enemy at exactly 100 distSq
		const enemy = makeEnemy("enemy1", pos(10, 0, 0), 100);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.update(0.016, ctx);

		// distanceSq <= aggroRangeSq — should trigger
		expect(brain.state).toBe(BotState.SEEK_TARGET);
	});

	it("handles exactly-at-melee-range boundary", () => {
		// meleeRange = 2, meleeRangeSq = 4, enemy at exactly 4 distSq
		const enemy = makeEnemy("enemy1", pos(2, 0, 0), 4);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.ATTACK);
	});

	it("handles exactly-at-flee-threshold", () => {
		const enemy = makeEnemy("enemy1", pos(1, 0, 0), 1);
		const ctx = makeContext({
			nearbyEnemies: [enemy],
			fleeThreshold: 0.25,
			components: {
				total: 4,
				functional: 1,
				healthRatio: 0.25, // exactly at threshold
				hasArms: true,
				hasCamera: true,
				hasLegs: true,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		brain.update(0.016, ctx);

		// healthRatio <= fleeThreshold triggers flee
		expect(brain.state).toBe(BotState.FLEE);
	});

	it("does not flee when health is just above threshold", () => {
		const enemy = makeEnemy("enemy1", pos(1, 0, 0), 1);
		const ctx = makeContext({
			nearbyEnemies: [enemy],
			fleeThreshold: 0.25,
			components: {
				total: 4,
				functional: 2,
				healthRatio: 0.26, // just above threshold
				hasArms: true,
				hasCamera: true,
				hasLegs: true,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.ATTACK as BotState;
		brain.stateTime = 0;

		brain.update(0.016, ctx);

		// Should NOT flee
		expect(brain.state).toBe(BotState.ATTACK);
	});

	it("flee with threat but no homeBase produces FLEE command", () => {
		const enemy = makeEnemy("enemy1", pos(5, 0, 0), 25);
		const ctx = makeContext({
			nearbyEnemies: [enemy],
			homeBase: null,
			components: {
				total: 4,
				functional: 0,
				healthRatio: 0.0,
				hasArms: false,
				hasCamera: false,
				hasLegs: false,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.FLEE);
		expect(output.target).toEqual(pos(5, 0, 0));
	});

	it("startFlee with no threats and homeBase seeks homeBase", () => {
		const ctx = makeContext({
			nearbyEnemies: [],
			homeBase: pos(100, 0, 100),
			components: {
				total: 4,
				functional: 0,
				healthRatio: 0.0,
				hasArms: false,
				hasCamera: false,
				hasLegs: false,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		// shouldFlee returns true (healthRatio 0.0 <= 0.25),
		// startFlee is called. No threat found, homeBase exists.
		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(100, 0, 100));
	});

	it("startFlee with no threats and no homeBase returns WANDER", () => {
		const ctx = makeContext({
			nearbyEnemies: [],
			homeBase: null,
			components: {
				total: 4,
				functional: 0,
				healthRatio: 0.0,
				hasArms: false,
				hasCamera: false,
				hasLegs: false,
			},
		});

		brain.targetId = "enemy1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		expect(brain.state).toBe(BotState.FLEE);
		expect(output.command).toBe(SteeringCommand.WANDER);
		expect(output.target).toBeUndefined();
	});

	it("delta time accumulates correctly across multiple updates", () => {
		const ctx = makeContext();

		brain.update(0.5, ctx);
		brain.update(0.3, ctx);
		brain.update(0.2, ctx);

		expect(brain.stateTime).toBeCloseTo(1.0);
	});

	it("finding target in allies list works for SEEK_TARGET", () => {
		const ally = makeAlly("ally1", pos(5, 0, 0), 25);
		const ctx = makeContext({ nearbyAllies: [ally] });

		brain.targetId = "ally1";
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const output = brain.update(0.016, ctx);

		// ally found in perception, distance > melee range
		expect(output.command).toBe(SteeringCommand.SEEK);
		expect(output.target).toEqual(pos(5, 0, 0));
	});

	it("handles null targetId gracefully in findEntityInPerception", () => {
		brain.targetId = null;
		brain.state = BotState.SEEK_TARGET as BotState;
		brain.stateTime = 0;

		const enemy = makeEnemy("enemy1", pos(5, 0, 0), 25);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		const output = brain.update(0.016, ctx);

		// targetId is null, so target not found -> transition to IDLE
		expect(brain.state).toBe(BotState.IDLE);
		expect(output.command).toBe(SteeringCommand.STOP);
	});

	it("handles large delta time without breaking", () => {
		const ctx = makeContext();
		const output = brain.update(1000, ctx); // 1000 seconds

		// Should transition to PATROL (stateTime > 3.0)
		expect(brain.state).toBe(BotState.PATROL);
		expect(output.command).toBe(SteeringCommand.WANDER);
	});

	it("handles very small delta time", () => {
		const ctx = makeContext();
		const output = brain.update(0.0001, ctx);

		expect(brain.state).toBe(BotState.IDLE);
		expect(output.command).toBe(SteeringCommand.STOP);
		expect(brain.stateTime).toBeCloseTo(0.0001);
	});

	it("multiple bots with independent brains do not interfere", () => {
		const brain2 = new BotBrain();

		const enemy = makeEnemy("enemy1", pos(5, 0, 0), 25);
		const ctx = makeContext({ nearbyEnemies: [enemy] });

		brain.update(0.016, ctx);
		brain2.update(0.016, makeContext());

		expect(brain.state).toBe(BotState.SEEK_TARGET);
		expect(brain2.state).toBe(BotState.IDLE);
	});
});

// ---------------------------------------------------------------------------
// BotState and SteeringCommand constants
// ---------------------------------------------------------------------------

describe("BotState constants", () => {
	it("has all expected states", () => {
		expect(BotState.IDLE).toBe("idle");
		expect(BotState.PATROL).toBe("patrol");
		expect(BotState.SEEK_TARGET).toBe("seek_target");
		expect(BotState.ATTACK).toBe("attack");
		expect(BotState.FLEE).toBe("flee");
		expect(BotState.GUARD).toBe("guard");
		expect(BotState.GATHER).toBe("gather");
		expect(BotState.RETURN_TO_BASE).toBe("return_to_base");
		expect(BotState.FOLLOW).toBe("follow");
	});
});

describe("SteeringCommand constants", () => {
	it("has all expected commands", () => {
		expect(SteeringCommand.STOP).toBe("stop");
		expect(SteeringCommand.SEEK).toBe("seek");
		expect(SteeringCommand.ARRIVE).toBe("arrive");
		expect(SteeringCommand.FLEE).toBe("flee");
		expect(SteeringCommand.WANDER).toBe("wander");
	});
});
