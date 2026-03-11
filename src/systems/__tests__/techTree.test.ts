/**
 * Unit tests for tech tree progression and tech effects systems.
 *
 * The techTree module now delegates state to techResearch.ts (canonical).
 * These tests validate the adapter layer and integration with techEffects.
 *
 * Covers: research lifecycle, prerequisites, available-tech filtering,
 * tech effects application, bonus aggregation, and unlock gating.
 */

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
} from "../techTree.ts";
import { techResearchSystem } from "../techResearch";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLENTY = 999999;

function researchAndComplete(factionId: string, techId: string): void {
	const started = startResearch(factionId, techId);
	if (started) {
		techResearchSystem({ [factionId]: PLENTY });
	}
}

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
			expect(node.tier).toBeGreaterThanOrEqual(1);
			expect(node.cost).toBeDefined();
			expect(node.cost.cubes).toBeGreaterThan(0);
			expect(node.cost.time).toBeGreaterThanOrEqual(1);
			expect(Array.isArray(node.unlocks)).toBe(true);
			expect(Array.isArray(node.prerequisites)).toBe(true);
		}
	});

	it("tier 1 techs with no prerequisites exist", () => {
		const tier1NoPrereqs = getTechTree().filter(
			(n) => n.tier === 1 && n.prerequisites.length === 0,
		);
		expect(tier1NoPrereqs.length).toBeGreaterThan(0);
	});

	it("higher tier nodes have prerequisites", () => {
		const higherTier = getTechTree().filter((n) => n.tier > 1);
		for (const node of higherTier) {
			expect(node.prerequisites.length).toBeGreaterThan(0);
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
		const available = getAvailableTechs("reclaimers");
		const techId = available[0].id;
		researchAndComplete("reclaimers", techId);
		expect(startResearch("reclaimers", techId)).toBe(false);
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
// techResearchSystem (replaces updateResearch)
// ---------------------------------------------------------------------------

describe("techResearchSystem via techTree adapter", () => {
	it("returns empty when no research is active", () => {
		const completed = techResearchSystem({ reclaimers: 1 });
		expect(completed).toEqual([]);
	});

	it("advances progress without completing", () => {
		const available = getAvailableTechs("reclaimers");
		const tech = available[0];
		startResearch("reclaimers", tech.id);

		techResearchSystem({ reclaimers: 1 });

		const progress = getResearchProgress("reclaimers");
		expect(progress).not.toBeNull();
		// Progress is 1 * faction bonus (reclaimers = 0.8)
		expect(progress!.progress).toBeCloseTo(0.8);
	});

	it("returns completed tech when research finishes", () => {
		const available = getAvailableTechs("reclaimers");
		const tech = available[0];
		startResearch("reclaimers", tech.id);

		const completed = techResearchSystem({ reclaimers: PLENTY });
		expect(completed.length).toBe(1);
		expect(completed[0].techId).toBe(tech.id);

		expect(isResearched("reclaimers", tech.id)).toBe(true);
		expect(getResearchProgress("reclaimers")).toBeNull();
	});

	it("completing research adds tech to researched set", () => {
		const available = getAvailableTechs("reclaimers");
		const tech = available[0];
		researchAndComplete("reclaimers", tech.id);

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
	it("returns tier-1 techs with no prerequisites initially", () => {
		const available = getAvailableTechs("reclaimers");
		expect(available.length).toBeGreaterThan(0);

		// All initially available techs should have tier 1 and no prerequisites
		for (const tech of available) {
			expect(tech.prerequisites).toEqual([]);
		}
	});

	it("does not include already researched techs", () => {
		const available = getAvailableTechs("reclaimers");
		const first = available[0];
		researchAndComplete("reclaimers", first.id);

		const afterResearch = getAvailableTechs("reclaimers");
		expect(afterResearch.map((t) => t.id)).not.toContain(first.id);
	});

	it("unlocks higher-tier techs after completing prerequisites", () => {
		// Complete all tier 1 techs
		const tier1 = getTechTree().filter((n) => n.tier === 1);
		for (const tech of tier1) {
			researchAndComplete("reclaimers", tech.id);
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

		researchAndComplete("reclaimers", techId);

		expect(isResearched("reclaimers", techId)).toBe(true);
		expect(isResearched("volt_collective", techId)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Tech effects: applyTechEffects
// ---------------------------------------------------------------------------

describe("applyTechEffects", () => {
	it("computes unlocks after researching a tech", () => {
		// Research basic_smelting which unlocks lightning_rod
		const lightningRodTech = getTechTree().find((n) =>
			n.unlocks.includes("lightning_rod"),
		);
		if (!lightningRodTech) return;

		researchAndComplete("reclaimers", lightningRodTech.id);
		applyTechEffects("reclaimers");

		expect(isUnlocked("reclaimers", "unlock_building:lightning_rod")).toBe(
			true,
		);
	});

	it("does not unlock items without research", () => {
		applyTechEffects("reclaimers");

		expect(isUnlocked("reclaimers", "unlock_building:smelter")).toBe(false);
	});

	it("unlocks items after research completes", () => {
		const smelterTech = getTechTree().find((n) =>
			n.unlocks.includes("smelter"),
		);
		if (!smelterTech) return;

		// Research prerequisites first
		for (const prereq of smelterTech.prerequisites) {
			if (!getResearchedTechs("reclaimers").includes(prereq)) {
				researchAndComplete("reclaimers", prereq);
			}
		}
		researchAndComplete("reclaimers", smelterTech.id);
		applyTechEffects("reclaimers");

		expect(isUnlocked("reclaimers", "unlock_building:smelter")).toBe(true);
		expect(isUnlocked("reclaimers", "unlock_recipe:smelter")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Tech effects: getTechBonus
// ---------------------------------------------------------------------------

describe("getTechBonus", () => {
	it("returns 0 when no bonuses are active", () => {
		applyTechEffects("reclaimers");
		expect(getTechBonus("reclaimers", "bonus_harvest_speed")).toBe(0);
	});

	it("returns accumulated bonus after researching bonus-granting techs", () => {
		const fastBeltTech = getTechTree().find((n) =>
			n.unlocks.includes("fast_belt"),
		);
		if (!fastBeltTech) return;

		// Research prerequisites first
		for (const prereq of fastBeltTech.prerequisites) {
			if (!getResearchedTechs("reclaimers").includes(prereq)) {
				researchAndComplete("reclaimers", prereq);
			}
		}
		researchAndComplete("reclaimers", fastBeltTech.id);
		applyTechEffects("reclaimers");

		expect(getTechBonus("reclaimers", "bonus_harvest_speed")).toBeCloseTo(
			0.15,
		);
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
		const lightningRodTech = getTechTree().find((n) =>
			n.unlocks.includes("lightning_rod"),
		);
		if (!lightningRodTech) return;

		researchAndComplete("reclaimers", lightningRodTech.id);
		applyTechEffects("reclaimers");

		expect(isUnlocked("reclaimers", "unlock_building:lightning_rod")).toBe(
			true,
		);
	});

	it("checks all unlock types when no colon is used", () => {
		const lightningRodTech = getTechTree().find((n) =>
			n.unlocks.includes("lightning_rod"),
		);
		if (!lightningRodTech) return;

		researchAndComplete("reclaimers", lightningRodTech.id);
		applyTechEffects("reclaimers");

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
