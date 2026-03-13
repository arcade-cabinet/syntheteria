/**
 * Tooltip System — entity stat tooltips on hover/tap-hold.
 *
 * Shows unit, building, or structure stats near the entity.
 * Positioned to avoid overlapping screen edges.
 *
 * Desktop: hover triggers tooltip after a short delay.
 * Mobile: tap-hold triggers tooltip (same gesture as long-press but shorter threshold).
 *
 * Consumers subscribe via useSyncExternalStore pattern.
 */

import type { UnitTurnState } from "./turnSystem";

export interface TooltipData {
	visible: boolean;
	/** Screen-space position (px from top-left) */
	screenX: number;
	screenY: number;
	/** Entity kind */
	kind: "unit" | "building" | "structure" | null;
	/** Display name */
	name: string;
	/** Entity ID */
	entityId: string;
	/** Faction */
	faction: string;
	/** Unit-specific fields */
	unitType: string | null;
	archetype: string | null;
	markLevel: number;
	/** HP fields (units have component HP) */
	hpCurrent: number;
	hpMax: number;
	/** Turn state */
	turnState: UnitTurnState | null;
	/** Current action description */
	currentAction: string | null;
	/** XP progress toward next Mark (0-1) */
	xpProgress: number;
	/** Whether the unit can be upgraded */
	upgradeEligible: boolean;
	/** Building-specific fields */
	buildingType: string | null;
	constructionStage: string | null;
	buildingOutput: string | null;
	powered: boolean;
	/** Structure-specific fields */
	harvestableResources: string[];
}

// ─── State ───────────────────────────────────────────────────────────────────

let tooltip: TooltipData = makeEmpty();
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function makeEmpty(): TooltipData {
	return {
		visible: false,
		screenX: 0,
		screenY: 0,
		kind: null,
		name: "",
		entityId: "",
		faction: "",
		unitType: null,
		archetype: null,
		markLevel: 0,
		hpCurrent: 0,
		hpMax: 0,
		turnState: null,
		currentAction: null,
		xpProgress: 0,
		upgradeEligible: false,
		buildingType: null,
		constructionStage: null,
		buildingOutput: null,
		powered: false,
		harvestableResources: [],
	};
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeTooltip(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getTooltipState(): TooltipData {
	return tooltip;
}

/**
 * Show a unit tooltip.
 */
export function showUnitTooltip(
	screenX: number,
	screenY: number,
	data: {
		entityId: string;
		name: string;
		faction: string;
		unitType: string;
		archetype: string;
		markLevel: number;
		hpCurrent: number;
		hpMax: number;
		turnState: UnitTurnState | null;
		currentAction: string | null;
		xpProgress?: number;
		upgradeEligible?: boolean;
	},
) {
	tooltip = {
		...makeEmpty(),
		visible: true,
		screenX,
		screenY,
		kind: "unit",
		name: data.name,
		entityId: data.entityId,
		faction: data.faction,
		unitType: data.unitType,
		archetype: data.archetype,
		markLevel: data.markLevel,
		hpCurrent: data.hpCurrent,
		hpMax: data.hpMax,
		turnState: data.turnState,
		currentAction: data.currentAction,
		xpProgress: data.xpProgress ?? 0,
		upgradeEligible: data.upgradeEligible ?? false,
	};
	notify();
}

/**
 * Show a building tooltip.
 */
export function showBuildingTooltip(
	screenX: number,
	screenY: number,
	data: {
		entityId: string;
		name: string;
		faction: string;
		buildingType: string;
		constructionStage: string | null;
		buildingOutput: string | null;
		powered: boolean;
	},
) {
	tooltip = {
		...makeEmpty(),
		visible: true,
		screenX,
		screenY,
		kind: "building",
		name: data.name,
		entityId: data.entityId,
		faction: data.faction,
		buildingType: data.buildingType,
		constructionStage: data.constructionStage,
		buildingOutput: data.buildingOutput,
		powered: data.powered,
	};
	notify();
}

/**
 * Show a structure tooltip (harvestable).
 */
export function showStructureTooltip(
	screenX: number,
	screenY: number,
	data: {
		entityId: string;
		name: string;
		harvestableResources: string[];
	},
) {
	tooltip = {
		...makeEmpty(),
		visible: true,
		screenX,
		screenY,
		kind: "structure",
		name: data.name,
		entityId: data.entityId,
		harvestableResources: data.harvestableResources,
	};
	notify();
}

/**
 * Hide the tooltip.
 */
export function hideTooltip() {
	if (!tooltip.visible) return;
	tooltip = makeEmpty();
	notify();
}

/**
 * Reset — call on new game or tests.
 */
export function _reset() {
	tooltip = makeEmpty();
}
