/**
 * Unit tests for territory, outpost, and territory effects systems.
 *
 * All pure functions are tested directly. Side-effecting functions
 * (claim/remove) are tested via the module store + reset helpers.
 */

import { beforeEach, describe, expect, it } from "vitest";
// We import the world only for claimTerritory/removeTerritory signatures;
// the world is not actually mutated by those functions.
import { world } from "../../ecs/world";
import { getOutpostRadius } from "../outpost";
import {
	calculateInfluence,
	claimTerritory,
	getAllTerritories,
	getAllTerritoriesForFaction,
	getOverlappingTerritories,
	getTerritoryAt,
	getTerritoryOwner,
	removeTerritory,
	resetTerritories,
	type Territory,
} from "../territory";
import {
	applyContestationDecay,
	detectIntrusions,
	getBuildingCostMultiplier,
	getContestingFactions,
	getResourceMultiplier,
	isTerritoryRevealed,
} from "../territoryEffects";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTerritories(...defs: Partial<Territory>[]): Territory[] {
	return defs.map((d, i) => ({
		id: d.id ?? `t_${i}`,
		ownerId: d.ownerId ?? "faction_a",
		center: d.center ?? { x: 0, z: 0 },
		radius: d.radius ?? 10,
		strength: d.strength ?? 1,
		established: d.established ?? 0,
	}));
}

// ---------------------------------------------------------------------------
// calculateInfluence
// ---------------------------------------------------------------------------

describe("calculateInfluence", () => {
	const territory: Territory = {
		id: "t1",
		ownerId: "faction_a",
		center: { x: 10, z: 10 },
		radius: 20,
		strength: 1,
		established: 0,
	};

	it("returns 1 at the center", () => {
		expect(calculateInfluence({ x: 10, z: 10 }, territory)).toBeCloseTo(1);
	});

	it("returns 0.5 at half the radius", () => {
		// 10 units away from center on x axis, radius is 20
		expect(calculateInfluence({ x: 20, z: 10 }, territory)).toBeCloseTo(0.5);
	});

	it("returns 0 exactly at the radius edge", () => {
		expect(calculateInfluence({ x: 30, z: 10 }, territory)).toBeCloseTo(0);
	});

	it("returns 0 outside the radius", () => {
		expect(calculateInfluence({ x: 50, z: 50 }, territory)).toBe(0);
	});

	it("scales with territory strength", () => {
		const weakTerritory = { ...territory, strength: 0.4 };
		// At center, influence should be 0.4
		expect(calculateInfluence({ x: 10, z: 10 }, weakTerritory)).toBeCloseTo(
			0.4,
		);
		// At half radius, influence should be 0.5 * 0.4 = 0.2
		expect(calculateInfluence({ x: 20, z: 10 }, weakTerritory)).toBeCloseTo(
			0.2,
		);
	});

	it("works with diagonal distance", () => {
		// Point is sqrt(5^2 + 5^2) = ~7.07 away from center (10,10)
		// Influence = 1 - 7.07/20 = ~0.646
		const influence = calculateInfluence({ x: 15, z: 15 }, territory);
		expect(influence).toBeGreaterThan(0.6);
		expect(influence).toBeLessThan(0.7);
	});
});

// ---------------------------------------------------------------------------
// getTerritoryAt
// ---------------------------------------------------------------------------

describe("getTerritoryAt", () => {
	it("returns null when no territories exist", () => {
		expect(getTerritoryAt({ x: 0, z: 0 }, [])).toBeNull();
	});

	it("returns the territory when inside one", () => {
		const ts = makeTerritories({ center: { x: 0, z: 0 }, radius: 10 });
		const result = getTerritoryAt({ x: 3, z: 3 }, ts);
		expect(result).toBe(ts[0]);
	});

	it("returns null when outside all territories", () => {
		const ts = makeTerritories({ center: { x: 0, z: 0 }, radius: 5 });
		expect(getTerritoryAt({ x: 100, z: 100 }, ts)).toBeNull();
	});

	it("returns the territory with highest influence when overlapping", () => {
		const ts = makeTerritories(
			{
				id: "near",
				center: { x: 0, z: 0 },
				radius: 20,
				ownerId: "faction_a",
			},
			{
				id: "far",
				center: { x: 15, z: 0 },
				radius: 20,
				ownerId: "faction_b",
			},
		);
		// At point (5, 0): closer to "near" center
		const result = getTerritoryAt({ x: 5, z: 0 }, ts);
		expect(result?.id).toBe("near");

		// At point (12, 0): closer to "far" center
		const result2 = getTerritoryAt({ x: 12, z: 0 }, ts);
		expect(result2?.id).toBe("far");
	});
});

// ---------------------------------------------------------------------------
// getTerritoryOwner
// ---------------------------------------------------------------------------

describe("getTerritoryOwner", () => {
	it("returns null for unclaimed position", () => {
		expect(getTerritoryOwner({ x: 0, z: 0 }, [])).toBeNull();
	});

	it("returns the faction id of the dominant territory", () => {
		const ts = makeTerritories({
			ownerId: "cult_of_el",
			center: { x: 5, z: 5 },
			radius: 10,
		});
		expect(getTerritoryOwner({ x: 5, z: 5 }, ts)).toBe("cult_of_el");
	});
});

// ---------------------------------------------------------------------------
// getOverlappingTerritories
// ---------------------------------------------------------------------------

describe("getOverlappingTerritories", () => {
	it("returns empty array when no overlaps", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 5,
				ownerId: "a",
			},
			{
				center: { x: 100, z: 100 },
				radius: 5,
				ownerId: "b",
			},
		);
		expect(getOverlappingTerritories(ts)).toEqual([]);
	});

	it("detects overlapping territories from different factions", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 10,
				ownerId: "a",
			},
			{
				center: { x: 15, z: 0 },
				radius: 10,
				ownerId: "b",
			},
		);
		// Distance is 15, sum of radii is 20 => overlap
		const pairs = getOverlappingTerritories(ts);
		expect(pairs).toHaveLength(1);
		expect(pairs[0][0].ownerId).toBe("a");
		expect(pairs[0][1].ownerId).toBe("b");
	});

	it("ignores overlaps from the same faction", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 10,
				ownerId: "a",
			},
			{
				center: { x: 5, z: 0 },
				radius: 10,
				ownerId: "a",
			},
		);
		expect(getOverlappingTerritories(ts)).toEqual([]);
	});

	it("does not report territories that just touch (edge to edge)", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 10,
				ownerId: "a",
			},
			{
				center: { x: 20, z: 0 },
				radius: 10,
				ownerId: "b",
			},
		);
		// Distance = 20, sum of radii = 20 => not strictly overlapping
		expect(getOverlappingTerritories(ts)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getAllTerritoriesForFaction
// ---------------------------------------------------------------------------

describe("getAllTerritoriesForFaction", () => {
	it("returns only territories matching the faction", () => {
		const ts = makeTerritories(
			{ ownerId: "player" },
			{ ownerId: "cultist" },
			{ ownerId: "player" },
		);
		const result = getAllTerritoriesForFaction("player", ts);
		expect(result).toHaveLength(2);
		for (const t of result) {
			expect(t.ownerId).toBe("player");
		}
	});

	it("returns empty array for unknown faction", () => {
		const ts = makeTerritories({ ownerId: "player" });
		expect(getAllTerritoriesForFaction("unknown", ts)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// claimTerritory / removeTerritory (store integration)
// ---------------------------------------------------------------------------

describe("claimTerritory / removeTerritory", () => {
	beforeEach(() => {
		resetTerritories();
	});

	it("claimTerritory adds to the store and returns the territory", () => {
		const t = claimTerritory(world, "player", { x: 10, z: 20 }, 15, 42);
		expect(t.ownerId).toBe("player");
		expect(t.center).toEqual({ x: 10, z: 20 });
		expect(t.radius).toBe(15);
		expect(t.strength).toBe(1);
		expect(t.established).toBe(42);

		const all = getAllTerritories();
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(t.id);
	});

	it("removeTerritory removes from the store", () => {
		const t = claimTerritory(world, "player", { x: 0, z: 0 }, 10);
		expect(getAllTerritories()).toHaveLength(1);

		removeTerritory(world, t.id);
		expect(getAllTerritories()).toHaveLength(0);
	});

	it("removeTerritory is a no-op for unknown id", () => {
		claimTerritory(world, "player", { x: 0, z: 0 }, 10);
		removeTerritory(world, "nonexistent");
		expect(getAllTerritories()).toHaveLength(1);
	});

	it("multiple claims create distinct territories", () => {
		const t1 = claimTerritory(world, "player", { x: 0, z: 0 }, 10);
		const t2 = claimTerritory(world, "cultist", { x: 50, z: 50 }, 20);
		expect(t1.id).not.toBe(t2.id);
		expect(getAllTerritories()).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// getOutpostRadius
// ---------------------------------------------------------------------------

describe("getOutpostRadius", () => {
	it("returns 10 for tier 1", () => {
		expect(getOutpostRadius(1)).toBe(10);
	});

	it("returns 20 for tier 2", () => {
		expect(getOutpostRadius(2)).toBe(20);
	});

	it("returns 35 for tier 3", () => {
		expect(getOutpostRadius(3)).toBe(35);
	});

	it("extrapolates for tiers beyond config", () => {
		// Tier 4: last defined radius (35) + (4-3) * 15 = 50
		expect(getOutpostRadius(4)).toBe(50);
	});
});

// ---------------------------------------------------------------------------
// Territory effects: resource multiplier
// ---------------------------------------------------------------------------

describe("getResourceMultiplier", () => {
	it("returns 1.5 inside own territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		expect(getResourceMultiplier({ x: 3, z: 3 }, "player", ts)).toBe(1.5);
	});

	it("returns 1.0 outside any territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		expect(getResourceMultiplier({ x: 100, z: 100 }, "player", ts)).toBe(1.0);
	});

	it("returns 1.0 inside enemy territory", () => {
		const ts = makeTerritories({
			ownerId: "cultist",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		expect(getResourceMultiplier({ x: 3, z: 3 }, "player", ts)).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Territory effects: building cost multiplier
// ---------------------------------------------------------------------------

describe("getBuildingCostMultiplier", () => {
	it("returns 0.8 inside own territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		expect(getBuildingCostMultiplier({ x: 3, z: 3 }, "player", ts)).toBe(0.8);
	});

	it("returns 1.0 outside territory", () => {
		expect(getBuildingCostMultiplier({ x: 0, z: 0 }, "player", [])).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// Territory effects: fog of war reveal
// ---------------------------------------------------------------------------

describe("isTerritoryRevealed", () => {
	it("returns true inside own territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 20,
		});
		expect(isTerritoryRevealed({ x: 5, z: 5 }, "player", ts)).toBe(true);
	});

	it("returns false outside own territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 5,
		});
		expect(isTerritoryRevealed({ x: 100, z: 100 }, "player", ts)).toBe(false);
	});

	it("returns false inside enemy territory", () => {
		const ts = makeTerritories({
			ownerId: "cultist",
			center: { x: 0, z: 0 },
			radius: 20,
		});
		expect(isTerritoryRevealed({ x: 5, z: 5 }, "player", ts)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Territory effects: intrusion detection
// ---------------------------------------------------------------------------

describe("detectIntrusions", () => {
	it("detects enemy inside player territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 20,
		});
		const entities = [
			{ id: "enemy_1", faction: "cultist", worldPosition: { x: 5, z: 5 } },
		];
		const alerts = detectIntrusions(entities, ts);
		expect(alerts).toHaveLength(1);
		expect(alerts[0].intruderId).toBe("enemy_1");
		expect(alerts[0].intruderFaction).toBe("cultist");
		expect(alerts[0].territoryOwnerId).toBe("player");
	});

	it("does not alert for own faction", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 20,
		});
		const entities = [
			{ id: "unit_1", faction: "player", worldPosition: { x: 5, z: 5 } },
		];
		expect(detectIntrusions(entities, ts)).toEqual([]);
	});

	it("does not alert for entities outside territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 5,
		});
		const entities = [
			{
				id: "enemy_1",
				faction: "cultist",
				worldPosition: { x: 100, z: 100 },
			},
		];
		expect(detectIntrusions(entities, ts)).toEqual([]);
	});

	it("skips entities without worldPosition", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 20,
		});
		const entities = [{ id: "ghost", faction: "cultist" }];
		expect(detectIntrusions(entities, ts)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Territory effects: contestation
// ---------------------------------------------------------------------------

describe("applyContestationDecay", () => {
	it("reduces strength of overlapping territories from different factions", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 10,
				ownerId: "a",
				strength: 1,
			},
			{
				center: { x: 15, z: 0 },
				radius: 10,
				ownerId: "b",
				strength: 1,
			},
		);
		applyContestationDecay(ts);
		expect(ts[0].strength).toBeLessThan(1);
		expect(ts[1].strength).toBeLessThan(1);
	});

	it("does not reduce strength for non-overlapping territories", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 5,
				ownerId: "a",
				strength: 1,
			},
			{
				center: { x: 100, z: 0 },
				radius: 5,
				ownerId: "b",
				strength: 1,
			},
		);
		applyContestationDecay(ts);
		expect(ts[0].strength).toBe(1);
		expect(ts[1].strength).toBe(1);
	});

	it("clamps strength at 0", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 10,
				ownerId: "a",
				strength: 0.005,
			},
			{
				center: { x: 15, z: 0 },
				radius: 10,
				ownerId: "b",
				strength: 0.005,
			},
		);
		// Decay rate is 0.01, so 0.005 - 0.01 would be negative => clamped to 0
		applyContestationDecay(ts);
		expect(ts[0].strength).toBe(0);
		expect(ts[1].strength).toBe(0);
	});
});

describe("getContestingFactions", () => {
	it("returns empty when no territories cover the point", () => {
		expect(getContestingFactions({ x: 0, z: 0 }, [])).toEqual([]);
	});

	it("returns empty when only one faction covers the point", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		expect(getContestingFactions({ x: 3, z: 3 }, ts)).toEqual([]);
	});

	it("returns both factions when two territories overlap at the point", () => {
		const ts = makeTerritories(
			{
				ownerId: "player",
				center: { x: 0, z: 0 },
				radius: 20,
			},
			{
				ownerId: "cultist",
				center: { x: 10, z: 0 },
				radius: 20,
			},
		);
		// Point (5, 0) is inside both
		const factions = getContestingFactions({ x: 5, z: 0 }, ts);
		expect(factions).toHaveLength(2);
		expect(factions).toContain("player");
		expect(factions).toContain("cultist");
	});
});
