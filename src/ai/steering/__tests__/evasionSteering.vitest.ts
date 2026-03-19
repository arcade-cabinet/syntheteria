import { describe, expect, it } from "vitest";
import {
	computeEvadeDesirability,
	computeFleeDirection,
	countAlliesInRadius,
	countThreatsInRadius,
} from "../evasionSteering";

describe("countThreatsInRadius", () => {
	const threats = [
		{ x: 5, z: 5 },
		{ x: 8, z: 5 },
		{ x: 20, z: 20 },
	];

	it("counts threats within radius", () => {
		expect(countThreatsInRadius(5, 5, threats, 4)).toBe(2);
	});

	it("excludes threats outside radius", () => {
		expect(countThreatsInRadius(5, 5, threats, 2)).toBe(1);
	});

	it("returns 0 when no threats in range", () => {
		expect(countThreatsInRadius(0, 0, threats, 2)).toBe(0);
	});
});

describe("countAlliesInRadius", () => {
	const allies = [
		{ x: 5, z: 5 },
		{ x: 6, z: 5 },
		{ x: 20, z: 20 },
	];

	it("counts allies within radius, excluding self position", () => {
		// Standing at (5,5) — the ally AT (5,5) is excluded (self)
		expect(countAlliesInRadius(5, 5, allies, 4)).toBe(1);
	});

	it("includes all non-self allies within radius", () => {
		expect(countAlliesInRadius(4, 5, allies, 4)).toBe(2);
	});
});

describe("computeFleeDirection", () => {
	it("returns zero when no threats in range", () => {
		const dir = computeFleeDirection(5, 5, [{ x: 20, z: 20 }], 4);
		expect(dir.dx).toBe(0);
		expect(dir.dz).toBe(0);
	});

	it("flees away from single threat", () => {
		// Threat at (6, 5), unit at (5, 5) → flee left (negative dx)
		const dir = computeFleeDirection(5, 5, [{ x: 6, z: 5 }], 4);
		expect(dir.dx).toBeLessThan(0);
		expect(Math.abs(dir.dz)).toBeLessThan(0.01);
	});

	it("flees away from threat below", () => {
		// Threat at (5, 7), unit at (5, 5) → flee up (negative dz)
		const dir = computeFleeDirection(5, 5, [{ x: 5, z: 7 }], 4);
		expect(dir.dz).toBeLessThan(0);
	});

	it("averages flee direction from multiple threats", () => {
		// Threats to the right and below → flee upper-left
		const dir = computeFleeDirection(
			5,
			5,
			[
				{ x: 7, z: 5 },
				{ x: 5, z: 7 },
			],
			4,
		);
		expect(dir.dx).toBeLessThan(0);
		expect(dir.dz).toBeLessThan(0);
	});

	it("produces normalized result", () => {
		const dir = computeFleeDirection(5, 5, [{ x: 6, z: 6 }], 4);
		const len = Math.sqrt(dir.dx * dir.dx + dir.dz * dir.dz);
		expect(len).toBeCloseTo(1, 1);
	});
});

describe("computeEvadeDesirability", () => {
	it("returns 0 when no cult threats", () => {
		const d = computeEvadeDesirability(5, 5, 10, 10, 4, [], []);
		expect(d).toBe(0);
	});

	it("returns 0 when threats are out of range", () => {
		const d = computeEvadeDesirability(
			5,
			5,
			10,
			10,
			4,
			[{ x: 20, z: 20 }],
			[],
		);
		expect(d).toBe(0);
	});

	it("returns high desirability when outnumbered 3:1", () => {
		const threats = [
			{ x: 4, z: 5 },
			{ x: 6, z: 5 },
			{ x: 5, z: 4 },
		];
		const d = computeEvadeDesirability(5, 5, 10, 10, 4, threats, []);
		expect(d).toBeGreaterThanOrEqual(0.8);
	});

	it("returns low desirability when not outnumbered", () => {
		const threats = [{ x: 6, z: 5 }]; // 1 threat
		const allies = [
			{ x: 4, z: 5 },
			{ x: 5, z: 4 },
		]; // 2 allies + self = 3
		const d = computeEvadeDesirability(5, 5, 10, 10, 4, threats, allies);
		expect(d).toBe(0); // Ratio = 1/3 < 1
	});

	it("low HP increases flee desire", () => {
		const threats = [
			{ x: 6, z: 5 },
			{ x: 4, z: 5 },
		]; // 2:1
		const dHighHp = computeEvadeDesirability(5, 5, 10, 10, 4, threats, []);
		const dLowHp = computeEvadeDesirability(5, 5, 2, 10, 4, threats, []);
		expect(dLowHp).toBeGreaterThan(dHighHp);
	});

	it("allies reduce flee desire", () => {
		const threats = [
			{ x: 6, z: 5 },
			{ x: 4, z: 5 },
		]; // 2 threats
		const noAllies = computeEvadeDesirability(5, 5, 10, 10, 4, threats, []);
		const withAllies = computeEvadeDesirability(
			5,
			5,
			10,
			10,
			4,
			threats,
			[{ x: 5, z: 4 }], // 1 ally
		);
		expect(withAllies).toBeLessThan(noAllies);
	});
});
