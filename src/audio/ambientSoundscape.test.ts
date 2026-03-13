import {
	_resetAmbientSoundscape,
	isAmbientStarted,
	startAmbientSoundscape,
	stopAmbientSoundscape,
	updateStormIntensity,
} from "./ambientSoundscape";

// ─── Mock Tone.js ────────────────────────────────────────────────────────────

const mockGainNode = () => ({
	gain: {
		value: 0,
		linearRampTo: jest.fn(),
	},
	connect: jest.fn().mockReturnThis(),
	dispose: jest.fn(),
});

const mockFilterNode = () => ({
	connect: jest.fn().mockReturnThis(),
	dispose: jest.fn(),
	frequency: {
		linearRampTo: jest.fn(),
	},
	Q: { value: 0 },
});

jest.mock("tone", () => ({
	NoiseSynth: jest.fn(() => ({
		triggerAttack: jest.fn(),
		triggerAttackRelease: jest.fn(),
		connect: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
	})),
	Synth: jest.fn(() => ({
		triggerAttack: jest.fn(),
		triggerAttackRelease: jest.fn(),
		connect: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
	})),
	Filter: jest.fn(() => mockFilterNode()),
	Gain: jest.fn(() => mockGainNode()),
	now: jest.fn(() => 0),
	start: jest.fn().mockResolvedValue(undefined),
}));

// Mock audioEngine
const mockAmbientOutput = mockGainNode();

jest.mock("./audioEngine", () => ({
	getAmbientOutput: jest.fn(() => mockAmbientOutput),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ambientSoundscape", () => {
	beforeEach(() => {
		_resetAmbientSoundscape();
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("startAmbientSoundscape", () => {
		it("should start the soundscape", () => {
			expect(isAmbientStarted()).toBe(false);
			startAmbientSoundscape();
			expect(isAmbientStarted()).toBe(true);
		});

		it("should be idempotent", () => {
			startAmbientSoundscape();
			startAmbientSoundscape();
			expect(isAmbientStarted()).toBe(true);
		});

		it("should create noise synths for wind and thunder", () => {
			const Tone = require("tone");
			startAmbientSoundscape();
			// NoiseSynth called for wind, thunder
			expect(Tone.NoiseSynth).toHaveBeenCalled();
		});
	});

	describe("stopAmbientSoundscape", () => {
		it("should stop the soundscape", () => {
			startAmbientSoundscape();
			stopAmbientSoundscape();
			expect(isAmbientStarted()).toBe(false);
		});

		it("should not throw if not started", () => {
			expect(() => stopAmbientSoundscape()).not.toThrow();
		});
	});

	describe("updateStormIntensity", () => {
		it("should accept values 0-1", () => {
			startAmbientSoundscape();
			expect(() => updateStormIntensity(0)).not.toThrow();
			expect(() => updateStormIntensity(0.5)).not.toThrow();
			expect(() => updateStormIntensity(1)).not.toThrow();
		});

		it("should clamp out-of-range values", () => {
			startAmbientSoundscape();
			expect(() => updateStormIntensity(-1)).not.toThrow();
			expect(() => updateStormIntensity(2)).not.toThrow();
		});

		it("should not throw if not started", () => {
			expect(() => updateStormIntensity(0.5)).not.toThrow();
		});
	});

	describe("with null output", () => {
		it("should not start when output is null", () => {
			const { getAmbientOutput } = require("./audioEngine");
			(getAmbientOutput as jest.Mock).mockReturnValueOnce(null);
			_resetAmbientSoundscape();
			startAmbientSoundscape();
			expect(isAmbientStarted()).toBe(false);
		});
	});
});
