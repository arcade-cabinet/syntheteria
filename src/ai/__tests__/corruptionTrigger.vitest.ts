/**
 * CorruptionTrigger tests — verifies cult zone detection and faction contact.
 */

import { createWorld } from "koota";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CultStructure, UnitFaction, UnitPos } from "../../traits";
import {
	checkCorruptionTriggers,
	checkFactionContact,
	resetCorruptionTriggers,
} from "../triggers/corruptionTrigger";

// Mock AlertBar to avoid DOM dependencies in test
vi.mock("../../ui/game/AlertBar", () => ({
	pushAlert: vi.fn(),
}));

import { pushAlert } from "../../ui/game/AlertBar";

const mockPushAlert = vi.mocked(pushAlert);

describe("checkCorruptionTriggers", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		resetCorruptionTriggers();
		world = createWorld();
		mockPushAlert.mockClear();
	});

	it("returns empty when no cult structures exist", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const events = checkCorruptionTriggers(world, 1);
		expect(events).toHaveLength(0);
	});

	it("detects unit entering corruption zone", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				corruptionRadius: 3,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const events = checkCorruptionTriggers(world, 1);
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("corruption_zone_entered");
		expect(events[0].factionId).toBe("reclaimers");
	});

	it("does not alert for units outside corruption radius", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				corruptionRadius: 3,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 15 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const events = checkCorruptionTriggers(world, 1);
		expect(events).toHaveLength(0);
	});

	it("does not double-alert same unit for same POI", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				corruptionRadius: 3,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		checkCorruptionTriggers(world, 1);
		const events2 = checkCorruptionTriggers(world, 2);
		expect(events2).toHaveLength(0);
	});

	it("fires player alert for player faction units", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				corruptionRadius: 3,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);

		checkCorruptionTriggers(world, 1);
		expect(mockPushAlert).toHaveBeenCalledWith(
			"cult",
			"CORRUPTION ZONE DETECTED",
			5,
			5,
		);
	});

	it("does NOT fire alert for AI faction units (no UI)", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				corruptionRadius: 3,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		checkCorruptionTriggers(world, 1);
		expect(mockPushAlert).not.toHaveBeenCalled();
	});

	it("ignores cult faction units", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				corruptionRadius: 3,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "static_remnants" }),
		);

		const events = checkCorruptionTriggers(world, 1);
		expect(events).toHaveLength(0);
	});

	it("resetCorruptionTriggers allows re-alerting", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				corruptionRadius: 3,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		checkCorruptionTriggers(world, 1);
		resetCorruptionTriggers();
		const events = checkCorruptionTriggers(world, 2);
		expect(events).toHaveLength(1);
	});
});

describe("checkFactionContact", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		resetCorruptionTriggers();
		world = createWorld();
		mockPushAlert.mockClear();
	});

	it("detects first contact between factions", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);
		world.spawn(
			UnitPos({ tileX: 8, tileZ: 5 }),
			UnitFaction({ factionId: "volt_collective" }),
		);

		const events = checkFactionContact(world, 1);
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("faction_first_contact");
		expect(events[0].factionId).toBe("reclaimers");
		expect(events[0].otherFactionId).toBe("volt_collective");
	});

	it("does not re-trigger same faction pair", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);
		world.spawn(
			UnitPos({ tileX: 8, tileZ: 5 }),
			UnitFaction({ factionId: "volt_collective" }),
		);

		checkFactionContact(world, 1);
		const events2 = checkFactionContact(world, 2);
		expect(events2).toHaveLength(0);
	});

	it("ignores factions too far apart", () => {
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "reclaimers" }),
		);
		world.spawn(
			UnitPos({ tileX: 20, tileZ: 20 }),
			UnitFaction({ factionId: "volt_collective" }),
		);

		const events = checkFactionContact(world, 1);
		expect(events).toHaveLength(0);
	});

	it("ignores units in same faction", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);
		world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const events = checkFactionContact(world, 1);
		expect(events).toHaveLength(0);
	});

	it("ignores cult factions", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);
		world.spawn(
			UnitPos({ tileX: 6, tileZ: 5 }),
			UnitFaction({ factionId: "static_remnants" }),
		);

		const events = checkFactionContact(world, 1);
		expect(events).toHaveLength(0);
	});

	it("fires diplomacy alert for player contacts", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);
		world.spawn(
			UnitPos({ tileX: 8, tileZ: 5 }),
			UnitFaction({ factionId: "iron_creed" }),
		);

		checkFactionContact(world, 1);
		expect(mockPushAlert).toHaveBeenCalledWith(
			"diplomacy",
			"First contact: iron creed",
			8,
			5,
		);
	});
});
