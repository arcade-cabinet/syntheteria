/**
 * Harvesting system — grinding ore deposits into powder.
 *
 * The player walks up to an ore deposit, begins harvesting, and powder
 * accumulates at the deposit's grindSpeed rate per second (delta-based).
 * The deposit's quantity decreases by the same amount. Harvesting stops
 * when the deposit is depleted, the player moves beyond harvest range,
 * or the player manually stops.
 *
 * Only one deposit can be harvested at a time.
 *
 * Rates are defined in config/mining.json but are read from the
 * OreDeposit entity data (which mirrors the config) to avoid JSON
 * import issues in test environments.
 */

import { getDeposit } from "./oreSpawner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Vec3 = { x: number; y: number; z: number };

export interface HarvestingState {
	/** ID of the deposit being harvested */
	depositId: string;
	/** Total powder accumulated this session */
	powderAccumulated: number;
	/** Whether harvesting is currently active */
	isActive: boolean;
	/** Callback to get the deposit's current world position */
	getDepositPosition: () => Vec3;
}

export interface HarvestUpdateResult {
	/** Amount of powder gained this tick */
	powderGained: number;
	/** Remaining quantity in the deposit */
	depositRemaining: number;
	/** Whether harvesting stopped this tick */
	stopped: boolean;
}

// ---------------------------------------------------------------------------
// Constants (from config/mining.json)
// ---------------------------------------------------------------------------

/** Default harvest range in meters — player must be within this distance */
export const DEFAULT_HARVEST_RANGE = 3.0;

/** Default powder capacity per ore type */
export const DEFAULT_POWDER_CAPACITY = 100;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let currentHarvest: HarvestingState | null = null;
const powderStorage = new Map<string, number>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Begin harvesting a deposit.
 *
 * @param depositId - ID of the ore deposit to harvest
 * @param playerPosition - current player world position
 * @param getDepositPosition - callback returning the deposit's current position
 * @param harvestRange - max distance to begin/continue harvesting (default 3.0m)
 * @returns true if harvesting started, false if blocked
 */
export function startHarvesting(
	depositId: string,
	playerPosition: Vec3,
	getDepositPosition: () => Vec3,
	harvestRange: number = DEFAULT_HARVEST_RANGE,
): boolean {
	// Cannot harvest two deposits simultaneously
	if (currentHarvest !== null && currentHarvest.isActive) {
		return false;
	}

	// Deposit must exist
	const deposit = getDeposit(depositId);
	if (!deposit) {
		return false;
	}

	// Deposit must have remaining quantity
	if (deposit.quantity <= 0) {
		return false;
	}

	// Player must be within range
	const depositPos = getDepositPosition();
	const dist = distance(playerPosition, depositPos);
	if (dist > harvestRange) {
		return false;
	}

	currentHarvest = {
		depositId,
		powderAccumulated: 0,
		isActive: true,
		getDepositPosition,
	};

	return true;
}

/**
 * Update the active harvesting session for one frame.
 *
 * Calculates powder gained based on grindSpeed * delta, reduces deposit
 * quantity, and adds powder to storage. Stops harvesting if the deposit
 * is depleted or the player moves out of range.
 *
 * @param delta - time elapsed in seconds since last frame
 * @param playerPosition - current player world position
 * @param harvestRange - max harvest distance (default 3.0m)
 * @returns result with powder gained, deposit remaining, and whether stopped
 */
export function updateHarvesting(
	delta: number,
	playerPosition: Vec3,
	harvestRange: number = DEFAULT_HARVEST_RANGE,
): HarvestUpdateResult {
	// Nothing to update if not harvesting
	if (!currentHarvest || !currentHarvest.isActive) {
		return { powderGained: 0, depositRemaining: 0, stopped: false };
	}

	const deposit = getDeposit(currentHarvest.depositId);

	// Deposit was removed or doesn't exist anymore
	if (!deposit) {
		currentHarvest.isActive = false;
		currentHarvest = null;
		return { powderGained: 0, depositRemaining: 0, stopped: true };
	}

	// Check range — stop if player moved too far
	const depositPos = currentHarvest.getDepositPosition();
	const dist = distance(playerPosition, depositPos);
	if (dist > harvestRange) {
		currentHarvest.isActive = false;
		currentHarvest = null;
		return {
			powderGained: 0,
			depositRemaining: deposit.quantity,
			stopped: true,
		};
	}

	// Calculate powder to extract this tick
	const grindSpeed = deposit.grindSpeed;
	let powderThisTick = grindSpeed * delta;

	// Clamp to remaining deposit quantity
	if (powderThisTick > deposit.quantity) {
		powderThisTick = deposit.quantity;
	}

	// Apply extraction
	deposit.quantity -= powderThisTick;
	currentHarvest.powderAccumulated += powderThisTick;

	// Add to powder storage
	const currentPowder = powderStorage.get(deposit.type) ?? 0;
	powderStorage.set(deposit.type, currentPowder + powderThisTick);

	// Check if deposit is depleted
	const depleted = deposit.quantity <= 0;
	if (depleted) {
		deposit.quantity = 0;
		currentHarvest.isActive = false;
		currentHarvest = null;
	}

	return {
		powderGained: powderThisTick,
		depositRemaining: deposit.quantity,
		stopped: depleted,
	};
}

/**
 * Manually stop the current harvesting session.
 */
export function stopHarvesting(): void {
	if (currentHarvest) {
		currentHarvest.isActive = false;
		currentHarvest = null;
	}
}

/**
 * Get the current harvesting state, or null if not harvesting.
 */
export function getHarvestingState(): HarvestingState | null {
	return currentHarvest;
}

/**
 * Get the powder storage — a Map of ore type to powder amount.
 */
export function getPowderStorage(): Map<string, number> {
	return powderStorage;
}

/**
 * Reset all harvesting state — for testing.
 */
export function _resetHarvestingState(): void {
	currentHarvest = null;
	powderStorage.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Euclidean distance between two 3D points. */
function distance(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
