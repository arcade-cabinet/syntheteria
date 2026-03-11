/**
 * Unit tests for AdaptiveMusic.ts
 *
 * Tests cover:
 *   - startAdaptiveMusic: no-op before audio init
 *   - startAdaptiveMusic: idempotent
 *   - stopAdaptiveMusic: stops and disposes all nodes
 *   - setMusicState: transitions between all states
 *   - setMusicState: idempotent (same state twice)
 *   - getMusicState / isAdaptiveMusicRunning state tracking
 *   - Each music state creates its characteristic nodes
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

let mockMusicBus: ReturnType<typeof makeBusMock> | null = null;

jest.mock("../SoundEngine", () => ({
	isAudioInitialized: () => mockIsInitialized(),
	getCategoryBus: (cat: string) => {
		if (cat === "music") return mockMusicBus;
		return null;
	},
}));

const makeNodeStub = () => ({
	connect: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	dispose: jest.fn(),
	frequency: { value: 0 },
	volume: { value: -20 },
	triggerAttackRelease: jest.fn(),
	gain: {
		value: 1,
		rampTo: jest.fn(),
		setValueAtTime: jest.fn(),
	},
	bpm: {
		value: 80,
		rampTo: jest.fn(),
	},
});

const makeGainStub = () => ({
	connect: jest.fn(),
	dispose: jest.fn(),
	gain: {
		value: 0,
		rampTo: jest.fn(),
		setValueAtTime: jest.fn(),
	},
});

const mockTransport = {
	bpm: { value: 80, rampTo: jest.fn() },
	start: jest.fn(),
	stop: jest.fn(),
};

const mockSequenceInstance = {
	start: jest.fn(),
	stop: jest.fn(),
	dispose: jest.fn(),
};

jest.mock("tone", () => ({
	Oscillator: jest.fn(() => makeNodeStub()),
	Noise: jest.fn(() => makeNodeStub()),
	Filter: jest.fn(() => makeNodeStub()),
	LFO: jest.fn(() => makeNodeStub()),
	Gain: jest.fn(() => makeGainStub()),
	Volume: jest.fn(() => makeNodeStub()),
	Reverb: jest.fn(() => makeNodeStub()),
	Distortion: jest.fn(() => makeNodeStub()),
	Synth: jest.fn(() => makeNodeStub()),
	MetalSynth: jest.fn(() => makeNodeStub()),
	MembraneSynth: jest.fn(() => makeNodeStub()),
	Sequence: jest.fn(() => ({ ...mockSequenceInstance })),
	Transport: mockTransport,
	now: jest.fn(() => 0),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	startAdaptiveMusic,
	stopAdaptiveMusic,
	setMusicState,
	getMusicState,
	isAdaptiveMusicRunning,
	type MusicState,
} from "../AdaptiveMusic";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	mockIsInitialized.mockReturnValue(false);
	mockMusicBus = makeBusMock();

	// Reset module state by stopping if running
	if (isAdaptiveMusicRunning()) {
		stopAdaptiveMusic();
		jest.advanceTimersByTime(1000);
	}
});

afterEach(() => {
	if (isAdaptiveMusicRunning()) {
		stopAdaptiveMusic();
	}
	jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// startAdaptiveMusic
// ---------------------------------------------------------------------------

describe("startAdaptiveMusic", () => {
	it("is a no-op when audio is not initialized", () => {
		startAdaptiveMusic();
		expect(isAdaptiveMusicRunning()).toBe(false);
	});

	it("is a no-op when music bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockMusicBus = null;
		startAdaptiveMusic();
		expect(isAdaptiveMusicRunning()).toBe(false);
	});

	it("sets isAdaptiveMusicRunning to true", () => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
		expect(isAdaptiveMusicRunning()).toBe(true);
	});

	it("starts Transport", () => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
		expect(mockTransport.start).toHaveBeenCalledTimes(1);
	});

	it("sets initial state to explore", () => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
		expect(getMusicState()).toBe("explore");
	});

	it("creates base drone oscillators", () => {
		mockIsInitialized.mockReturnValue(true);
		const { Oscillator } = jest.requireMock("tone") as { Oscillator: jest.Mock };
		startAdaptiveMusic();
		expect(Oscillator.mock.calls.length).toBeGreaterThanOrEqual(2);
	});

	it("is idempotent — calling twice does not restart", () => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
		const transportStartCount = mockTransport.start.mock.calls.length;
		startAdaptiveMusic();
		expect(mockTransport.start.mock.calls.length).toBe(transportStartCount);
	});
});

// ---------------------------------------------------------------------------
// stopAdaptiveMusic
// ---------------------------------------------------------------------------

describe("stopAdaptiveMusic", () => {
	it("sets isAdaptiveMusicRunning to false", () => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
		stopAdaptiveMusic();
		expect(isAdaptiveMusicRunning()).toBe(false);
	});

	it("sets getMusicState to null", () => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
		stopAdaptiveMusic();
		expect(getMusicState()).toBeNull();
	});

	it("stops Transport", () => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
		stopAdaptiveMusic();
		expect(mockTransport.stop).toHaveBeenCalledTimes(1);
	});

	it("is safe to call when not running", () => {
		expect(() => stopAdaptiveMusic()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// setMusicState
// ---------------------------------------------------------------------------

describe("setMusicState", () => {
	beforeEach(() => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
	});

	it("is a no-op when music is not running", () => {
		stopAdaptiveMusic();
		expect(() => setMusicState("build")).not.toThrow();
		expect(getMusicState()).toBeNull();
	});

	it("is idempotent — same state twice is no-op", () => {
		setMusicState("explore"); // already explore
		const { Gain } = jest.requireMock("tone") as { Gain: jest.Mock };
		const before = Gain.mock.calls.length;
		setMusicState("explore");
		expect(Gain.mock.calls.length).toBe(before);
	});

	it("updates getMusicState", () => {
		setMusicState("build");
		expect(getMusicState()).toBe("build");
	});
});

describe("setMusicState — state transitions", () => {
	beforeEach(() => {
		mockIsInitialized.mockReturnValue(true);
		startAdaptiveMusic();
	});

	const STATES: MusicState[] = ["explore", "build", "combat", "raid", "victory"];

	it.each(STATES)("can transition to %s state", (state) => {
		expect(() => setMusicState(state)).not.toThrow();
		expect(getMusicState()).toBe(state);
	});

	it("build state creates a Sequence for hi-hat", () => {
		const { Sequence } = jest.requireMock("tone") as { Sequence: jest.Mock };
		const before = Sequence.mock.calls.length;
		setMusicState("build");
		expect(Sequence.mock.calls.length).toBeGreaterThan(before);
	});

	it("combat state creates Distortion for aggressive synth", () => {
		const { Distortion } = jest.requireMock("tone") as { Distortion: jest.Mock };
		const before = Distortion.mock.calls.length;
		setMusicState("combat");
		expect(Distortion.mock.calls.length).toBeGreaterThan(before);
	});

	it("combat state changes Transport BPM", () => {
		setMusicState("combat");
		expect(mockTransport.bpm.rampTo).toHaveBeenCalledWith(100, 1.5);
	});

	it("raid state creates a Sequence for warning arpeggio", () => {
		const { Sequence } = jest.requireMock("tone") as { Sequence: jest.Mock };
		setMusicState("raid");
		const calls = Sequence.mock.calls.length;
		expect(calls).toBeGreaterThan(0);
	});

	it("victory state creates a Reverb for triumphant sound", () => {
		const { Reverb } = jest.requireMock("tone") as { Reverb: jest.Mock };
		const before = Reverb.mock.calls.length;
		setMusicState("victory");
		expect(Reverb.mock.calls.length).toBeGreaterThan(before);
	});

	it("transitions from combat back to explore sets explore state", () => {
		setMusicState("combat");
		setMusicState("explore");
		expect(getMusicState()).toBe("explore");
	});
});
