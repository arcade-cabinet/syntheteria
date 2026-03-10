/**
 * Unit tests for the territory effects system.
 *
 * Tests cover:
 * - getResourceMultiplier: resource bonus in own/enemy/no territory
 * - getBuildingCostMultiplier: cost reduction in own/enemy/no territory
 * - isTerritoryRevealed: fog-of-war reveal via territory ownership
 * - detectIntrusions: hostile entity detection within territories
 * - applyContestationDecay: strength reduction for overlapping territories
 * - getContestingFactions: multi-faction overlap detection
 */

import type { Territory } from "../territory";
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
// getResourceMultiplier
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

	it("returns 1.0 with empty territories array", () => {
		expect(getResourceMultiplier({ x: 0, z: 0 }, "player", [])).toBe(1.0);
	});

	it("returns 1.5 at exact center of own territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 5, z: 5 },
			radius: 20,
		});
		expect(getResourceMultiplier({ x: 5, z: 5 }, "player", ts)).toBe(1.5);
	});

	it("returns 1.0 at the territory edge (influence = 0)", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		// At exactly radius distance, influence is 0, so no bonus
		expect(getResourceMultiplier({ x: 10, z: 0 }, "player", ts)).toBe(1.0);
	});

	it("picks the dominant territory for the faction when overlapping", () => {
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
		// At (3, 0), player territory has higher influence
		expect(getResourceMultiplier({ x: 3, z: 0 }, "player", ts)).toBe(1.5);
	});
});

// ---------------------------------------------------------------------------
// getBuildingCostMultiplier
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

	it("returns 1.0 in enemy territory", () => {
		const ts = makeTerritories({
			ownerId: "enemy",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		expect(getBuildingCostMultiplier({ x: 3, z: 3 }, "player", ts)).toBe(1.0);
	});

	it("returns 0.8 at the exact center of own territory", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 10, z: 10 },
			radius: 15,
		});
		expect(getBuildingCostMultiplier({ x: 10, z: 10 }, "player", ts)).toBe(
			0.8,
		);
	});
});

// ---------------------------------------------------------------------------
// isTerritoryRevealed
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

	it("returns false with no territories", () => {
		expect(isTerritoryRevealed({ x: 0, z: 0 }, "player", [])).toBe(false);
	});

	it("returns true when multiple own territories exist and one covers the point", () => {
		const ts = makeTerritories(
			{
				ownerId: "player",
				center: { x: 0, z: 0 },
				radius: 5,
			},
			{
				ownerId: "player",
				center: { x: 50, z: 50 },
				radius: 10,
			},
		);
		expect(isTerritoryRevealed({ x: 50, z: 50 }, "player", ts)).toBe(true);
	});

	it("returns false at the exact edge of own territory (influence = 0)", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 10,
		});
		// At exactly radius, influence is 0 (not > 0)
		expect(isTerritoryRevealed({ x: 10, z: 0 }, "player", ts)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// detectIntrusions
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
		expect(alerts[0].territoryId).toBe("t_0");
		expect(alerts[0].position).toEqual({ x: 5, z: 5 });
	});

	it("does not alert for own faction units", () => {
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

	it("generates alerts for multiple intruders", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 20,
		});
		const entities = [
			{ id: "e1", faction: "cultist", worldPosition: { x: 1, z: 1 } },
			{ id: "e2", faction: "rogue", worldPosition: { x: 2, z: 2 } },
			{ id: "e3", faction: "cultist", worldPosition: { x: 3, z: 3 } },
		];
		const alerts = detectIntrusions(entities, ts);
		expect(alerts).toHaveLength(3);
	});

	it("generates multiple alerts when intruder is in overlapping territories", () => {
		const ts = makeTerritories(
			{
				id: "t_player",
				ownerId: "player",
				center: { x: 0, z: 0 },
				radius: 20,
			},
			{
				id: "t_ally",
				ownerId: "ally",
				center: { x: 10, z: 0 },
				radius: 20,
			},
		);
		// This entity is inside both territories and belongs to neither
		const entities = [
			{ id: "intruder", faction: "cultist", worldPosition: { x: 5, z: 0 } },
		];
		const alerts = detectIntrusions(entities, ts);
		expect(alerts).toHaveLength(2);
		const territoryIds = alerts.map((a) => a.territoryId).sort();
		expect(territoryIds).toEqual(["t_ally", "t_player"]);
	});

	it("returns empty array for no entities", () => {
		const ts = makeTerritories({
			ownerId: "player",
			center: { x: 0, z: 0 },
			radius: 20,
		});
		expect(detectIntrusions([], ts)).toEqual([]);
	});

	it("returns empty array for no territories", () => {
		const entities = [
			{ id: "e1", faction: "cultist", worldPosition: { x: 0, z: 0 } },
		];
		expect(detectIntrusions(entities, [])).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// applyContestationDecay
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
		expect(ts[0].strength).toBe(0.99); // 1 - 0.01
		expect(ts[1].strength).toBe(0.99);
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
		applyContestationDecay(ts);
		expect(ts[0].strength).toBe(0);
		expect(ts[1].strength).toBe(0);
	});

	it("does not decay same-faction overlapping territories", () => {
		const ts = makeTerritories(
			{
				center: { x: 0, z: 0 },
				radius: 10,
				ownerId: "a",
				strength: 1,
			},
			{
				center: { x: 5, z: 0 },
				radius: 10,
				ownerId: "a",
				strength: 1,
			},
		);
		applyContestationDecay(ts);
		expect(ts[0].strength).toBe(1);
		expect(ts[1].strength).toBe(1);
	});

	it("handles empty territories array", () => {
		const ts: Territory[] = [];
		expect(() => applyContestationDecay(ts)).not.toThrow();
	});

	it("accumulates decay over multiple ticks", () => {
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
		applyContestationDecay(ts);
		applyContestationDecay(ts);
		expect(ts[0].strength).toBeCloseTo(0.97, 5);
		expect(ts[1].strength).toBeCloseTo(0.97, 5);
	});
});

// ---------------------------------------------------------------------------
// getContestingFactions
// ---------------------------------------------------------------------------

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
		const factions = getContestingFactions({ x: 5, z: 0 }, ts);
		expect(factions).toHaveLength(2);
		expect(factions).toContain("player");
		expect(factions).toContain("cultist");
	});

	it("returns three factions when triple-overlap exists", () => {
		const ts = makeTerritories(
			{
				ownerId: "player",
				center: { x: 0, z: 0 },
				radius: 20,
			},
			{
				ownerId: "cultist",
				center: { x: 5, z: 0 },
				radius: 20,
			},
			{
				ownerId: "rogue",
				center: { x: 2, z: 5 },
				radius: 20,
			},
		);
		const factions = getContestingFactions({ x: 3, z: 2 }, ts);
		expect(factions).toHaveLength(3);
		expect(factions).toContain("player");
		expect(factions).toContain("cultist");
		expect(factions).toContain("rogue");
	});

	it("does not count duplicate territories of the same faction", () => {
		const ts = makeTerritories(
			{
				ownerId: "player",
				center: { x: 0, z: 0 },
				radius: 20,
			},
			{
				ownerId: "player",
				center: { x: 5, z: 0 },
				radius: 20,
			},
		);
		// Only one faction, even though two territories overlap
		expect(getContestingFactions({ x: 3, z: 0 }, ts)).toEqual([]);
	});

	it("returns empty when point is outside all territories", () => {
		const ts = makeTerritories(
			{
				ownerId: "player",
				center: { x: 0, z: 0 },
				radius: 5,
			},
			{
				ownerId: "cultist",
				center: { x: 100, z: 100 },
				radius: 5,
			},
		);
		expect(getContestingFactions({ x: 50, z: 50 }, ts)).toEqual([]);
	});
});
