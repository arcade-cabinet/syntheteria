/**
 * New game initialization orchestrator — coordinates all systems to create
 * a new game world from scratch.
 *
 * This is the "main()" for world setup. It executes a deterministic sequence
 * of steps: seed → terrain → biomes → deposits → player → AI → world systems
 * → tutorial → starter resources.
 *
 * All sub-systems are called in order; this module owns no game logic itself.
 * It delegates to mapGenerator, biomeSystem, oreSpawner, fogOfWarManager,
 * weatherSystem, hudState, tutorialSystem, economySimulation, and
 * botFleetManager.
 *
 * Data sourced from config/civilizations.json and config/mapPresets.json.
 */

import { config } from "../../config";
import { setWorldSeed, randomSeed, makePRNG } from "../ecs/seed";
import { generateWorld, type MapGenConfig, type WorldData } from "./mapGenerator";
import { setBiomeGrid, resetBiomeGrid } from "./biomeSystem";
import {
	spawnInitialDeposits,
	spawnOreDeposit,
	resetDeposits,
} from "./oreSpawner";
import {
	initFogMap,
	revealCell,
	resetFogOfWar,
	FOG_VISIBLE,
} from "./fogOfWarManager";
import { startTutorial, resetTutorial, getCurrentStep } from "./tutorialSystem";
import { resetTutorialOtterBridge } from "./tutorialOtterBridge";
import { resetHUDState, updateBotInfo, updateCoords } from "./hudState";
import { resetWeather, setRngSeed as setWeatherRngSeed } from "./weatherSystem";
import { resetEconomy } from "./economySimulation";
import { registerBot, resetBotFleet } from "./botFleetManager";
import { BaseAgent } from "../ai/base/BaseAgent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for starting a new game. Provided by the pregame setup screens.
 */
export interface NewGameOptions {
	/** Player faction ID, e.g. "reclaimers" */
	playerFaction: string;
	/** Map generation preset ID, e.g. "standard", "archipelago" */
	mapPreset: string;
	/** Optional fixed seed — randomized if not provided */
	worldSeed?: number;
	/** Difficulty level */
	difficulty: "easy" | "normal" | "hard" | "brutal";
	/** Whether the otter tutorial sequence should start */
	enableTutorial: boolean;
	/** Which AI factions to include in the game */
	aiFactions: string[];
	/** World size category */
	mapSize: "small" | "medium" | "large";
}

/**
 * Simplified new game configuration — the public-facing interface.
 *
 * Maps to NewGameOptions internally. Provides a cleaner API for the
 * pregame lobby / GDD-010 initialization sequence.
 */
export interface NewGameConfig {
	playerRace: string;
	mapSize: number;
	mapType: string;
	aiOpponents: string[];
	difficulty: string;
}

/**
 * Result of a new game initialization attempt.
 */
export interface NewGameResult {
	success: boolean;
	worldSeed: number;
	playerEntityId: string;
	spawnPosition: { x: number; z: number };
	depositCount: number;
	aiFactionCount: number;
	biomeCount: number;
	alienHiveCount: number;
	otterGuidePosition: { x: number; z: number } | null;
	errors: string[];
}

/**
 * Difficulty modifiers applied to AI and world systems.
 */
export interface DifficultyModifiers {
	/** Multiplier on AI economy production rate (0.5 easy → 2.0 brutal) */
	aiEconomyMultiplier: number;
	/** Seconds before AI civilizations start raiding the player */
	aiAggressionDelay: number;
	/** Player health multiplier */
	playerHealthMultiplier: number;
	/** Ore deposit quantity multiplier */
	resourceAbundance: number;
	/** Enemy (feral) spawn rate multiplier */
	enemySpawnRate: number;
}

/**
 * Validation result for NewGameOptions.
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Per-AI-faction spawn data returned from step 6.
 */
interface AIFactionData {
	faction: string;
	spawnPosition: { x: number; z: number };
	botId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_DIFFICULTIES = ["easy", "normal", "hard", "brutal"] as const;
const VALID_MAP_SIZES = ["small", "medium", "large"] as const;

/** Map size → world dimension multiplier applied to the preset's worldSize. */
const MAP_SIZE_MULTIPLIERS: Record<string, number> = {
	small: 0.5,
	medium: 1.0,
	large: 2.0,
};

/** Vision range (in grid cells) revealed around a spawn point. */
const SPAWN_VISION_RADIUS = 10;

/** Starter cubes placed near the player. */
const STARTER_CUBE_TYPES = ["scrap_iron", "scrap_iron", "scrap_iron", "copper", "copper"];

/** Alien hive types for the machine planet. */
const ALIEN_HIVE_TYPES = [
	"feral_nest",
	"scrap_hive",
	"signal_den",
	"rust_colony",
] as const;

/** Minimum distance from start positions to place alien hives. */
const HIVE_MIN_DISTANCE_FRACTION = 0.2;

/** Target hive density: 1 hive per this many square grid cells. */
const HIVE_AREA_PER_HIVE = 5000;

/** Otter guide offset distance from player spawn. */
const OTTER_GUIDE_OFFSET = 4;

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const civConfig = config.civilizations;
const mapPresetsConfig = config.mapPresets;

// ---------------------------------------------------------------------------
// Module state (for reset / testing)
// ---------------------------------------------------------------------------

let lastResult: NewGameResult | null = null;

/** BaseAgent instances keyed by faction ID. One per starting base. */
const baseAgents = new Map<string, BaseAgent>();

/** Alien hives placed during initialization. */
let placedHives: AlienHiveData[] = [];

/** Otter guide Pip data from initialization. */
let otterGuideData: OtterGuideData | null = null;

// ---------------------------------------------------------------------------
// Public API — Difficulty modifiers
// ---------------------------------------------------------------------------

/**
 * Get difficulty modifiers for a given difficulty level.
 *
 * Higher difficulties give AI factions economic and military advantages
 * while reducing player resources and health.
 */
export function getDifficultyModifiers(
	difficulty: "easy" | "normal" | "hard" | "brutal",
): DifficultyModifiers {
	switch (difficulty) {
		case "easy":
			return {
				aiEconomyMultiplier: 0.5,
				aiAggressionDelay: 600,
				playerHealthMultiplier: 1.5,
				resourceAbundance: 1.5,
				enemySpawnRate: 0.5,
			};
		case "normal":
			return {
				aiEconomyMultiplier: 1.0,
				aiAggressionDelay: 300,
				playerHealthMultiplier: 1.0,
				resourceAbundance: 1.0,
				enemySpawnRate: 1.0,
			};
		case "hard":
			return {
				aiEconomyMultiplier: 1.5,
				aiAggressionDelay: 150,
				playerHealthMultiplier: 0.75,
				resourceAbundance: 0.75,
				enemySpawnRate: 1.5,
			};
		case "brutal":
			return {
				aiEconomyMultiplier: 2.0,
				aiAggressionDelay: 60,
				playerHealthMultiplier: 0.5,
				resourceAbundance: 0.5,
				enemySpawnRate: 2.0,
			};
	}
}

// ---------------------------------------------------------------------------
// Public API — Spawn point calculation
// ---------------------------------------------------------------------------

/**
 * Calculate a spawn point for a faction based on its index among all factions.
 *
 * Points are distributed evenly around a circle centered on the map,
 * at 35% of the world radius. The first faction (index 0) is the player.
 *
 * @param mapData - Generated world data (for heightmap / world size)
 * @param factionIndex - 0 = player, 1..N = AI factions
 * @param totalFactions - Total number of factions in the game
 * @returns Grid coordinates for the spawn point
 */
export function getSpawnPoint(
	mapData: WorldData,
	factionIndex: number,
	totalFactions: number,
): { x: number; z: number } {
	const worldSize = mapData.heightmap.length;
	const center = worldSize / 2;
	const radius = worldSize * 0.35;

	const angle = (factionIndex / totalFactions) * Math.PI * 2;
	const x = Math.round(center + Math.cos(angle) * radius);
	const z = Math.round(center + Math.sin(angle) * radius);

	// Clamp to world bounds
	return {
		x: Math.max(0, Math.min(worldSize - 1, x)),
		z: Math.max(0, Math.min(worldSize - 1, z)),
	};
}

// ---------------------------------------------------------------------------
// Public API — Validation
// ---------------------------------------------------------------------------

/**
 * Validate NewGameOptions before initialization.
 *
 * Checks that faction IDs, map preset, difficulty, and map size are valid.
 * Does NOT throw — returns a ValidationResult with error messages.
 */
export function validateOptions(options: NewGameOptions): ValidationResult {
	const errors: string[] = [];
	const validFactions = Object.keys(civConfig);

	// Player faction
	if (!validFactions.includes(options.playerFaction)) {
		errors.push(
			`Invalid player faction "${options.playerFaction}". Valid: ${validFactions.join(", ")}`,
		);
	}

	// AI factions
	for (const aiFaction of options.aiFactions) {
		if (!validFactions.includes(aiFaction)) {
			errors.push(
				`Invalid AI faction "${aiFaction}". Valid: ${validFactions.join(", ")}`,
			);
		}
		if (aiFaction === options.playerFaction) {
			errors.push(
				`AI faction "${aiFaction}" cannot be the same as the player faction.`,
			);
		}
	}

	// Duplicate AI factions
	const uniqueAI = new Set(options.aiFactions);
	if (uniqueAI.size !== options.aiFactions.length) {
		errors.push("Duplicate AI factions detected.");
	}

	// Map preset
	const validPresets = Object.keys(mapPresetsConfig).filter(
		(k) => k !== "navmesh" && k !== "startingResources" && k !== "cityBounds" && k !== "cityLayout",
	);
	if (!validPresets.includes(options.mapPreset)) {
		errors.push(
			`Invalid map preset "${options.mapPreset}". Valid: ${validPresets.join(", ")}`,
		);
	}

	// Difficulty
	if (!(VALID_DIFFICULTIES as readonly string[]).includes(options.difficulty)) {
		errors.push(
			`Invalid difficulty "${options.difficulty}". Valid: ${VALID_DIFFICULTIES.join(", ")}`,
		);
	}

	// Map size
	if (!(VALID_MAP_SIZES as readonly string[]).includes(options.mapSize)) {
		errors.push(
			`Invalid map size "${options.mapSize}". Valid: ${VALID_MAP_SIZES.join(", ")}`,
		);
	}

	// World seed (if provided)
	if (options.worldSeed !== undefined && !Number.isFinite(options.worldSeed)) {
		errors.push("World seed must be a finite number.");
	}

	return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Public API — Alien hive placement
// ---------------------------------------------------------------------------

/** Data for a placed alien hive. */
export interface AlienHiveData {
	id: string;
	position: { x: number; z: number };
	type: string;
}

/**
 * Place alien hives in unexplored territory, far from all start positions.
 *
 * Hive count scales with world area. Each hive is placed at least
 * `worldSize * HIVE_MIN_DISTANCE_FRACTION` units from any start position
 * and at least `worldSize * 0.1` units from other hives.
 *
 * Deterministic: identical seed + config produces identical hive placement.
 */
export function placeAlienHives(
	worldData: WorldData,
	worldSize: number,
	startPositions: Array<{ x: number; z: number }>,
	rng: () => number,
): AlienHiveData[] {
	const targetCount = Math.max(2, Math.floor((worldSize * worldSize) / HIVE_AREA_PER_HIVE));
	const minDistFromStart = worldSize * HIVE_MIN_DISTANCE_FRACTION;
	const minDistBetweenHives = worldSize * 0.1;

	const hives: AlienHiveData[] = [];
	const maxAttempts = targetCount * 30;
	let attempts = 0;

	while (hives.length < targetCount && attempts < maxAttempts) {
		attempts++;

		const gx = Math.floor(rng() * worldSize);
		const gz = Math.floor(rng() * worldSize);

		// Skip water cells
		if (worldData.heightmap[gz]?.[gx] === undefined || worldData.heightmap[gz][gx] < 0.2) continue;

		// Must be far from all start positions
		const tooCloseToStart = startPositions.some((sp) => {
			const dx = sp.x - gx;
			const dz = sp.z - gz;
			return Math.sqrt(dx * dx + dz * dz) < minDistFromStart;
		});
		if (tooCloseToStart) continue;

		// Must be far from other hives
		const tooCloseToHive = hives.some((h) => {
			const dx = h.position.x - gx;
			const dz = h.position.z - gz;
			return Math.sqrt(dx * dx + dz * dz) < minDistBetweenHives;
		});
		if (tooCloseToHive) continue;

		const typeIdx = Math.floor(rng() * ALIEN_HIVE_TYPES.length);
		hives.push({
			id: `hive_${hives.length}`,
			position: { x: gx, z: gz },
			type: ALIEN_HIVE_TYPES[typeIdx],
		});
	}

	return hives;
}

// ---------------------------------------------------------------------------
// Public API — Otter guide placement
// ---------------------------------------------------------------------------

/** Data for the otter guide Pip. */
export interface OtterGuideData {
	id: string;
	position: { x: number; z: number };
	name: string;
}

/**
 * Place the otter guide hologram Pip near the player's start position.
 *
 * Pip is offset by OTTER_GUIDE_OFFSET units at a seeded angle from
 * the player spawn so it's visible but not blocking.
 */
export function placeOtterGuide(
	playerSpawn: { x: number; z: number },
	rng: () => number,
): OtterGuideData {
	const angle = rng() * Math.PI * 2;
	return {
		id: "otter_pip",
		position: {
			x: Math.round(playerSpawn.x + Math.cos(angle) * OTTER_GUIDE_OFFSET),
			z: Math.round(playerSpawn.z + Math.sin(angle) * OTTER_GUIDE_OFFSET),
		},
		name: "Pip",
	};
}

// ---------------------------------------------------------------------------
// Public API — Camera transition
// ---------------------------------------------------------------------------

/** Camera transition phase for the opening sequence. */
export type CameraPhase = "orbital" | "zoom" | "fps";

/**
 * Compute the camera transition state for the opening cinematic.
 *
 * Timeline:
 *   0-3s:   Orbital — camera orbits above the terrain, showing the world
 *   3-5s:   Zoom — camera swoops down toward the player bot
 *   5s+:    FPS — camera locked to player bot, controls enabled
 *
 * @param elapsed - seconds since game start
 * @param playerPosition - player bot world position
 */
export function getCameraTransition(
	elapsed: number,
	playerPosition: { x: number; y: number; z: number },
): {
	phase: CameraPhase;
	progress: number;
	cameraPosition: { x: number; y: number; z: number };
	lookAt: { x: number; y: number; z: number };
} {
	const ORBITAL_DURATION = 3.0;
	const ZOOM_DURATION = 2.0;

	if (elapsed < ORBITAL_DURATION) {
		const progress = elapsed / ORBITAL_DURATION;
		const angle = progress * Math.PI * 0.5;
		const radius = 40;
		const height = 50;

		return {
			phase: "orbital",
			progress,
			cameraPosition: {
				x: playerPosition.x + Math.cos(angle) * radius,
				y: height,
				z: playerPosition.z + Math.sin(angle) * radius,
			},
			lookAt: playerPosition,
		};
	}

	if (elapsed < ORBITAL_DURATION + ZOOM_DURATION) {
		const progress = (elapsed - ORBITAL_DURATION) / ZOOM_DURATION;
		const smooth = progress * progress * (3 - 2 * progress);

		return {
			phase: "zoom",
			progress,
			cameraPosition: {
				x: playerPosition.x + Math.cos(Math.PI * 0.5) * 40 * (1 - smooth),
				y: 50 * (1 - smooth) + (playerPosition.y + 1.6) * smooth,
				z: playerPosition.z + Math.sin(Math.PI * 0.5) * 40 * (1 - smooth),
			},
			lookAt: playerPosition,
		};
	}

	return {
		phase: "fps",
		progress: 1,
		cameraPosition: {
			x: playerPosition.x,
			y: playerPosition.y + 1.6,
			z: playerPosition.z,
		},
		lookAt: {
			x: playerPosition.x,
			y: playerPosition.y + 1.6,
			z: playerPosition.z + 1,
		},
	};
}

// ---------------------------------------------------------------------------
// Public API — Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Initialize a new game world.
 *
 * Executes all setup steps in order:
 *   1. Set world seed
 *   2. Generate terrain (heightmap, zones)
 *   3. Assign biomes to terrain
 *   4. Place ore deposits
 *   5. Spawn player bot at spawn point
 *   6. Spawn AI civilizations with difficulty modifiers
 *   7. Initialize world systems (fog, weather, HUD, power, diplomacy)
 *   8. Start tutorial (if enabled)
 *   9. Place starter resources near player
 *
 * @param options - New game configuration from the pregame screens
 * @returns NewGameResult with initialization outcome
 */
export function initNewGame(options: NewGameOptions): NewGameResult {
	const errors: string[] = [];

	// --- Validate options ---
	const validation = validateOptions(options);
	if (!validation.valid) {
		return {
			success: false,
			worldSeed: 0,
			playerEntityId: "",
			spawnPosition: { x: 0, z: 0 },
			depositCount: 0,
			aiFactionCount: 0,
			biomeCount: 0,
			alienHiveCount: 0,
			otterGuidePosition: null,
			errors: validation.errors,
		};
	}

	// --- Step 1: Set world seed ---
	const worldSeed =
		options.worldSeed !== undefined ? options.worldSeed : randomSeed();
	setWorldSeed(worldSeed);

	// --- Step 2: Generate terrain ---
	const preset = (mapPresetsConfig as Record<string, Record<string, unknown>>)[options.mapPreset];
	const baseWorldSize = (preset?.worldSize as number) ?? 200;
	const sizeMultiplier = MAP_SIZE_MULTIPLIERS[options.mapSize] ?? 1.0;
	const worldSize = Math.round(baseWorldSize * sizeMultiplier);

	const difficultyMods = getDifficultyModifiers(options.difficulty);

	const mapGenConfig: MapGenConfig = {
		worldSize,
		waterLevel: 0.15,
		oreAbundance: (preset?.oreAbundance as number ?? 1.0) * difficultyMods.resourceAbundance,
		biomeScale: 1.0,
	};

	let worldData: WorldData;
	try {
		worldData = generateWorld(worldSeed, mapGenConfig);
	} catch (err) {
		errors.push(`Terrain generation failed: ${err instanceof Error ? err.message : String(err)}`);
		return {
			success: false,
			worldSeed,
			playerEntityId: "",
			spawnPosition: { x: 0, z: 0 },
			depositCount: 0,
			aiFactionCount: 0,
			biomeCount: 0,
			alienHiveCount: 0,
			otterGuidePosition: null,
			errors,
		};
	}

	// --- Step 3: Assign biomes ---
	resetBiomeGrid();
	setBiomeGrid(worldData.biomes);

	// Count unique biomes
	const biomeSet = new Set(worldData.biomes.flat());
	const biomeCount = biomeSet.size;

	// --- Step 4: Place ore deposits ---
	resetDeposits();
	const rng = makePRNG(worldSeed + 1000);
	const depositCount = Math.round(worldSize * 0.4 * difficultyMods.resourceAbundance);

	let deposits: ReturnType<typeof spawnInitialDeposits> = [];
	try {
		deposits = spawnInitialDeposits(depositCount, worldSize, {
			rng,
			minDistance: Math.max(3, worldSize * 0.05),
		});
	} catch (err) {
		errors.push(`Ore deposit placement failed: ${err instanceof Error ? err.message : String(err)}`);
	}
	const actualDepositCount = deposits.length;

	// --- Step 5: Spawn player ---
	resetBotFleet();
	const totalFactions = 1 + options.aiFactions.length;
	const playerSpawn = getSpawnPoint(worldData, 0, totalFactions);

	const playerEntityId = registerBot(
		options.playerFaction,
		"player",
		playerSpawn,
		0,
		"player_bot_0",
	);

	// --- Step 6: Spawn AI civilizations ---
	const aiFactionData: AIFactionData[] = [];

	for (let i = 0; i < options.aiFactions.length; i++) {
		const aiFaction = options.aiFactions[i];
		const aiSpawn = getSpawnPoint(worldData, i + 1, totalFactions);

		const aiBotId = registerBot(
			aiFaction,
			"ai_commander",
			aiSpawn,
			0,
		);

		aiFactionData.push({
			faction: aiFaction,
			spawnPosition: aiSpawn,
			botId: aiBotId,
		});
	}

	// --- Step 6b: Create BaseAgents for all starting bases ---
	baseAgents.clear();

	// Player base agent
	const playerBaseAgent = new BaseAgent(
		`base_${options.playerFaction}`,
		options.playerFaction,
		{ x: playerSpawn.x, y: 0, z: playerSpawn.z },
	);
	baseAgents.set(options.playerFaction, playerBaseAgent);

	// AI base agents
	for (const aiData of aiFactionData) {
		const aiBaseAgent = new BaseAgent(
			`base_${aiData.faction}`,
			aiData.faction,
			{ x: aiData.spawnPosition.x, y: 0, z: aiData.spawnPosition.z },
		);
		baseAgents.set(aiData.faction, aiBaseAgent);
	}

	// --- Step 7: Initialize world systems ---

	// Fog of war — init maps for all factions, reveal around spawn points
	resetFogOfWar();
	const allFactions = [options.playerFaction, ...options.aiFactions];
	for (const faction of allFactions) {
		initFogMap(faction, worldSize, worldSize);
	}

	// Reveal area around player spawn
	for (let dz = -SPAWN_VISION_RADIUS; dz <= SPAWN_VISION_RADIUS; dz++) {
		for (let dx = -SPAWN_VISION_RADIUS; dx <= SPAWN_VISION_RADIUS; dx++) {
			if (dx * dx + dz * dz <= SPAWN_VISION_RADIUS * SPAWN_VISION_RADIUS) {
				revealCell(
					options.playerFaction,
					playerSpawn.x + dx,
					playerSpawn.z + dz,
					FOG_VISIBLE,
				);
			}
		}
	}

	// Reveal area around each AI spawn for their faction
	for (const aiData of aiFactionData) {
		for (let dz = -SPAWN_VISION_RADIUS; dz <= SPAWN_VISION_RADIUS; dz++) {
			for (let dx = -SPAWN_VISION_RADIUS; dx <= SPAWN_VISION_RADIUS; dx++) {
				if (dx * dx + dz * dz <= SPAWN_VISION_RADIUS * SPAWN_VISION_RADIUS) {
					revealCell(
						aiData.faction,
						aiData.spawnPosition.x + dx,
						aiData.spawnPosition.z + dz,
						FOG_VISIBLE,
					);
				}
			}
		}
	}

	// Weather — start clear, seed the weather RNG
	resetWeather();
	setWeatherRngSeed(worldSeed + 2000);

	// HUD — reset to defaults, set player info
	resetHUDState();
	updateBotInfo("Bot-01", options.playerFaction);
	updateCoords(playerSpawn.x, playerSpawn.z);

	// Economy — reset, initialize faction economies
	resetEconomy();

	// --- Step 8: Start tutorial (if enabled) ---
	resetTutorial();
	if (options.enableTutorial) {
		startTutorial(0);
	}

	// --- Step 9: Place alien hives in unexplored territory ---
	const allSpawnPositions = [
		playerSpawn,
		...aiFactionData.map((ai) => ai.spawnPosition),
	];
	const hiveRng = makePRNG(worldSeed + 4000);
	const alienHives = placeAlienHives(worldData, worldSize, allSpawnPositions, hiveRng);
	placedHives = alienHives;

	// --- Step 10: Place otter guide Pip near player spawn ---
	const otterRng = makePRNG(worldSeed + 5000);
	const otterGuide = placeOtterGuide(playerSpawn, otterRng);
	otterGuideData = otterGuide;

	// Spawn Pip as an actual ECS entity so OtterRenderer can display it.
	// The first tutorial step's otterDialogue becomes the initial speech bubble.
	// Lazy require to avoid triggering ECS world init at import time (breaks test mocks).
	// Non-fatal: game works without the otter entity, just no speech bubbles.
	const firstStep = getCurrentStep();
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { spawnOtter } = require("../ecs/factory") as typeof import("../ecs/factory");
		spawnOtter({
			x: otterGuide.position.x,
			z: otterGuide.position.z,
			lines: firstStep ? [firstStep.otterDialogue] : [],
			stationary: true,
		});
	} catch {
		// ECS world not initialized (test env) — otter entity will be created
		// by the renderer when the world is ready.
	}

	// --- Step 11: Place starter resources near player ---
	try {
		const starterRng = makePRNG(worldSeed + 3000);
		for (const cubeType of STARTER_CUBE_TYPES) {
			const offsetX = (starterRng() - 0.5) * 6;
			const offsetZ = (starterRng() - 0.5) * 6;
			spawnOreDeposit({
				type: cubeType,
				quantity: 25,
				position: {
					x: playerSpawn.x + offsetX,
					y: 0,
					z: playerSpawn.z + offsetZ,
				},
				colliderRadius: 0.5,
			});
		}
	} catch (err) {
		errors.push(`Starter resource placement failed: ${err instanceof Error ? err.message : String(err)}`);
	}

	// --- Build result ---
	const result: NewGameResult = {
		success: errors.length === 0,
		worldSeed,
		playerEntityId,
		spawnPosition: playerSpawn,
		depositCount: actualDepositCount,
		aiFactionCount: aiFactionData.length,
		biomeCount,
		alienHiveCount: alienHives.length,
		otterGuidePosition: otterGuide.position,
		errors,
	};

	lastResult = result;
	return result;
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/**
 * Get the result of the last initNewGame call, or null if none.
 */
export function getLastResult(): NewGameResult | null {
	return lastResult ? { ...lastResult, errors: [...lastResult.errors] } : null;
}

/**
 * Get all BaseAgent instances created during initialization.
 */
export function getBaseAgents(): BaseAgent[] {
	return Array.from(baseAgents.values());
}

/**
 * Get the BaseAgent for a specific faction, or null if not found.
 */
export function getBaseAgent(factionId: string): BaseAgent | null {
	return baseAgents.get(factionId) ?? null;
}

/**
 * Get all alien hives placed during initialization.
 */
export function getAlienHives(): AlienHiveData[] {
	return [...placedHives];
}

/**
 * Get the otter guide Pip data, or null if not yet initialized.
 */
export function getOtterGuide(): OtterGuideData | null {
	return otterGuideData ? { ...otterGuideData } : null;
}

// ---------------------------------------------------------------------------
// Public API — NewGameConfig adapter
// ---------------------------------------------------------------------------

/**
 * Map a mapSize number to the closest size category.
 */
function mapSizeToCategory(size: number): "small" | "medium" | "large" {
	if (size <= 120) return "small";
	if (size <= 300) return "medium";
	return "large";
}

/**
 * Validate and normalize a difficulty string.
 * Returns the difficulty or null if invalid.
 */
function normalizeDifficulty(
	difficulty: string,
): "easy" | "normal" | "hard" | "brutal" | null {
	const valid = ["easy", "normal", "hard", "brutal"];
	if (valid.includes(difficulty)) {
		return difficulty as "easy" | "normal" | "hard" | "brutal";
	}
	return null;
}

/**
 * Initialize a new game from a NewGameConfig.
 *
 * This is a convenience adapter over initNewGame(NewGameOptions).
 * It maps the simplified config interface to the full options format.
 *
 * @param config - Simplified new game configuration
 * @returns NewGameResult with initialization outcome
 */
export function initFromConfig(gameConfig: NewGameConfig): NewGameResult {
	const difficulty = normalizeDifficulty(gameConfig.difficulty);

	if (!difficulty) {
		return {
			success: false,
			worldSeed: 0,
			playerEntityId: "",
			spawnPosition: { x: 0, z: 0 },
			depositCount: 0,
			aiFactionCount: 0,
			biomeCount: 0,
			alienHiveCount: 0,
			otterGuidePosition: null,
			errors: [
				`Invalid difficulty "${gameConfig.difficulty}". Valid: easy, normal, hard, brutal`,
			],
		};
	}

	const options: NewGameOptions = {
		playerFaction: gameConfig.playerRace,
		mapPreset: gameConfig.mapType,
		difficulty,
		enableTutorial: true,
		aiFactions: gameConfig.aiOpponents,
		mapSize: mapSizeToCategory(gameConfig.mapSize),
	};

	return initNewGame(options);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all new game init state. For tests and returning to menu.
 */
export function reset(): void {
	lastResult = null;

	// Clear BaseAgents
	for (const agent of baseAgents.values()) {
		agent.reset();
	}
	baseAgents.clear();

	// Clear alien hives and otter guide
	placedHives = [];
	otterGuideData = null;

	resetBiomeGrid();
	resetDeposits();
	resetFogOfWar();
	resetWeather();
	resetHUDState();
	resetEconomy();
	resetBotFleet();
	resetTutorial();
	resetTutorialOtterBridge();
}
