/**
 * Vitest setup: DOM matchers and global mocks.
 * Tests that need DB call setDatabaseResolver(createTestDb()) in beforeAll.
 */
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ─── Tone.js mock ────────────────────────────────────────────────────────────
// Tone.js creates an AudioContext on import, which crashes in JSDOM
// (no Web Audio API). Mock the entire module with stubs that no-op.
// Every method returns `this` for chaining (Tone.js API pattern).

function createMockGain() {
	const gain: any = {
		gain: { value: 1 },
		connect: vi.fn().mockReturnThis(),
		toDestination: vi.fn().mockReturnThis(),
		dispose: vi.fn(),
	};
	// Make connect/toDestination return the gain itself for chaining
	gain.connect.mockReturnValue(gain);
	gain.toDestination.mockReturnValue(gain);
	return gain;
}

function createMockSynth() {
	const synth: any = {
		connect: vi.fn(),
		triggerAttackRelease: vi.fn(),
		dispose: vi.fn(),
		volume: { value: 0 },
	};
	synth.connect.mockReturnValue(synth);
	return synth;
}

function createMockNoise() {
	const noise: any = {
		connect: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		dispose: vi.fn(),
		volume: { value: 0 },
	};
	noise.connect.mockReturnValue(noise);
	return noise;
}

function createMockFilter() {
	const filter: any = {
		connect: vi.fn(),
		dispose: vi.fn(),
	};
	filter.connect.mockReturnValue(filter);
	return filter;
}

function createMockReverb() {
	const reverb: any = {
		connect: vi.fn(),
		dispose: vi.fn(),
	};
	reverb.connect.mockReturnValue(reverb);
	return reverb;
}

// NOTE: vi.fn() wraps must use regular functions (not arrows) so they
// support the `new` operator. Arrow functions lack [[Construct]] and
// throw "not a constructor" when called with `new Tone.Gain(...)` etc.
vi.mock("tone", () => ({
	start: vi.fn().mockResolvedValue(undefined),
	Gain: vi.fn(function () {
		return createMockGain();
	}),
	Synth: vi.fn(function () {
		return createMockSynth();
	}),
	PolySynth: vi.fn(function () {
		return createMockSynth();
	}),
	FMSynth: vi.fn(function () {
		return createMockSynth();
	}),
	NoiseSynth: vi.fn(function () {
		return createMockSynth();
	}),
	Noise: vi.fn(function () {
		return createMockNoise();
	}),
	Filter: vi.fn(function () {
		return createMockFilter();
	}),
	Reverb: vi.fn(function () {
		return createMockReverb();
	}),
}));
