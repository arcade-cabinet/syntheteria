/**
 * Tests for victoryProgressData — pure mapping functions from victory
 * condition scores to 4-path display data.
 */

import {
	buildVictoryProgressDisplay,
	getConditionDisplayName,
	getVictoryTagline,
} from "../victoryProgressData";
import type { FactionVictoryProgress } from "../../systems/victoryTracking";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProgress(
	overrides: Partial<FactionVictoryProgress> = {},
): FactionVictoryProgress {
	const defaults: FactionVictoryProgress = {
		economic: { score: 0, met: false },
		military: { score: 0, met: false },
		scientific: { score: 0, met: false },
		cultural: { score: 0, met: false },
		hacking: { score: 0, met: false },
		survival: { score: 0, met: false },
	};
	return { ...defaults, ...overrides };
}

// ---------------------------------------------------------------------------
// buildVictoryProgressDisplay
// ---------------------------------------------------------------------------

describe("buildVictoryProgressDisplay", () => {
	it("returns 4 paths", () => {
		const result = buildVictoryProgressDisplay(makeProgress());
		expect(result.paths).toHaveLength(4);
	});

	it("all paths have score 0 when progress is empty", () => {
		const result = buildVictoryProgressDisplay(makeProgress());
		for (const path of result.paths) {
			expect(path.score).toBe(0);
		}
	});

	it("leadingScore is 0 and leadingPathId is null when all paths at 0", () => {
		const result = buildVictoryProgressDisplay(makeProgress());
		expect(result.leadingScore).toBe(0);
		expect(result.leadingPathId).toBeNull();
	});

	it("technical_mastery path averages scientific + hacking scores", () => {
		const result = buildVictoryProgressDisplay(
			makeProgress({
				scientific: { score: 0.8, met: false },
				hacking: { score: 0.6, met: false },
			}),
		);
		const path = result.paths.find((p) => p.id === "technical_mastery")!;
		expect(path.score).toBeCloseTo(0.7);
	});

	it("subjugation path averages military + survival scores", () => {
		const result = buildVictoryProgressDisplay(
			makeProgress({
				military: { score: 1.0, met: true },
				survival: { score: 0.5, met: false },
			}),
		);
		const path = result.paths.find((p) => p.id === "subjugation")!;
		expect(path.score).toBeCloseTo(0.75);
	});

	it("social_networking path averages economic + cultural scores", () => {
		const result = buildVictoryProgressDisplay(
			makeProgress({
				economic: { score: 0.4, met: false },
				cultural: { score: 0.6, met: false },
			}),
		);
		const path = result.paths.find((p) => p.id === "social_networking")!;
		expect(path.score).toBeCloseTo(0.5);
	});

	it("religious path uses faithScore parameter", () => {
		const result = buildVictoryProgressDisplay(makeProgress(), 0.7);
		const path = result.paths.find((p) => p.id === "religious_philosophical")!;
		expect(path.score).toBeCloseTo(0.7);
	});

	it("religious path uses faithScore=0 by default", () => {
		const result = buildVictoryProgressDisplay(makeProgress());
		const path = result.paths.find((p) => p.id === "religious_philosophical")!;
		expect(path.score).toBe(0);
	});

	it("path.met is true only when all conditions in the path are met", () => {
		const result = buildVictoryProgressDisplay(
			makeProgress({
				military: { score: 1.0, met: true },
				survival: { score: 1.0, met: true },
			}),
		);
		const subjugation = result.paths.find((p) => p.id === "subjugation")!;
		expect(subjugation.met).toBe(true);
	});

	it("path.met is false when only one condition is met", () => {
		const result = buildVictoryProgressDisplay(
			makeProgress({
				military: { score: 1.0, met: true },
				survival: { score: 0.5, met: false },
			}),
		);
		const subjugation = result.paths.find((p) => p.id === "subjugation")!;
		expect(subjugation.met).toBe(false);
	});

	it("leadingPathId is the path with the highest score", () => {
		const result = buildVictoryProgressDisplay(
			makeProgress({
				military: { score: 0.9, met: false },
				survival: { score: 0.8, met: false },
				scientific: { score: 0.3, met: false },
			}),
		);
		expect(result.leadingPathId).toBe("subjugation");
		expect(result.leadingScore).toBeCloseTo(0.85);
	});

	it("each path has an accentColor string", () => {
		const result = buildVictoryProgressDisplay(makeProgress());
		for (const path of result.paths) {
			expect(typeof path.accentColor).toBe("string");
			expect(path.accentColor).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
		}
	});

	it("each path has a non-empty displayName and subtitle", () => {
		const result = buildVictoryProgressDisplay(makeProgress());
		for (const path of result.paths) {
			expect(path.displayName.length).toBeGreaterThan(0);
			expect(path.subtitle.length).toBeGreaterThan(0);
		}
	});

	it("conditions array contains correct labels for technical_mastery", () => {
		const result = buildVictoryProgressDisplay(makeProgress());
		const path = result.paths.find((p) => p.id === "technical_mastery")!;
		const labels = path.conditions.map((c) => c.label);
		expect(labels).toContain("Scientific");
		expect(labels).toContain("Hacking");
	});
});

// ---------------------------------------------------------------------------
// getVictoryTagline
// ---------------------------------------------------------------------------

describe("getVictoryTagline", () => {
	it("returns known faction victory tagline on win", () => {
		const tagline = getVictoryTagline("reclaimers", true);
		expect(tagline.length).toBeGreaterThan(10);
		expect(typeof tagline).toBe("string");
	});

	it("returns known faction defeat tagline on loss", () => {
		const tagline = getVictoryTagline("volt_collective", false);
		expect(tagline.length).toBeGreaterThan(10);
	});

	it("returns default tagline for unknown faction on win", () => {
		const tagline = getVictoryTagline("pirates", true);
		expect(typeof tagline).toBe("string");
		expect(tagline.length).toBeGreaterThan(0);
	});

	it("returns default tagline for null factionId", () => {
		const victory = getVictoryTagline(null, true);
		const defeat = getVictoryTagline(null, false);
		expect(victory.length).toBeGreaterThan(0);
		expect(defeat.length).toBeGreaterThan(0);
	});

	it("victory and defeat taglines are different for same faction", () => {
		const win = getVictoryTagline("signal_choir", true);
		const loss = getVictoryTagline("signal_choir", false);
		expect(win).not.toBe(loss);
	});
});

// ---------------------------------------------------------------------------
// getConditionDisplayName
// ---------------------------------------------------------------------------

describe("getConditionDisplayName", () => {
	it("returns readable name for known keys", () => {
		expect(getConditionDisplayName("economic")).toBe("Economic Dominance");
		expect(getConditionDisplayName("military")).toBe("Military Conquest");
		expect(getConditionDisplayName("scientific")).toBe("Scientific Supremacy");
		expect(getConditionDisplayName("cultural")).toBe("Cultural Dominion");
		expect(getConditionDisplayName("hacking")).toBe("Digital Takeover");
		expect(getConditionDisplayName("survival")).toBe("Last Bot Standing");
		expect(getConditionDisplayName("faith")).toBe("Enlightenment");
	});

	it("formats unknown keys as uppercased with spaces", () => {
		expect(getConditionDisplayName("some_condition")).toBe("SOME CONDITION");
	});
});
