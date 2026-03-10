/**
 * Unit tests for the faction-aware fog of war system.
 *
 * Tests cover:
 * - Visibility state transitions: UNEXPLORED -> EXPLORED -> VISIBLE
 * - Unit reveal radius (circular vision in world units)
 * - Fog decay: VISIBLE -> EXPLORED when units leave range
 * - Permanent visibility via territory marking
 * - Faction-aware isolation (each faction has independent fog)
 * - Edge cases: grid boundaries, overlapping vision, per-unit ranges
 * - Texture data mapping (0 / 128 / 255)
 * - Reset, dispose, dirty flag helpers
 */

import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import {
	DEFAULT_VISION_RANGE,
	EXPLORED,
	GRID_CELLS,
	GRID_RESOLUTION,
	UNEXPLORED,
	VISIBLE,
	clearTerritory,
	disposeAllFogTextures,
	disposeFogTexture,
	getFogTexture,
	getVisibility,
	isFogDirty,
	resetFogOfWar,
	setTerritory,
	updateFogOfWar,
} from "../fogOfWar";
import type { FactionId } from "../../../ecs/traits/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vec3(x: number, y: number, z: number): THREE.Vector3 {
	return new THREE.Vector3(x, y, z);
}

const FACTION_A: FactionId = "player";
const FACTION_B: FactionId = "volt_collective";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

afterEach(() => {
	disposeAllFogTextures();
});

// ---------------------------------------------------------------------------
// Config constants sanity check
// ---------------------------------------------------------------------------

describe("config constants", () => {
	it("GRID_RESOLUTION is a positive number", () => {
		expect(GRID_RESOLUTION).toBeGreaterThan(0);
	});

	it("DEFAULT_VISION_RANGE is a positive number", () => {
		expect(DEFAULT_VISION_RANGE).toBeGreaterThan(0);
	});

	it("GRID_CELLS matches world size / grid resolution", () => {
		// GRID_CELLS = Math.ceil(WORLD_SIZE / GRID_RESOLUTION)
		// We just verify it's a reasonable positive integer.
		expect(GRID_CELLS).toBeGreaterThan(0);
		expect(Number.isInteger(GRID_CELLS)).toBe(true);
	});

	it("visibility state constants have expected values", () => {
		expect(UNEXPLORED).toBe(0);
		expect(EXPLORED).toBe(1);
		expect(VISIBLE).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Visibility state transitions
// ---------------------------------------------------------------------------

describe("visibility state transitions", () => {
	it("all cells start as UNEXPLORED", () => {
		// Before any update, querying any position returns UNEXPLORED.
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(UNEXPLORED);
		expect(getVisibility(FACTION_A, { x: 10, z: 10 })).toBe(UNEXPLORED);
	});

	it("cells within unit vision become VISIBLE after update", () => {
		const unitPos = vec3(0, 0, 0);
		updateFogOfWar(FACTION_A, [unitPos], 10);

		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
		// A point well within range
		expect(getVisibility(FACTION_A, { x: 2, z: 2 })).toBe(VISIBLE);
	});

	it("cells outside vision range remain UNEXPLORED", () => {
		const unitPos = vec3(0, 0, 0);
		updateFogOfWar(FACTION_A, [unitPos], 5);

		// A point far outside 5-unit range
		expect(getVisibility(FACTION_A, { x: 50, z: 50 })).toBe(UNEXPLORED);
	});

	it("VISIBLE cells decay to EXPLORED when unit moves away", () => {
		const pos1 = vec3(0, 0, 0);
		updateFogOfWar(FACTION_A, [pos1], 5);

		// Center should be VISIBLE
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);

		// Move unit far away — cells near origin should decay to EXPLORED
		const pos2 = vec3(80, 0, 80);
		updateFogOfWar(FACTION_A, [pos2], 5);

		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(EXPLORED);
	});

	it("EXPLORED cells never decay back to UNEXPLORED", () => {
		// Reveal some cells
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 5);

		// Move away — now EXPLORED
		updateFogOfWar(FACTION_A, [vec3(80, 0, 80)], 5);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(EXPLORED);

		// Move somewhere else entirely — still EXPLORED, not UNEXPLORED
		updateFogOfWar(FACTION_A, [vec3(-80, 0, -80)], 5);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(EXPLORED);
	});

	it("EXPLORED cells return to VISIBLE when unit re-enters range", () => {
		// Reveal
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 5);
		// Move away -> EXPLORED
		updateFogOfWar(FACTION_A, [vec3(80, 0, 80)], 5);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(EXPLORED);

		// Move back -> VISIBLE again
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 5);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
	});
});

// ---------------------------------------------------------------------------
// Unit reveal radius
// ---------------------------------------------------------------------------

describe("unit reveal radius", () => {
	it("reveals cells in a circular pattern", () => {
		const range = 10;
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], range);

		// Cells at exact range boundary (along axis) — at distance exactly range
		// The circular check uses worldDx^2 + worldDz^2 > range^2 to exclude,
		// so cells at exactly range distance are excluded. Cells just inside should be VISIBLE.
		// 8 units away < 10 range
		expect(getVisibility(FACTION_A, { x: 8, z: 0 })).toBe(VISIBLE);

		// Diagonal at sqrt(8^2 + 8^2) = ~11.3 > 10 range — should NOT be visible
		expect(getVisibility(FACTION_A, { x: 8, z: 8 })).toBe(UNEXPLORED);

		// Diagonal at sqrt(6^2 + 6^2) = ~8.5 < 10 range — should be visible
		expect(getVisibility(FACTION_A, { x: 6, z: 6 })).toBe(VISIBLE);
	});

	it("supports per-unit vision range overrides", () => {
		const positions = [vec3(0, 0, 0), vec3(40, 0, 40)];
		const ranges = [5, 20]; // First unit short range, second long range

		updateFogOfWar(FACTION_A, positions, DEFAULT_VISION_RANGE, ranges);

		// Near first unit (range 5): 3 units away should be visible
		expect(getVisibility(FACTION_A, { x: 3, z: 0 })).toBe(VISIBLE);
		// Near first unit: 7 units away should NOT be visible (beyond range 5)
		expect(getVisibility(FACTION_A, { x: 7, z: 0 })).toBe(UNEXPLORED);

		// Near second unit (range 20): 15 units away should be visible
		expect(getVisibility(FACTION_A, { x: 40, z: 55 })).toBe(VISIBLE);
	});

	it("uses default vision range when no per-unit overrides given", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 12);

		// 10 units away < 12 range
		expect(getVisibility(FACTION_A, { x: 10, z: 0 })).toBe(VISIBLE);
	});
});

// ---------------------------------------------------------------------------
// Overlapping vision
// ---------------------------------------------------------------------------

describe("overlapping vision", () => {
	it("multiple units extend the revealed area", () => {
		const positions = [vec3(-20, 0, 0), vec3(20, 0, 0)];
		updateFogOfWar(FACTION_A, positions, 10);

		// Near first unit
		expect(getVisibility(FACTION_A, { x: -20, z: 0 })).toBe(VISIBLE);
		// Near second unit
		expect(getVisibility(FACTION_A, { x: 20, z: 0 })).toBe(VISIBLE);
		// Midpoint — both units are 20 away, beyond 10 range
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(UNEXPLORED);
	});

	it("overlapping vision circles still produce VISIBLE (idempotent)", () => {
		// Two units close together with overlapping vision
		const positions = [vec3(0, 0, 0), vec3(2, 0, 0)];
		updateFogOfWar(FACTION_A, positions, 10);

		// The center area is covered by both — should still be VISIBLE
		expect(getVisibility(FACTION_A, { x: 1, z: 0 })).toBe(VISIBLE);
	});
});

// ---------------------------------------------------------------------------
// Territory — permanent visibility
// ---------------------------------------------------------------------------

describe("territory", () => {
	it("territory cells are always VISIBLE even without units", () => {
		setTerritory(FACTION_A, -5, -5, 5, 5);
		updateFogOfWar(FACTION_A, [], 10); // No units!

		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
		expect(getVisibility(FACTION_A, { x: 3, z: 3 })).toBe(VISIBLE);
	});

	it("territory cells remain VISIBLE after units leave", () => {
		setTerritory(FACTION_A, -5, -5, 5, 5);
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);

		// Move unit away
		updateFogOfWar(FACTION_A, [vec3(80, 0, 80)], 10);

		// Territory cells should remain VISIBLE (not decay to EXPLORED)
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
	});

	it("non-territory cells still decay when units leave", () => {
		setTerritory(FACTION_A, -5, -5, 5, 5);
		// Reveal a cell outside territory
		updateFogOfWar(FACTION_A, [vec3(30, 0, 30)], 5);
		expect(getVisibility(FACTION_A, { x: 30, z: 30 })).toBe(VISIBLE);

		// Move unit away — non-territory cell should decay
		updateFogOfWar(FACTION_A, [vec3(-80, 0, -80)], 5);
		expect(getVisibility(FACTION_A, { x: 30, z: 30 })).toBe(EXPLORED);
	});

	it("clearTerritory removes permanent visibility", () => {
		setTerritory(FACTION_A, -5, -5, 5, 5);
		updateFogOfWar(FACTION_A, [], 10);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);

		clearTerritory(FACTION_A, -5, -5, 5, 5);
		// After next update with no units, territory cells should decay
		updateFogOfWar(FACTION_A, [], 10);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(EXPLORED);
	});

	it("clearTerritory on unknown faction is a no-op", () => {
		// Should not throw
		expect(() =>
			clearTerritory("signal_choir" as FactionId, -5, -5, 5, 5),
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Faction-aware visibility (isolation)
// ---------------------------------------------------------------------------

describe("faction-aware visibility", () => {
	it("each faction has independent fog state", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);
		updateFogOfWar(FACTION_B, [vec3(40, 0, 40)], 10);

		// Faction A sees (0,0) but not (40,40)
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
		expect(getVisibility(FACTION_A, { x: 40, z: 40 })).toBe(UNEXPLORED);

		// Faction B sees (40,40) but not (0,0)
		expect(getVisibility(FACTION_B, { x: 40, z: 40 })).toBe(VISIBLE);
		expect(getVisibility(FACTION_B, { x: 0, z: 0 })).toBe(UNEXPLORED);
	});

	it("territory is faction-specific", () => {
		setTerritory(FACTION_A, -5, -5, 5, 5);
		updateFogOfWar(FACTION_A, [], 10);
		updateFogOfWar(FACTION_B, [], 10);

		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
		expect(getVisibility(FACTION_B, { x: 0, z: 0 })).toBe(UNEXPLORED);
	});

	it("resetting one faction does not affect another", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);
		updateFogOfWar(FACTION_B, [vec3(0, 0, 0)], 10);

		resetFogOfWar(FACTION_A);

		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(UNEXPLORED);
		expect(getVisibility(FACTION_B, { x: 0, z: 0 })).toBe(VISIBLE);
	});
});

// ---------------------------------------------------------------------------
// Grid boundary edge cases
// ---------------------------------------------------------------------------

describe("grid boundaries", () => {
	it("positions outside world bounds return UNEXPLORED", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);

		// Way outside the world
		expect(getVisibility(FACTION_A, { x: 9999, z: 9999 })).toBe(UNEXPLORED);
		expect(getVisibility(FACTION_A, { x: -9999, z: -9999 })).toBe(
			UNEXPLORED,
		);
	});

	it("units near world edges reveal only valid cells (no crash)", () => {
		// Place unit near the edge of the world. WORLD_HALF=100, so near boundary.
		expect(() => {
			updateFogOfWar(FACTION_A, [vec3(95, 0, 95)], 20);
		}).not.toThrow();

		// Cells within the world near the unit should be visible
		expect(getVisibility(FACTION_A, { x: 95, z: 95 })).toBe(VISIBLE);
	});

	it("units outside world bounds do not crash", () => {
		expect(() => {
			updateFogOfWar(FACTION_A, [vec3(500, 0, 500)], 10);
		}).not.toThrow();
	});

	it("empty unit array does not crash", () => {
		expect(() => {
			updateFogOfWar(FACTION_A, [], 10);
		}).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Texture data mapping
// ---------------------------------------------------------------------------

describe("texture data", () => {
	it("getFogTexture returns a THREE.DataTexture", () => {
		const tex = getFogTexture(FACTION_A);
		expect(tex).toBeInstanceOf(THREE.DataTexture);
	});

	it("texture data maps UNEXPLORED=0, EXPLORED=128, VISIBLE=255", () => {
		// Reveal some cells, then move away so they become EXPLORED
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 5);
		updateFogOfWar(FACTION_A, [vec3(80, 0, 80)], 5);

		const tex = getFogTexture(FACTION_A);
		const data = tex.image.data as Uint8Array;

		// Find a VISIBLE cell (near 80,80)
		// Find an EXPLORED cell (near 0,0)
		// Find an UNEXPLORED cell (far from both)

		// We just verify the data array contains the expected values.
		const hasVisible = Array.from(data).some((v) => v === 255);
		const hasExplored = Array.from(data).some((v) => v === 128);
		const hasUnexplored = Array.from(data).some((v) => v === 0);

		expect(hasVisible).toBe(true);
		expect(hasExplored).toBe(true);
		expect(hasUnexplored).toBe(true);
	});

	it("getFogTexture creates state for new faction on first call", () => {
		// A new faction that has never been updated
		const tex = getFogTexture("iron_creed" as FactionId);
		expect(tex).toBeInstanceOf(THREE.DataTexture);
	});
});

// ---------------------------------------------------------------------------
// Dirty flag
// ---------------------------------------------------------------------------

describe("dirty flag", () => {
	it("isFogDirty returns false for unknown faction", () => {
		expect(isFogDirty("signal_choir" as FactionId)).toBe(false);
	});

	it("isFogDirty returns true after update, then resets", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);

		expect(isFogDirty(FACTION_A)).toBe(true);
		// Second call should return false (flag was consumed)
		expect(isFogDirty(FACTION_A)).toBe(false);
	});

	it("getFogTexture sets dirty flag on initial creation", () => {
		getFogTexture(FACTION_A);
		expect(isFogDirty(FACTION_A)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// resetFogOfWar
// ---------------------------------------------------------------------------

describe("resetFogOfWar", () => {
	it("clears all visibility to UNEXPLORED", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 20);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);

		resetFogOfWar(FACTION_A);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(UNEXPLORED);
	});

	it("clears territory data", () => {
		setTerritory(FACTION_A, -5, -5, 5, 5);
		updateFogOfWar(FACTION_A, [], 10);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);

		resetFogOfWar(FACTION_A);
		// Territory should be cleared — updating with no units should leave UNEXPLORED
		updateFogOfWar(FACTION_A, [], 10);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(UNEXPLORED);
	});

	it("is a no-op for unknown faction", () => {
		expect(() =>
			resetFogOfWar("reclaimers" as FactionId),
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// disposeFogTexture / disposeAllFogTextures
// ---------------------------------------------------------------------------

describe("dispose", () => {
	it("disposeFogTexture removes faction state", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);
		disposeFogTexture(FACTION_A);

		// After dispose, visibility queries return UNEXPLORED (no state)
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(UNEXPLORED);
	});

	it("disposeFogTexture is a no-op for unknown faction", () => {
		expect(() =>
			disposeFogTexture("reclaimers" as FactionId),
		).not.toThrow();
	});

	it("disposeAllFogTextures clears all factions", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);
		updateFogOfWar(FACTION_B, [vec3(0, 0, 0)], 10);

		disposeAllFogTextures();

		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(UNEXPLORED);
		expect(getVisibility(FACTION_B, { x: 0, z: 0 })).toBe(UNEXPLORED);
	});
});

// ---------------------------------------------------------------------------
// getVisibility edge cases
// ---------------------------------------------------------------------------

describe("getVisibility edge cases", () => {
	it("returns UNEXPLORED for a faction with no state", () => {
		expect(getVisibility("reclaimers" as FactionId, { x: 0, z: 0 })).toBe(
			UNEXPLORED,
		);
	});

	it("returns UNEXPLORED for out-of-bounds position even if faction has state", () => {
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 10);
		expect(getVisibility(FACTION_A, { x: 99999, z: 99999 })).toBe(
			UNEXPLORED,
		);
	});
});

// ---------------------------------------------------------------------------
// Full scenario: multi-tick simulation
// ---------------------------------------------------------------------------

describe("multi-tick simulation", () => {
	it("tracks a unit moving across the map over multiple ticks", () => {
		// Tick 1: Unit at origin
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 8);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);

		// Tick 2: Unit moves to (20, 0, 0)
		updateFogOfWar(FACTION_A, [vec3(20, 0, 0)], 8);
		expect(getVisibility(FACTION_A, { x: 20, z: 0 })).toBe(VISIBLE);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(EXPLORED);

		// Tick 3: Unit moves to (40, 0, 0)
		updateFogOfWar(FACTION_A, [vec3(40, 0, 0)], 8);
		expect(getVisibility(FACTION_A, { x: 40, z: 0 })).toBe(VISIBLE);
		expect(getVisibility(FACTION_A, { x: 20, z: 0 })).toBe(EXPLORED);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(EXPLORED);
	});

	it("territory area remains VISIBLE throughout movement", () => {
		setTerritory(FACTION_A, -3, -3, 3, 3);

		// Tick 1: Unit near territory, with large range to also reveal non-territory cells
		updateFogOfWar(FACTION_A, [vec3(0, 0, 0)], 15);
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
		// A non-territory cell within vision range but outside territory
		expect(getVisibility(FACTION_A, { x: 8, z: 0 })).toBe(VISIBLE);

		// Tick 2: Unit moves far away
		updateFogOfWar(FACTION_A, [vec3(60, 0, 60)], 15);
		// Territory stays VISIBLE
		expect(getVisibility(FACTION_A, { x: 0, z: 0 })).toBe(VISIBLE);
		// Non-territory cell near origin decays to EXPLORED
		expect(getVisibility(FACTION_A, { x: 8, z: 0 })).toBe(EXPLORED);
	});
});
