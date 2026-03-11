/**
 * Game loop bridge — the critical integration layer that wires all isolated
 * game systems together through the event bus.
 *
 * Without this module, the core gameplay loop cannot function: harvesting
 * produces CompressEvents that no one listens to, furnaces complete smelts
 * that never spawn cubes, and the HUD never updates.
 *
 * The bridge polls system state each frame and routes data between systems
 * so they operate as a cohesive pipeline. Call gameLoopBridge() once per tick.
 *
 * Integration map:
 *
 *   Harvest → HUD (powder gauge)
 *           → eventBus.emit("harvest_started")
 *           → audioEventSystem.triggerSound("harvest_grind")
 *           → particleEmitterSystem.emitParticle("harvest_sparks")
 *
 *   Compress (polling) → HUD (compression overlay)
 *                       → eventBus.emit("compression_started")
 *
 *   CompressEvent → grabber.registerCube
 *                 → eventBus.emit("resource_gathered")
 *                 → audioEventSystem.triggerSound("compress_whoosh")
 *                 → particleEmitterSystem.emitParticle("compress_burst")
 *                 → notificationSystem.addNotification
 *                 → progressionSystem.addXP
 *
 *   SmeltingResult → grabber.registerCube
 *                  → eventBus.emit("resource_gathered")
 *                  → eventBus.emit("smelting_complete")
 *                  → audioEventSystem.triggerSound("furnace_hum")
 *                  → particleEmitterSystem.emitParticle("smoke")
 *                  → notificationSystem.addNotification
 *                  → progressionSystem.addXP
 *
 *   Damage → hudState.updateStatusBar + triggerDamageFlash
 *          → audioEventSystem.triggerSound("damage_hit")
 *          → eventBus.emit("damage_taken")
 *          → eventBus.emit("combat_kill") if lethal
 *
 *   Position → hudState.updateCoords + updateGameInfo
 *
 *   EnemyKilled → eventBus.emit("combat_kill")
 *               → audioEventSystem.triggerSound("enemy_destroyed")
 *               → progressionSystem.addXP(battle)
 *               → notificationSystem.addNotification
 *
 *   BuildingPlaced → eventBus.emit("building_placed")
 *                  → audioEventSystem.triggerSound("building_place")
 *                  → particleEmitterSystem.emitParticle("construction_dust")
 *                  → notificationSystem.addNotification
 *
 *   HarvestComplete → eventBus.emit("harvest_complete") on harvest→idle transition
 *
 *   AchievementSystem → polled every 60 ticks with lifetime GameStats
 *                     → onAchievementComplete → notificationSystem
 */

import { emit } from "./eventBus";
import type { CompressEvent } from "./harvestCompress";
import {
	getHarvestingState,
	getCompressionState,
} from "./harvestCompress";
import type { SmeltingResult } from "./furnaceProcessing";
import {
	updatePowderGauge,
	updateCompression,
	updateCoords,
	updateGameInfo,
	updateStatusBar,
	triggerDamageFlash,
} from "./hudState";
import { registerCube } from "./grabber";
import { triggerSound } from "./audioEventSystem";
import { emitParticle } from "./particleEmitterSystem";
import { addNotification } from "./notificationSystem";
import { addXP, XP_REWARDS } from "./progressionSystem";
import {
	achievementSystem,
	onAchievementComplete,
	type GameStats,
	type AchievementEvent,
} from "./achievementSystem";

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
	/** Deposit ID of current harvest (null when not harvesting). Used to track harvest_started. */
	activeHarvestDepositId: string | null;
	/** Whether compression was active last tick. Used to track compression_started. */
	wasCompressing: boolean;
	/** Lifetime count of ore harvest completions. */
	oreHarvestedTotal: number;
	/** Lifetime count of enemies defeated. */
	enemiesDefeatedTotal: number;
	/** Lifetime count of structures placed. */
	structuresPlacedTotal: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rate at which damage flash decays per second. */
const DAMAGE_FLASH_DECAY_RATE = 2.0;

/** Health threshold (fraction) below which the low-health warning fires. */
// @ts-ignore reserved for future use
const LOW_HEALTH_THRESHOLD = 0.25;

/** Power threshold (fraction) below which the low-power warning fires. */
// @ts-ignore reserved for future use
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

/** Tracks the deposit ID being harvested to detect harvest_started transitions. */
let activeHarvestDepositId: string | null = null;

/** Tracks the material type of the last active harvest (for harvest_complete event). */
let lastHarvestMaterialType: string | null = null;

/** Tracks whether compression was active last tick to detect compression_started. */
let wasCompressing = false;

// ---------------------------------------------------------------------------
// Lifetime stats — fed to achievementSystem each tick
// ---------------------------------------------------------------------------

let statsOreHarvested = 0;
let statsEnemiesDefeated = 0;
let statsStructuresPlaced = 0;

/** Unsubscribe handle for achievement completion callback. */
let unsubAchievements: (() => void) | null = null;

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

	// Wire achievement completion -> notification system
	unsubAchievements = onAchievementComplete((event: AchievementEvent) => {
		addNotification(
			"success",
			`Achievement: ${event.title}`,
			`Tier: ${event.tier}`,
			tickCount,
			300,
		);
	});
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
	// --- Poll harvest state → update powder gauge + audio/particles ---
	const harvestState = getHarvestingState(playerEntityId);
	if (harvestState) {
		updatePowderGauge({
			current: harvestState.powderCollected,
			max: harvestState.capacity,
			resourceType: harvestState.materialType,
		});

		// Emit harvest_started event on transition to new harvest
		if (activeHarvestDepositId !== harvestState.depositId) {
			activeHarvestDepositId = harvestState.depositId;
			lastHarvestMaterialType = harvestState.materialType;
			emit({
				type: "harvest_started",
				entityId: playerEntityId,
				depositId: harvestState.depositId,
				materialType: harvestState.materialType,
				tick: tickCount,
			});
		}

		// Trigger grinding audio (looping while harvest active)
		triggerSound(
			"harvest_grind",
			{ x: playerPosition.x, y: 0, z: playerPosition.z },
			{ loop: true, volume: 0.7, startTick: tickCount },
		);

		// Trigger spark particles while grinding
		emitParticle(
			"harvest_sparks",
			{ x: playerPosition.x, y: 0.5, z: playerPosition.z },
			{ intensity: 0.5, startTick: tickCount, duration: 5 },
		);
	} else {
		// Emit harvest_complete on transition from harvesting -> idle
		if (activeHarvestDepositId !== null) {
			emit({
				type: "harvest_complete",
				entityId: playerEntityId,
				depositId: activeHarvestDepositId,
				materialType: lastHarvestMaterialType ?? "unknown",
				powderGained: 0, // actual amount tracked by harvestCompress
				tick: tickCount,
			});
			statsOreHarvested++;
		}
		activeHarvestDepositId = null;
		lastHarvestMaterialType = null;
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

		// Emit compression_started event on transition
		if (!wasCompressing) {
			wasCompressing = true;
			emit({
				type: "compression_started",
				entityId: playerEntityId,
				materialType: compressState.materialType,
				tick: tickCount,
			});
		}
	} else {
		wasCompressing = false;
		// Only deactivate if it was active
		updateCompression({ active: false, progress: 0, pressure: 0, temperature: 0 });
	}

	// --- Check warnings ---
	// @ts-ignore reserved for future use
	const healthFraction = playerMaxHealth > 0 ? playerHealth / playerMaxHealth : 0;
	// @ts-ignore reserved for future use
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

	// --- Achievement system check (every 60 ticks to avoid per-frame cost) ---
	if (tickCount % 60 === 0) {
		const gameStats: GameStats = {
			locationsDiscovered: 0,
			enemiesDefeated: statsEnemiesDefeated,
			cubesAccumulated: cubesSpawnedTotal,
			structuresPlaced: statsStructuresPlaced,
			tradesCompleted: 0,
			playerLevel: 0,
			oreHarvested: statsOreHarvested,
			cubesCompressed: cubesSpawnedTotal,
			questsCompleted: 0,
			beltSegmentsBuilt: 0,
			wiresConnected: 0,
			machinesAssembled: 0,
			territoriesClaimed: 0,
			botsBuilt: 0,
		};
		achievementSystem(tickCount, gameStats);
	}

	// --- Increment tick ---
	tickCount++;
	updateGameInfo(1, tickCount, currentBiome);
}

// ---------------------------------------------------------------------------
// Single-call orchestrator
// ---------------------------------------------------------------------------

/**
 * Main game loop bridge — called once per tick to wire all isolated systems.
 *
 * This is the single entry point that the game loop calls each frame.
 * It delegates to bridgeTick for polling/updating, and is designed to be
 * extended with additional per-tick coordination as systems are integrated.
 *
 * @param delta - Time elapsed this frame in seconds.
 */
export function gameLoopBridge(delta: number): void {
	bridgeTick(delta);
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

	// 2. Emit resource_gathered event
	emit({
		type: "resource_gathered",
		resourceType: result.outputMaterial,
		amount: 1,
		sourceId: furnaceId,
		tick: tickCount,
	});

	// 3. Emit smelting_complete event
	emit({
		type: "smelting_complete",
		furnaceId,
		inputMaterial: result.outputMaterial, // input is consumed; log output material
		outputMaterial: result.outputMaterial,
		tick: tickCount,
	});

	// 4. Trigger furnace audio
	triggerSound("furnace_hum", { ...result.outputPosition }, {
		volume: 0.6,
		startTick: tickCount,
	});

	// 5. Trigger smoke particles
	emitParticle("smoke", { ...result.outputPosition }, {
		intensity: 0.5,
		startTick: tickCount,
		duration: 45,
	});

	// 6. Send notification
	addNotification(
		"success",
		"Smelting Complete",
		`Furnace produced 1x ${result.outputMaterial}`,
		tickCount,
		150,
	);

	// 7. Award XP
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

	// Emit damage_taken event
	emit({
		type: "damage_taken",
		targetId: playerEntityId,
		sourceId,
		amount,
		damageType: "melee",
		tick: tickCount,
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

/**
 * Handle a building/structure being placed in the world.
 *
 * Emits building_placed event, increments placement stats for the
 * achievement system, and sends a notification.
 *
 * @param buildingType - Type of building (e.g. "furnace", "turret", "belt").
 * @param buildingId   - Unique ID of the placed building entity.
 * @param position     - World position where the building was placed.
 */
export function onBuildingPlaced(
	buildingType: string,
	buildingId: string,
	position: { x: number; y: number; z: number },
): void {
	emit({
		type: "building_placed",
		buildingType,
		buildingId,
		position,
		tick: tickCount,
	});

	triggerSound("build_clang", position, {
		volume: 0.7,
		startTick: tickCount,
	});

	emitParticle("build_sparks", position, {
		intensity: 0.4,
		startTick: tickCount,
		duration: 20,
	});

	statsStructuresPlaced++;

	addNotification(
		"info",
		"Structure Placed",
		`Built ${buildingType}`,
		tickCount,
		100,
	);
}

/**
 * Handle an enemy being killed by the player.
 *
 * Emits combat_kill event, awards battle XP, increments kill stats for
 * the achievement system, and sends a notification.
 *
 * @param targetId   - ID of the defeated enemy entity.
 * @param weaponType - Weapon used for the kill (e.g. "welder", "thrown_cube").
 */
export function onEnemyKilled(targetId: string, weaponType: string): void {
	emit({
		type: "combat_kill",
		attackerId: playerEntityId,
		targetId,
		weaponType,
		tick: tickCount,
	});

	triggerSound("explosion", { x: playerPosition.x, y: 0, z: playerPosition.z }, {
		volume: 0.8,
		startTick: tickCount,
	});

	addXP(XP_REWARDS.battle, "battle");
	statsEnemiesDefeated++;

	addNotification(
		"success",
		"Enemy Destroyed",
		`Defeated ${targetId}`,
		tickCount,
		120,
	);
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
		activeHarvestDepositId,
		wasCompressing,
		oreHarvestedTotal: statsOreHarvested,
		enemiesDefeatedTotal: statsEnemiesDefeated,
		structuresPlacedTotal: statsStructuresPlaced,
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
	activeHarvestDepositId = null;
	lastHarvestMaterialType = null;
	wasCompressing = false;
	statsOreHarvested = 0;
	statsEnemiesDefeated = 0;
	statsStructuresPlaced = 0;
	if (unsubAchievements) {
		unsubAchievements();
		unsubAchievements = null;
	}
}
