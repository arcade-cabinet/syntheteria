/**
 * interactionSystem — contextual interaction state management (pure logic).
 *
 * Manages hover/select state for interactable objects in the world.
 * Each target type (ore_deposit, cube, furnace, etc.) has a set of
 * available actions determined by getAvailableActions(). The system
 * tracks which target is hovered, selected, and whether the radial
 * menu is open.
 *
 * Action execution is signaled but not performed here — the actual
 * game logic lives in other systems. This module only records the
 * last triggered action for external consumers to read and clear.
 *
 * No rendering or physics dependencies — fully testable in isolation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InteractionTargetType =
	| "ore_deposit"
	| "cube"
	| "furnace"
	| "building"
	| "bot"
	| "enemy"
	| "outpost"
	| "trade_post";

export interface InteractionAction {
	id: string;
	label: string;
}

export interface HoveredTarget {
	id: string;
	type: InteractionTargetType;
	distance: number;
}

export interface InteractionState {
	hoveredTarget: HoveredTarget | null;
	selectedTarget: { id: string; type: InteractionTargetType } | null;
	radialMenuOpen: boolean;
	availableActions: InteractionAction[];
}

export interface TriggeredAction {
	actionId: string;
	targetId: string;
	targetType: InteractionTargetType;
}

// ---------------------------------------------------------------------------
// Action definitions per target type
// ---------------------------------------------------------------------------

const ACTIONS_BY_TYPE: Record<InteractionTargetType, InteractionAction[]> = {
	ore_deposit: [
		{ id: "harvest", label: "Harvest" },
		{ id: "scan", label: "Scan" },
	],
	cube: [
		{ id: "grab", label: "Grab" },
		{ id: "inspect", label: "Inspect" },
		{ id: "throw", label: "Throw" },
	],
	furnace: [
		{ id: "open_menu", label: "Open Menu" },
		{ id: "deposit_cube", label: "Deposit Cube" },
		{ id: "repair", label: "Repair" },
	],
	building: [
		{ id: "interact", label: "Interact" },
		{ id: "upgrade", label: "Upgrade" },
		{ id: "demolish", label: "Demolish" },
		{ id: "repair", label: "Repair" },
	],
	bot: [
		{ id: "switch_to", label: "Switch To" },
		{ id: "follow", label: "Follow" },
		{ id: "command", label: "Command" },
		{ id: "repair", label: "Repair" },
	],
	enemy: [
		{ id: "attack", label: "Attack" },
		{ id: "hack", label: "Hack" },
		{ id: "scan", label: "Scan" },
	],
	outpost: [
		{ id: "claim", label: "Claim" },
		{ id: "upgrade", label: "Upgrade" },
		{ id: "demolish", label: "Demolish" },
	],
	trade_post: [
		{ id: "trade", label: "Trade" },
		{ id: "inspect", label: "Inspect" },
	],
};

// ---------------------------------------------------------------------------
// Interaction range per target type (in world units)
// ---------------------------------------------------------------------------

const MAX_RANGE_BY_TYPE: Record<InteractionTargetType, number> = {
	ore_deposit: 3.0,
	cube: 2.5,
	furnace: 3.0,
	building: 4.0,
	bot: 5.0,
	enemy: 15.0,
	outpost: 5.0,
	trade_post: 4.0,
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let hoveredTarget: HoveredTarget | null = null;
let selectedTarget: { id: string; type: InteractionTargetType } | null = null;
let radialMenuOpen = false;
let availableActions: InteractionAction[] = [];
let lastTriggeredAction: TriggeredAction | null = null;

// ---------------------------------------------------------------------------
// State change listeners
// ---------------------------------------------------------------------------

type StateListener = (state: InteractionState) => void;
const listeners = new Set<StateListener>();

function notifyListeners(): void {
	const state = getInteractionState();
	for (const cb of listeners) {
		cb(state);
	}
}

/** Subscribe to interaction state changes. Returns unsubscribe function. */
export function onInteractionStateChange(cb: StateListener): () => void {
	listeners.add(cb);
	return () => {
		listeners.delete(cb);
	};
}

// ---------------------------------------------------------------------------
// Public API — hover
// ---------------------------------------------------------------------------

/**
 * Set the currently hovered target.
 * Does NOT open the radial menu — that requires selectTarget().
 */
export function setHoveredTarget(
	id: string,
	type: InteractionTargetType,
	distance: number,
): void {
	hoveredTarget = { id, type, distance };
	notifyListeners();
}

/** Clear the hovered target. */
export function clearHover(): void {
	hoveredTarget = null;
	notifyListeners();
}

// ---------------------------------------------------------------------------
// Public API — selection
// ---------------------------------------------------------------------------

/**
 * Select a target by ID. Opens the radial menu with type-appropriate actions.
 *
 * If the target is currently hovered, uses the hover info for type resolution.
 * If no hover info matches, the caller must provide the type via the optional param.
 */
export function selectTarget(
	id: string,
	typeOverride?: InteractionTargetType,
): boolean {
	let targetType: InteractionTargetType | undefined = typeOverride;

	// Resolve type from current hover if it matches
	if (!targetType && hoveredTarget && hoveredTarget.id === id) {
		targetType = hoveredTarget.type;
	}

	if (!targetType) {
		return false; // Cannot determine target type
	}

	selectedTarget = { id, type: targetType };
	availableActions = [...ACTIONS_BY_TYPE[targetType]];
	radialMenuOpen = true;
	notifyListeners();
	return true;
}

/** Close the radial menu and clear selection. */
export function deselectTarget(): void {
	selectedTarget = null;
	radialMenuOpen = false;
	availableActions = [];
	lastTriggeredAction = null;
	notifyListeners();
}

// ---------------------------------------------------------------------------
// Public API — actions
// ---------------------------------------------------------------------------

/**
 * Get the list of available actions for a given target type.
 * Returns a copy so callers cannot mutate internal state.
 */
export function getAvailableActions(
	targetType: InteractionTargetType,
): InteractionAction[] {
	return [...ACTIONS_BY_TYPE[targetType]];
}

/**
 * Execute (trigger) an action on the currently selected target.
 * Records the action so external systems can read and process it.
 *
 * Returns true if the action was valid and triggered, false otherwise.
 */
export function executeAction(actionId: string): boolean {
	if (!selectedTarget || !radialMenuOpen) {
		return false;
	}

	const actionExists = availableActions.some((a) => a.id === actionId);
	if (!actionExists) {
		return false;
	}

	lastTriggeredAction = {
		actionId,
		targetId: selectedTarget.id,
		targetType: selectedTarget.type,
	};

	// Close menu after action
	radialMenuOpen = false;
	availableActions = [];
	const savedTarget = selectedTarget;
	selectedTarget = null;

	notifyListeners();
	return true;
}

/**
 * Get the last triggered action. External systems read this and then
 * call clearTriggeredAction() once processed.
 */
export function getTriggeredAction(): TriggeredAction | null {
	return lastTriggeredAction;
}

/** Clear the triggered action after external processing. */
export function clearTriggeredAction(): void {
	lastTriggeredAction = null;
}

// ---------------------------------------------------------------------------
// Public API — range checking
// ---------------------------------------------------------------------------

/**
 * Check whether a target at the given distance is within interaction range
 * for its type.
 */
export function canInteract(
	distance: number,
	targetType: InteractionTargetType,
): boolean {
	const maxRange = MAX_RANGE_BY_TYPE[targetType];
	return distance <= maxRange;
}

/**
 * Get the maximum interaction range for a target type.
 */
export function getMaxRange(targetType: InteractionTargetType): number {
	return MAX_RANGE_BY_TYPE[targetType];
}

// ---------------------------------------------------------------------------
// Public API — read state
// ---------------------------------------------------------------------------

/** Returns a snapshot of the current interaction state. */
export function getInteractionState(): InteractionState {
	return {
		hoveredTarget: hoveredTarget ? { ...hoveredTarget } : null,
		selectedTarget: selectedTarget ? { ...selectedTarget } : null,
		radialMenuOpen,
		availableActions: [...availableActions],
	};
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

/** Reset all interaction state to defaults. */
export function resetInteractionSystem(): void {
	hoveredTarget = null;
	selectedTarget = null;
	radialMenuOpen = false;
	availableActions = [];
	lastTriggeredAction = null;
	listeners.clear();
}
