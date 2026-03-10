/**
 * Compression system — converts powder into physical material cubes.
 *
 * The player fills their powder storage by harvesting ore deposits,
 * then triggers compression to create a 0.5m physical cube. The
 * compression process takes time (configurable duration) and shows
 * visual feedback (screen shake, pressure gauge, heat overlay).
 *
 * Each compression consumes a configurable amount of powder per material
 * and produces one MaterialCube entity with the Grabbable trait.
 *
 * Module-level state with _resetCompressionState for test cleanup.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaterialCubeData {
	/** Unique identifier for this cube entity */
	id: string;
	/** Material type (matches ore type, e.g. "iron") */
	material: string;
	/** Size of the cube in meters */
	size: number;
	/** Traits attached to this cube */
	traits: string[];
}

export interface CompressionConfig {
	/** Amount of powder consumed to create one cube */
	powderRequired: number;
	/** Duration of compression in seconds */
	compressionTime: number;
}

export interface CompressionResult {
	/** Whether compression completed this tick */
	completed: boolean;
	/** The produced cube, if completed */
	cube?: MaterialCubeData;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cube side length in meters. */
export const CUBE_SIZE = 0.5;

/** Per-material compression configs (powder cost + compression time). */
export const DEFAULT_COMPRESSION_CONFIGS: Record<string, CompressionConfig> = {
	iron: { powderRequired: 100, compressionTime: 2.0 },
	copper: { powderRequired: 80, compressionTime: 1.5 },
	stone: { powderRequired: 60, compressionTime: 1.0 },
	scrap_iron: { powderRequired: 100, compressionTime: 2.0 },
	silicon: { powderRequired: 120, compressionTime: 2.5 },
	titanium: { powderRequired: 150, compressionTime: 3.0 },
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

interface ActiveCompression {
	material: string;
	elapsed: number;
	duration: number;
}

let currentCompression: ActiveCompression | null = null;
let nextCubeId = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start compressing powder into a cube.
 *
 * Deducts powder from the storage map on success.
 *
 * @param material - ore type to compress (e.g. "iron")
 * @param powderStorage - Map of material → powder amount (mutated on success)
 * @param configOverride - optional custom config (powderRequired, compressionTime)
 * @returns true if compression started, false if blocked
 */
export function startCompression(
	material: string,
	powderStorage: Map<string, number>,
	configOverride?: CompressionConfig,
): boolean {
	// Cannot compress while already compressing
	if (currentCompression !== null) {
		return false;
	}

	// Resolve config: explicit override > default lookup > reject
	const config = configOverride ?? DEFAULT_COMPRESSION_CONFIGS[material];
	if (!config) {
		return false;
	}

	const available = powderStorage.get(material) ?? 0;
	if (available < config.powderRequired) {
		return false;
	}

	// Deduct powder
	powderStorage.set(material, available - config.powderRequired);

	currentCompression = {
		material,
		elapsed: 0,
		duration: config.compressionTime,
	};

	return true;
}

/**
 * Update the compression process for one frame.
 *
 * @param delta - time elapsed in seconds since last frame
 * @returns { completed, cube? } — cube is present only on the completion tick
 */
export function updateCompression(delta: number): CompressionResult {
	if (!currentCompression) {
		return { completed: false };
	}

	currentCompression.elapsed += delta;

	if (currentCompression.elapsed < currentCompression.duration) {
		return { completed: false };
	}

	// Compression complete — produce a cube
	const cube: MaterialCubeData = {
		id: `cube_${nextCubeId++}`,
		material: currentCompression.material,
		size: CUBE_SIZE,
		traits: ["Grabbable"],
	};

	currentCompression = null;

	return { completed: true, cube };
}

/**
 * Get the current compression progress (0.0 to 1.0), or 0 if not compressing.
 */
export function getCompressionProgress(): number {
	if (!currentCompression) {
		return 0;
	}
	return Math.min(currentCompression.elapsed / currentCompression.duration, 1.0);
}

/**
 * Check whether compression is currently active.
 */
export function isCompressing(): boolean {
	return currentCompression !== null;
}

/**
 * Cancel an active compression. Does NOT refund powder.
 */
export function cancelCompression(): void {
	currentCompression = null;
}

/**
 * Reset all compression state — for testing.
 */
export function _resetCompressionState(): void {
	currentCompression = null;
	nextCubeId = 0;
}
