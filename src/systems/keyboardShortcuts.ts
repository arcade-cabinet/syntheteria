/**
 * Keyboard Shortcuts System — global keybindings for game actions.
 *
 * Bindings:
 *   WASD / Arrows: camera pan (handled by TopDownCamera)
 *   Tab: cycle through player units
 *   Enter: end turn
 *   Escape: cancel placement / close radial / open pause
 *   1-6: quick-select radial menu actions
 *   Z: zoom cycle (handled by TopDownCamera)
 *
 * This module centralizes the non-camera keybindings and ensures
 * they don't conflict with browser defaults.
 */

import type { Entity } from "../ecs/traits";
import { Identity, Unit } from "../ecs/traits";
import { units } from "../ecs/world";
import { closeRadialMenu, getRadialMenuState } from "./radialMenu";
import { cancelPlacement, getActivePlacement } from "./buildingPlacement";
import { selectEntity, deselectAll } from "./unitSelection";
import { endPlayerTurn, getTurnState } from "./turnSystem";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KeyBinding {
	key: string;
	label: string;
	description: string;
	/** Prevent default browser behavior */
	preventDefault: boolean;
}

export const KEY_BINDINGS: KeyBinding[] = [
	{ key: "Tab", label: "Tab", description: "Cycle units", preventDefault: true },
	{ key: "Enter", label: "Enter", description: "End turn", preventDefault: false },
	{ key: "Escape", label: "Esc", description: "Cancel / Pause", preventDefault: false },
	{ key: "1", label: "1", description: "Action slot 1", preventDefault: false },
	{ key: "2", label: "2", description: "Action slot 2", preventDefault: false },
	{ key: "3", label: "3", description: "Action slot 3", preventDefault: false },
	{ key: "4", label: "4", description: "Action slot 4", preventDefault: false },
	{ key: "5", label: "5", description: "Action slot 5", preventDefault: false },
	{ key: "6", label: "6", description: "Action slot 6", preventDefault: false },
];

// ─── State ───────────────────────────────────────────────────────────────────

let installed = false;
let pauseCallback: (() => void) | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPlayerUnits() {
	const result: Array<{ entity: Entity; id: string }> = [];
	for (const entity of units) {
		const identity = entity.get(Identity);
		if (identity?.faction === "player") {
			result.push({ entity, id: identity.id });
		}
	}
	return result;
}

function getCurrentSelectedIndex(playerUnits: Array<{ entity: Entity; id: string }>): number {
	for (let i = 0; i < playerUnits.length; i++) {
		const unit = playerUnits[i].entity.get(Unit);
		if (unit?.selected) return i;
	}
	return -1;
}

/**
 * Cycle to the next player unit.
 */
export function cycleNextUnit() {
	const playerUnits = getPlayerUnits();
	if (playerUnits.length === 0) return;

	const currentIdx = getCurrentSelectedIndex(playerUnits);
	const nextIdx = (currentIdx + 1) % playerUnits.length;
	selectEntity(playerUnits[nextIdx].entity);
}

/**
 * Handle Escape key — prioritized actions:
 * 1. Close radial menu if open
 * 2. Cancel building placement if active
 * 3. Deselect all if something selected
 * 4. Open pause menu
 */
export function handleEscape() {
	if (getRadialMenuState().open) {
		closeRadialMenu();
		return;
	}
	if (getActivePlacement()) {
		cancelPlacement();
		return;
	}

	// Check if anything is selected
	for (const entity of units) {
		if (entity.get(Unit)?.selected) {
			deselectAll();
			return;
		}
	}

	// Nothing else to cancel — trigger pause
	if (pauseCallback) {
		pauseCallback();
	}
}

/**
 * Handle Enter key — end turn if it's the player's turn.
 */
export function handleEndTurn() {
	const state = getTurnState();
	if (state.phase === "player") {
		endPlayerTurn();
	}
}

// ─── Event Handler ──────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent) {
	// Don't capture if user is typing in an input field
	const target = e.target as HTMLElement | null;
	if (
		target &&
		(target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.isContentEditable)
	) {
		return;
	}

	switch (e.key) {
		case "Tab":
			e.preventDefault();
			cycleNextUnit();
			break;
		case "Enter":
			handleEndTurn();
			break;
		case "Escape":
			handleEscape();
			break;
		// Number keys 1-6 are reserved for future radial quick-actions
		default:
			break;
	}
}

// ─── Install / Uninstall ────────────────────────────────────────────────────

/**
 * Install global keyboard shortcuts. Call once from the game's root component.
 * Returns an uninstall function.
 */
export function installKeyboardShortcuts(onPause?: () => void): () => void {
	if (installed) return () => {};
	pauseCallback = onPause ?? null;
	window.addEventListener("keydown", onKeyDown);
	installed = true;
	return () => {
		window.removeEventListener("keydown", onKeyDown);
		installed = false;
		pauseCallback = null;
	};
}

/**
 * Update the pause callback after installation.
 */
export function setPauseCallback(cb: (() => void) | null) {
	pauseCallback = cb;
}

/**
 * Reset — call for tests.
 */
export function _reset() {
	if (installed) {
		window.removeEventListener("keydown", onKeyDown);
		installed = false;
	}
	pauseCallback = null;
}
