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

import furnaceConfig from "../../config/furnace.json";
import { emit } from "./eventBus";

// ---------------------------------------------------------------------------
// Audio helper — fire-and-forget; never throws into gameplay code
// ---------------------------------------------------------------------------

function safeEmit(event: Parameters<typeof emit>[0]): void {
	try {
		emit(event);
	} catch {
		// Audio integration must never crash gameplay
	}
}

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
// Constants (from config/furnace.json compression section)
// ---------------------------------------------------------------------------

/** Cube side length in meters. */
export const CUBE_SIZE: number = furnaceConfig.compression.cubeSize;

/** Per-material compression configs (powder cost + compression time). */
export const DEFAULT_COMPRESSION_CONFIGS: Record<string, CompressionConfig> =
	furnaceConfig.compression.configs as Record<string, CompressionConfig>;

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

	safeEmit({
		type: "compression_started",
		entityId: "player",
		materialType: material,
		tick: 0,
	});

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

	safeEmit({
		type: "cube_spawned",
		cubeId: cube.id,
		materialType: cube.material,
		position: { x: 0, y: 0, z: 0 },
		source: "compression",
		tick: 0,
	});

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

// ---------------------------------------------------------------------------
// HUD data helpers
// ---------------------------------------------------------------------------

export interface CompressionMaterialInfo {
	/** Material identifier */
	material: string;
	/** Powder required to compress one cube */
	powderRequired: number;
	/** Duration of compression in seconds */
	compressionTime: number;
	/** Screen shake intensity at compression peak (0.0–1.0) */
	screenShakePeak: number;
	/** Cube eject velocity (higher = more energetic) */
	ejectVelocity: number;
}

/**
 * Get compression info for all materials with configured compression parameters.
 * Used by the HUD to show per-material differentiation (cost, time, intensity).
 */
export function getCompressionMaterialInfo(): CompressionMaterialInfo[] {
	return Object.entries(
		furnaceConfig.compression.configs as Record<
			string,
			{
				powderRequired: number;
				compressionTime: number;
				screenShakePeak?: number;
				ejectVelocity?: number;
			}
		>,
	).map(([material, cfg]) => ({
		material,
		powderRequired: cfg.powderRequired,
		compressionTime: cfg.compressionTime,
		screenShakePeak: cfg.screenShakePeak ?? 0.5,
		ejectVelocity: cfg.ejectVelocity ?? 1.5,
	}));
}

/**
 * Get compression info for a single material, or null if not configured.
 */
export function getCompressionInfoForMaterial(
	material: string,
): CompressionMaterialInfo | null {
	const cfg = DEFAULT_COMPRESSION_CONFIGS[material];
	if (!cfg) return null;
	const raw = (
		furnaceConfig.compression.configs as Record<
			string,
			{
				powderRequired: number;
				compressionTime: number;
				screenShakePeak?: number;
				ejectVelocity?: number;
			}
		>
	)[material];
	return {
		material,
		powderRequired: cfg.powderRequired,
		compressionTime: cfg.compressionTime,
		screenShakePeak: raw?.screenShakePeak ?? 0.5,
		ejectVelocity: raw?.ejectVelocity ?? 1.5,
	};
}

/**
 * Reset all compression state — for testing.
 */
export function _resetCompressionState(): void {
	currentCompression = null;
	nextCubeId = 0;
}
