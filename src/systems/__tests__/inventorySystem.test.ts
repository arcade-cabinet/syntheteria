/**
 * Unit tests for the inventory system.
 *
 * Tests cover:
 * - Creating and destroying inventories
 * - addItem: basic add, auto-stacking, partial fills, invalid inputs
 * - removeItem: basic removal, multi-stack removal, insufficient quantity
 * - getInventory: returns snapshots (copies)
 * - hasItem: threshold checks
 * - getItemCount: across multiple stacks
 * - transferItem: success, rollback on failure, missing inventories
 * - Weight system: getTotalWeight, getSpeedMultiplier
 * - Query helpers: getFreeSlots, isInventoryFull
 * - Item defs: registerItemDef, getItemDef
 * - Reset clears all state
 */

import {
	type AddItemResult,
	type BotInventory,
	type ItemDef,
	_resetInventoryState,
	addItem,
	createInventory,
	destroyInventory,
	getFreeSlots,
	getInventory,
	getItemCount,
	getItemDef,
	getSpeedMultiplier,
	getTotalWeight,
	hasItem,
	isInventoryFull,
	registerItemDef,
	removeItem,
	transferItem,
} from "../inventorySystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetInventoryState();
});

// ---------------------------------------------------------------------------
// createInventory / destroyInventory
// ---------------------------------------------------------------------------

describe("createInventory", () => {
	it("creates an empty inventory with default slot count", () => {
		const inv = createInventory("bot-1");
		expect(inv.botId).toBe("bot-1");
		expect(inv.maxSlots).toBe(8);
		expect(inv.slots).toEqual([]);
	});

	it("creates an inventory with custom slot count", () => {
		const inv = createInventory("bot-2", 4);
		expect(inv.maxSlots).toBe(4);
	});

	it("overwrites existing inventory if called again for same bot", () => {
		createInventory("bot-3", 4);
		addItem("bot-3", "iron", 2);
		createInventory("bot-3", 6);
		expect(getItemCount("bot-3", "iron")).toBe(0);
		expect(getInventory("bot-3")?.maxSlots).toBe(6);
	});
});

describe("destroyInventory", () => {
	it("removes the inventory and returns true", () => {
		createInventory("bot-d");
		expect(destroyInventory("bot-d")).toBe(true);
		expect(getInventory("bot-d")).toBeNull();
	});

	it("returns false for nonexistent inventory", () => {
		expect(destroyInventory("no-such-bot")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------

describe("addItem", () => {
	it("adds a single item to an empty inventory", () => {
		createInventory("bot-a");
		const result = addItem("bot-a", "iron", 1);
		expect(result).toEqual({ success: true, added: 1 });
		expect(getItemCount("bot-a", "iron")).toBe(1);
	});

	it("auto-stacks same item types up to maxStack", () => {
		createInventory("bot-a");
		addItem("bot-a", "iron", 2); // maxStack for iron = 4
		addItem("bot-a", "iron", 2);
		const inv = getInventory("bot-a");
		expect(inv!.slots).toHaveLength(1); // still one slot
		expect(inv!.slots[0].quantity).toBe(4);
	});

	it("creates a new slot when existing stack is full", () => {
		createInventory("bot-a");
		addItem("bot-a", "iron", 4); // fills one stack
		addItem("bot-a", "iron", 1); // needs a new slot
		const inv = getInventory("bot-a");
		expect(inv!.slots).toHaveLength(2);
		expect(inv!.slots[0].quantity).toBe(4);
		expect(inv!.slots[1].quantity).toBe(1);
	});

	it("adds multiple items across multiple new slots", () => {
		createInventory("bot-a", 4);
		const result = addItem("bot-a", "iron", 10);
		// maxStack 4 -> slots: [4, 4, 2] = 3 slots, 10 total
		expect(result).toEqual({ success: true, added: 10 });
		const inv = getInventory("bot-a");
		expect(inv!.slots).toHaveLength(3);
	});

	it("partially adds when inventory is nearly full", () => {
		createInventory("bot-a", 2);
		addItem("bot-a", "iron", 4); // slot 1: full
		addItem("bot-a", "copper", 4); // slot 2: full
		const result = addItem("bot-a", "iron", 3);
		// Both slots full, no room
		expect(result).toEqual({ success: false, added: 0 });
	});

	it("partially fills existing stacks when no new slots available", () => {
		createInventory("bot-a", 1);
		addItem("bot-a", "iron", 3); // slot 1: 3/4
		const result = addItem("bot-a", "iron", 3);
		// Can only add 1 more to the existing stack
		expect(result).toEqual({ success: true, added: 1 });
		expect(getItemCount("bot-a", "iron")).toBe(4);
	});

	it("returns failure for nonexistent inventory", () => {
		const result = addItem("no-bot", "iron", 1);
		expect(result).toEqual({ success: false, added: 0 });
	});

	it("returns failure for zero quantity", () => {
		createInventory("bot-a");
		const result = addItem("bot-a", "iron", 0);
		expect(result).toEqual({ success: false, added: 0 });
	});

	it("returns failure for negative quantity", () => {
		createInventory("bot-a");
		const result = addItem("bot-a", "iron", -5);
		expect(result).toEqual({ success: false, added: 0 });
	});

	it("handles tools (maxStack=1) correctly", () => {
		createInventory("bot-a", 4);
		addItem("bot-a", "grabber", 1);
		addItem("bot-a", "grabber", 1);
		const inv = getInventory("bot-a");
		expect(inv!.slots).toHaveLength(2); // two separate slots
		expect(inv!.slots[0].quantity).toBe(1);
		expect(inv!.slots[1].quantity).toBe(1);
	});

	it("handles unknown item types with default maxStack=1", () => {
		createInventory("bot-a");
		const result = addItem("bot-a", "mystery_item", 3);
		expect(result).toEqual({ success: true, added: 3 });
		const inv = getInventory("bot-a");
		expect(inv!.slots).toHaveLength(3); // 3 slots of 1 each
	});
});

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

describe("removeItem", () => {
	it("removes items from a single stack", () => {
		createInventory("bot-r");
		addItem("bot-r", "iron", 3);
		expect(removeItem("bot-r", "iron", 2)).toBe(true);
		expect(getItemCount("bot-r", "iron")).toBe(1);
	});

	it("removes the slot entirely when quantity reaches zero", () => {
		createInventory("bot-r");
		addItem("bot-r", "iron", 2);
		removeItem("bot-r", "iron", 2);
		const inv = getInventory("bot-r");
		expect(inv!.slots).toHaveLength(0);
	});

	it("removes across multiple stacks (LIFO)", () => {
		createInventory("bot-r");
		addItem("bot-r", "iron", 4); // slot 0: 4/4
		addItem("bot-r", "iron", 3); // slot 1: 3/4
		expect(removeItem("bot-r", "iron", 5)).toBe(true);
		// Should remove 3 from slot 1 (now empty), 2 from slot 0
		expect(getItemCount("bot-r", "iron")).toBe(2);
		const inv = getInventory("bot-r");
		expect(inv!.slots).toHaveLength(1);
		expect(inv!.slots[0].quantity).toBe(2);
	});

	it("returns false when insufficient items", () => {
		createInventory("bot-r");
		addItem("bot-r", "iron", 2);
		expect(removeItem("bot-r", "iron", 5)).toBe(false);
		expect(getItemCount("bot-r", "iron")).toBe(2); // unchanged
	});

	it("returns false for nonexistent inventory", () => {
		expect(removeItem("no-bot", "iron", 1)).toBe(false);
	});

	it("returns false for zero quantity", () => {
		createInventory("bot-r");
		addItem("bot-r", "iron", 2);
		expect(removeItem("bot-r", "iron", 0)).toBe(false);
	});

	it("returns false for negative quantity", () => {
		createInventory("bot-r");
		expect(removeItem("bot-r", "iron", -1)).toBe(false);
	});

	it("returns false when item not in inventory", () => {
		createInventory("bot-r");
		addItem("bot-r", "iron", 2);
		expect(removeItem("bot-r", "copper", 1)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getInventory
// ---------------------------------------------------------------------------

describe("getInventory", () => {
	it("returns null for nonexistent bot", () => {
		expect(getInventory("ghost")).toBeNull();
	});

	it("returns a snapshot (not the internal reference)", () => {
		createInventory("bot-snap");
		addItem("bot-snap", "iron", 2);
		const inv1 = getInventory("bot-snap");
		const inv2 = getInventory("bot-snap");
		expect(inv1).not.toBe(inv2);
		expect(inv1!.slots).not.toBe(inv2!.slots);
		expect(inv1).toEqual(inv2);
	});

	it("mutations on snapshot do not affect internal state", () => {
		createInventory("bot-snap");
		addItem("bot-snap", "iron", 2);
		const inv = getInventory("bot-snap");
		inv!.slots[0].quantity = 999;
		expect(getItemCount("bot-snap", "iron")).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// hasItem
// ---------------------------------------------------------------------------

describe("hasItem", () => {
	it("returns true when bot has enough", () => {
		createInventory("bot-h");
		addItem("bot-h", "iron", 3);
		expect(hasItem("bot-h", "iron", 3)).toBe(true);
	});

	it("returns false when bot has less", () => {
		createInventory("bot-h");
		addItem("bot-h", "iron", 2);
		expect(hasItem("bot-h", "iron", 3)).toBe(false);
	});

	it("returns true with default quantity=1", () => {
		createInventory("bot-h");
		addItem("bot-h", "iron", 1);
		expect(hasItem("bot-h", "iron")).toBe(true);
	});

	it("returns false for nonexistent bot", () => {
		expect(hasItem("ghost", "iron")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getItemCount
// ---------------------------------------------------------------------------

describe("getItemCount", () => {
	it("sums across multiple stacks", () => {
		createInventory("bot-c");
		addItem("bot-c", "iron", 4); // full stack
		addItem("bot-c", "iron", 3); // partial stack
		expect(getItemCount("bot-c", "iron")).toBe(7);
	});

	it("returns 0 for nonexistent bot", () => {
		expect(getItemCount("ghost", "iron")).toBe(0);
	});

	it("returns 0 for item not in inventory", () => {
		createInventory("bot-c");
		expect(getItemCount("bot-c", "titanium")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// transferItem
// ---------------------------------------------------------------------------

describe("transferItem", () => {
	it("transfers items between two bots", () => {
		createInventory("from-bot");
		createInventory("to-bot");
		addItem("from-bot", "iron", 3);

		const result = transferItem("from-bot", "to-bot", "iron", 2);
		expect(result).toEqual({ success: true, transferred: 2 });
		expect(getItemCount("from-bot", "iron")).toBe(1);
		expect(getItemCount("to-bot", "iron")).toBe(2);
	});

	it("fails when source has insufficient items", () => {
		createInventory("from-bot");
		createInventory("to-bot");
		addItem("from-bot", "iron", 1);

		const result = transferItem("from-bot", "to-bot", "iron", 5);
		expect(result).toEqual({ success: false, transferred: 0 });
		expect(getItemCount("from-bot", "iron")).toBe(1); // unchanged
	});

	it("rolls back when destination is full", () => {
		createInventory("from-bot");
		createInventory("to-bot", 1); // 1 slot only
		addItem("from-bot", "iron", 3);
		addItem("to-bot", "copper", 4); // fill the only slot

		const result = transferItem("from-bot", "to-bot", "iron", 3);
		expect(result).toEqual({ success: false, transferred: 0 });
		// Source should be restored
		expect(getItemCount("from-bot", "iron")).toBe(3);
		// Destination should be unchanged
		expect(getItemCount("to-bot", "copper")).toBe(4);
		expect(getItemCount("to-bot", "iron")).toBe(0);
	});

	it("fails when source inventory doesn't exist", () => {
		createInventory("to-bot");
		const result = transferItem("ghost", "to-bot", "iron", 1);
		expect(result).toEqual({ success: false, transferred: 0 });
	});

	it("fails when destination inventory doesn't exist", () => {
		createInventory("from-bot");
		addItem("from-bot", "iron", 1);
		const result = transferItem("from-bot", "ghost", "iron", 1);
		expect(result).toEqual({ success: false, transferred: 0 });
	});

	it("fails for zero quantity", () => {
		createInventory("from-bot");
		createInventory("to-bot");
		const result = transferItem("from-bot", "to-bot", "iron", 0);
		expect(result).toEqual({ success: false, transferred: 0 });
	});
});

// ---------------------------------------------------------------------------
// Weight system
// ---------------------------------------------------------------------------

describe("getTotalWeight", () => {
	it("returns 0 for empty inventory", () => {
		createInventory("bot-w");
		expect(getTotalWeight("bot-w")).toBe(0);
	});

	it("calculates weight from item defs", () => {
		createInventory("bot-w");
		addItem("bot-w", "iron", 2); // iron weight = 3.0 each
		expect(getTotalWeight("bot-w")).toBe(6.0);
	});

	it("sums weights across different item types", () => {
		createInventory("bot-w");
		addItem("bot-w", "iron", 1); // 3.0
		addItem("bot-w", "copper", 1); // 2.5
		expect(getTotalWeight("bot-w")).toBe(5.5);
	});

	it("uses default weight 1.0 for unknown items", () => {
		createInventory("bot-w");
		addItem("bot-w", "unknown_ore", 3);
		expect(getTotalWeight("bot-w")).toBe(3.0);
	});

	it("returns 0 for nonexistent bot", () => {
		expect(getTotalWeight("ghost")).toBe(0);
	});
});

describe("getSpeedMultiplier", () => {
	it("returns 1.0 for empty inventory", () => {
		createInventory("bot-s");
		expect(getSpeedMultiplier("bot-s")).toBe(1.0);
	});

	it("returns minMultiplier at maxWeight", () => {
		createInventory("bot-s");
		// iron weight=3.0, add enough to reach 20
		addItem("bot-s", "iron", 4); // 12
		addItem("bot-s", "iron", 2); // 18 — need 2 more
		addItem("bot-s", "scrapMetal", 1); // 20
		expect(getSpeedMultiplier("bot-s")).toBeCloseTo(0.4);
	});

	it("returns minMultiplier when exceeding maxWeight", () => {
		createInventory("bot-s", 16);
		addItem("bot-s", "titanium", 4); // 16
		addItem("bot-s", "titanium", 4); // 32
		expect(getSpeedMultiplier("bot-s")).toBe(0.4);
	});

	it("returns intermediate value for partial weight", () => {
		createInventory("bot-s");
		addItem("bot-s", "iron", 1); // weight = 3.0
		// ratio = 3/20 = 0.15, multiplier = 1 - 0.15 * 0.6 = 0.91
		expect(getSpeedMultiplier("bot-s")).toBeCloseTo(0.91);
	});

	it("accepts custom maxWeight and minMultiplier", () => {
		createInventory("bot-s");
		addItem("bot-s", "iron", 1); // weight = 3.0
		// ratio = 3/10 = 0.3, multiplier = 1 - 0.3 * (1 - 0.5) = 0.85
		expect(getSpeedMultiplier("bot-s", 10, 0.5)).toBeCloseTo(0.85);
	});
});

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

describe("getFreeSlots", () => {
	it("returns maxSlots for empty inventory", () => {
		createInventory("bot-f", 6);
		expect(getFreeSlots("bot-f")).toBe(6);
	});

	it("decreases as slots are used", () => {
		createInventory("bot-f", 6);
		addItem("bot-f", "iron", 4); // 1 slot
		addItem("bot-f", "copper", 1); // 2 slots
		expect(getFreeSlots("bot-f")).toBe(4);
	});

	it("returns 0 for nonexistent bot", () => {
		expect(getFreeSlots("ghost")).toBe(0);
	});
});

describe("isInventoryFull", () => {
	it("returns false for empty inventory", () => {
		createInventory("bot-full", 2);
		expect(isInventoryFull("bot-full")).toBe(false);
	});

	it("returns true when all slots used and stacks at max", () => {
		createInventory("bot-full", 1);
		addItem("bot-full", "iron", 4); // maxStack = 4
		expect(isInventoryFull("bot-full")).toBe(true);
	});

	it("returns false when all slots used but stack has room", () => {
		createInventory("bot-full", 1);
		addItem("bot-full", "iron", 2); // stack not full
		expect(isInventoryFull("bot-full")).toBe(false);
	});

	it("returns true for nonexistent bot (cannot add to it)", () => {
		expect(isInventoryFull("ghost")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Item defs
// ---------------------------------------------------------------------------

describe("item definitions", () => {
	it("has default definitions for common items", () => {
		expect(getItemDef("iron")).toBeDefined();
		expect(getItemDef("scrapMetal")).toBeDefined();
		expect(getItemDef("grabber")).toBeDefined();
	});

	it("registerItemDef adds a new item type", () => {
		registerItemDef({
			id: "diamond",
			category: "cube",
			weight: 5.0,
			maxStack: 2,
		});
		expect(getItemDef("diamond")?.weight).toBe(5.0);
	});

	it("registerItemDef overrides existing item type", () => {
		registerItemDef({
			id: "iron",
			category: "cube",
			weight: 999,
			maxStack: 1,
		});
		expect(getItemDef("iron")?.weight).toBe(999);
	});

	it("returns undefined for unknown item type", () => {
		expect(getItemDef("nonexistent")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// _resetInventoryState
// ---------------------------------------------------------------------------

describe("_resetInventoryState", () => {
	it("clears all inventories", () => {
		createInventory("bot-1");
		createInventory("bot-2");
		addItem("bot-1", "iron", 3);
		_resetInventoryState();
		expect(getInventory("bot-1")).toBeNull();
		expect(getInventory("bot-2")).toBeNull();
	});

	it("restores default item defs after custom registration", () => {
		registerItemDef({
			id: "iron",
			category: "cube",
			weight: 999,
			maxStack: 1,
		});
		_resetInventoryState();
		expect(getItemDef("iron")?.weight).toBe(3.0);
	});
});
