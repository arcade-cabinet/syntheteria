/**
 * Unit tests for gameState.ts — game speed, pause, tick counting,
 * subscribe/notify, and snapshot caching.
 *
 * We mock all external system imports to isolate the state management logic.
 */

// ---------------------------------------------------------------------------
// Mock all system imports — gameState imports many systems
// ---------------------------------------------------------------------------

jest.mock("../../systems/combat", () => ({
	combatSystem: jest.fn(),
	getLastCombatEvents: jest.fn(() => []),
}));
jest.mock("../../systems/aiCivilization", () => ({
	aiCivilizationSystem: jest.fn(),
}));
jest.mock("../../systems/enemies", () => ({
	enemySystem: jest.fn(),
}));
jest.mock("../../systems/exploration", () => ({
	explorationSystem: jest.fn(),
}));
jest.mock("../../systems/fabrication", () => ({
	fabricationSystem: jest.fn(),
	getActiveJobs: jest.fn(() => []),
}));
jest.mock("../../systems/fragmentMerge", () => ({
	fragmentMergeSystem: jest.fn(() => []),
}));
jest.mock("../../systems/hacking", () => ({
	hackingSystem: jest.fn(),
}));
jest.mock("../../systems/mining", () => ({
	miningSystem: jest.fn(),
}));
jest.mock("../../systems/otters", () => ({
	otterSystem: jest.fn(),
}));
jest.mock("../../systems/power", () => ({
	getPowerSnapshot: jest.fn(() => ({ totalCapacity: 0, currentLoad: 0, sources: [] })),
	powerSystem: jest.fn(),
}));
jest.mock("../../systems/powerRouting", () => ({
	updatePowerGrid: jest.fn(),
}));
jest.mock("../../systems/processing", () => ({
	processingSystem: jest.fn(),
}));
jest.mock("../../systems/questSystem", () => ({
	updateQuests: jest.fn(),
}));
jest.mock("../../systems/repair", () => ({
	repairSystem: jest.fn(),
}));
jest.mock("../../systems/resources", () => ({
	getResources: jest.fn(() => ({
		scrap_metal: 0,
		e_waste: 0,
		rare_alloy: 0,
		copper: 0,
		fiber_optics: 0,
	})),
	resourceSystem: jest.fn(),
}));
jest.mock("../../systems/raidSystem", () => ({
	getActiveRaidIds: jest.fn(() => []),
	executeRaid: jest.fn(),
}));
jest.mock("../../systems/signalNetwork", () => ({
	signalNetworkSystem: jest.fn(),
}));
jest.mock("../../systems/techTree", () => ({
	updateResearch: jest.fn(() => null),
}));
jest.mock("../../systems/techEffects", () => ({
	applyTechEffects: jest.fn(),
}));
jest.mock("../../systems/territory", () => ({
	getAllTerritories: jest.fn(() => []),
}));
jest.mock("../../systems/territoryEffects", () => ({
	applyContestationDecay: jest.fn(),
}));
jest.mock("../../systems/turret", () => ({
	turretSystem: jest.fn(),
}));
jest.mock("../../systems/wireNetwork", () => ({
	wireNetworkSystem: jest.fn(),
}));
jest.mock("../../systems/gameOverDetection", () => ({
	checkGameOver: jest.fn(),
	getGameOverState: jest.fn(() => null),
}));

// Mock terrain (used by gameState)
jest.mock("../terrain", () => ({
	getAllFragments: jest.fn(() => []),
	updateDisplayOffsets: jest.fn(),
}));

// Mock world (used by gameState for unit counting)
jest.mock("../world", () => ({
	units: [],
}));

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import {
	getGameSpeed,
	setGameSpeed,
	setTickCount,
	togglePause,
	isPaused,
	simulationTick,
	notifyStateChange,
	subscribe,
	getSnapshot,
} from "../gameState";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	// Reset to known state
	if (isPaused()) togglePause(); // unpause
	setGameSpeed(1.0);
	setTickCount(0);
});

// ---------------------------------------------------------------------------
// getGameSpeed / setGameSpeed
// ---------------------------------------------------------------------------

describe("game speed", () => {
	it("defaults to 1.0", () => {
		expect(getGameSpeed()).toBe(1.0);
	});

	it("setGameSpeed updates the speed", () => {
		setGameSpeed(2.0);
		expect(getGameSpeed()).toBe(2.0);
	});

	it("clamps speed to minimum 0.5", () => {
		setGameSpeed(0.1);
		expect(getGameSpeed()).toBe(0.5);
	});

	it("clamps speed to maximum 4", () => {
		setGameSpeed(10);
		expect(getGameSpeed()).toBe(4);
	});

	it("returns 0 when paused regardless of set speed", () => {
		setGameSpeed(2.0);
		togglePause();
		expect(getGameSpeed()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// togglePause / isPaused
// ---------------------------------------------------------------------------

describe("pause", () => {
	it("starts unpaused", () => {
		expect(isPaused()).toBe(false);
	});

	it("togglePause pauses the game", () => {
		togglePause();
		expect(isPaused()).toBe(true);
	});

	it("togglePause twice returns to unpaused", () => {
		togglePause();
		togglePause();
		expect(isPaused()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// simulationTick
// ---------------------------------------------------------------------------

describe("simulationTick", () => {
	it("increments tick count", () => {
		const before = getSnapshot().tick;
		simulationTick();
		const after = getSnapshot().tick;
		expect(after).toBe(before + 1);
	});

	it("does not increment tick when paused", () => {
		togglePause();
		const before = getSnapshot().tick;
		simulationTick();
		const after = getSnapshot().tick;
		expect(after).toBe(before);
	});

	it("notifies listeners", () => {
		const listener = jest.fn();
		const unsub = subscribe(listener);
		simulationTick();
		expect(listener).toHaveBeenCalled();
		unsub();
	});
});

// ---------------------------------------------------------------------------
// setTickCount
// ---------------------------------------------------------------------------

describe("setTickCount", () => {
	it("sets the tick count for save/load", () => {
		setTickCount(500);
		const snap = getSnapshot();
		expect(snap.tick).toBe(500);
	});
});

// ---------------------------------------------------------------------------
// subscribe / notify
// ---------------------------------------------------------------------------

describe("subscribe", () => {
	it("calls listener on state change", () => {
		const listener = jest.fn();
		const unsub = subscribe(listener);
		notifyStateChange();
		expect(listener).toHaveBeenCalledTimes(1);
		unsub();
	});

	it("unsubscribe stops notifications", () => {
		const listener = jest.fn();
		const unsub = subscribe(listener);
		unsub();
		notifyStateChange();
		expect(listener).not.toHaveBeenCalled();
	});

	it("multiple listeners are all notified", () => {
		const l1 = jest.fn();
		const l2 = jest.fn();
		const unsub1 = subscribe(l1);
		const unsub2 = subscribe(l2);

		notifyStateChange();
		expect(l1).toHaveBeenCalledTimes(1);
		expect(l2).toHaveBeenCalledTimes(1);

		unsub1();
		unsub2();
	});

	it("unsubscribing one listener does not affect others", () => {
		const l1 = jest.fn();
		const l2 = jest.fn();
		const unsub1 = subscribe(l1);
		const unsub2 = subscribe(l2);

		unsub1();
		notifyStateChange();
		expect(l1).not.toHaveBeenCalled();
		expect(l2).toHaveBeenCalledTimes(1);

		unsub2();
	});
});

// ---------------------------------------------------------------------------
// getSnapshot — caching
// ---------------------------------------------------------------------------

describe("getSnapshot", () => {
	it("returns a snapshot object", () => {
		const snap = getSnapshot();
		expect(snap).toBeDefined();
		expect(typeof snap.tick).toBe("number");
		expect(typeof snap.paused).toBe("boolean");
		expect(typeof snap.gameSpeed).toBe("number");
	});

	it("returns the same reference on consecutive calls without state change", () => {
		const snap1 = getSnapshot();
		const snap2 = getSnapshot();
		expect(snap1).toBe(snap2);
	});

	it("returns a new reference after simulationTick", () => {
		const snap1 = getSnapshot();
		simulationTick();
		const snap2 = getSnapshot();
		expect(snap1).not.toBe(snap2);
	});

	it("returns a new reference after notifyStateChange", () => {
		const snap1 = getSnapshot();
		notifyStateChange();
		const snap2 = getSnapshot();
		expect(snap1).not.toBe(snap2);
	});

	it("reflects paused state", () => {
		expect(getSnapshot().paused).toBe(false);
		togglePause();
		expect(getSnapshot().paused).toBe(true);
	});

	it("reflects game speed", () => {
		setGameSpeed(3.0);
		expect(getSnapshot().gameSpeed).toBe(3.0);
	});
});
