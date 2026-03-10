/**
 * Bot inventory system.
 *
 * Each bot has a limited-slot inventory. Items include cubes (scrapMetal,
 * iron, copper, etc.), tools, and components. Same-type items auto-stack
 * up to a configurable max stack size. Each item type has a weight that
 * contributes to total carried weight, which affects movement speed.
 *
 * Module-level state uses Maps keyed by bot ID.
 *
 * Config reference: config/units.json (inventorySlots on bot types)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Categories of items that can be stored in a bot inventory. */
export type ItemCategory = "cube" | "tool" | "component";

/** Definition for an item type. */
export interface ItemDef {
	id: string;
	category: ItemCategory;
	/** Weight per unit of this item. */
	weight: number;
	/** Maximum number of this item that can occupy a single stack. */
	maxStack: number;
}

/** A single inventory slot holding a stack of one item type. */
export interface InventorySlot {
	itemId: string;
	quantity: number;
}

/** Full inventory state for a single bot. */
export interface BotInventory {
	botId: string;
	/** Maximum number of slots this bot has. */
	maxSlots: number;
	/** Active slots (length <= maxSlots). */
	slots: InventorySlot[];
}

/** Result of an addItem operation. */
export interface AddItemResult {
	success: boolean;
	/** How many items were actually added (may be less than requested if full). */
	added: number;
}

/** Result of a transferItem operation. */
export interface TransferResult {
	success: boolean;
	transferred: number;
}

// ---------------------------------------------------------------------------
// Default item definitions
// ---------------------------------------------------------------------------

const DEFAULT_ITEM_DEFS: Record<string, ItemDef> = {
	scrapMetal: { id: "scrapMetal", category: "cube", weight: 2.0, maxStack: 4 },
	iron: { id: "iron", category: "cube", weight: 3.0, maxStack: 4 },
	copper: { id: "copper", category: "cube", weight: 2.5, maxStack: 4 },
	silicon: { id: "silicon", category: "cube", weight: 1.5, maxStack: 4 },
	titanium: { id: "titanium", category: "cube", weight: 4.0, maxStack: 4 },
	eWaste: { id: "eWaste", category: "cube", weight: 1.0, maxStack: 4 },
	grabber: { id: "grabber", category: "tool", weight: 1.5, maxStack: 1 },
	drill: { id: "drill", category: "tool", weight: 2.0, maxStack: 1 },
	circuitBoard: { id: "circuitBoard", category: "component", weight: 0.5, maxStack: 8 },
	wireBundle: { id: "wireBundle", category: "component", weight: 0.3, maxStack: 8 },
	ironPlate: { id: "ironPlate", category: "component", weight: 1.0, maxStack: 8 },
	camera: { id: "camera", category: "component", weight: 0.8, maxStack: 1 },
	powerCell: { id: "powerCell", category: "component", weight: 1.2, maxStack: 1 },
};

/** Default inventory capacity when config doesn't specify. */
const DEFAULT_INVENTORY_SLOTS = 8;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const inventories = new Map<string, BotInventory>();
const itemDefs = new Map<string, ItemDef>();

// Initialize item defs from defaults
for (const [id, def] of Object.entries(DEFAULT_ITEM_DEFS)) {
	itemDefs.set(id, def);
}

// ---------------------------------------------------------------------------
// Item definition management
// ---------------------------------------------------------------------------

/**
 * Register or override an item definition.
 * Useful for extending the item table at runtime or from config.
 */
export function registerItemDef(def: ItemDef): void {
	itemDefs.set(def.id, def);
}

/**
 * Get the definition for an item type.
 * Returns undefined if not registered.
 */
export function getItemDef(itemId: string): ItemDef | undefined {
	return itemDefs.get(itemId);
}

// ---------------------------------------------------------------------------
// Inventory lifecycle
// ---------------------------------------------------------------------------

/**
 * Create an inventory for a bot.
 *
 * @param botId - unique bot identifier
 * @param maxSlots - capacity (default from config or 8)
 * @returns the created BotInventory
 */
export function createInventory(
	botId: string,
	maxSlots: number = DEFAULT_INVENTORY_SLOTS,
): BotInventory {
	const inv: BotInventory = {
		botId,
		maxSlots,
		slots: [],
	};
	inventories.set(botId, inv);
	return inv;
}

/**
 * Remove a bot's inventory entirely.
 */
export function destroyInventory(botId: string): boolean {
	return inventories.delete(botId);
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Add items to a bot's inventory, auto-stacking where possible.
 *
 * Returns how many items were actually added. If inventory is full and
 * no more can be stacked, remaining items are discarded (partial add).
 */
export function addItem(
	botId: string,
	itemId: string,
	quantity: number = 1,
): AddItemResult {
	const inv = inventories.get(botId);
	if (!inv) return { success: false, added: 0 };

	if (quantity <= 0) return { success: false, added: 0 };

	const def = itemDefs.get(itemId);
	const maxStack = def?.maxStack ?? 1;

	let remaining = quantity;

	// Phase 1: fill existing stacks of the same item
	for (const slot of inv.slots) {
		if (remaining <= 0) break;
		if (slot.itemId !== itemId) continue;

		const canAdd = maxStack - slot.quantity;
		if (canAdd <= 0) continue;

		const toAdd = Math.min(remaining, canAdd);
		slot.quantity += toAdd;
		remaining -= toAdd;
	}

	// Phase 2: fill empty slots with new stacks
	while (remaining > 0 && inv.slots.length < inv.maxSlots) {
		const toAdd = Math.min(remaining, maxStack);
		inv.slots.push({ itemId, quantity: toAdd });
		remaining -= toAdd;
	}

	const added = quantity - remaining;
	return { success: added > 0, added };
}

/**
 * Remove items from a bot's inventory.
 *
 * Removes from the last matching stack first (LIFO within stacks).
 * Returns false if the bot doesn't have enough of the item.
 */
export function removeItem(
	botId: string,
	itemId: string,
	quantity: number = 1,
): boolean {
	const inv = inventories.get(botId);
	if (!inv) return false;

	if (quantity <= 0) return false;

	// Check total available
	let total = 0;
	for (const slot of inv.slots) {
		if (slot.itemId === itemId) total += slot.quantity;
	}
	if (total < quantity) return false;

	// Remove from stacks (last first)
	let remaining = quantity;
	for (let i = inv.slots.length - 1; i >= 0 && remaining > 0; i--) {
		const slot = inv.slots[i];
		if (slot.itemId !== itemId) continue;

		const toRemove = Math.min(remaining, slot.quantity);
		slot.quantity -= toRemove;
		remaining -= toRemove;

		if (slot.quantity <= 0) {
			inv.slots.splice(i, 1);
		}
	}

	return true;
}

/**
 * Get a read-only snapshot of a bot's inventory.
 */
export function getInventory(botId: string): BotInventory | null {
	const inv = inventories.get(botId);
	if (!inv) return null;

	return {
		botId: inv.botId,
		maxSlots: inv.maxSlots,
		slots: inv.slots.map((s) => ({ ...s })),
	};
}

/**
 * Check whether a bot has at least `quantity` of an item.
 */
export function hasItem(
	botId: string,
	itemId: string,
	quantity: number = 1,
): boolean {
	return getItemCount(botId, itemId) >= quantity;
}

/**
 * Get the total count of a specific item across all stacks.
 */
export function getItemCount(botId: string, itemId: string): number {
	const inv = inventories.get(botId);
	if (!inv) return 0;

	let count = 0;
	for (const slot of inv.slots) {
		if (slot.itemId === itemId) count += slot.quantity;
	}
	return count;
}

/**
 * Transfer items from one bot to another.
 *
 * Removes from source first, then adds to destination. If the
 * destination cannot accept all items, rolls back the source removal.
 */
export function transferItem(
	fromBotId: string,
	toBotId: string,
	itemId: string,
	quantity: number = 1,
): TransferResult {
	const fromInv = inventories.get(fromBotId);
	const toInv = inventories.get(toBotId);
	if (!fromInv || !toInv) return { success: false, transferred: 0 };

	if (quantity <= 0) return { success: false, transferred: 0 };

	// Check source has enough
	if (!hasItem(fromBotId, itemId, quantity)) {
		return { success: false, transferred: 0 };
	}

	// Snapshot source slots for rollback
	const sourceSnapshot = fromInv.slots.map((s) => ({ ...s }));

	// Remove from source
	const removed = removeItem(fromBotId, itemId, quantity);
	if (!removed) return { success: false, transferred: 0 };

	// Add to destination
	const addResult = addItem(toBotId, itemId, quantity);
	if (addResult.added === quantity) {
		return { success: true, transferred: quantity };
	}

	// Partial or failed add — rollback source
	// Remove whatever was added to destination
	if (addResult.added > 0) {
		removeItem(toBotId, itemId, addResult.added);
	}

	// Restore source
	fromInv.slots = sourceSnapshot;

	return { success: false, transferred: 0 };
}

// ---------------------------------------------------------------------------
// Weight system
// ---------------------------------------------------------------------------

/**
 * Calculate the total weight of all items in a bot's inventory.
 */
export function getTotalWeight(botId: string): number {
	const inv = inventories.get(botId);
	if (!inv) return 0;

	let weight = 0;
	for (const slot of inv.slots) {
		const def = itemDefs.get(slot.itemId);
		const itemWeight = def?.weight ?? 1.0;
		weight += itemWeight * slot.quantity;
	}
	return weight;
}

/**
 * Get a movement speed multiplier based on carried weight.
 *
 * Returns 1.0 at zero weight, decreasing linearly to `minMultiplier`
 * at `maxWeight`. Above maxWeight, clamps to minMultiplier.
 *
 * @param botId - the bot to check
 * @param maxWeight - weight at which minimum speed is reached (default 20)
 * @param minMultiplier - minimum speed multiplier (default 0.4)
 */
export function getSpeedMultiplier(
	botId: string,
	maxWeight: number = 20,
	minMultiplier: number = 0.4,
): number {
	const totalWeight = getTotalWeight(botId);
	if (totalWeight <= 0) return 1.0;
	if (totalWeight >= maxWeight) return minMultiplier;

	const ratio = totalWeight / maxWeight;
	return 1.0 - ratio * (1.0 - minMultiplier);
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Get the number of free slots remaining in a bot's inventory.
 */
export function getFreeSlots(botId: string): number {
	const inv = inventories.get(botId);
	if (!inv) return 0;
	return inv.maxSlots - inv.slots.length;
}

/**
 * Check if a bot's inventory is completely full (no free slots and
 * all existing stacks are at max).
 */
export function isInventoryFull(botId: string): boolean {
	const inv = inventories.get(botId);
	if (!inv) return true; // no inventory = can't add anything

	if (inv.slots.length < inv.maxSlots) return false;

	// Check if any existing stack has room
	for (const slot of inv.slots) {
		const def = itemDefs.get(slot.itemId);
		const maxStack = def?.maxStack ?? 1;
		if (slot.quantity < maxStack) return false;
	}

	return true;
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Reset all inventory state. For testing and save/load.
 */
export function _resetInventoryState(): void {
	inventories.clear();
	// Restore default item defs
	itemDefs.clear();
	for (const [id, def] of Object.entries(DEFAULT_ITEM_DEFS)) {
		itemDefs.set(id, def);
	}
}
