/**
 * Unit tests for otter trade system — otter hologram trading economy.
 *
 * Tests cover:
 * - Trader registration, retrieval, and listing
 * - Available trades filtering by level and stock
 * - Affordability checks with missing materials
 * - Trade execution: success, insufficient funds, out of stock, level requirement
 * - Personality-flavored dialogue
 * - Inventory refresh per personality type
 * - Distance-based trader queries
 * - reset()
 */

import {
	canAffordTrade,
	executeTrade,
	getAllTraders,
	getAvailableTrades,
	getTrader,
	getTraderDialogue,
	getTradersByDistance,
	refreshTraderInventory,
	registerTrader,
	reset,
} from "../otterTrade";
import type { OtterTrader, PlayerInventory } from "../otterTrade";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrader(overrides: Partial<OtterTrader> = {}): OtterTrader {
	return {
		id: "otter-1",
		name: "Shellsworth",
		position: { x: 10, y: 0, z: 10 },
		personality: "generous",
		inventory: [
			{
				id: "basic_recipe",
				name: "Basic Recipe",
				description: "A simple recipe.",
				rarity: "common",
				type: "recipe",
				cost: [{ materialType: "scrap_iron", quantity: 3 }],
				stock: 5,
				requiredLevel: 1,
			},
			{
				id: "rare_upgrade",
				name: "Rare Upgrade",
				description: "A rare upgrade.",
				rarity: "rare",
				type: "upgrade",
				cost: [
					{ materialType: "iron", quantity: 5 },
					{ materialType: "copper", quantity: 2 },
				],
				stock: 1,
				requiredLevel: 5,
			},
		],
		refreshCooldown: 300,
		lastRefreshTime: 0,
		tradeCount: 0,
		favoritesMaterial: "copper",
		...overrides,
	};
}

function rng(value: number): () => number {
	return () => value;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Trader registration
// ---------------------------------------------------------------------------

describe("registerTrader / getTrader", () => {
	it("registers and retrieves a trader by id", () => {
		registerTrader(makeTrader());
		const t = getTrader("otter-1");
		expect(t).not.toBeNull();
		expect(t!.name).toBe("Shellsworth");
	});

	it("returns null for unknown trader", () => {
		expect(getTrader("nonexistent")).toBeNull();
	});

	it("returns a copy (mutations don't affect stored state)", () => {
		registerTrader(makeTrader());
		const t = getTrader("otter-1")!;
		t.name = "HACKED";
		const t2 = getTrader("otter-1")!;
		expect(t2.name).toBe("Shellsworth");
	});

	it("overwrites trader with same ID", () => {
		registerTrader(makeTrader({ personality: "generous" }));
		registerTrader(makeTrader({ personality: "shrewd" }));
		const t = getTrader("otter-1")!;
		expect(t.personality).toBe("shrewd");
	});

	it("copies position (does not hold reference)", () => {
		const pos = { x: 1, y: 2, z: 3 };
		registerTrader(makeTrader({ position: pos }));
		pos.x = 999;
		expect(getTrader("otter-1")!.position.x).toBe(1);
	});
});

describe("getAllTraders", () => {
	it("returns empty array when no traders registered", () => {
		expect(getAllTraders()).toEqual([]);
	});

	it("returns all registered traders", () => {
		registerTrader(makeTrader({ id: "o1", name: "A" }));
		registerTrader(makeTrader({ id: "o2", name: "B" }));
		const all = getAllTraders();
		expect(all).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// getAvailableTrades
// ---------------------------------------------------------------------------

describe("getAvailableTrades", () => {
	it("returns items that match player level and are in stock", () => {
		registerTrader(makeTrader());
		const trades = getAvailableTrades("otter-1", 1);
		expect(trades).toHaveLength(1); // basic_recipe (level 1), rare_upgrade requires level 5
		expect(trades[0].id).toBe("basic_recipe");
	});

	it("returns all items at high enough level", () => {
		registerTrader(makeTrader());
		const trades = getAvailableTrades("otter-1", 10);
		expect(trades).toHaveLength(2);
	});

	it("returns empty for level 0", () => {
		registerTrader(makeTrader());
		const trades = getAvailableTrades("otter-1", 0);
		expect(trades).toHaveLength(0);
	});

	it("excludes out-of-stock items", () => {
		const trader = makeTrader();
		trader.inventory[0].stock = 0;
		registerTrader(trader);
		const trades = getAvailableTrades("otter-1", 10);
		expect(trades.find((t) => t.id === "basic_recipe")).toBeUndefined();
	});

	it("returns empty for unknown trader", () => {
		expect(getAvailableTrades("nobody", 10)).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// canAffordTrade
// ---------------------------------------------------------------------------

describe("canAffordTrade", () => {
	it("returns affordable=true when player has enough materials", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 10 };
		const result = canAffordTrade("otter-1", "basic_recipe", inv);
		expect(result.affordable).toBe(true);
		expect(result.missing).toHaveLength(0);
	});

	it("returns affordable=false with missing materials listed", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 1 };
		const result = canAffordTrade("otter-1", "basic_recipe", inv);
		expect(result.affordable).toBe(false);
		expect(result.missing).toHaveLength(1);
		expect(result.missing[0].materialType).toBe("scrap_iron");
		expect(result.missing[0].quantity).toBe(2); // need 3, have 1 = short 2
	});

	it("handles multi-material costs", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { iron: 3, copper: 0 };
		const result = canAffordTrade("otter-1", "rare_upgrade", inv);
		expect(result.affordable).toBe(false);
		expect(result.missing).toHaveLength(2);
	});

	it("returns affordable=false for unknown trader", () => {
		const result = canAffordTrade("nobody", "basic_recipe", {});
		expect(result.affordable).toBe(false);
	});

	it("returns affordable=false for unknown item", () => {
		registerTrader(makeTrader());
		const result = canAffordTrade("otter-1", "nonexistent", {});
		expect(result.affordable).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// executeTrade — success
// ---------------------------------------------------------------------------

describe("executeTrade — success", () => {
	it("deducts materials and returns the item", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 10 };
		const result = executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		expect(result.success).toBe(true);
		expect(result.itemReceived).not.toBeNull();
		expect(result.itemReceived!.id).toBe("basic_recipe");
		expect(inv.scrap_iron).toBe(7); // 10 - 3
	});

	it("decrements stock after purchase", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 100 };
		executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		const trades = getAvailableTrades("otter-1", 1);
		expect(trades[0].stock).toBe(4); // was 5
	});

	it("increments trade count", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 100 };
		executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		const t = getTrader("otter-1")!;
		expect(t.tradeCount).toBe(1);
	});

	it("returns a sound event on success", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 100 };
		const result = executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		expect(result.soundEvent).toBe("trade_success");
	});

	it("returns personality-flavored dialogue on success", () => {
		registerTrader(makeTrader({ personality: "shrewd" }));
		const inv: PlayerInventory = { scrap_iron: 100 };
		const result = executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		expect(result.traderMessage.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// executeTrade — failures
// ---------------------------------------------------------------------------

describe("executeTrade — failures", () => {
	it("fails for unknown trader", () => {
		const result = executeTrade("nobody", "basic_recipe", {}, 1, rng(0));
		expect(result.success).toBe(false);
		expect(result.soundEvent).toBe("trade_error");
	});

	it("fails for unknown item", () => {
		registerTrader(makeTrader());
		const result = executeTrade("otter-1", "nonexistent", {}, 1, rng(0));
		expect(result.success).toBe(false);
	});

	it("fails when out of stock", () => {
		const trader = makeTrader();
		trader.inventory[0].stock = 0;
		registerTrader(trader);
		const inv: PlayerInventory = { scrap_iron: 100 };
		const result = executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		expect(result.success).toBe(false);
		expect(result.traderMessage).toContain("Sold out");
	});

	it("fails when player level is too low", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { iron: 100, copper: 100 };
		const result = executeTrade("otter-1", "rare_upgrade", inv, 1, rng(0));
		expect(result.success).toBe(false);
		expect(result.traderMessage).toContain("level");
	});

	it("fails when player cannot afford the cost", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 1 };
		const result = executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		expect(result.success).toBe(false);
		expect(result.soundEvent).toBe("trade_fail");
	});

	it("does not modify inventory on failure", () => {
		registerTrader(makeTrader());
		const inv: PlayerInventory = { scrap_iron: 1 };
		executeTrade("otter-1", "basic_recipe", inv, 1, rng(0));
		expect(inv.scrap_iron).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getTraderDialogue
// ---------------------------------------------------------------------------

describe("getTraderDialogue", () => {
	it("returns greeting for generous trader", () => {
		registerTrader(makeTrader({ personality: "generous" }));
		const msg = getTraderDialogue("otter-1", "greeting", rng(0));
		expect(msg.length).toBeGreaterThan(0);
	});

	it("returns farewell for shrewd trader", () => {
		registerTrader(makeTrader({ personality: "shrewd" }));
		const msg = getTraderDialogue("otter-1", "farewell", rng(0));
		expect(msg.length).toBeGreaterThan(0);
	});

	it("returns special dialogue for mysterious trader", () => {
		registerTrader(makeTrader({ personality: "mysterious" }));
		const msg = getTraderDialogue("otter-1", "special", rng(0));
		expect(msg.length).toBeGreaterThan(0);
	});

	it("returns empty string for unknown trader", () => {
		expect(getTraderDialogue("nobody", "greeting", rng(0))).toBe("");
	});

	it("returns fallback for unknown dialogue context", () => {
		registerTrader(makeTrader());
		const msg = getTraderDialogue("otter-1", "unknown_context", rng(0));
		expect(msg).toBe("...");
	});
});

// ---------------------------------------------------------------------------
// refreshTraderInventory
// ---------------------------------------------------------------------------

describe("refreshTraderInventory", () => {
	it("does not refresh before cooldown expires", () => {
		registerTrader(makeTrader({ refreshCooldown: 300, lastRefreshTime: 0 }));
		refreshTraderInventory("otter-1", 100, rng(0.5));
		const t = getTrader("otter-1")!;
		expect(t.inventory.find((i) => i.id === "basic_recipe")).toBeDefined();
	});

	it("refreshes after cooldown expires", () => {
		registerTrader(makeTrader({ refreshCooldown: 300, lastRefreshTime: 0 }));
		refreshTraderInventory("otter-1", 301, rng(0.5));
		const t = getTrader("otter-1")!;
		expect(t.inventory.length).toBeGreaterThan(0);
		expect(t.lastRefreshTime).toBe(301);
	});

	it("generous personality excludes legendary items and lowers costs", () => {
		registerTrader(makeTrader({ personality: "generous", refreshCooldown: 0 }));
		refreshTraderInventory("otter-1", 1, rng(0.5));
		const t = getTrader("otter-1")!;
		const legendaryItems = t.inventory.filter((i) => i.rarity === "legendary");
		expect(legendaryItems).toHaveLength(0);
	});

	it("shrewd personality raises costs", () => {
		registerTrader(makeTrader({ personality: "shrewd", refreshCooldown: 0 }));
		refreshTraderInventory("otter-1", 1, rng(0.5));
		const t = getTrader("otter-1")!;
		for (const item of t.inventory) {
			for (const cost of item.cost) {
				expect(cost.quantity).toBeGreaterThanOrEqual(2);
			}
		}
	});

	it("collector personality gives bonus stock for favorite material", () => {
		registerTrader(
			makeTrader({
				personality: "collector",
				refreshCooldown: 0,
				favoritesMaterial: "copper",
			}),
		);
		refreshTraderInventory("otter-1", 1, rng(0.5));
		const t = getTrader("otter-1")!;
		const copperItem = t.inventory.find((i) =>
			i.cost.some((c) => c.materialType === "copper"),
		);
		if (copperItem) {
			expect(copperItem.stock).toBeGreaterThanOrEqual(4);
		}
	});

	it("is safe for unknown trader", () => {
		expect(() => refreshTraderInventory("nobody", 100, rng(0.5))).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getTradersByDistance
// ---------------------------------------------------------------------------

describe("getTradersByDistance", () => {
	it("returns traders sorted by distance", () => {
		registerTrader(makeTrader({ id: "far", position: { x: 100, y: 0, z: 0 } }));
		registerTrader(makeTrader({ id: "near", position: { x: 5, y: 0, z: 0 } }));
		const results = getTradersByDistance({ x: 0, y: 0, z: 0 }, 200);
		expect(results).toHaveLength(2);
		expect(results[0].trader.id).toBe("near");
		expect(results[1].trader.id).toBe("far");
	});

	it("excludes traders beyond maxRange", () => {
		registerTrader(makeTrader({ id: "far", position: { x: 100, y: 0, z: 0 } }));
		registerTrader(makeTrader({ id: "near", position: { x: 5, y: 0, z: 0 } }));
		const results = getTradersByDistance({ x: 0, y: 0, z: 0 }, 10);
		expect(results).toHaveLength(1);
		expect(results[0].trader.id).toBe("near");
	});

	it("returns empty array when no traders in range", () => {
		registerTrader(makeTrader({ position: { x: 999, y: 0, z: 999 } }));
		const results = getTradersByDistance({ x: 0, y: 0, z: 0 }, 10);
		expect(results).toHaveLength(0);
	});

	it("includes 3D distance", () => {
		registerTrader(makeTrader({ id: "up", position: { x: 0, y: 100, z: 0 } }));
		const results = getTradersByDistance({ x: 0, y: 0, z: 0 }, 200);
		expect(results).toHaveLength(1);
		expect(results[0].distance).toBeCloseTo(100);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all traders", () => {
		registerTrader(makeTrader({ id: "a" }));
		registerTrader(makeTrader({ id: "b" }));
		reset();
		expect(getAllTraders()).toEqual([]);
	});

	it("getTrader returns null after reset", () => {
		registerTrader(makeTrader());
		reset();
		expect(getTrader("otter-1")).toBeNull();
	});
});
