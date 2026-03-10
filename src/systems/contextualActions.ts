/**
 * Contextual Actions system — maps clicked entity types to radial menu actions.
 *
 * This is the brain behind the contextual interaction system. When the player
 * clicks on a world object, this module determines which actions appear in the
 * radial menu based on:
 *   - Entity category (what type of thing was clicked)
 *   - Player state (holding a cube? near enough?)
 *   - Entity state (furnace powered? deposit depleted?)
 *
 * It also provides quick-action resolution for single-click shortcuts (e.g.
 * clicking an ore deposit immediately starts harvesting without opening the
 * radial menu).
 *
 * Custom actions can be registered by mods/extensions via registerCustomActions().
 *
 * No React — pure TypeScript logic. Fully testable in isolation.
 */

import type { RadialMenuItem } from "./hudState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All recognized entity categories in the game world. */
export type EntityCategory =
	| "ore_deposit"
	| "material_cube"
	| "furnace"
	| "belt"
	| "lightning_rod"
	| "turret"
	| "enemy_bot"
	| "friendly_bot"
	| "otter"
	| "wall"
	| "wire"
	| "building"
	| "unknown";

/** Snapshot of the player's current state, used for enable/disable checks. */
export interface PlayerState {
	/** Whether the player is currently holding a material cube. */
	isHoldingCube: boolean;
	/** Distance in world units from the player to the target entity. */
	distanceToTarget: number;
	/** Current health percentage (0–1). */
	healthPercent?: number;
	/** Whether the player has a hacking module equipped. */
	hasHackModule?: boolean;
	/** Amount of ammo the player currently has. */
	ammoCount?: number;
}

/** Snapshot of the target entity's state, used for enable/disable checks. */
export interface EntityState {
	/** Whether the entity is powered (furnaces, buildings). */
	isPowered?: boolean;
	/** Whether the ore deposit is depleted (quantity <= 0). */
	isDepleted?: boolean;
	/** Current health percentage of the entity (0–1). */
	healthPercent?: number;
	/** Remaining quantity for ore deposits. */
	quantity?: number;
}

/** Result returned by executeAction after processing an action. */
export interface ActionResult {
	/** Whether the action completed successfully. */
	success: boolean;
	/** Human-readable message describing the outcome. */
	message: string;
	/** Optional sound event to trigger (consumed by audio system). */
	soundEvent?: string;
	/** Optional particle event to trigger (consumed by VFX system). */
	particleEvent?: string;
}

/**
 * Data about an entity used by categorizeEntity to determine its category.
 * Mirrors common ECS trait patterns.
 */
export interface EntityData {
	/** ECS trait strings on the entity. */
	traits?: string[];
	/** Explicit type tag, if set. */
	type?: string;
	/** Faction the entity belongs to. */
	faction?: string;
}

// ---------------------------------------------------------------------------
// Constants — interaction ranges per category
// ---------------------------------------------------------------------------

const INTERACTION_RANGES: Record<EntityCategory, number> = {
	ore_deposit: 3.0,
	material_cube: 2.5,
	furnace: 3.0,
	belt: 3.0,
	lightning_rod: 4.0,
	turret: 4.0,
	enemy_bot: 15.0,
	friendly_bot: 5.0,
	otter: 4.0,
	wall: 3.0,
	wire: 3.0,
	building: 4.0,
	unknown: 2.0,
};

// ---------------------------------------------------------------------------
// Action definitions per entity category
// ---------------------------------------------------------------------------

/** Default action sets per entity category. */
const DEFAULT_ACTIONS: Record<EntityCategory, RadialMenuItem[]> = {
	ore_deposit: [
		{ id: "harvest", label: "Harvest", icon: "\u26CF", enabled: true, hotkey: "E" },
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
		{ id: "mark_map", label: "Mark on Map", icon: "\uD83D\uDCCD", enabled: true },
	],
	material_cube: [
		{ id: "grab", label: "Grab", icon: "\u270B", enabled: true, hotkey: "E" },
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
		{ id: "kick", label: "Kick", icon: "\u{1F9B6}", enabled: true },
	],
	furnace: [
		{ id: "deposit", label: "Deposit Cube", icon: "\u2B07", enabled: true, hotkey: "E" },
		{ id: "view_recipes", label: "View Recipes", icon: "\uD83D\uDCD6", enabled: true },
		{ id: "toggle_power", label: "Toggle Power", icon: "\u23FB", enabled: true },
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
	],
	belt: [
		{ id: "rotate", label: "Rotate", icon: "\u21BB", enabled: true, hotkey: "R" },
		{ id: "remove", label: "Remove", icon: "\u2716", enabled: true },
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
		{ id: "toggle", label: "Toggle", icon: "\u23FB", enabled: true },
	],
	lightning_rod: [
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
		{ id: "repair", label: "Repair", icon: "\uD83D\uDD27", enabled: true },
		{ id: "relocate", label: "Relocate", icon: "\u2194", enabled: true },
	],
	turret: [
		{ id: "target_priority", label: "Target Priority", icon: "\uD83C\uDFAF", enabled: true },
		{ id: "repair", label: "Repair", icon: "\uD83D\uDD27", enabled: true },
		{ id: "ammo_status", label: "Ammo Status", icon: "\uD83D\uDCE6", enabled: true },
		{ id: "deactivate", label: "Deactivate", icon: "\u23FB", enabled: true },
	],
	enemy_bot: [
		{ id: "attack", label: "Attack", icon: "\u2694", enabled: true, hotkey: "F" },
		{ id: "hack", label: "Hack", icon: "\u2588", enabled: true },
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
		{ id: "flee", label: "Flee", icon: "\uD83C\uDFC3", enabled: true },
	],
	friendly_bot: [
		{ id: "command", label: "Command", icon: "\u25B6", enabled: true },
		{ id: "switch_to", label: "Switch To", icon: "\u21C4", enabled: true, hotkey: "Q" },
		{ id: "repair", label: "Repair", icon: "\uD83D\uDD27", enabled: true },
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
	],
	otter: [
		{ id: "talk", label: "Talk", icon: "\uD83D\uDCAC", enabled: true, hotkey: "E" },
		{ id: "trade", label: "Trade", icon: "\uD83D\uDCB0", enabled: true },
		{ id: "quest_log", label: "Quest Log", icon: "\uD83D\uDCDC", enabled: true },
	],
	wall: [
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
		{ id: "reinforce", label: "Reinforce", icon: "\uD83D\uDEE1", enabled: true },
		{ id: "demolish", label: "Demolish", icon: "\u2716", enabled: true },
	],
	wire: [
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
		{ id: "reroute", label: "Reroute", icon: "\u21AA", enabled: true },
		{ id: "cut", label: "Cut", icon: "\u2702", enabled: true },
	],
	building: [
		{ id: "repair", label: "Repair", icon: "\uD83D\uDD27", enabled: true },
		{ id: "power", label: "Power", icon: "\u23FB", enabled: true },
		{ id: "upgrade", label: "Upgrade", icon: "\u2B06", enabled: true },
		{ id: "demolish", label: "Demolish", icon: "\u2716", enabled: true },
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
	],
	unknown: [
		{ id: "inspect", label: "Inspect", icon: "\u25C9", enabled: true },
	],
};

// ---------------------------------------------------------------------------
// Quick-action mapping per category
// ---------------------------------------------------------------------------

const QUICK_ACTIONS: Record<EntityCategory, string | null> = {
	ore_deposit: "harvest",
	material_cube: "grab",
	furnace: "deposit",
	belt: null,
	lightning_rod: null,
	turret: null,
	enemy_bot: "attack",
	friendly_bot: "switch_to",
	otter: "talk",
	wall: null,
	wire: null,
	building: null,
	unknown: null,
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Custom actions registered by mods/extensions, keyed by category. */
const customActions = new Map<EntityCategory, RadialMenuItem[]>();

// ---------------------------------------------------------------------------
// Public API — categorizeEntity
// ---------------------------------------------------------------------------

/**
 * Determine what category an entity falls into based on its traits/components.
 *
 * The categorization uses trait strings from the ECS, the entity's explicit
 * type tag, and its faction to resolve the best category.
 *
 * @param entityId - unique ID of the entity (currently unused, reserved)
 * @param entityData - traits, type, and faction info for the entity
 * @returns the resolved EntityCategory
 */
export function categorizeEntity(
	_entityId: string,
	entityData: EntityData,
): EntityCategory {
	const traits = new Set(entityData.traits ?? []);
	const type = entityData.type?.toLowerCase() ?? "";

	// Trait-based matching (most specific first)
	if (traits.has("OreDeposit") || type === "ore_deposit") return "ore_deposit";
	if (traits.has("MaterialCube") || type === "material_cube") return "material_cube";
	if (traits.has("Furnace") || type === "furnace") return "furnace";
	if (traits.has("Belt") || type === "belt") return "belt";
	if (traits.has("LightningRod") || type === "lightning_rod") return "lightning_rod";
	if (traits.has("Turret") || type === "turret") return "turret";
	if (traits.has("Otter") || type === "otter") return "otter";
	if (traits.has("Wall") || type === "wall") return "wall";
	if (traits.has("Wire") || type === "wire") return "wire";

	// Bot detection requires faction check
	if (traits.has("Unit") || type === "bot" || type === "unit") {
		const faction = entityData.faction?.toLowerCase() ?? "";
		if (faction === "player" || faction === "friendly") return "friendly_bot";
		if (faction === "enemy" || faction === "hostile") return "enemy_bot";
		// Default bots without faction info to friendly
		return "friendly_bot";
	}

	// Enemy check (explicit enemy type or hostile faction)
	if (type === "enemy" || type === "enemy_bot") return "enemy_bot";
	if (entityData.faction?.toLowerCase() === "enemy" || entityData.faction?.toLowerCase() === "hostile") {
		return "enemy_bot";
	}

	// Generic building fallback
	if (traits.has("Building") || type === "building") return "building";

	return "unknown";
}

// ---------------------------------------------------------------------------
// Public API — getActionsForEntity
// ---------------------------------------------------------------------------

/**
 * Get the list of contextual radial menu actions for a given entity.
 *
 * Actions are filtered and their enabled state is adjusted based on:
 * - Entity category
 * - Player state (holding cube, distance, health, etc.)
 * - Entity state (powered, depleted, etc.)
 *
 * Custom actions registered via registerCustomActions() are appended.
 *
 * @param entityId - unique ID of the entity (reserved for future per-entity overrides)
 * @param category - the entity's category (from categorizeEntity)
 * @param playerState - current player state snapshot
 * @param entityState - optional entity state snapshot
 * @returns array of RadialMenuItem with enabled states adjusted
 */
export function getActionsForEntity(
	_entityId: string,
	category: EntityCategory,
	playerState: PlayerState,
	entityState: EntityState = {},
): RadialMenuItem[] {
	// Start with a deep copy of default actions for the category
	const baseActions = (DEFAULT_ACTIONS[category] ?? DEFAULT_ACTIONS.unknown).map(
		(a) => ({ ...a }),
	);

	const inRange = playerState.distanceToTarget <= INTERACTION_RANGES[category];

	// Apply category-specific enable/disable logic
	switch (category) {
		case "ore_deposit":
			for (const action of baseActions) {
				if (action.id === "harvest") {
					action.enabled = !entityState.isDepleted && inRange;
				}
			}
			break;

		case "material_cube":
			for (const action of baseActions) {
				if (action.id === "grab") {
					action.enabled = !playerState.isHoldingCube && inRange;
				}
			}
			break;

		case "furnace":
			for (const action of baseActions) {
				if (action.id === "deposit") {
					action.enabled = playerState.isHoldingCube && inRange;
				}
				if (action.id === "toggle_power") {
					action.enabled = inRange;
				}
			}
			break;

		case "enemy_bot":
			for (const action of baseActions) {
				if (action.id === "hack") {
					action.enabled = !!playerState.hasHackModule;
				}
			}
			break;

		case "friendly_bot":
			for (const action of baseActions) {
				if (action.id === "repair") {
					action.enabled =
						inRange && (entityState.healthPercent ?? 1) < 1;
				}
			}
			break;

		case "building":
			for (const action of baseActions) {
				if (action.id === "repair") {
					action.enabled =
						inRange && (entityState.healthPercent ?? 1) < 1;
				}
			}
			break;

		case "turret":
			for (const action of baseActions) {
				if (action.id === "repair") {
					action.enabled =
						inRange && (entityState.healthPercent ?? 1) < 1;
				}
			}
			break;

		// Categories with no special enable/disable logic use defaults
		default:
			break;
	}

	// Append custom actions for this category
	const custom = customActions.get(category);
	if (custom) {
		for (const action of custom) {
			baseActions.push({ ...action });
		}
	}

	return baseActions;
}

// ---------------------------------------------------------------------------
// Public API — executeAction
// ---------------------------------------------------------------------------

/**
 * Execute a contextual action on a target entity.
 *
 * This function validates the action exists for the category, checks that
 * it is enabled given the player/entity state, and returns an ActionResult.
 *
 * NOTE: This module does not perform the actual game logic (e.g. starting
 * harvesting, grabbing a cube). It validates and signals. Downstream systems
 * read the result and perform the real work.
 *
 * @param actionId - the action to execute (e.g. "harvest", "grab")
 * @param entityId - unique ID of the target entity
 * @param category - the entity's category
 * @param playerState - current player state snapshot
 * @param entityState - optional entity state snapshot
 * @returns ActionResult describing the outcome
 */
export function executeAction(
	actionId: string,
	entityId: string,
	category: EntityCategory,
	playerState: PlayerState,
	entityState: EntityState = {},
): ActionResult {
	const actions = getActionsForEntity(entityId, category, playerState, entityState);
	const action = actions.find((a) => a.id === actionId);

	if (!action) {
		return {
			success: false,
			message: `Unknown action "${actionId}" for category "${category}".`,
		};
	}

	if (!action.enabled) {
		return {
			success: false,
			message: `Action "${action.label}" is currently disabled.`,
		};
	}

	// Resolve sound/particle events by action type
	const result: ActionResult = {
		success: true,
		message: `${action.label} executed on entity ${entityId}.`,
	};

	switch (actionId) {
		case "harvest":
			result.soundEvent = "harvest_start";
			result.particleEvent = "grind_sparks";
			break;
		case "grab":
			result.soundEvent = "cube_grab";
			break;
		case "deposit":
			result.soundEvent = "cube_deposit";
			result.particleEvent = "hopper_steam";
			break;
		case "attack":
			result.soundEvent = "weapon_fire";
			result.particleEvent = "muzzle_flash";
			break;
		case "hack":
			result.soundEvent = "hack_start";
			result.particleEvent = "data_stream";
			break;
		case "demolish":
			result.soundEvent = "demolish_crash";
			result.particleEvent = "debris_burst";
			break;
		case "repair":
			result.soundEvent = "repair_weld";
			result.particleEvent = "weld_sparks";
			break;
		case "toggle_power":
		case "power":
		case "deactivate":
			result.soundEvent = "power_toggle";
			break;
		case "talk":
			result.soundEvent = "otter_chirp";
			break;
		case "cut":
			result.soundEvent = "wire_cut";
			result.particleEvent = "electric_spark";
			break;
		default:
			result.soundEvent = "ui_click";
			break;
	}

	return result;
}

// ---------------------------------------------------------------------------
// Public API — getQuickAction
// ---------------------------------------------------------------------------

/**
 * Get the quick-action ID for an entity category — the action that fires on
 * single-click without opening the radial menu.
 *
 * Quick actions are context-aware: they return null when the action would
 * be disabled (e.g. "grab" when already holding a cube).
 *
 * @param category - the entity's category
 * @param playerState - current player state snapshot
 * @param entityState - optional entity state snapshot
 * @returns action ID string, or null if no quick action available
 */
export function getQuickAction(
	category: EntityCategory,
	playerState: PlayerState,
	entityState: EntityState = {},
): string | null {
	const quickActionId = QUICK_ACTIONS[category];
	if (!quickActionId) return null;

	const inRange =
		playerState.distanceToTarget <= INTERACTION_RANGES[category];

	// Validate the quick action is actually possible
	switch (quickActionId) {
		case "harvest":
			if (entityState.isDepleted || !inRange) return null;
			if ((entityState.quantity ?? 1) <= 0) return null;
			return "harvest";

		case "grab":
			if (playerState.isHoldingCube || !inRange) return null;
			return "grab";

		case "deposit":
			if (!playerState.isHoldingCube || !inRange) return null;
			return "deposit";

		case "attack":
			// Attack always available for enemies (ranged)
			return "attack";

		case "switch_to":
			if (!inRange) return null;
			return "switch_to";

		case "talk":
			if (!inRange) return null;
			return "talk";

		default:
			return quickActionId;
	}
}

// ---------------------------------------------------------------------------
// Public API — registerCustomActions
// ---------------------------------------------------------------------------

/**
 * Register additional actions for an entity category.
 *
 * Intended for mods, extensions, or dynamic content that adds new interaction
 * options at runtime. Custom actions are appended after the default action set.
 *
 * @param category - the entity category to extend
 * @param actions - array of RadialMenuItem to append
 */
export function registerCustomActions(
	category: EntityCategory,
	actions: RadialMenuItem[],
): void {
	const existing = customActions.get(category) ?? [];
	customActions.set(category, [...existing, ...actions.map((a) => ({ ...a }))]);
}

// ---------------------------------------------------------------------------
// Public API — getInteractionRange
// ---------------------------------------------------------------------------

/**
 * Get the maximum interaction range for an entity category.
 *
 * @param category - the entity category
 * @returns range in world units
 */
export function getInteractionRange(category: EntityCategory): number {
	return INTERACTION_RANGES[category];
}

// ---------------------------------------------------------------------------
// Public API — reset (for testing)
// ---------------------------------------------------------------------------

/**
 * Reset all contextual actions state to defaults.
 *
 * Clears custom action registrations. Does NOT modify the default action
 * definitions (those are immutable constants).
 */
export function reset(): void {
	customActions.clear();
}
