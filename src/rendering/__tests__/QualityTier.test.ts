/**
 * @jest-environment jsdom
 *
 * Unit tests for QualityTier.ts
 *
 * Tests cover:
 *   - detectQualityTier: low/medium/high detection from browser signals
 *   - setQualityTier: override
 *   - adjustTierByPerformance: up/down adjustment
 *   - getQualitySettings: returns correct rendering and audio config values
 *   - getRenderingQuality / getAudioQuality: per-domain accessors
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock config imports — keeps tests independent of JSON content changes
jest.mock("../../../config/rendering.json", () => ({
	qualityTiers: {
		high: {
			shadowMapSize: 1024,
			maxParticles: 500,
			lodDistances: [20, 50, 100],
			instancedBatchSize: 100,
			renderDistance: 200,
			antialias: true,
			postProcessing: true,
		},
		medium: {
			shadowMapSize: 512,
			maxParticles: 200,
			lodDistances: [15, 35, 70],
			instancedBatchSize: 64,
			renderDistance: 120,
			antialias: true,
			postProcessing: false,
		},
		low: {
			shadowMapSize: 256,
			maxParticles: 80,
			lodDistances: [10, 25, 50],
			instancedBatchSize: 32,
			renderDistance: 80,
			antialias: false,
			postProcessing: false,
		},
	},
}));

jest.mock("../../../config/audio.json", () => ({
	qualityTiers: {
		high: {
			maxPolyphony: 32,
			spatialAudioEnabled: true,
			biomeAmbienceEnabled: true,
			adaptiveMusicEnabled: true,
			reverbEnabled: true,
		},
		medium: {
			maxPolyphony: 16,
			spatialAudioEnabled: true,
			biomeAmbienceEnabled: true,
			adaptiveMusicEnabled: true,
			reverbEnabled: false,
		},
		low: {
			maxPolyphony: 8,
			spatialAudioEnabled: false,
			biomeAmbienceEnabled: false,
			adaptiveMusicEnabled: true,
			reverbEnabled: false,
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	detectQualityTier,
	setQualityTier,
	adjustTierByPerformance,
	getQualityTier,
	getQualitySettings,
	getRenderingQuality,
	getAudioQuality,
	_resetQualityTier,
} from "../QualityTier";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockNavigator(overrides: {
	hardwareConcurrency?: number;
	deviceMemory?: number;
}) {
	Object.defineProperty(navigator, "hardwareConcurrency", {
		configurable: true,
		value: overrides.hardwareConcurrency ?? 8,
	});
	if (overrides.deviceMemory !== undefined) {
		Object.defineProperty(navigator, "deviceMemory", {
			configurable: true,
			value: overrides.deviceMemory,
		});
	} else {
		// Remove the property so it is undefined
		Object.defineProperty(navigator, "deviceMemory", {
			configurable: true,
			value: undefined,
		});
	}
}

function mockMatchMedia(coarse: boolean) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: jest.fn((query: string) => ({
			matches: query === "(pointer: coarse)" ? coarse : false,
			media: query,
			addListener: jest.fn(),
			removeListener: jest.fn(),
		})),
	});
}

function mockDPR(dpr: number) {
	Object.defineProperty(window, "devicePixelRatio", {
		configurable: true,
		value: dpr,
	});
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetQualityTier();
	mockNavigator({ hardwareConcurrency: 8 });
	mockMatchMedia(false);
	mockDPR(1);
});

// ---------------------------------------------------------------------------
// detectQualityTier
// ---------------------------------------------------------------------------

describe("detectQualityTier", () => {
	it("returns high on desktop (non-touch, DPR 1, 8 cores)", () => {
		expect(detectQualityTier()).toBe("high");
	});

	it("returns low when deviceMemory < 4", () => {
		mockNavigator({ hardwareConcurrency: 8, deviceMemory: 2 });
		expect(detectQualityTier()).toBe("low");
	});

	it("returns low when touch + DPR 3 + 4 cores", () => {
		mockMatchMedia(true);
		mockDPR(3);
		mockNavigator({ hardwareConcurrency: 4 });
		expect(detectQualityTier()).toBe("low");
	});

	it("returns medium when touch + DPR 2 + 6 cores", () => {
		mockMatchMedia(true);
		mockDPR(2);
		mockNavigator({ hardwareConcurrency: 6 });
		expect(detectQualityTier()).toBe("medium");
	});

	it("returns medium when touch-only (DPR 1, many cores)", () => {
		mockMatchMedia(true);
		mockDPR(1);
		mockNavigator({ hardwareConcurrency: 8 });
		expect(detectQualityTier()).toBe("medium");
	});

	it("updates getQualityTier after detection", () => {
		mockNavigator({ hardwareConcurrency: 8, deviceMemory: 2 });
		detectQualityTier();
		expect(getQualityTier()).toBe("low");
	});
});

// ---------------------------------------------------------------------------
// setQualityTier
// ---------------------------------------------------------------------------

describe("setQualityTier", () => {
	it("overrides tier to medium", () => {
		setQualityTier("medium");
		expect(getQualityTier()).toBe("medium");
	});

	it("overrides tier to low", () => {
		setQualityTier("low");
		expect(getQualityTier()).toBe("low");
	});

	it("overrides tier to high", () => {
		setQualityTier("medium");
		setQualityTier("high");
		expect(getQualityTier()).toBe("high");
	});
});

// ---------------------------------------------------------------------------
// adjustTierByPerformance
// ---------------------------------------------------------------------------

describe("adjustTierByPerformance", () => {
	it("downgrades high → medium when factor < 0.5", () => {
		setQualityTier("high");
		adjustTierByPerformance(0.4);
		expect(getQualityTier()).toBe("medium");
	});

	it("downgrades medium → low when factor < 0.5", () => {
		setQualityTier("medium");
		adjustTierByPerformance(0.3);
		expect(getQualityTier()).toBe("low");
	});

	it("does not downgrade below low", () => {
		setQualityTier("low");
		adjustTierByPerformance(0.1);
		expect(getQualityTier()).toBe("low");
	});

	it("upgrades low → medium when factor > 0.9", () => {
		setQualityTier("low");
		adjustTierByPerformance(0.95);
		expect(getQualityTier()).toBe("medium");
	});

	it("upgrades medium → high when factor > 0.9", () => {
		setQualityTier("medium");
		adjustTierByPerformance(0.95);
		expect(getQualityTier()).toBe("high");
	});

	it("does not upgrade above high", () => {
		setQualityTier("high");
		adjustTierByPerformance(0.99);
		expect(getQualityTier()).toBe("high");
	});

	it("is no-op in the middle range (0.5 to 0.9)", () => {
		setQualityTier("medium");
		adjustTierByPerformance(0.7);
		expect(getQualityTier()).toBe("medium");
	});
});

// ---------------------------------------------------------------------------
// getQualitySettings
// ---------------------------------------------------------------------------

describe("getQualitySettings", () => {
	it("returns correct tier name", () => {
		setQualityTier("medium");
		expect(getQualitySettings().tier).toBe("medium");
	});

	it("high tier: shadowMapSize 1024, maxPolyphony 32", () => {
		setQualityTier("high");
		const s = getQualitySettings();
		expect(s.rendering.shadowMapSize).toBe(1024);
		expect(s.audio.maxPolyphony).toBe(32);
	});

	it("low tier: shadowMapSize 256, spatialAudio disabled", () => {
		setQualityTier("low");
		const s = getQualitySettings();
		expect(s.rendering.shadowMapSize).toBe(256);
		expect(s.audio.spatialAudioEnabled).toBe(false);
	});

	it("medium tier: postProcessing false, reverbEnabled false", () => {
		setQualityTier("medium");
		const s = getQualitySettings();
		expect(s.rendering.postProcessing).toBe(false);
		expect(s.audio.reverbEnabled).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getRenderingQuality / getAudioQuality
// ---------------------------------------------------------------------------

describe("getRenderingQuality", () => {
	it("returns rendering fields for current tier", () => {
		setQualityTier("low");
		const r = getRenderingQuality();
		expect(r.maxParticles).toBe(80);
		expect(r.antialias).toBe(false);
	});
});

describe("getAudioQuality", () => {
	it("returns audio fields for current tier", () => {
		setQualityTier("high");
		const a = getAudioQuality();
		expect(a.reverbEnabled).toBe(true);
		expect(a.spatialAudioEnabled).toBe(true);
	});
});
