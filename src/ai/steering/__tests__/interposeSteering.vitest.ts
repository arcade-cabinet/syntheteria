import { describe, expect, it } from "vitest";
import {
	computeInterposeDesirability,
	computeInterposePoint,
	findInterposeTarget,
	pickInterposeTile,
} from "../interposeSteering";

describe("computeInterposePoint", () => {
	it("returns midpoint between ally and threat", () => {
		const mid = computeInterposePoint({ x: 2, z: 2 }, { x: 6, z: 6 });
		expect(mid.x).toBe(4);
		expect(mid.z).toBe(4);
	});

	it("rounds to integer coordinates", () => {
		const mid = computeInterposePoint({ x: 1, z: 1 }, { x: 4, z: 4 });
		expect(mid.x).toBe(3); // 2.5 → 3
		expect(mid.z).toBe(3);
	});

	it("handles same position", () => {
		const mid = computeInterposePoint({ x: 5, z: 5 }, { x: 5, z: 5 });
		expect(mid.x).toBe(5);
		expect(mid.z).toBe(5);
	});
});

describe("findInterposeTarget", () => {
	const allies = [
		{ entityId: 10, x: 5, z: 5, hp: 3, factionId: "reclaimers" },
		{ entityId: 11, x: 10, z: 10, hp: 8, factionId: "reclaimers" },
	];
	const enemies = [
		{ entityId: 20, x: 7, z: 5, hp: 10, factionId: "iron_creed" },
	];

	it("returns null with no allies", () => {
		const result = findInterposeTarget(5, 5, 10, [], enemies);
		expect(result).toBeNull();
	});

	it("returns null with no enemies", () => {
		const result = findInterposeTarget(5, 5, 10, allies, []);
		expect(result).toBeNull();
	});

	it("finds the most threatened ally", () => {
		const result = findInterposeTarget(4, 5, 10, allies, enemies);
		expect(result).not.toBeNull();
		// Ally at (5,5) with hp=3 and enemy at (7,5) dist=2 is most threatened
		expect(result!.ally.entityId).toBe(10);
		expect(result!.threat.entityId).toBe(20);
	});

	it("respects scan range", () => {
		// Support unit at (0,0) with scanRange=3 — ally at (5,5) is out of range
		const result = findInterposeTarget(0, 0, 3, allies, enemies);
		expect(result).toBeNull();
	});

	it("skips self (same position)", () => {
		const selfAllies = [
			{ entityId: 1, x: 5, z: 5, hp: 10, factionId: "reclaimers" }, // same position as support
			{ entityId: 10, x: 7, z: 5, hp: 3, factionId: "reclaimers" },
		];
		const result = findInterposeTarget(5, 5, 10, selfAllies, enemies);
		// Should not pick the ally at (5,5) since that's the support unit's own position
		expect(result).not.toBeNull();
		expect(result!.ally.entityId).toBe(10);
	});
});

describe("pickInterposeTile", () => {
	const candidates = [
		{ x: 4, z: 5 },
		{ x: 6, z: 5 },
		{ x: 5, z: 4 },
		{ x: 5, z: 6 },
	];

	it("returns null for empty candidates", () => {
		const result = pickInterposeTile(
			{ x: 3, z: 5 },
			{ x: 5, z: 5 },
			{ x: 9, z: 5 },
			[],
		);
		expect(result).toBeNull();
	});

	it("picks tile toward midpoint between ally and threat", () => {
		// Ally at (8,5), threat at (2,5) → midpoint is (5,5)
		// Support at (3,5) should move right toward (5,5)
		const result = pickInterposeTile(
			{ x: 3, z: 5 },
			{ x: 8, z: 5 },
			{ x: 2, z: 5 },
			[
				{ x: 2, z: 5 }, // toward threat
				{ x: 4, z: 5 }, // toward midpoint
				{ x: 3, z: 4 },
				{ x: 3, z: 6 },
			],
		);
		expect(result).toEqual({ x: 4, z: 5 });
	});

	it("returns valid candidate", () => {
		const result = pickInterposeTile(
			{ x: 5, z: 5 },
			{ x: 3, z: 3 },
			{ x: 7, z: 7 },
			candidates,
		);
		expect(result).not.toBeNull();
		expect(candidates).toContainEqual(result);
	});
});

describe("computeInterposeDesirability", () => {
	it("returns 0 when no allies or enemies", () => {
		expect(computeInterposeDesirability(5, 5, 10, [], [])).toBe(0);
	});

	it("returns high desirability when ally under immediate threat", () => {
		const allies = [{ entityId: 10, x: 5, z: 5, hp: 3, factionId: "r" }];
		const enemies = [{ entityId: 20, x: 6, z: 5, hp: 10, factionId: "e" }];
		const score = computeInterposeDesirability(3, 5, 10, allies, enemies);
		expect(score).toBeGreaterThanOrEqual(0.9);
	});

	it("returns moderate desirability when ally has nearby threat", () => {
		const allies = [{ entityId: 10, x: 5, z: 5, hp: 8, factionId: "r" }];
		const enemies = [{ entityId: 20, x: 8, z: 5, hp: 10, factionId: "e" }];
		const score = computeInterposeDesirability(3, 5, 10, allies, enemies);
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThan(0.9);
	});
});
