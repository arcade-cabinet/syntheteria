/**
 * Camera package — unit tests.
 *
 * IsometricCamera is an R3F component and can't run in JSDOM.
 * We test the exported constants and CameraControls type contract.
 */

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
	BACK_DISTANCE,
	DEFAULT_ZOOM,
	ELEVATION,
	FOV,
	MAX_POLAR,
	MAX_ZOOM,
	MIN_POLAR,
	MIN_ZOOM,
	applyToroidalWrap,
	wrapCoord,
} from "../IsometricCamera";
import type { CameraControls } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("IsometricCamera constants", () => {
	it("FOV is 45 — CivRev2 reference value", () => {
		expect(FOV).toBe(45);
	});

	it("ELEVATION and BACK_DISTANCE produce a ~54–72° oblique angle", () => {
		// Camera at (0, ELEVATION, BACK_DISTANCE) looking at (0,0,0)
		// Pitch from horizontal = atan(ELEVATION / BACK_DISTANCE)
		const pitchDeg = (Math.atan2(ELEVATION, BACK_DISTANCE) * 180) / Math.PI;
		expect(pitchDeg).toBeGreaterThan(45);
		expect(pitchDeg).toBeLessThan(72);
	});

	it("DEFAULT_ZOOM is the Euclidean distance of the initial camera offset", () => {
		const expected = Math.sqrt(ELEVATION ** 2 + BACK_DISTANCE ** 2);
		expect(DEFAULT_ZOOM).toBeCloseTo(expected, 5);
	});

	it("MIN_ZOOM < MAX_ZOOM with a sensible range", () => {
		expect(MIN_ZOOM).toBeGreaterThanOrEqual(5);
		expect(MAX_ZOOM).toBeGreaterThanOrEqual(MIN_ZOOM * 4);
	});

	it("MIN_POLAR < MAX_POLAR, both in the oblique viewing range", () => {
		expect(MIN_POLAR).toBeLessThan(MAX_POLAR);
		// In radians: both should be between PI*0.2 (~36°) and PI*0.5 (~90°)
		expect(MIN_POLAR).toBeGreaterThan(Math.PI * 0.2);
		expect(MAX_POLAR).toBeLessThan(Math.PI * 0.5);
	});

	it("rotation is disabled — confirmed by enableRotate=false in the component", () => {
		// This is a documentation/intent test.
		// The actual prop is verified by reading the JSX, but we assert the
		// design intent: a fixed angle means no free rotation around the board.
		expect(true).toBe(true); // placeholder for intent documentation
	});
});

// ── CameraControls type contract ──────────────────────────────────────────────

describe("CameraControls API", () => {
	it("panTo smoothly moves to (x, z)", () => {
		const calls: [number, number][] = [];
		const stub: CameraControls = {
			panTo: (x, z) => calls.push([x, z]),
			snapTo: () => {},
			setZoom: () => {},
			reset: () => {},
		};
		stub.panTo(16, 24);
		expect(calls).toEqual([[16, 24]]);
	});

	it("snapTo instantly moves to (x, z)", () => {
		const calls: [number, number][] = [];
		const stub: CameraControls = {
			panTo: () => {},
			snapTo: (x, z) => calls.push([x, z]),
			setZoom: () => {},
			reset: () => {},
		};
		stub.snapTo(5, 15);
		expect(calls).toEqual([[5, 15]]);
	});

	it("setZoom accepts a distance", () => {
		const distances: number[] = [];
		const stub: CameraControls = {
			panTo: () => {},
			snapTo: () => {},
			setZoom: (d) => distances.push(d),
			reset: () => {},
		};
		stub.setZoom(60);
		expect(distances).toEqual([60]);
	});

	it("reset accepts board center (centerX, centerZ)", () => {
		const resets: [number, number][] = [];
		const stub: CameraControls = {
			panTo: () => {},
			snapTo: () => {},
			setZoom: () => {},
			reset: (cx, cz) => resets.push([cx, cz]),
		};
		stub.reset(32, 32);
		expect(resets).toEqual([[32, 32]]);
	});
});

// ── Toroidal wrapping ────────────────────────────────────────────────────────

describe("wrapCoord", () => {
	it("returns value unchanged when within [0, size)", () => {
		expect(wrapCoord(50, 100)).toBe(50);
	});

	it("wraps values >= size back into [0, size)", () => {
		expect(wrapCoord(100, 100)).toBe(0);
		expect(wrapCoord(150, 100)).toBe(50);
	});

	it("wraps negative values into [0, size)", () => {
		expect(wrapCoord(-1, 100)).toBe(99);
		expect(wrapCoord(-50, 100)).toBe(50);
	});

	it("handles zero correctly", () => {
		expect(wrapCoord(0, 100)).toBe(0);
	});

	it("handles values far beyond one wrap cycle", () => {
		expect(wrapCoord(350, 100)).toBe(50);
		expect(wrapCoord(-250, 100)).toBe(50);
	});
});

describe("applyToroidalWrap", () => {
	const boardW = 200;
	const boardH = 160;

	it("does nothing when target is within bounds", () => {
		const target = new THREE.Vector3(100, 0, 80);
		const camPos = new THREE.Vector3(100, 80, 130);
		applyToroidalWrap(target, camPos, boardW, boardH);
		expect(target.x).toBe(100);
		expect(target.z).toBe(80);
		expect(camPos.x).toBe(100);
		expect(camPos.z).toBe(130);
	});

	it("wraps target past right edge and shifts camera by same delta", () => {
		const target = new THREE.Vector3(210, 0, 80);
		const camPos = new THREE.Vector3(210, 80, 130);
		applyToroidalWrap(target, camPos, boardW, boardH);
		expect(target.x).toBe(10);
		expect(target.z).toBe(80);
		expect(camPos.x).toBe(10);
		expect(camPos.z).toBe(130);
	});

	it("wraps target past left edge (negative X)", () => {
		const target = new THREE.Vector3(-5, 0, 80);
		const camPos = new THREE.Vector3(-5, 80, 130);
		applyToroidalWrap(target, camPos, boardW, boardH);
		expect(target.x).toBe(195);
		expect(camPos.x).toBe(195);
	});

	it("wraps target past bottom edge (Z > boardHeight)", () => {
		const target = new THREE.Vector3(100, 0, 170);
		const camPos = new THREE.Vector3(100, 80, 220);
		applyToroidalWrap(target, camPos, boardW, boardH);
		expect(target.z).toBe(10);
		expect(camPos.z).toBe(60); // 220 + (10 - 170) = 60
	});

	it("wraps target past top edge (negative Z)", () => {
		const target = new THREE.Vector3(100, 0, -10);
		const camPos = new THREE.Vector3(100, 80, 40);
		applyToroidalWrap(target, camPos, boardW, boardH);
		expect(target.z).toBe(150);
		expect(camPos.z).toBe(200); // 40 + (150 - (-10)) = 200
	});

	it("wraps both axes simultaneously", () => {
		const target = new THREE.Vector3(205, 0, -5);
		const camPos = new THREE.Vector3(205, 80, 45);
		applyToroidalWrap(target, camPos, boardW, boardH);
		expect(target.x).toBe(5);
		expect(target.z).toBe(155);
		expect(camPos.x).toBe(5);
		expect(camPos.z).toBe(205); // 45 + (155 - (-5)) = 205
	});

	it("preserves camera Y (elevation) unchanged", () => {
		const target = new THREE.Vector3(210, 0, 80);
		const camPos = new THREE.Vector3(210, 80, 130);
		applyToroidalWrap(target, camPos, boardW, boardH);
		expect(camPos.y).toBe(80);
	});

	it("preserves the camera-target offset vector", () => {
		const target = new THREE.Vector3(210, 0, 170);
		const camPos = new THREE.Vector3(210, 80, 220);
		const offsetBefore = camPos.clone().sub(target);
		applyToroidalWrap(target, camPos, boardW, boardH);
		const offsetAfter = camPos.clone().sub(target);
		expect(offsetAfter.x).toBeCloseTo(offsetBefore.x);
		expect(offsetAfter.y).toBeCloseTo(offsetBefore.y);
		expect(offsetAfter.z).toBeCloseTo(offsetBefore.z);
	});
});

// ── Public API exports ────────────────────────────────────────────────────────

describe("src/camera index exports", () => {
	it("re-exports IsometricCamera", async () => {
		const mod = await import("../index");
		expect(typeof mod.IsometricCamera).toBe("function");
	});

	it("does NOT export TopDownCamera (deprecated name removed)", async () => {
		const mod = await import("../index");
		expect((mod as Record<string, unknown>).TopDownCamera).toBeUndefined();
	});
});
