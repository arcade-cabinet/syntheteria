import { describe, expect, it } from "vitest";
import {
	computeFormationOffsets,
	detectFormations,
	FORMATION_MIN_UNITS,
	FORMATION_RADIUS,
	type FormationUnit,
	getFormationTarget,
	isFormationLeader,
} from "../formationSteering";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
	entityId: number,
	x: number,
	z: number,
	attack = 2,
): FormationUnit {
	return { entityId, x, z, attack, factionId: "reclaimers" };
}

// ---------------------------------------------------------------------------
// detectFormations
// ---------------------------------------------------------------------------

describe("detectFormations", () => {
	it("returns empty when too few units", () => {
		const units = [makeUnit(1, 5, 5), makeUnit(2, 6, 5)];
		expect(detectFormations(units)).toHaveLength(0);
	});

	it("detects a single formation group with 3+ nearby units", () => {
		const units = [
			makeUnit(1, 5, 5, 3),
			makeUnit(2, 6, 5, 2),
			makeUnit(3, 5, 6, 1),
		];
		const groups = detectFormations(units);
		expect(groups).toHaveLength(1);
		expect(groups[0].leader.entityId).toBe(1); // Highest attack
		expect(groups[0].followers).toHaveLength(2);
	});

	it("leader is the unit with highest attack", () => {
		const units = [
			makeUnit(1, 5, 5, 1),
			makeUnit(2, 6, 5, 5), // Strongest
			makeUnit(3, 5, 6, 3),
		];
		const groups = detectFormations(units);
		expect(groups[0].leader.entityId).toBe(2);
	});

	it("does not group units beyond formation radius", () => {
		const units = [
			makeUnit(1, 0, 0),
			makeUnit(2, 1, 0),
			makeUnit(3, 2, 0),
			makeUnit(4, 20, 20), // Far away
		];
		const groups = detectFormations(units);
		expect(groups).toHaveLength(1);
		expect(groups[0].followers).toHaveLength(2); // Only 3 nearby, not 4
	});

	it("creates separate groups for distant clusters", () => {
		const units = [
			// Cluster A
			makeUnit(1, 0, 0, 3),
			makeUnit(2, 1, 0, 2),
			makeUnit(3, 0, 1, 1),
			// Cluster B (far away)
			makeUnit(4, 30, 30, 5),
			makeUnit(5, 31, 30, 4),
			makeUnit(6, 30, 31, 3),
		];
		const groups = detectFormations(units);
		expect(groups).toHaveLength(2);
	});

	it("requires exactly FORMATION_MIN_UNITS", () => {
		expect(FORMATION_MIN_UNITS).toBe(3);
	});

	it("respects FORMATION_RADIUS", () => {
		expect(FORMATION_RADIUS).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// computeFormationOffsets
// ---------------------------------------------------------------------------

describe("computeFormationOffsets", () => {
	it("produces correct number of offsets", () => {
		const offsets = computeFormationOffsets(5, 5, 10, 5, 4);
		expect(offsets).toHaveLength(4);
	});

	it("offsets are behind the leader (opposite to movement)", () => {
		// Leader at (5,5) moving right toward (10,5)
		const offsets = computeFormationOffsets(5, 5, 10, 5, 2);
		// Followers should be behind (lower X) and spread perpendicular
		for (const offset of offsets) {
			expect(offset.x).toBeLessThanOrEqual(5);
		}
	});

	it("offsets spread in V-shape perpendicular to movement", () => {
		const offsets = computeFormationOffsets(5, 5, 10, 5, 2);
		// Two followers at rank 1: one up (z-1), one down (z+1) behind leader
		expect(offsets[0].z).not.toBe(offsets[1].z); // Different perpendicular positions
	});

	it("handles zero movement direction", () => {
		const offsets = computeFormationOffsets(5, 5, 5, 5, 2);
		expect(offsets).toHaveLength(2);
		// Should not throw, uses default direction
	});
});

// ---------------------------------------------------------------------------
// getFormationTarget
// ---------------------------------------------------------------------------

describe("getFormationTarget", () => {
	it("returns null when unit is not in any formation", () => {
		const units = [
			makeUnit(1, 5, 5, 3),
			makeUnit(2, 6, 5, 2),
			makeUnit(3, 5, 6, 1),
		];
		const groups = detectFormations(units);
		const target = getFormationTarget(99, groups, 10, 5);
		expect(target).toBeNull();
	});

	it("returns target position for follower", () => {
		const units = [
			makeUnit(1, 5, 5, 3),
			makeUnit(2, 6, 5, 2),
			makeUnit(3, 5, 6, 1),
		];
		const groups = detectFormations(units);
		const target = getFormationTarget(2, groups, 10, 5);
		expect(target).not.toBeNull();
		expect(typeof target!.x).toBe("number");
		expect(typeof target!.z).toBe("number");
	});

	it("returns null for the leader unit", () => {
		const units = [
			makeUnit(1, 5, 5, 3),
			makeUnit(2, 6, 5, 2),
			makeUnit(3, 5, 6, 1),
		];
		const groups = detectFormations(units);
		// Leader (entity 1) is not in followers
		const target = getFormationTarget(1, groups, 10, 5);
		expect(target).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// isFormationLeader
// ---------------------------------------------------------------------------

describe("isFormationLeader", () => {
	it("returns true for the leader", () => {
		const units = [
			makeUnit(1, 5, 5, 5),
			makeUnit(2, 6, 5, 2),
			makeUnit(3, 5, 6, 1),
		];
		const groups = detectFormations(units);
		expect(isFormationLeader(1, groups)).toBe(true);
	});

	it("returns false for followers", () => {
		const units = [
			makeUnit(1, 5, 5, 5),
			makeUnit(2, 6, 5, 2),
			makeUnit(3, 5, 6, 1),
		];
		const groups = detectFormations(units);
		expect(isFormationLeader(2, groups)).toBe(false);
		expect(isFormationLeader(3, groups)).toBe(false);
	});

	it("returns false for unknown unit", () => {
		const groups = detectFormations([
			makeUnit(1, 5, 5, 5),
			makeUnit(2, 6, 5, 2),
			makeUnit(3, 5, 6, 1),
		]);
		expect(isFormationLeader(99, groups)).toBe(false);
	});
});
