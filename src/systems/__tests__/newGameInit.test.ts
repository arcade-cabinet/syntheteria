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
	validateOptions,
	getDifficultyModifiers,
	getSpawnPoint,
	getLastResult,
	reset,
	type NewGameOptions,
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
