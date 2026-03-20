/**
 * elevationSampler — Layer 1 (height mesh) pure logic.
 *
 * Converts logical tile elevation values to world-space Y displacement,
 * with bilinear interpolation across tile boundaries for smooth terrain.
 *
 * This is the bridge between Layer 0 (grid data) and Layer 1 (geometry).
 * Kept separate from BoardRenderer so it can be unit-tested in JSDOM.
 */

import type { Elevation, GeneratedBoard } from "../board";
import { TILE_SIZE_M } from "../board";

// ---------------------------------------------------------------------------
// Elevation → world-space Y (metres)
// ---------------------------------------------------------------------------

/**
 * World-space Y displacement per Elevation level.
 *
 * pit (-1) → -1.5 m below ground (pit floors, sub-basements)
 * flat (0) → 0 m (standard surface)
 * raised (1) → 2.0 m (low platforms, mounds)
 * high (2) → 4.5 m (cliffs, towers, high terrain)
 */
export const ELEV_Y: Record<Elevation, number> = {
	"-1": -1.5,
	"0": 0,
	"1": 2.0,
	"2": 4.5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * World-space Y for a tile at (tx, tz). Clamps to board bounds.
 */
export function tileElevY(
	board: GeneratedBoard,
	tx: number,
	tz: number,
): number {
	const { width, height } = board.config;
	const cx = Math.max(0, Math.min(width - 1, tx));
	const cz = Math.max(0, Math.min(height - 1, tz));
	return ELEV_Y[board.tiles[cz][cx].elevation];
}

/**
 * Bilinear interpolation of tile elevations at a world XZ position.
 *
 * Samples the 4 nearest tile centers and blends them. Vertices at tile
 * boundaries automatically average the two adjacent tiles — this creates
 * smooth hills, valleys, and cliffs with no hard geometry edges.
 *
 * The tile center for index `n` is at `n * TILE_SIZE_M` in world space.
 */
export function sampleElevation(
	board: GeneratedBoard,
	worldX: number,
	worldZ: number,
): number {
	const ftx = worldX / TILE_SIZE_M;
	const ftz = worldZ / TILE_SIZE_M;

	const t0x = Math.floor(ftx);
	const t0z = Math.floor(ftz);
	const t1x = t0x + 1;
	const t1z = t0z + 1;

	const fx = ftx - t0x;
	const fz = ftz - t0z;

	const e00 = tileElevY(board, t0x, t0z);
	const e10 = tileElevY(board, t1x, t0z);
	const e01 = tileElevY(board, t0x, t1z);
	const e11 = tileElevY(board, t1x, t1z);

	return (
		e00 * (1 - fx) * (1 - fz) +
		e10 * fx * (1 - fz) +
		e01 * (1 - fx) * fz +
		e11 * fx * fz
	);
}
