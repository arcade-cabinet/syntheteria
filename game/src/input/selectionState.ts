/**
 * Selection state manager — reactive store for the currently selected entity.
 *
 * Pure TypeScript, no ECS dependency. Multiple consumers (highlight renderer,
 * radial menu, HUD) subscribe via onSelectionChange and react independently.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SelectionChangeEvent {
	newId: string | null;
	oldId: string | null;
}

type SelectionChangeCallback = (event: SelectionChangeEvent) => void;

// ─── Module-level state ─────────────────────────────────────────────────────

let currentSelection: string | null = null;
const listeners = new Set<SelectionChangeCallback>();

// ─── Public API ─────────────────────────────────────────────────────────────

/** Set the selected entity ID. Passing null clears the selection. */
export function setSelected(entityId: string | null): void {
	const oldId = currentSelection;
	currentSelection = entityId;
	for (const cb of listeners) {
		cb({ newId: entityId, oldId });
	}
}

/** Get the currently selected entity ID, or null if nothing is selected. */
export function getSelected(): string | null {
	return currentSelection;
}

/** Subscribe to selection changes. Returns an unsubscribe function. */
export function onSelectionChange(
	callback: SelectionChangeCallback,
): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}

/** Reset all state (for testing). */
export function _resetSelectionState(): void {
	currentSelection = null;
	listeners.clear();
}
