/**
 * Camera package — unit tests.
 *
 * SphereOrbitCamera is the active camera (R3F component, can't run in JSDOM).
 * We test the CameraControls type contract here.
 */

import { describe, expect, it } from "vitest";
import type { CameraControls } from "../types";

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

// ── Public API exports ────────────────────────────────────────────────────────

describe("src/camera index exports", () => {
	it("re-exports SphereOrbitCamera", async () => {
		const mod = await import("../index");
		expect(typeof mod.SphereOrbitCamera).toBe("function");
	});

	it("does NOT export IsometricCamera (deleted)", async () => {
		const mod = await import("../index");
		expect((mod as Record<string, unknown>).IsometricCamera).toBeUndefined();
	});
});
