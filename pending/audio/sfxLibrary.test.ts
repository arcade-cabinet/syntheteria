import {
	playAIPhaseDrone,
	playAttackClang,
	playBuildingComplete,
	playComponentBreak,
	playConstructionHammer,
	playCultistAttack,
	playCultistSpawn,
	playEnergyBurst,
	playHarvestGrind,
	playHitImpact,
	playLightningCall,
	playMaterialCollected,
	playNewTurnFanfare,
	playStageComplete,
	playTurnStartChime,
	playUnitDestroyed,
	playWeldingSizzle,
} from "./sfxLibrary";

// ─── Mock Tone.js ────────────────────────────────────────────────────────────

const mockTriggerAttackRelease = jest.fn();
const mockTriggerAttack = jest.fn();
const mockConnect = jest.fn().mockReturnThis();
const mockDispose = jest.fn();
const mockFrequency = {
	exponentialRampTo: jest.fn(),
	linearRampTo: jest.fn(),
};

const mockSynthInstance = {
	triggerAttackRelease: mockTriggerAttackRelease,
	triggerAttack: mockTriggerAttack,
	connect: mockConnect,
	dispose: mockDispose,
	frequency: mockFrequency,
};

const mockNoiseSynthInstance = {
	triggerAttackRelease: mockTriggerAttackRelease,
	connect: mockConnect,
	dispose: mockDispose,
};

const mockMetalSynthInstance = {
	triggerAttackRelease: mockTriggerAttackRelease,
	connect: mockConnect,
	dispose: mockDispose,
	frequency: { value: 0 },
};

const mockFilterInstance = {
	connect: mockConnect,
	dispose: mockDispose,
	frequency: mockFrequency,
	Q: { value: 0 },
};

const mockDistortionInstance = {
	connect: mockConnect,
	dispose: mockDispose,
};

jest.mock("tone", () => ({
	Synth: jest.fn(() => ({ ...mockSynthInstance })),
	PolySynth: jest.fn(() => ({ ...mockSynthInstance })),
	NoiseSynth: jest.fn(() => ({ ...mockNoiseSynthInstance })),
	MetalSynth: jest.fn(() => ({ ...mockMetalSynthInstance })),
	Filter: jest.fn(() => ({ ...mockFilterInstance })),
	Distortion: jest.fn(() => ({ ...mockDistortionInstance })),
	Gain: jest.fn(() => ({
		gain: {
			value: 1,
			linearRampTo: jest.fn(),
			cancelScheduledValues: jest.fn(),
		},
		connect: jest.fn().mockReturnThis(),
		toDestination: jest.fn().mockReturnThis(),
		dispose: jest.fn(),
	})),
	now: jest.fn(() => 0),
	start: jest.fn().mockResolvedValue(undefined),
}));

// Mock audioEngine to provide a valid SFX output
const mockSfxOutput = {
	gain: { value: 1 },
	connect: jest.fn().mockReturnThis(),
};

jest.mock("./audioEngine", () => ({
	getSfxOutput: jest.fn(() => mockSfxOutput),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("sfxLibrary", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("combat SFX", () => {
		it("should play attack clang", () => {
			playAttackClang();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play energy burst", () => {
			playEnergyBurst();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play hit impact", () => {
			playHitImpact();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play component break", () => {
			playComponentBreak();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play unit destroyed", () => {
			playUnitDestroyed();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});
	});

	describe("harvest SFX", () => {
		it("should play harvest grind", () => {
			playHarvestGrind();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play material collected", () => {
			playMaterialCollected();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});
	});

	describe("construction SFX", () => {
		it("should play construction hammer", () => {
			playConstructionHammer();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play welding sizzle", () => {
			playWeldingSizzle();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play stage complete fanfare", () => {
			playStageComplete();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play building complete fanfare", () => {
			playBuildingComplete();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});
	});

	describe("turn SFX", () => {
		it("should play turn start chime", () => {
			playTurnStartChime();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play AI phase drone", () => {
			playAIPhaseDrone();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play new turn fanfare", () => {
			playNewTurnFanfare();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});
	});

	describe("cultist SFX", () => {
		it("should play cultist spawn screech", () => {
			playCultistSpawn();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play cultist attack", () => {
			playCultistAttack();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});

		it("should play lightning call", () => {
			playLightningCall();
			expect(mockTriggerAttackRelease).toHaveBeenCalled();
		});
	});

	describe("SFX with no output", () => {
		it("should not throw when SFX output is null", () => {
			const { getSfxOutput } = require("./audioEngine");
			(getSfxOutput as jest.Mock).mockReturnValueOnce(null);
			expect(() => playAttackClang()).not.toThrow();
		});
	});

	describe("synth disposal", () => {
		it("should dispose synths after timeout", () => {
			playAttackClang();
			jest.advanceTimersByTime(600);
			expect(mockDispose).toHaveBeenCalled();
		});
	});
});
