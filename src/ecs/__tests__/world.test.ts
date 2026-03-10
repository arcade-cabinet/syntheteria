/**
 * Unit tests for world.ts — ECS world queries and bot switching logic.
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import.
// world.ts → gameState.ts → many systems → config, so we need a broad mock.
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		terrain: {
			worldSize: 200,
			waterLevel: 0.15,
			heightLayers: 3,
			heightScale: 0.5,
			terrainFrequency: 0.08,
			walkCost: {
				water: 0,
				rough: 1.5,
				roughThreshold: 0.3,
				normal: 1.0,
				steep: 2.0,
				steepThreshold: 0.7,
				nearBuildingEdge: 1.3,
			},
			fogResolution: 200,
			displayOffsetDriftRate: 0.003,
			displayOffsetSnapThreshold: 0.01,
			navStep: 2,
			fragmentMergeDistance: 6,
			biomes: {},
		},
		mining: {
			scavenging: {
				baseChance: 0.1,
				cooldown: 10,
				dropTable: [],
			},
			extractionRates: {},
			drillDegradation: 0.001,
		},
		combat: {
			baseDamage: 1,
			attackRange: 5,
			attackCooldown: 30,
			missChance: 0.2,
		},
		power: {
			baseLightningChance: 0.1,
			stormInterval: 600,
			stormDuration: 120,
			rodBaseCapacity: 10,
			wireMaxLength: 20,
		},
		enemies: {
			spawnInterval: 300,
			maxEnemies: 20,
			types: [],
		},
		hacking: {
			baseSpeed: 0.01,
			computeCost: 5,
		},
		processing: {
			recipes: [],
		},
		territory: {
			claimRadius: 10,
			contestDecayRate: 0.01,
		},
		buildings: {
			types: [],
		},
		quests: {
			progression: [],
		},
		civilizations: {
			factions: [],
		},
		technology: {
			techTree: [],
			factionResearchBonuses: {},
		},
		victory: {
			conditions: [],
		},
	},
}));

// Mock all system imports that gameState.ts pulls in
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
		scrapMetal: 0,
		eWaste: 0,
		rareAlloy: 0,
		copper: 0,
		fiberOptics: 0,
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

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import type { Entity } from "../types";
import {
	world,
	getActivePlayerBot,
	switchBot,
	switchBotTo,
} from "../world";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addPlayerBot(id: string, isActive: boolean, yaw = 0, pitch = 0): Entity {
	return world.add({
		id,
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		mapFragment: { fragmentId: "frag_0" },
		unit: {
			type: "maintenance_bot",
			displayName: `Bot ${id}`,
			speed: 3,
			selected: false,
			components: [],
		},
		navigation: { path: [], pathIndex: 0, moving: false },
		playerControlled: { isActive, yaw, pitch },
	} as Entity);
}

function clearWorld() {
	const entities = Array.from(world);
	for (const e of entities) {
		world.remove(e);
	}
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	clearWorld();
});

// ---------------------------------------------------------------------------
// getActivePlayerBot
// ---------------------------------------------------------------------------

describe("getActivePlayerBot", () => {
	it("returns null when no player bots exist", () => {
		expect(getActivePlayerBot()).toBeNull();
	});

	it("returns null when no bot is active", () => {
		addPlayerBot("bot1", false);
		addPlayerBot("bot2", false);
		expect(getActivePlayerBot()).toBeNull();
	});

	it("returns the active bot", () => {
		addPlayerBot("bot1", false);
		addPlayerBot("bot2", true);
		const result = getActivePlayerBot();
		expect(result).not.toBeNull();
		expect(result!.id).toBe("bot2");
	});
});

// ---------------------------------------------------------------------------
// switchBot — cycle through bots
// ---------------------------------------------------------------------------

describe("switchBot", () => {
	it("returns null when only one bot exists", () => {
		addPlayerBot("bot1", true);
		expect(switchBot()).toBeNull();
	});

	it("returns null when no bots exist", () => {
		expect(switchBot()).toBeNull();
	});

	it("cycles to a different bot", () => {
		addPlayerBot("bot1", true);
		addPlayerBot("bot2", false);

		const next = switchBot();
		expect(next).not.toBeNull();
		expect(next!.id).toBe("bot2");
		expect(next!.playerControlled!.isActive).toBe(true);
	});

	it("deactivates the previous bot", () => {
		const bot1 = addPlayerBot("bot1", true);
		addPlayerBot("bot2", false);

		switchBot();
		expect(bot1.playerControlled!.isActive).toBe(false);
	});

	it("preserves yaw from the previous bot", () => {
		addPlayerBot("bot1", true, Math.PI / 4);
		addPlayerBot("bot2", false);

		const next = switchBot();
		expect(next!.playerControlled!.yaw).toBe(Math.PI / 4);
	});

	it("resets pitch to 0 on the new bot", () => {
		addPlayerBot("bot1", true, 0, 0.5);
		addPlayerBot("bot2", false, 0, 1.2);

		const next = switchBot();
		expect(next!.playerControlled!.pitch).toBe(0);
	});

	it("wraps around — switching enough times returns to original bot", () => {
		const bot1 = addPlayerBot("bot1", true);
		addPlayerBot("bot2", false);

		// Switch once (bot1 -> bot2)
		const first = switchBot();
		expect(first!.id).toBe("bot2");

		// Switch again (bot2 -> bot1)
		const second = switchBot();
		expect(second!.id).toBe("bot1");
	});

	it("with three bots, switches to the next and wraps", () => {
		addPlayerBot("bot1", true);
		addPlayerBot("bot2", false);
		addPlayerBot("bot3", false);

		// Cycle through all three and verify we visit each and return
		const seen = new Set<string>();
		let current = switchBot();
		seen.add(current!.id);

		current = switchBot();
		seen.add(current!.id);

		current = switchBot();
		// After 3 switches from bot1, should be back at bot1
		expect(current!.id).toBe("bot1");

		// Should have seen bot2 and bot3 during the intermediate switches
		expect(seen.size).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// switchBotTo — switch to a specific bot by entity ID
// ---------------------------------------------------------------------------

describe("switchBotTo", () => {
	it("returns null when target bot does not exist", () => {
		addPlayerBot("bot1", true);
		expect(switchBotTo("nonexistent")).toBeNull();
	});

	it("returns the already-active bot without changes", () => {
		const bot = addPlayerBot("bot1", true);
		const result = switchBotTo("bot1");
		expect(result).not.toBeNull();
		expect(result!.id).toBe("bot1");
		expect(bot.playerControlled!.isActive).toBe(true);
	});

	it("switches to the target bot", () => {
		addPlayerBot("bot1", true);
		addPlayerBot("bot2", false);

		const result = switchBotTo("bot2");
		expect(result).not.toBeNull();
		expect(result!.id).toBe("bot2");
		expect(result!.playerControlled!.isActive).toBe(true);
	});

	it("deactivates the current bot when switching", () => {
		const bot1 = addPlayerBot("bot1", true);
		addPlayerBot("bot2", false);

		switchBotTo("bot2");
		expect(bot1.playerControlled!.isActive).toBe(false);
	});

	it("preserves yaw from the current bot", () => {
		addPlayerBot("bot1", true, Math.PI / 3);
		addPlayerBot("bot2", false);

		const result = switchBotTo("bot2");
		expect(result!.playerControlled!.yaw).toBe(Math.PI / 3);
	});

	it("resets pitch to 0 on the target bot", () => {
		addPlayerBot("bot1", true);
		addPlayerBot("bot2", false, 0, 1.0);

		const result = switchBotTo("bot2");
		expect(result!.playerControlled!.pitch).toBe(0);
	});
});
