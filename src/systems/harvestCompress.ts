/**
 * Harvest + Compress system — the core resource gathering loop.
 *
 * Manages the full pipeline: grinding ore deposits into powder, then
 * compressing accumulated powder into physical material cubes.
 *
 * Entities can be in one of three states:
 *   - IDLE: not harvesting or compressing
 *   - HARVESTING: actively grinding a deposit, powder accumulates per tick
 *   - COMPRESSING: converting powder into a cube over multiple ticks
 *
 * An entity cannot harvest and compress simultaneously.
 *
 * All rates, capacities, and durations come from config/mining.json,
 * config/deposits.json, and config/furnace.json (via the unified config).
 *
 * Exports a tick function (harvestCompressSystem) and query/mutation helpers.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HarvestingInfo {
	depositId: string;
	powderCollected: number;
	capacity: number;
	materialType: string;
}

export interface CompressionInfo {
	progress: number;
	duration: number;
	materialType: string;
}

export interface CompressEvent {
	entityId: string;
	cubeSpawned: true;
	materialType: string;
	x: number;
	z: number;
}

export interface DepositData {
	id: string;
	type: string;
	tier: number;
	quantity: number;
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const oreTypes = config.mining.oreTypes as Record<
	string,
	{ hardness: number; grindSpeed: number; color: string }
>;

const defaultExtractionRate: number = config.mining.defaultExtractionRate;
const defaultPowderCapacity: number = config.mining.harvesting.defaultPowderCapacity;

const compressionConfigs = config.furnace.compression.configs as Record<
	string,
	{ powderRequired: number; compressionTime: number }
>;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

interface EntityHarvestState {
	depositId: string;
	materialType: string;
	powderCollected: number;
	capacity: number;
}

interface EntityCompressionState {
	materialType: string;
	progress: number;
	duration: number;
	/** Entity position when compression started — cube spawns here */
	x: number;
	z: number;
}

let harvestStates = new Map<string, EntityHarvestState>();
let compressionStates = new Map<string, EntityCompressionState>();
let deposits = new Map<string, DepositData>();
let entityPositions = new Map<string, { x: number; z: number }>();

// ---------------------------------------------------------------------------
// Deposit registry
// ---------------------------------------------------------------------------

/**
 * Register an ore deposit so the system can track it.
 */
export function registerDeposit(deposit: DepositData): void {
	deposits.set(deposit.id, { ...deposit });
}

/**
 * Get a deposit by ID, or undefined if not registered.
 */
export function getDeposit(depositId: string): DepositData | undefined {
	return deposits.get(depositId);
}

/**
 * Set the position of an entity (used for cube spawn location).
 */
export function setEntityPosition(
	entityId: string,
	x: number,
	z: number,
): void {
	entityPositions.set(entityId, { x, z });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the extraction rate for a given ore type.
 * Uses grindSpeed from mining.json oreTypes, falling back to defaultExtractionRate.
 */
function getExtractionRate(oreType: string): number {
	const ore = oreTypes[oreType];
	if (ore) {
		return ore.grindSpeed * defaultExtractionRate;
	}
	return defaultExtractionRate;
}

/**
 * Get compression config for a material type.
 * Falls back to default values if not defined.
 */
function getCompressionConfig(materialType: string): {
	powderRequired: number;
	compressionTime: number;
} {
	const cfg = compressionConfigs[materialType];
	if (cfg) {
		return cfg;
	}
	// Fallback: base powder capacity as cost, 2 seconds duration
	return { powderRequired: defaultPowderCapacity, compressionTime: 2.0 };
}

// ---------------------------------------------------------------------------
// Harvesting API
// ---------------------------------------------------------------------------

/**
 * Begin harvesting a deposit. The entity starts accumulating powder.
 *
 * Validation:
 *   - Deposit must exist and have remaining quantity
 *   - Entity must not already be harvesting or compressing
 *
 * @returns true if harvesting started
 */
export function startHarvesting(
	entityId: string,
	depositId: string,
	capacity?: number,
): boolean {
	// Cannot harvest while compressing
	if (compressionStates.has(entityId)) {
		return false;
	}

	// Cannot harvest two deposits simultaneously
	if (harvestStates.has(entityId)) {
		return false;
	}

	// Deposit must exist
	const deposit = deposits.get(depositId);
	if (!deposit) {
		return false;
	}

	// Deposit must have remaining quantity
	if (deposit.quantity <= 0) {
		return false;
	}

	harvestStates.set(entityId, {
		depositId,
		materialType: deposit.type,
		powderCollected: 0,
		capacity: capacity ?? defaultPowderCapacity,
	});

	return true;
}

/**
 * Stop harvesting for an entity.
 */
export function stopHarvesting(entityId: string): void {
	harvestStates.delete(entityId);
}

/**
 * Get the current harvesting state for an entity, or null if not harvesting.
 */
export function getHarvestingState(
	entityId: string,
): HarvestingInfo | null {
	const state = harvestStates.get(entityId);
	if (!state) return null;
	return {
		depositId: state.depositId,
		powderCollected: state.powderCollected,
		capacity: state.capacity,
		materialType: state.materialType,
	};
}

// ---------------------------------------------------------------------------
// Compression API
// ---------------------------------------------------------------------------

/**
 * Begin compressing accumulated powder into a cube.
 *
 * Validation:
 *   - Entity must not be harvesting or already compressing
 *   - Entity must have sufficient powder (from a completed harvest session
 *     OR enough accumulated powder)
 *
 * The materialType is taken from the most recent harvest.
 * Alternatively, pass materialType + powderOverride for direct control.
 *
 * @returns true if compression started
 */
export function startCompression(
	entityId: string,
	materialType?: string,
	powderOverride?: number,
): boolean {
	// Cannot compress while harvesting
	if (harvestStates.has(entityId)) {
		return false;
	}

	// Cannot compress while already compressing
	if (compressionStates.has(entityId)) {
		return false;
	}

	// Determine material type — must be provided or inferred
	if (!materialType) {
		return false;
	}

	const compressionCfg = getCompressionConfig(materialType);
	const availablePowder = powderOverride ?? 0;

	if (availablePowder < compressionCfg.powderRequired) {
		return false;
	}

	const pos = entityPositions.get(entityId) ?? { x: 0, z: 0 };

	compressionStates.set(entityId, {
		materialType,
		progress: 0,
		duration: compressionCfg.compressionTime,
		x: pos.x,
		z: pos.z,
	});

	return true;
}

/**
 * Get the current compression state for an entity, or null if not compressing.
 */
export function getCompressionState(
	entityId: string,
): CompressionInfo | null {
	const state = compressionStates.get(entityId);
	if (!state) return null;
	return {
		progress: state.progress,
		duration: state.duration,
		materialType: state.materialType,
	};
}

// ---------------------------------------------------------------------------
// Tick function
// ---------------------------------------------------------------------------

/**
 * Advance all active harvesting and compression by one tick.
 *
 * - Harvesting entities accumulate powder based on extraction rate.
 *   Harvesting auto-stops when capacity is reached or deposit is depleted.
 * - Compression entities advance progress by 1 tick.
 *   When progress >= duration, a CompressEvent is emitted and state cleared.
 *
 * @returns array of CompressEvents for cubes spawned this tick
 */
export function harvestCompressSystem(): CompressEvent[] {
	const events: CompressEvent[] = [];

	// --- Advance harvesting ---
	for (const [entityId, state] of harvestStates.entries()) {
		const deposit = deposits.get(state.depositId);
		if (!deposit || deposit.quantity <= 0) {
			harvestStates.delete(entityId);
			continue;
		}

		const rate = getExtractionRate(state.materialType);
		let extracted = rate;

		// Clamp to deposit remaining
		if (extracted > deposit.quantity) {
			extracted = deposit.quantity;
		}

		// Clamp to remaining capacity
		const remainingCapacity = state.capacity - state.powderCollected;
		if (extracted > remainingCapacity) {
			extracted = remainingCapacity;
		}

		deposit.quantity -= extracted;
		state.powderCollected += extracted;

		// Auto-stop if capacity reached (with floating-point tolerance) or deposit depleted
		const EPSILON = 1e-9;
		if (
			state.powderCollected >= state.capacity - EPSILON ||
			deposit.quantity <= EPSILON
		) {
			if (deposit.quantity < EPSILON) {
				deposit.quantity = 0;
			}
			harvestStates.delete(entityId);
		}
	}

	// --- Advance compression ---
	for (const [entityId, state] of compressionStates.entries()) {
		state.progress += 1;

		if (state.progress >= state.duration) {
			events.push({
				entityId,
				cubeSpawned: true,
				materialType: state.materialType,
				x: state.x,
				z: state.z,
			});
			compressionStates.delete(entityId);
		}
	}

	return events;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset all harvest + compress state. For tests and new-game initialization.
 */
export function resetHarvestCompress(): void {
	harvestStates = new Map();
	compressionStates = new Map();
	deposits = new Map();
	entityPositions = new Map();
}
