/**
 * Tests for cult mech definitions and escalation tier logic.
 */

import { describe, expect, it } from "vitest";
import {
	CULT_ASSAULT,
	CULT_BRUTE,
	CULT_MECH_DEFS,
	CULT_WANDERER,
	ESCALATION_TIERS,
	getEscalationTier,
	pickCultMechType,
	pickGroupSize,
} from "../cultDefs";

describe("cultDefs", () => {
	describe("mech archetypes", () => {
		it("defines 3 cult mech types", () => {
			expect(Object.keys(CULT_MECH_DEFS)).toHaveLength(3);
			expect(CULT_MECH_DEFS.wanderer).toBe(CULT_WANDERER);
			expect(CULT_MECH_DEFS.brute).toBe(CULT_BRUTE);
			expect(CULT_MECH_DEFS.assault).toBe(CULT_ASSAULT);
		});

		it("wanderer has 3 components (no arms)", () => {
			expect(CULT_WANDERER.components).toHaveLength(3);
			expect(
				CULT_WANDERER.components.find((c) => c.name === "arms"),
			).toBeUndefined();
		});

		it("brute has 6 components (extra arms + power_cell)", () => {
			expect(CULT_BRUTE.components).toHaveLength(6);
			const arms = CULT_BRUTE.components.filter((c) => c.name === "arms");
			expect(arms).toHaveLength(2);
		});

		it("assault has longer attack range than wanderer", () => {
			expect(CULT_ASSAULT.attackRange).toBeGreaterThan(
				CULT_WANDERER.attackRange,
			);
		});

		it("assault is faster than brute", () => {
			expect(CULT_ASSAULT.speed).toBeGreaterThan(CULT_BRUTE.speed);
		});

		it("all components start functional", () => {
			for (const def of Object.values(CULT_MECH_DEFS)) {
				for (const comp of def.components) {
					expect(comp.functional).toBe(true);
				}
			}
		});
	});

	describe("getEscalationTier", () => {
		it("returns tier 1 at game start", () => {
			const tier = getEscalationTier(0);
			expect(tier.level).toBe(1);
		});

		it("returns tier 1 at 9 minutes", () => {
			const tier = getEscalationTier(9 * 60);
			expect(tier.level).toBe(1);
		});

		it("returns tier 2 at 10 minutes", () => {
			const tier = getEscalationTier(10 * 60);
			expect(tier.level).toBe(2);
		});

		it("returns tier 2 at 24 minutes", () => {
			const tier = getEscalationTier(24 * 60);
			expect(tier.level).toBe(2);
		});

		it("returns tier 3 at 25 minutes", () => {
			const tier = getEscalationTier(25 * 60);
			expect(tier.level).toBe(3);
		});

		it("tier 1 only has wanderers", () => {
			const tier = getEscalationTier(0);
			expect(tier.availableTypes).toEqual(["wanderer"]);
		});

		it("tier 2 has wanderers and brutes", () => {
			const tier = getEscalationTier(600);
			expect(tier.availableTypes).toContain("wanderer");
			expect(tier.availableTypes).toContain("brute");
		});

		it("tier 3 has all three types", () => {
			const tier = getEscalationTier(1500);
			expect(tier.availableTypes).toContain("wanderer");
			expect(tier.availableTypes).toContain("brute");
			expect(tier.availableTypes).toContain("assault");
		});

		it("max enemies increases with tier", () => {
			const t1 = getEscalationTier(0);
			const t2 = getEscalationTier(600);
			const t3 = getEscalationTier(1500);
			expect(t2.maxEnemies).toBeGreaterThan(t1.maxEnemies);
			expect(t3.maxEnemies).toBeGreaterThan(t2.maxEnemies);
		});

		it("spawn interval decreases with tier", () => {
			const t1 = getEscalationTier(0);
			const t2 = getEscalationTier(600);
			const t3 = getEscalationTier(1500);
			expect(t2.spawnIntervalSec).toBeLessThan(t1.spawnIntervalSec);
			expect(t3.spawnIntervalSec).toBeLessThan(t2.spawnIntervalSec);
		});
	});

	describe("pickCultMechType", () => {
		it("returns a type from the tier's available list", () => {
			const tier = getEscalationTier(0);
			for (let i = 0; i < 20; i++) {
				const mechType = pickCultMechType(tier);
				expect(tier.availableTypes).toContain(mechType);
			}
		});
	});

	describe("pickGroupSize", () => {
		it("tier 1 always spawns solo", () => {
			const tier = getEscalationTier(0);
			for (let i = 0; i < 20; i++) {
				expect(pickGroupSize(tier)).toBe(1);
			}
		});

		it("tier 2 spawns groups of 2-3", () => {
			const tier = getEscalationTier(600);
			for (let i = 0; i < 50; i++) {
				const size = pickGroupSize(tier);
				expect(size).toBeGreaterThanOrEqual(2);
				expect(size).toBeLessThanOrEqual(3);
			}
		});

		it("tier 3 spawns groups of 3-5", () => {
			const tier = getEscalationTier(1500);
			for (let i = 0; i < 50; i++) {
				const size = pickGroupSize(tier);
				expect(size).toBeGreaterThanOrEqual(3);
				expect(size).toBeLessThanOrEqual(5);
			}
		});
	});

	describe("escalation tiers structure", () => {
		it("has 3 tiers", () => {
			expect(ESCALATION_TIERS).toHaveLength(3);
		});

		it("tiers are ordered by time threshold", () => {
			for (let i = 1; i < ESCALATION_TIERS.length; i++) {
				expect(ESCALATION_TIERS[i].timeThresholdSec).toBeGreaterThan(
					ESCALATION_TIERS[i - 1].timeThresholdSec,
				);
			}
		});

		it("tiers are ordered by level", () => {
			for (let i = 1; i < ESCALATION_TIERS.length; i++) {
				expect(ESCALATION_TIERS[i].level).toBeGreaterThan(
					ESCALATION_TIERS[i - 1].level,
				);
			}
		});

		it("group size ranges are valid", () => {
			for (const tier of ESCALATION_TIERS) {
				const [min, max] = tier.groupSize;
				expect(min).toBeGreaterThanOrEqual(1);
				expect(max).toBeGreaterThanOrEqual(min);
			}
		});
	});
});
