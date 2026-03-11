/**
 * Unit tests for AudioQuality.ts
 *
 * Tests cover:
 *   - applyAudioQuality: pushes tier settings into audio subsystems
 *   - acquireVoice / releaseVoice: polyphony limiting
 *   - getActiveVoiceCount
 *   - isReverbAllowed / isSpatialAllowed / getMaxPolyphony
 *   - biome ambience stops on low tier
 *   - adaptive music stop/restart on tier change
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetAudioQuality = jest.fn();

jest.mock("../../rendering/QualityTier", () => ({
	getAudioQuality: () => mockGetAudioQuality(),
}));

const mockStopBiomeAmbience = jest.fn();
const mockGetActiveBiome = jest.fn(() => null);
const mockSetBiome = jest.fn();

jest.mock("../BiomeAmbience", () => ({
	stopBiomeAmbience: () => mockStopBiomeAmbience(),
	getActiveBiome: () => mockGetActiveBiome(),
	setBiome: (b: string) => mockSetBiome(b),
}));

const mockIsAdaptiveMusicRunning = jest.fn(() => false);
const mockStopAdaptiveMusic = jest.fn();
const mockStartAdaptiveMusic = jest.fn();
const mockGetMusicState = jest.fn<any, any[]>(() => null);
const mockSetMusicState = jest.fn();

jest.mock("../AdaptiveMusic", () => ({
	isAdaptiveMusicRunning: () => mockIsAdaptiveMusicRunning(),
	stopAdaptiveMusic: () => mockStopAdaptiveMusic(),
	startAdaptiveMusic: () => mockStartAdaptiveMusic(),
	getMusicState: () => mockGetMusicState(),
	setMusicState: (s: string) => mockSetMusicState(s),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	applyAudioQuality,
	acquireVoice,
	releaseVoice,
	getActiveVoiceCount,
	isReverbAllowed,
	isSpatialAllowed,
	getMaxPolyphony,
	_resetAudioQuality,
} from "../AudioQuality";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const highQuality = {
	maxPolyphony: 32,
	spatialAudioEnabled: true,
	biomeAmbienceEnabled: true,
	adaptiveMusicEnabled: true,
	reverbEnabled: true,
};

const mediumQuality = {
	maxPolyphony: 16,
	spatialAudioEnabled: true,
	biomeAmbienceEnabled: true,
	adaptiveMusicEnabled: true,
	reverbEnabled: false,
};

const lowQuality = {
	maxPolyphony: 8,
	spatialAudioEnabled: false,
	biomeAmbienceEnabled: false,
	adaptiveMusicEnabled: true,
	reverbEnabled: false,
};

beforeEach(() => {
	jest.clearAllMocks();
	_resetAudioQuality();
	mockGetAudioQuality.mockReturnValue(highQuality);
});

// ---------------------------------------------------------------------------
// applyAudioQuality — feature flags
// ---------------------------------------------------------------------------

describe("applyAudioQuality", () => {
	it("sets reverbEnabled from quality tier", () => {
		mockGetAudioQuality.mockReturnValue(mediumQuality);
		applyAudioQuality();
		expect(isReverbAllowed()).toBe(false);
	});

	it("sets spatialAudioEnabled from quality tier", () => {
		mockGetAudioQuality.mockReturnValue(lowQuality);
		applyAudioQuality();
		expect(isSpatialAllowed()).toBe(false);
	});

	it("sets maxPolyphony from quality tier", () => {
		mockGetAudioQuality.mockReturnValue(lowQuality);
		applyAudioQuality();
		expect(getMaxPolyphony()).toBe(8);
	});

	it("high tier: all features enabled", () => {
		mockGetAudioQuality.mockReturnValue(highQuality);
		applyAudioQuality();
		expect(isReverbAllowed()).toBe(true);
		expect(isSpatialAllowed()).toBe(true);
		expect(getMaxPolyphony()).toBe(32);
	});
});

// ---------------------------------------------------------------------------
// applyAudioQuality — biome ambience
// ---------------------------------------------------------------------------

describe("applyAudioQuality — biome ambience", () => {
	it("stops biome ambience when tier does not support it", () => {
		mockGetAudioQuality.mockReturnValue(lowQuality);
		applyAudioQuality();
		expect(mockStopBiomeAmbience).toHaveBeenCalledTimes(1);
	});

	it("does not stop biome ambience on high tier", () => {
		mockGetAudioQuality.mockReturnValue(highQuality);
		applyAudioQuality();
		expect(mockStopBiomeAmbience).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// applyAudioQuality — adaptive music
// ---------------------------------------------------------------------------

describe("applyAudioQuality — adaptive music", () => {
	it("stops adaptive music when tier disables it and music is running", () => {
		mockGetAudioQuality.mockReturnValue({
			...highQuality,
			adaptiveMusicEnabled: false,
		});
		mockIsAdaptiveMusicRunning.mockReturnValue(true);
		applyAudioQuality();
		expect(mockStopAdaptiveMusic).toHaveBeenCalledTimes(1);
	});

	it("does not stop adaptive music when already stopped", () => {
		mockGetAudioQuality.mockReturnValue({
			...highQuality,
			adaptiveMusicEnabled: false,
		});
		mockIsAdaptiveMusicRunning.mockReturnValue(false);
		applyAudioQuality();
		expect(mockStopAdaptiveMusic).not.toHaveBeenCalled();
	});

	it("restarts adaptive music when re-enabled and state was set", () => {
		// First call: disable music (marks applied=true)
		mockGetAudioQuality.mockReturnValue({
			...highQuality,
			adaptiveMusicEnabled: false,
		});
		mockIsAdaptiveMusicRunning.mockReturnValue(true);
		applyAudioQuality();

		// Second call: re-enable, music is now stopped, last state was "build"
		_resetAudioQuality(); // reset applied flag and voices
		mockGetAudioQuality.mockReturnValue(highQuality);
		mockIsAdaptiveMusicRunning.mockReturnValue(false);
		mockGetMusicState.mockReturnValue("build");
		applyAudioQuality();

		expect(mockStartAdaptiveMusic).toHaveBeenCalledTimes(1);
		expect(mockSetMusicState).toHaveBeenCalledWith("build");
	});
});

// ---------------------------------------------------------------------------
// acquireVoice / releaseVoice
// ---------------------------------------------------------------------------

describe("acquireVoice / releaseVoice", () => {
	it("acquireVoice returns true when below polyphony limit", () => {
		applyAudioQuality(); // maxPolyphony = 32
		expect(acquireVoice()).toBe(true);
	});

	it("acquireVoice returns false when at polyphony limit", () => {
		mockGetAudioQuality.mockReturnValue({ ...highQuality, maxPolyphony: 2 });
		applyAudioQuality();
		acquireVoice(); // 1
		acquireVoice(); // 2 — at limit
		expect(acquireVoice()).toBe(false); // rejected
	});

	it("increments active voice count", () => {
		applyAudioQuality();
		acquireVoice();
		acquireVoice();
		expect(getActiveVoiceCount()).toBe(2);
	});

	it("releaseVoice decrements count", () => {
		applyAudioQuality();
		acquireVoice();
		acquireVoice();
		releaseVoice();
		expect(getActiveVoiceCount()).toBe(1);
	});

	it("releaseVoice does not go below zero", () => {
		applyAudioQuality();
		releaseVoice();
		releaseVoice();
		expect(getActiveVoiceCount()).toBe(0);
	});

	it("slot opens after release allows new voice", () => {
		mockGetAudioQuality.mockReturnValue({ ...highQuality, maxPolyphony: 1 });
		applyAudioQuality();
		acquireVoice(); // fills slot
		expect(acquireVoice()).toBe(false);
		releaseVoice(); // opens slot
		expect(acquireVoice()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Feature query defaults
// ---------------------------------------------------------------------------

describe("feature query defaults (before applyAudioQuality)", () => {
	it("isReverbAllowed defaults to true", () => {
		expect(isReverbAllowed()).toBe(true);
	});

	it("isSpatialAllowed defaults to true", () => {
		expect(isSpatialAllowed()).toBe(true);
	});

	it("getMaxPolyphony defaults to 32", () => {
		expect(getMaxPolyphony()).toBe(32);
	});
});
