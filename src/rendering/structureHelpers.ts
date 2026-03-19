/**
 * Structure detection helpers — pure functions for identifying structural
 * edges, column positions, interior tiles, and wall heights.
 *
 * Extracted from ProceduralStructureRenderer (which was the old merged-geometry
 * approach). These helpers are still used by StructureRenderer (GLB-based)
 * and performance tests.
 */

import type { GeneratedBoard } from "../board/types";
import { TILE_SIZE_M } from "../board/grid";
import { seedToFloat } from "../ecs/terrain/cluster";
import { isTileExplored } from "./tileVisibility";

// ---------------------------------------------------------------------------
// Structural tile detection
// ---------------------------------------------------------------------------

function isStructural(board: GeneratedBoard, x: number, z: number): boolean {
	const { width, height } = board.config;
	if (x < 0 || x >= width || z < 0 || z >= height) return false;
	return board.tiles[z][x].floorType === "structural_mass";
}

// ---------------------------------------------------------------------------
// Edge detection — walls at cluster boundaries
// ---------------------------------------------------------------------------

type Edge = "north" | "south" | "east" | "west";

export interface StructuralEdge {
	x: number;
	z: number;
	edge: Edge;
}

/**
 * For each structural_mass tile, emit an edge for each neighbor that is NOT
 * structural_mass (or is out of bounds).
 * When explored set is provided, skip unexplored tiles.
 */
export function getStructuralEdges(board: GeneratedBoard, explored?: Set<string>): StructuralEdge[] {
	const { width, height } = board.config;
	const edges: StructuralEdge[] = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			if (board.tiles[z][x].floorType !== "structural_mass") continue;
			if (explored && !isTileExplored(explored, x, z)) continue;

			if (!isStructural(board, x, z - 1)) edges.push({ x, z, edge: "north" });
			if (!isStructural(board, x, z + 1)) edges.push({ x, z, edge: "south" });
			if (!isStructural(board, x - 1, z)) edges.push({ x, z, edge: "west" });
			if (!isStructural(board, x + 1, z)) edges.push({ x, z, edge: "east" });
		}
	}

	return edges;
}

// ---------------------------------------------------------------------------
// Column placement — corners shared by 2+ structural tiles
// ---------------------------------------------------------------------------

export interface ColumnPosition {
	x: number;
	z: number;
}

/**
 * Place a column at each tile corner where 2+ structural_mass tiles share
 * that corner. Each tile has 4 corners; corners are shared with adjacent tiles.
 *
 * Corner (cx, cz) is shared by tiles:
 *   (cx-1, cz-1), (cx, cz-1), (cx-1, cz), (cx, cz)
 * in tile-grid space.
 */
export function getColumnPositions(board: GeneratedBoard, explored?: Set<string>): ColumnPosition[] {
	const { width, height } = board.config;
	const positions: ColumnPosition[] = [];

	function isVisibleStructural(x: number, z: number): boolean {
		if (!isStructural(board, x, z)) return false;
		if (explored && !isTileExplored(explored, x, z)) return false;
		return true;
	}

	for (let cz = 0; cz <= height; cz++) {
		for (let cx = 0; cx <= width; cx++) {
			let count = 0;
			if (isVisibleStructural(cx - 1, cz - 1)) count++;
			if (isVisibleStructural(cx, cz - 1)) count++;
			if (isVisibleStructural(cx - 1, cz)) count++;
			if (isVisibleStructural(cx, cz)) count++;

			if (count >= 2) {
				const half = TILE_SIZE_M / 2;
				positions.push({
					x: cx * TILE_SIZE_M - half,
					z: cz * TILE_SIZE_M - half,
				});
			}
		}
	}

	return positions;
}

// ---------------------------------------------------------------------------
// Interior fill detection — tiles fully surrounded by structural_mass
// ---------------------------------------------------------------------------

export function getInteriorTiles(
	board: GeneratedBoard,
	explored?: Set<string>,
): Array<{ x: number; z: number }> {
	const { width, height } = board.config;
	const interior: Array<{ x: number; z: number }> = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			if (board.tiles[z][x].floorType !== "structural_mass") continue;
			if (explored && !isTileExplored(explored, x, z)) continue;

			if (
				isStructural(board, x - 1, z) &&
				isStructural(board, x + 1, z) &&
				isStructural(board, x, z - 1) &&
				isStructural(board, x, z + 1)
			) {
				interior.push({ x, z });
			}
		}
	}

	return interior;
}

// ---------------------------------------------------------------------------
// Wall height — deterministic from board seed + position
// ---------------------------------------------------------------------------

const BASE_WALL_HEIGHT = 2.5;
const WALL_HEIGHT_VARIATION = 2.0;

export function wallHeight(seed: string, tileX: number, tileZ: number): number {
	const s = seedToFloat(seed + String(tileX * 31 + tileZ * 17));
	return BASE_WALL_HEIGHT + s * WALL_HEIGHT_VARIATION;
}
