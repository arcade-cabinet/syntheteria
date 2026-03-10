/**
 * Tests for the audio event data system.
 *
 * Tests cover:
 * - triggerSound creates events with correct defaults
 * - Custom options override defaults
 * - getActiveSounds returns a snapshot
 * - audioEventSystem expires non-looping sounds by tick
 * - Looping sounds persist across ticks until explicitly stopped
 * - stopSound removes a specific sound by ID
 * - stopAllSounds clears everything
 * - calculateSpatialVolume with various distances
 * - Volume clamping (0–1)
 * - Pitch clamping (0.5–2.0)
 * - Duration minimum enforcement
 * - reset clears all state
 * - All 14 sound types can be triggered
 * - Position is copied (not referenced)
 * - IDs are unique and sequential
 * - getActiveSoundCount tracks active sounds
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	type SoundEvent,
	type SoundEventType,
	type TriggerSoundOptions,
	type Vec3,
	audioEventSystem,
	calculateSpatialVolume,
	getActiveSoundCount,
	getActiveSounds,
	reset,
	stopAllSounds,
	stopSound,
	triggerSound,
} from "../audioEventSystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function origin(): Vec3 {
	return { x: 0, y: 0, z: 0 };
}

function pos(x: number, y: number, z: number): Vec3 {
	return { x, y, z };
}

// ---------------------------------------------------------------------------
// triggerSound basics
// ---------------------------------------------------------------------------

describe("audioEventSystem — triggerSound", () => {
	it("creates a sound event with default values", () => {
		const sound = triggerSound("footstep", origin());

		expect(sound.type).toBe("footstep");
		expect(sound.position).toEqual({ x: 0, y: 0, z: 0 });
		expect(sound.volume).toBe(1.0);
		expect(sound.pitch).toBe(1.0);
		expect(sound.loop).toBe(false);
		expect(sound.startTick).toBe(0);
		expect(sound.duration).toBe(30);
	});

	it("applies custom options", () => {
		const opts: TriggerSoundOptions = {
			volume: 0.5,
			pitch: 1.5,
			loop: true,
			startTick: 100,
			duration: 60,
		};

		const sound = triggerSound("furnace_hum", pos(3, 4, 5), opts);

		expect(sound.type).toBe("furnace_hum");
		expect(sound.position).toEqual({ x: 3, y: 4, z: 5 });
		expect(sound.volume).toBe(0.5);
		expect(sound.pitch).toBe(1.5);
		expect(sound.loop).toBe(true);
		expect(sound.startTick).toBe(100);
		expect(sound.duration).toBe(60);
	});

	it("generates unique sequential IDs", () => {
		const s1 = triggerSound("footstep", origin());
		const s2 = triggerSound("footstep", origin());
		const s3 = triggerSound("footstep", origin());

		expect(s1.id).toBe("sound_1");
		expect(s2.id).toBe("sound_2");
		expect(s3.id).toBe("sound_3");
	});

	it("copies position — mutating input does not affect the event", () => {
		const p = { x: 1, y: 2, z: 3 };
		const sound = triggerSound("footstep", p);

		p.x = 999;

		expect(sound.position.x).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// All sound types
// ---------------------------------------------------------------------------

describe("audioEventSystem — sound types", () => {
	it("supports all 14 sound event types", () => {
		const types: SoundEventType[] = [
			"harvest_grind",
			"compress_whoosh",
			"cube_drop",
			"cube_pickup",
			"furnace_hum",
			"build_clang",
			"explosion",
			"lightning_crack",
			"hacking_buzz",
			"menu_click",
			"quest_complete",
			"level_up",
			"damage_hit",
			"footstep",
		];

		for (const type of types) {
			const sound = triggerSound(type, origin());
			expect(sound.type).toBe(type);
		}

		expect(getActiveSoundCount()).toBe(14);
	});
});

// ---------------------------------------------------------------------------
// getActiveSounds
// ---------------------------------------------------------------------------

describe("audioEventSystem — getActiveSounds", () => {
	it("returns empty array when no sounds exist", () => {
		expect(getActiveSounds()).toEqual([]);
	});

	it("returns all active sounds", () => {
		triggerSound("footstep", origin());
		triggerSound("explosion", pos(5, 0, 5));

		const sounds = getActiveSounds();
		expect(sounds).toHaveLength(2);
		expect(sounds[0].type).toBe("footstep");
		expect(sounds[1].type).toBe("explosion");
	});

	it("returns a shallow copy — mutating it does not affect internal state", () => {
		triggerSound("footstep", origin());

		const sounds = getActiveSounds();
		sounds.length = 0;

		expect(getActiveSoundCount()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getActiveSoundCount
// ---------------------------------------------------------------------------

describe("audioEventSystem — getActiveSoundCount", () => {
	it("returns 0 when empty", () => {
		expect(getActiveSoundCount()).toBe(0);
	});

	it("tracks the number of active sounds", () => {
		triggerSound("footstep", origin());
		expect(getActiveSoundCount()).toBe(1);

		triggerSound("explosion", origin());
		expect(getActiveSoundCount()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// audioEventSystem (tick)
// ---------------------------------------------------------------------------

describe("audioEventSystem — tick expiration", () => {
	it("removes non-looping sounds whose duration has elapsed", () => {
		triggerSound("footstep", origin(), { startTick: 0, duration: 10 });

		audioEventSystem(9);
		expect(getActiveSoundCount()).toBe(1);

		audioEventSystem(10);
		expect(getActiveSoundCount()).toBe(0);
	});

	it("keeps non-looping sounds that have not expired", () => {
		triggerSound("explosion", origin(), { startTick: 0, duration: 100 });

		audioEventSystem(50);
		expect(getActiveSoundCount()).toBe(1);
	});

	it("preserves looping sounds regardless of tick", () => {
		triggerSound("furnace_hum", origin(), {
			loop: true,
			startTick: 0,
			duration: 5,
		});

		audioEventSystem(100);
		audioEventSystem(1000);

		expect(getActiveSoundCount()).toBe(1);
	});

	it("handles mixed looping and non-looping sounds", () => {
		triggerSound("footstep", origin(), { startTick: 0, duration: 5 });
		triggerSound("furnace_hum", origin(), { loop: true, startTick: 0, duration: 5 });
		triggerSound("explosion", origin(), { startTick: 0, duration: 20 });

		audioEventSystem(5);
		expect(getActiveSoundCount()).toBe(2);

		const remaining = getActiveSounds();
		const types = remaining.map((s) => s.type);
		expect(types).toContain("furnace_hum");
		expect(types).toContain("explosion");
	});

	it("removes sound exactly when currentTick - startTick equals duration", () => {
		triggerSound("footstep", origin(), { startTick: 5, duration: 10 });

		audioEventSystem(14);
		expect(getActiveSoundCount()).toBe(1);

		audioEventSystem(15);
		expect(getActiveSoundCount()).toBe(0);
	});

	it("does nothing when no sounds exist", () => {
		expect(() => audioEventSystem(100)).not.toThrow();
		expect(getActiveSoundCount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// stopSound
// ---------------------------------------------------------------------------

describe("audioEventSystem — stopSound", () => {
	it("removes a specific sound by ID", () => {
		const s1 = triggerSound("footstep", origin());
		triggerSound("explosion", origin());

		const removed = stopSound(s1.id);

		expect(removed).toBe(true);
		expect(getActiveSoundCount()).toBe(1);
		expect(getActiveSounds()[0].type).toBe("explosion");
	});

	it("returns false when the ID does not exist", () => {
		expect(stopSound("nonexistent")).toBe(false);
	});

	it("can stop a looping sound", () => {
		const s = triggerSound("furnace_hum", origin(), { loop: true });

		expect(stopSound(s.id)).toBe(true);
		expect(getActiveSoundCount()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// stopAllSounds
// ---------------------------------------------------------------------------

describe("audioEventSystem — stopAllSounds", () => {
	it("removes all active sounds", () => {
		triggerSound("footstep", origin());
		triggerSound("explosion", origin());
		triggerSound("furnace_hum", origin(), { loop: true });

		stopAllSounds();

		expect(getActiveSoundCount()).toBe(0);
		expect(getActiveSounds()).toEqual([]);
	});

	it("is safe to call when no sounds exist", () => {
		expect(() => stopAllSounds()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// calculateSpatialVolume
// ---------------------------------------------------------------------------

describe("audioEventSystem — calculateSpatialVolume", () => {
	it("returns 1 when sound is at the listener position", () => {
		const vol = calculateSpatialVolume(origin(), origin(), 50);
		expect(vol).toBe(1);
	});

	it("returns 0 when sound is at maxDistance", () => {
		const vol = calculateSpatialVolume(pos(50, 0, 0), origin(), 50);
		expect(vol).toBe(0);
	});

	it("returns 0 when sound is beyond maxDistance", () => {
		const vol = calculateSpatialVolume(pos(100, 0, 0), origin(), 50);
		expect(vol).toBe(0);
	});

	it("returns 0.5 at half the maxDistance", () => {
		const vol = calculateSpatialVolume(pos(25, 0, 0), origin(), 50);
		expect(vol).toBeCloseTo(0.5);
	});

	it("calculates distance in 3D correctly", () => {
		// distance = sqrt(3^2 + 4^2 + 0^2) = 5
		const vol = calculateSpatialVolume(pos(3, 4, 0), origin(), 10);
		expect(vol).toBeCloseTo(0.5);
	});

	it("returns 0 when maxDistance is 0", () => {
		const vol = calculateSpatialVolume(origin(), origin(), 0);
		expect(vol).toBe(0);
	});

	it("returns 0 when maxDistance is negative", () => {
		const vol = calculateSpatialVolume(origin(), origin(), -10);
		expect(vol).toBe(0);
	});

	it("works with non-origin listener position", () => {
		// listener at (10, 0, 0), sound at (20, 0, 0), distance = 10
		const vol = calculateSpatialVolume(pos(20, 0, 0), pos(10, 0, 0), 20);
		expect(vol).toBeCloseTo(0.5);
	});

	it("volume decreases linearly with distance", () => {
		const maxDist = 100;
		const vol25 = calculateSpatialVolume(pos(25, 0, 0), origin(), maxDist);
		const vol50 = calculateSpatialVolume(pos(50, 0, 0), origin(), maxDist);
		const vol75 = calculateSpatialVolume(pos(75, 0, 0), origin(), maxDist);

		expect(vol25).toBeCloseTo(0.75);
		expect(vol50).toBeCloseTo(0.50);
		expect(vol75).toBeCloseTo(0.25);
	});
});

// ---------------------------------------------------------------------------
// Volume clamping
// ---------------------------------------------------------------------------

describe("audioEventSystem — volume clamping", () => {
	it("clamps volume to 0 when negative", () => {
		const sound = triggerSound("footstep", origin(), { volume: -0.5 });
		expect(sound.volume).toBe(0);
	});

	it("clamps volume to 1 when above 1", () => {
		const sound = triggerSound("footstep", origin(), { volume: 5.0 });
		expect(sound.volume).toBe(1);
	});

	it("leaves valid volume values unchanged", () => {
		const sound = triggerSound("footstep", origin(), { volume: 0.7 });
		expect(sound.volume).toBe(0.7);
	});

	it("allows boundary values 0 and 1", () => {
		const s0 = triggerSound("footstep", origin(), { volume: 0 });
		const s1 = triggerSound("footstep", origin(), { volume: 1 });
		expect(s0.volume).toBe(0);
		expect(s1.volume).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Pitch clamping
// ---------------------------------------------------------------------------

describe("audioEventSystem — pitch clamping", () => {
	it("clamps pitch to 0.5 when below minimum", () => {
		const sound = triggerSound("footstep", origin(), { pitch: 0.1 });
		expect(sound.pitch).toBe(0.5);
	});

	it("clamps pitch to 2.0 when above maximum", () => {
		const sound = triggerSound("footstep", origin(), { pitch: 5.0 });
		expect(sound.pitch).toBe(2.0);
	});

	it("leaves valid pitch values unchanged", () => {
		const sound = triggerSound("footstep", origin(), { pitch: 1.5 });
		expect(sound.pitch).toBe(1.5);
	});

	it("allows boundary values 0.5 and 2.0", () => {
		const sLow = triggerSound("footstep", origin(), { pitch: 0.5 });
		const sHigh = triggerSound("footstep", origin(), { pitch: 2.0 });
		expect(sLow.pitch).toBe(0.5);
		expect(sHigh.pitch).toBe(2.0);
	});
});

// ---------------------------------------------------------------------------
// Duration minimum
// ---------------------------------------------------------------------------

describe("audioEventSystem — duration minimum", () => {
	it("enforces minimum duration of 1", () => {
		const s0 = triggerSound("footstep", origin(), { duration: 0 });
		const sNeg = triggerSound("footstep", origin(), { duration: -10 });

		expect(s0.duration).toBe(1);
		expect(sNeg.duration).toBe(1);
	});

	it("preserves valid durations", () => {
		const sound = triggerSound("footstep", origin(), { duration: 42 });
		expect(sound.duration).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("audioEventSystem — reset", () => {
	it("clears all sounds", () => {
		triggerSound("footstep", origin());
		triggerSound("explosion", origin());

		reset();

		expect(getActiveSoundCount()).toBe(0);
		expect(getActiveSounds()).toEqual([]);
	});

	it("resets ID counter", () => {
		triggerSound("footstep", origin());
		triggerSound("footstep", origin());

		reset();

		const sound = triggerSound("footstep", origin());
		expect(sound.id).toBe("sound_1");
	});
});
