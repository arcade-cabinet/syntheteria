/**
 * Unit tests for FactoryAudio.ts
 *
 * Tests cover:
 *   - All looping sounds return null when audio context is not running
 *   - Looping sounds return a stop function when context is running
 *   - Stop functions do not throw
 *   - playProcessorHum creates different node types per processor type
 *   - One-shot sounds (playFootstep, playBeltItem, playCultistLightning)
 *     create Tone nodes when context is running
 *   - playHackingNoise creates BitCrusher for digital interference
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockContextState = "suspended";

const makeNodeStub = () => ({
	connect: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	dispose: jest.fn(),
	frequency: {
		value: 0,
		linearRampTo: jest.fn(),
	},
	volume: { value: 0 },
	gain: { value: 1 },
	triggerAttackRelease: jest.fn(),
});

jest.mock("tone", () => ({
	getContext: jest.fn(() => ({ state: mockContextState })),
	Volume: jest.fn(() => ({
		...makeNodeStub(),
		toDestination: jest.fn().mockReturnThis(),
	})),
	Oscillator: jest.fn(() => makeNodeStub()),
	Filter: jest.fn(() => makeNodeStub()),
	Noise: jest.fn(() => makeNodeStub()),
	LFO: jest.fn(() => makeNodeStub()),
	MetalSynth: jest.fn(() => makeNodeStub()),
	BitCrusher: jest.fn(() => makeNodeStub()),
	Gain: jest.fn(() => makeNodeStub()),
	Reverb: jest.fn(() => makeNodeStub()),
	AmplitudeEnvelope: jest.fn(() => makeNodeStub()),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	playBeltMotor,
	playDrillSound,
	playProcessorHum,
	playHackingNoise,
	playFootstep,
	playBeltItem,
	playCultistLightning,
} from "../FactoryAudio";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	mockContextState = "suspended";

	// Re-mock getContext to use latest mockContextState
	const Tone = jest.requireMock("tone") as { getContext: jest.Mock };
	Tone.getContext.mockImplementation(() => ({ state: mockContextState }));
});

afterEach(() => {
	jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Context check
// ---------------------------------------------------------------------------

describe("return null when context not running", () => {
	it("playBeltMotor returns null", () => {
		expect(playBeltMotor()).toBeNull();
	});

	it("playDrillSound returns null", () => {
		expect(playDrillSound()).toBeNull();
	});

	it("playProcessorHum returns null", () => {
		expect(playProcessorHum()).toBeNull();
	});

	it("playHackingNoise returns null", () => {
		expect(playHackingNoise()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Looping sounds — running context
// ---------------------------------------------------------------------------

describe("playBeltMotor", () => {
	it("returns a stop function when context is running", () => {
		mockContextState = "running";
		const stop = playBeltMotor();
		expect(typeof stop).toBe("function");
	});

	it("stop function does not throw", () => {
		mockContextState = "running";
		const stop = playBeltMotor()!;
		expect(() => stop()).not.toThrow();
	});

	it("creates Oscillator and Noise nodes", () => {
		mockContextState = "running";
		const { Oscillator, Noise } = jest.requireMock("tone") as {
			Oscillator: jest.Mock;
			Noise: jest.Mock;
		};
		const beforeOsc = Oscillator.mock.calls.length;
		const beforeNoise = Noise.mock.calls.length;
		playBeltMotor();
		expect(Oscillator.mock.calls.length).toBeGreaterThan(beforeOsc);
		expect(Noise.mock.calls.length).toBeGreaterThan(beforeNoise);
	});
});

describe("playDrillSound", () => {
	it("returns a stop function when context is running", () => {
		mockContextState = "running";
		const stop = playDrillSound();
		expect(typeof stop).toBe("function");
	});

	it("creates an LFO for drill rotation modulation", () => {
		mockContextState = "running";
		const { LFO } = jest.requireMock("tone") as { LFO: jest.Mock };
		const before = LFO.mock.calls.length;
		playDrillSound();
		expect(LFO.mock.calls.length).toBeGreaterThan(before);
	});
});

describe("playProcessorHum", () => {
	it("returns stop function for smelter type", () => {
		mockContextState = "running";
		const stop = playProcessorHum("smelter");
		expect(typeof stop).toBe("function");
	});

	it("returns stop function for refiner type", () => {
		mockContextState = "running";
		const stop = playProcessorHum("refiner");
		expect(typeof stop).toBe("function");
	});

	it("returns stop function for separator type", () => {
		mockContextState = "running";
		const stop = playProcessorHum("separator");
		expect(typeof stop).toBe("function");
	});

	it("defaults to smelter type", () => {
		mockContextState = "running";
		const stop = playProcessorHum();
		expect(typeof stop).toBe("function");
	});

	it("smelter creates Noise node for brown rumble", () => {
		mockContextState = "running";
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playProcessorHum("smelter");
		expect(Noise.mock.calls.length).toBeGreaterThan(before);
	});

	it("stop functions do not throw", () => {
		mockContextState = "running";
		for (const type of ["smelter", "refiner", "separator"] as const) {
			const stop = playProcessorHum(type)!;
			expect(() => stop()).not.toThrow();
		}
	});
});

describe("playHackingNoise", () => {
	it("returns a stop function when context is running", () => {
		mockContextState = "running";
		const stop = playHackingNoise();
		expect(typeof stop).toBe("function");
	});

	it("creates a BitCrusher for digital interference", () => {
		mockContextState = "running";
		const { BitCrusher } = jest.requireMock("tone") as { BitCrusher: jest.Mock };
		const before = BitCrusher.mock.calls.length;
		playHackingNoise();
		expect(BitCrusher.mock.calls.length).toBeGreaterThan(before);
	});

	it("stop function does not throw", () => {
		mockContextState = "running";
		const stop = playHackingNoise()!;
		expect(() => stop()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// One-shot sounds
// ---------------------------------------------------------------------------

describe("playFootstep", () => {
	it("does not throw when context is not running", () => {
		expect(() => playFootstep()).not.toThrow();
	});

	it("creates a Noise node when context is running", () => {
		mockContextState = "running";
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playFootstep();
		expect(Noise.mock.calls.length).toBeGreaterThan(before);
	});

	it("schedules disposal via setTimeout", () => {
		mockContextState = "running";
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		playFootstep();
		const noiseInst = Noise.mock.results[
			Noise.mock.results.length - 1
		]?.value as { dispose: jest.Mock };
		expect(noiseInst.dispose).not.toHaveBeenCalled();
		jest.advanceTimersByTime(300);
		expect(noiseInst.dispose).toHaveBeenCalledTimes(1);
	});
});

describe("playBeltItem", () => {
	it("does not throw when context is not running", () => {
		expect(() => playBeltItem()).not.toThrow();
	});

	it("creates a MetalSynth for item transfer clunk", () => {
		mockContextState = "running";
		const { MetalSynth } = jest.requireMock("tone") as { MetalSynth: jest.Mock };
		const before = MetalSynth.mock.calls.length;
		playBeltItem();
		expect(MetalSynth.mock.calls.length).toBeGreaterThan(before);
	});
});

describe("playCultistLightning", () => {
	it("does not throw when context is not running", () => {
		expect(() => playCultistLightning()).not.toThrow();
	});

	it("creates Noise, Oscillator, and Reverb nodes when running", () => {
		mockContextState = "running";
		const { Noise, Oscillator, Reverb } = jest.requireMock("tone") as {
			Noise: jest.Mock;
			Oscillator: jest.Mock;
			Reverb: jest.Mock;
		};
		const beforeNoise = Noise.mock.calls.length;
		const beforeOsc = Oscillator.mock.calls.length;
		const beforeReverb = Reverb.mock.calls.length;
		playCultistLightning();
		expect(Noise.mock.calls.length).toBeGreaterThan(beforeNoise);
		expect(Oscillator.mock.calls.length).toBeGreaterThan(beforeOsc);
		expect(Reverb.mock.calls.length).toBeGreaterThan(beforeReverb);
	});
});
