/**
 * Tests for the game phase system.
 *
 * Covers phase progression (Awakening → Expansion → War),
 * time-based and condition-based triggers, transition text,
 * building/Mark tier gating, and state reset.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	getNextPhase,
	isBuildingUnlocked,
	isMarkTierAvailable,
	PHASE_DEFS,
} from "../../config/phaseDefs";
import {
	gamePhaseSystem,
	getCurrentGamePhase,
	getCurrentPhaseDisplayName,
	getMaxMarkTier,
	getPhaseCultTier,
	getPhaseElapsedSec,
	getRoomsCleared,
	isBuildingUnlockedInCurrentPhase,
	popTransitionText,
	recordRoomCleared,
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

describe("gamePhaseSystem", () => {
	it("starts in Awakening phase", () => {
		expect(getCurrentGamePhase()).toBe("awakening");
		expect(getCurrentPhaseDisplayName()).toBe("Awakening");
		expect(getPhaseElapsedSec()).toBe(0);
	});

	it("accumulates elapsed time", () => {
		gamePhaseSystem(10);
		expect(getPhaseElapsedSec()).toBe(10);
		gamePhaseSystem(5);
		expect(getPhaseElapsedSec()).toBe(15);
	});

	it("transitions to Expansion at 900 seconds", () => {
		// Just under threshold — still Awakening
		gamePhaseSystem(899);
		expect(getCurrentGamePhase()).toBe("awakening");

		// Cross threshold
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("expansion");
		expect(getCurrentPhaseDisplayName()).toBe("Expansion");
	});

	it("transitions to Expansion early when 3 rooms cleared", () => {
		recordRoomCleared();
		recordRoomCleared();
		expect(getRoomsCleared()).toBe(2);

		// 2 rooms + tick → still Awakening
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("awakening");

		// 3rd room + tick → Expansion
		recordRoomCleared();
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("expansion");
	});

	it("transitions to War at 2100 seconds", () => {
		// Jump to Expansion first
		gamePhaseSystem(900);
		expect(getCurrentGamePhase()).toBe("expansion");

		// Advance to just before War threshold
		gamePhaseSystem(1199);
		expect(getCurrentGamePhase()).toBe("expansion");

		// Cross War threshold (total = 2100)
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("war");
		expect(getCurrentPhaseDisplayName()).toBe("War");
	});

	it("does not advance past War", () => {
		gamePhaseSystem(900); // → Expansion
		gamePhaseSystem(1200); // → War
		expect(getCurrentGamePhase()).toBe("war");

		gamePhaseSystem(10000);
		expect(getCurrentGamePhase()).toBe("war");
	});
});

// ---------------------------------------------------------------------------
// Transition text
// ---------------------------------------------------------------------------

describe("popTransitionText", () => {
	it("returns null when no transition has occurred", () => {
		expect(popTransitionText()).toBeNull();
	});

	it("returns transition text after phase change", () => {
		gamePhaseSystem(900); // → Expansion
		const text = popTransitionText();
		expect(text).not.toBeNull();
		expect(text).toEqual(PHASE_DEFS.expansion.transitionText);
	});

	it("returns null on second pop (consumed)", () => {
		gamePhaseSystem(900); // → Expansion
		popTransitionText(); // consume
		expect(popTransitionText()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Phase-gated queries
// ---------------------------------------------------------------------------

describe("phase-gated helpers", () => {
	it("getMaxMarkTier reflects current phase", () => {
		expect(getMaxMarkTier()).toBe(1); // Awakening
		gamePhaseSystem(900);
		expect(getMaxMarkTier()).toBe(2); // Expansion
		gamePhaseSystem(1200);
		expect(getMaxMarkTier()).toBe(3); // War
	});

	it("getPhaseCultTier reflects current phase", () => {
		expect(getPhaseCultTier()).toBe(1);
		gamePhaseSystem(900);
		expect(getPhaseCultTier()).toBe(2);
		gamePhaseSystem(1200);
		expect(getPhaseCultTier()).toBe(3);
	});

	it("isBuildingUnlockedInCurrentPhase checks current phase", () => {
		expect(isBuildingUnlockedInCurrentPhase("lightning_rod")).toBe(true);
		expect(isBuildingUnlockedInCurrentPhase("fabrication_unit")).toBe(false);

		gamePhaseSystem(900); // → Expansion
		expect(isBuildingUnlockedInCurrentPhase("fabrication_unit")).toBe(true);
		expect(isBuildingUnlockedInCurrentPhase("sensor_tower")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetPhaseState", () => {
	it("resets all phase state to initial values", () => {
		gamePhaseSystem(900); // → Expansion
		recordRoomCleared();
		recordRoomCleared();

		resetPhaseState();

		expect(getCurrentGamePhase()).toBe("awakening");
		expect(getPhaseElapsedSec()).toBe(0);
		expect(getRoomsCleared()).toBe(0);
		expect(popTransitionText()).toBeNull();
	});
});
