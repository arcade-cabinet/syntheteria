/**
 * World geography zones — distance+direction gradient from spawn.
 *
 * The game world radiates outward from the player spawn at (0,0).
 * Zone assignment uses distance from origin + compass direction,
 * NOT a fixed WORLD_EXTENT reference frame. This means the world
 * is infinite — zones scale naturally as you explore further out.
 *
 * Zone layout (compass directions from spawn):
 *   - City (center): Dense industrial labyrinth near spawn
 *   - Coast (east/south): Open terrain with abandoned mines
 *   - Campus (southwest): Ruined science campus with observatory
 *   - Enemy (north): Cult territory — strongholds and enslaved machines
 *
 * The gradient is smooth:
 *   - Near spawn (< CITY_RADIUS tiles): always "city"
 *   - Medium distance: direction determines zone with increasing probability
 *   - Far: pure directional zones
 *
 * Standalone boards: When width/height are provided, coordinates are
 * center-offset so the board center maps to origin (0,0). This allows
 * the same zone assignment logic to work for both the infinite chunk
 * world and standalone labyrinth boards.
 */

// ─── Zone Type ──────────────────────────────────────────────────────────────

export type WorldZone = "city" | "coast" | "campus" | "enemy";

// ─── Zone Profiles ──────────────────────────────────────────────────────────

export interface ZoneProfile {
	label: string;
	description: string;
	/** Probability that a corridor tile keeps its maze wall (higher = denser). */
	wallDensity: number;
	/** Preferred floor types for rooms in this zone. */
	floorTypes: readonly string[];
	/** Room size range [min, max] for scatter rooms placed in this zone. */
	roomSize: readonly [number, number];
	/** Base resource scatter rate multiplier. */
	resourceMultiplier: number;
}

export const ZONE_PROFILES: Record<WorldZone, ZoneProfile> = {
	city: {
		label: "Industrial City",
		description:
			"Dense labyrinthine ruins — factories, warehouses, and towers.",
		wallDensity: 1.0,
		floorTypes: [
			"durasteel_span",
			"transit_deck",
			"collapsed_zone",
			"aerostructure",
		],
		roomSize: [3, 6],
		resourceMultiplier: 1.0,
	},
	coast: {
		label: "Coastal Mines",
		description: "Open terrain with abandoned mine shafts and raw materials.",
		wallDensity: 0.4,
		floorTypes: ["collapsed_zone", "dust_district", "transit_deck"],
		roomSize: [4, 8],
		resourceMultiplier: 1.8,
	},
	campus: {
		label: "Science Campus",
		description:
			"Ruined academic buildings — labs, lecture halls, observatory.",
		wallDensity: 0.6,
		floorTypes: ["bio_district", "transit_deck", "durasteel_span"],
		roomSize: [4, 7],
		resourceMultiplier: 1.2,
	},
	enemy: {
		label: "Cult Territory",
		description: "Cult strongholds and enslaved machine patrols.",
		wallDensity: 0.7,
		floorTypes: ["dust_district", "collapsed_zone", "aerostructure"],
		roomSize: [3, 5],
		resourceMultiplier: 0.6,
	},
};

// ─── Distance+Direction Zone Assignment ─────────────────────────────────────

/**
 * Fraction of board half-extent that is guaranteed "city".
 * For a 64x64 board (half = 32), city radius = 32 * 0.15 = ~5 tiles.
 * This keeps the city core small so edges clearly show their zones.
 */
const CITY_FRACTION = 0.15;

/**
 * Compass-direction zone assignment.
 *
 * Uses atan2 with negated Z (so north = up = positive angle).
 *
 * Layout:
 *   North (z < 0): enemy territory
 *   East (x > 0) / South (z > 0): coast
 *   Southwest (x < 0, z > 0): campus
 *   West/Northwest: city extension
 */
function directionZone(dx: number, dz: number): WorldZone {
	// atan2 with negated Z so north = up = positive angle
	const angle = Math.atan2(-dz, dx);
	// Normalize to [0, 2pi]
	const a = angle < 0 ? angle + 2 * Math.PI : angle;

	// North band: ~60deg to ~120deg (pi/3 to 2pi/3)
	if (a > Math.PI / 3 && a < (2 * Math.PI) / 3) return "enemy";

	// Southwest: ~210deg to ~270deg (7pi/6 to 3pi/2)
	if (a > (7 * Math.PI) / 6 && a < (3 * Math.PI) / 2) return "campus";

	// East + far south: right side + bottom
	if (a <= Math.PI / 3 || a >= (5 * Math.PI) / 3) return "coast";

	// South-southeast coast wrap
	if (a >= (3 * Math.PI) / 2 && a < (5 * Math.PI) / 3) return "coast";

	// Everything else (west, northwest) — city
	return "city";
}

/**
 * Determine which zone a tile belongs to.
 *
 * Two modes of operation:
 *
 * 1. **Chunk/infinite world** (no width/height or both zero):
 *    Coordinates are absolute world space. Origin (0,0) = spawn.
 *
 * 2. **Standalone board** (width/height provided):
 *    Coordinates are center-offset: (x - width/2, z - height/2).
 *    The board center maps to world origin. This ensures the same
 *    zone layout works for labyrinth generation tests.
 *
 * @param x - tile x coordinate
 * @param z - tile z coordinate
 * @param width - board width (optional, for standalone boards)
 * @param height - board height (optional, for standalone boards)
 * @returns the WorldZone for this tile
 */
export function zoneForTile(
	x: number,
	z: number,
	width?: number,
	height?: number,
): WorldZone {
	// Center-offset for standalone boards
	let dx = x;
	let dz = z;
	let radius: number;

	if (width && height && width > 1 && height > 1) {
		// Standalone board: center the coordinates
		dx = x - width / 2;
		dz = z - height / 2;
		// City radius scales with board size
		radius = Math.min(width, height) * CITY_FRACTION;
	} else {
		// Infinite world: use fixed city radius (2 chunks)
		radius = 32;
	}

	const dist = Math.sqrt(dx * dx + dz * dz);

	// Near center: always city
	if (dist <= radius) return "city";

	// Transition zone: gradual blend from city to directional
	// At 3x the city radius, zones are fully directional
	const transitionEnd = radius * 3;
	const dzone = directionZone(dx, dz);

	if (dist < transitionEnd) {
		const t = (dist - radius) / (transitionEnd - radius);
		// Deterministic hash to decide (no randomness)
		const hash = Math.abs(Math.floor(x) * 7 + Math.floor(z) * 13) % 100;
		if (hash < t * 100) return dzone;
		return "city";
	}

	return dzone;
}

/**
 * Zone assignment using absolute world coordinates only.
 * Distance+direction based — no fixed world extent needed.
 */
export function zoneAtWorldPos(worldX: number, worldZ: number): WorldZone {
	return zoneForTile(Math.floor(worldX), Math.floor(worldZ));
}

// ─── Backward Compatibility ─────────────────────────────────────────────────

/**
 * WORLD_EXTENT is kept as a constant for any code that still references it,
 * but zone assignment no longer uses a fixed extent. The world is effectively
 * infinite. When WORLD_EXTENT is passed as width/height, zoneForTile
 * center-offsets the coordinates.
 *
 * @deprecated Zone assignment now uses distance+direction from center.
 */
export const WORLD_EXTENT = 256;

// ─── Zone Statistics ────────────────────────────────────────────────────────

/**
 * Count how many tiles belong to each zone on a board.
 */
export function zoneCounts(
	width: number,
	height: number,
): Record<WorldZone, number> {
	const counts: Record<WorldZone, number> = {
		city: 0,
		coast: 0,
		campus: 0,
		enemy: 0,
	};
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			counts[zoneForTile(x, z, width, height)]++;
		}
	}
	return counts;
}
