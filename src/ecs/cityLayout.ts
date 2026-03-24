/**
 * City layout — backed by the labyrinth generator.
 *
 * Replaces the old procedural circuit-board generator. The labyrinth
 * pipeline produces a tile grid (TileData[][]); this module converts
 * non-passable tiles into CityBuilding objects for the renderer and
 * provides collision/query functions used by navmesh, enemies, etc.
 *
 * Call initCityLayout(config) once at world init to generate the board.
 * After that, getCityBuildings() and the query functions work as before.
 */

import { TILE_SIZE_M } from "../board/grid";
import { generateRooms, type Room } from "../board/labyrinth";
import { generateLabyrinthBoard } from "../board/labyrinthGenerator";
import type { BoardConfig, GeneratedBoard, TileData } from "../board/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CityBuilding {
	/** World-space center */
	x: number;
	z: number;
	/** Half-extents */
	halfW: number;
	halfD: number;
	/** Building height for rendering */
	height: number;
	/** Type affects visual appearance */
	type: "conduit" | "node" | "tower" | "ruin" | "wall";
}

// ─── State ──────────────────────────────────────────────────────────────────

let cachedBoard: GeneratedBoard | null = null;
let cachedRooms: Room[] | null = null;
let cachedBuildings: CityBuilding[] | null = null;
let boardWidth = 0;
let boardHeight = 0;

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Initialize the city layout by running the labyrinth generator.
 * Must be called once before getCityBuildings() or query functions.
 */
export function initCityLayout(config: BoardConfig): GeneratedBoard {
	cachedBoard = generateLabyrinthBoard(config);
	cachedRooms = generateRooms(
		config.width,
		config.height,
		config.seed,
		config.cultDensity,
	);
	cachedBuildings = null; // will be built lazily
	boardWidth = config.width;
	boardHeight = config.height;
	return cachedBoard;
}

/**
 * Get the generated board. Throws if initCityLayout hasn't been called.
 */
export function getBoard(): GeneratedBoard {
	if (!cachedBoard) {
		throw new Error("City layout not initialized — call initCityLayout first");
	}
	return cachedBoard;
}

/**
 * Get the generated rooms. Throws if initCityLayout hasn't been called.
 */
export function getRooms(): Room[] {
	if (!cachedRooms) {
		throw new Error("City layout not initialized — call initCityLayout first");
	}
	return cachedRooms;
}

// ─── Tile ↔ World Coordinate Conversion ──────────────────────────────────────

function tileToWorld(tileX: number, tileZ: number): { x: number; z: number } {
	return {
		x: tileX * TILE_SIZE_M + TILE_SIZE_M / 2,
		z: tileZ * TILE_SIZE_M + TILE_SIZE_M / 2,
	};
}

function worldToTile(wx: number, wz: number): { x: number; z: number } | null {
	const x = Math.floor(wx / TILE_SIZE_M);
	const z = Math.floor(wz / TILE_SIZE_M);
	if (x < 0 || x >= boardWidth || z < 0 || z >= boardHeight) return null;
	return { x, z };
}

// ─── Building Generation from Tile Grid ──────────────────────────────────────

/**
 * Wall height varies by floor type for visual variety.
 * structural_mass = tall solid walls, other impassable types shorter.
 */
function wallHeight(tile: TileData, hashSeed: number): number {
	const base =
		tile.floorType === "structural_mass"
			? 3.5
			: tile.floorType === "void_pit"
				? 0.5
				: 2.5;
	// Deterministic variation based on position
	const variation =
		Math.abs(Math.sin(tile.x * 7.3 + tile.z * 3.1 + hashSeed)) * 1.5;
	return base + variation;
}

/**
 * Convert non-passable tiles into CityBuilding objects.
 * Each non-passable tile becomes one building block.
 * Adjacent tiles of the same type could be merged for perf,
 * but 1:1 is simpler and the instance count is manageable for typical board sizes.
 */
function buildCityBuildingsFromTiles(board: GeneratedBoard): CityBuilding[] {
	const { width, height } = board.config;
	const tiles = board.tiles;
	const buildings: CityBuilding[] = [];
	const halfTile = TILE_SIZE_M / 2;

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = tiles[z]![x]!;
			if (tile.passable) continue; // only walls become buildings

			const { x: wx, z: wz } = tileToWorld(x, z);
			const h = wallHeight(tile, 42.7);

			// Classify building type based on context
			let type: CityBuilding["type"];
			if (tile.floorType === "void_pit") {
				type = "ruin";
			} else if (tile.elevation >= 2) {
				type = "tower";
			} else if (isBorderTile(x, z, width, height)) {
				type = "wall";
			} else {
				// Check if this is a junction (walls on 3+ sides) → node,
				// otherwise a conduit
				const adjacentWalls = countAdjacentWalls(tiles, x, z, width, height);
				type = adjacentWalls >= 3 ? "node" : "conduit";
			}

			buildings.push({
				x: wx,
				z: wz,
				halfW: halfTile,
				halfD: halfTile,
				height: h,
				type,
			});
		}
	}

	return buildings;
}

function isBorderTile(
	x: number,
	z: number,
	width: number,
	height: number,
): boolean {
	return x === 0 || z === 0 || x === width - 1 || z === height - 1;
}

function countAdjacentWalls(
	tiles: TileData[][],
	x: number,
	z: number,
	width: number,
	height: number,
): number {
	let count = 0;
	if (x > 0 && !tiles[z]![x - 1]!.passable) count++;
	if (x < width - 1 && !tiles[z]![x + 1]!.passable) count++;
	if (z > 0 && !tiles[z - 1]![x]!.passable) count++;
	if (z < height - 1 && !tiles[z + 1]![x]!.passable) count++;
	return count;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getCityBuildings(): CityBuilding[] {
	if (cachedBuildings) return cachedBuildings;

	if (!cachedBoard) {
		// Fallback: generate with default config if not initialized
		// This preserves backwards compatibility with code that calls
		// getCityBuildings() before initCityLayout()
		initCityLayout({
			width: 48,
			height: 48,
			seed: "default",
			difficulty: "normal",
		});
	}

	cachedBuildings = buildCityBuildingsFromTiles(cachedBoard!);
	return cachedBuildings;
}

/**
 * Check if a point is inside the city bounds (the labyrinth board area).
 */
export function isInsideCityBounds(x: number, z: number): boolean {
	const maxX = boardWidth * TILE_SIZE_M;
	const maxZ = boardHeight * TILE_SIZE_M;
	return x >= 0 && x < maxX && z >= 0 && z < maxZ;
}

/**
 * Check if a world position is inside any building footprint.
 * Uses the tile grid directly — a position is "inside a building"
 * if the tile at that position is non-passable.
 */
export function isInsideBuilding(x: number, z: number): boolean {
	if (!cachedBoard) return false;
	const tile = worldToTile(x, z);
	if (!tile) return false;
	return !cachedBoard.tiles[tile.z]![tile.x]!.passable;
}

/**
 * Check if a world position is near a building edge (for movement cost increase).
 * Returns true if any of the 4 neighbor tiles is non-passable while
 * the current tile is passable.
 */
export function nearBuildingEdge(x: number, z: number, _margin = 0.5): boolean {
	if (!cachedBoard) return false;
	const tile = worldToTile(x, z);
	if (!tile) return false;

	const currentTile = cachedBoard.tiles[tile.z]![tile.x]!;
	if (!currentTile.passable) return false; // Inside a wall, not "near edge"

	// Check cardinal neighbors
	const dirs = [
		[0, -1],
		[0, 1],
		[-1, 0],
		[1, 0],
	] as const;
	for (const [dx, dz] of dirs) {
		const nx = tile.x + dx;
		const nz = tile.z + dz;
		if (nx < 0 || nx >= boardWidth || nz < 0 || nz >= boardHeight) continue;
		if (!cachedBoard.tiles[nz]![nx]!.passable) return true;
	}
	return false;
}

/**
 * Reset cached state. Called on new game.
 */
export function resetCityLayout(): void {
	cachedBoard = null;
	cachedRooms = null;
	cachedBuildings = null;
	boardWidth = 0;
	boardHeight = 0;
}
