/**
 * Elevation system — 2.5D multi-story grid with clearance math.
 *
 * The key insight: every model has a known height from model_catalog.json.
 * A bridge/platform needs clearance = max(models_underneath) + ROBOT_CLEARANCE.
 * Visibility rule: no tunnel the camera can't see into (isometric-friendly).
 *
 * Levels:
 *   0 = ground (y=0)
 *   1 = raised (y=LEVEL_1_HEIGHT)
 *   2 = upper  (y=LEVEL_2_HEIGHT)
 *
 * Ramps connect adjacent levels on adjacent tiles.
 * Platforms span 2+ tiles at a given level, creating passable ground underneath.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Tile grid size in meters (matches chunks.json cellWorldSize) */
export const TILE_SIZE = 2.0;

/** Minimum clearance for a robot to pass under a structure (meters) */
export const ROBOT_CLEARANCE_MIN = 1.2;

/** Minimum clearance under a bridge/platform for comfortable passage + visibility */
export const BRIDGE_MIN_CLEARANCE = 1.5;

/** Maximum ramp slope in degrees (steeper = harder to see the robot on it) */
export const RAMP_SLOPE_MAX_DEG = 45;

/** World-Y heights for each level */
export const LEVEL_HEIGHTS = [0.0, 2.5, 5.0] as const;

/** Height delta between adjacent levels */
export const LEVEL_STEP = 2.5;

/** Number of supported levels */
export const MAX_LEVEL = 2;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TileCoord3D {
	x: number;
	z: number;
	level: number;
}

export interface ElevationProfile {
	/** Lowest level this model can be placed on */
	minLevel: number;
	/** Highest level this model can be placed on */
	maxLevel: number;
	/** Can this model act as a bridge/platform over lower tiles? */
	supportsBridging: boolean;
	/** How many tiles can this model span as a bridge? (0 = not a bridge) */
	bridgeSpan: number;
	/** Clearance needed above ground for this model (derived from bounds.height) */
	clearanceProvided: number;
	/** Can a robot pass under this model on the ground level? */
	canPassUnderneath: boolean;
	/** Does this model act as a ramp connecting two levels? */
	isRamp: boolean;
}

export interface PlacedStructure3D {
	modelId: string;
	tileX: number;
	tileZ: number;
	level: number;
	worldY: number;
	height: number;
}

// ─── Clearance Calculation ───────────────────────────────────────────────────

/**
 * Given a model's height (from bounds.height in model_catalog), determine
 * whether a robot can pass underneath it when it's placed at a given level.
 *
 * The model sits at LEVEL_HEIGHTS[level]. A robot on the ground (level 0)
 * needs ROBOT_CLEARANCE_MIN meters of free space. The bottom of the model
 * is at LEVEL_HEIGHTS[level], so the clearance is just that height minus
 * anything on the ground.
 */
export function canRobotPassUnder(
	modelHeight: number,
	modelLevel: number,
	groundOccupantHeight: number,
): boolean {
	if (modelLevel === 0) return false; // Model is ON the ground, no passing under
	const modelBottomY = LEVEL_HEIGHTS[modelLevel] ?? 0;
	const freeSpace = modelBottomY - groundOccupantHeight;
	return freeSpace >= ROBOT_CLEARANCE_MIN;
}

/**
 * Calculate the clearance under a bridge/platform at a given level.
 * Returns the free vertical space in meters.
 */
export function bridgeClearance(
	bridgeLevel: number,
	groundObstacleHeight: number,
): number {
	const bridgeBottomY = LEVEL_HEIGHTS[bridgeLevel] ?? 0;
	return bridgeBottomY - groundObstacleHeight;
}

/**
 * Can a bridge be placed at this level over a tile with obstacles of given height?
 */
export function canPlaceBridge(
	bridgeLevel: number,
	groundObstacleHeight: number,
): boolean {
	return bridgeClearance(bridgeLevel, groundObstacleHeight) >= BRIDGE_MIN_CLEARANCE;
}

// ─── Ramp Calculations ──────────────────────────────────────────────────────

/**
 * A ramp connects two adjacent tiles at different levels.
 * The slope is determined by the level delta and the horizontal distance (TILE_SIZE).
 */
export function rampSlopeDeg(fromLevel: number, toLevel: number): number {
	const heightDelta = Math.abs(
		(LEVEL_HEIGHTS[toLevel] ?? 0) - (LEVEL_HEIGHTS[fromLevel] ?? 0),
	);
	return Math.atan2(heightDelta, TILE_SIZE) * (180 / Math.PI);
}

/**
 * Can a ramp connect these two levels? Only adjacent levels (delta=1) allowed,
 * and slope must be within limits.
 */
export function canConnectLevels(fromLevel: number, toLevel: number): boolean {
	const delta = Math.abs(fromLevel - toLevel);
	if (delta !== 1) return false;
	return rampSlopeDeg(fromLevel, toLevel) <= RAMP_SLOPE_MAX_DEG;
}

// ─── Visibility Check ────────────────────────────────────────────────────────

/**
 * For isometric/2.5D camera: a structure creates a "visibility tunnel" problem
 * if the player can't see their robot underneath it. This happens when:
 * 1. The bridge/platform is opaque (not a grating)
 * 2. The structure width >= 3 tiles (creates a dark enclosed space)
 *
 * We limit bridge spans and require gaps/openings in long runs.
 */
export const MAX_VISIBLE_BRIDGE_SPAN = 3;

export function isVisibleFromCamera(bridgeSpan: number): boolean {
	return bridgeSpan <= MAX_VISIBLE_BRIDGE_SPAN;
}

// ─── Model Elevation Profile Derivation ──────────────────────────────────────

/**
 * Derive an ElevationProfile from a model's catalog data.
 * This is pure arithmetic based on the model's physical dimensions.
 */
export function deriveElevationProfile(model: {
	id: string;
	category: string;
	family: string;
	bounds: { width: number; height: number; depth: number };
	passable: boolean;
	tags: string[];
}): ElevationProfile {
	const h = model.bounds.height;

	// Platform-family models are natural bridges
	const isPlatformFamily =
		model.family === "platform" || model.id.startsWith("platform_");
	const isMonorailTrack =
		model.id.startsWith("monorail_track_") && !model.id.includes("support");
	const isRamp =
		model.id.includes("slope") || model.id.includes("ramp");

	// Bridges: platforms and monorail tracks
	const supportsBridging = isPlatformFamily || isMonorailTrack;

	// Bridge span: based on model footprint width (in tiles)
	const bridgeSpan = supportsBridging
		? Math.max(1, Math.ceil(Math.max(model.bounds.width, model.bounds.depth) / TILE_SIZE))
		: 0;

	// Can a robot pass underneath? Only if the model is tall enough or elevated
	// Ground-level models: robot can pass under if model is at level 1+ (handled at placement time)
	// For the profile, we record the clearance this model PROVIDES when elevated
	const clearanceProvided = isPlatformFamily
		? LEVEL_STEP - h // Space under the platform at level 1
		: 0;

	// Models shorter than robot clearance that are passable can be walked over
	// Models taller than robot clearance on the ground block passage
	const canPassUnderneath = supportsBridging && clearanceProvided >= ROBOT_CLEARANCE_MIN;

	// Level range: most models are ground-only, platforms can go higher
	const maxLevel = supportsBridging ? MAX_LEVEL : model.passable ? 0 : 1;
	const minLevel = 0;

	return {
		minLevel,
		maxLevel,
		supportsBridging,
		bridgeSpan,
		clearanceProvided,
		canPassUnderneath,
		isRamp,
	};
}

// ─── Grid Neighbor Utilities ────────────────────────────────────────────────

/** 4-directional neighbors on the same level */
export function neighbors4(x: number, z: number): [number, number][] {
	return [
		[x - 1, z],
		[x + 1, z],
		[x, z - 1],
		[x, z + 1],
	];
}

/** 4-directional neighbors including level transitions via ramps */
export function neighbors4WithLevel(
	x: number,
	z: number,
	level: number,
	rampTiles: ReadonlySet<string>,
): TileCoord3D[] {
	const results: TileCoord3D[] = [];
	for (const [nx, nz] of neighbors4(x, z)) {
		// Same-level neighbor
		results.push({ x: nx, z: nz, level });
		// Check if current or neighbor tile has a ramp
		const currentKey = `${x},${z},${level}`;
		const neighborKeyUp = `${nx},${nz},${level + 1}`;
		const neighborKeyDown = `${nx},${nz},${level - 1}`;
		if (rampTiles.has(currentKey) || rampTiles.has(neighborKeyUp)) {
			if (level + 1 <= MAX_LEVEL) {
				results.push({ x: nx, z: nz, level: level + 1 });
			}
		}
		if (rampTiles.has(currentKey) || rampTiles.has(neighborKeyDown)) {
			if (level - 1 >= 0) {
				results.push({ x: nx, z: nz, level: level - 1 });
			}
		}
	}
	return results;
}

// ─── Tile Key Helpers ────────────────────────────────────────────────────────

export function tileKey(x: number, z: number): string {
	return `${x},${z}`;
}

export function tileKey3D(x: number, z: number, level: number): string {
	return `${x},${z},${level}`;
}

export function parseTileKey(key: string): { x: number; z: number } {
	const [x, z] = key.split(",").map(Number);
	return { x: x!, z: z! };
}

export function parseTileKey3D(key: string): TileCoord3D {
	const [x, z, level] = key.split(",").map(Number);
	return { x: x!, z: z!, level: level! };
}
