/**
 * Input mapper — configurable key binding system.
 *
 * Maps physical inputs (keyboard keys, mouse buttons, gamepad buttons)
 * to logical game actions. Supports rebinding, modifier keys, and
 * action state queries (pressed, held, released).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputAction =
	| "move_forward"
	| "move_backward"
	| "move_left"
	| "move_right"
	| "jump"
	| "sprint"
	| "crouch"
	| "interact"
	| "harvest"
	| "compress"
	| "grab"
	| "throw"
	| "build_menu"
	| "inventory"
	| "map"
	| "pause"
	| "switch_bot"
	| "quick_save"
	| "attack"
	| "hack"
	| "scan"
	| "cancel";

export interface KeyBinding {
	action: InputAction;
	primary: string; // key code (e.g., "KeyW", "Space", "Mouse0")
	secondary?: string; // optional alternate binding
	modifiers?: string[]; // required modifier keys (e.g., ["Shift"])
}

export type ActionState = "idle" | "pressed" | "held" | "released";

// ---------------------------------------------------------------------------
// Default bindings
// ---------------------------------------------------------------------------

const DEFAULT_BINDINGS: KeyBinding[] = [
	{ action: "move_forward", primary: "KeyW" },
	{ action: "move_backward", primary: "KeyS" },
	{ action: "move_left", primary: "KeyA" },
	{ action: "move_right", primary: "KeyD" },
	{ action: "jump", primary: "Space" },
	{ action: "sprint", primary: "ShiftLeft" },
	{ action: "crouch", primary: "ControlLeft" },
	{ action: "interact", primary: "KeyE" },
	{ action: "harvest", primary: "Mouse0" },
	{ action: "compress", primary: "KeyC" },
	{ action: "grab", primary: "KeyF" },
	{ action: "throw", primary: "KeyG" },
	{ action: "build_menu", primary: "KeyB" },
	{ action: "inventory", primary: "KeyI", secondary: "Tab" },
	{ action: "map", primary: "KeyM" },
	{ action: "pause", primary: "Escape" },
	{ action: "switch_bot", primary: "KeyQ" },
	{ action: "quick_save", primary: "F5" },
	{ action: "attack", primary: "Mouse0" },
	{ action: "hack", primary: "KeyH" },
	{ action: "scan", primary: "KeyV" },
	{ action: "cancel", primary: "Escape" },
];

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let bindings: KeyBinding[] = DEFAULT_BINDINGS.map((b) => ({ ...b }));

/** Currently pressed keys. */
const pressedKeys = new Set<string>();

/** Keys pressed this frame (for "pressed" state detection). */
const justPressed = new Set<string>();

/** Keys released this frame. */
const justReleased = new Set<string>();

// ---------------------------------------------------------------------------
// Key event handling
// ---------------------------------------------------------------------------

/**
 * Report a key press. Call from keyboard/mouse event handlers.
 */
export function onKeyDown(keyCode: string): void {
	if (!pressedKeys.has(keyCode)) {
		justPressed.add(keyCode);
	}
	pressedKeys.add(keyCode);
}

/**
 * Report a key release.
 */
export function onKeyUp(keyCode: string): void {
	pressedKeys.delete(keyCode);
	justReleased.add(keyCode);
}

/**
 * Clear per-frame state. Call at end of each frame.
 */
export function flushInputFrame(): void {
	justPressed.clear();
	justReleased.clear();
}

// ---------------------------------------------------------------------------
// Action queries
// ---------------------------------------------------------------------------

/**
 * Get the current state of an action.
 */
export function getActionState(action: InputAction): ActionState {
	const binding = bindings.find((b) => b.action === action);
	if (!binding) return "idle";

	const primaryMatch = matchesBinding(binding.primary, binding.modifiers);
	const secondaryMatch = binding.secondary
		? matchesBinding(binding.secondary, binding.modifiers)
		: false;

	// Check just pressed
	if (justPressed.has(binding.primary) || (binding.secondary && justPressed.has(binding.secondary))) {
		if (primaryMatch || secondaryMatch) return "pressed";
	}

	// Check just released
	if (justReleased.has(binding.primary) || (binding.secondary && justReleased.has(binding.secondary))) {
		return "released";
	}

	// Check held
	if (primaryMatch || secondaryMatch) return "held";

	return "idle";
}

/**
 * Check if an action is currently active (pressed or held).
 */
export function isActionActive(action: InputAction): boolean {
	const state = getActionState(action);
	return state === "pressed" || state === "held";
}

/**
 * Check if an action was just pressed this frame.
 */
export function wasActionPressed(action: InputAction): boolean {
	return getActionState(action) === "pressed";
}

/**
 * Check if an action was just released this frame.
 */
export function wasActionReleased(action: InputAction): boolean {
	return getActionState(action) === "released";
}

function matchesBinding(keyCode: string, modifiers?: string[]): boolean {
	if (!pressedKeys.has(keyCode) && !justPressed.has(keyCode)) return false;

	if (modifiers && modifiers.length > 0) {
		for (const mod of modifiers) {
			if (!pressedKeys.has(mod)) return false;
		}
	}

	return true;
}

// ---------------------------------------------------------------------------
// Binding management
// ---------------------------------------------------------------------------

/**
 * Get all current bindings.
 */
export function getBindings(): KeyBinding[] {
	return bindings.map((b) => ({ ...b }));
}

/**
 * Get the binding for a specific action.
 */
export function getBinding(action: InputAction): KeyBinding | null {
	const binding = bindings.find((b) => b.action === action);
	return binding ? { ...binding } : null;
}

/**
 * Rebind an action's primary key.
 */
export function rebindAction(action: InputAction, newKey: string): boolean {
	const binding = bindings.find((b) => b.action === action);
	if (!binding) return false;
	binding.primary = newKey;
	return true;
}

/**
 * Rebind an action's secondary key.
 */
export function rebindSecondary(
	action: InputAction,
	newKey: string | undefined,
): boolean {
	const binding = bindings.find((b) => b.action === action);
	if (!binding) return false;
	binding.secondary = newKey;
	return true;
}

/**
 * Check if a key is already bound to another action.
 */
export function isKeyBound(keyCode: string): InputAction | null {
	for (const binding of bindings) {
		if (binding.primary === keyCode || binding.secondary === keyCode) {
			return binding.action;
		}
	}
	return null;
}

/**
 * Reset all bindings to defaults.
 */
export function resetBindings(): void {
	bindings = DEFAULT_BINDINGS.map((b) => ({ ...b }));
}

/**
 * Export bindings as JSON for settings persistence.
 */
export function exportBindings(): string {
	return JSON.stringify(bindings);
}

/**
 * Import bindings from JSON.
 */
export function importBindings(json: string): boolean {
	try {
		const parsed = JSON.parse(json) as KeyBinding[];
		if (!Array.isArray(parsed)) return false;
		bindings = parsed;
		return true;
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetInputMapper(): void {
	resetBindings();
	pressedKeys.clear();
	justPressed.clear();
	justReleased.clear();
}
