jest.mock("tone", () => ({
	start: jest.fn(),
	Gain: jest.fn().mockImplementation(() => ({
		toDestination: jest.fn().mockReturnThis(),
		connect: jest.fn().mockReturnThis(),
		gain: { value: 1 },
		dispose: jest.fn(),
	})),
}));

import {
	_resetAudioEngine,
	getAmbientVolumeLevel,
	getMasterVolume,
	getMusicVolumeLevel,
	getSfxVolumeLevel,
	setAmbientVolume,
	setMasterVolume,
	setMusicVolume,
	setSfxVolume,
} from "../../audio/audioEngine";
import { KEY_BINDINGS } from "../../systems/keyboardShortcuts";

/**
 * SettingsScreen reads/writes volumes through the audioEngine API.
 * These tests verify the API contract that the UI relies on.
 */
describe("SettingsScreen audio contract", () => {
	afterEach(() => {
		_resetAudioEngine();
	});

	it("reads default volume levels", () => {
		expect(getMasterVolume()).toBe(0.8);
		expect(getSfxVolumeLevel()).toBe(0.7);
		expect(getMusicVolumeLevel()).toBe(0.5);
		expect(getAmbientVolumeLevel()).toBe(0.6);
	});

	it("sets and reads master volume", () => {
		setMasterVolume(0.3);
		expect(getMasterVolume()).toBe(0.3);
	});

	it("sets and reads sfx volume", () => {
		setSfxVolume(0.9);
		expect(getSfxVolumeLevel()).toBe(0.9);
	});

	it("sets and reads music volume", () => {
		setMusicVolume(0.1);
		expect(getMusicVolumeLevel()).toBe(0.1);
	});

	it("sets and reads ambient volume", () => {
		setAmbientVolume(0.45);
		expect(getAmbientVolumeLevel()).toBe(0.45);
	});

	it("clamps volume to 0-1", () => {
		setMasterVolume(-0.5);
		expect(getMasterVolume()).toBe(0);
		setMasterVolume(1.5);
		expect(getMasterVolume()).toBe(1);
	});

	it("resets to defaults", () => {
		setMasterVolume(0.1);
		setSfxVolume(0.2);
		setMusicVolume(0.3);
		setAmbientVolume(0.4);

		_resetAudioEngine();

		expect(getMasterVolume()).toBe(0.8);
		expect(getSfxVolumeLevel()).toBe(0.7);
		expect(getMusicVolumeLevel()).toBe(0.5);
		expect(getAmbientVolumeLevel()).toBe(0.6);
	});
});

describe("SettingsScreen keybindings contract", () => {
	it("KEY_BINDINGS has expected shape", () => {
		expect(KEY_BINDINGS.length).toBeGreaterThan(0);
		for (const bind of KEY_BINDINGS) {
			expect(bind).toHaveProperty("key");
			expect(bind).toHaveProperty("label");
			expect(bind).toHaveProperty("description");
			expect(typeof bind.key).toBe("string");
			expect(typeof bind.label).toBe("string");
			expect(typeof bind.description).toBe("string");
		}
	});

	it("includes Tab, Enter, Escape bindings", () => {
		const keys = KEY_BINDINGS.map((b) => b.key);
		expect(keys).toContain("Tab");
		expect(keys).toContain("Enter");
		expect(keys).toContain("Escape");
	});
});
