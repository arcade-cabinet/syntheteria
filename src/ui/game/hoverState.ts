/**
 * hoverState — lightweight module-level store for tile hover info.
 *
 * Updated by HoverTracker (inside Canvas), consumed by InfoPanel (DOM overlay).
 * Uses a simple subscriber pattern to avoid coupling to React context.
 */

export interface HoverTileInfo {
	tileX: number;
	tileZ: number;
	terrain: string;
	passable: boolean;
	elevation: number;
	/** Resource deposit at tile, if any. */
	resource?: { material: string; amount: number };
	/** Faction controlling this tile, if any. */
	controllingFaction?: string;
}

export interface HoverUnitInfo {
	name: string;
	factionId: string;
	hp: number;
	maxHp: number;
	ap: number;
	maxAp: number;
	attack: number;
	defense: number;
	weightClass: string;
}

export interface HoverBuildingInfo {
	displayName: string;
	factionId: string;
	hp: number;
	maxHp: number;
	powered: boolean;
}

export interface HoverState {
	tile: HoverTileInfo | null;
	unit: HoverUnitInfo | null;
	building: HoverBuildingInfo | null;
	screenX: number;
	screenY: number;
}

let state: HoverState = {
	tile: null,
	unit: null,
	building: null,
	screenX: 0,
	screenY: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function getHoverState(): HoverState {
	return state;
}

export function setHoverState(next: HoverState): void {
	state = next;
	for (const fn of listeners) fn();
}

export function clearHoverState(): void {
	if (!state.tile && !state.unit && !state.building) return;
	state = { tile: null, unit: null, building: null, screenX: 0, screenY: 0 };
	for (const fn of listeners) fn();
}

export function subscribeHoverState(fn: Listener): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}
