/**
 * Unit tests for SynthSounds.ts
 *
 * Tests cover:
 *   - All one-shot sounds are no-ops before audio init
 *   - All one-shot sounds create Tone nodes when initialized
 *   - playBeltHum returns null before init, a stop function after
 *   - playQuestComplete schedules 3 notes via setTimeout
 *   - playCompressionThump creates MembraneSynth
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
	triggerAttackRelease: jest.fn(),
});

jest.mock("tone", () => ({
	Noise: jest.fn(() => makeNodeStub()),
	Filter: jest.fn(() => makeNodeStub()),
	LFO: jest.fn(() => ({ ...makeNodeStub(), connect: jest.fn() })),
	AmplitudeEnvelope: jest.fn(() => makeNodeStub()),
	Volume: jest.fn(() => makeNodeStub()),
	Oscillator: jest.fn(() => ({
		...makeNodeStub(),
		frequency: { value: 0, linearRampTo: jest.fn() },
	})),
	MembraneSynth: jest.fn(() => makeNodeStub()),
	MetalSynth: jest.fn(() => makeNodeStub()),
	Synth: jest.fn(() => makeNodeStub()),
	Reverb: jest.fn(() => makeNodeStub()),
	Distortion: jest.fn(() => makeNodeStub()),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	playHarvesting,
	playCompressionThump,
	playCubePickup,
	playCubeDrop,
	playBeltHum,
	playPowerUp,
	playDamageTaken,
	playQuestComplete,
} from "../SynthSounds";

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
	const fns = [
		["playHarvesting", playHarvesting],
		["playCompressionThump", playCompressionThump],
		["playCubePickup", playCubePickup],
		["playCubeDrop", playCubeDrop],
		["playPowerUp", playPowerUp],
		["playDamageTaken", playDamageTaken],
		["playQuestComplete", playQuestComplete],
	] as const;

	it.each(fns)("%s does not throw and creates no Noise nodes", (name, fn) => {
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		expect(() => (fn as () => void)()).not.toThrow();
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("playBeltHum returns null", () => {
		expect(playBeltHum()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Sound creation when initialized
// ---------------------------------------------------------------------------

describe("playHarvesting", () => {
	it("creates Noise and Filter nodes for ore grinding", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise, Filter } = jest.requireMock("tone") as {
			Noise: jest.Mock;
			Filter: jest.Mock;
		};
		playHarvesting();
		expect(Noise.mock.calls.length).toBeGreaterThan(0);
		expect(Filter.mock.calls.length).toBeGreaterThan(0);
	});
});

describe("playCompressionThump", () => {
	it("creates a MembraneSynth for heavy thump", () => {
		mockIsInitialized.mockReturnValue(true);
		const { MembraneSynth } = jest.requireMock("tone") as {
			MembraneSynth: jest.Mock;
		};
		playCompressionThump();
		expect(MembraneSynth.mock.calls.length).toBeGreaterThan(0);
	});

	it("also creates a Noise transient", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		playCompressionThump();
		expect(Noise.mock.calls.length).toBeGreaterThan(0);
	});
});

describe("playCubePickup", () => {
	it("creates a MetalSynth for magnetic click", () => {
		mockIsInitialized.mockReturnValue(true);
		const { MetalSynth } = jest.requireMock("tone") as { MetalSynth: jest.Mock };
		const before = MetalSynth.mock.calls.length;
		playCubePickup();
		expect(MetalSynth.mock.calls.length).toBeGreaterThan(before);
	});
});

describe("playCubeDrop", () => {
	it("creates Oscillator and Noise nodes for low thud", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator, Noise } = jest.requireMock("tone") as {
			Oscillator: jest.Mock;
			Noise: jest.Mock;
		};
		const beforeOsc = Oscillator.mock.calls.length;
		const beforeNoise = Noise.mock.calls.length;
		playCubeDrop();
		expect(Oscillator.mock.calls.length).toBeGreaterThan(beforeOsc);
		expect(Noise.mock.calls.length).toBeGreaterThan(beforeNoise);
	});
});

describe("playBeltHum", () => {
	it("returns a stop function when initialized", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playBeltHum();
		expect(typeof stop).toBe("function");
	});

	it("returns null when ambience bus is unavailable", () => {
		mockIsInitialized.mockReturnValue(true);
		mockAmbienceBus = null;
		expect(playBeltHum()).toBeNull();
	});

	it("stop function does not throw", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playBeltHum();
		expect(() => stop?.()).not.toThrow();
	});
});

describe("playPowerUp", () => {
	it("creates two Oscillator nodes for ascending sweep", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		const before = Oscillator.mock.calls.length;
		playPowerUp();
		expect(Oscillator.mock.calls.length - before).toBeGreaterThanOrEqual(2);
	});
});

describe("playDamageTaken", () => {
	it("creates Oscillator and Distortion for buzz effect", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Distortion } = jest.requireMock("tone") as { Distortion: jest.Mock };
		const before = Distortion.mock.calls.length;
		playDamageTaken();
		expect(Distortion.mock.calls.length).toBeGreaterThan(before);
	});
});

describe("playQuestComplete", () => {
	it("creates a Synth and Reverb for ascending arpeggio", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Synth, Reverb } = jest.requireMock("tone") as {
			Synth: jest.Mock;
			Reverb: jest.Mock;
		};
		const beforeSynth = Synth.mock.calls.length;
		const beforeReverb = Reverb.mock.calls.length;
		playQuestComplete();
		expect(Synth.mock.calls.length).toBeGreaterThan(beforeSynth);
		expect(Reverb.mock.calls.length).toBeGreaterThan(beforeReverb);
	});

	it("schedules 3 note triggers at 120ms intervals", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Synth } = jest.requireMock("tone") as { Synth: jest.Mock };
		playQuestComplete();

		const synthInst = Synth.mock.results[
			Synth.mock.results.length - 1
		]?.value as { triggerAttackRelease: jest.Mock };

		// Before any timers advance, 0 notes have fired
		expect(synthInst.triggerAttackRelease.mock.calls.length).toBe(0);

		jest.advanceTimersByTime(0);
		expect(synthInst.triggerAttackRelease.mock.calls.length).toBe(1);

		jest.advanceTimersByTime(120);
		expect(synthInst.triggerAttackRelease.mock.calls.length).toBe(2);

		jest.advanceTimersByTime(120);
		expect(synthInst.triggerAttackRelease.mock.calls.length).toBe(3);
	});
});
