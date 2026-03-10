/**
 * Unit tests for the decoy pile system.
 *
 * Tests cover:
 * - Creating decoy piles with correct defaults
 * - Removing decoy piles
 * - Listing all decoys and filtering by faction
 * - Checking if a pile ID is a decoy
 * - Spatial query (getDecoyAtPosition)
 * - Durability damage and destruction
 * - Per-faction effectiveness degradation via AI inspections
 * - Edge cases: invalid IDs, zero radius, multiple factions
 * - reset() for test isolation
 */

import {
	createDecoyPile,
	removeDecoyPile,
	getDecoyPiles,
	getDecoyPilesByFaction,
	isDecoy,
	getDecoyAtPosition,
	updateDecoyDurability,
	getDecoyEffectiveness,
	recordAIInspection,
	reset,
} from "../decoyPile";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// createDecoyPile
// ---------------------------------------------------------------------------

describe("createDecoyPile", () => {
	it("creates a decoy and returns a unique ID", () => {
		const id = createDecoyPile(
			{ x: 10, y: 0, z: 20 },
			"iron",
			5,
			"reclaimers",
		);
		expect(id).toBeDefined();
		expect(typeof id).toBe("string");
	});

	it("assigns unique IDs to each decoy", () => {
		const id1 = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		const id2 = createDecoyPile({ x: 5, y: 0, z: 5 }, "copper", 4, "reclaimers");
		const id3 = createDecoyPile({ x: 10, y: 0, z: 10 }, "iron", 2, "volt_collective");
		expect(new Set([id1, id2, id3]).size).toBe(3);
	});

	it("stores the correct properties on the decoy", () => {
		createDecoyPile({ x: 7, y: 3, z: 11 }, "rare_alloy", 8, "signal_choir");
		const decoys = getDecoyPiles();
		expect(decoys.length).toBe(1);

		const d = decoys[0];
		expect(d.position).toEqual({ x: 7, y: 3, z: 11 });
		expect(d.materialType).toBe("rare_alloy");
		expect(d.visualCount).toBe(8);
		expect(d.ownerFaction).toBe("signal_choir");
		expect(d.durability).toBe(50);
	});

	it("stores a copy of position, not a reference", () => {
		const pos = { x: 5, y: 0, z: 5 };
		createDecoyPile(pos, "iron", 3, "reclaimers");
		pos.x = 999;

		const decoys = getDecoyPiles();
		expect(decoys[0].position.x).toBe(5);
	});

	it("floors and clamps visualCount to at least 1", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 0.5, "reclaimers");
		// floor(0.5) = 0, clamped to 1
		expect(getDecoyPiles()[0].visualCount).toBe(1);
	});

	it("floors fractional visualCount values", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 7.9, "reclaimers");
		expect(getDecoyPiles()[0].visualCount).toBe(7);
	});

	it("initializes with full durability of 50", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 5, "reclaimers");
		expect(getDecoyPiles()[0].durability).toBe(50);
	});
});

// ---------------------------------------------------------------------------
// removeDecoyPile
// ---------------------------------------------------------------------------

describe("removeDecoyPile", () => {
	it("removes an existing decoy and returns true", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		const removed = removeDecoyPile(id);
		expect(removed).toBe(true);
		expect(getDecoyPiles().length).toBe(0);
	});

	it("returns false for a nonexistent ID", () => {
		expect(removeDecoyPile("nonexistent")).toBe(false);
	});

	it("only removes the targeted decoy, leaving others intact", () => {
		const id1 = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		createDecoyPile({ x: 10, y: 0, z: 10 }, "copper", 5, "reclaimers");
		removeDecoyPile(id1);

		expect(getDecoyPiles().length).toBe(1);
		expect(getDecoyPiles()[0].materialType).toBe("copper");
	});
});

// ---------------------------------------------------------------------------
// getDecoyPiles
// ---------------------------------------------------------------------------

describe("getDecoyPiles", () => {
	it("returns empty array when no decoys exist", () => {
		expect(getDecoyPiles()).toEqual([]);
	});

	it("returns all created decoys", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		createDecoyPile({ x: 5, y: 0, z: 5 }, "copper", 4, "volt_collective");
		createDecoyPile({ x: 10, y: 0, z: 10 }, "iron", 2, "signal_choir");

		expect(getDecoyPiles().length).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// getDecoyPilesByFaction
// ---------------------------------------------------------------------------

describe("getDecoyPilesByFaction", () => {
	it("returns only decoys belonging to the specified faction", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		createDecoyPile({ x: 5, y: 0, z: 5 }, "copper", 4, "volt_collective");
		createDecoyPile({ x: 10, y: 0, z: 10 }, "iron", 2, "reclaimers");

		const reclaimerDecoys = getDecoyPilesByFaction("reclaimers");
		expect(reclaimerDecoys.length).toBe(2);
		expect(reclaimerDecoys.every((d) => d.ownerFaction === "reclaimers")).toBe(true);
	});

	it("returns empty array for a faction with no decoys", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		expect(getDecoyPilesByFaction("iron_creed")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// isDecoy
// ---------------------------------------------------------------------------

describe("isDecoy", () => {
	it("returns true for a decoy pile ID", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		expect(isDecoy(id)).toBe(true);
	});

	it("returns false for a non-decoy ID", () => {
		expect(isDecoy("real_pile_42")).toBe(false);
	});

	it("returns false after a decoy is removed", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		removeDecoyPile(id);
		expect(isDecoy(id)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getDecoyAtPosition
// ---------------------------------------------------------------------------

describe("getDecoyAtPosition", () => {
	it("finds a decoy within the search radius", () => {
		createDecoyPile({ x: 5, y: 0, z: 5 }, "iron", 3, "reclaimers");
		const found = getDecoyAtPosition({ x: 6, y: 0, z: 6 }, 3);
		expect(found).not.toBeNull();
		expect(found!.materialType).toBe("iron");
	});

	it("returns null when no decoy is within radius", () => {
		createDecoyPile({ x: 100, y: 0, z: 100 }, "iron", 3, "reclaimers");
		expect(getDecoyAtPosition({ x: 0, y: 0, z: 0 }, 5)).toBeNull();
	});

	it("returns the nearest decoy when multiple are in range", () => {
		createDecoyPile({ x: 10, y: 0, z: 10 }, "copper", 4, "reclaimers");
		createDecoyPile({ x: 2, y: 0, z: 2 }, "iron", 3, "reclaimers");
		const found = getDecoyAtPosition({ x: 3, y: 0, z: 3 }, 20);
		expect(found).not.toBeNull();
		expect(found!.materialType).toBe("iron");
	});

	it("returns null when there are no decoys", () => {
		expect(getDecoyAtPosition({ x: 0, y: 0, z: 0 }, 100)).toBeNull();
	});

	it("considers Y distance in radius check", () => {
		createDecoyPile({ x: 0, y: 50, z: 0 }, "iron", 3, "reclaimers");
		expect(getDecoyAtPosition({ x: 0, y: 0, z: 0 }, 10)).toBeNull();
	});

	it("finds a decoy at exactly the search position", () => {
		createDecoyPile({ x: 5, y: 5, z: 5 }, "iron", 3, "reclaimers");
		const found = getDecoyAtPosition({ x: 5, y: 5, z: 5 }, 1);
		expect(found).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// updateDecoyDurability
// ---------------------------------------------------------------------------

describe("updateDecoyDurability", () => {
	it("reduces durability by the damage amount", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		const remaining = updateDecoyDurability(id, 15);
		expect(remaining).toBe(35);
	});

	it("destroys and removes the decoy when durability reaches 0", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		const remaining = updateDecoyDurability(id, 50);
		expect(remaining).toBe(0);
		expect(isDecoy(id)).toBe(false);
		expect(getDecoyPiles().length).toBe(0);
	});

	it("destroys the decoy when damage exceeds remaining durability", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		const remaining = updateDecoyDurability(id, 999);
		expect(remaining).toBe(0);
		expect(isDecoy(id)).toBe(false);
	});

	it("returns -1 for a nonexistent decoy ID", () => {
		expect(updateDecoyDurability("nonexistent", 10)).toBe(-1);
	});

	it("handles multiple damage applications correctly", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		expect(updateDecoyDurability(id, 10)).toBe(40);
		expect(updateDecoyDurability(id, 15)).toBe(25);
		expect(updateDecoyDurability(id, 20)).toBe(5);
		expect(updateDecoyDurability(id, 5)).toBe(0);
		// Now destroyed
		expect(isDecoy(id)).toBe(false);
	});

	it("treats negative damage as positive (absolute value)", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		const remaining = updateDecoyDurability(id, -20);
		expect(remaining).toBe(30);
	});

	it("does not reduce durability below 0", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		updateDecoyDurability(id, 30);
		const remaining = updateDecoyDurability(id, 30);
		// 50 - 30 = 20, then 20 - 30 = clamped to 0, destroyed
		expect(remaining).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getDecoyEffectiveness
// ---------------------------------------------------------------------------

describe("getDecoyEffectiveness", () => {
	it("returns 1.0 for a new decoy with no inspections (no faction specified)", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		expect(getDecoyEffectiveness(id)).toBe(1.0);
	});

	it("returns 1.0 for a faction that has not inspected the decoy", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		expect(getDecoyEffectiveness(id, "volt_collective")).toBe(1.0);
	});

	it("returns -1 for a nonexistent decoy", () => {
		expect(getDecoyEffectiveness("nonexistent")).toBe(-1);
		expect(getDecoyEffectiveness("nonexistent", "reclaimers")).toBe(-1);
	});

	it("returns reduced effectiveness after inspections for a specific faction", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		recordAIInspection(id, "volt_collective");
		expect(getDecoyEffectiveness(id, "volt_collective")).toBeCloseTo(0.8);
	});

	it("returns average effectiveness across all inspecting factions when no faction specified", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		recordAIInspection(id, "volt_collective"); // 0.8
		recordAIInspection(id, "signal_choir"); // 0.8
		recordAIInspection(id, "signal_choir"); // 0.6
		// volt: 0.8, signal: 0.6, average = 0.7
		expect(getDecoyEffectiveness(id)).toBeCloseTo(0.7);
	});
});

// ---------------------------------------------------------------------------
// recordAIInspection
// ---------------------------------------------------------------------------

describe("recordAIInspection", () => {
	it("drops effectiveness by 0.2 per inspection", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		expect(recordAIInspection(id, "volt_collective")).toBeCloseTo(0.8);
		expect(recordAIInspection(id, "volt_collective")).toBeCloseTo(0.6);
		expect(recordAIInspection(id, "volt_collective")).toBeCloseTo(0.4);
		expect(recordAIInspection(id, "volt_collective")).toBeCloseTo(0.2);
		expect(recordAIInspection(id, "volt_collective")).toBeCloseTo(0.0);
	});

	it("clamps effectiveness at 0 and does not go negative", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		// 5 inspections → 0
		for (let i = 0; i < 5; i++) {
			recordAIInspection(id, "volt_collective");
		}
		// 6th inspection should still be 0
		expect(recordAIInspection(id, "volt_collective")).toBe(0);
	});

	it("tracks effectiveness independently per faction", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		recordAIInspection(id, "volt_collective");
		recordAIInspection(id, "volt_collective");
		recordAIInspection(id, "signal_choir");

		expect(getDecoyEffectiveness(id, "volt_collective")).toBeCloseTo(0.6);
		expect(getDecoyEffectiveness(id, "signal_choir")).toBeCloseTo(0.8);
		// iron_creed hasn't inspected at all
		expect(getDecoyEffectiveness(id, "iron_creed")).toBe(1.0);
	});

	it("returns -1 for a nonexistent decoy", () => {
		expect(recordAIInspection("nonexistent", "volt_collective")).toBe(-1);
	});

	it("does not affect other decoys", () => {
		const id1 = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		const id2 = createDecoyPile({ x: 10, y: 0, z: 10 }, "copper", 5, "reclaimers");
		recordAIInspection(id1, "volt_collective");
		recordAIInspection(id1, "volt_collective");

		expect(getDecoyEffectiveness(id1, "volt_collective")).toBeCloseTo(0.6);
		expect(getDecoyEffectiveness(id2, "volt_collective")).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all decoys", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		createDecoyPile({ x: 5, y: 0, z: 5 }, "copper", 4, "volt_collective");
		reset();
		expect(getDecoyPiles()).toEqual([]);
	});

	it("resets ID counter so IDs start fresh", () => {
		const id1 = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		reset();
		const id2 = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		expect(id1).toBe(id2);
	});

	it("allows fresh registration after reset", () => {
		createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		reset();
		createDecoyPile({ x: 5, y: 5, z: 5 }, "copper", 7, "signal_choir");

		const decoys = getDecoyPiles();
		expect(decoys.length).toBe(1);
		expect(decoys[0].materialType).toBe("copper");
		expect(decoys[0].ownerFaction).toBe("signal_choir");
	});
});

// ---------------------------------------------------------------------------
// Edge cases and integration
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles zero-radius spatial query (exact position match only)", () => {
		createDecoyPile({ x: 5, y: 0, z: 5 }, "iron", 3, "reclaimers");
		// Exact match with radius 0
		const found = getDecoyAtPosition({ x: 5, y: 0, z: 5 }, 0);
		expect(found).not.toBeNull();

		// Slightly off with radius 0
		const notFound = getDecoyAtPosition({ x: 5.1, y: 0, z: 5 }, 0);
		expect(notFound).toBeNull();
	});

	it("handles negative coordinates", () => {
		const id = createDecoyPile({ x: -10, y: -5, z: -20 }, "iron", 3, "reclaimers");
		const found = getDecoyAtPosition({ x: -10, y: -5, z: -20 }, 1);
		expect(found).not.toBeNull();
		expect(found!.id).toBe(id);
	});

	it("decoy destroyed by damage is not found by spatial query", () => {
		createDecoyPile({ x: 5, y: 0, z: 5 }, "iron", 3, "reclaimers");
		const decoys = getDecoyPiles();
		const id = decoys[0].id;

		updateDecoyDurability(id, 50); // destroy it
		expect(getDecoyAtPosition({ x: 5, y: 0, z: 5 }, 10)).toBeNull();
	});

	it("effectiveness persists across multiple queries", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		recordAIInspection(id, "volt_collective");
		recordAIInspection(id, "volt_collective");
		recordAIInspection(id, "volt_collective");

		// Query multiple times — value should remain stable
		const eff1 = getDecoyEffectiveness(id, "volt_collective");
		const eff2 = getDecoyEffectiveness(id, "volt_collective");
		expect(eff1).toBeCloseTo(0.4);
		expect(eff1).toBe(eff2);
	});

	it("handles many decoys across multiple factions", () => {
		const factions = ["reclaimers", "volt_collective", "signal_choir", "iron_creed"];
		const materials = ["iron", "copper", "scrap_iron", "rare_alloy"];

		for (let i = 0; i < 20; i++) {
			createDecoyPile(
				{ x: i * 10, y: 0, z: i * 10 },
				materials[i % materials.length],
				i + 1,
				factions[i % factions.length],
			);
		}

		expect(getDecoyPiles().length).toBe(20);
		expect(getDecoyPilesByFaction("reclaimers").length).toBe(5);
		expect(getDecoyPilesByFaction("volt_collective").length).toBe(5);
		expect(getDecoyPilesByFaction("signal_choir").length).toBe(5);
		expect(getDecoyPilesByFaction("iron_creed").length).toBe(5);
	});

	it("five inspections fully drain effectiveness to zero", () => {
		const id = createDecoyPile({ x: 0, y: 0, z: 0 }, "iron", 3, "reclaimers");
		for (let i = 0; i < 5; i++) {
			recordAIInspection(id, "volt_collective");
		}
		expect(getDecoyEffectiveness(id, "volt_collective")).toBe(0);
	});
});
