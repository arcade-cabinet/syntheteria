/**
 * Phase 7: Multi-level platform generation.
 *
 * Back-scans the generated labyrinth and identifies areas suitable for
 * elevation. Large rooms (4x4+) get partial raised platforms (elevation 1).
 * Platform edges adjacent to ground-level tiles become ramp connection points.
 *
 * Target: ~15-20% of passable room tiles should be elevated.
 */

import { seededRng } from "./noise";
import type { TileData } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum room area (in tiles) to qualify for platform placement. */
const MIN_ROOM_AREA = 16; // 4x4

/** Fraction of qualifying room tiles that become elevated. */
const PLATFORM_FRACTION = 0.45;

/** Minimum tiles to leave un-elevated per room (ensures ramp access). */
const MIN_GROUND_BORDER = 1;

/** Player start protection radius — never elevate within this many tiles of center. */
const PLAYER_START_RADIUS = 4;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Phase 7: Scan the board for large passable areas and raise partial platforms.
 *
 * Mutates tiles in-place. Sets tile.elevation = 1 for platform tiles.
 * Ensures every elevated region has at least one ground-level neighbor
 * (ramp access point).
 */
export function applyMultiLevelPlatforms(
	tiles: TileData[][],
	width: number,
	height: number,
	seed: string,
): void {
	const rng = seededRng(seed + "_platforms");
	const centerX = Math.floor(width / 2);
	const centerZ = Math.floor(height / 2);

	// Find connected passable regions (rooms + corridors merged)
	const regions = findPassableRegions(tiles, width, height);

	for (const region of regions) {
		// Only elevate regions that are large enough (4x4 area = 16 tiles)
		if (region.length < MIN_ROOM_AREA) continue;

		// Compute bounding box to find interior tiles
		const interiorTiles = findInteriorTiles(region, tiles, width, height);
		if (interiorTiles.length < 4) continue; // Need at least a 2x2 platform

		// Filter out tiles near player start
		const candidates = interiorTiles.filter((t) => {
			const dist = Math.abs(t.x - centerX) + Math.abs(t.z - centerZ);
			return dist > PLAYER_START_RADIUS;
		});

		if (candidates.length < 4) continue;

		// Select a contiguous subset of interior tiles for the platform
		const platformCount = Math.max(4, Math.floor(candidates.length * PLATFORM_FRACTION));
		const platformTiles = selectContiguousPlatform(candidates, platformCount, rng);

		// Verify every platform tile has at least one ground neighbor (ramp access)
		// If not, remove edge tiles until connectivity is ensured
		const verified = ensureRampAccess(platformTiles, tiles, width, height);

		// Apply elevation
		for (const tile of verified) {
			tile.elevation = 1;
		}
	}
}

// ---------------------------------------------------------------------------
// Region finding
// ---------------------------------------------------------------------------

/**
 * Flood-fill to find all connected passable regions.
 * Returns array of regions, each region is an array of tile references.
 */
function findPassableRegions(
	tiles: TileData[][],
	width: number,
	height: number,
): TileData[][] {
	const visited = new Set<string>();
	const regions: TileData[][] = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const key = `${x},${z}`;
			if (visited.has(key)) continue;
			const tile = tiles[z]![x]!;
			if (!tile.passable) {
				visited.add(key);
				continue;
			}

			// Flood fill this region
			const region: TileData[] = [];
			const stack: TileData[] = [tile];
			visited.add(key);

			while (stack.length > 0) {
				const current = stack.pop()!;
				region.push(current);

				for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
					const nx = current.x + dx!;
					const nz = current.z + dz!;
					const nkey = `${nx},${nz}`;
					if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
					if (visited.has(nkey)) continue;
					const neighbor = tiles[nz]![nx]!;
					if (!neighbor.passable) {
						visited.add(nkey);
						continue;
					}
					visited.add(nkey);
					stack.push(neighbor);
				}
			}

			regions.push(region);
		}
	}

	return regions;
}

// ---------------------------------------------------------------------------
// Interior tile detection
// ---------------------------------------------------------------------------

/**
 * Find tiles that are "interior" — not adjacent to walls or board edges.
 * These are good candidates for elevation because they'll have room for ramps.
 */
function findInteriorTiles(
	region: TileData[],
	tiles: TileData[][],
	width: number,
	height: number,
): TileData[] {
	const regionSet = new Set(region.map((t) => `${t.x},${t.z}`));
	const interior: TileData[] = [];

	for (const tile of region) {
		// A tile is interior if ALL 4 cardinal neighbors are also in the region
		let allNeighborsInRegion = true;
		for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
			const nx = tile.x + dx!;
			const nz = tile.z + dz!;
			if (nx < 0 || nx >= width || nz < 0 || nz >= height) {
				allNeighborsInRegion = false;
				break;
			}
			if (!regionSet.has(`${nx},${nz}`)) {
				allNeighborsInRegion = false;
				break;
			}
		}

		if (allNeighborsInRegion) {
			interior.push(tile);
		}
	}

	return interior;
}

// ---------------------------------------------------------------------------
// Contiguous platform selection
// ---------------------------------------------------------------------------

/**
 * Select a contiguous group of tiles for the platform using a growth algorithm.
 * Starts from a random seed tile and grows outward, preferring compact shapes.
 */
function selectContiguousPlatform(
	candidates: TileData[],
	targetCount: number,
	rng: () => number,
): TileData[] {
	if (candidates.length <= targetCount) return [...candidates];

	const candidateSet = new Set(candidates.map((t) => `${t.x},${t.z}`));
	const candidateMap = new Map(candidates.map((t) => [`${t.x},${t.z}`, t]));

	// Start from a random candidate
	const startIdx = Math.floor(rng() * candidates.length);
	const startTile = candidates[startIdx]!;

	const selected = new Set<string>();
	selected.add(`${startTile.x},${startTile.z}`);
	const result: TileData[] = [startTile];

	// Frontier: tiles adjacent to selected that are also candidates
	const frontier = new Set<string>();
	addNeighborsToFrontier(startTile, candidateSet, selected, frontier);

	while (result.length < targetCount && frontier.size > 0) {
		// Pick a random frontier tile
		const frontierArr = Array.from(frontier);
		const pickIdx = Math.floor(rng() * frontierArr.length);
		const pickKey = frontierArr[pickIdx]!;
		frontier.delete(pickKey);

		const tile = candidateMap.get(pickKey);
		if (!tile) continue;

		selected.add(pickKey);
		result.push(tile);
		addNeighborsToFrontier(tile, candidateSet, selected, frontier);
	}

	return result;
}

function addNeighborsToFrontier(
	tile: TileData,
	candidateSet: Set<string>,
	selected: Set<string>,
	frontier: Set<string>,
): void {
	for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
		const nx = tile.x + dx!;
		const nz = tile.z + dz!;
		const key = `${nx},${nz}`;
		if (candidateSet.has(key) && !selected.has(key)) {
			frontier.add(key);
		}
	}
}

// ---------------------------------------------------------------------------
// Ramp access verification
// ---------------------------------------------------------------------------

/**
 * Ensure every elevated tile in the group has at least one path to ground level.
 * This means at least one tile on the border of the elevated group must be
 * adjacent to a passable ground-level tile.
 *
 * Returns the (possibly pruned) set of tiles that form a valid platform.
 */
function ensureRampAccess(
	platformTiles: TileData[],
	tiles: TileData[][],
	width: number,
	height: number,
): TileData[] {
	if (platformTiles.length === 0) return [];

	const platformSet = new Set(platformTiles.map((t) => `${t.x},${t.z}`));

	// Check if any platform tile borders a non-platform passable tile (ground)
	const hasBorderAccess = platformTiles.some((t) => {
		for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
			const nx = t.x + dx!;
			const nz = t.z + dz!;
			if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
			const neighbor = tiles[nz]![nx]!;
			if (neighbor.passable && !platformSet.has(`${nx},${nz}`)) {
				return true;
			}
		}
		return false;
	});

	// If no border access, don't elevate anything (shouldn't happen with interior tiles)
	if (!hasBorderAccess) return [];

	return platformTiles;
}
