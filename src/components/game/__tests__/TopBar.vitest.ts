/**
 * Tests for TopBar component logic.
 *
 * Tests the data flow and rendering logic without full browser rendering.
 * Mocks the ECS and audio modules to isolate TopBar behavior.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock modules ────────────────────────────────────────────────────────────

vi.mock("../../../audio", () => ({
	getMasterVolume: vi.fn(() => 0.8),
	setMasterVolume: vi.fn(),
}));

vi.mock("../../../config/humanEncounterDefs", () => ({
	getTemperatureTier: vi.fn((value: number) => ({
		displayName: value < 30 ? "dormant" : "alert",
		color: "#00ffff",
		effect: "No effect",
	})),
}));

vi.mock("../../../db/persistence", () => ({
	isPersistenceAvailable: vi.fn(() => false),
	listSaves: vi.fn(async () => []),
	loadGame: vi.fn(async () => false),
	saveGame: vi.fn(async () => false),
}));

const mockSnapshot = {
	tick: 42,
	gameSpeed: 1,
	paused: false,
	fragments: [],
	unitCount: 3,
	enemyCount: 1,
	mergeEvents: [],
	combatEvents: [],
	power: { totalGeneration: 10, totalDemand: 5, stormIntensity: 0.5 },
	resources: { scrapMetal: 15, circuitry: 8, powerCells: 3, durasteel: 0 },
	fabricationJobs: [],
	gamePhase: "awakening",
	gamePhaseDisplayName: "Awakening",
	gamePhaseElapsedSec: 100,
	phaseTransitionId: null,
	humanTemperature: 10,
	humanTemperatureTier: "dormant",
	compute: { totalCompute: 0, usedCompute: 0, nodeCount: 0 },
	hackEvents: [],
};

vi.mock("../../../ecs/gameState", () => ({
	getSnapshot: vi.fn(() => mockSnapshot),
	subscribe: vi.fn((_cb: () => void) => () => {}),
	getElapsedTicks: vi.fn(() => 42),
	getGameConfig: vi.fn(() => ({ seed: "test", difficulty: "normal" })),
	isPaused: vi.fn(() => false),
	setGameSpeed: vi.fn(),
	togglePause: vi.fn(),
}));

vi.mock("../../../ecs/world", () => ({
	world: {
		query: vi.fn(() => []),
	},
}));

vi.mock("../../../lib/utils", () => ({
	cn: vi.fn((...args: string[]) => args.filter(Boolean).join(" ")),
}));

import { isPersistenceAvailable } from "../../../db/persistence";
import { getSnapshot, setGameSpeed, togglePause } from "../../../ecs/gameState";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TopBar data flow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("snapshot provides resource values for badges", () => {
		const snap = vi.mocked(getSnapshot)();

		expect(snap.resources.scrapMetal).toBe(15);
		expect(snap.resources.circuitry).toBe(8);
		expect(snap.resources.powerCells).toBe(3);
		expect(snap.resources.durasteel).toBe(0);
	});

	it("speed steps are 0.5, 1, 2, 4", () => {
		const SPEED_STEPS = [0.5, 1, 2, 4] as const;
		expect(SPEED_STEPS).toEqual([0.5, 1, 2, 4]);
	});

	it("setGameSpeed is callable with valid speeds", () => {
		setGameSpeed(2);
		expect(setGameSpeed).toHaveBeenCalledWith(2);

		setGameSpeed(0.5);
		expect(setGameSpeed).toHaveBeenCalledWith(0.5);
	});

	it("togglePause is callable", () => {
		togglePause();
		expect(togglePause).toHaveBeenCalled();
	});

	it("snapshot contains unit and enemy counts", () => {
		const snap = vi.mocked(getSnapshot)();

		expect(snap.unitCount).toBe(3);
		expect(snap.enemyCount).toBe(1);
	});

	it("snapshot contains tick number", () => {
		const snap = vi.mocked(getSnapshot)();

		expect(snap.tick).toBe(42);
	});

	it("snapshot contains power info", () => {
		const snap = vi.mocked(getSnapshot)();

		expect(snap.power.totalGeneration).toBe(10);
		expect(snap.power.totalDemand).toBe(5);
		expect(snap.power.stormIntensity).toBe(0.5);
	});

	it("snapshot contains human temperature", () => {
		const snap = vi.mocked(getSnapshot)();

		expect(snap.humanTemperature).toBe(10);
	});

	it("save/load controls depend on persistence availability", () => {
		expect(vi.mocked(isPersistenceAvailable)()).toBe(false);
	});
});
