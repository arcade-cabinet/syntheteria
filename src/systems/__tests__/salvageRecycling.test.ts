/**
 * Unit tests for the Salvage & Recycling system.
 *
 * Tests cover:
 * - Registration and unregistration of salvageable entities
 * - Full salvage lifecycle (start → update → complete)
 * - Partial cancellation with correct material return
 * - Recovery rate queries and tech-tree upgrades
 * - Time calculations (2s per cube)
 * - Edge cases: empty cost, unknown materials, double salvage attempts
 * - History tracking
 * - Module reset for test isolation
 */

import {
	cancelSalvage,
	completeSalvage,
	getRecoveryRate,
	getSalvageHistory,
	getSalvageProgress,
	getSalvageableEntities,
	registerSalvageable,
	reset,
	startSalvage,
	unregisterSalvageable,
	updateSalvage,
	upgradeRecoveryRate,
} from "../salvageRecycling";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("registerSalvageable", () => {
	it("registers an entity with material cost", () => {
		const result = registerSalvageable("bldg_1", { iron: 3, copper: 1 });

		expect(result).toBe(true);
		expect(getSalvageableEntities()).toHaveLength(1);
		expect(getSalvageableEntities()[0]).toEqual({
			entityId: "bldg_1",
			materialCost: { iron: 3, copper: 1 },
		});
	});

	it("returns false if entity is already registered", () => {
		registerSalvageable("bldg_1", { iron: 3 });

		const result = registerSalvageable("bldg_1", { iron: 5 });

		expect(result).toBe(false);
		// Original cost should be unchanged
		expect(getSalvageableEntities()[0].materialCost).toEqual({ iron: 3 });
	});

	it("stores a defensive copy of material cost", () => {
		const cost = { iron: 3, copper: 1 };
		registerSalvageable("bldg_1", cost);

		cost.iron = 999;

		expect(getSalvageableEntities()[0].materialCost.iron).toBe(3);
	});

	it("registers entity with empty material cost", () => {
		const result = registerSalvageable("bldg_empty", {});

		expect(result).toBe(true);
		expect(getSalvageableEntities()[0].materialCost).toEqual({});
	});
});

describe("unregisterSalvageable", () => {
	it("removes a registered entity", () => {
		registerSalvageable("bldg_1", { iron: 3 });

		const result = unregisterSalvageable("bldg_1");

		expect(result).toBe(true);
		expect(getSalvageableEntities()).toHaveLength(0);
	});

	it("returns false for unregistered entity", () => {
		const result = unregisterSalvageable("nonexistent");

		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getSalvageableEntities
// ---------------------------------------------------------------------------

describe("getSalvageableEntities", () => {
	it("returns empty array when nothing registered", () => {
		expect(getSalvageableEntities()).toEqual([]);
	});

	it("returns all registered entities", () => {
		registerSalvageable("a", { iron: 1 });
		registerSalvageable("b", { copper: 2 });
		registerSalvageable("c", { e_waste: 3 });

		expect(getSalvageableEntities()).toHaveLength(3);
	});

	it("returns defensive copies of material costs", () => {
		registerSalvageable("bldg_1", { iron: 3 });

		const entities = getSalvageableEntities();
		entities[0].materialCost.iron = 999;

		expect(getSalvageableEntities()[0].materialCost.iron).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Recovery rates
// ---------------------------------------------------------------------------

describe("getRecoveryRate", () => {
	it("returns base rate for scrap_iron (0.8)", () => {
		expect(getRecoveryRate("scrap_iron")).toBe(0.8);
	});

	it("returns base rate for iron (0.6)", () => {
		expect(getRecoveryRate("iron")).toBe(0.6);
	});

	it("returns base rate for copper (0.7)", () => {
		expect(getRecoveryRate("copper")).toBe(0.7);
	});

	it("returns base rate for e_waste (0.9)", () => {
		expect(getRecoveryRate("e_waste")).toBe(0.9);
	});

	it("returns base rate for fiber_optics (0.4)", () => {
		expect(getRecoveryRate("fiber_optics")).toBe(0.4);
	});

	it("returns base rate for rare_alloy (0.5)", () => {
		expect(getRecoveryRate("rare_alloy")).toBe(0.5);
	});

	it("returns default 0.5 for unknown material types", () => {
		expect(getRecoveryRate("unobtanium")).toBe(0.5);
	});
});

describe("upgradeRecoveryRate", () => {
	it("increases recovery rate by bonus amount", () => {
		const newRate = upgradeRecoveryRate("iron", 0.1);

		expect(newRate).toBeCloseTo(0.7);
		expect(getRecoveryRate("iron")).toBeCloseTo(0.7);
	});

	it("stacks multiple upgrades", () => {
		upgradeRecoveryRate("iron", 0.1);
		const newRate = upgradeRecoveryRate("iron", 0.1);

		expect(newRate).toBeCloseTo(0.8);
	});

	it("caps cumulative bonus at 0.3", () => {
		upgradeRecoveryRate("iron", 0.2);
		const newRate = upgradeRecoveryRate("iron", 0.2);

		// base 0.6 + capped bonus 0.3 = 0.9
		expect(newRate).toBeCloseTo(0.9);
	});

	it("caps total effective rate at 1.0", () => {
		// scrap_iron base is 0.8, max bonus 0.3 would give 1.1 but capped at 1.0
		upgradeRecoveryRate("scrap_iron", 0.3);

		expect(getRecoveryRate("scrap_iron")).toBe(1.0);
	});

	it("works for unknown material types (base 0.5)", () => {
		const newRate = upgradeRecoveryRate("unobtanium", 0.2);

		expect(newRate).toBeCloseTo(0.7);
	});
});

// ---------------------------------------------------------------------------
// Time calculations
// ---------------------------------------------------------------------------

describe("salvage time calculations", () => {
	it("computes 2 seconds per cube in material cost", () => {
		registerSalvageable("bldg_1", { iron: 3, copper: 1 });

		const time = startSalvage("bldg_1", "player");

		// 4 cubes total * 2s = 8s
		expect(time).toBe(8);
	});

	it("returns 0 for empty material cost", () => {
		registerSalvageable("bldg_empty", {});

		const time = startSalvage("bldg_empty", "player");

		expect(time).toBe(0);
	});

	it("sums cubes across all material types", () => {
		registerSalvageable("bldg_big", {
			iron: 5,
			copper: 3,
			e_waste: 2,
		});

		const time = startSalvage("bldg_big", "player");

		// 10 cubes * 2s = 20s
		expect(time).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// startSalvage
// ---------------------------------------------------------------------------

describe("startSalvage", () => {
	it("returns estimated time on success", () => {
		registerSalvageable("bldg_1", { iron: 3 });

		const time = startSalvage("bldg_1", "player");

		expect(time).toBe(6);
	});

	it("returns null for unregistered entity", () => {
		const time = startSalvage("nonexistent", "player");

		expect(time).toBeNull();
	});

	it("returns null if salvage already in progress", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");

		const time = startSalvage("bldg_1", "bot_1");

		expect(time).toBeNull();
	});

	it("creates a progress entry at 0%", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");

		const progress = getSalvageProgress("bldg_1");

		expect(progress).not.toBeNull();
		expect(progress!.progress).toBe(0);
		expect(progress!.timeRemaining).toBe(6);
		expect(progress!.materialsRecovered).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// updateSalvage
// ---------------------------------------------------------------------------

describe("updateSalvage", () => {
	it("advances progress by delta seconds", () => {
		registerSalvageable("bldg_1", { iron: 5 });
		startSalvage("bldg_1", "player");

		updateSalvage("bldg_1", 5);

		const progress = getSalvageProgress("bldg_1");
		expect(progress!.progress).toBe(0.5);
		expect(progress!.timeRemaining).toBe(5);
	});

	it("returns null for entity not being salvaged", () => {
		const result = updateSalvage("nonexistent", 1);

		expect(result).toBeNull();
	});

	it("returns partial materials as progress advances", () => {
		// 10 iron cubes, recovery rate 0.6
		// Full recovery = floor(10 * 0.6) = 6 iron
		registerSalvageable("bldg_1", { iron: 10 });
		startSalvage("bldg_1", "player");

		// Advance to 50%: floor(10 * 0.6 * 0.5) = floor(3) = 3
		const result = updateSalvage("bldg_1", 10); // 20s total, 10s = 50%

		expect(result).not.toBeNull();
		expect(result!.complete).toBe(false);
		expect(result!.materialsReturned).toEqual({ iron: 3 });
	});

	it("completes when elapsed reaches total time", () => {
		registerSalvageable("bldg_1", { iron: 2 });
		startSalvage("bldg_1", "player");

		const result = updateSalvage("bldg_1", 4); // 4s total

		expect(result!.complete).toBe(true);
	});

	it("completes when elapsed exceeds total time", () => {
		registerSalvageable("bldg_1", { iron: 2 });
		startSalvage("bldg_1", "player");

		const result = updateSalvage("bldg_1", 100);

		expect(result!.complete).toBe(true);
	});

	it("removes entity from registry on completion", () => {
		registerSalvageable("bldg_1", { iron: 1 });
		startSalvage("bldg_1", "player");

		updateSalvage("bldg_1", 2);

		expect(getSalvageableEntities()).toHaveLength(0);
		expect(getSalvageProgress("bldg_1")).toBeNull();
	});

	it("returns incremental materials across multiple updates", () => {
		// 10 copper cubes, recovery rate 0.7
		// Full = floor(10 * 0.7) = 7
		registerSalvageable("bldg_1", { copper: 10 });
		startSalvage("bldg_1", "player");
		// Total time = 20s

		// At 25% (5s): floor(10 * 0.7 * 0.25) = floor(1.75) = 1
		const r1 = updateSalvage("bldg_1", 5);
		expect(r1!.materialsReturned).toEqual({ copper: 1 });

		// At 50% (10s): floor(10 * 0.7 * 0.5) = floor(3.5) = 3
		// Already returned 1, so diff = 2
		const r2 = updateSalvage("bldg_1", 5);
		expect(r2!.materialsReturned).toEqual({ copper: 2 });
	});
});

// ---------------------------------------------------------------------------
// cancelSalvage
// ---------------------------------------------------------------------------

describe("cancelSalvage", () => {
	it("returns materials already recovered", () => {
		registerSalvageable("bldg_1", { iron: 10 });
		startSalvage("bldg_1", "player");
		// Total time = 20s. Advance to 50%.
		updateSalvage("bldg_1", 10);

		const returned = cancelSalvage("bldg_1");

		// At 50%: floor(10 * 0.6 * 0.5) = floor(3) = 3
		expect(returned).toEqual({ iron: 3 });
	});

	it("returns null for entity not being salvaged", () => {
		const result = cancelSalvage("nonexistent");

		expect(result).toBeNull();
	});

	it("stops the salvage operation", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");

		cancelSalvage("bldg_1");

		expect(getSalvageProgress("bldg_1")).toBeNull();
	});

	it("keeps the entity registered for future salvage attempts", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");

		cancelSalvage("bldg_1");

		// Entity is still salvageable
		expect(getSalvageableEntities()).toHaveLength(1);

		// Can start salvage again
		const time = startSalvage("bldg_1", "player");
		expect(time).toBe(6);
	});

	it("returns empty map if cancelled before any progress", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");

		const returned = cancelSalvage("bldg_1");

		expect(returned).toEqual({});
	});

	it("records cancellation in history", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");
		updateSalvage("bldg_1", 3);

		cancelSalvage("bldg_1");

		const history = getSalvageHistory();
		expect(history).toHaveLength(1);
		expect(history[0].completedFully).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getSalvageProgress
// ---------------------------------------------------------------------------

describe("getSalvageProgress", () => {
	it("returns null for entity not being salvaged", () => {
		expect(getSalvageProgress("nonexistent")).toBeNull();
	});

	it("returns correct progress snapshot mid-salvage", () => {
		registerSalvageable("bldg_1", { iron: 5, copper: 5 });
		startSalvage("bldg_1", "player");
		// Total cubes = 10, time = 20s
		updateSalvage("bldg_1", 10); // 50%

		const progress = getSalvageProgress("bldg_1");

		expect(progress).not.toBeNull();
		expect(progress!.progress).toBeCloseTo(0.5);
		expect(progress!.timeRemaining).toBeCloseTo(10);
	});

	it("returns defensive copy of materialsRecovered", () => {
		registerSalvageable("bldg_1", { iron: 10 });
		startSalvage("bldg_1", "player");
		updateSalvage("bldg_1", 10);

		const progress = getSalvageProgress("bldg_1");
		progress!.materialsRecovered.iron = 999;

		const progress2 = getSalvageProgress("bldg_1");
		expect(progress2!.materialsRecovered.iron).not.toBe(999);
	});
});

// ---------------------------------------------------------------------------
// completeSalvage (manual finalization)
// ---------------------------------------------------------------------------

describe("completeSalvage", () => {
	it("returns full recovery at progress=1.0 rates", () => {
		// 10 iron at 0.6 rate = floor(6) = 6
		registerSalvageable("bldg_1", { iron: 10 });
		startSalvage("bldg_1", "player");

		const result = completeSalvage("bldg_1");

		expect(result).toEqual({ iron: 6 });
	});

	it("returns null for entity not being salvaged", () => {
		expect(completeSalvage("nonexistent")).toBeNull();
	});

	it("removes entity from registry", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");

		completeSalvage("bldg_1");

		expect(getSalvageableEntities()).toHaveLength(0);
		expect(getSalvageProgress("bldg_1")).toBeNull();
	});

	it("records completion in history", () => {
		registerSalvageable("bldg_1", { iron: 3 });
		startSalvage("bldg_1", "player");

		completeSalvage("bldg_1");

		const history = getSalvageHistory();
		expect(history).toHaveLength(1);
		expect(history[0].completedFully).toBe(true);
		expect(history[0].entityId).toBe("bldg_1");
	});

	it("returns full recovery for multiple material types", () => {
		registerSalvageable("bldg_1", {
			scrap_iron: 10, // rate 0.8 -> floor(8) = 8
			copper: 5, // rate 0.7 -> floor(3.5) = 3
			fiber_optics: 3, // rate 0.4 -> floor(1.2) = 1
		});
		startSalvage("bldg_1", "player");

		const result = completeSalvage("bldg_1");

		expect(result).toEqual({
			scrap_iron: 8,
			copper: 3,
			fiber_optics: 1,
		});
	});
});

// ---------------------------------------------------------------------------
// Full lifecycle
// ---------------------------------------------------------------------------

describe("full salvage lifecycle", () => {
	it("register → start → update to completion → history recorded", () => {
		registerSalvageable("wall_1", { scrap_iron: 4 });
		const time = startSalvage("wall_1", "player");
		expect(time).toBe(8); // 4 cubes * 2s

		// Advance to completion
		const result = updateSalvage("wall_1", 8);

		expect(result!.complete).toBe(true);
		// scrap_iron rate 0.8: floor(4 * 0.8 * 1.0) = 3
		expect(result!.materialsReturned.scrap_iron).toBe(3);

		expect(getSalvageHistory()).toHaveLength(1);
		expect(getSalvageHistory()[0].completedFully).toBe(true);
	});

	it("handles entity with zero-cost (instant salvage)", () => {
		registerSalvageable("bldg_empty", {});
		const time = startSalvage("bldg_empty", "player");
		expect(time).toBe(0);

		// Even a tiny update should complete it
		const result = updateSalvage("bldg_empty", 0.01);
		expect(result!.complete).toBe(true);
		expect(result!.materialsReturned).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("unknown material types use default rate 0.5", () => {
		registerSalvageable("bldg_1", { unobtanium: 10 });
		startSalvage("bldg_1", "player");

		const result = completeSalvage("bldg_1");

		// default rate 0.5: floor(10 * 0.5) = 5
		expect(result).toEqual({ unobtanium: 5 });
	});

	it("recovery rate upgrades affect salvage calculations", () => {
		upgradeRecoveryRate("iron", 0.2); // 0.6 + 0.2 = 0.8

		registerSalvageable("bldg_1", { iron: 10 });
		startSalvage("bldg_1", "player");

		const result = completeSalvage("bldg_1");

		expect(result).toEqual({ iron: 8 }); // floor(10 * 0.8)
	});

	it("materials with 1 cube and low rate return 0", () => {
		registerSalvageable("bldg_1", { fiber_optics: 1 });
		startSalvage("bldg_1", "player");

		const result = completeSalvage("bldg_1");

		// floor(1 * 0.4) = 0, so fiber_optics key should not appear
		expect(result).toEqual({});
	});

	it("cannot update salvage after it completes via updateSalvage", () => {
		registerSalvageable("bldg_1", { iron: 1 });
		startSalvage("bldg_1", "player");
		updateSalvage("bldg_1", 2); // completes

		const result = updateSalvage("bldg_1", 1);

		expect(result).toBeNull();
	});

	it("cannot start salvage on an entity that was already fully salvaged", () => {
		registerSalvageable("bldg_1", { iron: 1 });
		startSalvage("bldg_1", "player");
		updateSalvage("bldg_1", 2); // completes, removes from registry

		const time = startSalvage("bldg_1", "player");

		expect(time).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

describe("getSalvageHistory", () => {
	it("returns empty array initially", () => {
		expect(getSalvageHistory()).toEqual([]);
	});

	it("tracks multiple salvage operations in order", () => {
		registerSalvageable("a", { iron: 1 });
		registerSalvageable("b", { copper: 1 });

		startSalvage("a", "player");
		completeSalvage("a");

		startSalvage("b", "player");
		completeSalvage("b");

		const history = getSalvageHistory();
		expect(history).toHaveLength(2);
		expect(history[0].entityId).toBe("a");
		expect(history[1].entityId).toBe("b");
		expect(history[0].timestamp).toBeLessThan(history[1].timestamp);
	});

	it("returns defensive copies", () => {
		registerSalvageable("a", { iron: 3 });
		startSalvage("a", "player");
		completeSalvage("a");

		const history = getSalvageHistory();
		history[0].materialsRecovered.iron = 999;

		expect(getSalvageHistory()[0].materialsRecovered.iron).not.toBe(999);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all registered salvageables", () => {
		registerSalvageable("a", { iron: 1 });
		registerSalvageable("b", { copper: 2 });

		reset();

		expect(getSalvageableEntities()).toEqual([]);
	});

	it("clears active salvage operations", () => {
		registerSalvageable("a", { iron: 1 });
		startSalvage("a", "player");

		reset();

		expect(getSalvageProgress("a")).toBeNull();
	});

	it("clears recovery rate upgrades", () => {
		upgradeRecoveryRate("iron", 0.2);

		reset();

		expect(getRecoveryRate("iron")).toBe(0.6); // back to base
	});

	it("clears salvage history", () => {
		registerSalvageable("a", { iron: 1 });
		startSalvage("a", "player");
		completeSalvage("a");

		reset();

		expect(getSalvageHistory()).toEqual([]);
	});
});
