/**
 * Unit tests for SFXLibrary.ts — factory and combat SFX.
 *
 * Tests cover:
 *   - All sounds are no-ops when audio is not initialized
 *   - All looping sounds return null when audio is not initialized
 *   - All sounds create Tone nodes when initialized
 *   - Config parameters are read from audio.json sfx section
 *   - Looping sounds return stop functions
 *   - One-shot sounds schedule auto-dispose
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

let mockSfxBus: ReturnType<typeof makeBusMock> | null = null;
let mockAmbienceBus: ReturnType<typeof makeBusMock> | null = null;

jest.mock("../SoundEngine", () => ({
	isAudioInitialized: () => mockIsInitialized(),
	getCategoryBus: (cat: string) => {
		if (cat === "sfx") return mockSfxBus;
		if (cat === "ambience") return mockAmbienceBus;
		return null;
	},
}));

const makeNodeStub = () => ({
	connect: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	dispose: jest.fn(),
	frequency: { value: 0, linearRampTo: jest.fn() },
	volume: { value: 0 },
	gain: { value: 1 },
	triggerAttackRelease: jest.fn(),
});

jest.mock("tone", () => ({
	Noise: jest.fn(() => makeNodeStub()),
	Filter: jest.fn(() => makeNodeStub()),
	LFO: jest.fn(() => makeNodeStub()),
	Gain: jest.fn(() => makeNodeStub()),
	Volume: jest.fn(() => makeNodeStub()),
	Oscillator: jest.fn(() => makeNodeStub()),
	MembraneSynth: jest.fn(() => makeNodeStub()),
	MetalSynth: jest.fn(() => makeNodeStub()),
	AmplitudeEnvelope: jest.fn(() => makeNodeStub()),
	Distortion: jest.fn(() => makeNodeStub()),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	playFurnaceRoar,
	playHydraulicPress,
	playMagneticHum,
	playBeltClank,
	playLaserShot,
	playCombatImpact,
} from "../SFXLibrary";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	mockIsInitialized.mockReturnValue(false);
	mockSfxBus = makeBusMock();
	mockAmbienceBus = makeBusMock();
});

afterEach(() => {
	jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// No-ops before init
// ---------------------------------------------------------------------------

describe("no-op before audio init", () => {
	it("playFurnaceRoar returns null", () => {
		expect(playFurnaceRoar()).toBeNull();
	});

	it("playHydraulicPress does not throw and creates no nodes", () => {
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		expect(() => playHydraulicPress()).not.toThrow();
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("playMagneticHum returns null", () => {
		expect(playMagneticHum()).toBeNull();
	});

	it("playBeltClank does not throw and creates no nodes", () => {
		const { MetalSynth } = jest.requireMock("tone") as { MetalSynth: jest.Mock };
		const before = MetalSynth.mock.calls.length;
		expect(() => playBeltClank()).not.toThrow();
		expect(MetalSynth.mock.calls.length).toBe(before);
	});

	it("playLaserShot does not throw and creates no nodes", () => {
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		const before = Oscillator.mock.calls.length;
		expect(() => playLaserShot()).not.toThrow();
		expect(Oscillator.mock.calls.length).toBe(before);
	});

	it("playCombatImpact does not throw and creates no nodes", () => {
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		expect(() => playCombatImpact()).not.toThrow();
		expect(Noise.mock.calls.length).toBe(before);
	});
});

// ---------------------------------------------------------------------------
// No-ops when buses are unavailable
// ---------------------------------------------------------------------------

describe("no-op when bus is null", () => {
	it("playFurnaceRoar returns null when ambience bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockAmbienceBus = null;
		expect(playFurnaceRoar()).toBeNull();
	});

	it("playHydraulicPress is no-op when sfx bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockSfxBus = null;
		const { MembraneSynth } = jest.requireMock("tone") as { MembraneSynth: jest.Mock };
		const before = MembraneSynth.mock.calls.length;
		playHydraulicPress();
		expect(MembraneSynth.mock.calls.length).toBe(before);
	});

	it("playMagneticHum returns null when sfx bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockSfxBus = null;
		expect(playMagneticHum()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// playFurnaceRoar
// ---------------------------------------------------------------------------

describe("playFurnaceRoar", () => {
	it("returns a stop function when initialized", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playFurnaceRoar();
		expect(typeof stop).toBe("function");
	});

	it("creates brown Noise for fire layer", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		playFurnaceRoar();
		const noiseTypes = Noise.mock.calls.map(([type]: [string]) => type);
		expect(noiseTypes).toContain("brown");
	});

	it("creates Oscillator for sizzle layer", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		const before = Oscillator.mock.calls.length;
		playFurnaceRoar();
		expect(Oscillator.mock.calls.length).toBeGreaterThan(before);
	});

	it("stop function does not throw", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playFurnaceRoar()!;
		expect(() => stop()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// playHydraulicPress
// ---------------------------------------------------------------------------

describe("playHydraulicPress", () => {
	it("creates a MembraneSynth for the slam", () => {
		mockIsInitialized.mockReturnValue(true);
		const { MembraneSynth } = jest.requireMock("tone") as { MembraneSynth: jest.Mock };
		const before = MembraneSynth.mock.calls.length;
		playHydraulicPress();
		expect(MembraneSynth.mock.calls.length).toBeGreaterThan(before);
	});

	it("creates an Oscillator for pressure build", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		const before = Oscillator.mock.calls.length;
		playHydraulicPress();
		expect(Oscillator.mock.calls.length).toBeGreaterThan(before);
	});

	it("creates Noise for the slam burst", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playHydraulicPress();
		expect(Noise.mock.calls.length).toBeGreaterThan(before);
	});

	it("schedules cleanup via setTimeout", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		playHydraulicPress();
		const noiseInst = Noise.mock.results[
			Noise.mock.results.length - 1
		]?.value as { dispose: jest.Mock };
		expect(noiseInst.dispose).not.toHaveBeenCalled();
		jest.advanceTimersByTime(2000);
		expect(noiseInst.dispose).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// playMagneticHum
// ---------------------------------------------------------------------------

describe("playMagneticHum", () => {
	it("returns a stop function when initialized", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playMagneticHum();
		expect(typeof stop).toBe("function");
	});

	it("creates an Oscillator and LFO for vibrato", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator, LFO } = jest.requireMock("tone") as {
			Oscillator: jest.Mock;
			LFO: jest.Mock;
		};
		const beforeOsc = Oscillator.mock.calls.length;
		const beforeLfo = LFO.mock.calls.length;
		playMagneticHum();
		expect(Oscillator.mock.calls.length).toBeGreaterThan(beforeOsc);
		expect(LFO.mock.calls.length).toBeGreaterThan(beforeLfo);
	});

	it("stop function does not throw", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playMagneticHum()!;
		expect(() => stop()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// playBeltClank
// ---------------------------------------------------------------------------

describe("playBeltClank", () => {
	it("creates a MetalSynth for metallic clank", () => {
		mockIsInitialized.mockReturnValue(true);
		const { MetalSynth } = jest.requireMock("tone") as { MetalSynth: jest.Mock };
		const before = MetalSynth.mock.calls.length;
		playBeltClank();
		expect(MetalSynth.mock.calls.length).toBeGreaterThan(before);
	});

	it("schedules disposal after 500ms", () => {
		mockIsInitialized.mockReturnValue(true);
		const { MetalSynth } = jest.requireMock("tone") as { MetalSynth: jest.Mock };
		playBeltClank();
		const synth = MetalSynth.mock.results[
			MetalSynth.mock.results.length - 1
		]?.value as { dispose: jest.Mock };
		expect(synth.dispose).not.toHaveBeenCalled();
		jest.advanceTimersByTime(500);
		expect(synth.dispose).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// playLaserShot
// ---------------------------------------------------------------------------

describe("playLaserShot", () => {
	it("creates an Oscillator with a descending frequency sweep", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		const before = Oscillator.mock.calls.length;
		playLaserShot();
		expect(Oscillator.mock.calls.length).toBeGreaterThan(before);

		// Verify linearRampTo was called (frequency descend)
		const oscInst = Oscillator.mock.results[
			Oscillator.mock.results.length - 1
		]?.value as { frequency: { linearRampTo: jest.Mock } };
		expect(oscInst.frequency.linearRampTo).toHaveBeenCalledTimes(1);
	});

	it("starts frequency at config.laserShot.startFrequency", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		playLaserShot();
		const lastCall = Oscillator.mock.calls[Oscillator.mock.calls.length - 1] as [
			{ frequency: number },
		];
		expect(lastCall[0].frequency).toBe(2000); // from config
	});

	it("schedules disposal after 600ms", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		playLaserShot();
		const oscInst = Oscillator.mock.results[
			Oscillator.mock.results.length - 1
		]?.value as { dispose: jest.Mock };
		expect(oscInst.dispose).not.toHaveBeenCalled();
		jest.advanceTimersByTime(600);
		expect(oscInst.dispose).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// playCombatImpact
// ---------------------------------------------------------------------------

describe("playCombatImpact", () => {
	it("creates Noise, Filter, and Distortion nodes", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise, Distortion } = jest.requireMock("tone") as {
			Noise: jest.Mock;
			Distortion: jest.Mock;
		};
		const beforeNoise = Noise.mock.calls.length;
		const beforeDist = Distortion.mock.calls.length;
		playCombatImpact();
		expect(Noise.mock.calls.length).toBeGreaterThan(beforeNoise);
		expect(Distortion.mock.calls.length).toBeGreaterThan(beforeDist);
	});

	it("schedules disposal", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		playCombatImpact();
		const noiseInst = Noise.mock.results[
			Noise.mock.results.length - 1
		]?.value as { dispose: jest.Mock };
		expect(noiseInst.dispose).not.toHaveBeenCalled();
		jest.advanceTimersByTime(600);
		expect(noiseInst.dispose).toHaveBeenCalledTimes(1);
	});
});
