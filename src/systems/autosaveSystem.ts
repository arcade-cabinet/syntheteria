/**
 * Periodic autosave manager.
 *
 * Tracks ticks since last save and triggers a registered callback at
 * configurable intervals. Supports pause awareness (paused ticks are
 * not counted), manual save triggers that reset the timer, and rotating
 * autosave slots.
 *
 * This system is pure logic — the actual persistence is handled by
 * whatever callback is registered via setAutosaveCallback.
 *
 * Config reference: config/rendering.json (autosave settings)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callback invoked when an autosave is triggered. Receives the slot index (0-based). */
export type AutosaveCallback = (slotIndex: number) => void;

export interface AutosaveState {
	/** Tick interval between autosaves. */
	interval: number;
	/** The tick when the last autosave occurred. */
	lastSaveTick: number;
	/** Number of ticks accumulated since last save (pause-aware). */
	ticksSinceLastSave: number;
	/** Maximum number of rotating autosave slots. */
	maxSlots: number;
	/** Current slot index (rotates 0 to maxSlots-1). */
	currentSlot: number;
	/** Whether autosave is currently paused. */
	paused: boolean;
	/** Whether autosave is enabled. */
	enabled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default autosave interval in ticks (~5 minutes at 60fps = 300 seconds = 18000 ticks). */
const DEFAULT_INTERVAL = 300;

/** Default maximum number of rotating autosave slots. */
const DEFAULT_MAX_SLOTS = 3;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let state: AutosaveState = createDefaultState();
let callback: AutosaveCallback | null = null;

function createDefaultState(): AutosaveState {
	return {
		interval: DEFAULT_INTERVAL,
		lastSaveTick: 0,
		ticksSinceLastSave: 0,
		maxSlots: DEFAULT_MAX_SLOTS,
		currentSlot: 0,
		paused: false,
		enabled: true,
	};
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Set the autosave interval in ticks.
 * Must be a positive integer.
 */
export function setAutosaveInterval(ticks: number): void {
	if (ticks <= 0 || !Number.isFinite(ticks)) return;
	state.interval = Math.floor(ticks);
}

/**
 * Get the current autosave interval in ticks.
 */
export function getAutosaveInterval(): number {
	return state.interval;
}

/**
 * Set the maximum number of rotating autosave slots.
 * Must be at least 1.
 */
export function setMaxAutosaveSlots(slots: number): void {
	if (slots < 1 || !Number.isFinite(slots)) return;
	state.maxSlots = Math.floor(slots);
	// Wrap current slot if it exceeds the new max
	if (state.currentSlot >= state.maxSlots) {
		state.currentSlot = 0;
	}
}

/**
 * Get the maximum number of autosave slots.
 */
export function getMaxAutosaveSlots(): number {
	return state.maxSlots;
}

// ---------------------------------------------------------------------------
// Callback registration
// ---------------------------------------------------------------------------

/**
 * Register the function that performs the actual save.
 * The callback receives the slot index (0 to maxSlots-1).
 */
export function setAutosaveCallback(fn: AutosaveCallback): void {
	callback = fn;
}

/**
 * Clear the registered callback.
 */
export function clearAutosaveCallback(): void {
	callback = null;
}

// ---------------------------------------------------------------------------
// Core tick function
// ---------------------------------------------------------------------------

/**
 * Called every game tick. Increments the internal counter (unless paused)
 * and triggers the autosave callback when the interval is reached.
 *
 * @param currentTick - The current game tick number.
 * @returns true if an autosave was triggered on this tick.
 */
export function autosaveSystem(currentTick: number): boolean {
	if (!state.enabled) return false;
	if (state.paused) return false;

	state.ticksSinceLastSave++;

	if (state.ticksSinceLastSave >= state.interval) {
		performAutosave(currentTick);
		return true;
	}

	return false;
}

// ---------------------------------------------------------------------------
// Manual save
// ---------------------------------------------------------------------------

/**
 * Trigger a manual save, which resets the autosave timer.
 * Uses the current autosave slot and advances it.
 *
 * @param currentTick - The current game tick number.
 * @returns The slot index used for the save.
 */
export function triggerManualSave(currentTick: number): number {
	const slot = state.currentSlot;
	performAutosave(currentTick);
	return slot;
}

// ---------------------------------------------------------------------------
// Internal save logic
// ---------------------------------------------------------------------------

function performAutosave(currentTick: number): void {
	const slot = state.currentSlot;

	if (callback) {
		callback(slot);
	}

	state.lastSaveTick = currentTick;
	state.ticksSinceLastSave = 0;
	state.currentSlot = (state.currentSlot + 1) % state.maxSlots;
}

// ---------------------------------------------------------------------------
// Pause management
// ---------------------------------------------------------------------------

/**
 * Pause the autosave timer. Ticks while paused are not counted.
 */
export function pauseAutosave(): void {
	state.paused = true;
}

/**
 * Resume the autosave timer.
 */
export function resumeAutosave(): void {
	state.paused = false;
}

/**
 * Check whether autosave is currently paused.
 */
export function isAutosavePaused(): boolean {
	return state.paused;
}

// ---------------------------------------------------------------------------
// Enable/disable
// ---------------------------------------------------------------------------

/**
 * Enable or disable the autosave system entirely.
 */
export function setAutosaveEnabled(enabled: boolean): void {
	state.enabled = enabled;
}

/**
 * Check whether autosave is enabled.
 */
export function isAutosaveEnabled(): boolean {
	return state.enabled;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Get the tick number when the last autosave occurred.
 */
export function getLastAutosaveTick(): number {
	return state.lastSaveTick;
}

/**
 * Get the tick number when the next autosave will occur,
 * based on lastSaveTick + interval.
 */
export function getNextAutosaveTick(): number {
	return state.lastSaveTick + state.interval;
}

/**
 * Get the number of ticks elapsed since the last autosave.
 */
export function getTicksSinceLastSave(): number {
	return state.ticksSinceLastSave;
}

/**
 * Get the current autosave slot index (0-based).
 */
export function getCurrentSlot(): number {
	return state.currentSlot;
}

/**
 * Get a snapshot of the full autosave state (for debugging/UI).
 */
export function getAutosaveState(): AutosaveState {
	return { ...state };
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Reset all autosave state to defaults. For testing and save/load.
 */
export function _resetAutosaveState(): void {
	state = createDefaultState();
	callback = null;
}
