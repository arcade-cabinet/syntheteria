/**
 * crosshairTooltip.ts — Pure functions for crosshair style and contextual tooltip.
 *
 * Crosshair styles (5 total):
 *   "none"      — no entity in range (default dot crosshair)
 *   "interact"  — interactable entity (building, furnace, otter, belt, wire, relay)
 *   "harvest"   — ore deposit in range
 *   "combat"    — enemy unit in range
 *   "build"     — in build placement mode (crosshair snaps to ground)
 *
 * Tooltip shows entity label, distance, and context actions.
 */

import type { EntityCategory } from "../input/ObjectSelectionSystem";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CrosshairStyle =
	| "none"
	| "interact"
	| "harvest"
	| "combat"
	| "build";

export interface TooltipAction {
	key: string;
	label: string;
}

export interface CrosshairTooltipInfo {
	style: CrosshairStyle;
	entityLabel: string | null;
	distance: number | null;
	actions: TooltipAction[];
}

// ─── Entity label lookup ──────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<NonNullable<EntityCategory>, string> = {
	unit: "Unit",
	building: "Structure",
	belt: "Conveyor Belt",
	wire: "Power Wire",
	miner: "Mining Rig",
	processor: "Processor",
	item: "Item",
	otter: "Otter Hologram",
	hackable: "Hackable Terminal",
	signalRelay: "Signal Relay",
	oreDeposit: "Ore Deposit",
	furnace: "Furnace",
	ground: "Ground",
};

// ─── Actions per category ─────────────────────────────────────────────────────

const CATEGORY_ACTIONS: Record<NonNullable<EntityCategory>, TooltipAction[]> = {
	oreDeposit: [{ key: "F", label: "Harvest" }],
	furnace: [
		{ key: "E", label: "Open Furnace" },
		{ key: "G", label: "Deposit Cube" },
	],
	building: [{ key: "E", label: "Interact" }],
	miner: [{ key: "E", label: "Configure" }],
	processor: [{ key: "E", label: "Configure" }],
	belt: [{ key: "E", label: "Inspect Belt" }],
	wire: [{ key: "E", label: "Inspect Wire" }],
	unit: [
		{ key: "CLICK", label: "Select" },
		{ key: "E", label: "Interact" },
	],
	item: [{ key: "G", label: "Pick Up" }],
	otter: [{ key: "E", label: "Talk" }],
	hackable: [{ key: "E", label: "Hack" }],
	signalRelay: [{ key: "E", label: "Configure" }],
	ground: [{ key: "G", label: "Drop Cube" }],
};

// ─── Pure functions ───────────────────────────────────────────────────────────

/**
 * Determine the crosshair style given the hovered entity category.
 *
 * @param entityType - The category of the hovered entity, or null for none.
 * @param isBuildMode - True if the player is in active placement mode.
 * @param isEnemy - True if the hovered unit belongs to an enemy faction.
 */
export function getCrosshairStyle(
	entityType: EntityCategory,
	isBuildMode: boolean,
	isEnemy: boolean,
): CrosshairStyle {
	if (isBuildMode) return "build";
	if (!entityType || entityType === null) return "none";
	if (entityType === "oreDeposit") return "harvest";
	if (entityType === "unit" && isEnemy) return "combat";
	if (entityType === "ground") return "none";
	return "interact";
}

/**
 * Build the full tooltip info for the current hover state.
 *
 * @param entityType - The category of the hovered entity.
 * @param entityName - Optional display name override from ECS (e.g. bot name).
 * @param distance - Distance in world units from the player camera.
 * @param isBuildMode - True if in placement mode.
 * @param isEnemy - True if the hovered unit is an enemy.
 */
export function getCrosshairTooltipInfo(
	entityType: EntityCategory,
	entityName: string | null,
	distance: number | null,
	isBuildMode: boolean,
	isEnemy: boolean,
): CrosshairTooltipInfo {
	const style = getCrosshairStyle(entityType, isBuildMode, isEnemy);

	if (style === "build") {
		return {
			style,
			entityLabel: null,
			distance: null,
			actions: [{ key: "CLICK", label: "Place" }, { key: "ESC", label: "Cancel" }],
		};
	}

	if (!entityType || entityType === "ground") {
		return { style: "none", entityLabel: null, distance: null, actions: [] };
	}

	const baseLabel = CATEGORY_LABELS[entityType] ?? entityType;
	const entityLabel = entityName ? `${entityName} (${baseLabel})` : baseLabel;
	const actions = CATEGORY_ACTIONS[entityType] ?? [];

	return {
		style,
		entityLabel,
		distance,
		actions,
	};
}

/**
 * Format a world-unit distance to a player-readable string.
 * e.g. 3.2 → "3.2m"
 */
export function formatDistance(distance: number | null): string | null {
	if (distance === null) return null;
	return `${distance.toFixed(1)}m`;
}
