/**
 * Unit tests for the structural collapse system.
 *
 * Tests cover:
 * - Block registration and lookup
 * - Ground-level stability
 * - Stacking and vertical support
 * - Collapse cascades (1-deep, 2-deep, 3+ deep)
 * - Damage → destroy → collapse integration
 * - Connected structure flood-fill
 * - Structural integrity scoring
 * - Edge cases: isolated blocks, L-shaped walls, bridges, gaps
 */

import {
	applyDamageToBlock,
	checkStability,
	getBlockAt,
	getBlockHP,
	getBlocksAbove,
	getCollapseChain,
	getConnectedStructure,
	getStructuralIntegrity,
	registerBlock,
	removeBlock,
	reset,
	simulateCollapse,
} from "../structuralCollapse";

// ---------------------------------------------------------------------------
// Setup — reset all state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand position. */
function pos(x: number, y: number, z: number) {
	return { x, y, z };
}

// ---------------------------------------------------------------------------
// Block registration
// ---------------------------------------------------------------------------

describe("registerBlock", () => {
	it("registers a block and retrieves it by position", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		const block = getBlockAt(pos(0, 0, 0));
		expect(block).toBeDefined();
		expect(block!.blockId).toBe("b1");
		expect(block!.materialType).toBe("iron");
	});

	it("snaps position to 0.5m grid", () => {
		registerBlock("b1", pos(0.27, 0.74, 1.1), "iron");
		// 0.27 snaps to 0.5, 0.74 snaps to 0.5, 1.1 snaps to 1.0
		const block = getBlockAt(pos(0.5, 0.5, 1.0));
		expect(block).toBeDefined();
		expect(block!.blockId).toBe("b1");
	});

	it("assigns correct HP for known materials", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		expect(getBlockHP("b1")).toBe(60);

		registerBlock("b2", pos(0.5, 0, 0), "scrap_iron");
		expect(getBlockHP("b2")).toBe(30);

		registerBlock("b3", pos(1.0, 0, 0), "copper");
		expect(getBlockHP("b3")).toBe(40);

		registerBlock("b4", pos(1.5, 0, 0), "e_waste");
		expect(getBlockHP("b4")).toBe(15);

		registerBlock("b5", pos(2.0, 0, 0), "fiber_optics");
		expect(getBlockHP("b5")).toBe(10);

		registerBlock("b6", pos(2.5, 0, 0), "rare_alloy");
		expect(getBlockHP("b6")).toBe(100);
	});

	it("assigns default HP (30) for unknown materials", () => {
		registerBlock("b1", pos(0, 0, 0), "unobtanium");
		expect(getBlockHP("b1")).toBe(30);
	});

	it("overwrites an existing block with the same ID", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0.5, 0, 0), "copper");
		const block = getBlockAt(pos(0.5, 0, 0));
		expect(block).toBeDefined();
		expect(block!.materialType).toBe("copper");
	});

	it("returns undefined for unoccupied position", () => {
		expect(getBlockAt(pos(5, 5, 5))).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getBlockHP
// ---------------------------------------------------------------------------

describe("getBlockHP", () => {
	it("returns -1 for nonexistent block", () => {
		expect(getBlockHP("nope")).toBe(-1);
	});

	it("returns current HP after registration", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		expect(getBlockHP("b1")).toBe(60);
	});
});

// ---------------------------------------------------------------------------
// Ground-level stability
// ---------------------------------------------------------------------------

describe("checkStability — ground level", () => {
	it("block at y=0 is always stable", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		expect(checkStability("b1")).toBe(true);
	});

	it("isolated block at y=0 is stable (no neighbors needed)", () => {
		registerBlock("b1", pos(10, 0, 10), "scrap_iron");
		expect(checkStability("b1")).toBe(true);
	});

	it("returns false for nonexistent block", () => {
		expect(checkStability("nope")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Stacking and vertical support
// ---------------------------------------------------------------------------

describe("checkStability — stacking", () => {
	it("block above a ground block is stable", () => {
		registerBlock("base", pos(0, 0, 0), "iron");
		registerBlock("top", pos(0, 0.5, 0), "iron");
		expect(checkStability("top")).toBe(true);
	});

	it("block above an empty space is unstable", () => {
		registerBlock("floating", pos(0, 0.5, 0), "iron");
		expect(checkStability("floating")).toBe(false);
	});

	it("three-high stack is fully stable", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		registerBlock("b2", pos(0, 1.0, 0), "iron");
		expect(checkStability("b0")).toBe(true);
		expect(checkStability("b1")).toBe(true);
		expect(checkStability("b2")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getBlocksAbove
// ---------------------------------------------------------------------------

describe("getBlocksAbove", () => {
	it("returns block directly above", () => {
		registerBlock("base", pos(0, 0, 0), "iron");
		registerBlock("top", pos(0, 0.5, 0), "iron");
		const above = getBlocksAbove("base");
		expect(above).toHaveLength(1);
		expect(above[0].blockId).toBe("top");
	});

	it("returns empty array when nothing above", () => {
		registerBlock("lone", pos(0, 0, 0), "iron");
		expect(getBlocksAbove("lone")).toHaveLength(0);
	});

	it("returns empty array for nonexistent block", () => {
		expect(getBlocksAbove("nope")).toHaveLength(0);
	});

	it("does not return diagonally adjacent blocks", () => {
		registerBlock("base", pos(0, 0, 0), "iron");
		registerBlock("diag", pos(0.5, 0.5, 0), "iron");
		expect(getBlocksAbove("base")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// removeBlock — basic
// ---------------------------------------------------------------------------

describe("removeBlock", () => {
	it("removes block from state", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		removeBlock("b1");
		expect(getBlockAt(pos(0, 0, 0))).toBeUndefined();
		expect(getBlockHP("b1")).toBe(-1);
	});

	it("returns empty array when no collapse occurs", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		const collapsed = removeBlock("b1");
		expect(collapsed).toEqual([]);
	});

	it("returns empty array for nonexistent block", () => {
		expect(removeBlock("nope")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Collapse cascades
// ---------------------------------------------------------------------------

describe("collapse cascades", () => {
	it("1-deep: removing base collapses block above", () => {
		registerBlock("base", pos(0, 0, 0), "iron");
		registerBlock("top", pos(0, 0.5, 0), "iron");

		const collapsed = removeBlock("base");
		expect(collapsed).toContain("top");
		expect(getBlockAt(pos(0, 0.5, 0))).toBeUndefined();
	});

	it("2-deep: removing base collapses two blocks above", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		registerBlock("b2", pos(0, 1.0, 0), "iron");

		const collapsed = removeBlock("b0");
		expect(collapsed).toHaveLength(2);
		expect(collapsed).toContain("b1");
		expect(collapsed).toContain("b2");
	});

	it("3-deep: removing base collapses entire tower", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		registerBlock("b2", pos(0, 1.0, 0), "iron");
		registerBlock("b3", pos(0, 1.5, 0), "iron");

		const collapsed = removeBlock("b0");
		expect(collapsed).toHaveLength(3);
		expect(collapsed).toContain("b1");
		expect(collapsed).toContain("b2");
		expect(collapsed).toContain("b3");
	});

	it("removing middle block collapses only blocks above", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		registerBlock("b2", pos(0, 1.0, 0), "iron");

		const collapsed = removeBlock("b1");
		expect(collapsed).toContain("b2");
		expect(collapsed).not.toContain("b0");
		// Base should still exist
		expect(getBlockAt(pos(0, 0, 0))).toBeDefined();
	});

	it("removing top block causes no collapse", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");

		const collapsed = removeBlock("b1");
		expect(collapsed).toHaveLength(0);
		expect(getBlockAt(pos(0, 0, 0))).toBeDefined();
	});

	it("adjacent columns are independent — removing one does not affect the other", () => {
		// Column 1
		registerBlock("a0", pos(0, 0, 0), "iron");
		registerBlock("a1", pos(0, 0.5, 0), "iron");
		// Column 2
		registerBlock("b0", pos(0.5, 0, 0), "iron");
		registerBlock("b1", pos(0.5, 0.5, 0), "iron");

		const collapsed = removeBlock("a0");
		expect(collapsed).toContain("a1");
		// Column 2 untouched
		expect(getBlockAt(pos(0.5, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(0.5, 0.5, 0))).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// simulateCollapse (non-destructive preview)
// ---------------------------------------------------------------------------

describe("simulateCollapse", () => {
	it("previews collapse without modifying state", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");

		const preview = simulateCollapse("b0");
		expect(preview).toContain("b1");

		// State unchanged
		expect(getBlockAt(pos(0, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(0, 0.5, 0))).toBeDefined();
	});

	it("returns empty for nonexistent block", () => {
		expect(simulateCollapse("nope")).toEqual([]);
	});

	it("returns empty when removing a top block", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		expect(simulateCollapse("b1")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getCollapseChain (alias for simulateCollapse)
// ---------------------------------------------------------------------------

describe("getCollapseChain", () => {
	it("is equivalent to simulateCollapse", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		registerBlock("b2", pos(0, 1.0, 0), "iron");

		const chain = getCollapseChain("b0");
		expect(chain).toContain("b1");
		expect(chain).toContain("b2");

		// State unchanged
		expect(getBlockHP("b0")).toBe(60);
		expect(getBlockHP("b1")).toBe(60);
		expect(getBlockHP("b2")).toBe(60);
	});
});

// ---------------------------------------------------------------------------
// Damage → destroy → collapse integration
// ---------------------------------------------------------------------------

describe("applyDamageToBlock", () => {
	it("reduces HP without destroying", () => {
		registerBlock("b1", pos(0, 0, 0), "iron"); // 60 HP
		const result = applyDamageToBlock("b1", 20);
		expect(result.destroyed).toBe(false);
		expect(result.remainingHp).toBe(40);
		expect(result.collapsed).toEqual([]);
	});

	it("destroys block at exactly 0 HP", () => {
		registerBlock("b1", pos(0, 0, 0), "iron"); // 60 HP
		const result = applyDamageToBlock("b1", 60);
		expect(result.destroyed).toBe(true);
		expect(result.remainingHp).toBe(0);
		expect(getBlockAt(pos(0, 0, 0))).toBeUndefined();
	});

	it("destroys block when overkill damage applied", () => {
		registerBlock("b1", pos(0, 0, 0), "e_waste"); // 15 HP
		const result = applyDamageToBlock("b1", 999);
		expect(result.destroyed).toBe(true);
		expect(result.remainingHp).toBe(0);
	});

	it("destroying foundation triggers collapse of blocks above", () => {
		registerBlock("base", pos(0, 0, 0), "e_waste"); // 15 HP
		registerBlock("mid", pos(0, 0.5, 0), "iron");
		registerBlock("top", pos(0, 1.0, 0), "iron");

		const result = applyDamageToBlock("base", 15);
		expect(result.destroyed).toBe(true);
		expect(result.collapsed).toContain("mid");
		expect(result.collapsed).toContain("top");
	});

	it("returns no-op for nonexistent block", () => {
		const result = applyDamageToBlock("nope", 10);
		expect(result.destroyed).toBe(false);
		expect(result.remainingHp).toBe(0);
		expect(result.collapsed).toEqual([]);
	});

	it("multiple damage calls accumulate", () => {
		registerBlock("b1", pos(0, 0, 0), "copper"); // 40 HP
		applyDamageToBlock("b1", 10);
		expect(getBlockHP("b1")).toBe(30);
		applyDamageToBlock("b1", 10);
		expect(getBlockHP("b1")).toBe(20);
		const result = applyDamageToBlock("b1", 20);
		expect(result.destroyed).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Connected structure (flood-fill)
// ---------------------------------------------------------------------------

describe("getConnectedStructure", () => {
	it("single block returns itself", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		const connected = getConnectedStructure("b1");
		expect(connected).toEqual(["b1"]);
	});

	it("vertical stack is one connected structure", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		registerBlock("b2", pos(0, 1.0, 0), "iron");
		const connected = getConnectedStructure("b0");
		expect(connected).toHaveLength(3);
		expect(connected).toContain("b0");
		expect(connected).toContain("b1");
		expect(connected).toContain("b2");
	});

	it("horizontal row is one connected structure", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0.5, 0, 0), "iron");
		registerBlock("b2", pos(1.0, 0, 0), "iron");
		const connected = getConnectedStructure("b1");
		expect(connected).toHaveLength(3);
	});

	it("L-shaped wall is one connected structure", () => {
		// Horizontal segment
		registerBlock("h0", pos(0, 0, 0), "iron");
		registerBlock("h1", pos(0.5, 0, 0), "iron");
		registerBlock("h2", pos(1.0, 0, 0), "iron");
		// Vertical segment (connected at h2)
		registerBlock("v1", pos(1.0, 0, 0.5), "iron");
		registerBlock("v2", pos(1.0, 0, 1.0), "iron");

		const connected = getConnectedStructure("h0");
		expect(connected).toHaveLength(5);
	});

	it("two separate structures are not connected", () => {
		registerBlock("a0", pos(0, 0, 0), "iron");
		registerBlock("a1", pos(0.5, 0, 0), "iron");

		registerBlock("b0", pos(5, 0, 5), "iron");
		registerBlock("b1", pos(5.5, 0, 5), "iron");

		const connectedA = getConnectedStructure("a0");
		expect(connectedA).toHaveLength(2);
		expect(connectedA).not.toContain("b0");
		expect(connectedA).not.toContain("b1");

		const connectedB = getConnectedStructure("b0");
		expect(connectedB).toHaveLength(2);
		expect(connectedB).not.toContain("a0");
	});

	it("diagonal blocks are NOT connected (face-adjacency only)", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0.5, 0.5, 0), "iron"); // diagonal
		const connected = getConnectedStructure("b0");
		expect(connected).toHaveLength(1);
	});

	it("returns empty array for nonexistent block", () => {
		expect(getConnectedStructure("nope")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Structural integrity
// ---------------------------------------------------------------------------

describe("getStructuralIntegrity", () => {
	it("ground-level block has integrity 1.0", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		expect(getStructuralIntegrity("b0")).toBe(1.0);
	});

	it("one layer up has integrity 0.9", () => {
		registerBlock("b0", pos(0, 0, 0), "iron");
		registerBlock("b1", pos(0, 0.5, 0), "iron");
		expect(getStructuralIntegrity("b1")).toBe(0.9);
	});

	it("five layers up has integrity 0.5", () => {
		for (let i = 0; i <= 5; i++) {
			registerBlock(`b${i}`, pos(0, i * 0.5, 0), "iron");
		}
		expect(getStructuralIntegrity("b5")).toBe(0.5);
	});

	it("ten layers up has integrity 0.0", () => {
		for (let i = 0; i <= 10; i++) {
			registerBlock(`b${i}`, pos(0, i * 0.5, 0), "iron");
		}
		expect(getStructuralIntegrity("b10")).toBe(0.0);
	});

	it("integrity never goes below 0", () => {
		for (let i = 0; i <= 15; i++) {
			registerBlock(`b${i}`, pos(0, i * 0.5, 0), "iron");
		}
		expect(getStructuralIntegrity("b15")).toBe(0.0);
	});

	it("unsupported block has integrity 0.0", () => {
		registerBlock("floating", pos(0, 0.5, 0), "iron");
		expect(getStructuralIntegrity("floating")).toBe(0.0);
	});

	it("returns 0 for nonexistent block", () => {
		expect(getStructuralIntegrity("nope")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("bridge: removing center pillar collapses only its column", () => {
		// Two pillars with a bridge block spanning between them
		// Pillar A
		registerBlock("a0", pos(0, 0, 0), "iron");
		registerBlock("a1", pos(0, 0.5, 0), "iron");
		// Pillar B
		registerBlock("b0", pos(1.0, 0, 0), "iron");
		registerBlock("b1", pos(1.0, 0.5, 0), "iron");
		// Bridge block at y=0.5 between them (x=0.5)
		registerBlock("bridge", pos(0.5, 0.5, 0), "iron");

		// Bridge has ground support via side adjacency? No — support is
		// only vertical (y - 0.5). Bridge has no block below at (0.5, 0, 0).
		expect(checkStability("bridge")).toBe(false);
	});

	it("bridge with foundation is stable", () => {
		registerBlock("f0", pos(0.5, 0, 0), "iron"); // foundation for bridge
		registerBlock("bridge", pos(0.5, 0.5, 0), "iron");
		expect(checkStability("bridge")).toBe(true);
	});

	it("removing one ground block in a row does not affect neighbors", () => {
		registerBlock("g0", pos(0, 0, 0), "iron");
		registerBlock("g1", pos(0.5, 0, 0), "iron");
		registerBlock("g2", pos(1.0, 0, 0), "iron");

		const collapsed = removeBlock("g1");
		expect(collapsed).toHaveLength(0);
		expect(getBlockAt(pos(0, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(1.0, 0, 0))).toBeDefined();
	});

	it("reset clears all state", () => {
		registerBlock("b1", pos(0, 0, 0), "iron");
		registerBlock("b2", pos(0, 0.5, 0), "iron");
		reset();
		expect(getBlockAt(pos(0, 0, 0))).toBeUndefined();
		expect(getBlockHP("b1")).toBe(-1);
		expect(getBlockHP("b2")).toBe(-1);
	});

	it("large wall collapse: 5-wide, 3-tall wall loses entire column", () => {
		// Build a 5-wide, 3-tall wall along X axis
		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 3; y++) {
				registerBlock(`w_${x}_${y}`, pos(x * 0.5, y * 0.5, 0), "iron");
			}
		}

		// Remove the base of the middle column
		const collapsed = removeBlock("w_2_0");
		// Should collapse the 2 blocks above (y=0.5 and y=1.0 at x=1.0)
		expect(collapsed).toContain("w_2_1");
		expect(collapsed).toContain("w_2_2");
		expect(collapsed).toHaveLength(2);

		// Adjacent columns should still stand
		expect(getBlockAt(pos(0.5, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(0.5, 0.5, 0))).toBeDefined();
		expect(getBlockAt(pos(0.5, 1.0, 0))).toBeDefined();
	});

	it("T-shaped structure: removing stem base collapses stem only", () => {
		// Stem (vertical)
		registerBlock("s0", pos(1.0, 0, 0), "iron");
		registerBlock("s1", pos(1.0, 0.5, 0), "iron");
		// Crossbar at y=0 (independently grounded)
		registerBlock("c0", pos(0, 0, 0), "iron");
		registerBlock("c1", pos(0.5, 0, 0), "iron");
		registerBlock("c2", pos(1.5, 0, 0), "iron");
		registerBlock("c3", pos(2.0, 0, 0), "iron");

		const collapsed = removeBlock("s0");
		expect(collapsed).toContain("s1");
		// Crossbar blocks are all at y=0, so they stay
		expect(getBlockAt(pos(0, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(0.5, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(1.5, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(2.0, 0, 0))).toBeDefined();
	});

	it("weak material wall is easier to breach than strong material", () => {
		registerBlock("weak", pos(0, 0, 0), "fiber_optics"); // 10 HP
		registerBlock("strong", pos(0.5, 0, 0), "rare_alloy"); // 100 HP

		applyDamageToBlock("weak", 10);
		expect(getBlockAt(pos(0, 0, 0))).toBeUndefined(); // destroyed

		applyDamageToBlock("strong", 10);
		expect(getBlockHP("strong")).toBe(90); // still standing
	});

	it("simultaneous damage to multiple foundation blocks cascades correctly", () => {
		// Two independent towers
		registerBlock("t1_0", pos(0, 0, 0), "e_waste"); // 15 HP
		registerBlock("t1_1", pos(0, 0.5, 0), "iron");

		registerBlock("t2_0", pos(2, 0, 0), "e_waste"); // 15 HP
		registerBlock("t2_1", pos(2, 0.5, 0), "iron");

		// Destroy tower 1 base
		const r1 = applyDamageToBlock("t1_0", 15);
		expect(r1.destroyed).toBe(true);
		expect(r1.collapsed).toContain("t1_1");

		// Tower 2 still intact
		expect(getBlockAt(pos(2, 0, 0))).toBeDefined();
		expect(getBlockAt(pos(2, 0.5, 0))).toBeDefined();

		// Now destroy tower 2 base
		const r2 = applyDamageToBlock("t2_0", 15);
		expect(r2.destroyed).toBe(true);
		expect(r2.collapsed).toContain("t2_1");
	});
});
