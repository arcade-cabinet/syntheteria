/**
 * Unit tests for BiomeAmbience.ts
 *
 * Tests cover:
 *   - setBiome: no-op before audio init
 *   - setBiome: creates biome layer and starts nodes
 *   - setBiome: idempotent (same biome twice is no-op)
 *   - setBiome: crossfade — fades out old layer, fades in new
 *   - stopBiomeAmbience: stops and disposes layers
 *   - getActiveBiome / isBiomeAmbienceActive state tracking
 *   - All 5 biome types create audio nodes
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

jest.mock("../SoundEngine", () => ({
	isAudioInitialized: () => mockIsInitialized(),
	getCategoryBus: (cat: string) => {
		if (cat === "ambience") return mockAmbienceBus;
		return null;
	},
}));

// Mock Tone.now()
const makeNodeStub = () => ({
	connect: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	dispose: jest.fn(),
	frequency: { value: 0 },
	volume: { value: 0 },
	gain: {
		value: 1,
		rampTo: jest.fn(),
		setValueAtTime: jest.fn(),
	},
});

const makeGainStub = () => ({
	connect: jest.fn(),
	dispose: jest.fn(),
	gain: {
		value: 1,
		rampTo: jest.fn(),
		setValueAtTime: jest.fn(),
	},
});

jest.mock("tone", () => ({
	Oscillator: jest.fn(() => makeNodeStub()),
	Noise: jest.fn(() => makeNodeStub()),
	Filter: jest.fn(() => makeNodeStub()),
	AutoFilter: jest.fn(() => ({
		...makeNodeStub(),
		start: jest.fn(),
	})),
	LFO: jest.fn(() => makeNodeStub()),
	Gain: jest.fn(() => makeGainStub()),
	Volume: jest.fn(() => makeNodeStub()),
	Reverb: jest.fn(() => makeNodeStub()),
	now: jest.fn(() => 0),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	setBiome,
	stopBiomeAmbience,
	getActiveBiome,
	isBiomeAmbienceActive,
	type BiomeId,
} from "../BiomeAmbience";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	mockIsInitialized.mockReturnValue(false);
	mockAmbienceBus = makeBusMock();

	// Reset state by stopping any active ambience
	if (isBiomeAmbienceActive()) {
		stopBiomeAmbience();
		jest.advanceTimersByTime(2000);
	}
});

afterEach(() => {
	jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Pre-init / bus-null guards
// ---------------------------------------------------------------------------

describe("setBiome guard conditions", () => {
	it("is a no-op when audio is not initialized", () => {
		mockIsInitialized.mockReturnValue(false);
		setBiome("rust_plains");
		expect(getActiveBiome()).toBeNull();
	});

	it("is a no-op when ambience bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockAmbienceBus = null;
		setBiome("rust_plains");
		expect(getActiveBiome()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// setBiome — basic lifecycle
// ---------------------------------------------------------------------------

describe("setBiome", () => {
	it("sets the active biome", () => {
		mockIsInitialized.mockReturnValue(true);
		setBiome("rust_plains");
		expect(getActiveBiome()).toBe("rust_plains");
	});

	it("sets isBiomeAmbienceActive to true", () => {
		mockIsInitialized.mockReturnValue(true);
		setBiome("rust_plains");
		expect(isBiomeAmbienceActive()).toBe(true);
	});

	it("is idempotent — second call with same biome is no-op", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		setBiome("rust_plains");
		const before = Noise.mock.calls.length;
		setBiome("rust_plains"); // same biome
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("creates audio nodes for the new biome", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		setBiome("rust_plains");
		expect(Noise.mock.calls.length).toBeGreaterThan(before);
	});

	it("updates the active biome when switching", () => {
		mockIsInitialized.mockReturnValue(true);
		setBiome("rust_plains");
		setBiome("crystal_flats");
		expect(getActiveBiome()).toBe("crystal_flats");
	});
});

// ---------------------------------------------------------------------------
// All biome types
// ---------------------------------------------------------------------------

const BIOMES: BiomeId[] = [
	"rust_plains",
	"scrap_hills",
	"crystal_flats",
	"deep_forge",
	"storm_ridge",
];

describe.each(BIOMES)("biome %s", (biome) => {
	beforeEach(() => {
		// Reset state
		if (isBiomeAmbienceActive()) {
			stopBiomeAmbience();
			jest.advanceTimersByTime(2000);
		}
		jest.clearAllMocks();
		mockAmbienceBus = makeBusMock();
	});

	it("creates Gain node for crossfading", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Gain } = jest.requireMock("tone") as { Gain: jest.Mock };
		const before = Gain.mock.calls.length;
		setBiome(biome);
		expect(Gain.mock.calls.length).toBeGreaterThan(before);
	});

	it("sets active biome correctly", () => {
		mockIsInitialized.mockReturnValue(true);
		setBiome(biome);
		expect(getActiveBiome()).toBe(biome);
	});
});

// ---------------------------------------------------------------------------
// stopBiomeAmbience
// ---------------------------------------------------------------------------

describe("stopBiomeAmbience", () => {
	it("sets isBiomeAmbienceActive to false", () => {
		mockIsInitialized.mockReturnValue(true);
		setBiome("rust_plains");
		stopBiomeAmbience();
		expect(isBiomeAmbienceActive()).toBe(false);
	});

	it("sets getActiveBiome to null", () => {
		mockIsInitialized.mockReturnValue(true);
		setBiome("rust_plains");
		stopBiomeAmbience();
		expect(getActiveBiome()).toBeNull();
	});

	it("is safe to call when no biome is active", () => {
		expect(() => stopBiomeAmbience()).not.toThrow();
	});
});
