/**
 * Otter trade system — otter holograms offer rare recipes, materials,
 * upgrades, cosmetics, and intel in exchange for specific cube combinations.
 *
 * Creates a secondary economy layer on top of the physical cube economy.
 * Traders have distinct personalities that affect inventory composition,
 * pricing, and dialogue. Inventory refreshes periodically with deterministic
 * RNG support for testability.
 *
 * No config dependency — all defaults are self-contained.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeCost {
	materialType: string; // "iron", "copper", "rare_alloy"
	quantity: number; // number of cubes required
}

export type TradeItemRarity = "common" | "uncommon" | "rare" | "legendary";
export type TradeItemType =
	| "recipe"
	| "material"
	| "upgrade"
	| "cosmetic"
	| "intel";

export interface TradeItem {
	id: string;
	name: string;
	description: string;
	rarity: TradeItemRarity;
	type: TradeItemType;
	cost: TradeCost[];
	stock: number; // how many available (0 = sold out)
	requiredLevel: number; // player level requirement
}

export type OtterPersonality = "generous" | "shrewd" | "mysterious" | "collector";

export interface OtterTrader {
	id: string;
	name: string; // "Shellsworth", "Captain Kelp", "Whiskers"
	position: { x: number; y: number; z: number };
	personality: OtterPersonality;
	inventory: TradeItem[];
	refreshCooldown: number; // seconds until inventory refreshes
	lastRefreshTime: number;
	tradeCount: number; // total trades completed
	favoritesMaterial: string; // this otter values one material extra
}

export interface TradeResult {
	success: boolean;
	itemReceived: TradeItem | null;
	cubesSpent: TradeCost[];
	traderMessage: string; // personality-flavored response
	soundEvent: string;
}

/** Player inventory abstraction — maps material type to quantity owned. */
export type PlayerInventory = Record<string, number>;

// ---------------------------------------------------------------------------
// Default trade catalog
// ---------------------------------------------------------------------------

const DEFAULT_CATALOG: TradeItem[] = [
	// Common
	{
		id: "scrap_recycler_recipe",
		name: "Scrap Recycler Recipe",
		description: "Reclaim 1 copper from 3 scrap iron. Waste not, want not.",
		rarity: "common",
		type: "recipe",
		cost: [{ materialType: "scrap_iron", quantity: 3 }],
		stock: 5,
		requiredLevel: 1,
	},
	{
		id: "reinforced_armor_plating",
		name: "Reinforced Armor Plating",
		description: "+15% damage reduction. Bolted on with otter precision.",
		rarity: "common",
		type: "upgrade",
		cost: [{ materialType: "iron", quantity: 5 }],
		stock: 3,
		requiredLevel: 1,
	},
	// Uncommon
	{
		id: "otters_lucky_charm",
		name: "Otter's Lucky Charm",
		description: "+10% harvest speed. Smells faintly of fish.",
		rarity: "uncommon",
		type: "upgrade",
		cost: [
			{ materialType: "copper", quantity: 2 },
			{ materialType: "iron", quantity: 1 },
		],
		stock: 2,
		requiredLevel: 3,
	},
	{
		id: "signal_amplifier_recipe",
		name: "Signal Amplifier Recipe",
		description: "+5 perception range. Hear the planet whisper.",
		rarity: "uncommon",
		type: "recipe",
		cost: [{ materialType: "fiber_optics", quantity: 3 }],
		stock: 2,
		requiredLevel: 3,
	},
	// Rare
	{
		id: "ancient_machine_blueprint",
		name: "Ancient Machine Blueprint",
		description: "Schematics for tech lost to the rust age.",
		rarity: "rare",
		type: "recipe",
		cost: [
			{ materialType: "rare_alloy", quantity: 5 },
			{ materialType: "iron", quantity: 3 },
		],
		stock: 1,
		requiredLevel: 5,
	},
	{
		id: "storm_caller",
		name: "Storm Caller",
		description: "Summon a targeted lightning strike. Handle with care.",
		rarity: "rare",
		type: "material",
		cost: [{ materialType: "copper", quantity: 10 }],
		stock: 1,
		requiredLevel: 5,
	},
	// Legendary
	{
		id: "otters_secret",
		name: "Otter's Secret",
		description: "The otters know where everything is buried.",
		rarity: "legendary",
		type: "intel",
		cost: [
			{ materialType: "scrap_iron", quantity: 1 },
			{ materialType: "iron", quantity: 1 },
			{ materialType: "copper", quantity: 1 },
			{ materialType: "fiber_optics", quantity: 1 },
			{ materialType: "rare_alloy", quantity: 1 },
		],
		stock: 1,
		requiredLevel: 8,
	},
];

/** All known material types for the legendary "one of each" trade. */
const _ALL_MATERIAL_TYPES = [
	"scrap_iron",
	"iron",
	"copper",
	"fiber_optics",
	"rare_alloy",
];

// ---------------------------------------------------------------------------
// Dialogue tables
// ---------------------------------------------------------------------------

const DIALOGUE: Record<
	OtterPersonality,
	Record<string, string[]>
> = {
	generous: {
		greeting: [
			"Welcome, friend! Take a look — everything's priced to move!",
			"Ah, a fellow wanderer! I've got just what you need.",
			"Come, come! The otters share freely with those in need.",
		],
		trade_success: [
			"A fine trade! May your cubes never crumble.",
			"Pleasure doing business! Come back anytime!",
			"Excellent choice! That'll serve you well out there.",
		],
		trade_fail: [
			"Hmm, you're a bit short. Come back when you've mined more!",
			"Not quite enough cubes, friend. I believe in you though!",
			"Sorry, can't stretch the prices any further than I already have.",
		],
		farewell: [
			"Safe travels! The planet is kinder than it looks.",
			"Until next time, friend!",
			"May your furnace never go cold!",
		],
		special: [
			"Psst — I saved something special for my favorite customer.",
		],
	},
	shrewd: {
		greeting: [
			"State your business. Time is cubes.",
			"Browsing costs nothing. Buying costs cubes.",
			"I have what you need. The question is: can you afford it?",
		],
		trade_success: [
			"Acceptable terms. Don't expect a discount next time.",
			"Transaction complete. Pleasure is... adequate.",
			"Hmph. You drove a harder bargain than most bots.",
		],
		trade_fail: [
			"Come back with real currency. I don't accept promises.",
			"Insufficient materials. This isn't a charity operation.",
			"No cubes, no deal. Simple arithmetic.",
		],
		farewell: [
			"Don't waste my time next visit.",
			"Remember: every cube counts.",
			"Off you go. I have inventory to manage.",
		],
		special: [
			"I don't do this for everyone, but your cubes spend well.",
		],
	},
	mysterious: {
		greeting: [
			"The gears of fate bring you here... interesting.",
			"I've been expecting you. Or someone like you.",
			"Step closer. Some things are not meant for all eyes.",
		],
		trade_success: [
			"The exchange is made. What was lost is now found.",
			"A transaction written in the rust of ages.",
			"Take it. Its purpose will reveal itself in time.",
		],
		trade_fail: [
			"The price is the price. The planet does not negotiate.",
			"Not yet ready. The cubes will come when they must.",
			"Return when the stars align... or when you have more iron.",
		],
		farewell: [
			"We will meet again. The planet wills it.",
			"Go. Your path is not yet finished.",
			"Until the rust calls us together once more.",
		],
		special: [
			"Some say this item doesn't exist. They are almost correct.",
		],
	},
	collector: {
		greeting: [
			"Ooh, what have you brought me today?",
			"Show me your cubes! I must see what you've gathered!",
			"A collector knows quality. Let me see your materials.",
		],
		trade_success: [
			"Magnificent specimens! Here, take this — you've earned it!",
			"These cubes will make a fine addition to my collection!",
			"Exquisite! I've been waiting for someone to bring these!",
		],
		trade_fail: [
			"Not quite what I'm looking for. Bring me the right materials!",
			"I need specific cubes for my collection. Check the list again.",
			"Close, but a collector has standards.",
		],
		farewell: [
			"Keep mining! There are rare specimens out there waiting!",
			"Happy hunting! Bring me something extraordinary next time!",
			"My collection grows, thanks to traders like you!",
		],
		special: [
			"I've never seen cubes like yours before. You deserve my rarest piece.",
		],
	},
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const traders = new Map<string, OtterTrader>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepCloneItem(item: TradeItem): TradeItem {
	return {
		...item,
		cost: item.cost.map((c) => ({ ...c })),
	};
}

function deepCloneCatalog(): TradeItem[] {
	return DEFAULT_CATALOG.map(deepCloneItem);
}

function pickDialogue(
	personality: OtterPersonality,
	context: string,
	rng: () => number,
): string {
	const lines = DIALOGUE[personality]?.[context];
	if (!lines || lines.length === 0) {
		return "...";
	}
	const idx = Math.floor(rng() * lines.length);
	return lines[idx];
}

// ---------------------------------------------------------------------------
// Public API — Trader management
// ---------------------------------------------------------------------------

/**
 * Register a new otter trader. Overwrites if id already exists.
 */
export function registerTrader(trader: OtterTrader): void {
	// Deep clone inventory to avoid external mutation
	const stored: OtterTrader = {
		...trader,
		position: { ...trader.position },
		inventory: trader.inventory.map(deepCloneItem),
	};
	traders.set(stored.id, stored);
}

/**
 * Get a trader by id. Returns a copy or null.
 */
export function getTrader(id: string): OtterTrader | null {
	const t = traders.get(id);
	if (!t) return null;
	return {
		...t,
		position: { ...t.position },
		inventory: t.inventory.map(deepCloneItem),
	};
}

/**
 * Get all registered traders. Returns copies.
 */
export function getAllTraders(): OtterTrader[] {
	return Array.from(traders.values()).map((t) => ({
		...t,
		position: { ...t.position },
		inventory: t.inventory.map(deepCloneItem),
	}));
}

/**
 * Get traders sorted by distance from a player position, filtered by max range.
 */
export function getTradersByDistance(
	playerPos: { x: number; y: number; z: number },
	maxRange: number,
): { trader: OtterTrader; distance: number }[] {
	const results: { trader: OtterTrader; distance: number }[] = [];

	for (const t of traders.values()) {
		const dx = t.position.x - playerPos.x;
		const dy = t.position.y - playerPos.y;
		const dz = t.position.z - playerPos.z;
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if (dist <= maxRange) {
			results.push({
				trader: {
					...t,
					position: { ...t.position },
					inventory: t.inventory.map(deepCloneItem),
				},
				distance: dist,
			});
		}
	}

	results.sort((a, b) => a.distance - b.distance);
	return results;
}

// ---------------------------------------------------------------------------
// Public API — Trade queries
// ---------------------------------------------------------------------------

/**
 * Get available trades for a trader, filtered by player level and stock.
 * Returns items that the player's level qualifies for and that are in stock.
 */
export function getAvailableTrades(
	traderId: string,
	playerLevel: number,
): TradeItem[] {
	const t = traders.get(traderId);
	if (!t) return [];

	return t.inventory
		.filter((item) => item.stock > 0 && item.requiredLevel <= playerLevel)
		.map(deepCloneItem);
}

/**
 * Check whether the player can afford a specific trade item.
 * Returns affordability status and any missing materials.
 */
export function canAffordTrade(
	traderId: string,
	itemId: string,
	playerInventory: PlayerInventory,
): { affordable: boolean; missing: TradeCost[] } {
	const t = traders.get(traderId);
	if (!t) return { affordable: false, missing: [] };

	const item = t.inventory.find((i) => i.id === itemId);
	if (!item) return { affordable: false, missing: [] };

	const missing: TradeCost[] = [];

	for (const cost of item.cost) {
		const have = playerInventory[cost.materialType] ?? 0;
		if (have < cost.quantity) {
			missing.push({
				materialType: cost.materialType,
				quantity: cost.quantity - have,
			});
		}
	}

	return {
		affordable: missing.length === 0,
		missing,
	};
}

// ---------------------------------------------------------------------------
// Public API — Trade execution
// ---------------------------------------------------------------------------

/**
 * Execute a trade with a trader.
 *
 * Validates stock, player level, and material costs. On success, decrements
 * stock, increments trade count, deducts materials from player inventory,
 * and returns the acquired item with a personality-flavored message.
 *
 * The playerInventory record is mutated in-place on success.
 */
export function executeTrade(
	traderId: string,
	itemId: string,
	playerInventory: PlayerInventory,
	playerLevel = 1,
	rng: () => number = Math.random,
): TradeResult {
	const t = traders.get(traderId);
	if (!t) {
		return {
			success: false,
			itemReceived: null,
			cubesSpent: [],
			traderMessage: "Trader not found.",
			soundEvent: "trade_error",
		};
	}

	const itemIndex = t.inventory.findIndex((i) => i.id === itemId);
	if (itemIndex === -1) {
		return {
			success: false,
			itemReceived: null,
			cubesSpent: [],
			traderMessage: pickDialogue(t.personality, "trade_fail", rng),
			soundEvent: "trade_error",
		};
	}

	const item = t.inventory[itemIndex];

	// Check stock
	if (item.stock <= 0) {
		return {
			success: false,
			itemReceived: null,
			cubesSpent: [],
			traderMessage: "Sold out. Come back after I restock.",
			soundEvent: "trade_error",
		};
	}

	// Check level
	if (playerLevel < item.requiredLevel) {
		return {
			success: false,
			itemReceived: null,
			cubesSpent: [],
			traderMessage: `You need to be level ${item.requiredLevel} for that.`,
			soundEvent: "trade_error",
		};
	}

	// Check affordability
	const { affordable, missing: _missing } = canAffordTrade(traderId, itemId, playerInventory);
	if (!affordable) {
		return {
			success: false,
			itemReceived: null,
			cubesSpent: [],
			traderMessage: pickDialogue(t.personality, "trade_fail", rng),
			soundEvent: "trade_fail",
		};
	}

	// Deduct materials from player inventory
	const cubesSpent: TradeCost[] = [];
	for (const cost of item.cost) {
		playerInventory[cost.materialType] -= cost.quantity;
		cubesSpent.push({ materialType: cost.materialType, quantity: cost.quantity });
	}

	// Decrement stock
	item.stock--;

	// Increment trade count
	t.tradeCount++;

	return {
		success: true,
		itemReceived: deepCloneItem(item),
		cubesSpent,
		traderMessage: pickDialogue(t.personality, "trade_success", rng),
		soundEvent: "trade_success",
	};
}

// ---------------------------------------------------------------------------
// Public API — Inventory refresh
// ---------------------------------------------------------------------------

/**
 * Refresh a trader's inventory if enough time has elapsed since last refresh.
 *
 * Personality affects refresh behavior:
 * - generous: more common items, sometimes lower costs (quantity - 1, min 1)
 * - shrewd: fewer items, higher costs (quantity + 1), better rare chance
 * - mysterious: random selection from full catalog, small legendary chance
 * - collector: wants specific (favorites) materials, full restock
 *
 * @param rng deterministic random function for testability
 */
export function refreshTraderInventory(
	traderId: string,
	currentTime: number,
	rng: () => number,
): void {
	const t = traders.get(traderId);
	if (!t) return;

	const elapsed = currentTime - t.lastRefreshTime;
	if (elapsed < t.refreshCooldown) return;

	t.lastRefreshTime = currentTime;

	const catalog = deepCloneCatalog();

	switch (t.personality) {
		case "generous": {
			// Generous: stock all common/uncommon, some rare. Lower prices.
			t.inventory = catalog
				.filter((item) => item.rarity !== "legendary")
				.map((item) => {
					// Lower cost quantities (min 1)
					item.cost = item.cost.map((c) => ({
						...c,
						quantity: Math.max(1, c.quantity - 1),
					}));
					// More stock for common items
					if (item.rarity === "common") item.stock += 2;
					return item;
				});
			break;
		}
		case "shrewd": {
			// Shrewd: fewer items, higher costs, better rare/legendary chance
			const selected = catalog.filter(() => rng() > 0.3);
			t.inventory = selected.map((item) => {
				// Higher cost quantities
				item.cost = item.cost.map((c) => ({
					...c,
					quantity: c.quantity + 1,
				}));
				// Less stock
				item.stock = Math.max(1, item.stock - 1);
				return item;
			});
			break;
		}
		case "mysterious": {
			// Mysterious: random subset, small legendary chance
			const shuffled = catalog.sort(() => rng() - 0.5);
			const count = Math.max(2, Math.floor(rng() * catalog.length));
			t.inventory = shuffled.slice(0, count);
			break;
		}
		case "collector": {
			// Collector: full restock, bonus stock for items costing favorites material
			t.inventory = catalog.map((item) => {
				const wantsFavorite = item.cost.some(
					(c) => c.materialType === t.favoritesMaterial,
				);
				if (wantsFavorite) {
					item.stock += 3;
				}
				return item;
			});
			break;
		}
	}
}

// ---------------------------------------------------------------------------
// Public API — Dialogue
// ---------------------------------------------------------------------------

/**
 * Get personality-flavored dialogue for a trader.
 *
 * @param context "greeting" | "trade_success" | "trade_fail" | "farewell" | "special"
 * @param rng optional deterministic random for testability
 */
export function getTraderDialogue(
	traderId: string,
	context: string,
	rng: () => number = Math.random,
): string {
	const t = traders.get(traderId);
	if (!t) return "";

	return pickDialogue(t.personality, context, rng);
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Clear all trader state. Primarily for testing.
 */
export function reset(): void {
	traders.clear();
}
