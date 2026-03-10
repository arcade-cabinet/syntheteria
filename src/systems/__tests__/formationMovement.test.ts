/**
 * Tests for the formation movement system.
 *
 * Tests cover:
 * - Formation creation (line, wedge, circle, column)
 * - Leader assignment and promotion
 * - Target position computation with rotation
 * - Bot removal from formations
 * - Formation disbanding
 * - Formation type changes
 * - Edge cases
 */

jest.mock("../../../config", () => ({
	config: {
		botMovement: {
			automation: {
				guardRange: 8,
				followDistance: 3,
				waypointReachThreshold: 2,
			},
		},
	},
}));

import {
	changeFormationType,
	createFormation,
	disbandFormation,
	getAllFormations,
	getFormationForBot,
	getFormationTarget,
	isFormationLeader,
	removeFromFormation,
	resetFormations,
	updateFormationTargets,
} from "../formationMovement";

beforeEach(() => {
	resetFormations();
});

// ---------------------------------------------------------------------------
// Formation creation
// ---------------------------------------------------------------------------

describe("formation creation", () => {
	it("creates a formation from bot IDs", () => {
		const id = createFormation(["bot_1", "bot_2", "bot_3"]);
		expect(id).not.toBeNull();
	});

	it("first bot is the leader", () => {
		createFormation(["bot_1", "bot_2", "bot_3"]);
		expect(isFormationLeader("bot_1")).toBe(true);
		expect(isFormationLeader("bot_2")).toBe(false);
	});

	it("returns null for empty bot list", () => {
		expect(createFormation([])).toBeNull();
	});

	it("assigns bots to the formation", () => {
		createFormation(["bot_1", "bot_2"]);
		expect(getFormationForBot("bot_1")).not.toBeNull();
		expect(getFormationForBot("bot_2")).not.toBeNull();
		expect(getFormationForBot("bot_3")).toBeNull();
	});

	it("removes bots from previous formation when creating new one", () => {
		createFormation(["bot_1", "bot_2", "bot_3"]);
		const id2 = createFormation(["bot_1", "bot_4"]);

		// bot_1 should be in new formation, not old
		const formation = getFormationForBot("bot_1");
		expect(formation!.id).toBe(id2);

		// Old formation lost bot_1 and should still have bot_2, bot_3
		// But since it went from 3 to 2, it should still exist
		const oldFormation = getFormationForBot("bot_2");
		expect(oldFormation).not.toBeNull();
	});

	it("creates single-bot formation", () => {
		const id = createFormation(["bot_1"]);
		expect(id).not.toBeNull();
		expect(getFormationForBot("bot_1")).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Formation types — offset shapes
// ---------------------------------------------------------------------------

describe("formation types", () => {
	it("line formation spreads bots horizontally", () => {
		const id = createFormation(["b1", "b2", "b3"], "line", 3);
		// Update with facing 0 (no rotation), leader at origin
		updateFormationTargets(id!, 0, 0, 0);

		const t1 = getFormationTarget("b1");
		const t2 = getFormationTarget("b2");
		const t3 = getFormationTarget("b3");

		// All targets should have same z (line perpendicular to facing)
		// With facing=0, line is along X axis
		expect(t1).not.toBeNull();
		expect(t2).not.toBeNull();
		expect(t3).not.toBeNull();

		// X positions should be spread out
		const xs = [t1!.x, t2!.x, t3!.x].sort((a, b) => a - b);
		expect(xs[2] - xs[0]).toBeCloseTo(6); // 3 units * 2 gaps = 6 total spread
	});

	it("column formation lines up bots behind leader", () => {
		const id = createFormation(["b1", "b2", "b3"], "column", 3);
		updateFormationTargets(id!, 0, 0, 0);

		const t1 = getFormationTarget("b1");
		const t2 = getFormationTarget("b2");
		const t3 = getFormationTarget("b3");

		// All should have x ≈ 0 (single file)
		expect(t1!.x).toBeCloseTo(0);
		expect(t2!.x).toBeCloseTo(0);
		expect(t3!.x).toBeCloseTo(0);

		// z should decrease (behind leader)
		expect(t1!.z).toBeGreaterThan(t2!.z);
		expect(t2!.z).toBeGreaterThan(t3!.z);
	});

	it("wedge formation fans out behind leader", () => {
		const id = createFormation(["b1", "b2", "b3", "b4", "b5"], "wedge", 3);
		updateFormationTargets(id!, 0, 0, 0);

		const leader = getFormationTarget("b1");
		const t2 = getFormationTarget("b2");
		const t3 = getFormationTarget("b3");

		// Leader at front
		expect(leader!.z).toBeGreaterThanOrEqual(t2!.z);
		expect(leader!.z).toBeGreaterThanOrEqual(t3!.z);
	});

	it("circle formation distributes evenly", () => {
		const id = createFormation(["b1", "b2", "b3", "b4"], "circle", 3);
		updateFormationTargets(id!, 0, 0, 0);

		const targets = ["b1", "b2", "b3", "b4"].map(
			(b) => getFormationTarget(b)!,
		);

		// All should be roughly the same distance from center
		const distances = targets.map((t) => Math.sqrt(t.x * t.x + t.z * t.z));
		const avgDist = distances.reduce((a, b) => a + b) / distances.length;

		for (const d of distances) {
			expect(d).toBeCloseTo(avgDist, 0);
		}
	});
});

// ---------------------------------------------------------------------------
// Target computation with rotation
// ---------------------------------------------------------------------------

describe("target computation", () => {
	it("rotates formation with facing angle", () => {
		const id = createFormation(["b1", "b2", "b3"], "column", 3);

		// Facing = PI/2 (90 degrees), leader at (10, 10)
		updateFormationTargets(id!, 10, 10, Math.PI / 2);

		const leader = getFormationTarget("b1");
		const follower = getFormationTarget("b2");

		// Column normally goes along -Z, but rotated 90° it should go along -X
		expect(leader!.x).toBeCloseTo(10);
		expect(leader!.z).toBeCloseTo(10);
		expect(follower!.x).toBeCloseTo(10 + 3); // offset rotated
	});

	it("positions relative to leader", () => {
		const id = createFormation(["b1", "b2"], "column", 5);
		updateFormationTargets(id!, 50, 50, 0);

		const leader = getFormationTarget("b1");
		expect(leader!.x).toBeCloseTo(50);
		expect(leader!.z).toBeCloseTo(50);
	});

	it("returns null for bot not in formation", () => {
		expect(getFormationTarget("nonexistent")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Bot removal
// ---------------------------------------------------------------------------

describe("bot removal", () => {
	it("removes bot from formation", () => {
		createFormation(["b1", "b2", "b3"]);
		removeFromFormation("b2");

		expect(getFormationForBot("b2")).toBeNull();
		expect(getFormationForBot("b1")).not.toBeNull();
		expect(getFormationForBot("b3")).not.toBeNull();
	});

	it("promotes next bot when leader is removed", () => {
		createFormation(["b1", "b2", "b3"]);
		removeFromFormation("b1");

		expect(isFormationLeader("b2")).toBe(true);
	});

	it("disbands formation when only one bot remains", () => {
		createFormation(["b1", "b2"]);
		removeFromFormation("b1");

		// With only b2 left, formation should be disbanded
		expect(getFormationForBot("b2")).toBeNull();
	});

	it("handles removing non-existent bot", () => {
		expect(() => removeFromFormation("nonexistent")).not.toThrow();
	});

	it("recalculates offsets after removal", () => {
		createFormation(["b1", "b2", "b3", "b4"], "line", 3);
		removeFromFormation("b2");

		// Should now have 3 bots with recalculated offsets
		const formation = getFormationForBot("b1")!;
		expect(formation.slots).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Formation disbanding
// ---------------------------------------------------------------------------

describe("formation disbanding", () => {
	it("disbands and frees all bots", () => {
		const id = createFormation(["b1", "b2", "b3"]);
		disbandFormation(id!);

		expect(getFormationForBot("b1")).toBeNull();
		expect(getFormationForBot("b2")).toBeNull();
		expect(getFormationForBot("b3")).toBeNull();
		expect(getAllFormations()).toHaveLength(0);
	});

	it("handles disbanding non-existent formation", () => {
		expect(() => disbandFormation("nonexistent")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Formation type changes
// ---------------------------------------------------------------------------

describe("formation type changes", () => {
	it("changes formation type and recalculates offsets", () => {
		const id = createFormation(["b1", "b2", "b3"], "line", 3);
		changeFormationType(id!, "column");

		const formation = getFormationForBot("b1")!;
		expect(formation.type).toBe("column");
	});

	it("handles changing non-existent formation", () => {
		expect(() => changeFormationType("nope", "wedge")).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getAllFormations
// ---------------------------------------------------------------------------

describe("getAllFormations", () => {
	it("returns all active formations", () => {
		createFormation(["b1", "b2"]);
		createFormation(["b3", "b4"]);

		expect(getAllFormations()).toHaveLength(2);
	});

	it("returns empty when no formations", () => {
		expect(getAllFormations()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetFormations", () => {
	it("clears all state", () => {
		createFormation(["b1", "b2", "b3"]);
		createFormation(["b4", "b5"]);

		resetFormations();

		expect(getAllFormations()).toHaveLength(0);
		expect(getFormationForBot("b1")).toBeNull();
	});
});
