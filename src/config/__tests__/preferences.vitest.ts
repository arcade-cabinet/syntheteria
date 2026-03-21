import { afterEach, describe, expect, it } from "vitest";
import {
	_resetPreferencesCache,
	getPreferences,
	loadPreferences,
	savePreferences,
} from "../preferences";

afterEach(() => {
	_resetPreferencesCache();
});

describe("player preferences — defaults", () => {
	it("getPreferences returns defaults when no cache loaded", () => {
		const prefs = getPreferences();
		expect(prefs.audioVolume).toBe(0.7);
		expect(prefs.musicVolume).toBe(0.5);
		expect(prefs.sfxVolume).toBe(0.8);
		expect(prefs.cameraSpeed).toBe(1.0);
		expect(prefs.showTutorial).toBe(true);
		expect(prefs.showKeybindHints).toBe(true);
		expect(prefs.colorBlindMode).toBe(false);
		expect(prefs.fontSize).toBe("medium");
	});

	it("getPreferences returns a fresh copy each call", () => {
		const a = getPreferences();
		const b = getPreferences();
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});
});

describe("player preferences — loadPreferences", () => {
	it("falls back to defaults when Capacitor is unavailable", async () => {
		const prefs = await loadPreferences();
		expect(prefs.audioVolume).toBe(0.7);
		expect(prefs.fontSize).toBe("medium");
	});

	it("cached value is accessible synchronously after load", async () => {
		await loadPreferences();
		const prefs = getPreferences();
		expect(prefs.audioVolume).toBe(0.7);
	});
});

describe("player preferences — savePreferences", () => {
	it("saves and round-trips through cache", async () => {
		await loadPreferences();
		await savePreferences({ audioVolume: 0.3, colorBlindMode: true });
		const prefs = getPreferences();
		expect(prefs.audioVolume).toBe(0.3);
		expect(prefs.colorBlindMode).toBe(true);
		expect(prefs.musicVolume).toBe(0.5);
	});

	it("works without prior loadPreferences", async () => {
		await savePreferences({ fontSize: "large" });
		const prefs = getPreferences();
		expect(prefs.fontSize).toBe("large");
		expect(prefs.audioVolume).toBe(0.7);
	});
});
