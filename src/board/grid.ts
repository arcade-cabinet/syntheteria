import { reachableTiles, shortestPath } from "./adjacency";
import type { GeneratedBoard, TileData, WeightClass } from "./types";

export const TILE_SIZE_M = 2.0;
export const ELEVATION_STEP_M = 0.4;

export interface GridApi {
	readonly width: number;
	readonly height: number;
	readonly tileSizeM: number;
	getTile(x: number, z: number): TileData | null;
	tileWorldPos(x: number, z: number): { wx: number; wy: number; wz: number };
	worldToTile(wx: number, wz: number): { x: number; z: number } | null;
	findTiles(predicate: (tile: TileData) => boolean): TileData[];
	tilesInRange(cx: number, cz: number, range: number): TileData[];
	reachable(
		fromX: number,
		fromZ: number,
		maxSteps: number,
		weightClass?: WeightClass,
	): Set<string>;
	path(fromX: number, fromZ: number, toX: number, toZ: number): TileData[];
}

export function createGridApi(board: GeneratedBoard): GridApi {
	const { width, height } = board.config;

	function getTile(x: number, z: number): TileData | null {
		if (x < 0 || x >= width || z < 0 || z >= height) return null;
		return board.tiles[z][x];
	}

	function tileWorldPos(
		x: number,
		z: number,
	): { wx: number; wy: number; wz: number } {
		const tile = getTile(x, z);
		const elevation = tile ? tile.elevation : 0;
		return {
			wx: x * TILE_SIZE_M,
			wy: elevation * ELEVATION_STEP_M,
			wz: z * TILE_SIZE_M,
		};
	}

	function worldToTile(
		wx: number,
		wz: number,
	): { x: number; z: number } | null {
		const x = Math.floor(wx / TILE_SIZE_M);
		const z = Math.floor(wz / TILE_SIZE_M);
		if (x < 0 || x >= width || z < 0 || z >= height) return null;
		return { x, z };
	}

	function findTiles(predicate: (tile: TileData) => boolean): TileData[] {
		const result: TileData[] = [];
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const tile = board.tiles[z][x];
				if (predicate(tile)) result.push(tile);
			}
		}
		return result;
	}

	function tilesInRange(cx: number, cz: number, range: number): TileData[] {
		const result: TileData[] = [];
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				if (Math.abs(x - cx) + Math.abs(z - cz) <= range) {
					result.push(board.tiles[z][x]);
				}
			}
		}
		return result;
	}

	return {
		width,
		height,
		tileSizeM: TILE_SIZE_M,
		getTile,
		tileWorldPos,
		worldToTile,
		findTiles,
		tilesInRange,
		reachable: (fromX, fromZ, maxSteps, weightClass?) =>
			reachableTiles(fromX, fromZ, maxSteps, board, weightClass),
		path: (fromX, fromZ, toX, toZ) =>
			shortestPath(fromX, fromZ, toX, toZ, board),
	};
}
