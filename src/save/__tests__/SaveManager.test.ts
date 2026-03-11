/**
 * Unit tests for SaveManager serialization/deserialization round-trip.
 *
 * Tests the pure serialization logic without IndexedDB (which requires
 * a browser environment). Validates that all entity types, resources,
 * and territories survive a serialize → deserialize cycle.
 */

jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
jest.mock("expo-sqlite", () => ({}));

import { setGameSpeed, setTickCount } from "../../ecs/gameState";
import { setWorldSeed } from "../../ecs/seed";
import type { Entity } from "../../ecs/types";
import { world } from "../../ecs/world";
import {
	addResource,
	getResources,
	resetResourcePool,
} from "../../systems/resources";
import {
	claimTerritory,
	getAllTerritories,
	resetTerritories,
} from "../../systems/territory";
import {
	deserializeWorld,
	type SavePayload,
	serializeWorld,
} from "../SaveManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearWorld(): void {
	const all = Array.from(world);
	for (const e of all) {
		world.remove(e);
	}
	resetResourcePool();
	resetTerritories();
}

function addTestUnit(overrides: Partial<Entity> = {}): Entity {
	const entity: Entity = {
		id: overrides.id ?? `unit_${Date.now()}_${Math.random()}`,
		faction: overrides.faction ?? "player",
		worldPosition: overrides.worldPosition ?? { x: 10, y: 0.5, z: 20 },
		mapFragment: overrides.mapFragment ?? { fragmentId: "frag_1" },
		unit: overrides.unit ?? {
			type: "maintenance_bot",
			displayName: "Bot Alpha",
			speed: 3,
			selected: false,
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: false, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		},
		...overrides,
	};
	world.add(entity);
	return entity;
}

function addTestBuilding(overrides: Partial<Entity> = {}): Entity {
	const entity: Entity = {
		id: overrides.id ?? `building_${Date.now()}_${Math.random()}`,
		faction: overrides.faction ?? "player",
		worldPosition: overrides.worldPosition ?? { x: 5, y: 0, z: 15 },
		building: overrides.building ?? {
			type: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
		lightningRod: overrides.lightningRod ?? {
			rodCapacity: 10,
			currentOutput: 7.5,
			protectionRadius: 12,
		},
		...overrides,
	};
	world.add(entity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	clearWorld();
	setWorldSeed(42);
	setGameSpeed(1);
	setTickCount(0);
});

// ---------------------------------------------------------------------------
// Serialization basics
// ---------------------------------------------------------------------------

describe("serializeWorld", () => {
	it("creates a SavePayload with correct metadata", () => {
		setWorldSeed(12345);
		setGameSpeed(2);
		setTickCount(100);

		const payload = serializeWorld("slot_1", "Test Save", 3600);

		expect(payload.version).toBe(1);
		expect(payload.slotId).toBe("slot_1");
		expect(payload.name).toBe("Test Save");
		expect(payload.seed).toBe(12345);
		expect(payload.playTimeSeconds).toBe(3600);
		expect(payload.gameSpeed).toBe(2);
		expect(payload.tickCount).toBe(100);
		expect(payload.entities).toBeInstanceOf(Array);
		expect(payload.resources).toBeDefined();
		expect(payload.territories).toBeInstanceOf(Array);
	});

	it("serializes units with all component data", () => {
		addTestUnit({ id: "test_unit" });
		const payload = serializeWorld("slot_1", "Test", 0);

		const serialized = payload.entities.find((e) => e.entityId === "test_unit");
		expect(serialized).toBeDefined();
		expect(serialized?.entityType).toBe("maintenance_bot");
		expect(serialized?.faction).toBe("player");
		expect(serialized?.position).toEqual({ x: 10, y: 0.5, z: 20 });
		expect(serialized?.componentData.unit).toBeDefined();
		expect(serialized?.componentData.mapFragment).toEqual({
			fragmentId: "frag_1",
		});

		const unitData = serialized?.componentData.unit as Record<string, unknown>;
		expect(unitData.type).toBe("maintenance_bot");
		expect(unitData.displayName).toBe("Bot Alpha");
		expect(unitData.speed).toBe(3);
		expect((unitData.components as unknown[]).length).toBe(4);
	});

	it("serializes buildings with lightning rod data", () => {
		addTestBuilding({ id: "test_rod" });
		const payload = serializeWorld("slot_1", "Test", 0);

		const serialized = payload.entities.find((e) => e.entityId === "test_rod");
		expect(serialized).toBeDefined();
		expect(serialized?.componentData.building).toBeDefined();
		expect(serialized?.componentData.lightningRod).toBeDefined();

		const rodData = serialized?.componentData.lightningRod as Record<
			string,
			unknown
		>;
		expect(rodData.rodCapacity).toBe(10);
		expect(rodData.currentOutput).toBe(7.5);
		expect(rodData.protectionRadius).toBe(12);
	});

	it("serializes resources", () => {
		addResource("scrapMetal", 50);
		addResource("eWaste", 30);
		addResource("intactComponents", 10);

		const payload = serializeWorld("slot_1", "Test", 0);

		expect(payload.resources.scrapMetal).toBe(50);
		expect(payload.resources.eWaste).toBe(30);
		expect(payload.resources.intactComponents).toBe(10);
	});

	it("serializes territories", () => {
		claimTerritory(world, "player", { x: 10, z: 20 }, 15, 42);
		claimTerritory(world, "cultist", { x: 50, z: 50 }, 20, 100);

		const payload = serializeWorld("slot_1", "Test", 0);

		expect(payload.territories).toHaveLength(2);
		expect(payload.territories[0].ownerId).toBe("player");
		expect(payload.territories[0].center).toEqual({ x: 10, z: 20 });
		expect(payload.territories[0].radius).toBe(15);
		expect(payload.territories[1].ownerId).toBe("cultist");
	});

	it("preserves createdAt when provided", () => {
		const earlyTimestamp = 1000000;
		const payload = serializeWorld("slot_1", "Test", 0, earlyTimestamp);
		expect(payload.createdAt).toBe(earlyTimestamp);
	});

	it("skips entities without worldPosition", () => {
		const entity: Entity = {
			id: "no_pos",
			faction: "player",
		};
		world.add(entity);

		const payload = serializeWorld("slot_1", "Test", 0);
		const serialized = payload.entities.find((e) => e.entityId === "no_pos");
		expect(serialized).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Deserialization basics
// ---------------------------------------------------------------------------

describe("deserializeWorld", () => {
	it("restores entities from a payload", () => {
		addTestUnit({ id: "unit_1" });
		addTestBuilding({ id: "building_1" });
		const payload = serializeWorld("slot_1", "Test", 0);

		// Clear and restore
		clearWorld();
		expect(Array.from(world)).toHaveLength(0);

		deserializeWorld(payload);

		const entities = Array.from(world);
		expect(entities.length).toBe(2);
		expect(entities.find((e) => e.id === "unit_1")).toBeDefined();
		expect(entities.find((e) => e.id === "building_1")).toBeDefined();
	});

	it("restores unit component data", () => {
		addTestUnit({
			id: "bot",
			unit: {
				type: "utility_drone",
				displayName: "Drone X",
				speed: 5,
				selected: true,
				components: [
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "arms", functional: true, material: "metal" },
				],
			},
		});

		const payload = serializeWorld("slot_1", "Test", 0);
		clearWorld();
		deserializeWorld(payload);

		const bot = Array.from(world).find((e) => e.id === "bot");
		expect(bot).toBeDefined();
		expect(bot?.unit?.type).toBe("utility_drone");
		expect(bot?.unit?.displayName).toBe("Drone X");
		expect(bot?.unit?.speed).toBe(5);
		expect(bot?.unit?.components).toHaveLength(2);
		expect(bot?.unit?.components[0].name).toBe("camera");
		expect(bot?.unit?.components[0].functional).toBe(true);
		expect(bot?.unit?.components[1].name).toBe("arms");
	});

	it("restores world seed and game speed", () => {
		setWorldSeed(99999);
		setGameSpeed(2);
		setTickCount(500);

		const payload = serializeWorld("slot_1", "Test", 0);

		setWorldSeed(1);
		setGameSpeed(1);
		setTickCount(0);

		deserializeWorld(payload);

		// Seed is restored via setWorldSeed — we verify by re-serializing
		const payload2 = serializeWorld("slot_1", "Test", 0);
		expect(payload2.seed).toBe(99999);
		expect(payload2.tickCount).toBe(500);
	});

	it("restores resources correctly and resets before loading", () => {
		addResource("scrapMetal", 100);
		addResource("eWaste", 50);
		addResource("intactComponents", 25);

		const payload = serializeWorld("slot_1", "Test", 0);

		// Manually add more resources to verify reset
		addResource("scrapMetal", 999);

		deserializeWorld(payload);

		const res = getResources();
		expect(res.scrapMetal).toBe(100);
		expect(res.eWaste).toBe(50);
		expect(res.intactComponents).toBe(25);
	});

	it("restores territories", () => {
		claimTerritory(world, "player", { x: 10, z: 20 }, 15, 42);

		const payload = serializeWorld("slot_1", "Test", 0);
		clearWorld();
		deserializeWorld(payload);

		const territories = getAllTerritories();
		expect(territories).toHaveLength(1);
		expect(territories[0].ownerId).toBe("player");
		expect(territories[0].center).toEqual({ x: 10, z: 20 });
		expect(territories[0].radius).toBe(15);
		expect(territories[0].established).toBe(42);
	});

	it("clears existing entities before restoring", () => {
		addTestUnit({ id: "old_unit" });

		// Serialize a save with a different unit
		clearWorld();
		addTestUnit({ id: "new_unit" });
		const payload = serializeWorld("slot_1", "Test", 0);

		// Re-add old unit and then load
		clearWorld();
		addTestUnit({ id: "old_unit" });
		deserializeWorld(payload);

		const entities = Array.from(world);
		expect(entities).toHaveLength(1);
		expect(entities[0].id).toBe("new_unit");
	});
});

// ---------------------------------------------------------------------------
// Round-trip: serialize → deserialize preserves state
// ---------------------------------------------------------------------------

describe("round-trip serialization", () => {
	it("preserves a complex world through save/load cycle", () => {
		setWorldSeed(42);
		setGameSpeed(1.5);
		setTickCount(250);

		// Add various entities
		addTestUnit({
			id: "player_bot",
			faction: "player",
			worldPosition: { x: 10, y: 1, z: 20 },
			playerControlled: { isActive: true, yaw: 1.5, pitch: -0.3 },
			navigation: {
				path: [
					{ x: 10, y: 1, z: 20 },
					{ x: 15, y: 1, z: 25 },
				],
				pathIndex: 0,
				moving: true,
			},
		});

		addTestUnit({
			id: "feral_bot",
			faction: "feral",
			worldPosition: { x: -10, y: 0, z: -15 },
			unit: {
				type: "maintenance_bot",
				displayName: "Hostile Bot",
				speed: 2,
				selected: false,
				components: [
					{ name: "camera", functional: false, material: "electronic" },
					{ name: "legs", functional: true, material: "metal" },
				],
			},
		});

		addTestBuilding({
			id: "fab_unit",
			worldPosition: { x: 12, y: 0, z: 14 },
			building: {
				type: "fabrication_unit",
				powered: true,
				operational: true,
				selected: false,
				components: [
					{ name: "power_supply", functional: true, material: "electronic" },
				],
			},
		});

		// Add resources
		addResource("scrapMetal", 42);
		addResource("eWaste", 17);
		addResource("intactComponents", 5);

		// Add territories
		claimTerritory(world, "player", { x: 10, z: 15 }, 20, 100);

		// Serialize
		const payload = serializeWorld("slot_2", "Round-trip Test", 1800);

		// Ensure it's JSON-safe (this is what would happen during storage)
		const json = JSON.stringify(payload);
		const parsed = JSON.parse(json) as SavePayload;

		// Clear everything
		clearWorld();
		setWorldSeed(0);
		setGameSpeed(1);
		setTickCount(0);

		// Restore from parsed JSON
		deserializeWorld(parsed);

		// Verify world state
		const entities = Array.from(world);
		expect(entities.length).toBe(3);

		// Verify player bot
		const playerBot = entities.find((e) => e.id === "player_bot");
		expect(playerBot).toBeDefined();
		expect(playerBot?.faction).toBe("player");
		expect(playerBot?.worldPosition).toEqual({ x: 10, y: 1, z: 20 });
		expect(playerBot?.playerControlled?.isActive).toBe(true);
		expect(playerBot?.playerControlled?.yaw).toBeCloseTo(1.5);
		expect(playerBot?.playerControlled?.pitch).toBeCloseTo(-0.3);
		expect(playerBot?.navigation?.path).toHaveLength(2);
		expect(playerBot?.navigation?.moving).toBe(true);
		expect(playerBot?.unit?.type).toBe("maintenance_bot");
		expect(playerBot?.unit?.displayName).toBe("Bot Alpha");
		expect(playerBot?.unit?.components).toHaveLength(4);

		// Verify feral bot
		const feralBot = entities.find((e) => e.id === "feral_bot");
		expect(feralBot).toBeDefined();
		expect(feralBot?.faction).toBe("feral");
		expect(feralBot?.unit?.displayName).toBe("Hostile Bot");
		expect(feralBot?.unit?.components).toHaveLength(2);
		expect(
			feralBot?.unit?.components.find((c) => c.name === "camera")?.functional,
		).toBe(false);

		// Verify building
		const fab = entities.find((e) => e.id === "fab_unit");
		expect(fab).toBeDefined();
		expect(fab?.building?.type).toBe("fabrication_unit");
		expect(fab?.building?.powered).toBe(true);
		expect(fab?.building?.operational).toBe(true);

		// Verify resources
		const res = getResources();
		expect(res.scrapMetal).toBe(42);
		expect(res.eWaste).toBe(17);
		expect(res.intactComponents).toBe(5);

		// Verify territories
		const territories = getAllTerritories();
		expect(territories).toHaveLength(1);
		expect(territories[0].ownerId).toBe("player");
		expect(territories[0].center).toEqual({ x: 10, z: 15 });
		expect(territories[0].radius).toBe(20);

		// Verify seed was restored
		const payload2 = serializeWorld("slot_2", "Verify", 0);
		expect(payload2.seed).toBe(42);
	});

	it("handles factory entities through round-trip", () => {
		// Belt entity
		const belt: Entity = {
			id: "belt_1",
			faction: "player",
			worldPosition: { x: 21, y: 0, z: 10 },
			belt: {
				direction: "east",
				speed: 1,
				tier: "basic",
				carrying: "scrap_metal",
				nextBeltId: null,
				prevBeltId: null,
				itemProgress: 0.5,
			},
		};
		world.add(belt);

		// Wire entity
		const wire: Entity = {
			id: "wire_1",
			faction: "player",
			worldPosition: { x: 20, y: 1, z: 10 },
			wire: {
				wireType: "power",
				fromEntityId: "rod_1",
				toEntityId: "miner_1",
				length: 5,
				currentLoad: 0.8,
				maxCapacity: 10,
			},
		};
		world.add(wire);

		// Miner entity
		const miner: Entity = {
			id: "miner_1",
			faction: "player",
			worldPosition: { x: 20, y: 0, z: 10 },
			building: {
				type: "miner",
				powered: true,
				operational: true,
				selected: false,
				components: [],
			},
			miner: {
				resourceType: "scrap_metal",
				extractionRate: 2,
				outputBeltId: "belt_1",
				drillHealth: 0.9,
				active: true,
			},
		};
		world.add(miner);

		const payload = serializeWorld("slot_1", "Factory Test", 0);
		const json = JSON.stringify(payload);
		const parsed = JSON.parse(json) as SavePayload;

		clearWorld();
		deserializeWorld(parsed);

		const entities = Array.from(world);
		expect(entities).toHaveLength(3);

		// Verify belt
		const restoredBelt = entities.find((e) => e.id === "belt_1");
		expect(restoredBelt?.belt?.direction).toBe("east");
		expect(restoredBelt?.belt?.carrying).toBe("scrap_metal");
		expect(restoredBelt?.belt?.itemProgress).toBe(0.5);

		// Verify wire
		const restoredWire = entities.find((e) => e.id === "wire_1");
		expect(restoredWire?.wire?.wireType).toBe("power");
		expect(restoredWire?.wire?.fromEntityId).toBe("rod_1");
		expect(restoredWire?.wire?.currentLoad).toBe(0.8);

		// Verify miner
		const restoredMiner = entities.find((e) => e.id === "miner_1");
		expect(restoredMiner?.miner?.resourceType).toBe("scrap_metal");
		expect(restoredMiner?.miner?.extractionRate).toBe(2);
		expect(restoredMiner?.miner?.drillHealth).toBe(0.9);
	});

	it("handles material cube entities through round-trip", () => {
		// Ore deposit
		const deposit: Entity = {
			id: "ore_1",
			faction: "player",
			worldPosition: { x: 30, y: 0, z: 30 },
			oreDeposit: {
				oreType: "scrap_metal",
				currentYield: 75,
				maxYield: 100,
				hardness: 2,
			},
		};
		world.add(deposit);

		// Material cube
		const cube: Entity = {
			id: "cube_1",
			faction: "player",
			worldPosition: { x: 20, y: 0.5, z: 15 },
			materialCube: {
				material: "refined_metal",
				quality: 0.8,
				hp: 8,
				maxHp: 10,
				damaged: true,
			},
			placedAt: { gridX: 5, gridZ: 3, gridY: 1 },
			grabbable: { weight: 2 },
		};
		world.add(cube);

		const payload = serializeWorld("slot_1", "Material Test", 0);
		const json = JSON.stringify(payload);
		const parsed = JSON.parse(json) as SavePayload;

		clearWorld();
		deserializeWorld(parsed);

		const entities = Array.from(world);
		expect(entities).toHaveLength(2);

		// Verify ore deposit
		const restoredOre = entities.find((e) => e.id === "ore_1");
		expect(restoredOre?.oreDeposit?.oreType).toBe("scrap_metal");
		expect(restoredOre?.oreDeposit?.currentYield).toBe(75);
		expect(restoredOre?.oreDeposit?.hardness).toBe(2);

		// Verify material cube with placement
		const restoredCube = entities.find((e) => e.id === "cube_1");
		expect(restoredCube?.materialCube?.material).toBe("refined_metal");
		expect(restoredCube?.materialCube?.damaged).toBe(true);
		expect(restoredCube?.materialCube?.hp).toBe(8);
		expect(restoredCube?.placedAt?.gridX).toBe(5);
		expect(restoredCube?.placedAt?.gridZ).toBe(3);
		expect(restoredCube?.placedAt?.gridY).toBe(1);
		expect(restoredCube?.grabbable?.weight).toBe(2);
	});

	it("handles AI/behavior entities through round-trip", () => {
		// Hackable entity
		const hackable: Entity = {
			id: "relay_east",
			faction: "feral",
			worldPosition: { x: 30, y: 2, z: 12 },
			hackable: {
				difficulty: 20,
				hackProgress: 0.4,
				beingHacked: true,
				hacked: false,
			},
			signalRelay: {
				signalRange: 12,
				connectedTo: ["relay_start"],
				signalStrength: 0.7,
			},
		};
		world.add(hackable);

		// Automated bot
		const autoBot: Entity = {
			id: "auto_bot",
			faction: "player",
			worldPosition: { x: 15, y: 0, z: 15 },
			mapFragment: { fragmentId: "frag_1" },
			unit: {
				type: "maintenance_bot",
				displayName: "Worker Bot",
				speed: 3,
				selected: false,
				components: [{ name: "arms", functional: true, material: "metal" }],
			},
			automation: {
				routine: "patrol",
				followTarget: null,
				patrolPoints: [
					{ x: 10, y: 0, z: 10 },
					{ x: 20, y: 0, z: 20 },
				],
				patrolIndex: 1,
				workTarget: null,
			},
		};
		world.add(autoBot);

		// Otter
		const otter: Entity = {
			id: "otter_1",
			faction: "wildlife",
			worldPosition: { x: 14, y: 0, z: 18 },
			otter: {
				speed: 1.5,
				wanderTimer: 4,
				wanderDir: { x: 1, z: 0 },
				moving: false,
				stationary: true,
				lines: ["Hello there!", "I'm Pip."],
			},
		};
		world.add(otter);

		const payload = serializeWorld("slot_1", "AI Test", 0);
		const json = JSON.stringify(payload);
		const parsed = JSON.parse(json) as SavePayload;

		clearWorld();
		deserializeWorld(parsed);

		const entities = Array.from(world);
		expect(entities).toHaveLength(3);

		// Verify hackable
		const restoredHackable = entities.find((e) => e.id === "relay_east");
		expect(restoredHackable?.hackable?.difficulty).toBe(20);
		expect(restoredHackable?.hackable?.hackProgress).toBe(0.4);
		expect(restoredHackable?.hackable?.beingHacked).toBe(true);
		expect(restoredHackable?.signalRelay?.signalRange).toBe(12);
		expect(restoredHackable?.signalRelay?.connectedTo).toEqual(["relay_start"]);

		// Verify automated bot
		const restoredAuto = entities.find((e) => e.id === "auto_bot");
		expect(restoredAuto?.automation?.routine).toBe("patrol");
		expect(restoredAuto?.automation?.patrolPoints).toHaveLength(2);
		expect(restoredAuto?.automation?.patrolPoints[0]).toEqual({
			x: 10,
			y: 0,
			z: 10,
		});

		// Verify otter
		const restoredOtter = entities.find((e) => e.id === "otter_1");
		expect(restoredOtter?.otter?.speed).toBe(1.5);
		expect(restoredOtter?.otter?.stationary).toBe(true);
		expect(restoredOtter?.otter?.lines).toEqual(["Hello there!", "I'm Pip."]);
	});

	it("handles empty world through round-trip", () => {
		const payload = serializeWorld("slot_1", "Empty", 0);
		const json = JSON.stringify(payload);
		const parsed = JSON.parse(json) as SavePayload;

		deserializeWorld(parsed);

		expect(Array.from(world)).toHaveLength(0);
		const res = getResources();
		expect(res.scrapMetal).toBe(0);
		expect(res.eWaste).toBe(0);
		expect(res.intactComponents).toBe(0);
		expect(getAllTerritories()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// SaveSlotInfo extraction
// ---------------------------------------------------------------------------

describe("SavePayload contains count data for SaveSlotInfo", () => {
	it("entity counts can be derived from payload", () => {
		addTestUnit({ id: "u1" });
		addTestUnit({ id: "u2" });
		addTestBuilding({ id: "b1" });

		const payload = serializeWorld("slot_1", "Counts", 0);

		// Count units and buildings from the serialized entities
		let unitCount = 0;
		let buildingCount = 0;
		for (const e of payload.entities) {
			if (e.componentData.unit) unitCount++;
			if (e.componentData.building) buildingCount++;
		}

		expect(unitCount).toBe(2);
		// building_1 has building component; units don't
		expect(buildingCount).toBe(1);
	});
});
