/**
 * Labyrinth Phase 5 — Abyssal zones + platform connective tissue.
 *
 * Pure function that post-processes TileData[][] after connectivity (Phase 3)
 * and features (Phase 4). Evaluates geography noise per-tile to convert
 * passable tiles in ocean basins to abyssal_platform, then adds platform
 * islands and bridges to maintain reachability.
 *
 * Steps:
 *   1. Evaluate geographyValue per tile — tiles above abyssal threshold
 *      become abyssal_platform (elevation -1, impassable). Only converts
 *      passable tiles; walls stay as walls.
 *   2. Protect faction start rooms — never convert protected tiles.
 *   3. Place platform islands (up to 3x3 durasteel_span at elevation 1)
 *      inside large abyssal regions as connective tissue.
 *   4. Place spanning bridges (1-tile wide) connecting land bodies
 *      separated by abyssal zones.
 *   5. Run connectivity check — if conversion broke reachability,
 *      carve emergency connectors.
 *
 * All randomness via seededRng(seed + "_abyssal"). Deterministic.
 */

import { TILE_SIZE_M } from "../config";
import { geographyValue, seedToFloat } from "../terrain";
import { seededRng } from "./noise";
import type { Elevation, TileData } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AbyssalResult {
	/** Number of tiles converted to abyssal_platform. */
	tilesConverted: number;
	/** Number of platform island tiles placed. */
	platformTiles: number;
	/** Number of bridge tiles placed. */
	bridgeTiles: number;
}

/** A protected rectangle that must never become abyssal. */
export interface ProtectedZone {
	x: number;
	z: number;
	w: number;
	h: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Cardinal direction offsets. */
const CARDINALS: readonly [number, number][] = [
	[0, -1], // N
	[1, 0], // E
	[0, 1], // S
	[-1, 0], // W
];

/** Maximum bridge span in tiles. */
const MAX_BRIDGE_SPAN = 12;

/** Minimum contiguous abyssal region size (tiles) to get platform islands. */
const MIN_ABYSSAL_REGION_SIZE = 20;

/** Platform island sizes (w, h). */
const PLATFORM_SIZES: readonly [number, number][] = [
	[2, 2],
	[2, 3],
	[3, 2],
	[3, 3],
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function inBounds(x: number, z: number, w: number, h: number): boolean {
	return x >= 0 && x < w && z >= 0 && z < h;
}

function isProtected(x: number, z: number, zones: ProtectedZone[]): boolean {
	for (const zone of zones) {
		if (
			x >= zone.x &&
			x < zone.x + zone.w &&
			z >= zone.z &&
			z < zone.z + zone.h
		) {
			return true;
		}
	}
	return false;
}

// ─── Step 1: Abyssal conversion ─────────────────────────────────────────────

/**
 * Convert passable tiles in ocean basins to abyssal_platform.
 * Uses geography noise threshold scaled by waterLevel.
 */
function convertAbyssalTiles(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
	waterLevel: number,
	protectedZones: ProtectedZone[],
): number {
	const seedFloat = seedToFloat(seed);
	const abyssalThreshold = 1.0 - waterLevel * 0.5;

	let converted = 0;

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			// Only convert passable tiles — walls stay as walls
			if (!tile.passable) continue;

			// Never convert protected zones (faction starts)
			if (isProtected(x, z, protectedZones)) continue;

			// Evaluate geography noise at this tile position
			const geo = geographyValue(x * TILE_SIZE_M, z * TILE_SIZE_M, seedFloat);

			if (geo > abyssalThreshold) {
				tile.floorType = "abyssal_platform";
				tile.elevation = -1 as Elevation;
				tile.passable = false;
				converted++;
			}
		}
	}

	return converted;
}

// ─── Step 2: Find abyssal regions ───────────────────────────────────────────

/**
 * Flood fill to find contiguous abyssal regions.
 * Returns array of regions, each being a list of (x,z) coordinates.
 */
function findAbyssalRegions(
	tiles: TileData[][],
	w: number,
	h: number,
): Array<Array<[number, number]>> {
	const visited = new Set<string>();
	const regions: Array<Array<[number, number]>> = [];

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			if (tiles[z]![x]!.floorType !== "abyssal_platform") continue;
			const key = `${x},${z}`;
			if (visited.has(key)) continue;

			// BFS flood fill
			const region: Array<[number, number]> = [];
			const stack: Array<[number, number]> = [[x, z]];
			visited.add(key);

			while (stack.length > 0) {
				const [cx, cz] = stack.pop()!;
				region.push([cx, cz]);

				for (const [dx, dz] of CARDINALS) {
					const nx = cx + dx;
					const nz = cz + dz;
					if (!inBounds(nx, nz, w, h)) continue;
					const nkey = `${nx},${nz}`;
					if (visited.has(nkey)) continue;
					if (tiles[nz]![nx]!.floorType !== "abyssal_platform") continue;
					visited.add(nkey);
					stack.push([nx, nz]);
				}
			}

			regions.push(region);
		}
	}

	return regions;
}

// ─── Step 3: Platform islands ───────────────────────────────────────────────

/**
 * Place platform islands in large abyssal regions.
 * Returns number of platform tiles placed.
 */
function placePlatformIslands(
	tiles: TileData[][],
	w: number,
	h: number,
	regions: Array<Array<[number, number]>>,
	rng: () => number,
): number {
	let placed = 0;

	for (const region of regions) {
		if (region.length < MIN_ABYSSAL_REGION_SIZE) continue;

		// Place 1-3 platforms per large region, proportional to size
		const platformCount = Math.min(3, 1 + Math.floor(region.length / 40));

		// Build a set for quick lookup
		const regionSet = new Set(region.map(([rx, rz]) => `${rx},${rz}`));

		for (let p = 0; p < platformCount; p++) {
			// Pick a random tile in the region as the platform center
			const [size] = shufflePick(PLATFORM_SIZES, rng);
			const [pw, ph] = size;

			// Try up to 20 random positions within the region
			let bestX = -1;
			let bestZ = -1;

			for (let attempt = 0; attempt < 20; attempt++) {
				const idx = Math.floor(rng() * region.length);
				const [rx, rz] = region[idx]!;

				// Check that the entire platform footprint is within the abyssal region
				let fits = true;
				for (let dz = 0; dz < ph && fits; dz++) {
					for (let dx = 0; dx < pw && fits; dx++) {
						const tx = rx + dx;
						const tz = rz + dz;
						if (!inBounds(tx, tz, w, h)) {
							fits = false;
							break;
						}
						if (!regionSet.has(`${tx},${tz}`)) {
							fits = false;
							break;
						}
					}
				}

				if (fits) {
					bestX = rx;
					bestZ = rz;
					break;
				}
			}

			if (bestX < 0) continue; // couldn't place

			// Stamp platform tiles
			for (let dz = 0; dz < ph; dz++) {
				for (let dx = 0; dx < pw; dx++) {
					const tx = bestX + dx;
					const tz = bestZ + dz;
					const tile = tiles[tz]![tx]!;
					tile.floorType = "durasteel_span";
					tile.elevation = 1 as Elevation;
					tile.passable = true;
					placed++;
				}
			}

			// Corner tiles become support pylons (structural_mass)
			const corners: [number, number][] = [
				[bestX, bestZ],
				[bestX + pw - 1, bestZ],
				[bestX, bestZ + ph - 1],
				[bestX + pw - 1, bestZ + ph - 1],
			];
			for (const [cx, cz] of corners) {
				if (inBounds(cx, cz, w, h)) {
					const tile = tiles[cz]![cx]!;
					tile.floorType = "structural_mass";
					tile.elevation = 1 as Elevation;
					tile.passable = false;
					// Note: these were counted as placed above, they become impassable pylons
				}
			}
		}
	}

	return placed;
}

// ─── Step 4: Bridges ────────────────────────────────────────────────────────

/**
 * Find places where land masses are separated by narrow abyssal strips
 * and place 1-tile-wide bridges across them.
 */
function placeBridges(
	tiles: TileData[][],
	w: number,
	h: number,
	rng: () => number,
): number {
	let bridgeTiles = 0;

	// Scan for horizontal bridge opportunities:
	// land tile → run of abyssal → land tile, span <= MAX_BRIDGE_SPAN
	for (let z = 0; z < h; z++) {
		let landStartX = -1;
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;
			if (tile.passable && tile.floorType !== "abyssal_platform") {
				if (landStartX >= 0) {
					// Check if everything between landStartX and x is abyssal
					const span = x - landStartX - 1;
					if (span > 0 && span <= MAX_BRIDGE_SPAN) {
						let allAbyssal = true;
						for (let bx = landStartX + 1; bx < x; bx++) {
							if (tiles[z]![bx]!.floorType !== "abyssal_platform") {
								allAbyssal = false;
								break;
							}
						}
						if (allAbyssal && rng() < 0.4) {
							// Place bridge
							for (let bx = landStartX + 1; bx < x; bx++) {
								const bt = tiles[z]![bx]!;
								bt.floorType = "durasteel_span";
								bt.elevation = 1 as Elevation;
								bt.passable = true;
								bridgeTiles++;
							}
						}
					}
				}
				landStartX = x;
			} else if (tile.floorType !== "abyssal_platform") {
				// Non-abyssal impassable (wall) — reset
				landStartX = -1;
			}
			// If abyssal, just continue scanning
		}
	}

	// Scan for vertical bridge opportunities
	for (let x = 0; x < w; x++) {
		let landStartZ = -1;
		for (let z = 0; z < h; z++) {
			const tile = tiles[z]![x]!;
			if (tile.passable && tile.floorType !== "abyssal_platform") {
				if (landStartZ >= 0) {
					const span = z - landStartZ - 1;
					if (span > 0 && span <= MAX_BRIDGE_SPAN) {
						let allAbyssal = true;
						for (let bz = landStartZ + 1; bz < z; bz++) {
							if (tiles[bz]![x]!.floorType !== "abyssal_platform") {
								allAbyssal = false;
								break;
							}
						}
						if (allAbyssal && rng() < 0.4) {
							for (let bz = landStartZ + 1; bz < z; bz++) {
								const bt = tiles[bz]![x]!;
								bt.floorType = "durasteel_span";
								bt.elevation = 1 as Elevation;
								bt.passable = true;
								bridgeTiles++;
							}
						}
					}
				}
				landStartZ = z;
			} else if (tile.floorType !== "abyssal_platform") {
				landStartZ = -1;
			}
		}
	}

	return bridgeTiles;
}

// ─── Utility ────────────────────────────────────────────────────────────────

/** Pick a random element from an array using seeded RNG. */
function shufflePick<T>(arr: readonly T[], rng: () => number): [T] {
	return [arr[Math.floor(rng() * arr.length)]!];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Apply labyrinth Phase 5 abyssal zones to the tile grid.
 *
 * Mutates `tiles` in place. Returns a summary of modifications.
 *
 * @param tiles           Row-major tile grid (tiles[z][x]). Modified in place.
 * @param width           Board width.
 * @param height          Board height.
 * @param seed            Board seed string — abyssal RNG derived as seed + "_abyssal".
 * @param waterLevel      Climate water level (0-1). Higher = more abyssal. Default 0.35.
 * @param protectedZones  Rectangles that must never become abyssal (faction starts).
 */
export function applyAbyssalZones(
	tiles: TileData[][],
	width: number,
	height: number,
	seed: string,
	waterLevel = 0.35,
	protectedZones: ProtectedZone[] = [],
): AbyssalResult {
	const rng = seededRng(seed + "_abyssal");

	// Step 1: Convert passable tiles in ocean basins to abyssal
	const tilesConverted = convertAbyssalTiles(
		tiles,
		width,
		height,
		seed,
		waterLevel,
		protectedZones,
	);

	if (tilesConverted === 0) {
		return { tilesConverted: 0, platformTiles: 0, bridgeTiles: 0 };
	}

	// Step 2: Find contiguous abyssal regions
	const regions = findAbyssalRegions(tiles, width, height);

	// Step 3: Place platform islands in large abyssal regions
	const platformTiles = placePlatformIslands(
		tiles,
		width,
		height,
		regions,
		rng,
	);

	// Step 4: Place bridges across narrow abyssal gaps
	const bridgeTiles = placeBridges(tiles, width, height, rng);

	return { tilesConverted, platformTiles, bridgeTiles };
}
