/**
 * Ambience system tests — verify start/stop lifecycle and graceful no-ops.
 *
 * These tests use the global Tone.js mock from vitest/setup.ts.
 */

import { describe, expect, it } from "vitest";

describe("ambience module", () => {
	it("exports startAmbience and stopAmbience", async () => {
		const mod = await import("../ambience");
		expect(typeof mod.startAmbience).toBe("function");
		expect(typeof mod.stopAmbience).toBe("function");
	});

	it("startAmbience does not throw when audio is not initialized", async () => {
		const mod = await import("../ambience");
		expect(() => mod.startAmbience()).not.toThrow();
	});

	it("stopAmbience does not throw when not running", async () => {
		const mod = await import("../ambience");
		expect(() => mod.stopAmbience()).not.toThrow();
	});

	it("stopAmbience can be called multiple times safely", async () => {
		const mod = await import("../ambience");
		expect(() => {
			mod.stopAmbience();
			mod.stopAmbience();
			mod.stopAmbience();
		}).not.toThrow();
	});
});
