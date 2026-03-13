import {
	_resetAdaptiveMusic,
	getMusicState,
	setMusicState,
	startMusic,
	stopMusic,
} from "./adaptiveMusic";

// ─── Mock Tone.js ────────────────────────────────────────────────────────────

const mockTransport = {
	bpm: {
		value: 90,
		rampTo: jest.fn(),
	},
	start: jest.fn(),
	stop: jest.fn(),
};

jest.mock("tone", () => ({
	Synth: jest.fn(() => ({
		triggerAttackRelease: jest.fn(),
		triggerAttack: jest.fn(),
		connect: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
		frequency: { exponentialRampTo: jest.fn() },
	})),
	PolySynth: jest.fn(() => ({
		triggerAttackRelease: jest.fn(),
		connect: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
	})),
	MetalSynth: jest.fn(() => ({
		triggerAttackRelease: jest.fn(),
		connect: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
		frequency: { value: 0 },
	})),
	Filter: jest.fn(() => ({
		connect: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
		Q: { value: 0 },
	})),
	Gain: jest.fn(() => ({
		gain: {
			value: 0,
			linearRampTo: jest.fn(),
			cancelScheduledValues: jest.fn(),
		},
		connect: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
	})),
	Loop: jest.fn(() => ({
		start: jest.fn().mockReturnThis(),
		stop: jest.fn(),
		dispose: jest.fn(),
	})),
	now: jest.fn(() => 0),
	start: jest.fn().mockResolvedValue(undefined),
	getTransport: jest.fn(() => mockTransport),
}));

// Mock audioEngine
const mockMusicOutput = {
	gain: { value: 1 },
	connect: jest.fn().mockReturnThis(),
};

jest.mock("./audioEngine", () => ({
	getMusicOutput: jest.fn(() => mockMusicOutput),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("adaptiveMusic", () => {
	beforeEach(() => {
		_resetAdaptiveMusic();
		jest.clearAllMocks();
	});

	describe("state management", () => {
		it("should default to exploration state", () => {
			expect(getMusicState()).toBe("exploration");
		});

		it("should change music state", () => {
			setMusicState("combat");
			expect(getMusicState()).toBe("combat");
		});

		it("should not change when setting same state", () => {
			setMusicState("exploration");
			// Still exploration, no-op
			expect(getMusicState()).toBe("exploration");
		});

		it("should support all music states", () => {
			const states = [
				"exploration",
				"combat",
				"cultist",
				"expansion",
			] as const;
			for (const state of states) {
				setMusicState(state);
				expect(getMusicState()).toBe(state);
			}
		});
	});

	describe("startMusic", () => {
		it("should start the transport", () => {
			startMusic();
			expect(mockTransport.start).toHaveBeenCalled();
		});

		it("should set initial BPM to 90", () => {
			startMusic();
			expect(mockTransport.bpm.value).toBe(90);
		});

		it("should be idempotent", () => {
			startMusic();
			startMusic();
			expect(mockTransport.start).toHaveBeenCalledTimes(1);
		});
	});

	describe("stopMusic", () => {
		it("should stop the transport", () => {
			startMusic();
			stopMusic();
			expect(mockTransport.stop).toHaveBeenCalled();
		});

		it("should not throw if not started", () => {
			expect(() => stopMusic()).not.toThrow();
		});
	});

	describe("tempo changes", () => {
		it("should ramp BPM on state change after start", () => {
			startMusic();
			setMusicState("combat");
			expect(mockTransport.bpm.rampTo).toHaveBeenCalledWith(130, 2);
		});

		it("should ramp to 70 for cultist state", () => {
			startMusic();
			setMusicState("cultist");
			expect(mockTransport.bpm.rampTo).toHaveBeenCalledWith(70, 2);
		});

		it("should ramp to 110 for expansion state", () => {
			startMusic();
			setMusicState("expansion");
			expect(mockTransport.bpm.rampTo).toHaveBeenCalledWith(110, 2);
		});
	});

	describe("with null output", () => {
		it("should not start when output is null", () => {
			const { getMusicOutput } = require("./audioEngine");
			(getMusicOutput as jest.Mock).mockReturnValueOnce(null);
			_resetAdaptiveMusic();
			startMusic();
			expect(mockTransport.start).not.toHaveBeenCalled();
		});
	});
});
