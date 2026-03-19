/**
 * Influence maps for territory value assessment.
 *
 * For each tile on the board, compute a "value" score based on:
 * - Proximity to resources (salvage deposits)
 * - Proximity to enemies (negative influence)
 * - Distance from faction center
 * - Strategic chokepoints (tiles with few passable neighbors)
 *
 * The ExpandEvaluator uses this map to pick HIGH-VALUE tiles to expand toward,
 * not just the nearest unclaimed tile.
 *
 * Updated every 10 turns for performance.
 */

import type { GeneratedBoard, TileData } from "../../board/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InfluenceCell {
	/** Combined influence score — higher = more desirable to expand toward. */
	value: number;
	/** Resource proximity contribution. */
	resourceScore: number;
	/** Enemy threat contribution (negative). */
	threatScore: number;
	/** Distance-from-center score (further = slightly higher to encourage expansion). */
	frontierScore: number;
	/** Chokepoint score (tiles with few neighbors are strategically important). */
	chokeScore: number;
}

export interface InfluenceMap {
	/** Row-major grid: cells[z][x]. */
	cells: InfluenceCell[][];
	width: number;
	height: number;
	/** Turn this map was last computed. */
	computedAtTurn: number;
}

export interface InfluenceInput {
	/** Non-depleted resource deposit positions. */
	deposits: ReadonlyArray<{ x: number; z: number }>;
	/** Enemy unit positions (factions + cults). */
	enemies: ReadonlyArray<{ x: number; z: number }>;
	/** Faction's centroid position. */
	factionCenter: { x: number; z: number };
	/** Friendly unit positions. */
	friendlies: ReadonlyArray<{ x: number; z: number }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Influence map refresh interval (turns). */
const REFRESH_INTERVAL = 10;

/** Max distance for resource influence falloff. */
const RESOURCE_INFLUENCE_RADIUS = 12;

/** Max distance for enemy threat influence falloff. */
const THREAT_INFLUENCE_RADIUS = 8;

/** Max distance for friendly force projection. */
const FRIENDLY_INFLUENCE_RADIUS = 6;

/** Weight multipliers for combining sub-scores. */
const WEIGHTS = {
	resource: 1.0,
	threat: -0.8,
	frontier: 0.3,
	choke: 0.5,
	friendly: 0.2,
} as const;

// ---------------------------------------------------------------------------
// Influence map computation
// ---------------------------------------------------------------------------

/**
 * Compute influence map for the entire board.
 * O(W*H * (deposits + enemies + friendlies)) — manageable for 44x44 boards.
 */
export function computeInfluenceMap(
	board: GeneratedBoard,
	input: InfluenceInput,
	currentTurn: number,
): InfluenceMap {
	const { width, height } = board.config;
	const cells: InfluenceCell[][] = [];

	// Pre-compute neighbor counts for chokepoint detection
	const neighborCounts = computeNeighborCounts(board);

	// Max possible distance (for normalization)
	const maxDist = width + height;

	for (let z = 0; z < height; z++) {
		const row: InfluenceCell[] = [];
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];

			if (!tile.passable) {
				row.push({
					value: -1,
					resourceScore: 0,
					threatScore: 0,
					frontierScore: 0,
					chokeScore: 0,
				});
				continue;
			}

			// Resource proximity — sum of inverse distances to deposits
			let resourceScore = 0;
			for (const dep of input.deposits) {
				const dist = manhattan(x, z, dep.x, dep.z);
				if (dist <= RESOURCE_INFLUENCE_RADIUS) {
					resourceScore += 1 - dist / RESOURCE_INFLUENCE_RADIUS;
				}
			}
			// Normalize to 0-1 range
			resourceScore = Math.min(1, resourceScore / Math.max(1, input.deposits.length * 0.3));

			// Enemy threat — sum of inverse distances to enemies
			let threatScore = 0;
			for (const enemy of input.enemies) {
				const dist = manhattan(x, z, enemy.x, enemy.z);
				if (dist <= THREAT_INFLUENCE_RADIUS) {
					threatScore += 1 - dist / THREAT_INFLUENCE_RADIUS;
				}
			}
			threatScore = Math.min(1, threatScore / Math.max(1, input.enemies.length * 0.2));

			// Friendly force projection — tiles near friendlies are safer
			let friendlyScore = 0;
			for (const f of input.friendlies) {
				const dist = manhattan(x, z, f.x, f.z);
				if (dist <= FRIENDLY_INFLUENCE_RADIUS) {
					friendlyScore += 1 - dist / FRIENDLY_INFLUENCE_RADIUS;
				}
			}
			friendlyScore = Math.min(
				1,
				friendlyScore / Math.max(1, input.friendlies.length * 0.3),
			);

			// Frontier score — further from center = more desirable (encourages expansion)
			const centerDist = manhattan(
				x,
				z,
				input.factionCenter.x,
				input.factionCenter.z,
			);
			const frontierScore = Math.min(1, centerDist / (maxDist * 0.4));

			// Chokepoint score — tiles with fewer passable neighbors are strategic
			const neighbors = neighborCounts[z][x];
			const chokeScore = neighbors <= 2 ? 1 : neighbors === 3 ? 0.5 : 0;

			// Combined value
			const value =
				resourceScore * WEIGHTS.resource +
				threatScore * WEIGHTS.threat +
				frontierScore * WEIGHTS.frontier +
				chokeScore * WEIGHTS.choke +
				friendlyScore * WEIGHTS.friendly;

			row.push({ value, resourceScore, threatScore, frontierScore, chokeScore });
		}
		cells.push(row);
	}

	return { cells, width, height, computedAtTurn: currentTurn };
}

/**
 * Query the highest-value tile within a bounding region.
 * Returns the tile coordinates and value, or null if no passable tiles.
 */
export function findHighValueTile(
	map: InfluenceMap,
	minX: number,
	minZ: number,
	maxX: number,
	maxZ: number,
): { x: number; z: number; value: number } | null {
	let best: { x: number; z: number; value: number } | null = null;

	const clampedMinX = Math.max(0, minX);
	const clampedMinZ = Math.max(0, minZ);
	const clampedMaxX = Math.min(map.width - 1, maxX);
	const clampedMaxZ = Math.min(map.height - 1, maxZ);

	for (let z = clampedMinZ; z <= clampedMaxZ; z++) {
		for (let x = clampedMinX; x <= clampedMaxX; x++) {
			const cell = map.cells[z][x];
			if (cell.value < 0) continue; // impassable
			if (!best || cell.value > best.value) {
				best = { x, z, value: cell.value };
			}
		}
	}

	return best;
}

/**
 * Get the N highest-value tiles on the entire map.
 * Used for strategic expansion target selection.
 */
export function getTopTiles(
	map: InfluenceMap,
	count: number,
): Array<{ x: number; z: number; value: number }> {
	const all: Array<{ x: number; z: number; value: number }> = [];

	for (let z = 0; z < map.height; z++) {
		for (let x = 0; x < map.width; x++) {
			const cell = map.cells[z][x];
			if (cell.value > 0) {
				all.push({ x, z, value: cell.value });
			}
		}
	}

	all.sort((a, b) => b.value - a.value);
	return all.slice(0, count);
}

/**
 * Check if the influence map needs refresh (every REFRESH_INTERVAL turns).
 */
export function needsRefresh(
	map: InfluenceMap | null,
	currentTurn: number,
): boolean {
	if (!map) return true;
	return currentTurn - map.computedAtTurn >= REFRESH_INTERVAL;
}

// ---------------------------------------------------------------------------
// Per-faction influence map cache
// ---------------------------------------------------------------------------

const _factionMaps = new Map<string, InfluenceMap>();

/**
 * Get or compute the influence map for a faction.
 * Cached per faction, refreshed every REFRESH_INTERVAL turns.
 */
export function getFactionInfluenceMap(
	factionId: string,
	board: GeneratedBoard,
	input: InfluenceInput,
	currentTurn: number,
): InfluenceMap {
	const cached = _factionMaps.get(factionId);
	if (cached && !needsRefresh(cached, currentTurn)) {
		return cached;
	}

	const map = computeInfluenceMap(board, input, currentTurn);
	_factionMaps.set(factionId, map);
	return map;
}

/** Clear all cached influence maps (e.g., on new game). */
export function resetInfluenceMaps(): void {
	_factionMaps.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function manhattan(ax: number, az: number, bx: number, bz: number): number {
	return Math.abs(ax - bx) + Math.abs(az - bz);
}

/**
 * Count passable neighbors per tile (for chokepoint detection).
 */
function computeNeighborCounts(board: GeneratedBoard): number[][] {
	const { width, height } = board.config;
	const counts: number[][] = [];

	for (let z = 0; z < height; z++) {
		const row: number[] = [];
		for (let x = 0; x < width; x++) {
			let count = 0;
			for (const [dx, dz] of DIRS) {
				const nx = x + dx;
				const nz = z + dz;
				if (nx >= 0 && nx < width && nz >= 0 && nz < height) {
					if (board.tiles[nz][nx].passable) count++;
				}
			}
			row.push(count);
		}
		counts.push(row);
	}

	return counts;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
	[0, -1],
	[0, 1],
	[1, 0],
	[-1, 0],
];
