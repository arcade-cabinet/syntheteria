/**
 * Unit tests for the technology research system.
 *
 * Tests cover:
 * - Starting research requires prerequisites
 * - Research progress advances with compute
 * - Faction bonuses apply correctly (global + per-tech)
 * - Completing research unlocks the tech
 * - Cannot research already-researched tech
 * - getAvailableTechs respects prerequisite chains
 * - Reset clears all state
 * - Multiple factions research independently
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		technology: {
			techTree: [
				{
					id: "basic_mining",
					name: "Basic Mining",
					tier: 1,
					researchCost: 100,
					prerequisites: [],
					effects: { unlocks: ["drill_mk1"], bonuses: { miningRate: 0.1 } },
					factionBonus: null,
				},
				{
					id: "basic_belts",
					name: "Basic Belts",
					tier: 1,
					researchCost: 80,
					prerequisites: [],
					effects: { unlocks: ["belt_mk1"], bonuses: {} },
					factionBonus: null,
				},
				{
					id: "advanced_mining",
					name: "Advanced Mining",
					tier: 2,
					researchCost: 200,
					prerequisites: ["basic_mining"],
					effects: { unlocks: ["drill_mk2"], bonuses: { miningRate: 0.2 } },
					factionBonus: "reclaimers",
				},
				{
					id: "signal_boost",
					name: "Signal Boost",
					tier: 2,
					researchCost: 150,
					prerequisites: ["basic_belts"],
					effects: { unlocks: ["signal_relay"], bonuses: { signalRange: 0.2 } },
					factionBonus: "signal_choir",
				},
				{
					id: "turrets",
					name: "Turrets",
					tier: 3,
					researchCost: 300,
					prerequisites: ["advanced_mining", "signal_boost"],
					effects: { unlocks: ["turret_mk1"], bonuses: {} },
					factionBonus: null,
				},
			],
			factionResearchBonuses: {
				signal_choir: 1.5,
				reclaimers: 0.8,
				volt_collective: 1.0,
				iron_creed: 0.9,
			},
		},
	},
}));

// ---------------------------------------------------------------------------
// Imports (after mock)
// ---------------------------------------------------------------------------

import {
	getAvailableTechs,
	getResearchProgress,
	isResearched,
	resetTechResearch,
	startResearch,
	techResearchSystem,
} from "../techResearch";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetTechResearch();
});

// ---------------------------------------------------------------------------
// Helpers — high compute to guarantee completion regardless of multiplier
// ---------------------------------------------------------------------------

/** Enough compute to complete any single tech for any faction. */
const PLENTY = 5000;

// ---------------------------------------------------------------------------
// isResearched
// ---------------------------------------------------------------------------

describe("isResearched", () => {
	it("returns false for a tech that has not been researched", () => {
		expect(isResearched("reclaimers", "basic_mining")).toBe(false);
	});

	it("returns true after research is completed", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });
		expect(isResearched("reclaimers", "basic_mining")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// startResearch
// ---------------------------------------------------------------------------

describe("startResearch", () => {
	it("starts research on a tier-1 tech with no prerequisites", () => {
		const result = startResearch("reclaimers", "basic_mining");
		expect(result).toBe(true);
		expect(getResearchProgress("reclaimers")).not.toBeNull();
	});

	it("returns false for a non-existent tech", () => {
		expect(startResearch("reclaimers", "does_not_exist")).toBe(false);
	});

	it("returns false for an already-researched tech", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });
		expect(startResearch("reclaimers", "basic_mining")).toBe(false);
	});

	it("returns false when another research is already in progress", () => {
		startResearch("reclaimers", "basic_mining");
		expect(startResearch("reclaimers", "basic_belts")).toBe(false);
	});

	it("returns false when prerequisites are not met", () => {
		expect(startResearch("reclaimers", "advanced_mining")).toBe(false);
	});

	it("allows research after prerequisites are completed", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });
		expect(startResearch("reclaimers", "advanced_mining")).toBe(true);
	});

	it("rejects tech requiring multiple unmet prerequisites", () => {
		// turrets requires advanced_mining + signal_boost
		expect(startResearch("reclaimers", "turrets")).toBe(false);
	});

	it("rejects tech when only some prerequisites are met", () => {
		// Complete basic_mining and advanced_mining, but not signal_boost
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });
		startResearch("reclaimers", "advanced_mining");
		techResearchSystem({ reclaimers: PLENTY });
		expect(startResearch("reclaimers", "turrets")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// techResearchSystem — progress advancement
// ---------------------------------------------------------------------------

describe("techResearchSystem — progress", () => {
	it("advances progress by compute points scaled by faction multiplier", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: 10 });

		const progress = getResearchProgress("reclaimers");
		expect(progress).not.toBeNull();
		// reclaimers multiplier = 0.8, no tech bonus
		// effective = 10 * 0.8 = 8
		expect(progress!.progress).toBeCloseTo(8);
	});

	it("accumulates progress across multiple ticks", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: 10 });
		techResearchSystem({ reclaimers: 10 });
		techResearchSystem({ reclaimers: 10 });

		const progress = getResearchProgress("reclaimers");
		// 3 * 10 * 0.8 = 24
		expect(progress!.progress).toBeCloseTo(24);
	});

	it("does not advance when compute is zero", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: 0 });

		const progress = getResearchProgress("reclaimers");
		expect(progress!.progress).toBe(0);
	});

	it("does not advance when faction has no compute entry", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({});

		const progress = getResearchProgress("reclaimers");
		expect(progress!.progress).toBe(0);
	});

	it("does nothing when no research is active", () => {
		const completed = techResearchSystem({ reclaimers: 100 });
		expect(completed).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// techResearchSystem — completion
// ---------------------------------------------------------------------------

describe("techResearchSystem — completion", () => {
	it("completes research when progress reaches cost", () => {
		startResearch("reclaimers", "basic_mining");
		// cost = 100, multiplier = 0.8 => need 100/0.8 = 125 compute
		const completed = techResearchSystem({ reclaimers: 125 });

		expect(completed).toEqual([
			{ faction: "reclaimers", techId: "basic_mining" },
		]);
		expect(isResearched("reclaimers", "basic_mining")).toBe(true);
		expect(getResearchProgress("reclaimers")).toBeNull();
	});

	it("completes research when progress exceeds cost", () => {
		startResearch("reclaimers", "basic_mining");
		const completed = techResearchSystem({ reclaimers: PLENTY });

		expect(completed.length).toBe(1);
		expect(isResearched("reclaimers", "basic_mining")).toBe(true);
	});

	it("clears active research after completion", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });

		expect(getResearchProgress("reclaimers")).toBeNull();
	});

	it("allows starting new research after completion", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });

		const ok = startResearch("reclaimers", "basic_belts");
		expect(ok).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Faction research speed bonuses (global multiplier)
// ---------------------------------------------------------------------------

describe("faction research speed bonuses", () => {
	it("signal_choir researches 1.5x faster than base", () => {
		startResearch("signal_choir", "basic_mining");
		techResearchSystem({ signal_choir: 10 });

		const progress = getResearchProgress("signal_choir");
		// 10 * 1.5 = 15
		expect(progress!.progress).toBeCloseTo(15);
	});

	it("reclaimers research at 0.8x speed", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: 10 });

		const progress = getResearchProgress("reclaimers");
		// 10 * 0.8 = 8
		expect(progress!.progress).toBeCloseTo(8);
	});

	it("iron_creed researches at 0.9x speed", () => {
		startResearch("iron_creed", "basic_mining");
		techResearchSystem({ iron_creed: 10 });

		const progress = getResearchProgress("iron_creed");
		// 10 * 0.9 = 9
		expect(progress!.progress).toBeCloseTo(9);
	});

	it("unknown faction defaults to 1.0x speed", () => {
		startResearch("unknown_faction", "basic_mining");
		techResearchSystem({ unknown_faction: 10 });

		const progress = getResearchProgress("unknown_faction");
		// 10 * 1.0 = 10
		expect(progress!.progress).toBeCloseTo(10);
	});
});

// ---------------------------------------------------------------------------
// Per-tech faction affinity bonus
// ---------------------------------------------------------------------------

describe("per-tech faction affinity bonus", () => {
	it("grants +50% for faction-aligned tech on top of global bonus", () => {
		// advanced_mining has factionBonus: "reclaimers"
		// reclaimers global = 0.8x, tech affinity = 1.5x
		// effective = 10 * 0.8 * 1.5 = 12
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY }); // complete prereq

		startResearch("reclaimers", "advanced_mining");
		techResearchSystem({ reclaimers: 10 });

		const progress = getResearchProgress("reclaimers");
		expect(progress!.progress).toBeCloseTo(12);
	});

	it("signal_choir gets both global 1.5x and tech affinity 1.5x on aligned techs", () => {
		// signal_boost has factionBonus: "signal_choir"
		// signal_choir global = 1.5x, tech affinity = 1.5x
		// effective = 10 * 1.5 * 1.5 = 22.5
		startResearch("signal_choir", "basic_belts");
		techResearchSystem({ signal_choir: PLENTY }); // complete prereq

		startResearch("signal_choir", "signal_boost");
		techResearchSystem({ signal_choir: 10 });

		const progress = getResearchProgress("signal_choir");
		expect(progress!.progress).toBeCloseTo(22.5);
	});

	it("does not apply tech affinity bonus to non-aligned faction", () => {
		// advanced_mining has factionBonus: "reclaimers"
		// volt_collective global = 1.0x, no tech affinity
		// effective = 10 * 1.0 = 10
		startResearch("volt_collective", "basic_mining");
		techResearchSystem({ volt_collective: PLENTY }); // complete prereq

		startResearch("volt_collective", "advanced_mining");
		techResearchSystem({ volt_collective: 10 });

		const progress = getResearchProgress("volt_collective");
		expect(progress!.progress).toBeCloseTo(10);
	});
});

// ---------------------------------------------------------------------------
// getAvailableTechs
// ---------------------------------------------------------------------------

describe("getAvailableTechs", () => {
	it("returns all tier-1 techs when nothing is researched", () => {
		const available = getAvailableTechs("reclaimers");
		const ids = available.map((t) => t.id);

		expect(ids).toContain("basic_mining");
		expect(ids).toContain("basic_belts");
		expect(ids).not.toContain("advanced_mining");
		expect(ids).not.toContain("turrets");
	});

	it("excludes already-researched techs", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });

		const available = getAvailableTechs("reclaimers");
		const ids = available.map((t) => t.id);
		expect(ids).not.toContain("basic_mining");
	});

	it("includes tier-2 techs after their prerequisites are met", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });

		const available = getAvailableTechs("reclaimers");
		const ids = available.map((t) => t.id);
		expect(ids).toContain("advanced_mining");
	});

	it("respects multi-prerequisite chains", () => {
		// turrets requires advanced_mining AND signal_boost
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });

		startResearch("reclaimers", "advanced_mining");
		techResearchSystem({ reclaimers: PLENTY });

		// Only advanced_mining done — turrets should not be available
		let available = getAvailableTechs("reclaimers");
		let ids = available.map((t) => t.id);
		expect(ids).not.toContain("turrets");

		// Now complete signal_boost's prerequisite chain
		startResearch("reclaimers", "basic_belts");
		techResearchSystem({ reclaimers: PLENTY });

		startResearch("reclaimers", "signal_boost");
		techResearchSystem({ reclaimers: PLENTY });

		// Now turrets should be available
		available = getAvailableTechs("reclaimers");
		ids = available.map((t) => t.id);
		expect(ids).toContain("turrets");
	});
});

// ---------------------------------------------------------------------------
// getResearchProgress
// ---------------------------------------------------------------------------

describe("getResearchProgress", () => {
	it("returns null when no research is active", () => {
		expect(getResearchProgress("reclaimers")).toBeNull();
	});

	it("returns current progress, cost, and techId", () => {
		startResearch("reclaimers", "basic_mining");
		const progress = getResearchProgress("reclaimers");

		expect(progress).toEqual({
			techId: "basic_mining",
			progress: 0,
			cost: 100,
		});
	});

	it("returns a copy (not a reference to internal state)", () => {
		startResearch("reclaimers", "basic_mining");
		const p1 = getResearchProgress("reclaimers");
		const p2 = getResearchProgress("reclaimers");
		expect(p1).not.toBe(p2);
		expect(p1).toEqual(p2);
	});
});

// ---------------------------------------------------------------------------
// resetTechResearch
// ---------------------------------------------------------------------------

describe("resetTechResearch", () => {
	it("clears all faction research state", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: PLENTY });
		expect(isResearched("reclaimers", "basic_mining")).toBe(true);

		resetTechResearch();

		expect(isResearched("reclaimers", "basic_mining")).toBe(false);
		expect(getResearchProgress("reclaimers")).toBeNull();
		expect(getAvailableTechs("reclaimers").map((t) => t.id)).toContain(
			"basic_mining",
		);
	});

	it("clears active research", () => {
		startResearch("reclaimers", "basic_mining");
		resetTechResearch();
		expect(getResearchProgress("reclaimers")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Multi-faction independence
// ---------------------------------------------------------------------------

describe("multi-faction independence", () => {
	it("factions research independently", () => {
		startResearch("reclaimers", "basic_mining");
		startResearch("signal_choir", "basic_belts");

		techResearchSystem({ reclaimers: PLENTY, signal_choir: PLENTY });

		expect(isResearched("reclaimers", "basic_mining")).toBe(true);
		expect(isResearched("reclaimers", "basic_belts")).toBe(false);

		expect(isResearched("signal_choir", "basic_belts")).toBe(true);
		expect(isResearched("signal_choir", "basic_mining")).toBe(false);
	});

	it("one faction completing does not affect another", () => {
		startResearch("reclaimers", "basic_mining");
		startResearch("signal_choir", "basic_mining");

		// Only give reclaimers enough compute
		techResearchSystem({ reclaimers: PLENTY, signal_choir: 1 });

		expect(isResearched("reclaimers", "basic_mining")).toBe(true);
		expect(isResearched("signal_choir", "basic_mining")).toBe(false);

		const progress = getResearchProgress("signal_choir");
		expect(progress).not.toBeNull();
		expect(progress!.progress).toBeCloseTo(1.5); // 1 * 1.5 (signal_choir bonus)
	});

	it("system returns completions from multiple factions in one tick", () => {
		startResearch("reclaimers", "basic_mining");
		startResearch("signal_choir", "basic_mining");

		const completed = techResearchSystem({
			reclaimers: PLENTY,
			signal_choir: PLENTY,
		});

		expect(completed.length).toBe(2);
		expect(completed).toContainEqual({
			faction: "reclaimers",
			techId: "basic_mining",
		});
		expect(completed).toContainEqual({
			faction: "signal_choir",
			techId: "basic_mining",
		});
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles faction with no previous state gracefully", () => {
		expect(isResearched("brand_new_faction", "basic_mining")).toBe(false);
		expect(getResearchProgress("brand_new_faction")).toBeNull();
		expect(getAvailableTechs("brand_new_faction").length).toBeGreaterThan(0);
	});

	it("negative compute does not reduce progress", () => {
		startResearch("reclaimers", "basic_mining");
		techResearchSystem({ reclaimers: 10 });
		techResearchSystem({ reclaimers: -5 });

		const progress = getResearchProgress("reclaimers");
		// Only the first tick counted: 10 * 0.8 = 8
		// Negative compute is <= 0, so skipped
		expect(progress!.progress).toBeCloseTo(8);
	});
});
