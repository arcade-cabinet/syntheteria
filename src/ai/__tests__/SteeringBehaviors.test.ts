/**
 * Unit tests for SteeringBehaviors — behavior factory and activation helpers.
 *
 * Tests cover:
 * - attachBehaviors: creates correct behavior suite with proper defaults
 * - activateSeek: enables seek behavior with target, deactivates others
 * - activateFlee: enables flee behavior with threat position
 * - activateArrive: enables arrive with target and optional deceleration
 * - activateWander: enables wander behavior
 * - stopAll: deactivates all high-level behaviors
 * - Obstacle avoidance and separation remain active throughout
 */

import { Vehicle } from "yuka";
import {
	attachBehaviors,
	activateSeek,
	activateFlee,
	activateArrive,
	activateWander,
	stopAll,
	type BotBehaviors,
} from "../SteeringBehaviors.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVehicle(): Vehicle {
	return new Vehicle();
}

function countSteeringBehaviors(vehicle: Vehicle): number {
	const sm = vehicle.steering as unknown as { behaviors: unknown[] };
	return sm.behaviors?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let vehicle: Vehicle;
let behaviors: BotBehaviors;

beforeEach(() => {
	vehicle = makeVehicle();
	behaviors = attachBehaviors(vehicle);
});

// ---------------------------------------------------------------------------
// attachBehaviors
// ---------------------------------------------------------------------------

describe("attachBehaviors", () => {
	it("returns an object with all six behavior handles", () => {
		expect(behaviors.seek).toBeDefined();
		expect(behaviors.flee).toBeDefined();
		expect(behaviors.arrive).toBeDefined();
		expect(behaviors.wander).toBeDefined();
		expect(behaviors.obstacleAvoidance).toBeDefined();
		expect(behaviors.separation).toBeDefined();
	});

	it("adds six behaviors to the vehicle steering manager", () => {
		expect(countSteeringBehaviors(vehicle)).toBe(6);
	});

	it("starts seek, flee, arrive, and wander as inactive", () => {
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("starts obstacleAvoidance and separation as active", () => {
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});

	it("sets correct weights on behaviors", () => {
		expect(behaviors.seek.weight).toBe(1);
		expect(behaviors.flee.weight).toBe(1);
		expect(behaviors.arrive.weight).toBe(1);
		expect(behaviors.wander.weight).toBe(0.5);
		expect(behaviors.obstacleAvoidance.weight).toBe(3);
		expect(behaviors.separation.weight).toBe(1.5);
	});

	it("sets arrive tolerance to 0.5", () => {
		expect(behaviors.arrive.tolerance).toBe(0.5);
	});

	it("accepts optional obstacles array", () => {
		const v = makeVehicle();
		const b = attachBehaviors(v, []);
		expect(b.obstacleAvoidance).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// activateSeek
// ---------------------------------------------------------------------------

describe("activateSeek", () => {
	it("activates seek behavior", () => {
		activateSeek(behaviors, { x: 10, y: 0, z: 20 });
		expect(behaviors.seek.active).toBe(true);
	});

	it("sets seek target to provided position", () => {
		activateSeek(behaviors, { x: 10, y: 5, z: 20 });
		expect(behaviors.seek.target.x).toBeCloseTo(10);
		expect(behaviors.seek.target.y).toBeCloseTo(5);
		expect(behaviors.seek.target.z).toBeCloseTo(20);
	});

	it("deactivates flee, arrive, and wander", () => {
		// First enable others
		behaviors.flee.active = true;
		behaviors.arrive.active = true;
		behaviors.wander.active = true;

		activateSeek(behaviors, { x: 1, y: 0, z: 1 });

		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("leaves obstacleAvoidance and separation active", () => {
		activateSeek(behaviors, { x: 1, y: 0, z: 1 });
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// activateFlee
// ---------------------------------------------------------------------------

describe("activateFlee", () => {
	it("activates flee behavior", () => {
		activateFlee(behaviors, { x: 5, y: 0, z: 5 });
		expect(behaviors.flee.active).toBe(true);
	});

	it("sets flee target to threat position", () => {
		activateFlee(behaviors, { x: -3, y: 1, z: 7 });
		expect(behaviors.flee.target.x).toBeCloseTo(-3);
		expect(behaviors.flee.target.y).toBeCloseTo(1);
		expect(behaviors.flee.target.z).toBeCloseTo(7);
	});

	it("deactivates seek, arrive, and wander", () => {
		behaviors.seek.active = true;
		behaviors.arrive.active = true;
		behaviors.wander.active = true;

		activateFlee(behaviors, { x: 0, y: 0, z: 0 });

		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("leaves obstacleAvoidance and separation active", () => {
		activateFlee(behaviors, { x: 0, y: 0, z: 0 });
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// activateArrive
// ---------------------------------------------------------------------------

describe("activateArrive", () => {
	it("activates arrive behavior", () => {
		activateArrive(behaviors, { x: 10, y: 0, z: 10 });
		expect(behaviors.arrive.active).toBe(true);
	});

	it("sets arrive target to provided position", () => {
		activateArrive(behaviors, { x: 15, y: 2, z: 25 });
		expect(behaviors.arrive.target.x).toBeCloseTo(15);
		expect(behaviors.arrive.target.y).toBeCloseTo(2);
		expect(behaviors.arrive.target.z).toBeCloseTo(25);
	});

	it("deactivates seek, flee, and wander", () => {
		behaviors.seek.active = true;
		behaviors.flee.active = true;
		behaviors.wander.active = true;

		activateArrive(behaviors, { x: 0, y: 0, z: 0 });

		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("sets custom deceleration when provided", () => {
		activateArrive(behaviors, { x: 0, y: 0, z: 0 }, 5);
		expect(behaviors.arrive.deceleration).toBe(5);
	});

	it("does not change deceleration when not provided", () => {
		const originalDeceleration = behaviors.arrive.deceleration;
		activateArrive(behaviors, { x: 0, y: 0, z: 0 });
		expect(behaviors.arrive.deceleration).toBe(originalDeceleration);
	});

	it("leaves obstacleAvoidance and separation active", () => {
		activateArrive(behaviors, { x: 0, y: 0, z: 0 });
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// activateWander
// ---------------------------------------------------------------------------

describe("activateWander", () => {
	it("activates wander behavior", () => {
		activateWander(behaviors);
		expect(behaviors.wander.active).toBe(true);
	});

	it("deactivates seek, flee, and arrive", () => {
		behaviors.seek.active = true;
		behaviors.flee.active = true;
		behaviors.arrive.active = true;

		activateWander(behaviors);

		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
	});

	it("leaves obstacleAvoidance and separation active", () => {
		activateWander(behaviors);
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// stopAll
// ---------------------------------------------------------------------------

describe("stopAll", () => {
	it("deactivates all high-level behaviors", () => {
		// Activate everything first
		behaviors.seek.active = true;
		behaviors.flee.active = true;
		behaviors.arrive.active = true;
		behaviors.wander.active = true;

		stopAll(behaviors);

		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});

	it("leaves obstacleAvoidance and separation active", () => {
		stopAll(behaviors);
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Sequential behavior switching
// ---------------------------------------------------------------------------

describe("behavior switching", () => {
	it("switching from seek to flee deactivates seek", () => {
		activateSeek(behaviors, { x: 10, y: 0, z: 10 });
		expect(behaviors.seek.active).toBe(true);

		activateFlee(behaviors, { x: 5, y: 0, z: 5 });
		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.flee.active).toBe(true);
	});

	it("switching from wander to arrive deactivates wander", () => {
		activateWander(behaviors);
		expect(behaviors.wander.active).toBe(true);

		activateArrive(behaviors, { x: 20, y: 0, z: 20 });
		expect(behaviors.wander.active).toBe(false);
		expect(behaviors.arrive.active).toBe(true);
	});

	it("stopAll after seek leaves only always-on behaviors", () => {
		activateSeek(behaviors, { x: 10, y: 0, z: 10 });
		stopAll(behaviors);

		expect(behaviors.seek.active).toBe(false);
		expect(behaviors.obstacleAvoidance.active).toBe(true);
		expect(behaviors.separation.active).toBe(true);
	});

	it("rapid switching preserves only the last activated behavior", () => {
		activateSeek(behaviors, { x: 1, y: 0, z: 1 });
		activateFlee(behaviors, { x: 2, y: 0, z: 2 });
		activateArrive(behaviors, { x: 3, y: 0, z: 3 });
		activateWander(behaviors);
		activateSeek(behaviors, { x: 4, y: 0, z: 4 });

		expect(behaviors.seek.active).toBe(true);
		expect(behaviors.flee.active).toBe(false);
		expect(behaviors.arrive.active).toBe(false);
		expect(behaviors.wander.active).toBe(false);
	});
});
