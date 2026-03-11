/**
 * Unit tests for factory.ts, factoryBuildings.ts, wireFactory.ts, beltFactory.ts.
 *
 * Tests cover:
 * factory.ts:
 * - spawnUnit creates entity with unit, worldPosition, navigation, mapFragment
 * - spawnUnit uses provided fragmentId when given
 * - spawnUnit throws if fragmentId provided but not found
 * - spawnUnit with playerControlled=true sets isActive=true
 * - spawnUnit speed defaults to 3
 * - spawnFabricationUnit creates entity with both unit and building traits
 * - spawnLightningRod creates entity with lightningRod trait
 * - spawnOtter creates entity with otter trait
 *
 * factoryBuildings.ts:
 * - spawnMiner creates entity with miner + building traits
 * - spawnMiner throws if fragmentId not found
 * - spawnProcessor creates entity with processor + building traits
 * - spawnProcessor throws if fragmentId not found
 *
 * wireFactory.ts:
 * - placeWire calculates length from entity positions
 * - placeWire throws if source entity not found
 * - placeWire throws if target entity not found
 * - placeWire throws if source entity has no worldPosition
 * - removeWire removes entity from world
 * - getWiresFrom returns wires by fromEntityId
 * - getWiresTo returns wires by toEntityId
 * - power wire maxCapacity=10, signal wire maxCapacity=5
 *
 * beltFactory.ts:
 * - placeBelt creates entity with belt + worldPosition at snapped grid position
 * - getBeltAt finds belt at position
 * - getBeltAt returns undefined for empty position
 * - removeBelt removes belt and unlinks neighbors
 * - placeBelt auto-links to adjacent belt facing it
 */

// ---------------------------------------------------------------------------
// Config mock — full config required by transitive imports
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
			wirePassthroughFactor: 0.9,
			wireMinPassthrough: 0.1,
			wirePowerThreshold: 0.5,
			signalDegradationPerUnit: 0.05,
			signalMinStrength: 0.1,
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

// ---------------------------------------------------------------------------
// System mocks required by gameState.ts → world.ts transitive chain
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
	getStormIntensity: jest.fn(() => 0),
	setStormIntensity: jest.fn(),
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
	addResource: jest.fn(),
	spendResource: jest.fn(() => true),
	resetResourcePool: jest.fn(),
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
// Imports
// ---------------------------------------------------------------------------

import type { Entity } from "../types";
import { world } from "../world";
import { spawnUnit, spawnFabricationUnit, spawnOtter, spawnLightningRod } from "../factory";
import { spawnMiner, spawnProcessor } from "../factoryBuildings";
import { placeWire, removeWire, getWiresFrom, getWiresTo } from "../wireFactory";
import { getBeltAt, placeBelt, removeBelt } from "../beltFactory";
import { createFragment } from "../terrain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearWorld(): void {
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

afterAll(() => {
	clearWorld();
});

// ---------------------------------------------------------------------------
// factory.ts — spawnUnit
// ---------------------------------------------------------------------------

describe("spawnUnit", () => {
	it("creates an entity with unit and worldPosition traits", () => {
		const unit = spawnUnit({ x: 5, z: 10, components: [] });
		expect(unit.unit).toBeDefined();
		expect(unit.worldPosition).toBeDefined();
		expect(unit.worldPosition.x).toBe(5);
		expect(unit.worldPosition.z).toBe(10);
	});

	it("creates entity with navigation and mapFragment traits", () => {
		const unit = spawnUnit({ x: 0, z: 0, components: [] });
		expect(unit.navigation).toBeDefined();
		expect(unit.navigation!.path).toEqual([]);
		expect(unit.navigation!.moving).toBe(false);
		expect(unit.mapFragment).toBeDefined();
	});

	it("uses provided fragmentId when given", () => {
		const frag = createFragment();
		const unit = spawnUnit({ x: 0, z: 0, components: [], fragmentId: frag.id });
		expect(unit.mapFragment!.fragmentId).toBe(frag.id);
	});

	it("throws if fragmentId is provided but not found", () => {
		expect(() =>
			spawnUnit({ x: 0, z: 0, components: [], fragmentId: "nonexistent" }),
		).toThrow("not found");
	});

	it("defaults type to maintenance_bot", () => {
		const unit = spawnUnit({ x: 0, z: 0, components: [] });
		expect(unit.unit.type).toBe("maintenance_bot");
	});

	it("defaults speed to 3", () => {
		const unit = spawnUnit({ x: 0, z: 0, components: [] });
		expect(unit.unit.speed).toBe(3);
	});

	it("uses custom type and displayName", () => {
		const unit = spawnUnit({
			x: 0,
			z: 0,
			components: [],
			type: "utility_drone",
			displayName: "Drone A",
			speed: 5,
		});
		expect(unit.unit.type).toBe("utility_drone");
		expect(unit.unit.displayName).toBe("Drone A");
		expect(unit.unit.speed).toBe(5);
	});

	it("with playerControlled=true sets isActive=true", () => {
		const unit = spawnUnit({ x: 0, z: 0, components: [], playerControlled: true });
		expect(unit.playerControlled).toBeDefined();
		expect(unit.playerControlled!.isActive).toBe(true);
	});

	it("with playerControlled=false sets isActive=false", () => {
		const unit = spawnUnit({ x: 0, z: 0, components: [], playerControlled: false });
		expect(unit.playerControlled!.isActive).toBe(false);
	});

	it("without playerControlled option has no playerControlled trait", () => {
		const unit = spawnUnit({ x: 0, z: 0, components: [] });
		expect(unit.playerControlled).toBeUndefined();
	});

	it("stores components on the unit", () => {
		const components = [{ name: "camera", functional: true, material: "electronic" as const }];
		const unit = spawnUnit({ x: 0, z: 0, components });
		expect(unit.unit.components).toHaveLength(1);
		expect(unit.unit.components[0].name).toBe("camera");
	});

	it("entity is registered in the world", () => {
		const unit = spawnUnit({ x: 0, z: 0, components: [] });
		const all = Array.from(world);
		expect(all).toContain(unit);
	});
});

// ---------------------------------------------------------------------------
// factory.ts — spawnFabricationUnit
// ---------------------------------------------------------------------------

describe("spawnFabricationUnit", () => {
	it("creates entity with both unit and building traits", () => {
		const frag = createFragment();
		const entity = spawnFabricationUnit({ x: 3, z: 7, fragmentId: frag.id, components: [] });
		expect(entity.unit).toBeDefined();
		expect(entity.building).toBeDefined();
	});

	it("building is not powered or operational initially", () => {
		const frag = createFragment();
		const entity = spawnFabricationUnit({ x: 0, z: 0, fragmentId: frag.id, components: [] });
		expect(entity.building!.powered).toBe(false);
		expect(entity.building!.operational).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// factory.ts — spawnLightningRod
// ---------------------------------------------------------------------------

describe("spawnLightningRod", () => {
	it("creates entity with lightningRod trait", () => {
		const frag = createFragment();
		const entity = spawnLightningRod({ x: 1, z: 2, fragmentId: frag.id });
		expect(entity.lightningRod).toBeDefined();
	});

	it("has building and worldPosition traits", () => {
		const frag = createFragment();
		const entity = spawnLightningRod({ x: 1, z: 2, fragmentId: frag.id });
		expect(entity.building).toBeDefined();
		expect(entity.worldPosition).toBeDefined();
	});

	it("protectionRadius defaults from entity data", () => {
		const frag = createFragment();
		const entity = spawnLightningRod({ x: 0, z: 0, fragmentId: frag.id });
		expect(entity.lightningRod!.protectionRadius).toBeGreaterThan(0);
	});

	it("throws if fragmentId not found", () => {
		expect(() => spawnLightningRod({ x: 0, z: 0, fragmentId: "nope" })).toThrow("not found");
	});
});

// ---------------------------------------------------------------------------
// factory.ts — spawnOtter
// ---------------------------------------------------------------------------

describe("spawnOtter", () => {
	it("creates entity with otter trait", () => {
		const entity = spawnOtter({ x: 5, z: 5, lines: ["Hello!"] });
		expect(entity.otter).toBeDefined();
	});

	it("stores quest lines on the otter", () => {
		const entity = spawnOtter({ x: 0, z: 0, lines: ["Line 1", "Line 2"] });
		expect(entity.otter!.lines).toEqual(["Line 1", "Line 2"]);
	});
});

// ---------------------------------------------------------------------------
// factoryBuildings.ts — spawnMiner
// ---------------------------------------------------------------------------

describe("spawnMiner", () => {
	it("creates entity with miner and building traits", () => {
		const frag = createFragment();
		const entity = spawnMiner({ x: 2, z: 4, fragmentId: frag.id, resourceType: "scrap_metal" });
		expect(entity.miner).toBeDefined();
		expect(entity.building).toBeDefined();
	});

	it("sets resourceType on miner", () => {
		const frag = createFragment();
		const entity = spawnMiner({ x: 0, z: 0, fragmentId: frag.id, resourceType: "copper" });
		expect(entity.miner!.resourceType).toBe("copper");
	});

	it("throws if fragmentId not found", () => {
		expect(() =>
			spawnMiner({ x: 0, z: 0, fragmentId: "bad_frag", resourceType: "scrap_metal" }),
		).toThrow("not found");
	});

	it("sets outputBeltId from options", () => {
		const frag = createFragment();
		const entity = spawnMiner({
			x: 0,
			z: 0,
			fragmentId: frag.id,
			resourceType: "scrap_metal",
			outputBeltId: "belt_1",
		});
		expect(entity.miner!.outputBeltId).toBe("belt_1");
	});
});

// ---------------------------------------------------------------------------
// factoryBuildings.ts — spawnProcessor
// ---------------------------------------------------------------------------

describe("spawnProcessor", () => {
	it("creates entity with processor and building traits", () => {
		const frag = createFragment();
		const entity = spawnProcessor({ x: 1, z: 1, fragmentId: frag.id, processorType: "smelter" });
		expect(entity.processor).toBeDefined();
		expect(entity.building).toBeDefined();
	});

	it("sets processorType on processor", () => {
		const frag = createFragment();
		const entity = spawnProcessor({ x: 0, z: 0, fragmentId: frag.id, processorType: "refiner" });
		expect(entity.processor!.processorType).toBe("refiner");
	});

	it("throws if fragmentId not found", () => {
		expect(() =>
			spawnProcessor({ x: 0, z: 0, fragmentId: "bad", processorType: "smelter" }),
		).toThrow("not found");
	});

	it("recipe starts as null", () => {
		const frag = createFragment();
		const entity = spawnProcessor({ x: 0, z: 0, fragmentId: frag.id, processorType: "smelter" });
		expect(entity.processor!.recipe).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// wireFactory.ts
// ---------------------------------------------------------------------------

describe("wireFactory", () => {
	let entityA: Entity;
	let entityB: Entity;

	beforeEach(() => {
		entityA = world.add({
			id: "wire_test_a",
			faction: "player" as const,
			worldPosition: { x: 0, y: 0, z: 0 },
		} as Entity);
		entityB = world.add({
			id: "wire_test_b",
			faction: "player" as const,
			worldPosition: { x: 3, y: 4, z: 0 },
		} as Entity);
	});

	it("placeWire creates wire entity with correct wireType", () => {
		const wire = placeWire("wire_test_a", "wire_test_b", "power");
		expect(wire.wire).toBeDefined();
		expect(wire.wire!.wireType).toBe("power");
	});

	it("placeWire calculates length from positions (3-4-5 triangle = 5)", () => {
		const wire = placeWire("wire_test_a", "wire_test_b", "power");
		expect(wire.wire!.length).toBeCloseTo(5, 4);
	});

	it("placeWire power wire has maxCapacity=10", () => {
		const wire = placeWire("wire_test_a", "wire_test_b", "power");
		expect(wire.wire!.maxCapacity).toBe(10);
	});

	it("placeWire signal wire has maxCapacity=5", () => {
		const wire = placeWire("wire_test_a", "wire_test_b", "signal");
		expect(wire.wire!.maxCapacity).toBe(5);
	});

	it("placeWire stores fromEntityId and toEntityId", () => {
		const wire = placeWire("wire_test_a", "wire_test_b", "power");
		expect(wire.wire!.fromEntityId).toBe("wire_test_a");
		expect(wire.wire!.toEntityId).toBe("wire_test_b");
	});

	it("placeWire throws if source entity not found", () => {
		expect(() => placeWire("nonexistent", "wire_test_b", "power")).toThrow("not found");
	});

	it("placeWire throws if target entity not found", () => {
		expect(() => placeWire("wire_test_a", "nonexistent", "power")).toThrow("not found");
	});

	it("placeWire throws if source has no worldPosition", () => {
		world.add({ id: "wire_no_pos", faction: "player" as const } as Entity);
		expect(() => placeWire("wire_no_pos", "wire_test_b", "power")).toThrow("worldPosition");
	});

	it("removeWire removes the wire entity from the world", () => {
		const wire = placeWire("wire_test_a", "wire_test_b", "power");
		const wireId = wire.id;
		removeWire(wireId);
		const all = Array.from(world);
		expect(all.find((e) => e.id === wireId)).toBeUndefined();
	});

	it("removeWire is a no-op for non-existent ID", () => {
		expect(() => removeWire("does_not_exist")).not.toThrow();
	});

	it("getWiresFrom returns wires by fromEntityId", () => {
		placeWire("wire_test_a", "wire_test_b", "power");
		const wires = getWiresFrom("wire_test_a");
		expect(wires).toHaveLength(1);
		expect(wires[0].wire!.fromEntityId).toBe("wire_test_a");
	});

	it("getWiresTo returns wires by toEntityId", () => {
		placeWire("wire_test_a", "wire_test_b", "signal");
		const wires = getWiresTo("wire_test_b");
		expect(wires).toHaveLength(1);
		expect(wires[0].wire!.toEntityId).toBe("wire_test_b");
	});

	it("getWiresFrom returns empty array for entity with no outgoing wires", () => {
		expect(getWiresFrom("wire_test_b")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// beltFactory.ts
// ---------------------------------------------------------------------------

describe("beltFactory", () => {
	it("placeBelt creates entity at snapped grid position", () => {
		const entity = placeBelt(2.7, 3.2, "north");
		expect(entity).not.toBeNull();
		expect(entity!.belt).toBeDefined();
		expect(entity!.worldPosition).toBeDefined();
		expect(entity!.worldPosition!.x).toBe(3); // rounded
		expect(entity!.worldPosition!.z).toBe(3); // rounded
	});

	it("getBeltAt finds belt at position", () => {
		placeBelt(5, 7, "south");
		const found = getBeltAt(5, 7);
		expect(found).toBeDefined();
		expect(found!.belt!.direction).toBe("south");
	});

	it("getBeltAt returns undefined for empty position", () => {
		expect(getBeltAt(50, 50)).toBeUndefined();
	});

	it("placeBelt sets direction correctly", () => {
		const entity = placeBelt(0, 0, "east");
		expect(entity!.belt!.direction).toBe("east");
	});

	it("placeBelt uses tier 'basic' by default", () => {
		const entity = placeBelt(0, 0, "north");
		expect(entity!.belt!.tier).toBe("basic");
	});

	it("placeBelt uses custom tier when provided", () => {
		const entity = placeBelt(0, 0, "north", "fast");
		expect(entity!.belt!.tier).toBe("fast");
	});

	it("returns null when belt already exists at position", () => {
		placeBelt(10, 10, "north");
		const second = placeBelt(10, 10, "south");
		expect(second).toBeNull();
	});

	it("removeBelt returns true and removes entity", () => {
		const entity = placeBelt(1, 1, "north");
		expect(entity).not.toBeNull();
		const id = entity!.id;
		const result = removeBelt(id);
		expect(result).toBe(true);
		expect(getBeltAt(1, 1)).toBeUndefined();
	});

	it("removeBelt returns false for non-existent entity", () => {
		expect(removeBelt("does_not_exist")).toBe(false);
	});

	it("auto-links: belt facing toward neighbor sets nextBeltId", () => {
		// Place belt facing south (toward z+1)
		const belt1 = placeBelt(0, 0, "south");
		// Place belt at z+1 — belt1 points toward it
		placeBelt(0, 1, "south");
		// belt1.nextBeltId should now point to belt at (0,1)
		expect(belt1).not.toBeNull();
		expect(belt1!.belt!.nextBeltId).toBeDefined();
	});
});
