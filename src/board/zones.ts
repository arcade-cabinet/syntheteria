/**
 * World geography zones — fixed regions around the labyrinth city.
 *
 * The game world has a fixed geography:
 *   - City (center): Dense industrial labyrinth — the player's home base
 *   - Coast (east/south): Open terrain with abandoned mines
 *   - Campus (southwest): Ruined science campus with observatory
 *   - Enemy (north): Cult territory — strongholds and enslaved machines
 *
 * Zone assignment uses normalized (0..1) coordinates so it works at any
 * board size. The city occupies the central area; other zones surround it.
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

// ─── Zone Geometry ──────────────────────────────────────────────────────────

/**
 * Zone boundary thresholds in normalized coordinates (0..1).
 *
 * Layout (looking at the board, z=0 is top/north, z=1 is bottom/south):
 *
 *   ┌──────────────────────────┐
 *   │         ENEMY            │  z < 0.25
 *   ├──────────────────────────┤
 *   │       │       │          │
 *   │       │ CITY  │          │  0.25 ≤ z ≤ 0.75
 *   │       │       │          │
 *   ├───────┤       ├──────────┤
 *   │CAMPUS │       │  COAST   │  z > 0.75 OR x > 0.65
 *   └──────────────────────────┘
 *
 * City is the central rectangle. Coast wraps around east and south.
 * Campus is in the southwest corner. Enemy is the northern band.
 */

/** City center boundary (normalized). */
const CITY_X_MIN = 0.25;
const CITY_X_MAX = 0.65;
const CITY_Z_MIN = 0.25;
const CITY_Z_MAX = 0.75;

/** Enemy zone is everything above this z threshold. */
const ENEMY_Z_MAX = 0.25;

/** Campus zone bounding box (southwest corner). */
const CAMPUS_X_MAX = 0.35;
const CAMPUS_Z_MIN = 0.65;

// ─── Zone Assignment ────────────────────────────────────────────────────────

/**
 * Determine which zone a tile belongs to based on its board position.
 *
 * @param x - tile x coordinate
 * @param z - tile z coordinate (0 = north/top)
 * @param width - board width in tiles
 * @param height - board height in tiles
 * @returns the WorldZone for this tile
 */
export function zoneForTile(
	x: number,
	z: number,
	width: number,
	height: number,
): WorldZone {
	// Normalize to 0..1
	const nx = width > 1 ? x / (width - 1) : 0.5;
	const nz = height > 1 ? z / (height - 1) : 0.5;

	// Enemy territory: northern band
	if (nz < ENEMY_Z_MAX) return "enemy";

	// City: central rectangle
	if (
		nx >= CITY_X_MIN &&
		nx <= CITY_X_MAX &&
		nz >= CITY_Z_MIN &&
		nz <= CITY_Z_MAX
	) {
		return "city";
	}

	// Campus: southwest corner (below city, to the left)
	if (nx < CAMPUS_X_MAX && nz >= CAMPUS_Z_MIN) return "campus";

	// Coast: east and south (everything else outside city)
	if (nx > CITY_X_MAX || nz > CITY_Z_MAX) return "coast";

	// Remaining area between enemy and city on the west side — extend city
	return "city";
}

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
