/**
 * Tests for the game phase system.
 *
 * Covers phase definitions (phaseDefs.ts) and phase state machine (gamePhases.ts).
 * Phase transitions are condition-based (unit-outside-city, cult-tier-3),
 * so most transition tests are covered by integration/E2E rather than unit tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	getNextPhase,
	isBuildingUnlocked,
	isMarkTierAvailable,
	PHASE_DEFS,
} from "../../config/phaseDefs";
import {
	getCurrentGamePhase,
	getCurrentPhaseDisplayName,
	getMaxMarkTier,
	getPhaseCultTier,
	getPhaseElapsedSec,
	isBuildingUnlockedInCurrentPhase,
	popPhaseTransitionId,
	resetPhaseState,
} from "../gamePhases";

beforeEach(() => {
	resetPhaseState();
});

// ---------------------------------------------------------------------------
// Phase definitions (config/phaseDefs.ts)
// ---------------------------------------------------------------------------

describe("phaseDefs", () => {
	it("defines exactly 3 phases", () => {
		const ids = Object.keys(PHASE_DEFS);
		expect(ids).toHaveLength(3);
		expect(ids).toContain("awakening");
		expect(ids).toContain("expansion");
		expect(ids).toContain("war");
	});

	it("getNextPhase returns correct progression", () => {
		expect(getNextPhase("awakening")).toBe("expansion");
		expect(getNextPhase("expansion")).toBe("war");
		expect(getNextPhase("war")).toBeNull();
	});

	it("isBuildingUnlocked checks phase building lists", () => {
		expect(isBuildingUnlocked("awakening", "lightning_rod")).toBe(true);
		expect(isBuildingUnlocked("awakening", "barricade")).toBe(true);
		expect(isBuildingUnlocked("awakening", "fabrication_unit")).toBe(false);
		expect(isBuildingUnlocked("expansion", "fabrication_unit")).toBe(true);
		expect(isBuildingUnlocked("expansion", "sensor_tower")).toBe(true);
	});

	it("isMarkTierAvailable respects phase caps", () => {
		expect(isMarkTierAvailable("awakening", 1)).toBe(true);
		expect(isMarkTierAvailable("awakening", 2)).toBe(false);
		expect(isMarkTierAvailable("expansion", 2)).toBe(true);
		expect(isMarkTierAvailable("expansion", 3)).toBe(false);
		expect(isMarkTierAvailable("war", 3)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Phase state machine (systems/gamePhases.ts)
// ---------------------------------------------------------------------------

describe("gamePhaseSystem — initial state", () => {
	it("starts in Awakening phase", () => {
		expect(getCurrentGamePhase()).toBe("awakening");
		expect(getCurrentPhaseDisplayName()).toBe("Awakening");
		expect(getPhaseElapsedSec()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Transition ID pop
// ---------------------------------------------------------------------------

describe("popPhaseTransitionId", () => {
	it("returns null when no transition has occurred", () => {
		expect(popPhaseTransitionId()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Phase-gated queries (in Awakening — no ECS entities needed)
// ---------------------------------------------------------------------------

describe("phase-gated helpers", () => {
	it("getMaxMarkTier returns 1 in Awakening", () => {
		expect(getMaxMarkTier()).toBe(1);
	});

	it("getPhaseCultTier returns 1 in Awakening", () => {
		expect(getPhaseCultTier()).toBe(1);
	});

	it("isBuildingUnlockedInCurrentPhase checks current phase", () => {
		expect(isBuildingUnlockedInCurrentPhase("lightning_rod")).toBe(true);
		expect(isBuildingUnlockedInCurrentPhase("fabrication_unit")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetPhaseState", () => {
	it("resets phase state to initial values", () => {
		resetPhaseState();

		expect(getCurrentGamePhase()).toBe("awakening");
		expect(getPhaseElapsedSec()).toBe(0);
		expect(popPhaseTransitionId()).toBeNull();
	});
});
