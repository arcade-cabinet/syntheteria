/**
 * Unit tests for the game loop bridge — the integration layer that wires
 * all isolated game systems together.
 *
 * Tests cover:
 * - initBridge sets up initial state and HUD values
 * - bridgeTick polls harvest/compress state and updates HUD
 * - bridgeTick decays damage flash over time
 * - bridgeTick increments tick count
 * - processCompressEvents registers cubes in grabber
 * - processCompressEvents emits resource_gathered events
 * - processCompressEvents triggers audio and particles
 * - processCompressEvents sends notifications
 * - processCompressEvents awards crafting XP
 * - processCompressEvents handles multiple events in one call
 * - processSmeltingResult spawns output cube on completion
 * - processSmeltingResult ignores incomplete results
 * - processSmeltingResult ignores missing output data
 * - onDamageTaken reduces player health
 * - onDamageTaken triggers damage flash
 * - onDamageTaken emits combat_kill on lethal damage
 * - onDamageTaken ignores zero/negative damage
 * - updatePlayerPosition updates HUD coords and biome
 * - setPlayerHealth / setPlayerPower update HUD bars
 * - getBridgeState returns accurate snapshot
 * - reset clears all state
 * - Multiple processCompressEvents calls accumulate cube totals
 * - bridgeTick deactivates compression overlay when not compressing
 * - Damage flash clamps to 1.0 maximum
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before imports
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		mining: {
			oreTypes: {
				rock: { hardness: 1, grindSpeed: 1.0, color: "#8B7355" },
				scrap_iron: { hardness: 2, grindSpeed: 0.8, color: "#8B4513" },
			},
			defaultExtractionRate: 0.1,
			harvesting: {
				defaultRange: 3.0,
				defaultPowderCapacity: 100,
			},
		},
		deposits: {
			types: {
				rock: { frequency: 0.3, yieldRange: [50, 200], tier: 1 },
				scrap_iron: { frequency: 0.25, yieldRange: [30, 150], tier: 1 },
			},
		},
		furnace: {
			compression: {
				cubeSize: 0.5,
				configs: {
					rock: { powderRequired: 60, compressionTime: 3 },
					scrap_iron: { powderRequired: 100, compressionTime: 5 },
				},
			},
		},
	},
}));

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock("../eventBus", () => ({
	emit: jest.fn(),
	subscribe: jest.fn(() => jest.fn()),
}));

jest.mock("../harvestCompress", () => ({
	getHarvestingState: jest.fn(() => null),
	getCompressionState: jest.fn(() => null),
}));

jest.mock("../hudState", () => ({
	updatePowderGauge: jest.fn(),
	updateCompression: jest.fn(),
	updateCoords: jest.fn(),
	updateGameInfo: jest.fn(),
	updateStatusBar: jest.fn(),
	triggerDamageFlash: jest.fn(),
	getHUDState: jest.fn(() => ({ damageFlashIntensity: 0 })),
}));

jest.mock("../grabber", () => ({
	registerCube: jest.fn(),
}));

jest.mock("../audioEventSystem", () => ({
	triggerSound: jest.fn(() => ({ id: "sound_1" })),
}));

jest.mock("../particleEmitterSystem", () => ({
	emitParticle: jest.fn(() => ({ id: "particle_1" })),
}));

jest.mock("../notificationSystem", () => ({
	addNotification: jest.fn(() => ({ id: "notif_0" })),
}));

jest.mock("../progressionSystem", () => ({
	addXP: jest.fn(() => 25),
	XP_REWARDS: {
		quest: 500,
		craft: 25,
		discovery: 150,
		battle: 50,
		trade: 75,
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
	initBridge,
	bridgeTick,
	processCompressEvents,
	processSmeltingResult,
	onDamageTaken,
	updatePlayerPosition,
	setPlayerHealth,
	setPlayerPower,
	setPlayerEntityId,
	getBridgeState,
	getTickCount,
	reset,
} from "../gameLoopBridge";
import type { CompressEvent } from "../harvestCompress";
import type { SmeltingResult } from "../furnaceProcessing";

import { emit } from "../eventBus";
import { getHarvestingState, getCompressionState } from "../harvestCompress";
import {
	updatePowderGauge,
	updateCompression,
	updateCoords,
	updateGameInfo,
	updateStatusBar,
	triggerDamageFlash,
} from "../hudState";
import { registerCube } from "../grabber";
import { triggerSound } from "../audioEventSystem";
import { emitParticle } from "../particleEmitterSystem";
import { addNotification } from "../notificationSystem";
import { addXP } from "../progressionSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCompressEvent(overrides: Partial<CompressEvent> = {}): CompressEvent {
	return {
		entityId: "player",
		cubeSpawned: true,
		materialType: "scrap_iron",
		x: 5,
		z: 10,
		...overrides,
	};
}

function makeSmeltingResult(overrides: Partial<SmeltingResult> = {}): SmeltingResult {
	return {
		completed: true,
		outputMaterial: "iron_plate",
		outputPosition: { x: 10, y: 1, z: 21.5 },
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
	jest.clearAllMocks();
	(getHarvestingState as jest.Mock).mockReturnValue(null);
	(getCompressionState as jest.Mock).mockReturnValue(null);
});

// ===========================================================================
// initBridge
// ===========================================================================

describe("initBridge", () => {
	it("sets initialized to true", () => {
		initBridge();
		expect(getBridgeState().initialized).toBe(true);
	});

	it("sets initial HUD status bars", () => {
		initBridge();
		expect(updateStatusBar).toHaveBeenCalledWith("componentHealth", {
			current: 100,
			max: 100,
		});
		expect(updateStatusBar).toHaveBeenCalledWith("powerLevel", {
			current: 100,
			max: 100,
		});
	});

	it("is idempotent — second call is a no-op", () => {
		initBridge();
		jest.clearAllMocks();
		initBridge();
		expect(updateStatusBar).not.toHaveBeenCalled();
	});

	it("accepts a custom player entity ID", () => {
		initBridge("bot-42");
		bridgeTick(0.016);
		expect(getHarvestingState).toHaveBeenCalledWith("bot-42");
	});
});

// ===========================================================================
// bridgeTick
// ===========================================================================

describe("bridgeTick", () => {
	it("increments tick count each call", () => {
		bridgeTick(0.016);
		expect(getTickCount()).toBe(1);
		bridgeTick(0.016);
		expect(getTickCount()).toBe(2);
	});

	it("polls harvest state and updates powder gauge", () => {
		(getHarvestingState as jest.Mock).mockReturnValue({
			depositId: "dep_1",
			powderCollected: 42,
			capacity: 100,
			materialType: "scrap_iron",
		});

		bridgeTick(0.016);

		expect(updatePowderGauge).toHaveBeenCalledWith({
			current: 42,
			max: 100,
			resourceType: "scrap_iron",
		});
	});

	it("polls compression state and updates compression overlay", () => {
		(getCompressionState as jest.Mock).mockReturnValue({
			progress: 2,
			duration: 5,
			materialType: "scrap_iron",
		});

		bridgeTick(0.016);

		expect(updateCompression).toHaveBeenCalledWith(
			expect.objectContaining({
				active: true,
				progress: 2 / 5,
			}),
		);
	});

	it("deactivates compression overlay when not compressing", () => {
		(getCompressionState as jest.Mock).mockReturnValue(null);

		bridgeTick(0.016);

		expect(updateCompression).toHaveBeenCalledWith({
			active: false,
			progress: 0,
			pressure: 0,
			temperature: 0,
		});
	});

	it("decays damage flash over time", () => {
		// First: take damage to set flash
		onDamageTaken(20, "enemy_1");
		jest.clearAllMocks();

		// Tick with delta to decay
		bridgeTick(0.5); // decays by 0.5 * 2.0 = 1.0

		const state = getBridgeState();
		// Flash was ~0.5 (20/100 + 0.3), after decay by 1.0 it should be 0
		expect(state.damageFlashIntensity).toBe(0);
	});

	it("updates game info with tick count and biome", () => {
		bridgeTick(0.016);
		expect(updateGameInfo).toHaveBeenCalledWith(1, 1, "rust_plains");
	});

	it("updates health and power status bars each tick", () => {
		bridgeTick(0.016);
		expect(updateStatusBar).toHaveBeenCalledWith("componentHealth", {
			current: 100,
			max: 100,
		});
		expect(updateStatusBar).toHaveBeenCalledWith("powerLevel", {
			current: 100,
			max: 100,
		});
	});
});

// ===========================================================================
// processCompressEvents
// ===========================================================================

describe("processCompressEvents", () => {
	it("registers a cube in the grabber for each event", () => {
		processCompressEvents([makeCompressEvent()]);

		expect(registerCube).toHaveBeenCalledWith(
			expect.objectContaining({
				material: "scrap_iron",
				traits: ["Grabbable"],
				position: { x: 5, y: 0.25, z: 10 },
			}),
		);
	});

	it("emits resource_gathered event to event bus", () => {
		processCompressEvents([makeCompressEvent()]);

		expect(emit).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "resource_gathered",
				resourceType: "scrap_iron",
				amount: 1,
				sourceId: "player",
			}),
		);
	});

	it("triggers compress_whoosh audio", () => {
		processCompressEvents([makeCompressEvent()]);

		expect(triggerSound).toHaveBeenCalledWith(
			"compress_whoosh",
			expect.objectContaining({ x: 5, z: 10 }),
			expect.objectContaining({ volume: 0.8 }),
		);
	});

	it("triggers compress_burst particle effect", () => {
		processCompressEvents([makeCompressEvent()]);

		expect(emitParticle).toHaveBeenCalledWith(
			"compress_burst",
			expect.objectContaining({ x: 5, z: 10 }),
			expect.objectContaining({ intensity: 0.7 }),
		);
	});

	it("sends a notification with material name", () => {
		processCompressEvents([makeCompressEvent()]);

		expect(addNotification).toHaveBeenCalledWith(
			"success",
			"Cube Compressed",
			"Compressed 1x scrap_iron Cube",
			expect.any(Number),
			150,
		);
	});

	it("awards crafting XP", () => {
		processCompressEvents([makeCompressEvent()]);

		expect(addXP).toHaveBeenCalledWith(25, "craft");
	});

	it("handles multiple events in one call", () => {
		processCompressEvents([
			makeCompressEvent({ materialType: "rock", x: 1, z: 2 }),
			makeCompressEvent({ materialType: "scrap_iron", x: 3, z: 4 }),
			makeCompressEvent({ materialType: "rock", x: 5, z: 6 }),
		]);

		expect(registerCube).toHaveBeenCalledTimes(3);
		expect(emit).toHaveBeenCalledTimes(3);
		expect(triggerSound).toHaveBeenCalledTimes(3);
		expect(emitParticle).toHaveBeenCalledTimes(3);
		expect(addNotification).toHaveBeenCalledTimes(3);
		expect(addXP).toHaveBeenCalledTimes(3);
	});

	it("increments cubesSpawnedTotal", () => {
		processCompressEvents([makeCompressEvent(), makeCompressEvent()]);
		expect(getBridgeState().cubesSpawnedTotal).toBe(2);
	});

	it("handles empty events array without errors", () => {
		expect(() => processCompressEvents([])).not.toThrow();
		expect(registerCube).not.toHaveBeenCalled();
	});
});

// ===========================================================================
// processSmeltingResult
// ===========================================================================

describe("processSmeltingResult", () => {
	it("spawns output cube at furnace output position on completion", () => {
		processSmeltingResult("furnace_1", makeSmeltingResult());

		expect(registerCube).toHaveBeenCalledWith(
			expect.objectContaining({
				material: "iron_plate",
				traits: ["Grabbable"],
				position: { x: 10, y: 1, z: 21.5 },
			}),
		);
	});

	it("emits resource_gathered for smelted output", () => {
		processSmeltingResult("furnace_1", makeSmeltingResult());

		expect(emit).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "resource_gathered",
				resourceType: "iron_plate",
				sourceId: "furnace_1",
			}),
		);
	});

	it("sends notification on smelting completion", () => {
		processSmeltingResult("furnace_1", makeSmeltingResult());

		expect(addNotification).toHaveBeenCalledWith(
			"success",
			"Smelting Complete",
			"Furnace produced 1x iron_plate",
			expect.any(Number),
			150,
		);
	});

	it("awards XP on smelting completion", () => {
		processSmeltingResult("furnace_1", makeSmeltingResult());
		expect(addXP).toHaveBeenCalledWith(25, "craft");
	});

	it("ignores incomplete results", () => {
		processSmeltingResult("furnace_1", { completed: false });
		expect(registerCube).not.toHaveBeenCalled();
		expect(emit).not.toHaveBeenCalled();
	});

	it("ignores results with missing outputMaterial", () => {
		processSmeltingResult("furnace_1", {
			completed: true,
			outputPosition: { x: 0, y: 0, z: 0 },
		});
		expect(registerCube).not.toHaveBeenCalled();
	});

	it("ignores results with missing outputPosition", () => {
		processSmeltingResult("furnace_1", {
			completed: true,
			outputMaterial: "iron_plate",
		});
		expect(registerCube).not.toHaveBeenCalled();
	});

	it("increments smeltingsCompletedTotal", () => {
		processSmeltingResult("furnace_1", makeSmeltingResult());
		processSmeltingResult("furnace_2", makeSmeltingResult());
		expect(getBridgeState().smeltingsCompletedTotal).toBe(2);
	});
});

// ===========================================================================
// onDamageTaken
// ===========================================================================

describe("onDamageTaken", () => {
	it("reduces player health by damage amount", () => {
		onDamageTaken(30, "enemy_1");
		expect(getBridgeState().playerHealth).toBe(70);
	});

	it("clamps health to zero on lethal damage", () => {
		onDamageTaken(150, "enemy_1");
		expect(getBridgeState().playerHealth).toBe(0);
	});

	it("triggers damage flash", () => {
		onDamageTaken(20, "enemy_1");
		expect(triggerDamageFlash).toHaveBeenCalled();
		expect(getBridgeState().damageFlashIntensity).toBeGreaterThan(0);
	});

	it("updates HUD health bar", () => {
		onDamageTaken(25, "enemy_1");
		expect(updateStatusBar).toHaveBeenCalledWith("componentHealth", {
			current: 75,
			max: 100,
		});
	});

	it("triggers damage_hit audio", () => {
		onDamageTaken(10, "enemy_1");
		expect(triggerSound).toHaveBeenCalledWith(
			"damage_hit",
			expect.any(Object),
			expect.objectContaining({ volume: 0.9 }),
		);
	});

	it("emits combat_kill on lethal damage", () => {
		onDamageTaken(100, "enemy_1");
		expect(emit).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "combat_kill",
				attackerId: "enemy_1",
				targetId: "player",
			}),
		);
	});

	it("does NOT emit combat_kill on non-lethal damage", () => {
		onDamageTaken(50, "enemy_1");
		expect(emit).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "combat_kill" }),
		);
	});

	it("ignores zero damage", () => {
		onDamageTaken(0, "enemy_1");
		expect(getBridgeState().playerHealth).toBe(100);
		expect(triggerDamageFlash).not.toHaveBeenCalled();
	});

	it("ignores negative damage", () => {
		onDamageTaken(-10, "enemy_1");
		expect(getBridgeState().playerHealth).toBe(100);
	});

	it("clamps flash intensity to 1.0 maximum", () => {
		onDamageTaken(99, "enemy_1");
		expect(getBridgeState().damageFlashIntensity).toBeLessThanOrEqual(1);
	});
});

// ===========================================================================
// updatePlayerPosition
// ===========================================================================

describe("updatePlayerPosition", () => {
	it("updates HUD coordinates", () => {
		updatePlayerPosition(42, 99, "chrome_wastes");
		expect(updateCoords).toHaveBeenCalledWith(42, 99);
	});

	it("updates biome in bridge state", () => {
		updatePlayerPosition(0, 0, "acid_pools");
		expect(getBridgeState().currentBiome).toBe("acid_pools");
	});

	it("updates HUD game info with new biome", () => {
		updatePlayerPosition(10, 20, "silicon_dunes");
		expect(updateGameInfo).toHaveBeenCalledWith(
			1,
			expect.any(Number),
			"silicon_dunes",
		);
	});

	it("stores position in bridge state", () => {
		updatePlayerPosition(15, 25, "rust_plains");
		const state = getBridgeState();
		expect(state.playerPosition).toEqual({ x: 15, z: 25 });
	});
});

// ===========================================================================
// setPlayerHealth / setPlayerPower
// ===========================================================================

describe("setPlayerHealth", () => {
	it("updates health in bridge state", () => {
		setPlayerHealth(80, 120);
		const state = getBridgeState();
		expect(state.playerHealth).toBe(80);
		expect(state.playerMaxHealth).toBe(120);
	});

	it("updates HUD status bar", () => {
		setPlayerHealth(50, 100);
		expect(updateStatusBar).toHaveBeenCalledWith("componentHealth", {
			current: 50,
			max: 100,
		});
	});
});

describe("setPlayerPower", () => {
	it("updates power in bridge state", () => {
		setPlayerPower(60, 200);
		const state = getBridgeState();
		expect(state.playerPower).toBe(60);
		expect(state.playerMaxPower).toBe(200);
	});

	it("updates HUD power bar", () => {
		setPlayerPower(30, 100);
		expect(updateStatusBar).toHaveBeenCalledWith("powerLevel", {
			current: 30,
			max: 100,
		});
	});
});

// ===========================================================================
// getBridgeState / reset
// ===========================================================================

describe("getBridgeState", () => {
	it("returns accurate snapshot of all bridge state", () => {
		initBridge();
		const state = getBridgeState();

		expect(state.initialized).toBe(true);
		expect(state.tickCount).toBe(0);
		expect(state.damageFlashIntensity).toBe(0);
		expect(state.playerHealth).toBe(100);
		expect(state.playerMaxHealth).toBe(100);
		expect(state.playerPower).toBe(100);
		expect(state.playerMaxPower).toBe(100);
		expect(state.currentBiome).toBe("rust_plains");
		expect(state.cubesSpawnedTotal).toBe(0);
		expect(state.smeltingsCompletedTotal).toBe(0);
	});

	it("reflects changes after operations", () => {
		processCompressEvents([makeCompressEvent()]);
		onDamageTaken(15, "e");
		bridgeTick(0.016);

		const state = getBridgeState();
		expect(state.cubesSpawnedTotal).toBe(1);
		expect(state.playerHealth).toBe(85);
		expect(state.tickCount).toBe(1);
	});
});

describe("reset", () => {
	it("resets all state to defaults", () => {
		initBridge();
		processCompressEvents([makeCompressEvent()]);
		onDamageTaken(50, "e");
		bridgeTick(0.016);

		reset();

		const state = getBridgeState();
		expect(state.initialized).toBe(false);
		expect(state.tickCount).toBe(0);
		expect(state.damageFlashIntensity).toBe(0);
		expect(state.playerHealth).toBe(100);
		expect(state.cubesSpawnedTotal).toBe(0);
		expect(state.smeltingsCompletedTotal).toBe(0);
		expect(state.currentBiome).toBe("rust_plains");
	});
});

// ===========================================================================
// setPlayerEntityId
// ===========================================================================

describe("setPlayerEntityId", () => {
	it("changes which entity harvest/compress state is polled for", () => {
		setPlayerEntityId("worker-7");
		bridgeTick(0.016);
		expect(getHarvestingState).toHaveBeenCalledWith("worker-7");
		expect(getCompressionState).toHaveBeenCalledWith("worker-7");
	});
});
