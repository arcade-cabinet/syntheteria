/**
 * Chunk-based board generation.
 *
 * Generates labyrinth chunks independently using deterministic seeding.
 * Each chunk is a self-contained CHUNK_SIZE x CHUNK_SIZE tile grid that can
 * be generated and discarded without knowing about other chunks.
 *
 * Cross-chunk connectivity is guaranteed by deterministic border gates:
 * each chunk edge has fixed passable tiles at seeded positions, ensuring
 * adjacent chunks always line up.
 *
 * Usage:
 *   const chunk = generateChunk(worldSeed, chunkX, chunkZ);
 *   // chunk.tiles[localZ][localX] — local coords within chunk
 *   // chunk.worldOffsetX/Z — world-space offset for rendering
 */

import { generateLabyrinth } from "./labyrinth";
import { connectRegions } from "./labyrinthConnectivity";
import { applyLabyrinthFeatures } from "./labyrinthFeatures";
import { growingTreeMazeFill } from "./labyrinthMaze";
import { seededRng } from "./noise";
import { floorTypeForTile } from "./terrain";
import {
	type BoardConfig,
	FLOOR_DEFS,
	type FloorType,
	type TileData,
} from "./types";
import { WORLD_EXTENT, ZONE_PROFILES, zoneForTile } from "./zones";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Tiles per chunk edge. Must be even (maze fill uses odd-coordinate addressing). */
export const CHUNK_SIZE = 32;

/** Number of border gate candidates per edge. */
const GATES_PER_EDGE = 4;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Chunk {
	/** Chunk grid coordinate. */
	chunkX: number;
	chunkZ: number;
	/** World-space tile offset (chunkX * CHUNK_SIZE, chunkZ * CHUNK_SIZE). */
	worldOffsetX: number;
	worldOffsetZ: number;
	/** Row-major tiles: tiles[localZ][localX]. */
	tiles: TileData[][];
}

export type ChunkKey = `${number},${number}`;

export function chunkKey(cx: number, cz: number): ChunkKey {
	return `${cx},${cz}`;
}

// ─── Border gates ───────────────────────────────────────────────────────────

/**
 * Deterministic gate positions along a chunk edge.
 *
 * Gates are placed at fixed positions seeded by the edge's world coordinates.
 * Two adjacent chunks sharing an edge compute identical gate positions because
 * the seed is derived from the shared edge, not from either chunk individually.
 *
 * @param edgeSeed - unique seed for this edge (same for both chunks sharing it)
 * @returns array of local-axis positions (0..CHUNK_SIZE-1) where gates open
 */
function gatePositions(edgeSeed: string): number[] {
	const rng = seededRng(edgeSeed);
	const positions: number[] = [];
	const used = new Set<number>();

	for (let i = 0; i < GATES_PER_EDGE; i++) {
		// Pick odd positions (corridor cells in maze addressing)
		let pos: number;
		let attempts = 0;
		do {
			pos = 1 + Math.floor(rng() * (CHUNK_SIZE - 2));
			if (pos % 2 === 0) pos = Math.min(pos + 1, CHUNK_SIZE - 2);
			attempts++;
		} while (used.has(pos) && attempts < 20);
		used.add(pos);
		positions.push(pos);
	}

	return positions;
}

/**
 * Open border gates on a chunk's edges.
 * North edge (z=0), south edge (z=CHUNK_SIZE-1), west (x=0), east (x=CHUNK_SIZE-1).
 */
function openBorderGates(
	tiles: TileData[][],
	chunkX: number,
	chunkZ: number,
	worldSeed: string,
): void {
	// North edge: shared with chunk (chunkX, chunkZ-1)
	const northSeed = `${worldSeed}_edge_h_${chunkX}_${chunkZ}`;
	for (const lx of gatePositions(northSeed)) {
		forcePassable(tiles, lx, 0);
	}

	// South edge: shared with chunk (chunkX, chunkZ+1)
	const southSeed = `${worldSeed}_edge_h_${chunkX}_${chunkZ + 1}`;
	for (const lx of gatePositions(southSeed)) {
		forcePassable(tiles, lx, CHUNK_SIZE - 1);
	}

	// West edge: shared with chunk (chunkX-1, chunkZ)
	const westSeed = `${worldSeed}_edge_v_${chunkX}_${chunkZ}`;
	for (const lz of gatePositions(westSeed)) {
		forcePassable(tiles, 0, lz);
	}

	// East edge: shared with chunk (chunkX+1, chunkZ)
	const eastSeed = `${worldSeed}_edge_v_${chunkX + 1}_${chunkZ}`;
	for (const lz of gatePositions(eastSeed)) {
		forcePassable(tiles, CHUNK_SIZE - 1, lz);
	}
}

function forcePassable(tiles: TileData[][], lx: number, lz: number): void {
	const tile = tiles[lz]?.[lx];
	if (!tile) return;
	tile.passable = true;
	tile.floorType = "transit_deck";
	tile.elevation = 0;
}

// ─── Chunk generation ───────────────────────────────────────────────────────

/**
 * Generate a single chunk at (chunkX, chunkZ) in chunk-grid coordinates.
 *
 * The chunk is fully self-contained: room placement, maze fill, connectivity,
 * pruning, zone floors, and resources are all computed locally. Border gates
 * ensure adjacent chunks connect.
 */
export function generateChunk(
	worldSeed: string,
	chunkX: number,
	chunkZ: number,
): Chunk {
	const offsetX = chunkX * CHUNK_SIZE;
	const offsetZ = chunkZ * CHUNK_SIZE;
	const chunkSeed = `${worldSeed}_c${chunkX}_${chunkZ}`;

	// Phase 1: Room placement + solid fill
	const config: BoardConfig = {
		width: CHUNK_SIZE,
		height: CHUNK_SIZE,
		seed: chunkSeed,
		difficulty: "normal",
		cultDensity: 1,
	};
	const board = generateLabyrinth(config);
	const tiles = board.tiles;

	// Phase 2: Maze fill
	const mazeRng = seededRng(`${chunkSeed}_maze`);
	growingTreeMazeFill(tiles, CHUNK_SIZE, CHUNK_SIZE, mazeRng);

	// Open border gates BEFORE connectivity so flood-fill sees them
	openBorderGates(tiles, chunkX, chunkZ, worldSeed);

	// Phase 3: Connectivity within chunk
	connectRegions(tiles, CHUNK_SIZE, CHUNK_SIZE, chunkSeed);

	// Phase 4: Dead-end pruning + features
	applyLabyrinthFeatures(tiles, CHUNK_SIZE, CHUNK_SIZE, chunkSeed);

	// Re-open border gates in case pruning closed them
	openBorderGates(tiles, chunkX, chunkZ, worldSeed);

	// Phase 6: Zone floors + resources (using absolute world coords)
	applyChunkZoneFloors(tiles, offsetX, offsetZ, chunkSeed);
	scatterChunkResources(tiles, offsetX, offsetZ, chunkSeed);

	// Phase 8: Zone assignment (absolute coords)
	assignChunkZones(tiles, offsetX, offsetZ);

	// Stamp world-space coordinates on each tile
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			tiles[lz]![lx]!.x = offsetX + lx;
			tiles[lz]![lx]!.z = offsetZ + lz;
		}
	}

	return {
		chunkX,
		chunkZ,
		worldOffsetX: offsetX,
		worldOffsetZ: offsetZ,
		tiles,
	};
}

// ─── Chunk-local phase implementations ──────────────────────────────────────

const DISTRICT_FLOORS: FloorType[] = [
	"durasteel_span",
	"collapsed_zone",
	"dust_district",
	"bio_district",
	"aerostructure",
];

/** Scatter rate per floor type. */
const SCATTER_RATE: Record<string, number> = {
	structural_mass: 0.7,
	abyssal_platform: 0.2,
	durasteel_span: 0.08,
	transit_deck: 0.08,
	collapsed_zone: 0.15,
	dust_district: 0.12,
	bio_district: 0.08,
	aerostructure: 0.06,
	void_pit: 0,
};

function applyChunkZoneFloors(
	tiles: TileData[][],
	offsetX: number,
	offsetZ: number,
	seed: string,
): void {
	const rng = seededRng(`${seed}_zones`);

	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			const tile = tiles[lz]![lx]!;
			if (tile.floorType !== "transit_deck") continue;
			if (!tile.passable) continue;

			if (rng() < 0.9) {
				const wx = offsetX + lx;
				const wz = offsetZ + lz;
				const zone = zoneForTile(wx, wz, WORLD_EXTENT, WORLD_EXTENT);
				const profile = ZONE_PROFILES[zone];

				if (zone === "city") {
					const noiseFloor = floorTypeForTile(wx, wz, 0, seed);
					if (
						noiseFloor !== "void_pit" &&
						noiseFloor !== "structural_mass" &&
						noiseFloor !== "abyssal_platform"
					) {
						tile.floorType = noiseFloor;
					} else {
						tile.floorType =
							DISTRICT_FLOORS[
								Math.abs(wx * 7 + wz * 13) % DISTRICT_FLOORS.length
							]!;
					}
				} else {
					const zoneFloors = profile.floorTypes;
					if (zoneFloors.length > 0) {
						// Math.abs guards against negative world coords producing negative modulo
						const idx = Math.abs(wx * 7 + wz * 13) % zoneFloors.length;
						tile.floorType = zoneFloors[idx] as FloorType;
					}
					// If zoneFloors is empty, keep existing floorType (transit_deck)
				}
			}
		}
	}
}

function scatterChunkResources(
	tiles: TileData[][],
	offsetX: number,
	offsetZ: number,
	seed: string,
): void {
	const rng = seededRng(`${seed}_props`);

	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			const tile = tiles[lz]![lx]!;
			const baseRate = SCATTER_RATE[tile.floorType] ?? 0;
			if (baseRate === 0) continue;

			const wx = offsetX + lx;
			const wz = offsetZ + lz;
			const zone = zoneForTile(wx, wz, WORLD_EXTENT, WORLD_EXTENT);
			const rate = baseRate * ZONE_PROFILES[zone].resourceMultiplier;
			if (rng() >= rate) continue;

			const def = FLOOR_DEFS[tile.floorType];
			if (!def.mineable || def.resourceMaterial === null) continue;

			tile.resourceMaterial = def.resourceMaterial;
			const [min, max] = def.resourceAmount;
			tile.resourceAmount = min + Math.floor(rng() * (max - min + 1));
		}
	}
}

function assignChunkZones(
	tiles: TileData[][],
	offsetX: number,
	offsetZ: number,
): void {
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			tiles[lz]![lx]!.zone = zoneForTile(
				offsetX + lx,
				offsetZ + lz,
				WORLD_EXTENT,
				WORLD_EXTENT,
			);
		}
	}
}
