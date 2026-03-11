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
} from "../techTree";
import { techResearchSystem } from "../techResearch";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLENTY = 999999;

/**
 * Research and complete a tech for a faction so it appears in getResearchedTechs.
 * Uses the canonical compute-point system to advance research.
 */
function researchAndComplete(factionId: string, techId: string): string {
	const started = startResearch(factionId, techId);
	if (started) {
		techResearchSystem({ [factionId]: PLENTY });
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

	it("computes harvest speed bonus from a tech that unlocks fast_belt", () => {
		const tree = getTechTree();
		const fastBeltTech = tree.find((n) => n.unlocks.includes("fast_belt"));
		if (!fastBeltTech) {
			return;
		}

		// Research prerequisites first
		for (const prereq of fastBeltTech.prerequisites) {
			if (!getResearchedTechs("player").includes(prereq)) {
				researchAndComplete("player", prereq);
			}
		}
		researchAndComplete("player", fastBeltTech.id);
		applyTechEffects("player");

		expect(getTechBonus("player", "bonus_harvest_speed")).toBeCloseTo(0.15);
	});

	it("accumulates multiple bonuses of the same type", () => {
		const tree = getTechTree();

		const fastBeltTech = tree.find((n) => n.unlocks.includes("fast_belt"));
		const expressBeltTech = tree.find((n) =>
			n.unlocks.includes("express_belt"),
		);

		if (!fastBeltTech || !expressBeltTech) return;

		// Research fast_belt and all its prerequisites
		for (const prereq of fastBeltTech.prerequisites) {
			if (!getResearchedTechs("player").includes(prereq)) {
				researchAndComplete("player", prereq);
			}
		}
		researchAndComplete("player", fastBeltTech.id);

		// Research express_belt and all its prerequisites
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

		// Research prerequisites for walls
		for (const prereq of wallsTech.prerequisites) {
			if (!getResearchedTechs("player").includes(prereq)) {
				researchAndComplete("player", prereq);
			}
		}
		researchAndComplete("player", wallsTech.id);
		applyTechEffects("player");
		applyTechEffects("cultist");

		expect(getTechBonus("player", "bonus_cube_durability")).toBeCloseTo(0.2);
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
		// No techs are auto-researched in the canonical system
		expect(isUnlocked("player", "unlock_building:basic_belt")).toBe(false);
	});

	it("returns true after researching the tech that unlocks basic_belt", () => {
		const tree = getTechTree();
		const basicBeltTech = tree.find((n) => n.unlocks.includes("basic_belt"));
		if (!basicBeltTech) return;

		researchAndComplete("player", basicBeltTech.id);
		applyTechEffects("player");

		expect(isUnlocked("player", "unlock_building:basic_belt")).toBe(true);
		expect(isUnlocked("player", "unlock_recipe:basic_belt")).toBe(true);
	});

	it("checks unqualified key (target only, checks all types)", () => {
		const tree = getTechTree();
		const basicBeltTech = tree.find((n) => n.unlocks.includes("basic_belt"));
		if (!basicBeltTech) return;

		researchAndComplete("player", basicBeltTech.id);
		applyTechEffects("player");

		expect(isUnlocked("player", "basic_belt")).toBe(true);
	});

	it("returns false for techs not yet researched", () => {
		applyTechEffects("player");
		expect(isUnlocked("player", "unlock_building:turret")).toBe(false);
		expect(isUnlocked("player", "turret")).toBe(false);
	});

	it("returns true after researching the tech that unlocks walls", () => {
		const tree = getTechTree();
		const wallsTech = tree.find((n) => n.unlocks.includes("walls"));
		if (!wallsTech) return;

		for (const prereq of wallsTech.prerequisites) {
			if (!getResearchedTechs("player").includes(prereq)) {
				researchAndComplete("player", prereq);
			}
		}
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

	it("returns effects for tech that unlocks basic_belt", () => {
		const tree = getTechTree();
		const basicBeltTech = tree.find((n) => n.unlocks.includes("basic_belt"));
		if (!basicBeltTech) return;

		const effects = getEffectsForTech(basicBeltTech.id);
		expect(effects.length).toBeGreaterThan(0);
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

		expect(getTechBonus("player", "bonus_harvest_speed")).toBe(0);
	});

	it("clears all cached unlocks", () => {
		const tree = getTechTree();
		const basicBeltTech = tree.find((n) => n.unlocks.includes("basic_belt"));
		if (!basicBeltTech) return;

		researchAndComplete("player", basicBeltTech.id);
		applyTechEffects("player");
		resetTechEffects();

		expect(isUnlocked("player", "basic_belt")).toBe(false);
	});

	it("is safe to call multiple times", () => {
		resetTechEffects();
		resetTechEffects();
		expect(getTechBonus("player", "bonus_harvest_speed")).toBe(0);
	});
});
