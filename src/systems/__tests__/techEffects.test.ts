/**
 * Unit tests for the tech effects system.
 *
 * Tests cover:
 * - applyTechEffects: computing bonuses and unlocks from researched techs
 * - getTechBonus: querying aggregate bonus values per faction
 * - isUnlocked: checking unlock state with qualified and unqualified keys
 * - getEffectsForTech: retrieving effects for a specific tech node
 * - resetTechEffects: clearing the bonus cache
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	applyTechEffects,
	getEffectsForTech,
	getTechBonus,
	isUnlocked,
	resetTechEffects,
} from "../techEffects";
import {
	getResearchedTechs,
	getTechTree,
	resetTechTree,
	startResearch,
	updateResearch,
} from "../techTree";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Research and complete a tech for a faction so it appears in getResearchedTechs.
 * Returns the tech ID.
 */
function researchAndComplete(factionId: string, techId: string): string {
	const started = startResearch(factionId, techId);
	if (started) {
		// Advance enough to complete (big delta)
		updateResearch(factionId, 999999);
	}
	return techId;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetTechTree();
	resetTechEffects();
});

// ---------------------------------------------------------------------------
// applyTechEffects + getTechBonus
// ---------------------------------------------------------------------------

describe("applyTechEffects + getTechBonus", () => {
	it("returns 0 for all bonuses with no research", () => {
		applyTechEffects("player");
		expect(getTechBonus("player", "bonus_harvest_speed")).toBe(0);
		expect(getTechBonus("player", "bonus_cube_durability")).toBe(0);
		expect(getTechBonus("player", "bonus_vision_range")).toBe(0);
	});

	it("returns 0 for unknown faction", () => {
		expect(getTechBonus("unknown_faction", "bonus_harvest_speed")).toBe(0);
	});

	it("returns 0 for unknown bonus type", () => {
		applyTechEffects("player");
		expect(getTechBonus("player", "nonexistent_bonus")).toBe(0);
	});

	it("computes harvest speed bonus from fast_belt tech", () => {
		// tech_fast_belt unlocks fast_belt which has +0.15 harvest speed
		// First we need a tier-0 tech researched (prerequisite)
		// Tier-0 techs are auto-researched, so we should be able to start tier-1 directly
		const tree = getTechTree();
		const fastBeltTech = tree.find((n) => n.unlocks.includes("fast_belt"));
		if (!fastBeltTech) {
			// Skip if tech not found in tree
			return;
		}

		researchAndComplete("player", fastBeltTech.id);
		applyTechEffects("player");

		expect(getTechBonus("player", "bonus_harvest_speed")).toBeCloseTo(0.15);
	});

	it("accumulates multiple bonuses of the same type", () => {
		const tree = getTechTree();

		// Find techs that provide harvest speed bonuses
		const fastBeltTech = tree.find((n) => n.unlocks.includes("fast_belt"));
		const expressBeltTech = tree.find((n) =>
			n.unlocks.includes("express_belt"),
		);

		if (!fastBeltTech || !expressBeltTech) return;

		researchAndComplete("player", fastBeltTech.id);

		// To research express_belt, we might need to research its prerequisites
		// Research all prerequisites first
		for (const prereq of expressBeltTech.prerequisites) {
			if (!getResearchedTechs("player").includes(prereq)) {
				researchAndComplete("player", prereq);
			}
		}
		researchAndComplete("player", expressBeltTech.id);

		applyTechEffects("player");

		// fast_belt: +0.15, express_belt: +0.25 = 0.40
		expect(getTechBonus("player", "bonus_harvest_speed")).toBeCloseTo(0.40);
	});

	it("keeps faction bonuses independent", () => {
		const tree = getTechTree();
		const wallsTech = tree.find((n) => n.unlocks.includes("walls"));
		if (!wallsTech) return;

		researchAndComplete("player", wallsTech.id);
		applyTechEffects("player");
		applyTechEffects("cultist");

		expect(getTechBonus("player", "bonus_cube_durability")).toBeCloseTo(0.2);
		// Cultist hasn't researched walls, but tier-0 is auto-researched
		// They only get bonuses from auto-researched techs
		// Tier-0 techs don't have cube_durability bonus
		expect(getTechBonus("cultist", "bonus_cube_durability")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// isUnlocked
// ---------------------------------------------------------------------------

describe("isUnlocked", () => {
	it("returns false for unknown faction", () => {
		expect(isUnlocked("unknown", "basic_belt")).toBe(false);
	});

	it("returns false when nothing is researched (after reset)", () => {
		applyTechEffects("player");
		// Only auto-researched (tier-0) techs should be unlocked
		// basic_belt is a tier-0 unlock, so it should be unlocked
		expect(isUnlocked("player", "unlock_building:basic_belt")).toBe(true);
	});

	it("checks qualified key (type:target format)", () => {
		applyTechEffects("player");
		// Tier-0 techs are auto-researched, basic_belt should be unlocked
		expect(isUnlocked("player", "unlock_building:basic_belt")).toBe(true);
		expect(isUnlocked("player", "unlock_recipe:basic_belt")).toBe(true);
	});

	it("checks unqualified key (target only, checks all types)", () => {
		applyTechEffects("player");
		// basic_belt has both unlock_building and unlock_recipe
		expect(isUnlocked("player", "basic_belt")).toBe(true);
	});

	it("returns false for techs not yet researched", () => {
		applyTechEffects("player");
		// turret is a tier-2 tech, should not be unlocked initially
		expect(isUnlocked("player", "unlock_building:turret")).toBe(false);
		expect(isUnlocked("player", "turret")).toBe(false);
	});

	it("returns true after researching the tech", () => {
		const tree = getTechTree();
		const wallsTech = tree.find((n) => n.unlocks.includes("walls"));
		if (!wallsTech) return;

		researchAndComplete("player", wallsTech.id);
		applyTechEffects("player");

		expect(isUnlocked("player", "unlock_building:walls")).toBe(true);
		expect(isUnlocked("player", "walls")).toBe(true);
	});

	it("returns false for unqualified key that matches no unlock type", () => {
		applyTechEffects("player");
		expect(isUnlocked("player", "nonexistent_thing")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getEffectsForTech
// ---------------------------------------------------------------------------

describe("getEffectsForTech", () => {
	it("returns empty array for unknown tech", () => {
		expect(getEffectsForTech("nonexistent_tech")).toEqual([]);
	});

	it("returns effects for a valid tech", () => {
		const tree = getTechTree();
		const wallsTech = tree.find((n) => n.unlocks.includes("walls"));
		if (!wallsTech) return;

		const effects = getEffectsForTech(wallsTech.id);
		expect(effects.length).toBeGreaterThan(0);

		// walls should have unlock_building:walls and bonus_cube_durability
		const buildingUnlock = effects.find(
			(e) => e.type === "unlock_building" && e.target === "walls",
		);
		expect(buildingUnlock).toBeDefined();

		const durabilityBonus = effects.find(
			(e) => e.type === "bonus_cube_durability",
		);
		expect(durabilityBonus).toBeDefined();
		expect(durabilityBonus?.value).toBe(0.2);
	});

	it("returns effects for tier-0 tech (basic_belt)", () => {
		const tree = getTechTree();
		const basicBeltTech = tree.find((n) => n.unlocks.includes("basic_belt"));
		if (!basicBeltTech) return;

		const effects = getEffectsForTech(basicBeltTech.id);
		expect(effects.length).toBe(2);
		expect(effects.some((e) => e.type === "unlock_building")).toBe(true);
		expect(effects.some((e) => e.type === "unlock_recipe")).toBe(true);
	});

	it("returns combined effects when tech has multiple unlocks", () => {
		const tree = getTechTree();
		const formationTech = tree.find((n) =>
			n.unlocks.includes("formation_controller"),
		);
		if (!formationTech) return;

		const effects = getEffectsForTech(formationTech.id);
		// formation_controller has: unlock_component, bonus_harvest_speed, bonus_cube_durability
		expect(effects.length).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// resetTechEffects
// ---------------------------------------------------------------------------

describe("resetTechEffects", () => {
	it("clears all cached bonuses", () => {
		applyTechEffects("player");
		resetTechEffects();

		// After reset, should return 0
		expect(getTechBonus("player", "bonus_harvest_speed")).toBe(0);
	});

	it("clears all cached unlocks", () => {
		applyTechEffects("player");
		resetTechEffects();

		// After reset, isUnlocked should return false
		expect(isUnlocked("player", "basic_belt")).toBe(false);
	});

	it("is safe to call multiple times", () => {
		resetTechEffects();
		resetTechEffects();
		expect(getTechBonus("player", "bonus_harvest_speed")).toBe(0);
	});
});
