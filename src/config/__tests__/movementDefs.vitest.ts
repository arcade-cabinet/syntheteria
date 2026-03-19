import { describe, expect, it } from "vitest";
import {
	canUnitAct,
	canUnitMove,
	computeMaxMp,
	MOVEMENT_PROFILES,
	maxMoveDistance,
} from "../movementDefs";

describe("MOVEMENT_PROFILES", () => {
	it("scout has 2 moves × 3 cells", () => {
		const p = MOVEMENT_PROFILES.scout;
		expect(p.movesPerTurn).toBe(2);
		expect(p.cellsPerMove).toBe(3);
	});

	it("ranged has 1 move × 1 cell", () => {
		const p = MOVEMENT_PROFILES.ranged;
		expect(p.movesPerTurn).toBe(1);
		expect(p.cellsPerMove).toBe(1);
	});

	it("all 9 robot classes are defined", () => {
		const classes = Object.keys(MOVEMENT_PROFILES);
		expect(classes).toHaveLength(9);
		expect(classes).toContain("scout");
		expect(classes).toContain("infantry");
		expect(classes).toContain("cavalry");
		expect(classes).toContain("ranged");
		expect(classes).toContain("support");
		expect(classes).toContain("worker");
		expect(classes).toContain("cult_infantry");
		expect(classes).toContain("cult_ranged");
		expect(classes).toContain("cult_cavalry");
	});

	it("profiles have no requiresStaging field (staging is per-action)", () => {
		for (const profile of Object.values(MOVEMENT_PROFILES)) {
			expect("requiresStaging" in profile).toBe(false);
		}
	});
});

describe("computeMaxMp", () => {
	it("scout = 2 × 3 = 6", () => {
		expect(computeMaxMp("scout")).toBe(6);
	});

	it("infantry = 1 × 2 = 2", () => {
		expect(computeMaxMp("infantry")).toBe(2);
	});

	it("ranged = 1 × 1 = 1", () => {
		expect(computeMaxMp("ranged")).toBe(1);
	});

	it("cavalry = 2 × 2 = 4", () => {
		expect(computeMaxMp("cavalry")).toBe(4);
	});
});

describe("canUnitMove", () => {
	const base = {
		mp: 3,
		movesPerTurn: 2,
		cellsPerMove: 3,
		movesUsed: 0,
		staged: false,
	};

	it("returns true when unit has moves and MP remaining", () => {
		expect(canUnitMove(base)).toBe(true);
	});

	it("returns false when all move commands used", () => {
		expect(canUnitMove({ ...base, movesUsed: 2 })).toBe(false);
	});

	it("returns false when MP is 0", () => {
		expect(canUnitMove({ ...base, mp: 0 })).toBe(false);
	});

	it("returns false when unit is staged", () => {
		expect(canUnitMove({ ...base, staged: true })).toBe(false);
	});

	it("returns true with 1 move used out of 2", () => {
		expect(canUnitMove({ ...base, movesUsed: 1 })).toBe(true);
	});
});

describe("canUnitAct", () => {
	const base = {
		mp: 3,
		movesPerTurn: 1,
		cellsPerMove: 2,
		movesUsed: 0,
		staged: false,
	};

	it("non-staging action can always execute", () => {
		expect(canUnitAct(base, false)).toBe(true);
	});

	it("staging action cannot execute until unit is staged", () => {
		expect(canUnitAct(base, true)).toBe(false);
	});

	it("staging action can execute once unit is staged", () => {
		expect(canUnitAct({ ...base, staged: true }, true)).toBe(true);
	});

	it("non-staging action works even when staged", () => {
		expect(canUnitAct({ ...base, staged: true }, false)).toBe(true);
	});
});

describe("maxMoveDistance", () => {
	it("returns cellsPerMove when MP is sufficient", () => {
		expect(
			maxMoveDistance({
				mp: 6,
				movesPerTurn: 2,
				cellsPerMove: 3,
				movesUsed: 0,
				staged: false,
			}),
		).toBe(3);
	});

	it("clamps to remaining MP", () => {
		expect(
			maxMoveDistance({
				mp: 1,
				movesPerTurn: 2,
				cellsPerMove: 3,
				movesUsed: 1,
				staged: false,
			}),
		).toBe(1);
	});

	it("returns 0 when MP is 0", () => {
		expect(
			maxMoveDistance({
				mp: 0,
				movesPerTurn: 1,
				cellsPerMove: 2,
				movesUsed: 0,
				staged: false,
			}),
		).toBe(0);
	});
});
