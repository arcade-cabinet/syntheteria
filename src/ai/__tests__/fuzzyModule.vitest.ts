import { describe, expect, it } from "vitest";
import { assessSituationFuzzy } from "../fuzzy/situationModule";

describe("fuzzy situation assessment", () => {
	it("close threat + low resources → high attack, high harvest", () => {
		const scores = assessSituationFuzzy(10, 2, 30);
		expect(scores.attackDesirability).toBeGreaterThan(50);
		expect(scores.harvestDesirability).toBeGreaterThan(50);
	});

	it("far threat + high resources → low attack, low harvest", () => {
		const scores = assessSituationFuzzy(90, 25, 50);
		expect(scores.attackDesirability).toBeLessThan(50);
		expect(scores.harvestDesirability).toBeLessThan(50);
	});

	it("small territory → high expand desirability", () => {
		const scores = assessSituationFuzzy(50, 15, 5);
		expect(scores.expandDesirability).toBeGreaterThan(50);
	});

	it("large territory → low expand desirability", () => {
		const scores = assessSituationFuzzy(50, 15, 70);
		expect(scores.expandDesirability).toBeLessThan(50);
	});

	it("medium everything → moderate scores", () => {
		const scores = assessSituationFuzzy(50, 10, 30);
		// All scores should be in the moderate range
		expect(scores.attackDesirability).toBeGreaterThan(20);
		expect(scores.attackDesirability).toBeLessThan(80);
		expect(scores.harvestDesirability).toBeGreaterThan(20);
		expect(scores.harvestDesirability).toBeLessThan(80);
	});

	it("clamps inputs to valid ranges", () => {
		// Should not throw with out-of-range inputs
		expect(() => assessSituationFuzzy(-10, -5, -20)).not.toThrow();
		expect(() => assessSituationFuzzy(200, 50, 150)).not.toThrow();
	});

	it("returns numbers (not NaN)", () => {
		const scores = assessSituationFuzzy(50, 10, 30);
		expect(Number.isNaN(scores.attackDesirability)).toBe(false);
		expect(Number.isNaN(scores.harvestDesirability)).toBe(false);
		expect(Number.isNaN(scores.expandDesirability)).toBe(false);
	});

	it("close threat raises attack more than far threat", () => {
		const close = assessSituationFuzzy(50, 2, 30);
		const far = assessSituationFuzzy(50, 25, 30);
		expect(close.attackDesirability).toBeGreaterThan(far.attackDesirability);
	});

	it("low resources raises harvest more than high resources", () => {
		const low = assessSituationFuzzy(10, 10, 30);
		const high = assessSituationFuzzy(90, 10, 30);
		expect(low.harvestDesirability).toBeGreaterThan(high.harvestDesirability);
	});
});
