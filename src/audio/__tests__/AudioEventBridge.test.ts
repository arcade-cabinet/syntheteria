/**
 * Unit tests for AudioEventBridge.ts
 *
 * Tests cover:
 *   - initAudioBridge subscribes to all expected event sources
 *   - disposeAudioBridge removes all subscriptions
 *   - Resource gain event triggers playGrinding (throttled)
 *   - Selection change event triggers playCubeGrab (throttled)
 *   - Core loop harvesting → playGrinding
 *   - Core loop compression start → playCompression
 *   - Core loop compression end → playCubePlace
 *   - Core loop cube pickup → playCubePickup
 *   - Core loop cube drop → playCubeDrop
 *   - Quest complete → playQuestComplete
 *   - Game over (won) → playQuestComplete + playPowerUp
 *   - Game over (lost) → playDamageTaken
 *   - disposeAudioBridge is safe to call multiple times
 *   - onBuildingPlaced and onUIInteraction helpers
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Capture subscriber callbacks so we can invoke them in tests
type Subscriber = (...args: unknown[]) => void;

const mockResourceGainSubscribers: Subscriber[] = [];
const mockSelectionSubscribers: Subscriber[] = [];
const mockCoreLoopSubscribers: Subscriber[] = [];
const mockQuestCompleteSubscribers: Subscriber[] = [];
const mockGameOverSubscribers: Subscriber[] = [];
const mockGameStateSubscribers: Subscriber[] = [];

jest.mock("../../systems/resources", () => ({
	onResourceGain: (cb: Subscriber) => {
		mockResourceGainSubscribers.push(cb);
		return () => {
			const idx = mockResourceGainSubscribers.indexOf(cb);
			if (idx >= 0) mockResourceGainSubscribers.splice(idx, 1);
		};
	},
}));

jest.mock("../../input/selectionState", () => ({
	onSelectionChange: (cb: Subscriber) => {
		mockSelectionSubscribers.push(cb);
		return () => {
			const idx = mockSelectionSubscribers.indexOf(cb);
			if (idx >= 0) mockSelectionSubscribers.splice(idx, 1);
		};
	},
}));

let mockCoreLoopSnapshot = {
	isHarvesting: false,
	isCompressing: false,
	heldCubeId: null as string | null,
};

jest.mock("../../systems/CoreLoopSystem", () => ({
	getCoreLoopSnapshot: () => mockCoreLoopSnapshot,
	subscribeCoreLoop: (cb: Subscriber) => {
		mockCoreLoopSubscribers.push(cb);
		return () => {
			const idx = mockCoreLoopSubscribers.indexOf(cb);
			if (idx >= 0) mockCoreLoopSubscribers.splice(idx, 1);
		};
	},
}));

jest.mock("../../systems/questSystem", () => ({
	onQuestComplete: (cb: Subscriber) => {
		mockQuestCompleteSubscribers.push(cb);
		return () => {
			const idx = mockQuestCompleteSubscribers.indexOf(cb);
			if (idx >= 0) mockQuestCompleteSubscribers.splice(idx, 1);
		};
	},
}));

jest.mock("../../systems/gameOverDetection", () => ({
	onGameOver: (cb: Subscriber) => {
		mockGameOverSubscribers.push(cb);
		return () => {
			const idx = mockGameOverSubscribers.indexOf(cb);
			if (idx >= 0) mockGameOverSubscribers.splice(idx, 1);
		};
	},
}));

const mockSnapshot = {
	combatEvents: [] as Array<{ targetId: string; targetDestroyed: boolean; faction?: string }>,
	fabricationJobs: [] as Array<{ fabricatorId: string }>,
	enemyCount: 0,
	tick: 10,
	power: { stormIntensity: 0, rodCount: 0 },
};

jest.mock("../../ecs/gameState", () => ({
	getSnapshot: () => mockSnapshot,
	subscribe: (cb: Subscriber) => {
		mockGameStateSubscribers.push(cb);
		return () => {
			const idx = mockGameStateSubscribers.indexOf(cb);
			if (idx >= 0) mockGameStateSubscribers.splice(idx, 1);
		};
	},
}));

jest.mock("../../ecs/world", () => ({
	lightningRods: new Set(),
	units: [],
}));

// Mock sound functions
jest.mock("../GameSounds", () => ({
	playGrinding: jest.fn(),
	playCompression: jest.fn(),
	playCubePlace: jest.fn(),
	playCubeGrab: jest.fn(),
	playAlert: jest.fn(),
	playDamage: jest.fn(),
	playMetalImpact: jest.fn(),
	playUIBeep: jest.fn(),
	playLightningStrike: jest.fn(),
}));

jest.mock("../SpatialAudio", () => ({
	playSpatialMetalImpact: jest.fn(),
	playSpatialCrackle: jest.fn(),
}));

jest.mock("../SynthSounds", () => ({
	playCubePickup: jest.fn(),
	playCubeDrop: jest.fn(),
	playDamageTaken: jest.fn(),
	playPowerUp: jest.fn(),
	playQuestComplete: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	initAudioBridge,
	disposeAudioBridge,
	onBuildingPlaced,
	onUIInteraction,
} from "../AudioEventBridge";

import { playGrinding, playCompression, playCubePlace, playCubeGrab, playUIBeep } from "../GameSounds";
import { playCubePickup, playCubeDrop, playQuestComplete, playDamageTaken, playPowerUp } from "../SynthSounds";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();

	// Clear subscriber arrays
	mockResourceGainSubscribers.length = 0;
	mockSelectionSubscribers.length = 0;
	mockCoreLoopSubscribers.length = 0;
	mockQuestCompleteSubscribers.length = 0;
	mockGameOverSubscribers.length = 0;
	mockGameStateSubscribers.length = 0;

	// Reset core loop snapshot
	mockCoreLoopSnapshot = {
		isHarvesting: false,
		isCompressing: false,
		heldCubeId: null,
	};

	// Reset game snapshot
	mockSnapshot.combatEvents = [];
	mockSnapshot.fabricationJobs = [];
	mockSnapshot.enemyCount = 0;
	mockSnapshot.tick = 10;
	mockSnapshot.power = { stormIntensity: 0, rodCount: 0 };

	disposeAudioBridge();
});

afterEach(() => {
	disposeAudioBridge();
	jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("initAudioBridge", () => {
	it("subscribes to all event sources", () => {
		initAudioBridge();
		expect(mockResourceGainSubscribers.length).toBe(1);
		expect(mockSelectionSubscribers.length).toBe(1);
		expect(mockCoreLoopSubscribers.length).toBe(1);
		expect(mockQuestCompleteSubscribers.length).toBe(1);
		expect(mockGameOverSubscribers.length).toBe(1);
		expect(mockGameStateSubscribers.length).toBe(1);
	});
});

describe("disposeAudioBridge", () => {
	it("removes all subscriptions", () => {
		initAudioBridge();
		disposeAudioBridge();
		expect(mockResourceGainSubscribers.length).toBe(0);
		expect(mockSelectionSubscribers.length).toBe(0);
		expect(mockCoreLoopSubscribers.length).toBe(0);
	});

	it("is safe to call multiple times", () => {
		initAudioBridge();
		expect(() => {
			disposeAudioBridge();
			disposeAudioBridge();
		}).not.toThrow();
	});

	it("is safe to call before init", () => {
		expect(() => disposeAudioBridge()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Event → sound routing
// ---------------------------------------------------------------------------

describe("resource gain → playGrinding", () => {
	it("triggers playGrinding when resource is gained", () => {
		initAudioBridge();
		mockResourceGainSubscribers[0]("ore", 1);
		expect(playGrinding).toHaveBeenCalledTimes(1);
	});

	it("throttles: second call within 800ms is ignored", () => {
		initAudioBridge();
		mockResourceGainSubscribers[0]("ore", 1);
		mockResourceGainSubscribers[0]("ore", 1);
		expect(playGrinding).toHaveBeenCalledTimes(1);
	});

	it("allows second call after throttle interval", () => {
		initAudioBridge();
		mockResourceGainSubscribers[0]("ore", 1);
		jest.advanceTimersByTime(900);
		mockResourceGainSubscribers[0]("ore", 1);
		expect(playGrinding).toHaveBeenCalledTimes(2);
	});
});

describe("selection change → playCubeGrab", () => {
	it("triggers playCubeGrab when something is selected", () => {
		initAudioBridge();
		mockSelectionSubscribers[0]({ newId: "cube_01" });
		expect(playCubeGrab).toHaveBeenCalledTimes(1);
	});

	it("does not trigger when selection is cleared (newId null)", () => {
		initAudioBridge();
		mockSelectionSubscribers[0]({ newId: null });
		expect(playCubeGrab).not.toHaveBeenCalled();
	});
});

describe("core loop → harvesting sounds", () => {
	it("triggers playGrinding when harvesting starts", () => {
		initAudioBridge();
		mockCoreLoopSnapshot.isHarvesting = true;
		mockCoreLoopSubscribers[0]();
		expect(playGrinding).toHaveBeenCalledTimes(1);
	});

	it("does not trigger while harvesting remains true", () => {
		initAudioBridge();
		mockCoreLoopSnapshot.isHarvesting = true;
		mockCoreLoopSubscribers[0]();
		// Still harvesting — another tick
		mockCoreLoopSubscribers[0]();
		expect(playGrinding).toHaveBeenCalledTimes(1);
	});
});

describe("core loop → compression sounds", () => {
	it("triggers playCompression when compression starts", () => {
		initAudioBridge();
		mockCoreLoopSnapshot.isCompressing = true;
		mockCoreLoopSubscribers[0]();
		expect(playCompression).toHaveBeenCalledTimes(1);
	});

	it("triggers playCubePlace when compression ends", () => {
		initAudioBridge();
		// First: compression starts
		mockCoreLoopSnapshot.isCompressing = true;
		mockCoreLoopSubscribers[0]();
		// Then: compression ends
		mockCoreLoopSnapshot.isCompressing = false;
		mockCoreLoopSubscribers[0]();
		expect(playCubePlace).toHaveBeenCalledTimes(1);
	});
});

describe("core loop → cube pickup/drop sounds", () => {
	it("triggers playCubePickup when cube is grabbed", () => {
		initAudioBridge();
		mockCoreLoopSnapshot.heldCubeId = "cube_42";
		mockCoreLoopSubscribers[0]();
		expect(playCubePickup).toHaveBeenCalledTimes(1);
	});

	it("triggers playCubeDrop when cube is released", () => {
		initAudioBridge();
		// Grab
		mockCoreLoopSnapshot.heldCubeId = "cube_42";
		mockCoreLoopSubscribers[0]();
		// Drop
		mockCoreLoopSnapshot.heldCubeId = null;
		mockCoreLoopSubscribers[0]();
		expect(playCubeDrop).toHaveBeenCalledTimes(1);
	});
});

describe("quest complete → playQuestComplete", () => {
	it("triggers playQuestComplete on quest event", () => {
		initAudioBridge();
		mockQuestCompleteSubscribers[0]("quest_01");
		expect(playQuestComplete).toHaveBeenCalledTimes(1);
	});
});

describe("game over sounds", () => {
	it("triggers playQuestComplete on victory", () => {
		initAudioBridge();
		mockGameOverSubscribers[0]({ won: true });
		expect(playQuestComplete).toHaveBeenCalledTimes(1);
	});

	it("triggers playPowerUp after delay on victory", () => {
		initAudioBridge();
		mockGameOverSubscribers[0]({ won: true });
		expect(playPowerUp).not.toHaveBeenCalled();
		jest.advanceTimersByTime(400);
		expect(playPowerUp).toHaveBeenCalledTimes(1);
	});

	it("triggers playDamageTaken on loss", () => {
		initAudioBridge();
		mockGameOverSubscribers[0]({ won: false });
		expect(playDamageTaken).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Direct helpers
// ---------------------------------------------------------------------------

describe("onBuildingPlaced", () => {
	it("calls playCubePlace", () => {
		// Needs to bypass throttle — reset
		onBuildingPlaced();
		expect(playCubePlace).toHaveBeenCalledTimes(1);
	});

	it("is throttled at 300ms", () => {
		onBuildingPlaced();
		onBuildingPlaced();
		expect(playCubePlace).toHaveBeenCalledTimes(1);
	});
});

describe("onUIInteraction", () => {
	it("calls playUIBeep", () => {
		onUIInteraction();
		expect(playUIBeep).toHaveBeenCalledTimes(1);
	});

	it("is throttled at 100ms", () => {
		onUIInteraction();
		onUIInteraction();
		expect(playUIBeep).toHaveBeenCalledTimes(1);
	});
});
