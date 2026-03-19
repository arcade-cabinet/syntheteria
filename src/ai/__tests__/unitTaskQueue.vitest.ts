/**
 * UnitTaskQueue tests — verifies compound task sequencing.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	UnitTaskQueue,
	createHarvestAndReturnTask,
	createScoutPatrolTask,
	getUnitTaskQueue,
	setUnitTaskQueue,
	clearUnitTaskQueue,
	resetAllTaskQueues,
} from "../tasks/UnitTaskQueue";

describe("UnitTaskQueue", () => {
	it("starts not done with index 0", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		expect(q.done).toBe(false);
		expect(q.currentIndex).toBe(0);
	});

	it("produces move action when not at target", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		const action = q.getAction(0, 0);
		expect(action).toEqual({ type: "move", toX: 5, toZ: 5 });
	});

	it("auto-advances move step when at target", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
			{ type: "move", targetX: 10, targetZ: 10, maxTurns: 10, turnsElapsed: 0 },
		]);
		// At target (manhattan dist <= 1)
		const action = q.getAction(5, 5);
		// Should auto-advance to next step
		expect(action).toEqual({ type: "move", toX: 10, toZ: 10 });
		expect(q.currentIndex).toBe(1);
	});

	it("completes when all steps done", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		const action = q.getAction(5, 5);
		expect(action).toBe(null); // At target, no more steps → null
		expect(q.done).toBe(true);
	});

	it("harvest step moves to target then harvests", () => {
		const q = new UnitTaskQueue([
			{
				type: "harvest",
				targetX: 5, targetZ: 5,
				depositEntityId: 42,
				maxTurns: 5,
				turnsElapsed: 0,
			},
		]);

		// Not at target yet → move
		const moveAction = q.getAction(0, 0);
		expect(moveAction?.type).toBe("move");

		// At target → harvest and advance
		const harvestAction = q.getAction(5, 5);
		expect(harvestAction).toEqual({
			type: "harvest",
			depositEntityId: 42,
			targetX: 5,
			targetZ: 5,
		});
		expect(q.done).toBe(true);
	});

	it("build step moves to target then builds", () => {
		const q = new UnitTaskQueue([
			{
				type: "build",
				targetX: 3, targetZ: 3,
				buildingType: "storage_hub",
				maxTurns: 5,
				turnsElapsed: 0,
			},
		]);

		const action = q.getAction(3, 3);
		expect(action).toEqual({
			type: "build",
			buildingType: "storage_hub",
			tileX: 3,
			tileZ: 3,
		});
	});

	it("mine step moves to target then mines", () => {
		const q = new UnitTaskQueue([
			{
				type: "mine",
				targetX: 7, targetZ: 7,
				maxTurns: 5,
				turnsElapsed: 0,
			},
		]);

		const action = q.getAction(7, 7);
		expect(action).toEqual({
			type: "mine",
			targetX: 7,
			targetZ: 7,
		});
	});

	it("idle step advances immediately", () => {
		const q = new UnitTaskQueue([
			{ type: "idle", targetX: 0, targetZ: 0, maxTurns: 1, turnsElapsed: 0 },
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		const action = q.getAction(0, 0);
		expect(action).toEqual({ type: "idle" });
		expect(q.currentIndex).toBe(1);
	});

	it("aborts on timeout", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 99, targetZ: 99, maxTurns: 2, turnsElapsed: 0 },
		]);

		q.getAction(0, 0); // turnsElapsed: 1
		q.getAction(0, 0); // turnsElapsed: 2
		const action = q.getAction(0, 0); // turnsElapsed: 3 > maxTurns: 2

		expect(action).toBe(null);
		expect(q.aborted).toBe(true);
		expect(q.done).toBe(true);
	});

	it("abort() stops the queue", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		q.abort();
		expect(q.done).toBe(true);
		expect(q.getAction(0, 0)).toBe(null);
	});
});

describe("compound task factories", () => {
	it("createHarvestAndReturnTask creates 3-step queue", () => {
		const q = createHarvestAndReturnTask(10, 10, 42, 2, 2);
		expect(q.steps).toHaveLength(3);
		expect(q.steps[0].type).toBe("move");
		expect(q.steps[1].type).toBe("harvest");
		expect(q.steps[1].depositEntityId).toBe(42);
		expect(q.steps[2].type).toBe("move");
		expect(q.steps[2].targetX).toBe(2);
	});

	it("createScoutPatrolTask creates move steps for each waypoint", () => {
		const waypoints = [
			{ x: 5, z: 5 },
			{ x: 15, z: 5 },
			{ x: 15, z: 15 },
		];
		const q = createScoutPatrolTask(waypoints);
		expect(q.steps).toHaveLength(3);
		for (let i = 0; i < waypoints.length; i++) {
			expect(q.steps[i].type).toBe("move");
			expect(q.steps[i].targetX).toBe(waypoints[i].x);
			expect(q.steps[i].targetZ).toBe(waypoints[i].z);
		}
	});
});

describe("task queue registry", () => {
	beforeEach(() => {
		resetAllTaskQueues();
	});

	it("returns null for unknown entity", () => {
		expect(getUnitTaskQueue(999)).toBe(null);
	});

	it("stores and retrieves task queue", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		setUnitTaskQueue(42, q);
		expect(getUnitTaskQueue(42)).toBe(q);
	});

	it("returns null for completed queue", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		q.getAction(5, 5); // completes immediately
		setUnitTaskQueue(42, q);
		expect(getUnitTaskQueue(42)).toBe(null);
	});

	it("clearUnitTaskQueue removes queue", () => {
		const q = new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]);
		setUnitTaskQueue(42, q);
		clearUnitTaskQueue(42);
		expect(getUnitTaskQueue(42)).toBe(null);
	});

	it("resetAllTaskQueues clears everything", () => {
		setUnitTaskQueue(1, new UnitTaskQueue([
			{ type: "move", targetX: 5, targetZ: 5, maxTurns: 10, turnsElapsed: 0 },
		]));
		setUnitTaskQueue(2, new UnitTaskQueue([
			{ type: "move", targetX: 10, targetZ: 10, maxTurns: 10, turnsElapsed: 0 },
		]));
		resetAllTaskQueues();
		expect(getUnitTaskQueue(1)).toBe(null);
		expect(getUnitTaskQueue(2)).toBe(null);
	});
});
