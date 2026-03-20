import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building, UnitFaction, UnitPos } from "../../traits";
import { computeTerritory, getTerritoryPercent } from "../territorySystem";

describe("territorySystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	it("returns empty territory when no units or buildings exist", () => {
		const snap = computeTerritory(world, 16, 16);
		expect(snap.tiles.size).toBe(0);
		expect(snap.counts.size).toBe(0);
		expect(snap.totalTiles).toBe(256);
	});

	it("claims tiles around a unit within radius 2", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);

		const snap = computeTerritory(world, 16, 16);

		// Center tile should be claimed
		expect(snap.tiles.get("5,5")).toEqual({
			factionId: "player",
			contested: false,
		});

		// Adjacent tile (distance 1) should be claimed
		expect(snap.tiles.get("6,5")).toEqual({
			factionId: "player",
			contested: false,
		});

		// Tile at manhattan distance 2 should be claimed
		expect(snap.tiles.get("7,5")).toEqual({
			factionId: "player",
			contested: false,
		});

		// Tile at manhattan distance 3 should NOT be claimed
		expect(snap.tiles.has("8,5")).toBe(false);
	});

	it("claims tiles around a building within radius 4", () => {
		world.spawn(
			Building({
				tileX: 5,
				tileZ: 5,
				factionId: "player",
				buildingType: "outpost",
			}),
		);

		const snap = computeTerritory(world, 16, 16);

		// Tile at manhattan distance 4 should be claimed (building radius)
		expect(snap.tiles.get("9,5")).toEqual({
			factionId: "player",
			contested: false,
		});

		// Tile at manhattan distance 5 should NOT be claimed
		expect(snap.tiles.has("10,5")).toBe(false);
	});

	it("marks overlapping claims from different factions as contested", () => {
		// Two units from different factions close enough for overlap
		world.spawn(
			UnitPos({ tileX: 3, tileZ: 3 }),
			UnitFaction({ factionId: "player" }),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 3 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const snap = computeTerritory(world, 16, 16);

		// Tile at (4,3) is distance 1 from player (3,3) and distance 1 from reclaimers (5,3)
		const contested = snap.tiles.get("4,3");
		expect(contested).toBeDefined();
		expect(contested!.contested).toBe(true);
	});

	it("counts uncontested tiles per faction", () => {
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
		);
		world.spawn(
			UnitPos({ tileX: 15, tileZ: 15 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const snap = computeTerritory(world, 16, 16);

		expect(snap.counts.get("player")).toBeGreaterThan(0);
		expect(snap.counts.get("reclaimers")).toBeGreaterThan(0);
	});

	it("does not count contested tiles in faction counts", () => {
		// Same tile claimed by two factions
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "reclaimers" }),
		);

		const snap = computeTerritory(world, 16, 16);

		// All tiles are contested since both units are on the same tile
		// No uncontested claims for either faction
		const playerCount = snap.counts.get("player") ?? 0;
		const reclaimersCount = snap.counts.get("reclaimers") ?? 0;
		expect(playerCount).toBe(0);
		expect(reclaimersCount).toBe(0);
	});

	it("clamps claims to board bounds", () => {
		world.spawn(
			UnitPos({ tileX: 0, tileZ: 0 }),
			UnitFaction({ factionId: "player" }),
		);

		const snap = computeTerritory(world, 16, 16);

		// Should not have negative coordinates
		for (const key of snap.tiles.keys()) {
			const [x, z] = key.split(",").map(Number);
			expect(x).toBeGreaterThanOrEqual(0);
			expect(z).toBeGreaterThanOrEqual(0);
		}
	});

	it("computes territory percentage correctly", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "player" }),
		);

		const snap = computeTerritory(world, 10, 10);
		const pct = getTerritoryPercent(snap, "player");

		expect(pct).toBeGreaterThan(0);
		expect(pct).toBeLessThanOrEqual(100);
	});

	it("returns 0 territory percent for unknown faction", () => {
		const snap = computeTerritory(world, 16, 16);
		expect(getTerritoryPercent(snap, "nonexistent")).toBe(0);
	});

	it("skips entities with empty factionId", () => {
		world.spawn(
			UnitPos({ tileX: 5, tileZ: 5 }),
			UnitFaction({ factionId: "" }),
		);

		const snap = computeTerritory(world, 16, 16);
		expect(snap.tiles.size).toBe(0);
	});
});
