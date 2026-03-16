import {
	_resetAudioEngine,
	disposeAudio,
	getAmbientOutput,
	getAmbientVolumeLevel,
	getMasterVolume,
	getMusicOutput,
	getMusicVolumeLevel,
	getSfxOutput,
	getSfxVolumeLevel,
	initAudio,
	isAudioInitialized,
	setAmbientVolume,
	setMasterVolume,
	setMusicVolume,
	setSfxVolume,
} from "./audioEngine";

// ─── Mock Tone.js ────────────────────────────────────────────────────────────

const mockGainNode = {
	gain: { value: 1 },
	connect: jest.fn().mockReturnThis(),
	toDestination: jest.fn().mockReturnThis(),
	dispose: jest.fn(),
};

jest.mock("tone", () => ({
	start: jest.fn().mockResolvedValue(undefined),
	Gain: jest.fn(() => ({ ...mockGainNode })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("audioEngine", () => {
	beforeEach(() => {
		_resetAudioEngine();
		jest.clearAllMocks();
	});

	describe("initAudio", () => {
		it("should initialize the audio engine", async () => {
			expect(isAudioInitialized()).toBe(false);
			await initAudio();
			expect(isAudioInitialized()).toBe(true);
		});

		it("should be idempotent", async () => {
			await initAudio();
			await initAudio();
			expect(isAudioInitialized()).toBe(true);
			// Tone.start called only once
			const Tone = require("tone");
			expect(Tone.start).toHaveBeenCalledTimes(1);
		});

		it("should create gain nodes after init", async () => {
			expect(getSfxOutput()).toBeNull();
			expect(getMusicOutput()).toBeNull();
			expect(getAmbientOutput()).toBeNull();

			await initAudio();

			expect(getSfxOutput()).not.toBeNull();
			expect(getMusicOutput()).not.toBeNull();
			expect(getAmbientOutput()).not.toBeNull();
		});
	});

	describe("volume controls", () => {
		it("should have correct default volumes", () => {
			expect(getMasterVolume()).toBe(0.8);
			expect(getSfxVolumeLevel()).toBe(0.7);
			expect(getMusicVolumeLevel()).toBe(0.5);
			expect(getAmbientVolumeLevel()).toBe(0.6);
		});

		it("should set master volume", () => {
			setMasterVolume(0.5);
			expect(getMasterVolume()).toBe(0.5);
		});

		it("should set SFX volume", () => {
			setSfxVolume(0.3);
			expect(getSfxVolumeLevel()).toBe(0.3);
		});

		it("should set music volume", () => {
			setMusicVolume(0.8);
			expect(getMusicVolumeLevel()).toBe(0.8);
		});

		it("should set ambient volume", () => {
			setAmbientVolume(0.2);
			expect(getAmbientVolumeLevel()).toBe(0.2);
		});

		it("should clamp volume between 0 and 1", () => {
			setMasterVolume(-0.5);
			expect(getMasterVolume()).toBe(0);

			setMasterVolume(1.5);
			expect(getMasterVolume()).toBe(1);
		});
	});

	describe("disposeAudio", () => {
		it("should reset initialized state", async () => {
			await initAudio();
			expect(isAudioInitialized()).toBe(true);

			disposeAudio();
			expect(isAudioInitialized()).toBe(false);
		});

		it("should set outputs to null after dispose", async () => {
			await initAudio();
			disposeAudio();

			expect(getSfxOutput()).toBeNull();
			expect(getMusicOutput()).toBeNull();
			expect(getAmbientOutput()).toBeNull();
		});
	});
});
