/**
 * Furnace system -- spawns furnace entities with hopper input queues.
 *
 * A furnace accepts material cubes into its hopper (max 5). When powered
 * and given a recipe, it processes items from the hopper queue and produces
 * output items. Rapier static body creation is injected via an optional
 * callback so the system stays pure and testable without WASM.
 *
 * Config reference: config/furnace.json
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Vec3 = { x: number; y: number; z: number };

/** Callback for creating a Rapier static body for the furnace. */
export type CreatePhysicsBody = (position: Vec3) => void;

/** Callback for removing a cube entity from the world. */
export type RemoveCubeCallback = () => void;

/** Data stored for each furnace entity. */
export interface FurnaceData {
	/** Unique identifier */
	id: string;
	/** World position */
	position: Vec3;
	/** Queue of material type strings waiting in the hopper */
	hopperQueue: string[];
	/** Maximum hopper capacity */
	maxHopperSize: number;
	/** Whether the furnace is currently processing an item */
	isProcessing: boolean;
	/** Material type currently being processed, or null */
	currentItem: string | null;
	/** Processing progress 0..1 */
	progress: number;
	/** Whether the furnace is powered */
	isPowered: boolean;
}

/** Read-only snapshot of furnace state returned by getFurnaceState. */
export interface FurnaceState {
	id: string;
	hopperContents: string[];
	hopperSize: number;
	maxHopperSize: number;
	isProcessing: boolean;
	currentItem: string | null;
	progress: number;
	isPowered: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum number of items in the hopper. */
const DEFAULT_MAX_HOPPER_SIZE = 5;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let nextFurnaceId = 0;
const furnaces = new Map<string, FurnaceData>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new furnace entity.
 *
 * @param position - world position for the furnace
 * @param createPhysicsBody - optional callback to create a Rapier static body
 * @param maxHopperSize - optional override for hopper capacity (default: 5)
 * @returns the created FurnaceData
 */
export function createFurnace(
	position: Vec3,
	createPhysicsBody?: CreatePhysicsBody,
	maxHopperSize: number = DEFAULT_MAX_HOPPER_SIZE,
): FurnaceData {
	const id = `furnace_${nextFurnaceId++}`;

	const furnace: FurnaceData = {
		id,
		position: { ...position },
		hopperQueue: [],
		maxHopperSize,
		isProcessing: false,
		currentItem: null,
		progress: 0,
		isPowered: true, // default to powered until power network is implemented
	};

	// Register in module store
	furnaces.set(id, furnace);

	// Create Rapier static body if callback provided
	if (createPhysicsBody) {
		createPhysicsBody(furnace.position);
	}

	return furnace;
}

/**
 * Insert a material cube into a furnace's hopper.
 *
 * Returns false if the hopper is full (>= maxHopperSize).
 * On success, adds the material to the hopper queue and calls the
 * removeCubeCallback to remove the cube entity from the world.
 *
 * @param furnaceId - ID of the target furnace
 * @param cubeId - ID of the cube entity being inserted (for logging/events)
 * @param material - material type string (e.g. "scrap_iron", "copper")
 * @param removeCubeCallback - optional callback to remove the cube from the world
 * @returns true if the cube was inserted, false if hopper is full or furnace not found
 */
export function insertCubeIntoFurnace(
	furnaceId: string,
	_cubeId: string,
	material: string,
	removeCubeCallback?: RemoveCubeCallback,
): boolean {
	const furnace = furnaces.get(furnaceId);
	if (!furnace) {
		return false;
	}

	// Check hopper capacity
	if (furnace.hopperQueue.length >= furnace.maxHopperSize) {
		return false;
	}

	// Add material to hopper queue
	furnace.hopperQueue.push(material);

	// Remove cube entity from world
	if (removeCubeCallback) {
		removeCubeCallback();
	}

	return true;
}

/**
 * Get a read-only snapshot of a furnace's current state.
 *
 * @param furnaceId - ID of the furnace
 * @returns FurnaceState snapshot, or null if furnace not found
 */
export function getFurnaceState(furnaceId: string): FurnaceState | null {
	const furnace = furnaces.get(furnaceId);
	if (!furnace) {
		return null;
	}

	return {
		id: furnace.id,
		hopperContents: [...furnace.hopperQueue],
		hopperSize: furnace.hopperQueue.length,
		maxHopperSize: furnace.maxHopperSize,
		isProcessing: furnace.isProcessing,
		currentItem: furnace.currentItem,
		progress: furnace.progress,
		isPowered: furnace.isPowered,
	};
}

/**
 * Get the raw FurnaceData for a furnace by ID.
 *
 * @param furnaceId - ID of the furnace
 * @returns FurnaceData or undefined if not found
 */
export function getFurnace(furnaceId: string): FurnaceData | undefined {
	return furnaces.get(furnaceId);
}

/**
 * Get all furnaces in the module store.
 *
 * @returns array of all FurnaceData
 */
export function getAllFurnaces(): FurnaceData[] {
	return Array.from(furnaces.values());
}

/**
 * Reset all furnace state -- for testing.
 */
export function _resetFurnaceState(): void {
	furnaces.clear();
	nextFurnaceId = 0;
}
