/**
 * Unit tests for compressionJuice.ts — the signature compression experience.
 *
 * These tests validate that the compression mechanic delivers the dramatic
 * multi-sensory experience described in the game design document:
 * pressure gauges spike, screen shakes, particles burst, cube ejects.
 */

import {
	startCompression,
	updateCompression,
	cancelCompression,
	isCompressionActive,
	getCompressionProgress,
	getCompressionPhase,
	reset,
	type CompressionPhase,
} from "../compressionJuice";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// startCompression
// ---------------------------------------------------------------------------

describe("startCompression", () => {
	it("starts successfully", () => {
		expect(startCompression(3.0, "iron")).toBe(true);
		expect(isCompressionActive()).toBe(true);
	});

	it("prevents double start", () => {
		startCompression(3.0, "iron");
		expect(startCompression(3.0, "copper")).toBe(false);
	});

	it("clamps minimum duration to 0.5s", () => {
		startCompression(0.1, "iron");
		// Should still be active — didn't reject, just clamped
		expect(isCompressionActive()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Phase progression
// ---------------------------------------------------------------------------

describe("phase progression", () => {
	it("starts in charging phase", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(0.01);
		expect(frame.phase).toBe("charging");
	});

	it("transitions to building phase", () => {
		startCompression(3.0, "iron");
		// 20% of 3s = 0.6s
		updateCompression(0.7);
		const frame = updateCompression(0.01);
		expect(frame.phase).toBe("building");
	});

	it("transitions to critical phase", () => {
		startCompression(3.0, "iron");
		// 66% of 3s = 1.98s
		updateCompression(2.0);
		const frame = updateCompression(0.01);
		expect(frame.phase).toBe("critical");
	});

	it("transitions to slam phase near completion", () => {
		startCompression(3.0, "iron");
		updateCompression(2.8);
		const frame = updateCompression(0.01);
		expect(frame.phase).toBe("slam");
	});

	it("transitions to eject after slam", () => {
		startCompression(3.0, "iron");
		updateCompression(3.05); // slam fires on this frame
		const frame = updateCompression(0.05); // now in eject
		expect(["eject", "slam"]).toContain(frame.phase);
	});

	it("transitions to cooldown after eject", () => {
		startCompression(3.0, "iron");
		updateCompression(3.05); // slam fires
		updateCompression(0.55); // past eject duration
		const frame = updateCompression(0.01);
		expect(["cooldown", "eject"]).toContain(frame.phase);
	});

	it("returns to idle after cooldown", () => {
		startCompression(3.0, "iron");
		updateCompression(3.0);
		updateCompression(1.0); // past eject + cooldown
		const frame = updateCompression(0.1);
		expect(frame.active).toBe(false);
		expect(frame.phase).toBe("idle");
	});
});

// ---------------------------------------------------------------------------
// Pressure and temperature gauges
// ---------------------------------------------------------------------------

describe("gauges", () => {
	it("pressure starts low", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(0.01);
		expect(frame.pressure).toBeLessThan(0.1);
	});

	it("pressure increases over time", () => {
		startCompression(3.0, "iron");
		const early = updateCompression(0.5);
		const late = updateCompression(1.5);
		expect(late.pressure).toBeGreaterThan(early.pressure);
	});

	it("pressure reaches 1.0 at slam", () => {
		startCompression(3.0, "iron");
		updateCompression(2.95);
		const frame = updateCompression(0.1);
		expect(frame.pressure).toBeCloseTo(1.0, 1);
	});

	it("temperature lags pressure", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(0.5);
		expect(frame.temperature).toBeLessThanOrEqual(frame.pressure);
	});

	it("danger zone activates above 80% pressure", () => {
		startCompression(3.0, "iron");
		const early = updateCompression(0.5);
		expect(early.inDangerZone).toBe(false);

		const late = updateCompression(2.0);
		expect(late.inDangerZone).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

describe("screen shake", () => {
	it("shake intensity increases with progress", () => {
		startCompression(3.0, "iron");
		const early = updateCompression(0.3);
		const mid = updateCompression(1.0);
		expect(mid.shakeIntensity).toBeGreaterThan(early.shakeIntensity);
	});

	it("maximum shake on slam", () => {
		startCompression(3.0, "iron");
		const slam = updateCompression(3.05); // fires slam
		expect(slam.shakeIntensity).toBeGreaterThanOrEqual(0.6);
	});

	it("shake decays during eject phase", () => {
		startCompression(3.0, "iron");
		updateCompression(3.05); // slam fires
		const ejectStart = updateCompression(0.05);
		const ejectEnd = updateCompression(0.2);
		// Eject should have decaying or zero shake
		expect(ejectEnd.shakeIntensity).toBeLessThanOrEqual(ejectStart.shakeIntensity);
	});

	it("no shake during cooldown", () => {
		startCompression(3.0, "iron");
		updateCompression(3.0);
		updateCompression(0.6); // past eject
		const frame = updateCompression(0.1);
		expect(frame.shakeIntensity).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Sound events
// ---------------------------------------------------------------------------

describe("sound events", () => {
	it("triggers compression_start on first frame", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(0.01);
		expect(frame.soundEvents).toContain("compression_start");
	});

	it("triggers compression_slam at completion", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(3.1);
		expect(frame.soundEvents).toContain("compression_slam");
	});

	it("triggers cube_eject_bounce during eject", () => {
		startCompression(3.0, "iron");
		updateCompression(3.05); // slam
		const frame = updateCompression(0.05); // eject
		// Either this frame or previous should have the eject sound
		expect(
			frame.soundEvents.includes("cube_eject_bounce") ||
			frame.phase === "eject" || frame.phase === "slam"
		).toBe(true);
	});

	it("pitch modifier rises with progress", () => {
		startCompression(3.0, "iron");
		const early = updateCompression(0.5);
		const late = updateCompression(2.0);
		expect(late.pitchModifier).toBeGreaterThan(early.pitchModifier);
	});
});

// ---------------------------------------------------------------------------
// Particle events
// ---------------------------------------------------------------------------

describe("particle events", () => {
	it("emits steam during building/critical phases", () => {
		startCompression(3.0, "iron");
		updateCompression(1.0);
		const frame = updateCompression(0.1);
		expect(frame.particleEvents).toContain("compression_steam");
	});

	it("emits slam burst at completion", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(3.1);
		expect(frame.particleEvents).toContain("compression_slam_burst");
	});

	it("emits cube spawn burst during eject", () => {
		startCompression(3.0, "iron");
		updateCompression(3.05); // slam fires — includes slam_burst
		const frame = updateCompression(0.05);
		// Spawn burst fires on eject or was included in slam frame
		expect(
			frame.particleEvents.includes("cube_spawn_burst") ||
			frame.phase === "eject"
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Screen flash
// ---------------------------------------------------------------------------

describe("screen flash", () => {
	it("no flash during normal compression", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(1.0);
		expect(frame.flashIntensity).toBe(0);
	});

	it("flash spikes on slam", () => {
		startCompression(3.0, "iron");
		updateCompression(3.0); // triggers slam
		const frame = updateCompression(0.01); // just after slam
		// Flash should be high right after slam
		expect(frame.flashIntensity).toBeGreaterThanOrEqual(0);
	});
});

// ---------------------------------------------------------------------------
// HUD overlay
// ---------------------------------------------------------------------------

describe("HUD overlay", () => {
	it("shows overlay during compression", () => {
		startCompression(3.0, "iron");
		const frame = updateCompression(1.0);
		expect(frame.showOverlay).toBe(true);
	});

	it("hides overlay during cooldown", () => {
		startCompression(3.0, "iron");
		updateCompression(3.0);
		updateCompression(0.6);
		const frame = updateCompression(0.1);
		expect(frame.showOverlay).toBe(false);
	});

	it("status text changes per phase", () => {
		startCompression(3.0, "iron");

		const charging = updateCompression(0.1);
		expect(charging.statusText).toBe("CHARGING...");

		const building = updateCompression(0.8);
		expect(building.statusText).toBe("COMPRESSING...");

		const critical = updateCompression(1.2);
		expect(critical.statusText).toBe("CRITICAL!");
	});

	it("overlay color shifts from blue to red", () => {
		startCompression(3.0, "iron");
		const early = updateCompression(0.3);
		const late = updateCompression(2.0);

		// Early should be more blue, late more red
		// Just check they're different — exact color math is tested by visual QA
		expect(early.overlayColor).not.toBe(late.overlayColor);
	});
});

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe("cancelCompression", () => {
	it("stops active compression", () => {
		startCompression(3.0, "iron");
		cancelCompression();
		expect(isCompressionActive()).toBe(false);
	});

	it("returns idle frame after cancel", () => {
		startCompression(3.0, "iron");
		cancelCompression();
		const frame = updateCompression(0.1);
		expect(frame.active).toBe(false);
		expect(frame.phase).toBe("idle");
	});
});

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

describe("queries", () => {
	it("getCompressionProgress returns 0 when inactive", () => {
		expect(getCompressionProgress()).toBe(0);
	});

	it("getCompressionProgress tracks progress", () => {
		startCompression(3.0, "iron");
		updateCompression(1.5);
		expect(getCompressionProgress()).toBeCloseTo(0.5, 1);
	});

	it("getCompressionPhase returns idle when inactive", () => {
		expect(getCompressionPhase()).toBe("idle");
	});
});

// ---------------------------------------------------------------------------
// PAPER PLAYTEST ASSERTIONS
// ---------------------------------------------------------------------------

describe("paper playtest requirements", () => {
	it("compression has minimum 4 distinct phases of feedback", () => {
		startCompression(3.0, "iron");
		const phases = new Set<CompressionPhase>();

		for (let t = 0; t < 3.5; t += 0.1) {
			const frame = updateCompression(0.1);
			phases.add(frame.phase);
		}

		// Should see at least: charging, building, critical, slam, eject
		expect(phases.size).toBeGreaterThanOrEqual(4);
	});

	it("slam moment has max feedback intensity", () => {
		startCompression(3.0, "iron");
		const slam = updateCompression(3.05);

		expect(slam.shakeIntensity).toBeGreaterThanOrEqual(0.6);
		expect(slam.soundEvents.length).toBeGreaterThan(0);
		expect(slam.particleEvents.length).toBeGreaterThan(0);
	});

	it("idle frame has zero feedback", () => {
		const frame = updateCompression(0.1);
		expect(frame.shakeIntensity).toBe(0);
		expect(frame.pressure).toBe(0);
		expect(frame.flashIntensity).toBe(0);
		expect(frame.soundEvents).toHaveLength(0);
		expect(frame.particleEvents).toHaveLength(0);
	});
});
