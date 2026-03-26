/**
 * Tests for the game phase system.
 *
 * Covers phase progression (Awakening → Expansion → War),
 * trigger-based transitions (city exit, cult tier 3, time fallbacks),
 * phase transition IDs, building/Mark tier gating, and state reset.
 *
 * Dependencies on ECS world state (isInsideCityBounds, getCurrentTierLevel)
 * are mocked so tests can control trigger conditions directly.
 */

import type { Entity } from "koota";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getNextPhase,
	isBuildingUnlocked,
	isMarkTierAvailable,
	PHASE_DEFS,
} from "../../config/phaseDefs";
import {
	EntityId,
	Faction,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { world } from "../../ecs/world";

// Mock cityLayout so we can control isInsideCityBounds
vi.mock("../../ecs/cityLayout", () => ({
	isInsideCityBounds: vi.fn(() => true),
}));

// Mock cultEscalation so we can control getCurrentTierLevel
vi.mock("../cultEscalation", () => ({
	getCurrentTierLevel: vi.fn(() => 1),
}));

import { isInsideCityBounds } from "../../ecs/cityLayout";
import { getCurrentTierLevel } from "../cultEscalation";
import {
	gamePhaseSystem,
	getCurrentGamePhase,
	getCurrentPhaseDisplayName,
	getMaxMarkTier,
	getPhaseCultTier,
	getPhaseElapsedSec,
	getRoomsCleared,
	isBuildingUnlockedInCurrentPhase,
	popPhaseTransitionId,
	popTransitionText,
	recordRoomCleared,
	resetPhaseState,
} from "../gamePhases";

const entities: Entity[] = [];

function spawnPlayerUnit(x: number, z: number): Entity {
	const e = world.spawn(
		EntityId({ value: `unit_${entities.length}` }),
		Position({ x, y: 0, z }),
		Faction({ value: "player" }),
		Unit({
			unitType: "maintenance_bot",
			displayName: `Bot ${entities.length}`,
			speed: 3,
			selected: false,
		}),
		UnitComponents({
			componentsJson: JSON.stringify([
				{ name: "camera", functional: true, material: "electronic" },
			]),
		}),
	);
	entities.push(e);
	return e;
}

beforeEach(() => {
	resetPhaseState();
	vi.mocked(isInsideCityBounds).mockReturnValue(true);
	vi.mocked(getCurrentTierLevel).mockReturnValue(1);
});

afterEach(() => {
	for (const e of entities) {
		if (e.isAlive()) e.destroy();
	}
	entities.length = 0;
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
// Phase state machine — initial state
// ---------------------------------------------------------------------------

describe("gamePhaseSystem — initial state", () => {
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
});

// ---------------------------------------------------------------------------
// Expansion trigger — player unit exits city
// ---------------------------------------------------------------------------

describe("Expansion trigger — city exit", () => {
	it("stays in Awakening when all units are inside city", () => {
		spawnPlayerUnit(50, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(true);

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("awakening");
	});

	it("transitions to Expansion when a player unit exits the city", () => {
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("expansion");
		expect(getCurrentPhaseDisplayName()).toBe("Expansion");
	});

	it("does not transition without player units", () => {
		// No units spawned — nobody can be "outside"
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("awakening");
	});

	it("transitions via time fallback at 900s", () => {
		// All units inside, but enough time passes
		spawnPlayerUnit(50, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(true);

		gamePhaseSystem(899);
		expect(getCurrentGamePhase()).toBe("awakening");

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("expansion");
	});

	it("transitions via rooms cleared threshold", () => {
		spawnPlayerUnit(50, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(true);

		recordRoomCleared();
		recordRoomCleared();
		expect(getRoomsCleared()).toBe(2);

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("awakening");

		recordRoomCleared();
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("expansion");
	});
});

// ---------------------------------------------------------------------------
// War trigger — cult escalation tier 3
// ---------------------------------------------------------------------------

describe("War trigger — cult tier 3", () => {
	function advanceToExpansion() {
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("expansion");
		popPhaseTransitionId(); // consume
	}

	it("stays in Expansion when cult tier < 3", () => {
		advanceToExpansion();
		vi.mocked(getCurrentTierLevel).mockReturnValue(2);

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("expansion");
	});

	it("transitions to War when cult escalation reaches tier 3", () => {
		advanceToExpansion();
		vi.mocked(getCurrentTierLevel).mockReturnValue(3);

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("war");
		expect(getCurrentPhaseDisplayName()).toBe("War");
	});

	it("transitions to War via time fallback at 2100s", () => {
		advanceToExpansion();
		vi.mocked(getCurrentTierLevel).mockReturnValue(1);

		// Advance time so total elapsed >= 2100s (expansion was at ~1s)
		gamePhaseSystem(2098);
		expect(getCurrentGamePhase()).toBe("expansion");

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("war");
	});

	it("does not advance past War", () => {
		advanceToExpansion();
		vi.mocked(getCurrentTierLevel).mockReturnValue(3);
		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("war");

		gamePhaseSystem(10000);
		expect(getCurrentGamePhase()).toBe("war");
	});

	it("does not skip from Awakening to War", () => {
		spawnPlayerUnit(50, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(true);
		vi.mocked(getCurrentTierLevel).mockReturnValue(3);

		gamePhaseSystem(1);
		expect(getCurrentGamePhase()).toBe("awakening");
	});
});

// ---------------------------------------------------------------------------
// Phase transition ID
// ---------------------------------------------------------------------------

describe("popPhaseTransitionId", () => {
	it("returns null when no transition has occurred", () => {
		expect(popPhaseTransitionId()).toBeNull();
	});

	it("returns phase ID after transition to Expansion", () => {
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);

		gamePhaseSystem(1);
		expect(popPhaseTransitionId()).toBe("expansion");
	});

	it("returns phase ID after transition to War", () => {
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		popPhaseTransitionId(); // consume expansion

		vi.mocked(getCurrentTierLevel).mockReturnValue(3);
		gamePhaseSystem(1);
		expect(popPhaseTransitionId()).toBe("war");
	});

	it("returns null on second pop (consumed)", () => {
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		popPhaseTransitionId(); // consume
		expect(popPhaseTransitionId()).toBeNull();
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
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		const text = popTransitionText();
		expect(text).toEqual(PHASE_DEFS.expansion.transitionText);
	});

	it("returns null on second pop (consumed)", () => {
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
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

		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		expect(getMaxMarkTier()).toBe(2); // Expansion

		vi.mocked(getCurrentTierLevel).mockReturnValue(3);
		gamePhaseSystem(1);
		expect(getMaxMarkTier()).toBe(3); // War
	});

	it("getPhaseCultTier reflects current phase", () => {
		expect(getPhaseCultTier()).toBe(1);

		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		expect(getPhaseCultTier()).toBe(2);

		vi.mocked(getCurrentTierLevel).mockReturnValue(3);
		gamePhaseSystem(1);
		expect(getPhaseCultTier()).toBe(3);
	});

	it("isBuildingUnlockedInCurrentPhase checks current phase", () => {
		expect(isBuildingUnlockedInCurrentPhase("lightning_rod")).toBe(true);
		expect(isBuildingUnlockedInCurrentPhase("fabrication_unit")).toBe(false);

		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		expect(isBuildingUnlockedInCurrentPhase("fabrication_unit")).toBe(true);
		expect(isBuildingUnlockedInCurrentPhase("sensor_tower")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetPhaseState", () => {
	it("resets all phase state to initial values", () => {
		spawnPlayerUnit(100, 50);
		vi.mocked(isInsideCityBounds).mockReturnValue(false);
		gamePhaseSystem(1);
		recordRoomCleared();

		resetPhaseState();

		expect(getCurrentGamePhase()).toBe("awakening");
		expect(getPhaseElapsedSec()).toBe(0);
		expect(getRoomsCleared()).toBe(0);
		expect(popPhaseTransitionId()).toBeNull();
		expect(popTransitionText()).toBeNull();
	});
});
