/**
 * Labyrinth generator — full 8-phase pipeline.
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
 *   Phase 7: Multi-level platform generation (elevated tiles + ramps)
 *   Phase 8: Geographic zone assignment + zone-specific density adjustment
 *
 * All random decisions use seededRng with phase-specific suffixes.
 * Same seed = identical output.
 */

import { generateLabyrinth, generateRooms } from "./labyrinth";
import { applyAbyssalZones, type ProtectedZone } from "./labyrinthAbyssal";
import { connectRegions } from "./labyrinthConnectivity";
import { applyLabyrinthFeatures } from "./labyrinthFeatures";
import { growingTreeMazeFill } from "./labyrinthMaze";
import { applyMultiLevelPlatforms } from "./labyrinthPlatforms";
import { seededRng } from "./noise";
import { floorTypeForTile } from "./terrain";
import {
	type BoardConfig,
	CLIMATE_PROFILE_SPECS,
	FLOOR_DEFS,
	type FloorType,
	type GeneratedBoard,
	type TileData,
} from "./types";
import { ZONE_PROFILES, zoneForTile } from "./zones";

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Surface scatter rates per floor type.
 * Backstop deposits — survival-level basics when no buildings are in range.
 */
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

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a labyrinth board using the 6-phase Rooms-and-Mazes pipeline.
 *
 * Drop-in replacement for the BSP generateBoard. Same inputs, same outputs.
 */
export function generateLabyrinthBoard(config: BoardConfig): GeneratedBoard {
	const { width, height, seed } = config;
	const centerX = Math.floor(width / 2);
	const centerZ = Math.floor(height * 0.65);

	// ── Phase 1: Room placement ─────────────────────────────────────────
	// generateLabyrinth creates an all-solid grid and carves rooms into it.
	const board = generateLabyrinth(config);
	const tiles = board.tiles;

	// Get room list for protected zones
	const cultDensity = config.cultDensity;
	const rooms = generateRooms(width, height, seed, cultDensity);

	// ── Phase 2: Growing Tree maze fill ──────────────────────────────────
	const mazeRng = seededRng(`${seed}_maze`);
	growingTreeMazeFill(tiles, width, height, mazeRng);

	// ── Phase 3: Region connectivity + loop creation ─────────────────────
	connectRegions(tiles, width, height, seed);

	// ── Phase 4: Dead end pruning + bridges/tunnels ──────────────────────
	applyLabyrinthFeatures(tiles, width, height, seed);

	// ── Phase 5: Abyssal zones ───────────────────────────────────────────
	const climate = config.climateProfile ?? "temperate";
	const waterLevel = CLIMATE_PROFILE_SPECS[climate].waterLevel;

	// Protect the player start room from becoming abyssal
	const protectedZones: ProtectedZone[] = rooms
		.filter((r) => r.kind === "player_start")
		.map((r) => ({ x: r.x, z: r.z, w: r.w, h: r.h }));

	applyAbyssalZones(tiles, width, height, seed, waterLevel, protectedZones);

	// ── Phase 6: Zone floor assignment + resource scatter ────────────────
	applyZoneFloors(tiles, width, height, seed, climate);
	scatterResources(tiles, width, height, seed);

	// ── Phase 7: Multi-level platforms ───────────────────────────────────
	applyMultiLevelPlatforms(tiles, width, height, seed);

	// ── Phase 8: Geographic zone assignment + density adjustment ─────────
	assignZones(tiles, width, height);
	applyZoneDensity(tiles, width, height, seed);

	// ── Force player start tile at center — always passable ground ───────
	forcePlayerStart(tiles, centerX, centerZ, width, height);

	return { config, tiles };
}

// ─── Phase 6a: Zone floor assignment ────────────────────────────────────────

/**
 * District floor types used as fallbacks when geography noise returns
 * structural_mass or abyssal_platform (non-passable types). Weighted
 * to produce distinct visual zones across the labyrinth.
 */
const DISTRICT_FLOORS: FloorType[] = [
	"durasteel_span",
	"collapsed_zone",
	"dust_district",
	"bio_district",
	"aerostructure",
];

/**
 * Assign zone-specific floor types to corridor tiles.
 *
 * Room tiles keep their floor type from Phase 1.
 * Corridors carved in Phase 2 are transit_deck — we reassign them using
 * either geography noise (city zone) or zone-specific floor type lists
 * (coast, campus, enemy) for distinct visual character per zone.
 *
 * 90% of corridors get zone floors. 10% stay as transit_deck for contrast.
 */
function applyZoneFloors(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
	_climate: string,
): void {
	const rng = seededRng(`${seed}_zones`);

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			// Only reassign corridor tiles (transit_deck from maze fill)
			// Leave room floors, structural_mass walls, abyssal, etc. alone
			if (tile.floorType !== "transit_deck") continue;
			if (!tile.passable) continue;

			// 90% of corridors get zone floors for visual variety.
			// The remaining 10% stay as transit_deck for contrast.
			if (rng() < 0.9) {
				const zone = zoneForTile(x, z, w, h);
				const profile = ZONE_PROFILES[zone];

				// For city zone, use geography noise for natural variety.
				// For other zones, pick from zone-specific floor types.
				if (zone === "city") {
					const noiseFloor = floorTypeForTile(x, z, 0, seed);
					if (
						noiseFloor !== "void_pit" &&
						noiseFloor !== "structural_mass" &&
						noiseFloor !== "abyssal_platform"
					) {
						tile.floorType = noiseFloor;
					} else {
						tile.floorType =
							DISTRICT_FLOORS[(x * 7 + z * 13) % DISTRICT_FLOORS.length]!;
					}
				} else {
					// Pick from zone-specific floor types deterministically
					const zoneFloors = profile.floorTypes;
					const idx = (x * 7 + z * 13) % zoneFloors.length;
					tile.floorType = zoneFloors[idx]! as FloorType;
				}
			}
		}
	}
}

// ─── Phase 6b: Resource scatter ─────────────────────────────────────────────

/**
 * Scatter resource deposits on floor tiles using SCATTER_RATE.
 * Resource scatter rate is multiplied by the zone's resourceMultiplier —
 * coastal mines yield more, enemy territory yields less.
 */
function scatterResources(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
): void {
	const rng = seededRng(`${seed}_props`);

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			const baseRate = SCATTER_RATE[tile.floorType] ?? 0;
			if (baseRate === 0) continue;

			const zone = zoneForTile(x, z, w, h);
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

// ─── Phase 8a: Zone assignment ───────────────────────────────────────────────

/**
 * Stamp every tile with its geographic zone. This runs after all
 * generation phases so downstream systems (rendering, AI) can query
 * tile.zone without recomputing.
 */
function assignZones(tiles: TileData[][], w: number, h: number): void {
	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			tiles[z]![x]!.zone = zoneForTile(x, z, w, h);
		}
	}
}

// ─── Phase 8b: Zone density adjustment ──────────────────────────────────────

/**
 * Open up non-city zones by converting some structural_mass walls to passable
 * floor. The city keeps its full labyrinth density. Coast and campus zones
 * become more open — coastal terrain is flat and exposed, the campus has
 * wider corridors between buildings. Enemy territory is slightly less dense
 * than the city but still maze-like.
 *
 * Only converts wall tiles that have at least 2 passable neighbors,
 * preserving overall structural integrity.
 */
function applyZoneDensity(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
): void {
	const rng = seededRng(`${seed}_density`);

	// Collect candidate wall tiles that could be opened
	// (process in a separate pass to avoid cascading conversions)
	const candidates: {
		x: number;
		z: number;
		zone: "coast" | "campus" | "enemy";
	}[] = [];

	for (let z = 1; z < h - 1; z++) {
		for (let x = 1; x < w - 1; x++) {
			const tile = tiles[z]![x]!;
			if (tile.floorType !== "structural_mass") continue;
			if (tile.passable) continue;

			const zone = zoneForTile(x, z, w, h);
			if (zone === "city") continue; // city keeps full density

			// Count passable neighbors (4-connected)
			let passableNeighbors = 0;
			if (tiles[z - 1]![x]!.passable) passableNeighbors++;
			if (tiles[z + 1]![x]!.passable) passableNeighbors++;
			if (tiles[z]![x - 1]!.passable) passableNeighbors++;
			if (tiles[z]![x + 1]!.passable) passableNeighbors++;

			// Open walls adjacent to at least 1 passable tile.
			// This creates widening around existing corridors and rooms.
			if (passableNeighbors >= 1) {
				candidates.push({ x, z, zone: zone as "coast" | "campus" | "enemy" });
			}
		}
	}

	// Convert candidates based on zone wall density
	for (const c of candidates) {
		const profile = ZONE_PROFILES[c.zone];
		// wallDensity=1.0 means keep all walls; wallDensity=0.4 means remove 60%
		if (rng() >= profile.wallDensity) {
			const tile = tiles[c.z]![c.x]!;
			tile.floorType = profile.floorTypes[
				(c.x * 7 + c.z * 13) % profile.floorTypes.length
			]! as FloorType;
			tile.passable = true;
			tile.elevation = 0;
			tile.zone = c.zone;
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
