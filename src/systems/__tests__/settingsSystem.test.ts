/**
 * Unit tests for the settings system.
 *
 * Tests cover:
 * - Default settings values
 * - getSetting: reads individual values by category/key
 * - setSetting: writes individual values, keyBindings merge
 * - getSettings: returns deep-clone snapshot
 * - setSettings: partial merge across categories
 * - validateSettings: bounds checking for all numeric values and enums
 * - exportSettings / importSettings: JSON serialization round-trip
 * - importSettings: handles invalid JSON, missing keys, bad values
 * - _resetSettings: restores all defaults
 */

import {
	DEFAULT_AUDIO_SETTINGS,
	DEFAULT_CONTROLS_SETTINGS,
	DEFAULT_GAMEPLAY_SETTINGS,
	DEFAULT_KEY_BINDINGS,
	DEFAULT_SETTINGS,
	DEFAULT_VIDEO_SETTINGS,
	type GameSettings,
	type ValidationError,
	_resetSettings,
	exportSettings,
	getSetting,
	getSettings,
	importSettings,
	setSetting,
	setSettings,
	validateSettings,
} from "../settingsSystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetSettings();
});

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

describe("default settings", () => {
	it("video defaults match expected values", () => {
		const s = getSettings();
		expect(s.video).toEqual(DEFAULT_VIDEO_SETTINGS);
	});

	it("audio defaults match expected values", () => {
		const s = getSettings();
		expect(s.audio).toEqual(DEFAULT_AUDIO_SETTINGS);
	});

	it("gameplay defaults match expected values", () => {
		const s = getSettings();
		expect(s.gameplay).toEqual(DEFAULT_GAMEPLAY_SETTINGS);
	});

	it("controls defaults match expected values", () => {
		const s = getSettings();
		expect(s.controls.mouseSensitivity).toBe(DEFAULT_CONTROLS_SETTINGS.mouseSensitivity);
		expect(s.controls.invertY).toBe(DEFAULT_CONTROLS_SETTINGS.invertY);
		expect(s.controls.keyBindings).toEqual(DEFAULT_KEY_BINDINGS);
	});
});

// ---------------------------------------------------------------------------
// getSetting
// ---------------------------------------------------------------------------

describe("getSetting", () => {
	it("reads a video setting", () => {
		expect(getSetting("video", "fov")).toBe(90);
	});

	it("reads an audio setting", () => {
		expect(getSetting("audio", "masterVolume")).toBe(0.8);
	});

	it("reads a gameplay setting", () => {
		expect(getSetting("gameplay", "difficulty")).toBe("normal");
	});

	it("reads a controls setting", () => {
		expect(getSetting("controls", "mouseSensitivity")).toBe(0.5);
	});

	it("reads keyBindings", () => {
		const bindings = getSetting("controls", "keyBindings") as Record<string, string>;
		expect(bindings.moveForward).toBe("w");
	});
});

// ---------------------------------------------------------------------------
// setSetting
// ---------------------------------------------------------------------------

describe("setSetting", () => {
	it("sets a video setting", () => {
		setSetting("video", "fov", 100);
		expect(getSetting("video", "fov")).toBe(100);
	});

	it("sets an audio setting", () => {
		setSetting("audio", "masterVolume", 0.3);
		expect(getSetting("audio", "masterVolume")).toBe(0.3);
	});

	it("sets a gameplay boolean", () => {
		setSetting("gameplay", "showFPS", true);
		expect(getSetting("gameplay", "showFPS")).toBe(true);
	});

	it("sets difficulty", () => {
		setSetting("gameplay", "difficulty", "brutal");
		expect(getSetting("gameplay", "difficulty")).toBe("brutal");
	});

	it("sets controls mouseSensitivity", () => {
		setSetting("controls", "mouseSensitivity", 1.5);
		expect(getSetting("controls", "mouseSensitivity")).toBe(1.5);
	});

	it("sets invertY", () => {
		setSetting("controls", "invertY", true);
		expect(getSetting("controls", "invertY")).toBe(true);
	});

	it("merges keyBindings rather than replacing", () => {
		setSetting("controls", "keyBindings", { moveForward: "ArrowUp" } as Record<string, string>);
		const bindings = getSetting("controls", "keyBindings") as Record<string, string>;
		expect(bindings.moveForward).toBe("ArrowUp");
		// Other keys should still be present
		expect(bindings.moveBackward).toBe("s");
		expect(bindings.jump).toBe(" ");
	});

	it("does not affect other settings in the same category", () => {
		setSetting("video", "fov", 110);
		expect(getSetting("video", "shadowQuality")).toBe("medium");
		expect(getSetting("video", "particleCount") as number).toBe(500);
	});
});

// ---------------------------------------------------------------------------
// getSettings
// ---------------------------------------------------------------------------

describe("getSettings", () => {
	it("returns a deep-clone snapshot", () => {
		const s1 = getSettings();
		const s2 = getSettings();
		expect(s1).not.toBe(s2);
		expect(s1.video).not.toBe(s2.video);
		expect(s1.controls.keyBindings).not.toBe(s2.controls.keyBindings);
		expect(s1).toEqual(s2);
	});

	it("mutations on snapshot do not affect internal state", () => {
		const s = getSettings();
		s.video.fov = 999;
		s.controls.keyBindings.moveForward = "z";
		expect(getSetting("video", "fov")).toBe(90);
		expect((getSetting("controls", "keyBindings") as Record<string, string>).moveForward).toBe("w");
	});
});

// ---------------------------------------------------------------------------
// setSettings (partial merge)
// ---------------------------------------------------------------------------

describe("setSettings", () => {
	it("merges partial video settings", () => {
		setSettings({ video: { fov: 110, particleCount: 1000 } });
		expect(getSetting("video", "fov")).toBe(110);
		expect(getSetting("video", "particleCount")).toBe(1000);
		// Untouched settings remain
		expect(getSetting("video", "shadowQuality")).toBe("medium");
		expect(getSetting("video", "renderDistance")).toBe(200);
	});

	it("merges partial audio settings", () => {
		setSettings({ audio: { masterVolume: 0.2 } });
		expect(getSetting("audio", "masterVolume")).toBe(0.2);
		expect(getSetting("audio", "sfxVolume")).toBe(0.7);
	});

	it("merges partial gameplay settings", () => {
		setSettings({ gameplay: { showFPS: true, autoSave: false } });
		expect(getSetting("gameplay", "showFPS")).toBe(true);
		expect(getSetting("gameplay", "autoSave")).toBe(false);
		expect(getSetting("gameplay", "difficulty")).toBe("normal");
	});

	it("merges partial controls settings including keyBindings", () => {
		setSettings({
			controls: {
				mouseSensitivity: 1.0,
				keyBindings: { interact: "f" },
			},
		});
		expect(getSetting("controls", "mouseSensitivity")).toBe(1.0);
		expect((getSetting("controls", "keyBindings") as Record<string, string>).interact).toBe("f");
		// Other key bindings unchanged
		expect((getSetting("controls", "keyBindings") as Record<string, string>).moveForward).toBe("w");
	});

	it("merges multiple categories at once", () => {
		setSettings({
			video: { fov: 75 },
			audio: { sfxVolume: 0.9 },
		});
		expect(getSetting("video", "fov")).toBe(75);
		expect(getSetting("audio", "sfxVolume")).toBe(0.9);
		// Other categories untouched
		expect(getSetting("gameplay", "difficulty")).toBe("normal");
	});

	it("handles empty partial (no changes)", () => {
		const before = getSettings();
		setSettings({});
		const after = getSettings();
		expect(after).toEqual(before);
	});
});

// ---------------------------------------------------------------------------
// validateSettings
// ---------------------------------------------------------------------------

describe("validateSettings", () => {
	it("returns empty array for default settings", () => {
		const errors = validateSettings();
		expect(errors).toEqual([]);
	});

	it("catches fov below minimum", () => {
		setSetting("video", "fov", 30);
		const errors = validateSettings();
		expect(errors).toHaveLength(1);
		expect(errors[0].category).toBe("video");
		expect(errors[0].key).toBe("fov");
	});

	it("catches fov above maximum", () => {
		setSetting("video", "fov", 180);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "fov")).toBe(true);
	});

	it("accepts fov at boundaries", () => {
		setSetting("video", "fov", 60);
		expect(validateSettings()).toEqual([]);
		setSetting("video", "fov", 120);
		expect(validateSettings()).toEqual([]);
	});

	it("catches volume below 0", () => {
		setSetting("audio", "masterVolume", -0.1);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "masterVolume")).toBe(true);
	});

	it("catches volume above 1", () => {
		setSetting("audio", "sfxVolume", 1.5);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "sfxVolume")).toBe(true);
	});

	it("accepts volume at boundaries", () => {
		setSetting("audio", "masterVolume", 0);
		setSetting("audio", "sfxVolume", 1);
		expect(validateSettings()).toEqual([]);
	});

	it("catches invalid shadow quality", () => {
		setSetting("video", "shadowQuality", "ultra" as any);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "shadowQuality")).toBe(true);
	});

	it("catches invalid difficulty", () => {
		setSetting("gameplay", "difficulty", "insane" as any);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "difficulty")).toBe(true);
	});

	it("catches mouse sensitivity out of bounds", () => {
		setSetting("controls", "mouseSensitivity", 0);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "mouseSensitivity")).toBe(true);
	});

	it("catches negative particleCount", () => {
		setSetting("video", "particleCount", -100);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "particleCount")).toBe(true);
	});

	it("catches renderDistance below minimum", () => {
		setSetting("video", "renderDistance", 10);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "renderDistance")).toBe(true);
	});

	it("reports multiple errors simultaneously", () => {
		setSetting("video", "fov", 10);
		setSetting("audio", "masterVolume", 5);
		setSetting("controls", "mouseSensitivity", -1);
		const errors = validateSettings();
		expect(errors.length).toBeGreaterThanOrEqual(3);
	});

	it("catches NaN values", () => {
		setSetting("video", "fov", NaN as any);
		const errors = validateSettings();
		expect(errors.some(e => e.key === "fov")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// exportSettings / importSettings
// ---------------------------------------------------------------------------

describe("exportSettings", () => {
	it("returns a valid JSON string", () => {
		const json = exportSettings();
		expect(() => JSON.parse(json)).not.toThrow();
	});

	it("includes all categories", () => {
		const parsed = JSON.parse(exportSettings());
		expect(parsed).toHaveProperty("video");
		expect(parsed).toHaveProperty("audio");
		expect(parsed).toHaveProperty("gameplay");
		expect(parsed).toHaveProperty("controls");
	});

	it("reflects current settings, not defaults", () => {
		setSetting("video", "fov", 100);
		const parsed = JSON.parse(exportSettings());
		expect(parsed.video.fov).toBe(100);
	});
});

describe("importSettings", () => {
	it("round-trips through export and import", () => {
		setSetting("video", "fov", 100);
		setSetting("audio", "musicVolume", 0.3);
		setSetting("controls", "invertY", true);
		const json = exportSettings();

		_resetSettings();
		expect(getSetting("video", "fov")).toBe(90); // back to default

		const errors = importSettings(json);
		expect(errors).toEqual([]);
		expect(getSetting("video", "fov")).toBe(100);
		expect(getSetting("audio", "musicVolume")).toBe(0.3);
		expect(getSetting("controls", "invertY")).toBe(true);
	});

	it("fills missing keys with defaults", () => {
		const partial = JSON.stringify({ video: { fov: 100 } });
		const errors = importSettings(partial);
		expect(errors).toEqual([]);
		expect(getSetting("video", "fov")).toBe(100);
		expect(getSetting("video", "shadowQuality")).toBe("medium"); // default
		expect(getSetting("audio", "masterVolume")).toBe(0.8); // default
	});

	it("returns validation errors for bad values", () => {
		const bad = JSON.stringify({ video: { fov: 999 } });
		const errors = importSettings(bad);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.some(e => e.key === "fov")).toBe(true);
	});

	it("returns error for invalid JSON", () => {
		const errors = importSettings("not json {{{");
		expect(errors).toHaveLength(1);
		expect(errors[0].category).toBe("root");
		expect(errors[0].key).toBe("json");
	});

	it("returns error for non-object JSON", () => {
		const errors = importSettings('"just a string"');
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain("JSON object");
	});

	it("returns error for null JSON", () => {
		const errors = importSettings("null");
		expect(errors).toHaveLength(1);
	});

	it("imports keyBindings correctly", () => {
		const data = JSON.stringify({
			controls: {
				keyBindings: { moveForward: "ArrowUp", customAction: "q" },
			},
		});
		importSettings(data);
		const bindings = getSetting("controls", "keyBindings") as Record<string, string>;
		expect(bindings.moveForward).toBe("ArrowUp");
		expect(bindings.customAction).toBe("q");
		// Default keys still present
		expect(bindings.moveBackward).toBe("s");
	});
});

// ---------------------------------------------------------------------------
// _resetSettings
// ---------------------------------------------------------------------------

describe("_resetSettings", () => {
	it("restores all settings to defaults", () => {
		setSetting("video", "fov", 110);
		setSetting("audio", "masterVolume", 0.1);
		setSetting("gameplay", "difficulty", "brutal");
		setSetting("controls", "invertY", true);
		setSetting("controls", "keyBindings", { moveForward: "ArrowUp" } as Record<string, string>);

		_resetSettings();

		const s = getSettings();
		expect(s.video.fov).toBe(90);
		expect(s.audio.masterVolume).toBe(0.8);
		expect(s.gameplay.difficulty).toBe("normal");
		expect(s.controls.invertY).toBe(false);
		expect(s.controls.keyBindings.moveForward).toBe("w");
	});

	it("reset does not share references with previous state", () => {
		const before = getSettings();
		_resetSettings();
		const after = getSettings();
		expect(before.video).not.toBe(after.video);
		expect(before.controls.keyBindings).not.toBe(after.controls.keyBindings);
	});
});
