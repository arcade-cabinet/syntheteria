import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building } from "../../traits/building";
import { Faction } from "../../traits/faction";
import { ResourcePool } from "../../traits/resource";
import { UnitFaction, UnitStats } from "../../traits/unit";
import {
	collectFactionResources,
	collectTurnSnapshot,
} from "../analyticsCollector";

let world: ReturnType<typeof createWorld>;

beforeEach(() => {
	world = createWorld();
});

afterEach(() => {
	world.destroy();
});

function spawnFaction(factionId: string, resources: Partial<Record<string, number>> = {}) {
	return world.spawn(
		Faction({ id: factionId, displayName: factionId, color: 0xffffff, persona: "otter", isPlayer: false, aggression: 0 }),
		ResourcePool(resources),
	);
}

function spawnUnit(factionId: string) {
	return world.spawn(
		UnitFaction({ factionId }),
		UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4, attack: 2, defense: 0 }),
	);
}

function spawnBuilding(factionId: string) {
	return world.spawn(
		Building({ tileX: 0, tileZ: 0, buildingType: "storage_hub", modelId: "", factionId, hp: 50, maxHp: 50 }),
	);
}

// ─── collectFactionResources ────────────────────────────────────────────────

describe("collectFactionResources", () => {
	it("returns empty array when no factions exist", () => {
		expect(collectFactionResources(world)).toEqual([]);
	});

	it("returns resources for each faction", () => {
		spawnFaction("player", { scrap_metal: 10, ferrous_scrap: 5 });
		spawnFaction("enemy", { alloy_stock: 20 });

		const snapshots = collectFactionResources(world);
		expect(snapshots).toHaveLength(2);

		const player = snapshots.find((s) => s.factionId === "player");
		expect(player).toBeDefined();
		expect(player!.resources.scrap_metal).toBe(10);
		expect(player!.resources.ferrous_scrap).toBe(5);

		const enemy = snapshots.find((s) => s.factionId === "enemy");
		expect(enemy!.resources.alloy_stock).toBe(20);
	});

	it("omits zero-valued resources", () => {
		spawnFaction("player", { scrap_metal: 5 });

		const snapshots = collectFactionResources(world);
		const player = snapshots[0];
		// Only scrap_metal should appear, not all 13 materials
		expect(Object.keys(player.resources)).toEqual(["scrap_metal"]);
	});
});

// ─── collectTurnSnapshot ────────────────────────────────────────────────────

describe("collectTurnSnapshot", () => {
	it("counts units per faction", () => {
		spawnFaction("player");
		spawnFaction("enemy");
		spawnUnit("player");
		spawnUnit("player");
		spawnUnit("player");
		spawnUnit("enemy");

		const snap = collectTurnSnapshot(world, 100);
		const player = snap.factions.find((f) => f.factionId === "player");
		const enemy = snap.factions.find((f) => f.factionId === "enemy");

		expect(player!.unitCount).toBe(3);
		expect(enemy!.unitCount).toBe(1);
	});

	it("counts buildings per faction", () => {
		spawnFaction("player");
		spawnBuilding("player");
		spawnBuilding("player");

		const snap = collectTurnSnapshot(world, 100);
		const player = snap.factions.find((f) => f.factionId === "player");
		expect(player!.buildingCount).toBe(2);
	});

	it("calculates territory percent from building count", () => {
		spawnFaction("player");
		spawnBuilding("player");
		spawnBuilding("player");

		const snap = collectTurnSnapshot(world, 200);
		const player = snap.factions.find((f) => f.factionId === "player");
		// 2 buildings / 200 tiles = 1%
		expect(player!.territoryPercent).toBe(1);
	});

	it("includes resource totals", () => {
		spawnFaction("player", { scrap_metal: 50, e_waste: 10 });

		const snap = collectTurnSnapshot(world, 100);
		const player = snap.factions.find((f) => f.factionId === "player");
		expect(player!.resourceTotals.scrap_metal).toBe(50);
		expect(player!.resourceTotals.e_waste).toBe(10);
	});

	it("returns empty factions array when no factions exist", () => {
		const snap = collectTurnSnapshot(world, 100);
		expect(snap.factions).toEqual([]);
	});

	it("handles zero total tiles gracefully", () => {
		spawnFaction("player");
		spawnBuilding("player");

		const snap = collectTurnSnapshot(world, 0);
		const player = snap.factions.find((f) => f.factionId === "player");
		expect(player!.territoryPercent).toBe(0);
	});
});
