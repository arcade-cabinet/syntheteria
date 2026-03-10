/**
 * Unit tests for tech tree progression and tech effects systems.
 *
 * Covers: research lifecycle, prerequisites, available-tech filtering,
 * tech effects application, bonus aggregation, and unlock gating.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	applyTechEffects,
	getEffectsForTech,
	getTechBonus,
	isUnlocked,
	resetTechEffects,
} from "../techEffects.ts";
import {
	cancelResearch,
	getAvailableTechs,
	getResearchedTechs,
	getResearchProgress,
	getTechTree,
	isResearched,
	resetTechTree,
	startResearch,
	updateResearch,
} from "../techTree.ts";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetTechTree();
	resetTechEffects();
});

// ---------------------------------------------------------------------------
// getTechTree
// ---------------------------------------------------------------------------

describe("getTechTree", () => {
	it("returns all tech nodes across all tiers", () => {
		const tree = getTechTree();
		expect(tree.length).toBeGreaterThan(0);
	});

	it("each node has required fields", () => {
		for (const node of getTechTree()) {
			expect(node.id).toBeTruthy();
			expect(node.name).toBeTruthy();
			expect(node.tier).toBeGreaterThanOrEqual(0);
			expect(node.cost).toBeDefined();
			expect(node.cost.cubes).toBeGreaterThanOrEqual(0);
			expect(node.cost.time).toBeGreaterThanOrEqual(1);
			expect(Array.isArray(node.unlocks)).toBe(true);
			expect(Array.isArray(node.prerequisites)).toBe(true);
		}
	});

	it("tier 0 nodes have zero cube cost", () => {
		const tier0 = getTechTree().filter((n) => n.tier === 0);
		expect(tier0.length).toBeGreaterThan(0);
		for (const node of tier0) {
			expect(node.cost.cubes).toBe(0);
		}
	});

	it("tier 0 nodes have no prerequisites", () => {
		const tier0 = getTechTree().filter((n) => n.tier === 0);
		for (const node of tier0) {
			expect(node.prerequisites).toEqual([]);
		}
	});

	it("higher tier nodes have prerequisites", () => {
		const higherTier = getTechTree().filter((n) => n.tier > 0);
		for (const node of higherTier) {
			expect(node.prerequisites.length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Auto-research of tier 0
// ---------------------------------------------------------------------------

describe("auto-research tier 0", () => {
	it("tier 0 techs are automatically researched for any faction", () => {
		const tier0 = getTechTree().filter((n) => n.tier === 0);
		for (const node of tier0) {
			expect(isResearched("reclaimers", node.id)).toBe(true);
			expect(isResearched("volt_collective", node.id)).toBe(true);
		}
	});

	it("tier 1+ techs are not auto-researched", () => {
		const tier1 = getTechTree().filter((n) => n.tier === 1);
		for (const node of tier1) {
			expect(isResearched("reclaimers", node.id)).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// startResearch
// ---------------------------------------------------------------------------

describe("startResearch", () => {
	it("starts research on a tech with met prerequisites", () => {
		const available = getAvailableTechs("reclaimers");
		expect(available.length).toBeGreaterThan(0);

		const techId = available[0].id;
		const result = startResearch("reclaimers", techId);
		expect(result).toBe(true);
	});

	it("returns false for an invalid tech id", () => {
		expect(startResearch("reclaimers", "tech_nonexistent")).toBe(false);
	});

	it("returns false for already researched tech", () => {
		const tier0 = getTechTree().find((n) => n.tier === 0);
		expect(tier0).toBeDefined();
		expect(startResearch("reclaimers", tier0!.id)).toBe(false);
	});

	it("returns false if another research is in progress", () => {
		const available = getAvailableTechs("reclaimers");
		startResearch("reclaimers", available[0].id);
		const result = startResearch("reclaimers", available[1].id);
		expect(result).toBe(false);
	});

	it("returns false if prerequisites are not met", () => {
		const tier2 = getTechTree().find((n) => n.tier === 2);
		if (tier2) {
			const result = startResearch("reclaimers", tier2.id);
			expect(result).toBe(false);
		}
	});
});

// ---------------------------------------------------------------------------
// updateResearch
// ---------------------------------------------------------------------------

describe("updateResearch", () => {
	it("returns null when no research is active", () => {
		expect(updateResearch("reclaimers", 1)).toBeNull();
	});

	it("advances progress without completing", () => {
		const available = getAvailableTechs("reclaimers");
		const tech = available[0];
		startResearch("reclaimers", tech.id);

		// Advance by 1 tick — should not complete
		const result = updateResearch("reclaimers", 1);
		expect(result).toBeNull();

		const progress = getResearchProgress("reclaimers");
		expect(progress).not.toBeNull();
		expect(progress!.progress).toBe(1);
	});

	it("returns completed tech id when research finishes", () => {
		const available = getAvailableTechs("reclaimers");
		const tech = available[0];
		startResearch("reclaimers", tech.id);

		const progress = getResearchProgress("reclaimers");
		expect(progress).not.toBeNull();

		// Advance by the full research time
		const result = updateResearch("reclaimers", progress!.totalTime);
		expect(result).toBe(tech.id);

		// Should now be researched
		expect(isResearched("reclaimers", tech.id)).toBe(true);

		// No more active research
		expect(getResearchProgress("reclaimers")).toBeNull();
	});

	it("completing research adds tech to researched set", () => {
		const available = getAvailableTechs("reclaimers");
		const tech = available[0];
		startResearch("reclaimers", tech.id);

		const progress = getResearchProgress("reclaimers");
		updateResearch("reclaimers", progress!.totalTime);

		const researched = getResearchedTechs("reclaimers");
		expect(researched).toContain(tech.id);
	});
});

// ---------------------------------------------------------------------------
// getResearchProgress
// ---------------------------------------------------------------------------

describe("getResearchProgress", () => {
	it("returns null when idle", () => {
		expect(getResearchProgress("reclaimers")).toBeNull();
	});

	it("returns current progress when researching", () => {
		const available = getAvailableTechs("reclaimers");
		startResearch("reclaimers", available[0].id);

		const progress = getResearchProgress("reclaimers");
		expect(progress).not.toBeNull();
		expect(progress!.techId).toBe(available[0].id);
		expect(progress!.progress).toBe(0);
		expect(progress!.totalTime).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// cancelResearch
// ---------------------------------------------------------------------------

describe("cancelResearch", () => {
	it("returns null when no research is active", () => {
		expect(cancelResearch("reclaimers")).toBeNull();
	});

	it("cancels and returns the tech id", () => {
		const available = getAvailableTechs("reclaimers");
		startResearch("reclaimers", available[0].id);

		const cancelled = cancelResearch("reclaimers");
		expect(cancelled).toBe(available[0].id);
		expect(getResearchProgress("reclaimers")).toBeNull();
	});

	it("does not mark cancelled tech as researched", () => {
		const available = getAvailableTechs("reclaimers");
		startResearch("reclaimers", available[0].id);
		cancelResearch("reclaimers");

		expect(isResearched("reclaimers", available[0].id)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getAvailableTechs
// ---------------------------------------------------------------------------

describe("getAvailableTechs", () => {
	it("returns tier-1 techs after tier-0 auto-research", () => {
		const available = getAvailableTechs("reclaimers");
		expect(available.length).toBeGreaterThan(0);

		// All returned techs should have tier > 0 (tier 0 already researched)
		for (const tech of available) {
			expect(tech.tier).toBeGreaterThan(0);
		}
	});

	it("does not include already researched techs", () => {
		const tier0ids = getTechTree()
			.filter((n) => n.tier === 0)
			.map((n) => n.id);
		const available = getAvailableTechs("reclaimers");

		for (const tech of available) {
			expect(tier0ids).not.toContain(tech.id);
		}
	});

	it("unlocks higher-tier techs after completing prerequisites", () => {
		// Complete all tier 1 techs
		const tier1 = getTechTree().filter((n) => n.tier === 1);
		for (const tech of tier1) {
			startResearch("reclaimers", tech.id);
			const progress = getResearchProgress("reclaimers");
			updateResearch("reclaimers", progress!.totalTime);
		}

		const available = getAvailableTechs("reclaimers");
		const tier2Available = available.filter((n) => n.tier === 2);
		expect(tier2Available.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Faction independence
// ---------------------------------------------------------------------------

describe("faction independence", () => {
	it("different factions have independent research states", () => {
		const available = getAvailableTechs("reclaimers");
		const techId = available[0].id;

		startResearch("reclaimers", techId);
		const progress = getResearchProgress("reclaimers");
		updateResearch("reclaimers", progress!.totalTime);

		expect(isResearched("reclaimers", techId)).toBe(true);
		expect(isResearched("volt_collective", techId)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Tech effects: applyTechEffects
// ---------------------------------------------------------------------------

describe("applyTechEffects", () => {
	it("computes unlocks from auto-researched tier-0 techs", () => {
		applyTechEffects("reclaimers");

		// Tier 0 includes lightning_rod
		expect(isUnlocked("reclaimers", "unlock_building:lightning_rod")).toBe(
			true,
		);
	});

	it("does not unlock higher-tier items without research", () => {
		applyTechEffects("reclaimers");

		expect(isUnlocked("reclaimers", "unlock_building:smelter")).toBe(false);
	});

	it("unlocks items after research completes", () => {
		// Research smelter (tier 1)
		const smelterTech = getTechTree().find((n) =>
			n.unlocks.includes("smelter"),
		);
		if (smelterTech) {
			startResearch("reclaimers", smelterTech.id);
			const progress = getResearchProgress("reclaimers");
			updateResearch("reclaimers", progress!.totalTime);
			applyTechEffects("reclaimers");

			expect(isUnlocked("reclaimers", "unlock_building:smelter")).toBe(true);
			expect(isUnlocked("reclaimers", "unlock_recipe:smelter")).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// Tech effects: getTechBonus
// ---------------------------------------------------------------------------

describe("getTechBonus", () => {
	it("returns 0 when no bonuses are active", () => {
		applyTechEffects("reclaimers");
		// Tier 0 techs don't grant numerical bonuses
		expect(getTechBonus("reclaimers", "bonus_harvest_speed")).toBe(0);
	});

	it("returns accumulated bonus after researching bonus-granting techs", () => {
		// Research fast_belt (grants bonus_harvest_speed: 0.15)
		const fastBeltTech = getTechTree().find((n) =>
			n.unlocks.includes("fast_belt"),
		);
		if (fastBeltTech) {
			startResearch("reclaimers", fastBeltTech.id);
			const progress = getResearchProgress("reclaimers");
			updateResearch("reclaimers", progress!.totalTime);
			applyTechEffects("reclaimers");

			expect(getTechBonus("reclaimers", "bonus_harvest_speed")).toBeCloseTo(
				0.15,
			);
		}
	});

	it("returns 0 for faction with no effects applied", () => {
		expect(getTechBonus("unknown_faction", "bonus_harvest_speed")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Tech effects: isUnlocked (convenience shorthand)
// ---------------------------------------------------------------------------

describe("isUnlocked shorthand", () => {
	it("checks by full key with colon notation", () => {
		applyTechEffects("reclaimers");
		expect(isUnlocked("reclaimers", "unlock_building:lightning_rod")).toBe(
			true,
		);
	});

	it("checks all unlock types when no colon is used", () => {
		applyTechEffects("reclaimers");
		// "lightning_rod" is in unlock_building:lightning_rod
		expect(isUnlocked("reclaimers", "lightning_rod")).toBe(true);
	});

	it("returns false for non-unlocked items", () => {
		applyTechEffects("reclaimers");
		expect(isUnlocked("reclaimers", "turret")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getEffectsForTech
// ---------------------------------------------------------------------------

describe("getEffectsForTech", () => {
	it("returns effects for a valid tech", () => {
		const lightningRodTech = getTechTree().find((n) =>
			n.unlocks.includes("lightning_rod"),
		);
		if (lightningRodTech) {
			const effects = getEffectsForTech(lightningRodTech.id);
			expect(effects.length).toBeGreaterThan(0);
			expect(effects.some((e) => e.type === "unlock_building")).toBe(true);
		}
	});

	it("returns empty array for unknown tech", () => {
		expect(getEffectsForTech("tech_nonexistent")).toEqual([]);
	});
});
