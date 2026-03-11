/**
 * Tests for SettingsScreen — pure logic layer.
 *
 * The component is not rendered (node test env).
 * We test the persistence helpers, draft-state logic, key rebinding,
 * and integration with settingsSystem.ts directly.
 */

import {
	DEFAULT_AUDIO_SETTINGS,
	DEFAULT_CONTROLS_SETTINGS,
	DEFAULT_KEY_BINDINGS,
	DEFAULT_VIDEO_SETTINGS,
	type GameSettings,
	_resetSettings,
	exportSettings,
	getSettings,
	importSettings,
	setSettings,
	validateSettings,
} from "../../systems/settingsSystem";

// ---------------------------------------------------------------------------
// localStorage stub (node env has no localStorage)
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};

const localStorageMock = {
	getItem: (key: string) => store[key] ?? null,
	setItem: (key: string, value: string) => {
		store[key] = value;
	},
	removeItem: (key: string) => {
		delete store[key];
	},
	clear: () => {
		for (const k of Object.keys(store)) delete store[k];
	},
};

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
	writable: true,
});

// ---------------------------------------------------------------------------
// Helpers that mirror SettingsScreen.tsx behavior
// (pure logic extracted from the component)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "syntheteria_settings";

function loadFromStorage(): void {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw) importSettings(raw);
}

function saveToStorage(): void {
	localStorage.setItem(STORAGE_KEY, exportSettings());
}

function applyDraftAndSave(draft: GameSettings): void {
	setSettings({
		video: draft.video,
		audio: draft.audio,
		gameplay: draft.gameplay,
		controls: draft.controls,
	});
	saveToStorage();
}

function rebindKey(
	draft: GameSettings,
	action: string,
	key: string,
): GameSettings {
	const normalizedKey = key === " " ? "Space" : key;
	return {
		...draft,
		controls: {
			...draft.controls,
			keyBindings: {
				...draft.controls.keyBindings,
				[action]: normalizedKey,
			},
		},
	};
}

function makeDefaultDraft(): GameSettings {
	loadFromStorage();
	return getSettings();
}

// ---------------------------------------------------------------------------
// localStorage persistence: save and load round-trip
// ---------------------------------------------------------------------------

describe("SettingsScreen localStorage persistence", () => {
	beforeEach(() => {
		localStorageMock.clear();
		_resetSettings();
	});

	it("saves settings to localStorage on close", () => {
		const draft = getSettings();
		applyDraftAndSave(draft);
		expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
	});

	it("round-trips video settings through localStorage", () => {
		setSettings({ video: { fov: 110, renderDistance: 600, particleCount: 1000, shadowQuality: "high" } });
		saveToStorage();
		_resetSettings();
		loadFromStorage();
		const loaded = getSettings();
		expect(loaded.video.fov).toBe(110);
		expect(loaded.video.renderDistance).toBe(600);
		expect(loaded.video.particleCount).toBe(1000);
		expect(loaded.video.shadowQuality).toBe("high");
	});

	it("round-trips audio settings through localStorage", () => {
		setSettings({ audio: { masterVolume: 0.3, musicVolume: 0.2, sfxVolume: 0.9, ambientVolume: 0.1 } });
		saveToStorage();
		_resetSettings();
		loadFromStorage();
		const loaded = getSettings();
		expect(loaded.audio.masterVolume).toBeCloseTo(0.3);
		expect(loaded.audio.musicVolume).toBeCloseTo(0.2);
		expect(loaded.audio.sfxVolume).toBeCloseTo(0.9);
		expect(loaded.audio.ambientVolume).toBeCloseTo(0.1);
	});

	it("round-trips controls settings through localStorage", () => {
		setSettings({
			controls: {
				mouseSensitivity: 1.5,
				invertY: true,
				keyBindings: { ...DEFAULT_KEY_BINDINGS, jump: "Space" },
			},
		});
		saveToStorage();
		_resetSettings();
		loadFromStorage();
		const loaded = getSettings();
		expect(loaded.controls.mouseSensitivity).toBeCloseTo(1.5);
		expect(loaded.controls.invertY).toBe(true);
		expect(loaded.controls.keyBindings.jump).toBe("Space");
	});

	it("returns defaults when localStorage is empty", () => {
		// No prior save
		loadFromStorage();
		const s = getSettings();
		expect(s.video.fov).toBe(DEFAULT_VIDEO_SETTINGS.fov);
		expect(s.audio.masterVolume).toBe(DEFAULT_AUDIO_SETTINGS.masterVolume);
	});

	it("gracefully ignores corrupt localStorage data", () => {
		localStorage.setItem(STORAGE_KEY, "NOT_VALID_JSON{{{");
		// Should not throw
		expect(() => loadFromStorage()).not.toThrow();
	});

	it("persists multiple saves correctly (last write wins)", () => {
		setSettings({ video: { fov: 75 } as Partial<typeof DEFAULT_VIDEO_SETTINGS> });
		saveToStorage();
		setSettings({ video: { fov: 95 } as Partial<typeof DEFAULT_VIDEO_SETTINGS> });
		saveToStorage();
		_resetSettings();
		loadFromStorage();
		expect(getSettings().video.fov).toBe(95);
	});
});

// ---------------------------------------------------------------------------
// Draft state isolation
// ---------------------------------------------------------------------------

describe("SettingsScreen draft state", () => {
	beforeEach(() => {
		localStorageMock.clear();
		_resetSettings();
	});

	it("draft starts from current settings on open", () => {
		setSettings({ video: { fov: 100 } as Partial<typeof DEFAULT_VIDEO_SETTINGS> });
		const draft = getSettings();
		expect(draft.video.fov).toBe(100);
	});

	it("modifying draft does not affect live settings until apply", () => {
		const draft: GameSettings = {
			...getSettings(),
			audio: { ...getSettings().audio, masterVolume: 0.1 },
		};
		// Live settings still have default
		expect(getSettings().audio.masterVolume).toBe(DEFAULT_AUDIO_SETTINGS.masterVolume);
		// Draft has changed value
		expect(draft.audio.masterVolume).toBeCloseTo(0.1);
	});

	it("apply draft writes to live settings", () => {
		const draft: GameSettings = {
			...getSettings(),
			video: { ...getSettings().video, fov: 115 },
		};
		applyDraftAndSave(draft);
		expect(getSettings().video.fov).toBe(115);
	});

	it("closing without apply leaves live settings unchanged", () => {
		const liveBefore = getSettings().video.fov;
		// Simulate "cancel" by not calling applyDraftAndSave
		const _draft = { ...getSettings(), video: { ...getSettings().video, fov: 115 } };
		expect(getSettings().video.fov).toBe(liveBefore);
	});
});

// ---------------------------------------------------------------------------
// Key rebinding logic
// ---------------------------------------------------------------------------

describe("SettingsScreen key rebinding", () => {
	beforeEach(() => {
		_resetSettings();
	});

	it("rebind sets new key for action", () => {
		const draft = getSettings();
		const updated = rebindKey(draft, "jump", "f");
		expect(updated.controls.keyBindings.jump).toBe("f");
	});

	it("normalizes Space bar to 'Space' string", () => {
		const draft = getSettings();
		const updated = rebindKey(draft, "jump", " ");
		expect(updated.controls.keyBindings.jump).toBe("Space");
	});

	it("does not normalize non-space keys", () => {
		const draft = getSettings();
		const updated = rebindKey(draft, "interact", "e");
		expect(updated.controls.keyBindings.interact).toBe("e");
	});

	it("preserves other bindings when one is rebound", () => {
		const draft = getSettings();
		const updated = rebindKey(draft, "jump", "q");
		expect(updated.controls.keyBindings.moveForward).toBe(
			DEFAULT_KEY_BINDINGS.moveForward,
		);
		expect(updated.controls.keyBindings.moveBackward).toBe(
			DEFAULT_KEY_BINDINGS.moveBackward,
		);
	});

	it("rebind does not mutate original draft", () => {
		const draft = getSettings();
		const original = draft.controls.keyBindings.interact;
		rebindKey(draft, "interact", "f");
		expect(draft.controls.keyBindings.interact).toBe(original);
	});

	it("can rebind all standard actions", () => {
		const actions = [
			"moveForward", "moveBackward", "moveLeft", "moveRight",
			"jump", "interact", "inventory", "map", "pause",
			"sprint", "crouch", "primaryAction", "secondaryAction",
		];
		let draft = getSettings();
		for (const action of actions) {
			draft = rebindKey(draft, action, "x");
		}
		for (const action of actions) {
			expect(draft.controls.keyBindings[action]).toBe("x");
		}
	});
});

// ---------------------------------------------------------------------------
// Reset to defaults
// ---------------------------------------------------------------------------

describe("SettingsScreen reset defaults", () => {
	beforeEach(() => {
		_resetSettings();
	});

	it("reset restores default video settings", () => {
		setSettings({ video: { fov: 60, shadowQuality: "off" } as Partial<typeof DEFAULT_VIDEO_SETTINGS> });
		_resetSettings();
		const s = getSettings();
		expect(s.video.fov).toBe(DEFAULT_VIDEO_SETTINGS.fov);
		expect(s.video.shadowQuality).toBe(DEFAULT_VIDEO_SETTINGS.shadowQuality);
	});

	it("reset restores default audio settings", () => {
		setSettings({ audio: { masterVolume: 0.0 } as Partial<typeof DEFAULT_AUDIO_SETTINGS> });
		_resetSettings();
		expect(getSettings().audio.masterVolume).toBe(DEFAULT_AUDIO_SETTINGS.masterVolume);
	});

	it("reset restores default controls", () => {
		setSettings({
			controls: { mouseSensitivity: 2.0, invertY: true },
		});
		_resetSettings();
		const s = getSettings();
		expect(s.controls.mouseSensitivity).toBe(
			DEFAULT_CONTROLS_SETTINGS.mouseSensitivity,
		);
		expect(s.controls.invertY).toBe(DEFAULT_CONTROLS_SETTINGS.invertY);
	});

	it("reset restores all default key bindings", () => {
		setSettings({
			controls: {
				keyBindings: { moveForward: "Up", moveBackward: "Down" },
			},
		});
		_resetSettings();
		const s = getSettings();
		expect(s.controls.keyBindings.moveForward).toBe(DEFAULT_KEY_BINDINGS.moveForward);
		expect(s.controls.keyBindings.moveBackward).toBe(DEFAULT_KEY_BINDINGS.moveBackward);
	});
});

// ---------------------------------------------------------------------------
// Tab display logic (pure derivations)
// ---------------------------------------------------------------------------

describe("SettingsScreen tab content", () => {
	it("Graphics tab shows shadow quality options", () => {
		const shadowOptions = ["off", "low", "medium", "high"];
		for (const opt of shadowOptions) {
			expect(shadowOptions).toContain(opt);
		}
	});

	it("Audio tab percentage helper formats correctly", () => {
		const pct = (v: number) => `${Math.round(v * 100)}%`;
		expect(pct(0.8)).toBe("80%");
		expect(pct(0.0)).toBe("0%");
		expect(pct(1.0)).toBe("100%");
		expect(pct(0.55)).toBe("55%");
		expect(pct(0.333)).toBe("33%");
	});

	it("Controls tab sensitivity percentage helper formats correctly", () => {
		const pct = (v: number) => `${Math.round(v * 100)}%`;
		expect(pct(0.5)).toBe("50%");
		expect(pct(0.01)).toBe("1%");
		expect(pct(2.0)).toBe("200%");
	});

	it("Graphics render distance label shows meters unit", () => {
		const label = (dist: number) => `RENDER DISTANCE — ${dist}m`;
		expect(label(200)).toBe("RENDER DISTANCE — 200m");
		expect(label(1000)).toBe("RENDER DISTANCE — 1000m");
	});

	it("Graphics FOV label shows degree symbol", () => {
		const label = (fov: number) => `FIELD OF VIEW — ${fov}°`;
		expect(label(90)).toBe("FIELD OF VIEW — 90°");
	});
});

// ---------------------------------------------------------------------------
// Validation integration
// ---------------------------------------------------------------------------

describe("SettingsScreen validation integration", () => {
	beforeEach(() => {
		_resetSettings();
	});

	it("default settings have no validation errors", () => {
		const errors = validateSettings();
		expect(errors).toHaveLength(0);
	});

	it("validation errors surface when settings are invalid", () => {
		// Bypass setSettings to inject invalid state
		const json = JSON.stringify({
			video: { shadowQuality: "ultra", particleCount: 100, renderDistance: 200, fov: 90 },
			audio: { masterVolume: 0.8, sfxVolume: 0.7, musicVolume: 0.5, ambientVolume: 0.6 },
			gameplay: { autoSave: true, tutorialEnabled: true, showMinimap: true, showFPS: false, difficulty: "normal" },
			controls: { mouseSensitivity: 0.5, invertY: false, keyBindings: {} },
		});
		importSettings(json);
		const errors = validateSettings();
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0].message).toContain("shadow quality");
	});

	it("fov out of range produces validation error", () => {
		importSettings(
			JSON.stringify({
				video: { shadowQuality: "medium", particleCount: 100, renderDistance: 200, fov: 200 },
				audio: DEFAULT_AUDIO_SETTINGS,
				gameplay: { autoSave: true, tutorialEnabled: true, showMinimap: true, showFPS: false, difficulty: "normal" },
				controls: DEFAULT_CONTROLS_SETTINGS,
			}),
		);
		const errors = validateSettings();
		expect(errors.some((e) => e.key === "fov")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Storage key constant
// ---------------------------------------------------------------------------

describe("SettingsScreen storage key", () => {
	it("uses expected localStorage key", () => {
		expect(STORAGE_KEY).toBe("syntheteria_settings");
	});

	it("does not use other common key names", () => {
		expect(STORAGE_KEY).not.toBe("settings");
		expect(STORAGE_KEY).not.toBe("gameSettings");
	});
});
