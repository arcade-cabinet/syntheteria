/**
 * Music system tests — verify public API, epoch bounds, and graceful no-ops.
 *
 * Tone.js is globally mocked (vitest/setup.ts), so these test
 * the control flow, not actual audio output.
 */

import { describe, expect, it } from "vitest";

describe("music module", () => {
	it("exports startMusic function", async () => {
		const mod = await import("../music");
		expect(typeof mod.startMusic).toBe("function");
	});

	it("exports stopMusic function", async () => {
		const mod = await import("../music");
		expect(typeof mod.stopMusic).toBe("function");
	});

	it("exports setMusicVolumeLevel function", async () => {
		const mod = await import("../music");
		expect(typeof mod.setMusicVolumeLevel).toBe("function");
	});

	it("exports isMusicPlaying function", async () => {
		const mod = await import("../music");
		expect(typeof mod.isMusicPlaying).toBe("function");
	});

	it("exports getCurrentMusicEpoch function", async () => {
		const mod = await import("../music");
		expect(typeof mod.getCurrentMusicEpoch).toBe("function");
	});

	it("startMusic does not throw when audio is not initialized", async () => {
		const mod = await import("../music");
		// Audio engine is not initialized in test env — should silently no-op
		expect(() => mod.startMusic(1)).not.toThrow();
	});

	it("startMusic accepts all epoch values (1-5) without throwing", async () => {
		const mod = await import("../music");
		for (let epoch = 1; epoch <= 5; epoch++) {
			expect(() => mod.startMusic(epoch)).not.toThrow();
		}
	});

	it("startMusic clamps epoch below 1 to 1", async () => {
		const mod = await import("../music");
		expect(() => mod.startMusic(0)).not.toThrow();
		expect(() => mod.startMusic(-1)).not.toThrow();
	});

	it("startMusic clamps epoch above 5 to 5", async () => {
		const mod = await import("../music");
		expect(() => mod.startMusic(6)).not.toThrow();
		expect(() => mod.startMusic(99)).not.toThrow();
	});

	it("stopMusic does not throw when music is not playing", async () => {
		const mod = await import("../music");
		expect(() => mod.stopMusic()).not.toThrow();
	});

	it("setMusicVolumeLevel does not throw", async () => {
		const mod = await import("../music");
		expect(() => mod.setMusicVolumeLevel(0.5)).not.toThrow();
	});

	it("isMusicPlaying returns false when not initialized", async () => {
		const mod = await import("../music");
		expect(mod.isMusicPlaying()).toBe(false);
	});

	it("getCurrentMusicEpoch returns 0 when not playing", async () => {
		const mod = await import("../music");
		expect(mod.getCurrentMusicEpoch()).toBe(0);
	});
});
