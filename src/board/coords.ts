/**
 * Unified coordinate system for tiles, BabylonJS, and Yuka.
 *
 * All three systems share the same world-space: Y-up, 1 unit = 1 meter.
 * Tile (x, z) → world (x * TILE_SIZE_M, elevation, z * TILE_SIZE_M).
 *
 * BabylonJS Vector3 and Yuka Vector3 have identical (x, y, z) layout,
 * so conversions are trivial — just different class constructors.
 */

import { Vector3 as BVector3 } from "@babylonjs/core/Maths/math.vector";
import { Vector3 as YVector3 } from "yuka";
import type { TileData } from "./types";
import { CHUNK_SIZE } from "./chunks";

export const TILE_SIZE_M = 2.0;
export const ELEVATION_STEP_M = 0.4;

// ─── Tile → World ───────────────────────────────────────────────────────────

export function tileToWorldX(tileX: number): number {
	return tileX * TILE_SIZE_M;
}

export function tileToWorldZ(tileZ: number): number {
	return tileZ * TILE_SIZE_M;
}

export function tileToWorldY(elevation: number): number {
	return elevation * ELEVATION_STEP_M;
}

// ─── World → Tile ───────────────────────────────────────────────────────────

export function worldToTileX(wx: number): number {
	return Math.floor(wx / TILE_SIZE_M);
}

export function worldToTileZ(wz: number): number {
	return Math.floor(wz / TILE_SIZE_M);
}

// ─── Chunk coordinates ──────────────────────────────────────────────────────

export function tileToChunk(tileX: number, tileZ: number): { cx: number; cz: number } {
	return {
		cx: Math.floor(tileX / CHUNK_SIZE),
		cz: Math.floor(tileZ / CHUNK_SIZE),
	};
}

export function chunkOrigin(cx: number, cz: number): { tileX: number; tileZ: number } {
	return {
		tileX: cx * CHUNK_SIZE,
		tileZ: cz * CHUNK_SIZE,
	};
}

// ─── BabylonJS Vector3 ─────────────────────────────────────────────────────

export function tileToBabylon(tile: TileData): BVector3 {
	return new BVector3(
		tile.x * TILE_SIZE_M,
		tile.elevation * ELEVATION_STEP_M,
		tile.z * TILE_SIZE_M,
	);
}

export function worldToBabylon(wx: number, wy: number, wz: number): BVector3 {
	return new BVector3(wx, wy, wz);
}

// ─── Yuka Vector3 ──────────────────────────────────────────────────────────

export function tileToYuka(tile: TileData): YVector3 {
	return new YVector3(
		tile.x * TILE_SIZE_M,
		tile.elevation * ELEVATION_STEP_M,
		tile.z * TILE_SIZE_M,
	);
}

export function worldToYuka(wx: number, wy: number, wz: number): YVector3 {
	return new YVector3(wx, wy, wz);
}

// ─── Cross-library ─────────────────────────────────────────────────────────

export function babylonToYuka(v: BVector3): YVector3 {
	return new YVector3(v.x, v.y, v.z);
}

export function yukaToBabylon(v: YVector3): BVector3 {
	return new BVector3(v.x, v.y, v.z);
}
