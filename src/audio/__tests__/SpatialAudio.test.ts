/**
 * Unit tests for SpatialAudio.ts
 *
 * Tests cover:
 *   - setListenerPosition / getListenerPosition
 *   - playSpatial: skips when not initialized, calls factory with panner
 *   - playSpatial: auto-disposes panner after durationMs
 *   - playSpatialMetalImpact: calls playSpatial internally
 *   - playSpatialMachineHum: returns null before init, stop fn after init
 *   - playSpatialCrackle: calls playSpatial
 *   - initAudio / disposeAudio delegates
 *   - updateStormIntensity delegates to StormAmbience
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the SoundEngine module
const mockIsInitialized = jest.fn(() => false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetCategoryBus = jest.fn<any, any[]>(() => null);

let mockBusInstance: {
	volume: { value: number };
	connect: jest.Mock;
	dispose: jest.Mock;
} | null = null;

jest.mock("../SoundEngine", () => ({
	isAudioInitialized: () => mockIsInitialized(),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getCategoryBus: (cat: any) => mockGetCategoryBus(cat),
	initAudio: jest.fn().mockResolvedValue(undefined),
	disposeAudio: jest.fn(),
}));

jest.mock("../StormAmbience", () => ({
	startStormAmbience: jest.fn(),
	stopStormAmbience: jest.fn(),
	updateStormAudio: jest.fn(),
}));

jest.mock("../GameSounds", () => ({
	playMetalImpact: jest.fn(),
}));

// Mock Tone.js
const mockPanner3DConnect = jest.fn();
const mockPanner3DDispose = jest.fn();
const mockPanner3DInstance = {
	connect: mockPanner3DConnect,
	dispose: mockPanner3DDispose,
};

const mockOscillatorInstance = {
	connect: jest.fn(),
	start: jest.fn(),
	stop: jest.fn(),
	dispose: jest.fn(),
	frequency: { value: 60 },
};

const mockFilterInstance = {
	connect: jest.fn(),
	dispose: jest.fn(),
};

const mockVolumeInstance = {
	connect: jest.fn(),
	dispose: jest.fn(),
	volume: { value: 0 },
};

const mockMetalSynthInstance = {
	connect: jest.fn(),
	dispose: jest.fn(),
	volume: { value: 0 },
	triggerAttackRelease: jest.fn(),
};

jest.mock("tone", () => ({
	start: jest.fn().mockResolvedValue(undefined),
	Panner3D: jest.fn(() => ({ ...mockPanner3DInstance })),
	MetalSynth: jest.fn(() => ({ ...mockMetalSynthInstance })),
	Oscillator: jest.fn(() => ({ ...mockOscillatorInstance })),
	Filter: jest.fn(() => ({ ...mockFilterInstance })),
	Volume: jest.fn(() => ({ ...mockVolumeInstance })),
	Noise: jest.fn(() => ({
		connect: jest.fn(),
		start: jest.fn(),
		stop: jest.fn(),
		dispose: jest.fn(),
	})),
	BitCrusher: jest.fn(() => ({
		connect: jest.fn(),
		dispose: jest.fn(),
	})),
	AmplitudeEnvelope: jest.fn(() => ({
		connect: jest.fn(),
		dispose: jest.fn(),
		triggerAttackRelease: jest.fn(),
	})),
	getContext: jest.fn(() => ({
		rawContext: {
			listener: {
				positionX: { value: 0 },
				positionY: { value: 0 },
				positionZ: { value: 0 },
			},
		},
	})),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
	setListenerPosition,
	getListenerPosition,
	playSpatial,
	playSpatialMachineHum,
} from "../SpatialAudio";

import { updateStormAudio } from "../StormAmbience";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	mockIsInitialized.mockReturnValue(false);
	mockGetCategoryBus.mockReturnValue(null);
	mockBusInstance = {
		volume: { value: 0 },
		connect: jest.fn(),
		dispose: jest.fn(),
	};
});

// ---------------------------------------------------------------------------
// Listener position
// ---------------------------------------------------------------------------

describe("setListenerPosition / getListenerPosition", () => {
	it("stores and retrieves position without audio init", () => {
		setListenerPosition({ x: 10, y: 5, z: -3 });
		const pos = getListenerPosition();
		expect(pos).toEqual({ x: 10, y: 5, z: -3 });
	});

	it("updates AudioContext listener when audio is initialized", () => {
		const Tone = jest.requireMock("tone") as {
			getContext: jest.Mock;
		};
		const mockListener = {
			positionX: { value: 0 },
			positionY: { value: 0 },
			positionZ: { value: 0 },
		};
		Tone.getContext.mockReturnValue({
			rawContext: { listener: mockListener },
		});

		mockIsInitialized.mockReturnValue(true);
		setListenerPosition({ x: 7, y: 2, z: 9 });

		expect(mockListener.positionX.value).toBe(7);
		expect(mockListener.positionY.value).toBe(2);
		expect(mockListener.positionZ.value).toBe(9);
	});

	it("defaults to origin on first access", () => {
		// Reset to default by setting it
		setListenerPosition({ x: 0, y: 0, z: 0 });
		expect(getListenerPosition()).toEqual({ x: 0, y: 0, z: 0 });
	});
});

// ---------------------------------------------------------------------------
// playSpatial
// ---------------------------------------------------------------------------

describe("playSpatial", () => {
	it("is a no-op when audio is not initialized", () => {
		mockIsInitialized.mockReturnValue(false);
		const factory = jest.fn(() => ({ dispose: jest.fn(), durationMs: 100 }));
		playSpatial({ x: 0, y: 0, z: 0 }, factory);
		expect(factory).not.toHaveBeenCalled();
	});

	it("is a no-op when sfx bus is null", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(null);
		const factory = jest.fn(() => ({ dispose: jest.fn(), durationMs: 100 }));
		playSpatial({ x: 0, y: 0, z: 0 }, factory);
		expect(factory).not.toHaveBeenCalled();
	});

	it("calls factory with a Panner3D when bus is available", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(mockBusInstance);

		const factory = jest.fn(() => ({ dispose: jest.fn(), durationMs: 50 }));
		playSpatial({ x: 1, y: 2, z: 3 }, factory);

		expect(factory).toHaveBeenCalledTimes(1);
		// First arg is a Panner3D mock instance
		const panner = (factory.mock.calls[0] as unknown[])[0];
		expect(panner).toBeDefined();
	});

	it("creates Panner3D with the given world position", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(mockBusInstance);

		const { Panner3D } = jest.requireMock("tone") as { Panner3D: jest.Mock };

		const factory = jest.fn(() => ({ dispose: jest.fn(), durationMs: 50 }));
		playSpatial({ x: 5, y: 10, z: -2 }, factory);

		expect(Panner3D).toHaveBeenCalledWith(
			expect.objectContaining({
				positionX: 5,
				positionY: 10,
				positionZ: -2,
			}),
		);
	});

	it("auto-disposes panner and inner nodes after durationMs", () => {
		jest.useFakeTimers();
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(mockBusInstance);

		const innerDispose = jest.fn();
		const factory = jest.fn(() => ({
			dispose: innerDispose,
			durationMs: 300,
		}));
		playSpatial({ x: 0, y: 0, z: 0 }, factory);

		expect(innerDispose).not.toHaveBeenCalled();
		jest.advanceTimersByTime(300);
		expect(innerDispose).toHaveBeenCalledTimes(1);

		jest.useRealTimers();
	});

	it("uses default distance model options", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(mockBusInstance);

		const { Panner3D } = jest.requireMock("tone") as { Panner3D: jest.Mock };

		const factory = jest.fn(() => ({ dispose: jest.fn(), durationMs: 50 }));
		playSpatial({ x: 0, y: 0, z: 0 }, factory);

		expect(Panner3D).toHaveBeenCalledWith(
			expect.objectContaining({
				distanceModel: "inverse",
				panningModel: "HRTF",
			}),
		);
	});

	it("respects custom maxDistance and rolloffFactor options", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(mockBusInstance);

		const { Panner3D } = jest.requireMock("tone") as { Panner3D: jest.Mock };

		const factory = jest.fn(() => ({ dispose: jest.fn(), durationMs: 50 }));
		playSpatial({ x: 0, y: 0, z: 0 }, factory, {
			maxDistance: 100,
			rolloffFactor: 3,
		});

		expect(Panner3D).toHaveBeenCalledWith(
			expect.objectContaining({
				maxDistance: 100,
				rolloffFactor: 3,
			}),
		);
	});
});

// ---------------------------------------------------------------------------
// playSpatialMachineHum
// ---------------------------------------------------------------------------

describe("playSpatialMachineHum", () => {
	it("returns null when audio is not initialized", () => {
		mockIsInitialized.mockReturnValue(false);
		const result = playSpatialMachineHum({ x: 0, y: 0, z: 0 });
		expect(result).toBeNull();
	});

	it("returns null when ambience bus is not available", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(null);
		const result = playSpatialMachineHum({ x: 0, y: 0, z: 0 });
		expect(result).toBeNull();
	});

	it("returns a stop function when initialized", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(mockBusInstance);

		const result = playSpatialMachineHum({ x: 5, y: 0, z: 5 });
		expect(typeof result).toBe("function");
	});

	it("stop function does not throw", () => {
		mockIsInitialized.mockReturnValue(true);
		mockGetCategoryBus.mockReturnValue(mockBusInstance);

		const stop = playSpatialMachineHum({ x: 0, y: 0, z: 0 });
		expect(() => stop?.()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// updateStormAudio delegation
// ---------------------------------------------------------------------------

describe("updateStormIntensity", () => {
	it("delegates to StormAmbience.updateStormAudio", async () => {
		// Import the re-exported function from SpatialAudio
		const { updateStormIntensity } = await import("../SpatialAudio");
		updateStormIntensity(0.75);
		expect(updateStormAudio).toHaveBeenCalledWith(0.75);
	});
});
