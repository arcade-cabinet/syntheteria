/**
 * Unit tests for StormAmbience.ts
 *
 * Tests cover:
 *   - startStormAmbience: no-op before audio init, starts layers after init
 *   - startStormAmbience: idempotent (calling twice is a no-op)
 *   - stopStormAmbience: stops and nulls all layers
 *   - stopStormAmbience: safe to call before start
 *   - isStormAmbienceStarted reflects state
 *   - updateStormAudio: modulates wind/rain/crackle volume based on intensity
 *   - updateStormAudio: no-op when not started
 *   - playThunder: no-op before init, creates noise chain after init
 *   - playElectricalCrackle: no-op before init, creates noise chain after init
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIsInitialized = jest.fn(() => false);

const makeBusMock = () => ({
	volume: { value: 0 },
	connect: jest.fn(),
	dispose: jest.fn(),
});

let mockAmbienceBus: ReturnType<typeof makeBusMock> | null = null;
let mockSfxBus: ReturnType<typeof makeBusMock> | null = null;

jest.mock("../SoundEngine", () => ({
	isAudioInitialized: () => mockIsInitialized(),
	getCategoryBus: (cat: string) => {
		if (cat === "ambience") return mockAmbienceBus;
		if (cat === "sfx") return mockSfxBus;
		return null;
	},
}));

// Shared node stubs
const makeNodeStub = () => ({
	connect: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	dispose: jest.fn(),
	frequency: { value: 0 },
	volume: { value: 0 },
	gain: { value: 1 },
});

const makeAutoFilterStub = () => ({
	connect: jest.fn(),
	start: jest.fn(),
	dispose: jest.fn(),
	frequency: { value: 0.15 },
});

jest.mock("tone", () => {
	const makeNode = () => ({
		connect: jest.fn(),
		start: jest.fn(),
		stop: jest.fn(),
		dispose: jest.fn(),
		frequency: { value: 0 },
		volume: { value: 0 },
		gain: { value: 1 },
		triggerAttackRelease: jest.fn(),
	});
	return {
		Noise: jest.fn(makeNode),
		AutoFilter: jest.fn(() => ({
			connect: jest.fn(),
			start: jest.fn(),
			dispose: jest.fn(),
			frequency: { value: 0.15 },
		})),
		Filter: jest.fn(makeNode),
		Volume: jest.fn(makeNode),
		Gain: jest.fn(makeNode),
		LFO: jest.fn(makeNode),
		AmplitudeEnvelope: jest.fn(makeNode),
		BitCrusher: jest.fn(makeNode),
	};
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	startStormAmbience,
	stopStormAmbience,
	isStormAmbienceStarted,
	updateStormAudio,
	playThunder,
	playElectricalCrackle,
} from "../StormAmbience";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	mockIsInitialized.mockReturnValue(false);
	mockAmbienceBus = makeBusMock();
	mockSfxBus = makeBusMock();

	// Ensure clean state — stop if running
	if (isStormAmbienceStarted()) {
		stopStormAmbience();
	}
});

afterEach(() => {
	if (isStormAmbienceStarted()) {
		stopStormAmbience();
	}
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("startStormAmbience", () => {
	it("does nothing when audio is not initialized", () => {
		mockIsInitialized.mockReturnValue(false);
		startStormAmbience();
		expect(isStormAmbienceStarted()).toBe(false);
	});

	it("does nothing when ambience bus is not available", () => {
		mockIsInitialized.mockReturnValue(true);
		mockAmbienceBus = null;
		startStormAmbience();
		expect(isStormAmbienceStarted()).toBe(false);
	});

	it("sets isStormAmbienceStarted to true when bus is ready", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();
		expect(isStormAmbienceStarted()).toBe(true);
	});

	it("is idempotent — calling twice does not restart", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const firstCallCount = Noise.mock.calls.length;

		startStormAmbience(); // second call — should be no-op
		expect(Noise.mock.calls.length).toBe(firstCallCount);
	});

	it("creates noise nodes for wind, rain, and crackle layers", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();

		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		// brown (wind) + pink (rain) + white (crackle) = 3
		expect(Noise.mock.calls.length).toBeGreaterThanOrEqual(3);
		const types = Noise.mock.calls.map(([t]: [string]) => t);
		expect(types).toContain("brown");
		expect(types).toContain("pink");
		expect(types).toContain("white");
	});
});

describe("stopStormAmbience", () => {
	it("sets isStormAmbienceStarted to false", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();
		stopStormAmbience();
		expect(isStormAmbienceStarted()).toBe(false);
	});

	it("is safe to call before start", () => {
		expect(() => stopStormAmbience()).not.toThrow();
		expect(isStormAmbienceStarted()).toBe(false);
	});

	it("is safe to call twice", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();
		stopStormAmbience();
		expect(() => stopStormAmbience()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// updateStormAudio
// ---------------------------------------------------------------------------

describe("updateStormAudio", () => {
	it("is a no-op when storm ambience is not started", () => {
		// Just ensure no throw
		expect(() => updateStormAudio(0.5)).not.toThrow();
	});

	it("sets wind volume near -24 dB at intensity 0", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();

		const { Volume } = jest.requireMock("tone") as { Volume: jest.Mock };
		// The first Volume instance created is windVolume
		const windVol = Volume.mock.results[0]?.value as { volume: { value: number } };

		updateStormAudio(0);
		// t = 0 / 1.5 = 0; windVolume.volume.value = -24 + 0 * 20 = -24
		expect(windVol.volume.value).toBeCloseTo(-24, 0);
	});

	it("increases wind volume at higher intensity", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();

		const { Volume } = jest.requireMock("tone") as { Volume: jest.Mock };
		const windVol = Volume.mock.results[0]?.value as { volume: { value: number } };

		updateStormAudio(0);
		const volAt0 = windVol.volume.value;

		updateStormAudio(1.5);
		const volAt1_5 = windVol.volume.value;

		expect(volAt1_5).toBeGreaterThan(volAt0);
	});

	it("clamps storm intensity at 1.5 (max)", () => {
		mockIsInitialized.mockReturnValue(true);
		startStormAmbience();

		const { Volume } = jest.requireMock("tone") as { Volume: jest.Mock };
		const windVol = Volume.mock.results[0]?.value as { volume: { value: number } };

		updateStormAudio(1.5);
		const volAt1_5 = windVol.volume.value;

		updateStormAudio(100); // way above max
		const volAt100 = windVol.volume.value;

		expect(volAt100).toBe(volAt1_5);
	});
});

// ---------------------------------------------------------------------------
// One-shot events
// ---------------------------------------------------------------------------

describe("playThunder", () => {
	it("is a no-op when audio is not initialized", () => {
		mockIsInitialized.mockReturnValue(false);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playThunder();
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("is a no-op when ambience bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockAmbienceBus = null;
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playThunder();
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("creates noise nodes when initialized and bus is ready", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playThunder();
		expect(Noise.mock.calls.length).toBeGreaterThan(before);
	});
});

describe("playElectricalCrackle", () => {
	it("is a no-op when audio is not initialized", () => {
		mockIsInitialized.mockReturnValue(false);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playElectricalCrackle();
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("is a no-op when sfx bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockSfxBus = null;
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playElectricalCrackle();
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("creates noise nodes when initialized and sfx bus is ready", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playElectricalCrackle();
		expect(Noise.mock.calls.length).toBeGreaterThan(before);
	});
});
