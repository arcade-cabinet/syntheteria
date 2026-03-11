/**
 * Unit tests for SoundEngine.ts
 *
 * Mocks Tone.js entirely — no real AudioContext is created.
 * Tests cover:
 *   - initAudio / disposeAudio lifecycle
 *   - isAudioInitialized state
 *   - linearToDb conversion (via setMasterVolume side-effects)
 *   - getCategoryBus / getMasterBus returns
 *   - setCategoryVolume / setMasterVolume
 *   - playSound one-shot: calls factory, auto-disposes
 *   - startLoop / stopLoop / isLoopActive
 *   - startLoop replaces existing loop with same id
 *   - playSound / startLoop are no-ops before init
 */

// ---------------------------------------------------------------------------
// Tone.js mock
// ---------------------------------------------------------------------------

jest.mock("tone", () => ({
	start: jest.fn().mockResolvedValue(undefined),
	Volume: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
	initAudio,
	disposeAudio,
	isAudioInitialized,
	setMasterVolume,
	setCategoryVolume,
	getCategoryBus,
	getMasterBus,
	playSound,
	startLoop,
	stopLoop,
	isLoopActive,
} from "../SoundEngine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOneShotFactory(
	durationMs = 100,
): jest.Mock<{ dispose: jest.Mock; durationMs: number }> {
	return jest.fn((_bus) => ({
		dispose: jest.fn(),
		durationMs,
	}));
}

// Using `unknown` cast to avoid strict ToneAudioNode typing in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeLoopFactory(): any {
	return jest.fn((_bus: unknown) => ({
		source: {},
		dispose: jest.fn(),
	}));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function makeMockVolume() {
	return {
		volume: { value: 0 },
		connect: jest.fn(),
		dispose: jest.fn(),
		toDestination: jest.fn().mockReturnThis(),
	};
}

beforeEach(async () => {
	jest.clearAllMocks();

	// Configure the mock Volume constructor to return fresh instances
	const { Volume } = jest.requireMock("tone") as { Volume: jest.Mock };
	Volume.mockImplementation(makeMockVolume);

	// Ensure fresh state — reset by disposing if initialized
	if (isAudioInitialized()) {
		disposeAudio();
	}
});

afterEach(() => {
	if (isAudioInitialized()) {
		disposeAudio();
	}
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("initAudio", () => {
	it("sets isAudioInitialized to true", async () => {
		expect(isAudioInitialized()).toBe(false);
		await initAudio();
		expect(isAudioInitialized()).toBe(true);
	});

	it("is idempotent — calling twice does not double-create nodes", async () => {
		const { Volume } = jest.requireMock("tone") as { Volume: jest.Mock };
		await initAudio();
		const firstCallCount = Volume.mock.calls.length;
		await initAudio();
		expect(Volume.mock.calls.length).toBe(firstCallCount);
	});

	it("creates 5 Volume nodes: master + 4 category buses", async () => {
		const { Volume } = jest.requireMock("tone") as { Volume: jest.Mock };
		await initAudio();
		// master + sfx + music + ambience + ui = 5
		expect(Volume).toHaveBeenCalledTimes(5);
	});
});

describe("disposeAudio", () => {
	it("sets isAudioInitialized to false", async () => {
		await initAudio();
		disposeAudio();
		expect(isAudioInitialized()).toBe(false);
	});

	it("is safe to call before init", () => {
		expect(() => disposeAudio()).not.toThrow();
	});

	it("is safe to call twice", async () => {
		await initAudio();
		disposeAudio();
		expect(() => disposeAudio()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Bus access
// ---------------------------------------------------------------------------

describe("getCategoryBus", () => {
	it("returns null before init", () => {
		expect(getCategoryBus("sfx")).toBeNull();
		expect(getCategoryBus("music")).toBeNull();
		expect(getCategoryBus("ambience")).toBeNull();
		expect(getCategoryBus("ui")).toBeNull();
	});

	it("returns a non-null Volume node after init for all four categories", async () => {
		await initAudio();
		expect(getCategoryBus("sfx")).not.toBeNull();
		expect(getCategoryBus("music")).not.toBeNull();
		expect(getCategoryBus("ambience")).not.toBeNull();
		expect(getCategoryBus("ui")).not.toBeNull();
	});

	it("returns null after dispose", async () => {
		await initAudio();
		disposeAudio();
		expect(getCategoryBus("sfx")).toBeNull();
		expect(getCategoryBus("ui")).toBeNull();
	});
});

describe("getMasterBus", () => {
	it("returns null before init", () => {
		expect(getMasterBus()).toBeNull();
	});

	it("returns non-null after init", async () => {
		await initAudio();
		expect(getMasterBus()).not.toBeNull();
	});

	it("returns null after dispose", async () => {
		await initAudio();
		disposeAudio();
		expect(getMasterBus()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Volume control
// ---------------------------------------------------------------------------

describe("setMasterVolume", () => {
	it("is a no-op before init", () => {
		expect(() => setMasterVolume(0.5)).not.toThrow();
	});

	it("updates the master volume node value after init", async () => {
		await initAudio();
		const master = getMasterBus()!;
		setMasterVolume(1.0);
		// linearToDb(1.0) = 0 dB
		expect(master.volume.value).toBeCloseTo(0, 1);
	});

	it("clamps to -60 dB for volume=0", async () => {
		await initAudio();
		const master = getMasterBus()!;
		setMasterVolume(0);
		expect(master.volume.value).toBe(-60);
	});
});

describe("setCategoryVolume", () => {
	it("is a no-op before init", () => {
		expect(() => setCategoryVolume("sfx", 0.5)).not.toThrow();
	});

	it("updates the sfx category node value", async () => {
		await initAudio();
		const bus = getCategoryBus("sfx")!;
		setCategoryVolume("sfx", 1.0);
		expect(bus.volume.value).toBeCloseTo(0, 1);
	});

	it("updates the ui category node value", async () => {
		await initAudio();
		const bus = getCategoryBus("ui")!;
		setCategoryVolume("ui", 0);
		expect(bus.volume.value).toBe(-60);
	});
});

// ---------------------------------------------------------------------------
// One-shot sounds
// ---------------------------------------------------------------------------

describe("playSound", () => {
	it("is a no-op before init", () => {
		const factory = makeOneShotFactory();
		expect(() => playSound(factory)).not.toThrow();
		expect(factory).not.toHaveBeenCalled();
	});

	it("calls factory with the sfx bus after init", async () => {
		await initAudio();
		const factory = makeOneShotFactory();
		playSound(factory);
		expect(factory).toHaveBeenCalledTimes(1);
		expect(factory).toHaveBeenCalledWith(getCategoryBus("sfx"));
	});

	it("routes to the specified category bus", async () => {
		await initAudio();
		const factory = makeOneShotFactory();
		playSound(factory, { category: "ambience" });
		expect(factory).toHaveBeenCalledWith(getCategoryBus("ambience"));
	});

	it("auto-disposes after durationMs", async () => {
		jest.useFakeTimers();
		await initAudio();
		const factory = makeOneShotFactory(200);
		playSound(factory, { category: "sfx" });
		const { dispose } = factory.mock.results[0].value as {
			dispose: jest.Mock;
		};
		expect(dispose).not.toHaveBeenCalled();
		jest.advanceTimersByTime(200);
		expect(dispose).toHaveBeenCalledTimes(1);
		jest.useRealTimers();
	});
});

// ---------------------------------------------------------------------------
// Looping sounds
// ---------------------------------------------------------------------------

describe("startLoop / stopLoop / isLoopActive", () => {
	it("is a no-op before init", () => {
		const factory = makeLoopFactory();
		expect(() => startLoop("test", factory)).not.toThrow();
		expect(factory).not.toHaveBeenCalled();
		expect(isLoopActive("test")).toBe(false);
	});

	it("activates a loop by id", async () => {
		await initAudio();
		const factory = makeLoopFactory();
		startLoop("myloop", factory);
		expect(isLoopActive("myloop")).toBe(true);
	});

	it("calls factory with the ambience bus by default", async () => {
		await initAudio();
		const factory = makeLoopFactory();
		startLoop("myloop", factory);
		expect(factory).toHaveBeenCalledWith(getCategoryBus("ambience"));
	});

	it("routes to the specified category", async () => {
		await initAudio();
		const factory = makeLoopFactory();
		startLoop("sfxloop", factory, { category: "sfx" });
		expect(factory).toHaveBeenCalledWith(getCategoryBus("sfx"));
	});

	it("stopLoop deactivates the loop and calls dispose", async () => {
		await initAudio();
		const factory = makeLoopFactory();
		startLoop("myloop", factory);
		const { dispose } = factory.mock.results[0].value as {
			dispose: jest.Mock;
		};
		stopLoop("myloop");
		expect(isLoopActive("myloop")).toBe(false);
		expect(dispose).toHaveBeenCalledTimes(1);
	});

	it("stopLoop on unknown id is safe", async () => {
		await initAudio();
		expect(() => stopLoop("doesNotExist")).not.toThrow();
	});

	it("starting a loop with an existing id stops the previous one", async () => {
		await initAudio();
		const factory1 = makeLoopFactory();
		const factory2 = makeLoopFactory();

		startLoop("shared", factory1);
		const { dispose: dispose1 } = factory1.mock.results[0].value as {
			dispose: jest.Mock;
		};

		startLoop("shared", factory2);
		// Old loop should have been disposed
		expect(dispose1).toHaveBeenCalledTimes(1);
		expect(isLoopActive("shared")).toBe(true);
	});

	it("disposeAudio stops all active loops", async () => {
		await initAudio();
		const factory = makeLoopFactory();
		startLoop("loop1", factory);
		const { dispose } = factory.mock.results[0].value as {
			dispose: jest.Mock;
		};

		disposeAudio();
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(isLoopActive("loop1")).toBe(false);
	});
});
