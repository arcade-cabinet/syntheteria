/**
 * UnitTaskQueue — multi-step compound tasks for AI units.
 *
 * Inspired by Yuka's TaskQueue but adapted for turn-based operation:
 * - Each unit can have at most one active task queue
 * - Each turn, the current step executes
 * - When a step completes, the queue advances to the next step
 * - While a queue has remaining steps, GOAP re-evaluation is skipped
 * - If a step fails (e.g., blocked path), the queue is aborted
 *
 * Common compound tasks:
 * - Worker: move to salvage → harvest → move to base
 * - Scout: move to frontier A → move to frontier B → move to frontier C
 */

import type { DecidedAction } from "../agents/SyntheteriaAgent";

// ---------------------------------------------------------------------------
// Task step types
// ---------------------------------------------------------------------------

export type TaskStepType = "move" | "harvest" | "build" | "mine" | "idle";

export interface TaskStep {
	type: TaskStepType;
	/** Target tile for move/harvest/build/mine. */
	targetX: number;
	targetZ: number;
	/** For harvest: deposit entity ID. */
	depositEntityId?: number;
	/** For build: building type to place. */
	buildingType?: string;
	/** Max turns to attempt this step before giving up. */
	maxTurns: number;
	/** Turns spent on this step so far. */
	turnsElapsed: number;
}

// ---------------------------------------------------------------------------
// Task Queue
// ---------------------------------------------------------------------------

export class UnitTaskQueue {
	readonly steps: TaskStep[];
	currentIndex = 0;
	/** True if the queue was aborted due to failure. */
	aborted = false;

	constructor(steps: TaskStep[]) {
		this.steps = steps;
	}

	/** Whether the queue has been fully completed or aborted. */
	get done(): boolean {
		return this.aborted || this.currentIndex >= this.steps.length;
	}

	/** Get the current step, or null if done. */
	currentStep(): TaskStep | null {
		if (this.done) return null;
		return this.steps[this.currentIndex];
	}

	/** Advance to the next step. */
	advance(): void {
		this.currentIndex++;
	}

	/** Abort the queue (step failed, obstacle, etc). */
	abort(): void {
		this.aborted = true;
	}

	/**
	 * Produce the DecidedAction for the current step.
	 * Returns null if the queue is done.
	 */
	getAction(unitX: number, unitZ: number): DecidedAction | null {
		const step = this.currentStep();
		if (!step) return null;

		step.turnsElapsed++;

		// Timeout — step took too long
		if (step.turnsElapsed > step.maxTurns) {
			this.abort();
			return null;
		}

		const atTarget =
			Math.abs(unitX - step.targetX) + Math.abs(unitZ - step.targetZ) <= 1;

		switch (step.type) {
			case "move":
				if (atTarget) {
					this.advance();
					// Immediately try next step
					return this.getAction(unitX, unitZ);
				}
				return { type: "move", toX: step.targetX, toZ: step.targetZ };

			case "harvest":
				if (!atTarget) {
					return { type: "move", toX: step.targetX, toZ: step.targetZ };
				}
				// At target — harvest and advance
				this.advance();
				return {
					type: "harvest",
					depositEntityId: step.depositEntityId ?? 0,
					targetX: step.targetX,
					targetZ: step.targetZ,
				};

			case "build":
				if (!atTarget) {
					return { type: "move", toX: step.targetX, toZ: step.targetZ };
				}
				this.advance();
				return {
					type: "build",
					buildingType: step.buildingType ?? "storage_hub",
					tileX: step.targetX,
					tileZ: step.targetZ,
				};

			case "mine":
				if (!atTarget) {
					return { type: "move", toX: step.targetX, toZ: step.targetZ };
				}
				this.advance();
				return {
					type: "mine",
					targetX: step.targetX,
					targetZ: step.targetZ,
				};

			case "idle":
				this.advance();
				return { type: "idle" };

			default:
				return null;
		}
	}
}

// ---------------------------------------------------------------------------
// Compound task factories
// ---------------------------------------------------------------------------

/**
 * Worker compound task: move to deposit → harvest → move back to base.
 */
export function createHarvestAndReturnTask(
	depositX: number,
	depositZ: number,
	depositEntityId: number,
	baseX: number,
	baseZ: number,
): UnitTaskQueue {
	return new UnitTaskQueue([
		{
			type: "move",
			targetX: depositX,
			targetZ: depositZ,
			maxTurns: 15,
			turnsElapsed: 0,
		},
		{
			type: "harvest",
			targetX: depositX,
			targetZ: depositZ,
			depositEntityId,
			maxTurns: 3,
			turnsElapsed: 0,
		},
		{
			type: "move",
			targetX: baseX,
			targetZ: baseZ,
			maxTurns: 15,
			turnsElapsed: 0,
		},
	]);
}

/**
 * Scout compound task: patrol a list of frontier waypoints.
 */
export function createScoutPatrolTask(
	waypoints: Array<{ x: number; z: number }>,
): UnitTaskQueue {
	return new UnitTaskQueue(
		waypoints.map((wp) => ({
			type: "move" as const,
			targetX: wp.x,
			targetZ: wp.z,
			maxTurns: 12,
			turnsElapsed: 0,
		})),
	);
}

// ---------------------------------------------------------------------------
// Unit task queue registry — persists across turns
// ---------------------------------------------------------------------------

const _unitQueues = new Map<number, UnitTaskQueue>();

export function getUnitTaskQueue(entityId: number): UnitTaskQueue | null {
	const q = _unitQueues.get(entityId);
	if (!q || q.done) {
		_unitQueues.delete(entityId);
		return null;
	}
	return q;
}

export function setUnitTaskQueue(entityId: number, queue: UnitTaskQueue): void {
	_unitQueues.set(entityId, queue);
}

export function clearUnitTaskQueue(entityId: number): void {
	_unitQueues.delete(entityId);
}

export function resetAllTaskQueues(): void {
	_unitQueues.clear();
}
