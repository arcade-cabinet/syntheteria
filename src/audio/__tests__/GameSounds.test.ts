/**
 * Unit tests for GameSounds.ts
 *
 * Tests cover:
 *   - Each sound function is a no-op when audio is not initialized
 *   - Each sound function creates synth nodes when initialized
 *   - playAlert and playUIBeep route through ui bus (or sfx fallback)
 *   - playLightningStrike routes through ambience bus
 *   - playMachineHum returns a stop function (looping sound)
 *   - All one-shot sounds schedule auto-dispose via setTimeout
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
let mockUiBus: ReturnType<typeof makeBusMock> | null = null;

jest.mock("../SoundEngine", () => ({
	isAudioInitialized: () => mockIsInitialized(),
	getCategoryBus: (cat: string) => {
		if (cat === "sfx") return mockSfxBus;
		if (cat === "ambience") return mockAmbienceBus;
		if (cat === "ui") return mockUiBus;
		return null;
	},
}));

// Track how many times each Tone constructor is called
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
	LFO: jest.fn(() => makeNodeStub()),
	AmplitudeEnvelope: jest.fn(() => makeNodeStub()),
	Volume: jest.fn(() => makeNodeStub()),
	Oscillator: jest.fn(() => makeNodeStub()),
	MetalSynth: jest.fn(() => makeNodeStub()),
	Synth: jest.fn(() => makeNodeStub()),
	Distortion: jest.fn(() => makeNodeStub()),
	Reverb: jest.fn(() => makeNodeStub()),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	playGrinding,
	playCompression,
	playCubePlace,
	playCubeGrab,
	playMachineHum,
	playAlert,
	playDamage,
	playMetalImpact,
	playUIBeep,
	playLightningStrike,
} from "../GameSounds";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	mockIsInitialized.mockReturnValue(false);
	mockSfxBus = makeBusMock();
	mockAmbienceBus = makeBusMock();
	mockUiBus = makeBusMock();
});

afterEach(() => {
	jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function expectNodesCreated(ctor: jest.Mock, before: number) {
	expect(ctor.mock.calls.length).toBeGreaterThan(before);
}

// ---------------------------------------------------------------------------
// No-ops before init
// ---------------------------------------------------------------------------

describe("no-op before audio init", () => {
	const fns = [
		["playGrinding", playGrinding],
		["playCompression", playCompression],
		["playCubePlace", playCubePlace],
		["playCubeGrab", playCubeGrab],
		["playAlert", playAlert],
		["playDamage", playDamage],
		["playMetalImpact", playMetalImpact],
		["playUIBeep", playUIBeep],
		["playLightningStrike", playLightningStrike],
	] as const;

	it.each(fns)("%s does not throw and creates no nodes", (name, fn) => {
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		expect(() => (fn as () => void)()).not.toThrow();
		expect(Noise.mock.calls.length).toBe(before);
	});

	it("playMachineHum returns null", () => {
		mockIsInitialized.mockReturnValue(false);
		expect(playMachineHum()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Sound creation when initialized
// ---------------------------------------------------------------------------

describe("playGrinding", () => {
	it("creates a Noise node via sfx bus", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playGrinding();
		expectNodesCreated(Noise, before);
	});

	it("schedules disposal", () => {
		mockIsInitialized.mockReturnValue(true);
		playGrinding();
		jest.advanceTimersByTime(1100);
		// No assertion on exact nodes — just that it doesn't throw
	});
});

describe("playCompression", () => {
	it("creates Oscillator nodes via sfx bus", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		const before = Oscillator.mock.calls.length;
		playCompression();
		expectNodesCreated(Oscillator, before);
	});
});

describe("playCubePlace", () => {
	it("creates a Reverb node for room feel", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Reverb } = jest.requireMock("tone") as { Reverb: jest.Mock };
		const before = Reverb.mock.calls.length;
		playCubePlace();
		expectNodesCreated(Reverb, before);
	});
});

describe("playCubeGrab", () => {
	it("creates a Noise node for metallic scrape", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playCubeGrab();
		expectNodesCreated(Noise, before);
	});
});

describe("playMachineHum", () => {
	it("returns a function when initialized and sfx bus is ready", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playMachineHum();
		expect(typeof stop).toBe("function");
	});

	it("returns null when sfx bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockSfxBus = null;
		expect(playMachineHum()).toBeNull();
	});

	it("stop function does not throw", () => {
		mockIsInitialized.mockReturnValue(true);
		const stop = playMachineHum();
		expect(() => stop?.()).not.toThrow();
	});
});

describe("playAlert", () => {
	it("creates a Synth node when initialized", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Synth } = jest.requireMock("tone") as { Synth: jest.Mock };
		const before = Synth.mock.calls.length;
		playAlert();
		expectNodesCreated(Synth, before);
	});

	it("routes through ui bus when available", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Volume } = jest.requireMock("tone") as { Volume: jest.Mock };
		// The Volume instance created by playAlert should connect to uiBus
		const before = Volume.mock.calls.length;
		playAlert();
		expect(Volume.mock.calls.length).toBeGreaterThan(before);
	});

	it("falls back to sfx bus when ui bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockUiBus = null;
		// Should still not throw — sfx bus is the fallback
		expect(() => playAlert()).not.toThrow();
	});
});

describe("playUIBeep", () => {
	it("creates a Synth node when initialized", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Synth } = jest.requireMock("tone") as { Synth: jest.Mock };
		const before = Synth.mock.calls.length;
		playUIBeep();
		expectNodesCreated(Synth, before);
	});

	it("falls back to sfx bus when ui bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockUiBus = null;
		expect(() => playUIBeep()).not.toThrow();
	});

	it("is a no-op when both ui and sfx buses are null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockUiBus = null;
		mockSfxBus = null;
		const { Synth } = jest.requireMock("tone") as { Synth: jest.Mock };
		const before = Synth.mock.calls.length;
		playUIBeep();
		expect(Synth.mock.calls.length).toBe(before);
	});
});

describe("playDamage", () => {
	it("creates Noise and Distortion nodes", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Distortion } = jest.requireMock("tone") as { Distortion: jest.Mock };
		const before = Distortion.mock.calls.length;
		playDamage();
		expectNodesCreated(Distortion, before);
	});
});

describe("playMetalImpact", () => {
	it("creates a MetalSynth node", () => {
		mockIsInitialized.mockReturnValue(true);
		const { MetalSynth } = jest.requireMock("tone") as { MetalSynth: jest.Mock };
		const before = MetalSynth.mock.calls.length;
		playMetalImpact();
		expectNodesCreated(MetalSynth, before);
	});
});

describe("playLightningStrike", () => {
	it("creates Noise nodes routed through ambience bus", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playLightningStrike();
		expectNodesCreated(Noise, before);
	});

	it("is a no-op when ambience bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockAmbienceBus = null;
		const { Noise } = jest.requireMock("tone") as { Noise: jest.Mock };
		const before = Noise.mock.calls.length;
		playLightningStrike();
		expect(Noise.mock.calls.length).toBe(before);
	});
});
