/**
 * Game loop bridge — the critical integration layer that wires all isolated
 * game systems together through the event bus.
 *
 * Without this module, the core gameplay loop cannot function: harvesting
 * produces CompressEvents that no one listens to, furnaces complete smelts
 * that never spawn cubes, and the HUD never updates.
 *
 * The bridge subscribes to internal system callbacks, polls state each frame,
 * and routes data between systems so they operate as a cohesive pipeline:
 *
 *   harvestCompress → CompressEvent → grabber.registerCube
 *                                   → eventBus.emit("resource_gathered")
 *                                   → audioEventSystem.triggerSound
 *                                   → particleEmitterSystem.emitParticle
 *                                   → notificationSystem.addNotification
 *                                   → progressionSystem.addXP
 *
 *   furnaceProcessing → SmeltingResult → grabber.registerCube
 *                                      → eventBus.emit("resource_gathered")
 *                                      → progressionSystem.addXP
 *
 *   damage → hudState.updateStatusBar + triggerDamageFlash
 *          → eventBus.emit("combat_kill") if lethal
 *
 *   position → hudState.updateCoords + updateGameInfo
 */

import { emit } from "./eventBus";
import type { CompressEvent } from "./harvestCompress";
import {
	getHarvestingState,
	getCompressionState,
} from "./harvestCompress";
import type { SmeltingResult, Vec3 } from "./furnaceProcessing";
import {
	updatePowderGauge,
	updateCompression,
	updateCoords,
	updateGameInfo,
	updateStatusBar,
	triggerDamageFlash,
	getHUDState,
} from "./hudState";
import { registerCube } from "./grabber";
import { triggerSound } from "./audioEventSystem";
import { emitParticle } from "./particleEmitterSystem";
import { addNotification } from "./notificationSystem";
import { addXP, XP_REWARDS } from "./progressionSystem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Internal bridge state, exposed via getBridgeState() for debugging. */
export interface BridgeState {
	initialized: boolean;
	tickCount: number;
	damageFlashIntensity: number;
	playerHealth: number;
	playerMaxHealth: number;
	playerPower: number;
	playerMaxPower: number;
	playerPosition: { x: number; z: number };
	currentBiome: string;
	cubesSpawnedTotal: number;
	smeltingsCompletedTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rate at which damage flash decays per second. */
const DAMAGE_FLASH_DECAY_RATE = 2.0;

/** Health threshold (fraction) below which the low-health warning fires. */
const LOW_HEALTH_THRESHOLD = 0.25;

/** Power threshold (fraction) below which the low-power warning fires. */
const LOW_POWER_THRESHOLD = 0.15;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let initialized = false;
let tickCount = 0;
let damageFlashIntensity = 0;
let playerHealth = 100;
let playerMaxHealth = 100;
let playerPower = 100;
let playerMaxPower = 100;
let playerPosition = { x: 0, z: 0 };
let currentBiome = "rust_plains";
let cubesSpawnedTotal = 0;
let smeltingsCompletedTotal = 0;

/** The entity ID for the player (used to poll harvest/compress state). */
let playerEntityId = "player";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the game loop bridge.
 *
 * Subscribes to internal system callbacks and sets initial HUD state.
 * Safe to call multiple times — subsequent calls are no-ops unless
 * reset() is called first.
 *
 * @param entityId - The player entity ID for polling harvest/compress state.
 *                   Defaults to "player".
 */
export function initBridge(entityId?: string): void {
	if (initialized) return;
	initialized = true;

	if (entityId) {
		playerEntityId = entityId;
	}

	// Set initial HUD values
	updateStatusBar("componentHealth", {
		current: playerHealth,
		max: playerMaxHealth,
	});
	updateStatusBar("powerLevel", {
		current: playerPower,
		max: playerMaxPower,
	});
	updateCoords(playerPosition.x, playerPosition.z);
}

/**
 * Set the player entity ID used for polling harvest/compress state.
 *
 * @param entityId - The player entity ID.
 */
export function setPlayerEntityId(entityId: string): void {
	playerEntityId = entityId;
}

// ---------------------------------------------------------------------------
// Per-frame tick
// ---------------------------------------------------------------------------

/**
 * Called each frame to poll game system state and push updates to the HUD.
 *
 * Responsibilities:
 * - Poll harvest state and update powder gauge
 * - Poll compression state and update compression overlay
 * - Check health/power warnings
 * - Decay damage flash intensity
 * - Increment tick count
 *
 * @param delta - Time elapsed this frame in seconds.
 */
export function bridgeTick(delta: number): void {
	// --- Poll harvest state → update powder gauge ---
	const harvestState = getHarvestingState(playerEntityId);
	if (harvestState) {
		updatePowderGauge({
			current: harvestState.powderCollected,
			max: harvestState.capacity,
			resourceType: harvestState.materialType,
		});
	}

	// --- Poll compression state → update compression overlay ---
	const compressState = getCompressionState(playerEntityId);
	if (compressState) {
		const progress = compressState.progress / compressState.duration;
		// Pressure and temperature ramp with progress
		updateCompression({
			active: true,
			progress,
			pressure: progress * 0.8 + 0.2,
			temperature: progress * 0.6 + 0.1,
		});
	} else {
		// Only deactivate if it was active
		updateCompression({ active: false, progress: 0, pressure: 0, temperature: 0 });
	}

	// --- Check warnings ---
	const healthFraction = playerMaxHealth > 0 ? playerHealth / playerMaxHealth : 0;
	const powerFraction = playerMaxPower > 0 ? playerPower / playerMaxPower : 0;

	updateStatusBar("componentHealth", {
		current: playerHealth,
		max: playerMaxHealth,
	});
	updateStatusBar("powerLevel", {
		current: playerPower,
		max: playerMaxPower,
	});

	// --- Decay damage flash ---
	if (damageFlashIntensity > 0) {
		damageFlashIntensity = Math.max(
			0,
			damageFlashIntensity - delta * DAMAGE_FLASH_DECAY_RATE,
		);
		triggerDamageFlash(damageFlashIntensity);
	}

	// --- Increment tick ---
	tickCount++;
	updateGameInfo(1, tickCount, currentBiome);
}

// ---------------------------------------------------------------------------
// Compress event processing
// ---------------------------------------------------------------------------

/**
 * Process CompressEvents emitted by the harvestCompress system.
 *
 * For each event:
 * 1. Creates a cube entity in the grabber registry
 * 2. Emits "resource_gathered" to the event bus
 * 3. Triggers audio (compress_whoosh)
 * 4. Triggers particle effect (compress_burst)
 * 5. Sends a player notification
 * 6. Awards crafting XP
 *
 * @param events - Array of CompressEvents from harvestCompressSystem().
 */
export function processCompressEvents(events: CompressEvent[]): void {
	for (const event of events) {
		const cubeId = `cube_${event.materialType}_${tickCount}_${cubesSpawnedTotal}`;

		// 1. Register cube in grabber system
		registerCube({
			id: cubeId,
			position: { x: event.x, y: 0.25, z: event.z },
			traits: ["Grabbable"],
			material: event.materialType,
		});

		// 2. Emit event bus event
		emit({
			type: "resource_gathered",
			resourceType: event.materialType,
			amount: 1,
			sourceId: event.entityId,
			tick: tickCount,
		});

		// 3. Trigger audio
		triggerSound("compress_whoosh", { x: event.x, y: 0.25, z: event.z }, {
			volume: 0.8,
			startTick: tickCount,
		});

		// 4. Trigger particles
		emitParticle("compress_burst", { x: event.x, y: 0.25, z: event.z }, {
			intensity: 0.7,
			startTick: tickCount,
			duration: 30,
		});

		// 5. Send notification
		addNotification(
			"success",
			"Cube Compressed",
			`Compressed 1x ${event.materialType} Cube`,
			tickCount,
			150,
		);

		// 6. Award XP
		addXP(XP_REWARDS.craft, "craft");

		cubesSpawnedTotal++;
	}
}

// ---------------------------------------------------------------------------
// Smelting result processing
// ---------------------------------------------------------------------------

/**
 * Process a SmeltingResult from the furnace processing system.
 *
 * If the result indicates completion:
 * 1. Spawns an output cube at the furnace output position
 * 2. Emits "resource_gathered" to the event bus
 * 3. Sends a player notification
 * 4. Awards crafting XP
 *
 * @param furnaceId - The ID of the furnace that produced the result.
 * @param result    - The SmeltingResult from updateFurnaceProcessing().
 */
export function processSmeltingResult(
	furnaceId: string,
	result: SmeltingResult,
): void {
	if (!result.completed) return;
	if (!result.outputMaterial || !result.outputPosition) return;

	const cubeId = `smelted_${result.outputMaterial}_${tickCount}_${smeltingsCompletedTotal}`;

	// 1. Register output cube
	registerCube({
		id: cubeId,
		position: { ...result.outputPosition },
		traits: ["Grabbable"],
		material: result.outputMaterial,
	});

	// 2. Emit event bus event
	emit({
		type: "resource_gathered",
		resourceType: result.outputMaterial,
		amount: 1,
		sourceId: furnaceId,
		tick: tickCount,
	});

	// 3. Send notification
	addNotification(
		"success",
		"Smelting Complete",
		`Furnace produced 1x ${result.outputMaterial}`,
		tickCount,
		150,
	);

	// 4. Award XP
	addXP(XP_REWARDS.craft, "craft");

	smeltingsCompletedTotal++;
}

// ---------------------------------------------------------------------------
// Damage handling
// ---------------------------------------------------------------------------

/**
 * Handle damage taken by the player.
 *
 * Updates player health, triggers damage flash, updates HUD, and emits
 * combat events if the damage is lethal.
 *
 * @param amount   - Damage amount to apply.
 * @param sourceId - ID of the entity that dealt the damage.
 */
export function onDamageTaken(amount: number, sourceId: string): void {
	if (amount <= 0) return;

	playerHealth = Math.max(0, playerHealth - amount);

	// Trigger damage flash — scale intensity by damage fraction
	const flashIntensity = Math.min(1, amount / playerMaxHealth + 0.3);
	damageFlashIntensity = Math.min(1, flashIntensity);
	triggerDamageFlash(damageFlashIntensity);

	// Update HUD health bar
	updateStatusBar("componentHealth", {
		current: playerHealth,
		max: playerMaxHealth,
	});

	// Trigger audio
	triggerSound("damage_hit", { x: playerPosition.x, y: 0, z: playerPosition.z }, {
		volume: 0.9,
		startTick: tickCount,
	});

	// Check for lethal damage
	if (playerHealth <= 0) {
		emit({
			type: "combat_kill",
			attackerId: sourceId,
			targetId: playerEntityId,
			weaponType: "unknown",
			tick: tickCount,
		});
	}
}

// ---------------------------------------------------------------------------
// Position updates
// ---------------------------------------------------------------------------

/**
 * Update the player's position and biome on the HUD.
 *
 * @param x     - World X coordinate.
 * @param z     - World Z coordinate.
 * @param biome - Name of the biome the player is currently in.
 */
export function updatePlayerPosition(
	x: number,
	z: number,
	biome: string,
): void {
	playerPosition = { x, z };
	currentBiome = biome;
	updateCoords(x, z);
	updateGameInfo(1, tickCount, biome);
}

// ---------------------------------------------------------------------------
// Player stat setters (for external systems to sync)
// ---------------------------------------------------------------------------

/**
 * Set the player's current health.
 *
 * @param current - Current health value.
 * @param max     - Maximum health value.
 */
export function setPlayerHealth(current: number, max: number): void {
	playerHealth = current;
	playerMaxHealth = max;
	updateStatusBar("componentHealth", { current, max });
}

/**
 * Set the player's current power level.
 *
 * @param current - Current power value.
 * @param max     - Maximum power value.
 */
export function setPlayerPower(current: number, max: number): void {
	playerPower = current;
	playerMaxPower = max;
	updateStatusBar("powerLevel", { current, max });
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Get a snapshot of the bridge's internal state for debugging or testing.
 */
export function getBridgeState(): BridgeState {
	return {
		initialized,
		tickCount,
		damageFlashIntensity,
		playerHealth,
		playerMaxHealth,
		playerPower,
		playerMaxPower,
		playerPosition: { ...playerPosition },
		currentBiome,
		cubesSpawnedTotal,
		smeltingsCompletedTotal,
	};
}

/**
 * Get the current tick count tracked by the bridge.
 */
export function getTickCount(): number {
	return tickCount;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all bridge state. For tests and new-game initialization.
 */
export function reset(): void {
	initialized = false;
	tickCount = 0;
	damageFlashIntensity = 0;
	playerHealth = 100;
	playerMaxHealth = 100;
	playerPower = 100;
	playerMaxPower = 100;
	playerPosition = { x: 0, z: 0 };
	currentBiome = "rust_plains";
	cubesSpawnedTotal = 0;
	smeltingsCompletedTotal = 0;
	playerEntityId = "player";
}
