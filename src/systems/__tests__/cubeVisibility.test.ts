/**
 * Unit tests for the cube visibility system.
 *
 * Tests cover:
 * - registerCubePile: creation, ID generation, material breakdown, value computation
 * - updateCubePile: modifying existing piles
 * - removeCubePile: deletion
 * - getVisiblePiles: range filtering, line of sight, lastSeenBy, value estimation
 * - calculatePileAttractiveness: formula components, clamping, defense penalty
 * - getMaterialValues: correct base values
 * - getHighValueTargets: filtering by attractiveness, sorting
 * - getPilesByFaction: faction filtering, returns copies
 * - getTotalFactionWealth: summing across piles
 * - setDefenseRadius / removeDefense: defense registration
 * - Wall-based line-of-sight blocking
 * - reset: clears all state
 * - Edge cases: empty state, unknown materials, boundary distances
 */

import {
	registerCubePile,
	updateCubePile,
	removeCubePile,
	getVisiblePiles,
	calculatePileAttractiveness,
	getMaterialValues,
	getHighValueTargets,
	getPilesByFaction,
	getTotalFactionWealth,
	setDefenseRadius,
	removeDefense,
	addWall,
	clearWalls,
	getPile,
	setPileOwner,
	setPileExposed,
	reset,
} from "../cubeVisibility";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// registerCubePile
// ---------------------------------------------------------------------------

describe("registerCubePile", () => {
	it("returns a unique pile ID", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const id2 = registerCubePile({ x: 5, y: 0, z: 5 }, ["c2"], ["copper"], [2]);
		expect(id1).not.toBe(id2);
	});

	it("creates a pile with correct total value", () => {
		const id = registerCubePile(
			{ x: 0, y: 0, z: 0 },
			["c1", "c2", "c3"],
			["iron", "copper", "iron"],
			[3, 2, 3],
		);
		const pile = getPile(id);
		expect(pile).toBeDefined();
		expect(pile!.totalValue).toBe(8);
	});

	it("creates a pile with correct material breakdown", () => {
		const id = registerCubePile(
			{ x: 0, y: 0, z: 0 },
			["c1", "c2", "c3"],
			["iron", "copper", "iron"],
			[3, 2, 3],
		);
		const pile = getPile(id);
		expect(pile!.materialBreakdown).toEqual({ iron: 2, copper: 1 });
	});

	it("sets height equal to cube count", () => {
		const id = registerCubePile(
			{ x: 0, y: 0, z: 0 },
			["c1", "c2", "c3", "c4"],
			["iron", "iron", "iron", "iron"],
			[3, 3, 3, 3],
		);
		const pile = getPile(id);
		expect(pile!.height).toBe(4);
	});

	it("defaults isExposed to true", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const pile = getPile(id);
		expect(pile!.isExposed).toBe(true);
	});

	it("defaults ownerFaction to null", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const pile = getPile(id);
		expect(pile!.ownerFaction).toBeNull();
	});

	it("initializes lastSeenBy as empty map", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const pile = getPile(id);
		expect(pile!.lastSeenBy.size).toBe(0);
	});

	it("stores position correctly", () => {
		const id = registerCubePile({ x: 10, y: 5, z: -3 }, ["c1"], ["iron"], [3]);
		const pile = getPile(id);
		expect(pile!.position).toEqual({ x: 10, y: 5, z: -3 });
	});
});

// ---------------------------------------------------------------------------
// updateCubePile
// ---------------------------------------------------------------------------

describe("updateCubePile", () => {
	it("updates cube IDs and recalculates value", () => {
		const id = registerCubePile(
			{ x: 0, y: 0, z: 0 },
			["c1"],
			["iron"],
			[3],
		);
		updateCubePile(id, ["c1", "c2", "c3"], ["iron", "copper", "rare_alloy"], [3, 2, 8]);

		const pile = getPile(id);
		expect(pile!.cubeIds).toEqual(["c1", "c2", "c3"]);
		expect(pile!.totalValue).toBe(13);
		expect(pile!.height).toBe(3);
	});

	it("updates material breakdown", () => {
		const id = registerCubePile(
			{ x: 0, y: 0, z: 0 },
			["c1"],
			["iron"],
			[3],
		);
		updateCubePile(id, ["c1", "c2"], ["copper", "copper"], [2, 2]);

		const pile = getPile(id);
		expect(pile!.materialBreakdown).toEqual({ copper: 2 });
	});

	it("does nothing for nonexistent pile ID", () => {
		// Should not throw
		expect(() => {
			updateCubePile("fake_id", ["c1"], ["iron"], [3]);
		}).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// removeCubePile
// ---------------------------------------------------------------------------

describe("removeCubePile", () => {
	it("removes a pile from tracking", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		removeCubePile(id);
		expect(getPile(id)).toBeUndefined();
	});

	it("does nothing for nonexistent pile ID", () => {
		expect(() => removeCubePile("fake_id")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getVisiblePiles — range filtering
// ---------------------------------------------------------------------------

describe("getVisiblePiles — range filtering", () => {
	it("returns piles within perception range", () => {
		const id = registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "enemy");

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(1);
		expect(visible[0].pileId).toBe(id);
	});

	it("excludes piles outside perception range", () => {
		const id = registerCubePile({ x: 100, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "enemy");

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(0);
	});

	it("includes pile at exactly perception range boundary", () => {
		const id = registerCubePile({ x: 50, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "enemy");

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(1);
	});

	it("computes correct distance", () => {
		const _id = registerCubePile({ x: 3, y: 0, z: 4 }, ["c1"], ["iron"], [3]);

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible[0].distance).toBeCloseTo(5); // 3-4-5 triangle
	});
});

// ---------------------------------------------------------------------------
// getVisiblePiles — line of sight
// ---------------------------------------------------------------------------

describe("getVisiblePiles — line of sight", () => {
	it("blocks visibility when a wall is between observer and pile", () => {
		const _id = registerCubePile({ x: 20, y: 0, z: 0 }, ["c1"], ["iron"], [3]);

		// Wall at x=10, blocking the line from (0,0,0) to (20,0,0)
		addWall({ x: 10, y: 0, z: 0 }, { x: 1, z: 5 });

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(0);
	});

	it("allows visibility when wall is not on the line", () => {
		const _id = registerCubePile({ x: 20, y: 0, z: 0 }, ["c1"], ["iron"], [3]);

		// Wall at z=20, not between observer and pile
		addWall({ x: 10, y: 0, z: 20 }, { x: 1, z: 1 });

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(1);
	});

	it("clears walls with clearWalls", () => {
		const _id = registerCubePile({ x: 20, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		addWall({ x: 10, y: 0, z: 0 }, { x: 1, z: 5 });

		clearWalls();

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// getVisiblePiles — lastSeenBy tracking
// ---------------------------------------------------------------------------

describe("getVisiblePiles — lastSeenBy tracking", () => {
	it("updates lastSeenBy for the observer's faction", () => {
		const id = registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);

		getVisiblePiles({ x: 0, y: 0, z: 0 }, "reclaimers", 50, 42);

		const pile = getPile(id);
		expect(pile!.lastSeenBy.get("reclaimers")).toBe(42);
	});

	it("tracks multiple factions independently", () => {
		const id = registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);

		getVisiblePiles({ x: 0, y: 0, z: 0 }, "reclaimers", 50, 10);
		getVisiblePiles({ x: 0, y: 0, z: 0 }, "volt_collective", 50, 20);

		const pile = getPile(id);
		expect(pile!.lastSeenBy.get("reclaimers")).toBe(10);
		expect(pile!.lastSeenBy.get("volt_collective")).toBe(20);
	});

	it("updates lastSeenBy timestamp on subsequent observations", () => {
		const id = registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);

		getVisiblePiles({ x: 0, y: 0, z: 0 }, "reclaimers", 50, 10);
		getVisiblePiles({ x: 0, y: 0, z: 0 }, "reclaimers", 50, 99);

		const pile = getPile(id);
		expect(pile!.lastSeenBy.get("reclaimers")).toBe(99);
	});
});

// ---------------------------------------------------------------------------
// getVisiblePiles — isEnemyPile
// ---------------------------------------------------------------------------

describe("getVisiblePiles — enemy detection", () => {
	it("marks pile as enemy when owned by a different faction", () => {
		const id = registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "volt_collective");

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"reclaimers",
			50,
			100,
		);
		expect(visible[0].isEnemyPile).toBe(true);
	});

	it("marks pile as non-enemy when owned by same faction", () => {
		const id = registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "reclaimers");

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"reclaimers",
			50,
			100,
		);
		expect(visible[0].isEnemyPile).toBe(false);
	});

	it("marks unowned pile as non-enemy", () => {
		registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"reclaimers",
			50,
			100,
		);
		expect(visible[0].isEnemyPile).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getVisiblePiles — primaryMaterial
// ---------------------------------------------------------------------------

describe("getVisiblePiles — primary material", () => {
	it("returns the most common material", () => {
		const _id = registerCubePile(
			{ x: 5, y: 0, z: 0 },
			["c1", "c2", "c3"],
			["iron", "copper", "iron"],
			[3, 2, 3],
		);

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible[0].primaryMaterial).toBe("iron");
	});
});

// ---------------------------------------------------------------------------
// calculatePileAttractiveness
// ---------------------------------------------------------------------------

describe("calculatePileAttractiveness", () => {
	it("returns value between 0 and 1", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const pile = getPile(id)!;
		const score = calculatePileAttractiveness(pile, "reclaimers", 10);
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(1);
	});

	it("exposed piles score higher than sheltered piles", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [10]);
		const id2 = registerCubePile({ x: 5, y: 0, z: 0 }, ["c2"], ["iron"], [10]);
		setPileExposed(id2, false);

		const pile1 = getPile(id1)!;
		const pile2 = getPile(id2)!;

		const score1 = calculatePileAttractiveness(pile1, "enemy", 10);
		const score2 = calculatePileAttractiveness(pile2, "enemy", 10);

		expect(score1).toBeGreaterThan(score2);
	});

	it("closer piles score higher than distant piles", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [10]);
		const pile = getPile(id)!;

		const closeScore = calculatePileAttractiveness(pile, "enemy", 5);
		const farScore = calculatePileAttractiveness(pile, "enemy", 80);

		expect(closeScore).toBeGreaterThan(farScore);
	});

	it("higher-value piles score higher", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const id2 = registerCubePile({ x: 5, y: 0, z: 0 }, ["c2", "c3", "c4"], ["iron", "iron", "iron"], [30, 30, 30]);

		const pile1 = getPile(id1)!;
		const pile2 = getPile(id2)!;

		const score1 = calculatePileAttractiveness(pile1, "enemy", 10);
		const score2 = calculatePileAttractiveness(pile2, "enemy", 10);

		expect(score2).toBeGreaterThan(score1);
	});

	it("defense structures reduce attractiveness", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [10]);

		const pileNoDefense = getPile(id)!;
		const scoreNoDefense = calculatePileAttractiveness(pileNoDefense, "enemy", 10);

		setDefenseRadius("turret1", { x: 0, y: 0, z: 0 }, 20);

		const pileWithDefense = getPile(id)!;
		const scoreWithDefense = calculatePileAttractiveness(pileWithDefense, "enemy", 10);

		expect(scoreWithDefense).toBeLessThan(scoreNoDefense);
	});

	it("clamps score to 0 when defense overwhelms value", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [1]);

		setDefenseRadius("turret1", { x: 0, y: 0, z: 0 }, 20);
		setDefenseRadius("turret2", { x: 1, y: 0, z: 0 }, 20);
		setDefenseRadius("turret3", { x: -1, y: 0, z: 0 }, 20);

		const pile = getPile(id)!;
		const score = calculatePileAttractiveness(pile, "enemy", 50);

		expect(score).toBe(0);
	});

	it("larger piles have higher size component", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [5]);
		const id2 = registerCubePile(
			{ x: 5, y: 0, z: 0 },
			Array.from({ length: 15 }, (_, i) => `c${i + 2}`),
			Array.from({ length: 15 }, () => "iron"),
			Array.from({ length: 15 }, () => 5),
		);

		const pile1 = getPile(id1)!;
		const pile2 = getPile(id2)!;

		const score1 = calculatePileAttractiveness(pile1, "enemy", 10);
		const score2 = calculatePileAttractiveness(pile2, "enemy", 10);

		expect(score2).toBeGreaterThan(score1);
	});
});

// ---------------------------------------------------------------------------
// getMaterialValues
// ---------------------------------------------------------------------------

describe("getMaterialValues", () => {
	it("returns correct scrap_iron value", () => {
		expect(getMaterialValues().scrap_iron).toBe(1);
	});

	it("returns correct copper value", () => {
		expect(getMaterialValues().copper).toBe(2);
	});

	it("returns correct iron value", () => {
		expect(getMaterialValues().iron).toBe(3);
	});

	it("returns correct rare_alloy value", () => {
		expect(getMaterialValues().rare_alloy).toBe(8);
	});

	it("returns correct fiber_optics value", () => {
		expect(getMaterialValues().fiber_optics).toBe(5);
	});

	it("returns a copy (mutations do not affect internals)", () => {
		const vals = getMaterialValues();
		vals.scrap_iron = 999;
		expect(getMaterialValues().scrap_iron).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getHighValueTargets
// ---------------------------------------------------------------------------

describe("getHighValueTargets", () => {
	it("returns empty array when no piles exist", () => {
		const targets = getHighValueTargets("reclaimers", 0.5);
		expect(targets).toEqual([]);
	});

	it("excludes own piles", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [50]);
		setPileOwner(id, "reclaimers");

		const targets = getHighValueTargets("reclaimers", 0);
		expect(targets).toHaveLength(0);
	});

	it("returns enemy piles above minimum attractiveness", () => {
		const id = registerCubePile(
			{ x: 0, y: 0, z: 0 },
			Array.from({ length: 10 }, (_, i) => `c${i}`),
			Array.from({ length: 10 }, () => "iron"),
			Array.from({ length: 10 }, () => 5),
		);
		setPileOwner(id, "volt_collective");

		const targets = getHighValueTargets("reclaimers", 0.1);
		expect(targets.length).toBeGreaterThanOrEqual(1);
		expect(targets[0].pileId).toBe(id);
	});

	it("filters out piles below minimum attractiveness", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [1]);
		setPileOwner(id, "volt_collective");

		// Very high threshold
		const targets = getHighValueTargets("reclaimers", 0.99);
		expect(targets).toHaveLength(0);
	});

	it("sorts by attractiveness descending", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [5]);
		setPileOwner(id1, "enemy");

		const id2 = registerCubePile(
			{ x: 5, y: 0, z: 0 },
			Array.from({ length: 10 }, (_, i) => `c${i + 2}`),
			Array.from({ length: 10 }, () => "iron"),
			Array.from({ length: 10 }, () => 5),
		);
		setPileOwner(id2, "enemy");

		const targets = getHighValueTargets("reclaimers", 0);
		expect(targets.length).toBe(2);
		expect(targets[0].attractiveness).toBeGreaterThanOrEqual(targets[1].attractiveness);
	});
});

// ---------------------------------------------------------------------------
// getPilesByFaction
// ---------------------------------------------------------------------------

describe("getPilesByFaction", () => {
	it("returns empty array for faction with no piles", () => {
		expect(getPilesByFaction("reclaimers")).toEqual([]);
	});

	it("returns only piles belonging to the specified faction", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const id2 = registerCubePile({ x: 5, y: 0, z: 0 }, ["c2"], ["copper"], [2]);
		const id3 = registerCubePile({ x: 10, y: 0, z: 0 }, ["c3"], ["iron"], [3]);

		setPileOwner(id1, "reclaimers");
		setPileOwner(id2, "volt_collective");
		setPileOwner(id3, "reclaimers");

		const result = getPilesByFaction("reclaimers");
		expect(result).toHaveLength(2);
		expect(result.every((p) => p.ownerFaction === "reclaimers")).toBe(true);
	});

	it("returns copies not references", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "reclaimers");

		const result1 = getPilesByFaction("reclaimers");
		const result2 = getPilesByFaction("reclaimers");

		expect(result1[0]).toEqual(result2[0]);
		expect(result1[0]).not.toBe(result2[0]);
	});
});

// ---------------------------------------------------------------------------
// getTotalFactionWealth
// ---------------------------------------------------------------------------

describe("getTotalFactionWealth", () => {
	it("returns 0 for faction with no piles", () => {
		expect(getTotalFactionWealth("reclaimers")).toBe(0);
	});

	it("sums values across all piles for a faction", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const id2 = registerCubePile({ x: 5, y: 0, z: 0 }, ["c2", "c3"], ["copper", "iron"], [2, 3]);

		setPileOwner(id1, "reclaimers");
		setPileOwner(id2, "reclaimers");

		expect(getTotalFactionWealth("reclaimers")).toBe(8); // 3 + 2 + 3
	});

	it("does not include piles from other factions", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const id2 = registerCubePile({ x: 5, y: 0, z: 0 }, ["c2"], ["iron"], [10]);

		setPileOwner(id1, "reclaimers");
		setPileOwner(id2, "volt_collective");

		expect(getTotalFactionWealth("reclaimers")).toBe(3);
		expect(getTotalFactionWealth("volt_collective")).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// setDefenseRadius / removeDefense
// ---------------------------------------------------------------------------

describe("defense registration", () => {
	it("setDefenseRadius registers a defense that reduces attractiveness", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [20]);
		const pileBeforeDefense = getPile(id)!;
		const scoreBefore = calculatePileAttractiveness(pileBeforeDefense, "enemy", 10);

		setDefenseRadius("turret1", { x: 2, y: 0, z: 0 }, 10);

		const pileAfterDefense = getPile(id)!;
		const scoreAfter = calculatePileAttractiveness(pileAfterDefense, "enemy", 10);

		expect(scoreAfter).toBeLessThan(scoreBefore);
	});

	it("removeDefense restores attractiveness", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [20]);
		const pileBefore = getPile(id)!;
		const scoreBefore = calculatePileAttractiveness(pileBefore, "enemy", 10);

		setDefenseRadius("turret1", { x: 2, y: 0, z: 0 }, 10);
		removeDefense("turret1");

		const pileAfterRemove = getPile(id)!;
		const scoreAfterRemove = calculatePileAttractiveness(pileAfterRemove, "enemy", 10);

		expect(scoreAfterRemove).toBeCloseTo(scoreBefore, 5);
	});

	it("defense outside range does not affect attractiveness", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [20]);
		const pileBefore = getPile(id)!;
		const scoreBefore = calculatePileAttractiveness(pileBefore, "enemy", 10);

		setDefenseRadius("turret1", { x: 100, y: 0, z: 100 }, 5); // far away

		const pileAfter = getPile(id)!;
		const scoreAfter = calculatePileAttractiveness(pileAfter, "enemy", 10);

		expect(scoreAfter).toBeCloseTo(scoreBefore, 5);
	});
});

// ---------------------------------------------------------------------------
// setPileOwner / setPileExposed
// ---------------------------------------------------------------------------

describe("pile mutation helpers", () => {
	it("setPileOwner changes pile faction", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "volt_collective");
		expect(getPile(id)!.ownerFaction).toBe("volt_collective");
	});

	it("setPileOwner can set to null", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		setPileOwner(id, "reclaimers");
		setPileOwner(id, null);
		expect(getPile(id)!.ownerFaction).toBeNull();
	});

	it("setPileExposed changes exposure status", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		expect(getPile(id)!.isExposed).toBe(true);
		setPileExposed(id, false);
		expect(getPile(id)!.isExposed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all piles", () => {
		registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		registerCubePile({ x: 5, y: 0, z: 0 }, ["c2"], ["copper"], [2]);
		reset();

		expect(getPilesByFaction("reclaimers")).toEqual([]);
		expect(getTotalFactionWealth("reclaimers")).toBe(0);
	});

	it("clears all defenses", () => {
		const _id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [20]);
		setDefenseRadius("turret1", { x: 0, y: 0, z: 0 }, 20);
		reset();

		// Re-register pile — defense should be gone
		const id2 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [20]);
		const pile = getPile(id2)!;
		const score = calculatePileAttractiveness(pile, "enemy", 10);
		// Should be positive (no defense penalty)
		expect(score).toBeGreaterThan(0);
	});

	it("clears all walls", () => {
		addWall({ x: 10, y: 0, z: 0 }, { x: 1, z: 5 });
		reset();

		const _id = registerCubePile({ x: 20, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(1); // wall should be gone
	});

	it("resets pile ID counter", () => {
		registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		reset();

		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		expect(id).toContain("pile_");
		// After reset, the first pile should start with _1 suffix
		expect(id).toMatch(/_1$/);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("empty world returns no visible piles", () => {
		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			100,
			0,
		);
		expect(visible).toEqual([]);
	});

	it("pile with single cube works correctly", () => {
		const id = registerCubePile({ x: 1, y: 0, z: 1 }, ["c1"], ["copper"], [2]);
		const pile = getPile(id)!;

		expect(pile.cubeIds).toEqual(["c1"]);
		expect(pile.totalValue).toBe(2);
		expect(pile.height).toBe(1);
		expect(pile.materialBreakdown).toEqual({ copper: 1 });
	});

	it("multiple visible piles are all returned", () => {
		registerCubePile({ x: 5, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		registerCubePile({ x: 0, y: 0, z: 5 }, ["c2"], ["copper"], [2]);
		registerCubePile({ x: -3, y: 0, z: -4 }, ["c3"], ["iron"], [3]);

		const visible = getVisiblePiles(
			{ x: 0, y: 0, z: 0 },
			"player",
			50,
			100,
		);
		expect(visible).toHaveLength(3);
	});

	it("getPile returns undefined after removal", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		removeCubePile(id);
		expect(getPile(id)).toBeUndefined();
	});

	it("updating a removed pile does nothing", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [3]);
		removeCubePile(id);

		expect(() => {
			updateCubePile(id, ["c2"], ["copper"], [2]);
		}).not.toThrow();

		expect(getPile(id)).toBeUndefined();
	});

	it("faction wealth updates after pile value changes", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [10]);
		setPileOwner(id, "reclaimers");
		expect(getTotalFactionWealth("reclaimers")).toBe(10);

		updateCubePile(id, ["c1", "c2"], ["iron", "copper"], [10, 5]);
		expect(getTotalFactionWealth("reclaimers")).toBe(15);
	});

	it("faction wealth decreases when pile is removed", () => {
		const id1 = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["iron"], [10]);
		const id2 = registerCubePile({ x: 5, y: 0, z: 0 }, ["c2"], ["iron"], [20]);
		setPileOwner(id1, "reclaimers");
		setPileOwner(id2, "reclaimers");

		expect(getTotalFactionWealth("reclaimers")).toBe(30);

		removeCubePile(id1);
		expect(getTotalFactionWealth("reclaimers")).toBe(20);
	});

	it("zero-value piles have low attractiveness", () => {
		const id = registerCubePile({ x: 0, y: 0, z: 0 }, ["c1"], ["scrap"], [0]);
		const pile = getPile(id)!;
		const score = calculatePileAttractiveness(pile, "enemy", 10);
		// Value component is 0/50=0, but exposure and proximity still contribute
		expect(score).toBeLessThan(0.5);
	});
});
