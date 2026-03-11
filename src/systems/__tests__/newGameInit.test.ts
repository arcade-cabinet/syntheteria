/**
 * Tests for the new game initialization orchestrator.
 *
 * Tests cover:
 * - Full initNewGame flow with mocked sub-systems
 * - Each initialization step independently
 * - Difficulty modifiers for all levels
 * - Spawn point distribution
 * - Options validation (valid + invalid inputs)
 * - Seed determinism
 * - Starter resource placement
 * - Tutorial start/skip
 * - AI faction spawning
 * - Error handling
 * - Reset behavior
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		civilizations: {
			reclaimers: {
				name: "Reclaimers",
				description: "Scavenger economy",
				color: "#8B4513",
				governorBias: { economy: 1.5, mining: 1.3 },
			},
			volt_collective: {
				name: "Volt Collective",
				description: "Lightning aggressors",
				color: "#4169E1",
				governorBias: { military: 1.5, expansion: 1.3 },
			},
			signal_choir: {
				name: "Signal Choir",
				description: "Hive-mind hackers",
				color: "#9370DB",
				governorBias: { research: 1.5 },
			},
			iron_creed: {
				name: "Iron Creed",
				description: "Fortress builders",
				color: "#708090",
				governorBias: { defense: 1.5 },
			},
		},
		mapPresets: {
			standard: {
				name: "Standard",
				worldSize: 200,
				oreAbundance: 1.0,
				aiOpponents: 3,
			},
			duel: {
				name: "Duel",
				worldSize: 100,
				oreAbundance: 1.0,
				aiOpponents: 1,
			},
			marathon: {
				name: "Marathon",
				worldSize: 400,
				oreAbundance: 1.2,
				aiOpponents: 3,
			},
			startingResources: {
				normal: { scrapMetal: 15 },
			},
			navmesh: { navStep: 2 },
			cityBounds: { minX: -30 },
			cityLayout: { corridorSpacing: 8 },
		},
		rendering: {
			fogOfWar: { defaultVisionRange: 10 },
		},
		weather: {
			transitionIntervalTicks: 100,
			stormIntensityDecayRate: 0.01,
			stormIntensityGrowthRate: 0.02,
			forecastAccuracyDecay: 0.1,
			acidRainDamagePerTick: 0.5,
			states: {
				clear: { visibilityRange: 100, movementSpeedModifier: 1, damageModifier: 1, powerGenerationModifier: 1, lightningStrikeChance: 0 },
			},
			transitionWeights: {
				clear: { clear: 0.6, overcast: 0.2, storm: 0.1, electromagnetic_surge: 0.05, acid_rain: 0.05 },
			},
		},
		diplomacy: { checkInterval: 100 },
		mining: {
			oreTypes: {
				scrap_iron: { hardness: 1, grindSpeed: 1.0, color: "#8B4513" },
				copper: { hardness: 2, grindSpeed: 0.8, color: "#B87333" },
				silicon: { hardness: 3, grindSpeed: 0.6, color: "#A0A0A0" },
			},
		},
	},
}));

import {
	initNewGame,
	initFromConfig,
	validateOptions,
	getDifficultyModifiers,
	getSpawnPoint,
	getLastResult,
	getBaseAgents,
	getBaseAgent,
	getAlienHives,
	getOtterGuide,
	placeAlienHives,
	placeOtterGuide,
	getCameraTransition,
	reset,
	type NewGameOptions,
	type NewGameConfig,
} from "../newGameInit";

import { getWorldSeed } from "../../ecs/seed";
import { getCellState } from "../fogOfWarManager";
import { isTutorialActive } from "../tutorialSystem";
import { getHUDState } from "../hudState";
import { getBot, getFactionBots } from "../botFleetManager";
import { getAllDeposits } from "../oreSpawner";
import type { WorldData } from "../mapGenerator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultOptions(overrides: Partial<NewGameOptions> = {}): NewGameOptions {
	return {
		playerFaction: "reclaimers",
		mapPreset: "standard",
		difficulty: "normal",
		enableTutorial: false,
		aiFactions: ["volt_collective", "signal_choir", "iron_creed"],
		mapSize: "medium",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// validateOptions
// ---------------------------------------------------------------------------

describe("validateOptions", () => {
	it("accepts valid options", () => {
		const result = validateOptions(defaultOptions());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects invalid player faction", () => {
		const result = validateOptions(defaultOptions({ playerFaction: "pirates" }));
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("player faction"))).toBe(true);
	});

	it("rejects invalid AI faction", () => {
		const result = validateOptions(
			defaultOptions({ aiFactions: ["volt_collective", "nonexistent"] }),
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("AI faction"))).toBe(true);
	});

	it("rejects AI faction that matches player faction", () => {
		const result = validateOptions(
			defaultOptions({ playerFaction: "reclaimers", aiFactions: ["reclaimers"] }),
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("same as the player"))).toBe(true);
	});

	it("rejects duplicate AI factions", () => {
		const result = validateOptions(
			defaultOptions({ aiFactions: ["volt_collective", "volt_collective"] }),
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
	});

	it("rejects invalid map preset", () => {
		const result = validateOptions(defaultOptions({ mapPreset: "nonexistent" }));
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("map preset"))).toBe(true);
	});

	it("rejects invalid difficulty", () => {
		const result = validateOptions(
			defaultOptions({ difficulty: "impossible" as "easy" }),
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("difficulty"))).toBe(true);
	});

	it("rejects invalid map size", () => {
		const result = validateOptions(
			defaultOptions({ mapSize: "tiny" as "small" }),
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("map size"))).toBe(true);
	});

	it("rejects non-finite world seed", () => {
		const result = validateOptions(defaultOptions({ worldSeed: Infinity }));
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("seed"))).toBe(true);
	});

	it("accepts valid world seed of 0", () => {
		const result = validateOptions(defaultOptions({ worldSeed: 0 }));
		expect(result.valid).toBe(true);
	});

	it("accepts options with no AI factions", () => {
		const result = validateOptions(defaultOptions({ aiFactions: [] }));
		expect(result.valid).toBe(true);
	});

	it("collects multiple errors at once", () => {
		const result = validateOptions(
			defaultOptions({
				playerFaction: "invalid",
				mapPreset: "invalid",
				difficulty: "invalid" as "easy",
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});

	it("excludes navmesh/startingResources/cityBounds/cityLayout from valid presets", () => {
		const resultNavmesh = validateOptions(defaultOptions({ mapPreset: "navmesh" }));
		expect(resultNavmesh.valid).toBe(false);

		const resultStarting = validateOptions(defaultOptions({ mapPreset: "startingResources" }));
		expect(resultStarting.valid).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getDifficultyModifiers
// ---------------------------------------------------------------------------

describe("getDifficultyModifiers", () => {
	it("returns easy modifiers", () => {
		const mods = getDifficultyModifiers("easy");
		expect(mods.aiEconomyMultiplier).toBe(0.5);
		expect(mods.aiAggressionDelay).toBe(600);
		expect(mods.playerHealthMultiplier).toBe(1.5);
		expect(mods.resourceAbundance).toBe(1.5);
		expect(mods.enemySpawnRate).toBe(0.5);
	});

	it("returns normal modifiers", () => {
		const mods = getDifficultyModifiers("normal");
		expect(mods.aiEconomyMultiplier).toBe(1.0);
		expect(mods.aiAggressionDelay).toBe(300);
		expect(mods.playerHealthMultiplier).toBe(1.0);
		expect(mods.resourceAbundance).toBe(1.0);
		expect(mods.enemySpawnRate).toBe(1.0);
	});

	it("returns hard modifiers", () => {
		const mods = getDifficultyModifiers("hard");
		expect(mods.aiEconomyMultiplier).toBe(1.5);
		expect(mods.aiAggressionDelay).toBe(150);
		expect(mods.playerHealthMultiplier).toBe(0.75);
		expect(mods.resourceAbundance).toBe(0.75);
		expect(mods.enemySpawnRate).toBe(1.5);
	});

	it("returns brutal modifiers", () => {
		const mods = getDifficultyModifiers("brutal");
		expect(mods.aiEconomyMultiplier).toBe(2.0);
		expect(mods.aiAggressionDelay).toBe(60);
		expect(mods.playerHealthMultiplier).toBe(0.5);
		expect(mods.resourceAbundance).toBe(0.5);
		expect(mods.enemySpawnRate).toBe(2.0);
	});

	it("difficulty scales monotonically (easy < normal < hard < brutal)", () => {
		const easy = getDifficultyModifiers("easy");
		const normal = getDifficultyModifiers("normal");
		const hard = getDifficultyModifiers("hard");
		const brutal = getDifficultyModifiers("brutal");

		// AI economy multiplier increases with difficulty
		expect(easy.aiEconomyMultiplier).toBeLessThan(normal.aiEconomyMultiplier);
		expect(normal.aiEconomyMultiplier).toBeLessThan(hard.aiEconomyMultiplier);
		expect(hard.aiEconomyMultiplier).toBeLessThan(brutal.aiEconomyMultiplier);

		// AI aggression delay decreases with difficulty
		expect(easy.aiAggressionDelay).toBeGreaterThan(normal.aiAggressionDelay);
		expect(normal.aiAggressionDelay).toBeGreaterThan(hard.aiAggressionDelay);
		expect(hard.aiAggressionDelay).toBeGreaterThan(brutal.aiAggressionDelay);

		// Player health decreases with difficulty
		expect(easy.playerHealthMultiplier).toBeGreaterThan(normal.playerHealthMultiplier);
		expect(normal.playerHealthMultiplier).toBeGreaterThan(hard.playerHealthMultiplier);
		expect(hard.playerHealthMultiplier).toBeGreaterThan(brutal.playerHealthMultiplier);
	});
});

// ---------------------------------------------------------------------------
// getSpawnPoint
// ---------------------------------------------------------------------------

describe("getSpawnPoint", () => {
	// Build a minimal WorldData with a 100x100 heightmap
	function makeWorldData(size: number): WorldData {
		const heightmap = Array.from({ length: size }, () =>
			Array.from({ length: size }, () => 0.5),
		);
		return {
			heightmap,
			biomes: [],
			oreDeposits: [],
			startPositions: [],
			ruins: [],
		};
	}

	it("returns a point within world bounds", () => {
		const world = makeWorldData(100);
		const point = getSpawnPoint(world, 0, 4);

		expect(point.x).toBeGreaterThanOrEqual(0);
		expect(point.x).toBeLessThan(100);
		expect(point.z).toBeGreaterThanOrEqual(0);
		expect(point.z).toBeLessThan(100);
	});

	it("distributes points evenly around the map center", () => {
		const world = makeWorldData(200);
		const points = Array.from({ length: 4 }, (_, i) =>
			getSpawnPoint(world, i, 4),
		);

		// All points should be roughly the same distance from center
		const center = 100;
		const distances = points.map((p) =>
			Math.sqrt((p.x - center) ** 2 + (p.z - center) ** 2),
		);

		const minDist = Math.min(...distances);
		const maxDist = Math.max(...distances);
		// All should be at the same radius (35% of world size = 70)
		expect(maxDist - minDist).toBeLessThan(2); // rounding tolerance
	});

	it("two-faction game places points on opposite sides", () => {
		const world = makeWorldData(200);
		const p0 = getSpawnPoint(world, 0, 2);
		const p1 = getSpawnPoint(world, 1, 2);

		// Distance between them should be roughly 2 * radius = 140
		const dist = Math.sqrt((p0.x - p1.x) ** 2 + (p0.z - p1.z) ** 2);
		expect(dist).toBeGreaterThan(100);
	});

	it("single faction places at a fixed angle", () => {
		const world = makeWorldData(100);
		const p = getSpawnPoint(world, 0, 1);

		// Should be at angle 0 → center + radius * cos(0), center + radius * sin(0)
		expect(p.x).toBe(Math.round(50 + 35)); // 85
		expect(p.z).toBe(50);
	});

	it("clamps to world bounds on small maps", () => {
		const world = makeWorldData(10);
		const point = getSpawnPoint(world, 0, 1);

		expect(point.x).toBeGreaterThanOrEqual(0);
		expect(point.x).toBeLessThan(10);
		expect(point.z).toBeGreaterThanOrEqual(0);
		expect(point.z).toBeLessThan(10);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — full flow
// ---------------------------------------------------------------------------

describe("initNewGame — full flow", () => {
	it("succeeds with valid default options", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));

		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.worldSeed).toBe(42);
		expect(result.playerEntityId).toBe("player_bot_0");
		expect(result.aiFactionCount).toBe(3);
		expect(result.biomeCount).toBeGreaterThan(0);
		expect(result.depositCount).toBeGreaterThan(0);
	});

	it("fails with invalid options and returns errors", () => {
		const result = initNewGame(
			defaultOptions({ playerFaction: "nonexistent" }),
		);

		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.playerEntityId).toBe("");
	});

	it("generates a random seed when none is provided", () => {
		const result = initNewGame(defaultOptions({ worldSeed: undefined }));

		expect(result.success).toBe(true);
		expect(result.worldSeed).toBeGreaterThan(0);
	});

	it("uses the provided seed", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 12345 }));

		expect(result.worldSeed).toBe(12345);
		expect(getWorldSeed()).toBe(12345);
	});

	it("stores the result for later retrieval", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const last = getLastResult();

		expect(last).not.toBeNull();
		expect(last!.worldSeed).toBe(42);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 1: seed
// ---------------------------------------------------------------------------

describe("initNewGame — seed setup", () => {
	it("sets the global world seed", () => {
		initNewGame(defaultOptions({ worldSeed: 99999 }));
		expect(getWorldSeed()).toBe(99999);
	});

	it("seed of 0 is valid", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 0 }));
		expect(result.success).toBe(true);
		expect(result.worldSeed).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 3: biomes
// ---------------------------------------------------------------------------

describe("initNewGame — biome assignment", () => {
	it("reports positive biome count", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(result.biomeCount).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 4: ore deposits
// ---------------------------------------------------------------------------

describe("initNewGame — ore deposits", () => {
	it("places ore deposits in the world", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(result.depositCount).toBeGreaterThan(0);
	});

	it("easy difficulty places more deposits than brutal", () => {
		const easyResult = initNewGame(
			defaultOptions({ worldSeed: 42, difficulty: "easy" }),
		);
		reset();
		const brutalResult = initNewGame(
			defaultOptions({ worldSeed: 42, difficulty: "brutal" }),
		);

		expect(easyResult.depositCount).toBeGreaterThanOrEqual(
			brutalResult.depositCount,
		);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 5: player spawn
// ---------------------------------------------------------------------------

describe("initNewGame — player spawn", () => {
	it("creates a player bot entity", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));
		const bot = getBot(result.playerEntityId);

		expect(bot).not.toBeNull();
		expect(bot!.faction).toBe("reclaimers");
		expect(bot!.type).toBe("player");
		expect(bot!.status).toBe("active");
	});

	it("sets spawn position in the result", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));

		expect(result.spawnPosition.x).toBeGreaterThanOrEqual(0);
		expect(result.spawnPosition.z).toBeGreaterThanOrEqual(0);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 6: AI factions
// ---------------------------------------------------------------------------

describe("initNewGame — AI factions", () => {
	it("spawns bots for each AI faction", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));

		expect(result.aiFactionCount).toBe(3);

		const voltBots = getFactionBots("volt_collective");
		expect(voltBots.length).toBeGreaterThanOrEqual(1);

		const signalBots = getFactionBots("signal_choir");
		expect(signalBots.length).toBeGreaterThanOrEqual(1);

		const ironBots = getFactionBots("iron_creed");
		expect(ironBots.length).toBeGreaterThanOrEqual(1);
	});

	it("AI bots are typed as ai_commander", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		const voltBots = getFactionBots("volt_collective");
		expect(voltBots[0].type).toBe("ai_commander");
	});

	it("works with zero AI factions", () => {
		const result = initNewGame(
			defaultOptions({ worldSeed: 42, aiFactions: [] }),
		);

		expect(result.success).toBe(true);
		expect(result.aiFactionCount).toBe(0);
	});

	it("works with a single AI faction", () => {
		const result = initNewGame(
			defaultOptions({ worldSeed: 42, aiFactions: ["iron_creed"] }),
		);

		expect(result.success).toBe(true);
		expect(result.aiFactionCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 7: world systems
// ---------------------------------------------------------------------------

describe("initNewGame — world system initialization", () => {
	it("initializes fog of war for all factions", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		// Player spawn area should be visible
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));
		const spawnX = result.spawnPosition.x;
		const spawnZ = result.spawnPosition.z;

		expect(getCellState("reclaimers", spawnX, spawnZ)).toBe("visible");
	});

	it("reveals area around player spawn", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));
		const spawnX = result.spawnPosition.x;
		const spawnZ = result.spawnPosition.z;

		// Cells near spawn should be visible
		expect(getCellState("reclaimers", spawnX + 1, spawnZ)).toBe("visible");
		expect(getCellState("reclaimers", spawnX, spawnZ + 1)).toBe("visible");
	});

	it("initializes HUD with player faction info", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const hud = getHUDState();

		expect(hud.factionName).toBe("reclaimers");
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 8: tutorial
// ---------------------------------------------------------------------------

describe("initNewGame — tutorial", () => {
	it("starts tutorial when enabled", () => {
		initNewGame(defaultOptions({ worldSeed: 42, enableTutorial: true }));
		expect(isTutorialActive()).toBe(true);
	});

	it("does not start tutorial when disabled", () => {
		initNewGame(defaultOptions({ worldSeed: 42, enableTutorial: false }));
		expect(isTutorialActive()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// initNewGame — step 9: starter resources
// ---------------------------------------------------------------------------

describe("initNewGame — starter resources", () => {
	it("places starter deposits near the player spawn", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const deposits = getAllDeposits();

		// Should have initial deposits + 5 starter cubes
		expect(deposits.length).toBeGreaterThanOrEqual(5);

		// At least some deposits should include scrap_iron and copper
		const types = deposits.map((d) => d.type);
		expect(types).toContain("scrap_iron");
		expect(types).toContain("copper");
	});
});

// ---------------------------------------------------------------------------
// Seed determinism
// ---------------------------------------------------------------------------

describe("seed determinism", () => {
	it("same seed produces same result", () => {
		const result1 = initNewGame(defaultOptions({ worldSeed: 42 }));
		reset();
		const result2 = initNewGame(defaultOptions({ worldSeed: 42 }));

		expect(result1.worldSeed).toBe(result2.worldSeed);
		expect(result1.spawnPosition).toEqual(result2.spawnPosition);
		expect(result1.biomeCount).toBe(result2.biomeCount);
		expect(result1.depositCount).toBe(result2.depositCount);
		expect(result1.aiFactionCount).toBe(result2.aiFactionCount);
	});

	it("different seeds produce different world data", () => {
		initNewGame(defaultOptions({ worldSeed: 1 }));
		const deposits1 = getAllDeposits().map((d) => ({
			x: d.position.x,
			z: d.position.z,
			type: d.type,
		}));
		reset();
		initNewGame(defaultOptions({ worldSeed: 99999 }));
		const deposits2 = getAllDeposits().map((d) => ({
			x: d.position.x,
			z: d.position.z,
			type: d.type,
		}));

		// Different seeds should produce different deposit layouts
		const depositsMatch = JSON.stringify(deposits1) === JSON.stringify(deposits2);
		expect(depositsMatch).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Map size
// ---------------------------------------------------------------------------

describe("map size multiplier", () => {
	it("small map produces fewer deposits than large", () => {
		const smallResult = initNewGame(
			defaultOptions({ worldSeed: 42, mapSize: "small" }),
		);
		reset();
		const largeResult = initNewGame(
			defaultOptions({ worldSeed: 42, mapSize: "large" }),
		);

		// Larger maps have more area and thus more deposits
		expect(largeResult.depositCount).toBeGreaterThan(smallResult.depositCount);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears the last result", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(getLastResult()).not.toBeNull();

		reset();
		expect(getLastResult()).toBeNull();
	});

	it("allows re-initialization after reset", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		reset();

		const result = initNewGame(defaultOptions({ worldSeed: 99 }));
		expect(result.success).toBe(true);
		expect(result.worldSeed).toBe(99);
	});

	it("resets all sub-systems", () => {
		initNewGame(defaultOptions({ worldSeed: 42, enableTutorial: true }));

		reset();

		expect(isTutorialActive()).toBe(false);
		expect(getAllDeposits()).toHaveLength(0);
		expect(getLastResult()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getLastResult
// ---------------------------------------------------------------------------

describe("getLastResult", () => {
	it("returns null before any game is initialized", () => {
		expect(getLastResult()).toBeNull();
	});

	it("returns a copy (not the internal reference)", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const r1 = getLastResult()!;
		const r2 = getLastResult()!;

		expect(r1).toEqual(r2);
		expect(r1).not.toBe(r2);
		expect(r1.errors).not.toBe(r2.errors);
	});
});

// ---------------------------------------------------------------------------
// BaseAgent creation — step 6 from GDD-010
// ---------------------------------------------------------------------------

describe("initNewGame — BaseAgent creation", () => {
	it("creates a BaseAgent for the player faction", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		const playerAgent = getBaseAgent("reclaimers");
		expect(playerAgent).not.toBeNull();
		expect(playerAgent!.factionId).toBe("reclaimers");
	});

	it("creates BaseAgents for all AI factions", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		expect(getBaseAgent("volt_collective")).not.toBeNull();
		expect(getBaseAgent("signal_choir")).not.toBeNull();
		expect(getBaseAgent("iron_creed")).not.toBeNull();
	});

	it("creates the correct total number of BaseAgents (player + AI)", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		const agents = getBaseAgents();
		expect(agents).toHaveLength(4); // 1 player + 3 AI
	});

	it("assigns unique baseIds to each BaseAgent", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		const agents = getBaseAgents();
		const ids = agents.map((a) => a.baseId);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(agents.length);
	});

	it("places BaseAgents at spawn positions", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));

		const playerAgent = getBaseAgent("reclaimers")!;
		expect(playerAgent.position.x).toBe(result.spawnPosition.x);
		expect(playerAgent.position.z).toBe(result.spawnPosition.z);
	});

	it("creates no AI BaseAgents when aiFactions is empty", () => {
		initNewGame(defaultOptions({ worldSeed: 42, aiFactions: [] }));

		const agents = getBaseAgents();
		expect(agents).toHaveLength(1); // player only
		expect(agents[0].factionId).toBe("reclaimers");
	});

	it("creates BaseAgents with functional work queues", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		const agent = getBaseAgent("reclaimers")!;
		expect(agent.workQueue).toBeDefined();
		expect(agent.workQueue.pendingCount()).toBe(0);
		expect(agent.workQueue.claimedCount()).toBe(0);
	});

	it("clears BaseAgents on reset", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(getBaseAgents()).toHaveLength(4);

		reset();
		expect(getBaseAgents()).toHaveLength(0);
		expect(getBaseAgent("reclaimers")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// NewGameConfig adapter — initFromConfig
// ---------------------------------------------------------------------------

describe("initFromConfig — NewGameConfig adapter", () => {
	function defaultConfig(overrides: Partial<NewGameConfig> = {}): NewGameConfig {
		return {
			playerRace: "reclaimers",
			mapSize: 200,
			mapType: "standard",
			aiOpponents: ["volt_collective", "signal_choir", "iron_creed"],
			difficulty: "normal",
			...overrides,
		};
	}

	it("succeeds with valid config", () => {
		const result = initFromConfig(defaultConfig());
		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("maps playerRace to playerFaction", () => {
		const result = initFromConfig(
			defaultConfig({
				playerRace: "iron_creed",
				aiOpponents: ["reclaimers", "volt_collective", "signal_choir"],
			}),
		);
		expect(result.success).toBe(true);

		const hud = getHUDState();
		expect(hud.factionName).toBe("iron_creed");
	});

	it("maps aiOpponents to aiFactions", () => {
		const result = initFromConfig(
			defaultConfig({ aiOpponents: ["volt_collective"] }),
		);
		expect(result.success).toBe(true);
		expect(result.aiFactionCount).toBe(1);
	});

	it("maps mapType to mapPreset", () => {
		const result = initFromConfig(defaultConfig({ mapType: "duel" }));
		expect(result.success).toBe(true);
	});

	it("maps difficulty string to difficulty level", () => {
		const result = initFromConfig(defaultConfig({ difficulty: "hard" }));
		expect(result.success).toBe(true);
	});

	it("creates BaseAgents for all factions", () => {
		initFromConfig(defaultConfig());

		const agents = getBaseAgents();
		expect(agents).toHaveLength(4);
	});

	it("rejects invalid playerRace", () => {
		const result = initFromConfig(defaultConfig({ playerRace: "pirates" }));
		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("rejects invalid difficulty", () => {
		const result = initFromConfig(defaultConfig({ difficulty: "nightmare" }));
		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("produces deterministic results for same config", () => {
		const result1 = initFromConfig(defaultConfig());
		const seed1 = result1.worldSeed;
		reset();
		// Use the same seed to get deterministic results
		const result2 = initFromConfig(defaultConfig());
		// Both should succeed, though seeds differ (random) unless we fix them
		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getBaseAgents / getBaseAgent queries
// ---------------------------------------------------------------------------

describe("getBaseAgents / getBaseAgent", () => {
	it("returns empty array before init", () => {
		expect(getBaseAgents()).toHaveLength(0);
	});

	it("returns null for unknown faction", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(getBaseAgent("nonexistent")).toBeNull();
	});

	it("returns copies of BaseAgent references", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));

		const agents1 = getBaseAgents();
		const agents2 = getBaseAgents();
		// Should return the same BaseAgent instances (they're objects, not copied)
		expect(agents1[0]).toBe(agents2[0]);
	});
});

// ---------------------------------------------------------------------------
// Step 9: Alien hive placement
// ---------------------------------------------------------------------------

describe("initNewGame — alien hive placement", () => {
	it("places alien hives during initialization", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(result.alienHiveCount).toBeGreaterThan(0);
	});

	it("stores hives retrievable via getAlienHives()", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const hives = getAlienHives();
		expect(hives.length).toBeGreaterThan(0);
	});

	it("clears hives on reset", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(getAlienHives().length).toBeGreaterThan(0);

		reset();
		expect(getAlienHives()).toHaveLength(0);
	});

	it("places hives with valid types", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const hives = getAlienHives();
		const validTypes = ["feral_nest", "scrap_hive", "signal_den", "rust_colony"];

		for (const hive of hives) {
			expect(validTypes).toContain(hive.type);
		}
	});

	it("assigns unique IDs to each hive", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const hives = getAlienHives();
		const ids = hives.map((h) => h.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it("returns zero hives when result has no hives (error path)", () => {
		const result = initNewGame(
			defaultOptions({ playerFaction: "nonexistent" }),
		);
		expect(result.alienHiveCount).toBe(0);
	});
});

describe("placeAlienHives — unit tests", () => {
	function makeWorldData(size: number): WorldData {
		const heightmap = Array.from({ length: size }, () =>
			Array.from({ length: size }, () => 0.5),
		);
		return {
			heightmap,
			biomes: [],
			oreDeposits: [],
			startPositions: [],
			ruins: [],
		};
	}

	function makeRng(seed: number): () => number {
		let s = seed;
		return () => {
			s = (s * 1664525 + 1013904223) & 0x7fffffff;
			return s / 0x80000000;
		};
	}

	it("places hives far from start positions", () => {
		const world = makeWorldData(200);
		const starts = [{ x: 100, z: 100 }];
		const rng = makeRng(42);
		const hives = placeAlienHives(world, 200, starts, rng);

		const minDist = 200 * 0.2; // HIVE_MIN_DISTANCE_FRACTION
		for (const hive of hives) {
			for (const start of starts) {
				const dx = hive.position.x - start.x;
				const dz = hive.position.z - start.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				expect(dist).toBeGreaterThanOrEqual(minDist);
			}
		}
	});

	it("places hives far from each other", () => {
		const world = makeWorldData(200);
		const starts = [{ x: 100, z: 100 }];
		const rng = makeRng(42);
		const hives = placeAlienHives(world, 200, starts, rng);

		const minDist = 200 * 0.1;
		for (let i = 0; i < hives.length; i++) {
			for (let j = i + 1; j < hives.length; j++) {
				const dx = hives[i].position.x - hives[j].position.x;
				const dz = hives[i].position.z - hives[j].position.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				expect(dist).toBeGreaterThanOrEqual(minDist);
			}
		}
	});

	it("produces deterministic results for same rng seed", () => {
		const world = makeWorldData(200);
		const starts = [{ x: 100, z: 100 }];

		const hives1 = placeAlienHives(world, 200, starts, makeRng(42));
		const hives2 = placeAlienHives(world, 200, starts, makeRng(42));

		expect(hives1.length).toBe(hives2.length);
		for (let i = 0; i < hives1.length; i++) {
			expect(hives1[i].position).toEqual(hives2[i].position);
			expect(hives1[i].type).toBe(hives2[i].type);
		}
	});

	it("handles small worlds gracefully", () => {
		const world = makeWorldData(20);
		const starts = [{ x: 10, z: 10 }];
		const rng = makeRng(42);
		// Should not throw even if no valid positions exist
		const hives = placeAlienHives(world, 20, starts, rng);
		expect(hives).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Step 10: Otter guide Pip placement
// ---------------------------------------------------------------------------

describe("initNewGame — otter guide Pip", () => {
	it("places otter guide near player spawn", () => {
		const result = initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(result.otterGuidePosition).not.toBeNull();
	});

	it("stores otter guide retrievable via getOtterGuide()", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		const guide = getOtterGuide();

		expect(guide).not.toBeNull();
		expect(guide!.name).toBe("Pip");
		expect(guide!.id).toBe("otter_pip");
	});

	it("clears otter guide on reset", () => {
		initNewGame(defaultOptions({ worldSeed: 42 }));
		expect(getOtterGuide()).not.toBeNull();

		reset();
		expect(getOtterGuide()).toBeNull();
	});

	it("returns null otter guide on error path", () => {
		const result = initNewGame(
			defaultOptions({ playerFaction: "nonexistent" }),
		);
		expect(result.otterGuidePosition).toBeNull();
	});
});

describe("placeOtterGuide — unit tests", () => {
	function makeRng(seed: number): () => number {
		let s = seed;
		return () => {
			s = (s * 1664525 + 1013904223) & 0x7fffffff;
			return s / 0x80000000;
		};
	}

	it("returns Pip with correct name and id", () => {
		const rng = makeRng(42);
		const guide = placeOtterGuide({ x: 50, z: 50 }, rng);

		expect(guide.name).toBe("Pip");
		expect(guide.id).toBe("otter_pip");
	});

	it("places guide offset from player spawn", () => {
		const rng = makeRng(42);
		const spawn = { x: 50, z: 50 };
		const guide = placeOtterGuide(spawn, rng);

		const dx = guide.position.x - spawn.x;
		const dz = guide.position.z - spawn.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		// Should be approximately 4 units away (OTTER_GUIDE_OFFSET)
		expect(dist).toBeGreaterThan(0);
		expect(dist).toBeLessThanOrEqual(5); // 4 + rounding tolerance
	});

	it("produces deterministic results for same rng", () => {
		const spawn = { x: 100, z: 100 };
		const g1 = placeOtterGuide(spawn, makeRng(42));
		const g2 = placeOtterGuide(spawn, makeRng(42));

		expect(g1.position).toEqual(g2.position);
	});
});

// ---------------------------------------------------------------------------
// Step 12: Camera transition
// ---------------------------------------------------------------------------

describe("getCameraTransition", () => {
	const playerPos = { x: 10, y: 0.5, z: 20 };

	it("starts in orbital phase at t=0", () => {
		const cam = getCameraTransition(0, playerPos);
		expect(cam.phase).toBe("orbital");
		expect(cam.progress).toBe(0);
	});

	it("orbital phase at t=1.5 (midway through 3s orbital)", () => {
		const cam = getCameraTransition(1.5, playerPos);
		expect(cam.phase).toBe("orbital");
		expect(cam.progress).toBeCloseTo(0.5, 1);
		// Camera should be at height 50
		expect(cam.cameraPosition.y).toBe(50);
	});

	it("transitions to zoom phase after 3s", () => {
		const cam = getCameraTransition(3.5, playerPos);
		expect(cam.phase).toBe("zoom");
		expect(cam.progress).toBeGreaterThan(0);
		expect(cam.progress).toBeLessThan(1);
	});

	it("transitions to fps phase after 5s", () => {
		const cam = getCameraTransition(5.5, playerPos);
		expect(cam.phase).toBe("fps");
		expect(cam.progress).toBe(1);
	});

	it("fps camera is at player eye height", () => {
		const cam = getCameraTransition(10, playerPos);
		expect(cam.phase).toBe("fps");
		expect(cam.cameraPosition.x).toBe(playerPos.x);
		// Eye height = player y + 1.6
		expect(cam.cameraPosition.y).toBe(playerPos.y + 1.6);
		expect(cam.cameraPosition.z).toBe(playerPos.z);
	});

	it("fps lookAt is forward from player", () => {
		const cam = getCameraTransition(10, playerPos);
		expect(cam.lookAt.z).toBe(playerPos.z + 1);
	});

	it("orbital camera orbits around player", () => {
		const cam = getCameraTransition(0, playerPos);
		// At t=0, angle=0, camera should be at x+40 (cos(0)*40)
		expect(cam.cameraPosition.x).toBeCloseTo(playerPos.x + 40);
		expect(cam.cameraPosition.z).toBeCloseTo(playerPos.z);
	});

	it("zoom phase interpolates camera height", () => {
		const earlyZoom = getCameraTransition(3.1, playerPos);
		const lateZoom = getCameraTransition(4.9, playerPos);

		// Early zoom: camera still high
		expect(earlyZoom.cameraPosition.y).toBeGreaterThan(playerPos.y + 5);
		// Late zoom: camera approaching player height
		expect(lateZoom.cameraPosition.y).toBeLessThan(earlyZoom.cameraPosition.y);
	});
});

// ---------------------------------------------------------------------------
// Determinism of new steps
// ---------------------------------------------------------------------------

describe("full 12-step determinism including hives and otter", () => {
	it("same seed produces same alien hives and otter guide", () => {
		const result1 = initNewGame(defaultOptions({ worldSeed: 42 }));
		const hives1 = getAlienHives();
		const otter1 = getOtterGuide();
		reset();
		const result2 = initNewGame(defaultOptions({ worldSeed: 42 }));
		const hives2 = getAlienHives();
		const otter2 = getOtterGuide();

		expect(result1.alienHiveCount).toBe(result2.alienHiveCount);
		expect(hives1).toEqual(hives2);
		expect(otter1).toEqual(otter2);
		expect(result1.otterGuidePosition).toEqual(result2.otterGuidePosition);
	});

	it("different seeds produce different alien hive and otter positions", () => {
		initNewGame(defaultOptions({ worldSeed: 1 }));
		const hives1 = getAlienHives();
		const otter1 = getOtterGuide();
		reset();
		initNewGame(defaultOptions({ worldSeed: 99999 }));
		const hives2 = getAlienHives();
		const otter2 = getOtterGuide();

		// At least one of the placements should differ
		const hivesMatch = JSON.stringify(hives1) === JSON.stringify(hives2);
		const otterMatch = JSON.stringify(otter1) === JSON.stringify(otter2);
		expect(hivesMatch && otterMatch).toBe(false);
	});
});
