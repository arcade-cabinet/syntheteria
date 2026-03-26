/**
 * Labyrinth Phase 4 — Dead-end pruning + bridge/tunnel placement + column markers.
 *
 * Pure function that post-processes TileData[][] after connectivity (Phase 3).
 *
 * Steps:
 *   1. Iteratively fill dead-end passable tiles (≥3 wall neighbors) back to
 *      structural_mass until no dead ends remain.
 *   2. Place bridges (~5% of eligible wall segments): durasteel_span at
 *      elevation 1, spanning OVER a wall between two passable tiles.
 *   3. Punch tunnels (~3% of single-thickness walls): transit_deck at
 *      elevation 0, THROUGH a wall between two passable tiles.
 *   4. Mark wall corners (L/T/X junctions) for decorative column placement.
 *
 * All randomness via seededRng(seed + "_features").
 */

import { seededRng } from "./noise";
import type { TileData } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ColumnMarker {
	x: number;
	z: number;
	type: "L" | "T" | "X";
}

export interface LabyrinthFeaturesResult {
	/** Number of dead-end tiles filled back to structural_mass. */
	deadEndsFilled: number;
	/** Number of bridge tiles placed. */
	bridgesPlaced: number;
	/** Number of tunnel tiles punched. */
	tunnelsPunched: number;
	/** Wall junction positions for column decoration. */
	columnMarkers: ColumnMarker[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Target fraction of eligible wall segments that become bridges. */
const BRIDGE_RATE = 0.05;

/** Target fraction of eligible single-thickness walls that become tunnels. */
const TUNNEL_RATE = 0.03;

// ─── Cardinal helpers ───────────────────────────────────────────────────────

const CARDINALS: readonly [number, number][] = [
	[0, -1], // N
	[1, 0], // E
	[0, 1], // S
	[-1, 0], // W
];

function inBounds(x: number, z: number, w: number, h: number): boolean {
	return x >= 0 && x < w && z >= 0 && z < h;
}

function isWall(
	tiles: TileData[][],
	x: number,
	z: number,
	w: number,
	h: number,
): boolean {
	if (!inBounds(x, z, w, h)) return true; // out of bounds treated as wall
	return (
		tiles[z]![x]!.floorType === "structural_mass" ||
		tiles[z]![x]!.floorType === "void_pit"
	);
}

function isPassable(
	tiles: TileData[][],
	x: number,
	z: number,
	w: number,
	h: number,
): boolean {
	if (!inBounds(x, z, w, h)) return false;
	return tiles[z]![x]!.passable;
}

function countWallNeighbors(
	tiles: TileData[][],
	x: number,
	z: number,
	w: number,
	h: number,
): number {
	let count = 0;
	for (const [dx, dz] of CARDINALS) {
		if (isWall(tiles, x + dx, z + dz, w, h)) count++;
	}
	return count;
}

// ─── Step 1: Dead-end pruning ───────────────────────────────────────────────

/**
 * Iteratively fill passable tiles that have ≥3 wall neighbors (dead ends)
 * back to structural_mass. Continues until no more dead ends exist.
 *
 * A dead end is a passable tile surrounded by walls on 3+ cardinal sides,
 * meaning it's a corridor stub with only one exit.
 */
function pruneDeadEnds(tiles: TileData[][], w: number, h: number): number {
	let totalFilled = 0;
	let changed = true;

	while (changed) {
		changed = false;
		for (let z = 0; z < h; z++) {
			for (let x = 0; x < w; x++) {
				const tile = tiles[z]![x]!;
				if (!tile.passable) continue;

				const wallCount = countWallNeighbors(tiles, x, z, w, h);
				if (wallCount >= 3) {
					// Fill this dead end back to wall
					tile.passable = false;
					tile.floorType = "structural_mass";
					tile.elevation = 1;
					tile.resourceMaterial = null;
					tile.resourceAmount = 0;
					totalFilled++;
					changed = true;
				}
			}
		}
	}

	return totalFilled;
}

// ─── Step 2: Bridge placement ───────────────────────────────────────────────

/**
 * A bridge candidate is a wall tile that has passable tiles on opposite sides
 * (N+S or E+W). The bridge goes OVER the wall at elevation 1.
 */
interface BridgeCandidate {
	x: number;
	z: number;
	axis: "ns" | "ew";
}

function findBridgeCandidates(
	tiles: TileData[][],
	w: number,
	h: number,
): BridgeCandidate[] {
	const candidates: BridgeCandidate[] = [];

	for (let z = 1; z < h - 1; z++) {
		for (let x = 1; x < w - 1; x++) {
			const tile = tiles[z]![x]!;
			if (tile.floorType !== "structural_mass") continue;

			// Check N-S passable on opposite sides
			if (
				isPassable(tiles, x, z - 1, w, h) &&
				isPassable(tiles, x, z + 1, w, h)
			) {
				candidates.push({ x, z, axis: "ns" });
			}
			// Check E-W passable on opposite sides
			if (
				isPassable(tiles, x - 1, z, w, h) &&
				isPassable(tiles, x + 1, z, w, h)
			) {
				candidates.push({ x, z, axis: "ew" });
			}
		}
	}

	return candidates;
}

function placeBridges(
	tiles: TileData[][],
	w: number,
	h: number,
	rng: () => number,
): number {
	const candidates = findBridgeCandidates(tiles, w, h);
	if (candidates.length === 0) return 0;

	// Shuffle candidates for even distribution
	for (let i = candidates.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
	}

	const targetCount = Math.max(1, Math.round(candidates.length * BRIDGE_RATE));
	let placed = 0;

	// Track which tiles we've already bridged to avoid adjacent bridges
	const bridged = new Set<string>();

	for (const c of candidates) {
		if (placed >= targetCount) break;

		const key = `${c.x},${c.z}`;
		if (bridged.has(key)) continue;

		// Don't bridge next to another bridge
		let tooClose = false;
		for (const [dx, dz] of CARDINALS) {
			if (bridged.has(`${c.x + dx},${c.z + dz}`)) {
				tooClose = true;
				break;
			}
		}
		if (tooClose) continue;

		// Place bridge: elevated durasteel_span over the wall
		const tile = tiles[c.z]![c.x]!;
		tile.passable = true;
		tile.floorType = "durasteel_span";
		tile.elevation = 1;
		tile.resourceMaterial = null;
		tile.resourceAmount = 0;

		bridged.add(key);
		placed++;
	}

	return placed;
}

// ─── Step 3: Tunnel placement ───────────────────────────────────────────────

/**
 * A tunnel candidate is a single-thickness wall tile with passable tiles on
 * opposite sides. The tunnel punches THROUGH the wall at elevation 0.
 *
 * "Single-thickness" means the wall tile's perpendicular neighbors (relative
 * to the tunnel axis) are NOT also structural_mass — ensuring we don't punch
 * through thick walls.
 */
interface TunnelCandidate {
	x: number;
	z: number;
}

function findTunnelCandidates(
	tiles: TileData[][],
	w: number,
	h: number,
): TunnelCandidate[] {
	const candidates: TunnelCandidate[] = [];

	for (let z = 1; z < h - 1; z++) {
		for (let x = 1; x < w - 1; x++) {
			const tile = tiles[z]![x]!;
			if (tile.floorType !== "structural_mass") continue;

			// N-S tunnel: passable north+south, wall not extending east or west
			const nsPassable =
				isPassable(tiles, x, z - 1, w, h) && isPassable(tiles, x, z + 1, w, h);
			if (nsPassable) {
				// Single-thickness check: east and west should NOT be structural_mass
				const eWall = isWall(tiles, x + 1, z, w, h);
				const wWall = isWall(tiles, x - 1, z, w, h);
				if (!eWall || !wWall) {
					candidates.push({ x, z });
					continue;
				}
			}

			// E-W tunnel: passable east+west, wall not extending north or south
			const ewPassable =
				isPassable(tiles, x - 1, z, w, h) && isPassable(tiles, x + 1, z, w, h);
			if (ewPassable) {
				const nWall = isWall(tiles, x, z - 1, w, h);
				const sWall = isWall(tiles, x, z + 1, w, h);
				if (!nWall || !sWall) {
					candidates.push({ x, z });
				}
			}
		}
	}

	return candidates;
}

function punchTunnels(
	tiles: TileData[][],
	w: number,
	h: number,
	rng: () => number,
): number {
	const candidates = findTunnelCandidates(tiles, w, h);
	if (candidates.length === 0) return 0;

	// Shuffle for even distribution
	for (let i = candidates.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
	}

	const targetCount = Math.max(1, Math.round(candidates.length * TUNNEL_RATE));
	let punched = 0;

	const tunneled = new Set<string>();

	for (const c of candidates) {
		if (punched >= targetCount) break;

		const key = `${c.x},${c.z}`;
		if (tunneled.has(key)) continue;

		// Don't tunnel next to another tunnel
		let tooClose = false;
		for (const [dx, dz] of CARDINALS) {
			if (tunneled.has(`${c.x + dx},${c.z + dz}`)) {
				tooClose = true;
				break;
			}
		}
		if (tooClose) continue;

		// Punch tunnel: transit_deck at ground level
		const tile = tiles[c.z]![c.x]!;
		tile.passable = true;
		tile.floorType = "transit_deck";
		tile.elevation = 0;
		tile.resourceMaterial = null;
		tile.resourceAmount = 0;

		tunneled.add(key);
		punched++;
	}

	return punched;
}

// ─── Step 4: Column markers ─────────────────────────────────────────────────

/**
 * Mark wall junction tiles (corners, T-junctions, crossroads) for decorative
 * column placement. Only considers tiles that are still structural_mass after
 * pruning/bridge/tunnel steps.
 */
function findColumnMarkers(
	tiles: TileData[][],
	w: number,
	h: number,
): ColumnMarker[] {
	const markers: ColumnMarker[] = [];

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			if (tiles[z]![x]!.floorType !== "structural_mass") continue;

			let wallNeighborCount = 0;
			for (const [dx, dz] of CARDINALS) {
				const nx = x + dx;
				const nz = z + dz;
				if (!inBounds(nx, nz, w, h)) continue;
				if (tiles[nz]![nx]!.floorType === "structural_mass")
					wallNeighborCount++;
			}

			// Classify junction type
			if (wallNeighborCount === 4) {
				markers.push({ x, z, type: "X" });
			} else if (wallNeighborCount === 3) {
				markers.push({ x, z, type: "T" });
			} else if (wallNeighborCount === 2) {
				// Check if it's an L-corner (adjacent sides, not straight)
				const n =
					inBounds(x, z - 1, w, h) &&
					tiles[z - 1]![x]!.floorType === "structural_mass";
				const e =
					inBounds(x + 1, z, w, h) &&
					tiles[z]![x + 1]!.floorType === "structural_mass";
				const s =
					inBounds(x, z + 1, w, h) &&
					tiles[z + 1]![x]!.floorType === "structural_mass";
				const ww =
					inBounds(x - 1, z, w, h) &&
					tiles[z]![x - 1]!.floorType === "structural_mass";

				// L-corner: two adjacent walls (NE, SE, SW, NW)
				const isCorner = (n && e) || (e && s) || (s && ww) || (ww && n);
				if (isCorner) {
					markers.push({ x, z, type: "L" });
				}
			}
		}
	}

	return markers;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Apply labyrinth Phase 4 features to the tile grid.
 *
 * Mutates `tiles` in place. Returns a summary of all modifications.
 *
 * @param tiles  Row-major tile grid (tiles[z][x]). Modified in place.
 * @param width  Board width.
 * @param height Board height.
 * @param seed   Board seed string — features RNG derived as seed + "_features".
 */
export function applyLabyrinthFeatures(
	tiles: TileData[][],
	width: number,
	height: number,
	seed: string,
): LabyrinthFeaturesResult {
	const rng = seededRng(`${seed}_features`);

	// Step 1: Prune dead ends
	const deadEndsFilled = pruneDeadEnds(tiles, width, height);

	// Step 2: Place bridges over walls
	const bridgesPlaced = placeBridges(tiles, width, height, rng);

	// Step 3: Punch tunnels through thin walls
	const tunnelsPunched = punchTunnels(tiles, width, height, rng);

	// Step 4: Mark wall junctions for columns
	const columnMarkers = findColumnMarkers(tiles, width, height);

	return { deadEndsFilled, bridgesPlaced, tunnelsPunched, columnMarkers };
}
