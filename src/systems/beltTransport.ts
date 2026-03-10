/**
 * Belt transport system — physical MaterialCube entities ride along conveyor belts.
 *
 * Cubes are placed at a belt's input end and move toward the output end at
 * the configured belt speed. While on a belt, cubes are in kinematic mode
 * (physics-driven position). When they reach the output end they are either
 * fed into a connected machine hopper (via beltRouting) or ejected back to
 * dynamic mode so they tumble onto the ground.
 *
 * Module-level state pattern (same as fabrication.ts, resources.ts, etc.).
 * Tunables sourced from config/processing.json.
 */

import { config } from "../../config";
import { getConnectedOutput, type BeltConnection } from "./beltRouting";

// ---------------------------------------------------------------------------
// Config — values from config/processing.json
// ---------------------------------------------------------------------------

const BELT_SPEED = config.processing.belt.speed;
const CUBE_SPACING = config.processing.belt.cubeSpacing;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BodyType = "kinematic" | "dynamic";

export interface CubeOnBelt {
	cubeId: string;
	/** 0 = input end, 1 = output end (normalised progress along belt) */
	progress: number;
	bodyType: BodyType;
}

export interface Belt {
	beltId: string;
	/** Total length of the belt in world units */
	length: number;
	/** Cubes currently riding on this belt, sorted by progress ascending */
	cubes: CubeOnBelt[];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const belts: Map<string, Belt> = new Map();

// ---------------------------------------------------------------------------
// Lifecycle helpers (for tests and hot-reload)
// ---------------------------------------------------------------------------

/** Reset all belt state. Intended for tests. */
export function resetBelts(): void {
	belts.clear();
}

/** Register a belt so the transport system knows about it. */
export function registerBelt(beltId: string, length: number): void {
	if (belts.has(beltId)) return;
	belts.set(beltId, { beltId, length, cubes: [] });
}

/** Unregister a belt (e.g. when deconstructed). Ejects all cubes. */
export function unregisterBelt(beltId: string): void {
	belts.delete(beltId);
}

export function getBelt(beltId: string): Belt | undefined {
	return belts.get(beltId);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Place a cube at the input end of a belt (progress = 0).
 * Returns false if the belt is at capacity or the cube is already on it.
 */
export function addCubeToBelt(cubeId: string, beltId: string): boolean {
	const belt = belts.get(beltId);
	if (!belt) return false;

	if (belt.cubes.some((c) => c.cubeId === cubeId)) return false;

	const maxCubes = Math.max(1, Math.floor(belt.length / CUBE_SPACING));
	if (belt.cubes.length >= maxCubes) return false;

	if (belt.cubes.length > 0) {
		const firstCubeWorldPos = belt.cubes[0].progress * belt.length;
		if (firstCubeWorldPos < CUBE_SPACING) return false;
	}

	belt.cubes.unshift({
		cubeId,
		progress: 0,
		bodyType: "kinematic",
	});

	return true;
}

/**
 * Manually remove a cube from whatever belt it's on (e.g. player grabs it).
 * Returns true if found and removed.
 */
export function removeCubeFromBelt(cubeId: string): boolean {
	for (const belt of belts.values()) {
		const idx = belt.cubes.findIndex((c) => c.cubeId === cubeId);
		if (idx !== -1) {
			belt.cubes.splice(idx, 1);
			return true;
		}
	}
	return false;
}

/**
 * Query the cubes currently riding a belt and their absolute positions
 * (as a fraction 0..1 along the belt).
 */
export function getBeltContents(
	beltId: string,
): { cubeId: string; progress: number }[] {
	const belt = belts.get(beltId);
	if (!belt) return [];
	return belt.cubes.map((c) => ({ cubeId: c.cubeId, progress: c.progress }));
}

// ---------------------------------------------------------------------------
// Callbacks (set by beltRouting or game wiring)
// ---------------------------------------------------------------------------

/** Called when a cube reaches the belt output and there's a connected machine. */
export type OnCubeDelivered = (
	cubeId: string,
	connection: BeltConnection,
) => void;

/** Called when a cube is ejected from a belt end (no connection). */
export type OnCubeEjected = (cubeId: string, beltId: string) => void;

let onDelivered: OnCubeDelivered | null = null;
let onEjected: OnCubeEjected | null = null;

export function setOnCubeDelivered(cb: OnCubeDelivered | null): void {
	onDelivered = cb;
}

export function setOnCubeEjected(cb: OnCubeEjected | null): void {
	onEjected = cb;
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

/** Cubes that were ejected/delivered during the last update (for external reading). */
let lastEjected: { cubeId: string; beltId: string }[] = [];
let lastDelivered: { cubeId: string; beltId: string }[] = [];

export function getLastEjected(): { cubeId: string; beltId: string }[] {
	return lastEjected;
}
export function getLastDelivered(): { cubeId: string; beltId: string }[] {
	return lastDelivered;
}

/**
 * Advance all cubes on all belts. Call once per frame with frame delta (seconds).
 */
export function updateBeltTransport(delta: number): void {
	const ejected: { cubeId: string; beltId: string }[] = [];
	const delivered: { cubeId: string; beltId: string }[] = [];

	for (const belt of belts.values()) {
		if (belt.cubes.length === 0) continue;

		const progressStep = (BELT_SPEED * delta) / belt.length;

		for (let i = belt.cubes.length - 1; i >= 0; i--) {
			const cube = belt.cubes[i];

			let newProgress = cube.progress + progressStep;

			if (i < belt.cubes.length - 1) {
				const ahead = belt.cubes[i + 1];
				const maxProgress = ahead.progress - CUBE_SPACING / belt.length;
				if (newProgress > maxProgress) {
					newProgress = maxProgress;
				}
			}

			if (newProgress > 1) newProgress = 1;
			if (newProgress < 0) newProgress = 0;

			cube.progress = newProgress;
		}

		const last = belt.cubes[belt.cubes.length - 1];
		if (last && last.progress >= 1) {
			const connection = getConnectedOutput(belt.beltId);

			if (connection && connection.type === "belt") {
				const accepted = addCubeToBelt(last.cubeId, connection.targetId);
				if (accepted) {
					belt.cubes.pop();
					delivered.push({ cubeId: last.cubeId, beltId: belt.beltId });
				}
			} else if (connection && connection.type === "machine") {
				belt.cubes.pop();
				delivered.push({ cubeId: last.cubeId, beltId: belt.beltId });
				if (onDelivered) {
					onDelivered(last.cubeId, connection);
				}
			} else {
				last.bodyType = "dynamic";
				belt.cubes.pop();
				ejected.push({ cubeId: last.cubeId, beltId: belt.beltId });
				if (onEjected) {
					onEjected(last.cubeId, belt.beltId);
				}
			}
		}
	}

	lastEjected = ejected;
	lastDelivered = delivered;
}
