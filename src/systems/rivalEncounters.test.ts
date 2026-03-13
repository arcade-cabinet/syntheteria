/**
 * Tests for rival faction encounter system (US-023).
 *
 * These tests validate:
 * - Spawn timing: no scouts before minSpawnTick, spawns after
 * - First contact: detection, idempotency, multi-faction discovery
 * - Strength assessment: correct ratio calculation
 * - isRivalFaction type guard
 * - Snapshot accuracy
 * - Reset clears all state
 */

// Mock structuralSpace (main branch uses this instead of terrain)
jest.mock("../world/structuralSpace", () => ({
	isPassableAtWorldPosition: jest.fn(() => true),
	getSurfaceHeightAtWorldPosition: jest.fn(() => 0),
	getStructuralFragments: jest.fn(() => []),
	updateDisplayOffsets: jest.fn(),
}));

jest.mock("../ecs/cityLayout", () => ({
	isInsideBuilding: jest.fn(() => false),
	isInsideCityBounds: jest.fn(() => true),
}));

import gameplayConfig from "../config/gameplay.json";
import {
	AIController,
	Identity,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { world } from "../ecs/world";
import {
	getDiscoveredFactions,
	getLastContactEvents,
	getRivalEncounterSnapshot,
	getStrengthContext,
	isRivalFaction,
	type RivalFaction,
	resetRivalEncounterState,
	rivalEncounterSystem,
} from "./rivalEncounters";

const CONFIG = gameplayConfig.rivalEncounters;

function spawnPlayerUnit(id: string, x: number, z: number) {
	const entity = world.spawn(
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);
	entity.set(Identity, { id, faction: "player" });
	entity.set(WorldPosition, { x, y: 0, z });
	entity.set(MapFragment, { fragmentId: "frag_0" });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "mentor",
		displayName: "Player Scout",
		speed: 2,
		selected: false,
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "legs", functional: true, material: "metal" },
		],
	});
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });
	return entity;
}

function spawnRivalScout(faction: RivalFaction, x: number, z: number) {
	const id = `test_rival_${faction}_${Math.floor(Math.random() * 100000)}`;
	const entity = world.spawn(
		AIController,
		Identity,
		WorldPosition,
		MapFragment,
		Unit,
		Navigation,
	);
	entity.set(AIController, {
		role: "rival_scout",
		enabled: true,
		stateJson: null,
	});
	entity.set(Identity, { id, faction });
	entity.set(WorldPosition, { x, y: 0, z });
	entity.set(MapFragment, { fragmentId: "frag_0" });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "scout",
		displayName: `${faction} Scout`,
		speed: CONFIG.scoutSpeed,
		selected: false,
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});
	entity.set(Navigation, { path: [], pathIndex: 0, moving: false });
	return entity;
}

describe("rivalEncounterSystem", () => {
	beforeEach(() => {
		resetRivalEncounterState();
	});

	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
		resetRivalEncounterState();
	});

	describe("spawn timing", () => {
		it("does not spawn scouts before minSpawnTick", () => {
			spawnPlayerUnit("player_1", 10, 10);

			for (let tick = 1; tick < CONFIG.minSpawnTick; tick += 10) {
				rivalEncounterSystem(tick);
			}

			const snapshot = getRivalEncounterSnapshot();
			expect(snapshot.activeScoutCount).toBe(0);
		});

		it("spawns scouts after minSpawnTick when player units exist", () => {
			spawnPlayerUnit("player_1", 10, 10);

			let spawned = false;
			for (
				let tick = CONFIG.minSpawnTick;
				tick < CONFIG.minSpawnTick + CONFIG.spawnIntervalTicks * 5;
				tick++
			) {
				rivalEncounterSystem(tick);
				const snapshot = getRivalEncounterSnapshot();
				if (snapshot.activeScoutCount > 0) {
					spawned = true;
					break;
				}
			}

			expect(spawned).toBe(true);
		});

		it("does not spawn scouts when no player units exist", () => {
			for (
				let tick = CONFIG.minSpawnTick;
				tick < CONFIG.minSpawnTick + CONFIG.spawnIntervalTicks * 3;
				tick++
			) {
				rivalEncounterSystem(tick);
			}

			const snapshot = getRivalEncounterSnapshot();
			expect(snapshot.activeScoutCount).toBe(0);
		});

		it("respects maxActiveScouts cap", () => {
			spawnPlayerUnit("player_1", 10, 10);

			for (let i = 0; i < CONFIG.maxActiveScouts; i++) {
				spawnRivalScout("reclaimers", 50 + i, 50);
			}

			const countBefore = getRivalEncounterSnapshot().activeScoutCount;
			for (
				let tick = CONFIG.minSpawnTick;
				tick < CONFIG.minSpawnTick + CONFIG.spawnIntervalTicks * 2;
				tick++
			) {
				rivalEncounterSystem(tick);
			}

			expect(getRivalEncounterSnapshot().activeScoutCount).toBe(countBefore);
		});
	});

	describe("first contact", () => {
		it("detects first contact when a rival scout is near a player unit", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnRivalScout("reclaimers", 10 + CONFIG.fogEdgeDetectionRadius - 1, 10);

			rivalEncounterSystem(CONFIG.minSpawnTick + 1);

			const events = getLastContactEvents();
			expect(events.length).toBe(1);
			expect(events[0].faction).toBe("reclaimers");
			expect(getDiscoveredFactions().has("reclaimers")).toBe(true);
		});

		it("does not trigger first contact for already-discovered factions", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnRivalScout("volt_collective", 12, 10);

			rivalEncounterSystem(CONFIG.minSpawnTick + 1);
			expect(getDiscoveredFactions().has("volt_collective")).toBe(true);
			expect(getLastContactEvents().length).toBe(1);

			spawnRivalScout("volt_collective", 13, 10);

			rivalEncounterSystem(CONFIG.minSpawnTick + 2);
			expect(getLastContactEvents().length).toBe(0);
		});

		it("discovers multiple factions independently", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnRivalScout("signal_choir", 12, 10);
			spawnRivalScout("iron_creed", 11, 10);

			rivalEncounterSystem(CONFIG.minSpawnTick + 1);

			const discovered = getDiscoveredFactions();
			expect(discovered.has("signal_choir")).toBe(true);
			expect(discovered.has("iron_creed")).toBe(true);
			expect(getLastContactEvents().length).toBe(2);
		});

		it("does not trigger first contact when scout is far from player", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnRivalScout("reclaimers", 10 + CONFIG.fogEdgeDetectionRadius + 5, 10);

			rivalEncounterSystem(CONFIG.minSpawnTick + 1);

			expect(getLastContactEvents().length).toBe(0);
			expect(getDiscoveredFactions().size).toBe(0);
		});
	});

	describe("strength context", () => {
		it("returns correct strength ratio for scout vs player units", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnPlayerUnit("player_2", 12, 10);
			spawnRivalScout("reclaimers", 11, 10);

			const ctx = getStrengthContext("reclaimers", 11, 10);
			expect(ctx.scoutStrength).toBe(1);
			expect(ctx.playerStrength).toBe(2);
		});

		it("counts multiple scouts of the same faction", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnRivalScout("reclaimers", 11, 10);
			spawnRivalScout("reclaimers", 12, 10);

			const ctx = getStrengthContext("reclaimers", 11, 10);
			expect(ctx.scoutStrength).toBe(2);
			expect(ctx.playerStrength).toBe(1);
		});

		it("does not count scouts of a different faction as allies", () => {
			spawnRivalScout("reclaimers", 11, 10);
			spawnRivalScout("iron_creed", 12, 10);

			const ctx = getStrengthContext("reclaimers", 11, 10);
			expect(ctx.scoutStrength).toBe(1);
		});
	});

	describe("isRivalFaction", () => {
		it("returns true for all four rival factions", () => {
			expect(isRivalFaction("reclaimers")).toBe(true);
			expect(isRivalFaction("volt_collective")).toBe(true);
			expect(isRivalFaction("signal_choir")).toBe(true);
			expect(isRivalFaction("iron_creed")).toBe(true);
		});

		it("returns false for non-rival factions", () => {
			expect(isRivalFaction("player")).toBe(false);
			expect(isRivalFaction("feral")).toBe(false);
			expect(isRivalFaction("cultist")).toBe(false);
			expect(isRivalFaction("unknown")).toBe(false);
		});
	});

	describe("snapshot", () => {
		it("returns an accurate snapshot of encounter state", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnRivalScout("reclaimers", 12, 10);
			spawnRivalScout("signal_choir", 13, 10);
			// Fill up to maxActiveScouts so no new spawns occur during the tick
			for (let i = 2; i < CONFIG.maxActiveScouts; i++) {
				spawnRivalScout("iron_creed", 80 + i, 80);
			}

			rivalEncounterSystem(CONFIG.minSpawnTick + 1);

			const snapshot = getRivalEncounterSnapshot();
			expect(snapshot.activeScoutCount).toBe(CONFIG.maxActiveScouts);
			expect(snapshot.discoveredFactions).toContain("reclaimers");
			expect(snapshot.discoveredFactions).toContain("signal_choir");
			// Only 2 factions near the player trigger contact (reclaimers + signal_choir)
			expect(snapshot.lastContactEvents.length).toBe(2);
		});
	});

	describe("reset", () => {
		it("clears all state on reset", () => {
			spawnPlayerUnit("player_1", 10, 10);
			spawnRivalScout("reclaimers", 12, 10);
			rivalEncounterSystem(CONFIG.minSpawnTick + 1);

			expect(getDiscoveredFactions().size).toBeGreaterThan(0);

			resetRivalEncounterState();

			expect(getDiscoveredFactions().size).toBe(0);
			expect(getLastContactEvents().length).toBe(0);
		});
	});
});
