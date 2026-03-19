/**
 * Chronometry unit tests.
 *
 * Verifies the turn → dayAngle/season math that drives the orbital illuminator
 * and seasonal sky progression.
 */

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
	computeSunColor,
	computeSunDir,
	TURNS_PER_DAY,
	TURNS_PER_YEAR,
	turnToChronometry,
} from "../chronometry";

describe("turnToChronometry", () => {
	it("turn 1 → dayAngle=0, season=0", () => {
		const { dayAngle, season } = turnToChronometry(1);
		expect(dayAngle).toBeCloseTo(0);
		expect(season).toBeCloseTo(0);
	});

	it(`turn ${TURNS_PER_DAY + 1} → dayAngle≈0 (full orbit completed)`, () => {
		const { dayAngle } = turnToChronometry(TURNS_PER_DAY + 1);
		expect(dayAngle).toBeCloseTo(0, 5);
	});

	it(`turn ${TURNS_PER_DAY / 2 + 1} → dayAngle≈π (half orbit)`, () => {
		const { dayAngle } = turnToChronometry(TURNS_PER_DAY / 2 + 1);
		expect(dayAngle).toBeCloseTo(Math.PI, 5);
	});

	it(`turn ${TURNS_PER_YEAR + 1} → season≈0 (full year completed)`, () => {
		const { season } = turnToChronometry(TURNS_PER_YEAR + 1);
		expect(season).toBeCloseTo(0);
	});

	it("season increases monotonically over one year", () => {
		const seasons = Array.from(
			{ length: TURNS_PER_YEAR },
			(_, i) => turnToChronometry(i + 1).season,
		);
		for (let i = 1; i < seasons.length; i++) {
			expect(seasons[i]).toBeGreaterThan(seasons[i - 1]);
		}
	});
});

describe("computeSunDir", () => {
	it("returns a normalised THREE.Vector3", () => {
		const dir = computeSunDir(0, 0);
		expect(dir).toBeInstanceOf(THREE.Vector3);
		expect(dir.length()).toBeCloseTo(1, 5);
	});

	it("sun is always above horizon (Y > 0) for all seasons", () => {
		for (let s = 0; s < 1; s += 0.1) {
			const dir = computeSunDir(0, s);
			expect(dir.y).toBeGreaterThan(0);
		}
	});

	it("sun elevation peaks near summer (season≈0.25)", () => {
		const summer = computeSunDir(0, 0.25).y;
		const winter = computeSunDir(0, 0.75).y;
		expect(summer).toBeGreaterThan(winter);
	});

	it("dayAngle rotates the sun azimuth — Z changes sign over half orbit", () => {
		// cos(0)=1, cos(π)=-1 — unambiguous Z flip
		const east = computeSunDir(0, 0);
		const west = computeSunDir(Math.PI, 0);
		expect(west.z).not.toBeCloseTo(east.z, 1);
		// X at quarter turn (sin(π/2)=1) is clearly non-zero
		const quarter = computeSunDir(Math.PI / 2, 0);
		expect(quarter.x).toBeGreaterThan(0.1);
	});
});

describe("computeSunColor", () => {
	it("returns a THREE.Color", () => {
		expect(computeSunColor(0)).toBeInstanceOf(THREE.Color);
	});

	it("always has blue channel at full 1.0 (cold orbital illuminator)", () => {
		for (let s = 0; s < 1; s += 0.25) {
			const color = computeSunColor(s);
			expect(color.b).toBeCloseTo(1.0, 5);
		}
	});

	it("summer (season=0.25) has more red than winter (season=0.75)", () => {
		const summer = computeSunColor(0.25);
		const winter = computeSunColor(0.75);
		expect(summer.r).toBeGreaterThan(winter.r);
	});
});
