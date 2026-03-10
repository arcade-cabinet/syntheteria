/**
 * Save/Load system — serializes and deserializes game state.
 *
 * Provides a central point for saving and loading the complete game state.
 * Each subsystem registers a serializer/deserializer pair. On save, all
 * registered serializers are called and their output is combined into a
 * single JSON blob. On load, each deserializer receives its portion.
 *
 * This abstraction allows new systems to be added without modifying the
 * save/load code — they just register themselves.
 *
 * Format: { version, timestamp, systems: { [systemId]: serializedData } }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SaveData {
	version: number;
	timestamp: number;
	gameTick: number;
	systems: Record<string, unknown>;
}

export interface SystemSerializer {
	/** Unique system identifier */
	id: string;
	/** Serialize system state to a JSON-compatible object */
	serialize: () => unknown;
	/** Restore system state from previously serialized data */
	deserialize: (data: unknown) => void;
}

export interface SaveSlot {
	id: string;
	name: string;
	timestamp: number;
	gameTick: number;
	data: SaveData;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAVE_VERSION = 1;
const MAX_SAVE_SLOTS = 10;

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const serializers = new Map<string, SystemSerializer>();
const saveSlots = new Map<string, SaveSlot>();
let currentGameTick = 0;
let nextSlotId = 0;
let lastSaveTimestamp = 0;
let autosaveInterval = 0; // 0 = disabled
let lastAutosaveTick = 0;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register a system serializer. Call during initialization.
 */
export function registerSerializer(serializer: SystemSerializer): void {
	serializers.set(serializer.id, serializer);
}

/**
 * Unregister a system serializer.
 */
export function unregisterSerializer(id: string): void {
	serializers.delete(id);
}

/**
 * Get all registered serializer IDs.
 */
export function getRegisteredSystems(): string[] {
	return Array.from(serializers.keys());
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

/**
 * Create a save of the current game state.
 * Returns the save data blob.
 */
export function createSave(gameTick: number): SaveData {
	currentGameTick = gameTick;
	const systems: Record<string, unknown> = {};

	for (const [id, serializer] of serializers.entries()) {
		systems[id] = serializer.serialize();
	}

	const saveData: SaveData = {
		version: SAVE_VERSION,
		timestamp: Date.now(),
		gameTick,
		systems,
	};

	lastSaveTimestamp = saveData.timestamp;
	return saveData;
}

/**
 * Save to a named slot.
 * Returns the slot ID.
 */
export function saveToSlot(name: string, gameTick: number): string {
	if (saveSlots.size >= MAX_SAVE_SLOTS) {
		// Find oldest slot and overwrite
		let oldestId = "";
		let oldestTime = Infinity;
		for (const [id, slot] of saveSlots.entries()) {
			if (slot.timestamp < oldestTime) {
				oldestTime = slot.timestamp;
				oldestId = id;
			}
		}
		if (oldestId) saveSlots.delete(oldestId);
	}

	const data = createSave(gameTick);
	const id = `save_${nextSlotId++}`;
	saveSlots.set(id, {
		id,
		name,
		timestamp: data.timestamp,
		gameTick,
		data,
	});

	return id;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Load game state from save data.
 * Calls each registered deserializer with its portion of the data.
 * Returns true if load was successful.
 */
export function loadSave(saveData: SaveData): boolean {
	if (saveData.version !== SAVE_VERSION) {
		return false;
	}

	for (const [id, serializer] of serializers.entries()) {
		const systemData = saveData.systems[id];
		if (systemData !== undefined) {
			serializer.deserialize(systemData);
		}
	}

	currentGameTick = saveData.gameTick;
	return true;
}

/**
 * Load from a named save slot.
 * Returns true if the slot exists and load succeeded.
 */
export function loadFromSlot(slotId: string): boolean {
	const slot = saveSlots.get(slotId);
	if (!slot) return false;

	return loadSave(slot.data);
}

// ---------------------------------------------------------------------------
// Slot management
// ---------------------------------------------------------------------------

/**
 * Get all save slot summaries (without full data).
 */
export function getSaveSlots(): Omit<SaveSlot, "data">[] {
	return Array.from(saveSlots.values()).map((slot) => ({
		id: slot.id,
		name: slot.name,
		timestamp: slot.timestamp,
		gameTick: slot.gameTick,
	}));
}

/**
 * Delete a save slot.
 */
export function deleteSaveSlot(slotId: string): boolean {
	return saveSlots.delete(slotId);
}

/**
 * Check if a save slot exists.
 */
export function hasSaveSlot(slotId: string): boolean {
	return saveSlots.has(slotId);
}

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------

/**
 * Configure autosave interval (in game ticks). 0 = disabled.
 */
export function setAutosaveInterval(intervalTicks: number): void {
	autosaveInterval = intervalTicks;
}

/**
 * Check if an autosave should happen this tick.
 * Returns the save data if autosave triggered, null otherwise.
 */
export function checkAutosave(gameTick: number): SaveData | null {
	if (autosaveInterval <= 0) return null;
	if (gameTick - lastAutosaveTick < autosaveInterval) return null;

	lastAutosaveTick = gameTick;
	return createSave(gameTick);
}

/**
 * Get the last save timestamp (unix ms).
 */
export function getLastSaveTimestamp(): number {
	return lastSaveTimestamp;
}

/**
 * Get the current game tick as known by the save system.
 */
export function getCurrentGameTick(): number {
	return currentGameTick;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all save/load state. For tests and new-game initialization.
 */
export function resetSaveLoad(): void {
	serializers.clear();
	saveSlots.clear();
	currentGameTick = 0;
	nextSlotId = 0;
	lastSaveTimestamp = 0;
	autosaveInterval = 0;
	lastAutosaveTick = 0;
}
