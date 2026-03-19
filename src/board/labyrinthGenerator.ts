/**
 * Labyrinth generator — full 6-phase pipeline.
 *
 * Replaces the BSP city layout generator with a Rooms-and-Mazes labyrinth.
 * Same API: BoardConfig → GeneratedBoard (TileData[][]).
 *
 * Pipeline:
 *   Phase 1: Room placement (faction starts, cult POIs, scatter rooms)
 *   Phase 2: Growing Tree maze fill between rooms
 *   Phase 3: Region connectivity + loop creation
 *   Phase 4: Dead end pruning + bridges/tunnels + column markers
 *   Phase 5: Abyssal zones + platform connective tissue
 *   Phase 6: Zone floor assignment + resource scatter + player start
 *
 * All random decisions use seededRng with phase-specific suffixes.
 * Same seed = identical output.
 */

import { FLOOR_DEFS } from "../ecs/terrain/types";
import { floorTypeForTile } from "../ecs/terrain/cluster";
import { CLIMATE_PROFILE_SPECS } from "../world/config";
import { seededRng } from "./noise";
import { generateLabyrinth, generateRooms } from "./labyrinth";
import { growingTreeMazeFill } from "./labyrinthMaze";
import { connectRegions } from "./labyrinthConnectivity";
import { applyLabyrinthFeatures } from "./labyrinthFeatures";
import { applyAbyssalZones, type ProtectedZone } from "./labyrinthAbyssal";
import type { BoardConfig, GeneratedBoard, TileData } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Surface scatter rates per floor type.
 * Backstop deposits — survival-level basics when no buildings are in range.
 */
const SCATTER_RATE: Record<string, number> = {
	structural_mass: 0.70,
	abyssal_platform: 0.20,
	durasteel_span: 0.08,
	transit_deck: 0.08,
	collapsed_zone: 0.15,
	dust_district: 0.12,
	bio_district: 0.08,
	aerostructure: 0.06,
	void_pit: 0,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a labyrinth board using the 6-phase Rooms-and-Mazes pipeline.
 *
 * Drop-in replacement for the BSP generateBoard. Same inputs, same outputs.
 */
export function generateLabyrinthBoard(config: BoardConfig): GeneratedBoard {
	const { width, height, seed } = config;
	const centerX = Math.floor(width / 2);
	const centerZ = Math.floor(height / 2);

	// ── Phase 1: Room placement ─────────────────────────────────────────
	// generateLabyrinth creates an all-solid grid and carves rooms into it.
	const board = generateLabyrinth(config);
	const tiles = board.tiles;

	// Get room list for protected zones (faction starts)
	const rooms = generateRooms(width, height, seed);

	// ── Phase 2: Growing Tree maze fill ──────────────────────────────────
	const mazeRng = seededRng(seed + "_maze");
	growingTreeMazeFill(tiles, width, height, mazeRng);

	// ── Phase 3: Region connectivity + loop creation ─────────────────────
	connectRegions(tiles, width, height, seed);

	// ── Phase 4: Dead end pruning + bridges/tunnels ──────────────────────
	applyLabyrinthFeatures(tiles, width, height, seed);

	// ── Phase 5: Abyssal zones ───────────────────────────────────────────
	const climate = config.climateProfile ?? "temperate";
	const waterLevel = CLIMATE_PROFILE_SPECS[climate].waterLevel;

	// Protect faction start rooms from becoming abyssal
	const protectedZones: ProtectedZone[] = rooms
		.filter((r) => r.kind === "faction_start")
		.map((r) => ({ x: r.x, z: r.z, w: r.w, h: r.h }));

	applyAbyssalZones(tiles, width, height, seed, waterLevel, protectedZones);

	// ── Phase 6: Zone floor assignment + resource scatter ────────────────
	applyZoneFloors(tiles, width, height, seed, climate);
	scatterResources(tiles, width, height, seed);

	// ── Force player start tile at center — always passable ground ───────
	forcePlayerStart(tiles, centerX, centerZ, width, height);

	return { config, tiles };
}

// ─── Phase 6a: Zone floor assignment ────────────────────────────────────────

/**
 * Assign zone-specific floor types to corridor tiles based on geography noise.
 * Room tiles already have their floor type from Phase 1 (room.floorType).
 * Corridors carved in Phase 2 are transit_deck — we vary them using
 * cluster noise for visual district variety across the board.
 *
 * 85% of corridors get noise-driven zone floors (durasteel, collapsed, dust,
 * bio, aerostructure). Only 15% stay as transit_deck for contrast.
 * This creates distinct visual districts across the labyrinth.
 */
function applyZoneFloors(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
	climate: string,
): void {
	const rng = seededRng(seed + "_zones");

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			// Only reassign corridor tiles (transit_deck from maze fill)
			// Leave room floors, structural_mass, abyssal, etc. alone
			if (tile.floorType !== "transit_deck") continue;
			if (!tile.passable) continue;

			// 85% of corridors get noise-driven zone floors for visual variety.
			// The remaining 15% stay as transit_deck for contrast.
			if (rng() < 0.85) {
				const noiseFloor = floorTypeForTile(x, z, 0, seed);
				// Only use passable floor types from noise
				if (
					noiseFloor !== "void_pit" &&
					noiseFloor !== "structural_mass" &&
					noiseFloor !== "abyssal_platform"
				) {
					tile.floorType = noiseFloor;
				}
			}
		}
	}
}

// ─── Phase 6b: Resource scatter ─────────────────────────────────────────────

/**
 * Scatter resource deposits on floor tiles using SCATTER_RATE.
 * Same logic as the BSP generator — backstop deposits for survival.
 */
function scatterResources(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
): void {
	const rng = seededRng(seed + "_props");

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			const rate = SCATTER_RATE[tile.floorType] ?? 0;
			if (rate === 0) continue;
			if (rng() >= rate) continue;

			const def = FLOOR_DEFS[tile.floorType];
			if (!def.mineable || def.resourceMaterial === null) continue;

			tile.resourceMaterial = def.resourceMaterial;
			const [min, max] = def.resourceAmount;
			tile.resourceAmount = min + Math.floor(rng() * (max - min + 1));
		}
	}
}

// ─── Player start ───────────────────────────────────────────────────────────

/**
 * Force the center tile (and a small area around it) to be passable ground.
 * The player start room from Phase 1 should already cover this, but this
 * ensures the center tile is always valid even if abyssal conversion or
 * dead-end pruning affected it.
 */
function forcePlayerStart(
	tiles: TileData[][],
	cx: number,
	cz: number,
	w: number,
	h: number,
): void {
	// Force center tile
	if (cx >= 0 && cx < w && cz >= 0 && cz < h) {
		const tile = tiles[cz]![cx]!;
		tile.elevation = 0;
		tile.passable = true;
		tile.floorType = "durasteel_span";
		tile.resourceMaterial = null;
		tile.resourceAmount = 0;
	}
}
