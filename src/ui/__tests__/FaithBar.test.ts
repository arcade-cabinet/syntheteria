/**
 * Tests for FaithBar — pure logic tests.
 *
 * Verifies the display rules for when the faith bar should be visible,
 * faith fill calculation, and doctrine progress, using the ideology system's
 * exported functions directly (no DOM rendering needed).
 *
 * The FaithBar component itself is a thin wrapper — the logic under test here
 * is the ideology system behavior that drives the HUD.
 */

import {
	_resetIdeologyState,
	getEnlightenmentProgress,
	getFactionShrines,
	getFaith,
	placeShrine,
	updateIdeology,
} from "../../systems/ideologySystem";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

afterEach(() => {
	_resetIdeologyState();
});

// ---------------------------------------------------------------------------
// Visibility rules (faith > 0 OR shrines.length > 0)
// ---------------------------------------------------------------------------

describe("FaithBar visibility rules", () => {
	it("should NOT show for a faction with 0 faith and no shrines", () => {
		const progress = getEnlightenmentProgress("reclaimers");
		const shrines = getFactionShrines("reclaimers");

		// Component checks: if (progress.faith <= 0 && shrines.length === 0) return null
		expect(progress.faith).toBe(0);
		expect(shrines.length).toBe(0);
	});

	it("should show after a shrine is placed (shrines.length > 0)", () => {
		placeShrine("reclaimers", "shrine", { x: 0, y: 0, z: 0 }, 1);

		const shrines = getFactionShrines("reclaimers");
		expect(shrines.length).toBeGreaterThan(0);
	});

	it("should show after faith accumulates (faith > 0)", () => {
		placeShrine("reclaimers", "shrine", { x: 0, y: 0, z: 0 }, 1);
		updateIdeology("reclaimers", 1, false);

		const progress = getEnlightenmentProgress("reclaimers");
		expect(progress.faith).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Faith fill percentage
// ---------------------------------------------------------------------------

describe("Faith fill percentage", () => {
	it("starts at 0%", () => {
		const progress = getEnlightenmentProgress("volt_collective");
		expect(progress.faith).toBe(0);
		expect(progress.faithRequired).toBeGreaterThan(0);
	});

	it("increases after placing a shrine and ticking", () => {
		placeShrine("signal_choir", "shrine", { x: 0, y: 0, z: 0 }, 1);
		updateIdeology("signal_choir", 1, false);

		const faith = getFaith("signal_choir");
		expect(faith).toBeGreaterThan(0);
	});

	it("temple generates more faith per tick than shrine", () => {
		// Two separate factions — one with shrine, one with temple
		placeShrine("reclaimers", "shrine", { x: 0, y: 0, z: 0 }, 1);
		placeShrine("volt_collective", "temple", { x: 0, y: 0, z: 0 }, 1);

		updateIdeology("reclaimers", 1, false);
		updateIdeology("volt_collective", 1, false);

		const shrineFaith = getFaith("reclaimers");
		const templeFaith = getFaith("volt_collective");

		expect(templeFaith).toBeGreaterThan(shrineFaith);
	});

	it("grand_cathedral generates more faith than temple", () => {
		placeShrine("reclaimers", "temple", { x: 0, y: 0, z: 0 }, 1);
		placeShrine("iron_creed", "grand_cathedral", { x: 0, y: 0, z: 0 }, 1);

		updateIdeology("reclaimers", 1, false);
		updateIdeology("iron_creed", 1, false);

		expect(getFaith("iron_creed")).toBeGreaterThan(getFaith("reclaimers"));
	});
});

// ---------------------------------------------------------------------------
// Doctrine count
// ---------------------------------------------------------------------------

describe("Doctrine unlock display", () => {
	it("starts with 0 doctrines unlocked", () => {
		const progress = getEnlightenmentProgress("reclaimers");
		expect(progress.doctrinesUnlocked).toBe(0);
	});

	it("doctrinesRequired is a positive integer", () => {
		const progress = getEnlightenmentProgress("reclaimers");
		expect(progress.doctrinesRequired).toBeGreaterThan(0);
		expect(Number.isInteger(progress.doctrinesRequired)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Enlightenment eligibility
// ---------------------------------------------------------------------------

describe("Enlightenment eligibility", () => {
	it("is not eligible at game start", () => {
		const progress = getEnlightenmentProgress("reclaimers");
		expect(progress.isEligible).toBe(false);
	});

	it("faithRequired is consistent with victoryPaths config", () => {
		const progress = getEnlightenmentProgress("reclaimers");
		// The faithRequired comes from config/victoryPaths.json victoryEnlightenment.faithRequired
		expect(progress.faithRequired).toBeGreaterThan(0);
		// Based on current config: 1000
		expect(progress.faithRequired).toBe(1000);
	});
});

// ---------------------------------------------------------------------------
// Grand Cathedral
// ---------------------------------------------------------------------------

describe("Grand Cathedral indicator", () => {
	it("grandCathedralBuilt is false with no shrines", () => {
		const progress = getEnlightenmentProgress("reclaimers");
		expect(progress.grandCathedralBuilt).toBe(false);
	});

	it("grandCathedralBuilt is true after placing grand_cathedral", () => {
		placeShrine("iron_creed", "grand_cathedral", { x: 0, y: 0, z: 0 }, 1);
		const progress = getEnlightenmentProgress("iron_creed");
		expect(progress.grandCathedralBuilt).toBe(true);
	});

	it("grandCathedralBuilt is false after placing only a shrine", () => {
		placeShrine("iron_creed", "shrine", { x: 0, y: 0, z: 0 }, 1);
		const progress = getEnlightenmentProgress("iron_creed");
		expect(progress.grandCathedralBuilt).toBe(false);
	});
});
