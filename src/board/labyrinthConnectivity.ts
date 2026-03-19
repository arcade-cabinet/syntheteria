/**
 * Labyrinth Phase 3 — Region connectivity + loop creation.
 *
 * Pure function that post-processes TileData[][] after room placement (Phase 1)
 * and maze fill (Phase 2).
 *
 * Steps:
 *   1. Flood-fill to identify disconnected passable regions.
 *   2. Find connector tiles: wall tiles adjacent to exactly 2 different regions.
 *   3. Build a spanning tree by opening connectors to connect all regions.
 *   4. Open ~15% extra connectors for loops (multiple paths).
 *
 * All randomness via seededRng(seed + "_connect").
 *
 * Reference: Bob Nystrom "Rooms and Mazes" — connector merging step.
 */

import { seededRng } from "./noise";
import type { TileData } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ConnectivityResult {
	/** Number of disconnected regions found before connecting. */
	regionCount: number;
	/** Number of connectors opened to build the spanning tree. */
	spanningConnectors: number;
	/** Number of extra connectors opened for loops. */
	loopConnectors: number;
}

/** A wall tile adjacent to exactly 2 different regions. */
interface Connector {
	x: number;
	z: number;
	regionA: number;
	regionB: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Cardinal direction offsets. */
const CARDINALS: readonly [number, number][] = [
	[0, -1], // N
	[1, 0], // E
	[0, 1], // S
	[-1, 0], // W
];

/** Fraction of remaining connectors to open as loops after spanning tree. */
const LOOP_FRACTION = 0.15;

// ─── Helpers ────────────────────────────────────────────────────────────────

function inBounds(x: number, z: number, w: number, h: number): boolean {
	return x >= 0 && x < w && z >= 0 && z < h;
}

// ─── Step 1: Flood fill ─────────────────────────────────────────────────────

/**
 * Assign a region ID to every passable tile. Disconnected groups of passable
 * tiles get different IDs. Returns a 2D array of region IDs (0 = wall/unassigned).
 */
function floodFillRegions(
	tiles: TileData[][],
	w: number,
	h: number,
): { regionMap: number[][]; regionCount: number } {
	const regionMap: number[][] = [];
	for (let z = 0; z < h; z++) {
		regionMap.push(new Array(w).fill(0));
	}

	let nextRegion = 0;

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			if (!tiles[z]![x]!.passable) continue;
			if (regionMap[z]![x] !== 0) continue;

			// New region — BFS flood fill
			nextRegion++;
			const stack: Array<[number, number]> = [[x, z]];
			regionMap[z]![x] = nextRegion;

			while (stack.length > 0) {
				const [cx, cz] = stack.pop()!;

				for (const [dx, dz] of CARDINALS) {
					const nx = cx + dx;
					const nz = cz + dz;

					if (!inBounds(nx, nz, w, h)) continue;
					if (regionMap[nz]![nx] !== 0) continue;
					if (!tiles[nz]![nx]!.passable) continue;

					regionMap[nz]![nx] = nextRegion;
					stack.push([nx, nz]);
				}
			}
		}
	}

	return { regionMap, regionCount: nextRegion };
}

// ─── Step 2: Find connectors ────────────────────────────────────────────────

/**
 * Find wall tiles that touch exactly 2 different regions.
 * These are the candidate tiles we can open to connect regions.
 */
function findConnectors(
	tiles: TileData[][],
	regionMap: number[][],
	w: number,
	h: number,
): Connector[] {
	const connectors: Connector[] = [];

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			// Only wall tiles can be connectors
			if (tiles[z]![x]!.passable) continue;

			// Collect unique region IDs of cardinal neighbors
			const adjacentRegions = new Set<number>();
			for (const [dx, dz] of CARDINALS) {
				const nx = x + dx;
				const nz = z + dz;
				if (!inBounds(nx, nz, w, h)) continue;
				const rid = regionMap[nz]![nx]!;
				if (rid > 0) adjacentRegions.add(rid);
			}

			// Connector must touch exactly 2 different regions
			if (adjacentRegions.size === 2) {
				const [a, b] = [...adjacentRegions];
				connectors.push({ x, z, regionA: a!, regionB: b! });
			}
		}
	}

	return connectors;
}

// ─── Union-Find for spanning tree ───────────────────────────────────────────

class UnionFind {
	private parent: number[];
	private rank: number[];

	constructor(n: number) {
		this.parent = Array.from({ length: n + 1 }, (_, i) => i);
		this.rank = new Array(n + 1).fill(0);
	}

	find(x: number): number {
		if (this.parent[x] !== x) {
			this.parent[x] = this.find(this.parent[x]!);
		}
		return this.parent[x]!;
	}

	union(a: number, b: number): boolean {
		const ra = this.find(a);
		const rb = this.find(b);
		if (ra === rb) return false; // already connected

		if (this.rank[ra]! < this.rank[rb]!) {
			this.parent[ra] = rb;
		} else if (this.rank[ra]! > this.rank[rb]!) {
			this.parent[rb] = ra;
		} else {
			this.parent[rb] = ra;
			this.rank[ra]!++;
		}
		return true;
	}

	connected(a: number, b: number): boolean {
		return this.find(a) === this.find(b);
	}
}

// ─── Step 3+4: Connect regions ──────────────────────────────────────────────

/**
 * Open a wall tile to make it passable (transit_deck at elevation 0).
 */
function openConnector(tiles: TileData[][], x: number, z: number): void {
	const tile = tiles[z]![x]!;
	tile.passable = true;
	tile.floorType = "transit_deck";
	tile.elevation = 0;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Connect all disconnected regions in the labyrinth and add loop connectors.
 *
 * Mutates `tiles` in place. Returns connectivity statistics.
 *
 * @param tiles  Row-major tile grid (tiles[z][x]). Modified in place.
 * @param width  Board width.
 * @param height Board height.
 * @param seed   Board seed string — connectivity RNG derived as seed + "_connect".
 */
export function connectRegions(
	tiles: TileData[][],
	width: number,
	height: number,
	seed: string,
): ConnectivityResult {
	const rng = seededRng(seed + "_connect");

	// Step 1: Identify regions
	const { regionMap, regionCount } = floodFillRegions(tiles, width, height);

	// Nothing to connect if 0 or 1 regions
	if (regionCount <= 1) {
		return { regionCount, spanningConnectors: 0, loopConnectors: 0 };
	}

	// Step 2: Find all connector tiles
	const connectors = findConnectors(tiles, regionMap, width, height);

	if (connectors.length === 0) {
		return { regionCount, spanningConnectors: 0, loopConnectors: 0 };
	}

	// Shuffle connectors for random spanning tree shape
	for (let i = connectors.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[connectors[i], connectors[j]] = [connectors[j]!, connectors[i]!];
	}

	// Step 3: Build spanning tree — open connectors until all regions connected
	const uf = new UnionFind(regionCount);
	let spanningConnectors = 0;
	const usedIndices = new Set<number>();

	for (let i = 0; i < connectors.length; i++) {
		const c = connectors[i]!;
		if (uf.union(c.regionA, c.regionB)) {
			openConnector(tiles, c.x, c.z);
			spanningConnectors++;
			usedIndices.add(i);

			// Early exit: spanning tree needs exactly regionCount-1 edges
			if (spanningConnectors >= regionCount - 1) break;
		}
	}

	// Step 4: Open ~15% of remaining connectors as loops
	const remaining: Connector[] = [];
	for (let i = 0; i < connectors.length; i++) {
		if (!usedIndices.has(i)) remaining.push(connectors[i]!);
	}

	const loopTarget = Math.max(0, Math.round(remaining.length * LOOP_FRACTION));
	let loopConnectors = 0;

	for (let i = 0; i < remaining.length && loopConnectors < loopTarget; i++) {
		const c = remaining[i]!;
		openConnector(tiles, c.x, c.z);
		loopConnectors++;
	}

	return { regionCount, spanningConnectors, loopConnectors };
}

/**
 * Verify all passable tiles are connected (single flood-fill region).
 * Useful for testing and validation.
 */
export function isFullyConnected(
	tiles: TileData[][],
	width: number,
	height: number,
): boolean {
	const { regionCount } = floodFillRegions(tiles, width, height);
	return regionCount <= 1;
}
