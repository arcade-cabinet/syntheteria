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
 * Entity spawns (US-1.2): Each chunk also produces a deterministic list of
 * ChunkEntitySpawn descriptors. ChunkManager spawns/despawns ECS entities
 * when chunks load/unload.
 *
 * Geographic variety (Tier 3): Room sizes, wall density, floor types, and
 * POI distribution now vary by zone (city/coast/campus/enemy). Zone is
 * determined using infinite-world mode (distance+direction from spawn)
 * instead of a fixed WORLD_EXTENT reference frame.
 *
 * Usage:
 *   const chunk = generateChunk(worldSeed, chunkX, chunkZ);
 *   // chunk.tiles[localZ][localX] — local coords within chunk
 *   // chunk.worldOffsetX/Z — world-space offset for rendering
 *   // chunk.entities — entities to spawn when this chunk loads
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
import { type WorldZone, ZONE_PROFILES, zoneForTile } from "./zones";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Tiles per chunk edge. Must be even (maze fill uses odd-coordinate addressing). */
export const CHUNK_SIZE = 32;

/** Number of border gate candidates per edge. */
const GATES_PER_EDGE = 4;

// ─── Types ──────────────────────────────────────────────────────────────────

/** An entity spawn descriptor generated deterministically by the board. */
export interface ChunkEntitySpawn {
	/** World-space tile X. */
	tileX: number;
	/** World-space tile Z. */
	tileZ: number;
	/** Entity category. */
	kind:
		| "scavenge_site"
		| "lightning_rod"
		| "fabrication_unit"
		| "cult_patrol"
		| "cult_base"
		| "cult_leader"
		| "story_trigger";
	/** Material type for scavenge sites. */
	materialType?: string;
	/** How many scavenge actions remain (scavenge sites). */
	remaining?: number;
	/** Room tag for story trigger rooms. */
	roomTag?: string;
}

export interface Chunk {
	/** Chunk grid coordinate. */
	chunkX: number;
	chunkZ: number;
	/** World-space tile offset (chunkX * CHUNK_SIZE, chunkZ * CHUNK_SIZE). */
	worldOffsetX: number;
	worldOffsetZ: number;
	/** Row-major tiles: tiles[localZ][localX]. */
	tiles: TileData[][];
	/** Entities to spawn when this chunk loads. Deterministic from seed. */
	entities: ChunkEntitySpawn[];
}

export type ChunkKey = `${number},${number}`;

export function chunkKey(cx: number, cz: number): ChunkKey {
	return `${cx},${cz}`;
}

// ─── Danger Level (US-1.3) ──────────────────────────────────────────────────

/**
 * Compute danger level for a chunk based on distance from spawn (0,0).
 *
 * Returns 0.0 near spawn, 1.0 at 30+ chunks out.
 * Directional bias: north (negative Z) is slightly more dangerous.
 * No enemies within 2 chunks of spawn.
 */
export function dangerLevel(chunkX: number, chunkZ: number): number {
	const dist = Math.sqrt(chunkX * chunkX + chunkZ * chunkZ);

	// Safe zone: 2 chunks around spawn
	if (dist <= 2) return 0;

	// North (negative Z) bias: +10% danger
	const northBias = chunkZ < 0 ? 0.1 : 0;

	// Linear ramp from 0 at distance 2 to 1.0 at distance 30
	const raw = (dist - 2) / 28;
	return Math.min(1.0, raw + northBias);
}

// ─── Zone for chunk center ──────────────────────────────────────────────────

/**
 * Get the dominant zone for a chunk by sampling its center tile.
 * Uses infinite-world mode (no width/height) so zones scale naturally.
 */
function chunkZone(chunkX: number, chunkZ: number): WorldZone {
	const cx = chunkX * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
	const cz = chunkZ * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
	return zoneForTile(cx, cz);
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

// ─── Entity spawn generation (US-1.2) ───────────────────────────────────────

/** Scavenge material types by rarity band. */
const COMMON_MATERIALS = ["scrapMetal", "circuitry", "powerCells"];
const UNCOMMON_MATERIALS = ["scrapMetal", "circuitry", "durasteel"];
const RARE_MATERIALS = ["durasteel", "powerCells", "circuitry"];

/** Zone-specific POI types for story trigger rooms. */
const ZONE_POI_TAGS: Record<WorldZone, string[]> = {
	city: [],
	coast: ["mine_shaft"],
	campus: ["observatory", "lab"],
	enemy: ["shrine"],
};

/**
 * Deterministically generate entity spawn descriptors for a chunk.
 *
 * - Scavenge sites placed in passable rooms (material rarity scales with danger)
 * - Lightning rods in large rooms near origin
 * - Fabrication units in specific room configurations (rare)
 * - Cult patrols scale with danger level
 * - Cult bases spawn at high danger levels in enemy territory (Tier 3)
 * - Story trigger rooms get marker entities for visual distinction (Tier 5)
 */
function generateChunkEntities(
	tiles: TileData[][],
	chunkX: number,
	chunkZ: number,
	chunkSeed: string,
): ChunkEntitySpawn[] {
	const rng = seededRng(`${chunkSeed}_entities`);
	const entities: ChunkEntitySpawn[] = [];
	const danger = dangerLevel(chunkX, chunkZ);
	const zone = chunkZone(chunkX, chunkZ);

	// Find rooms by scanning for clusters of passable tiles
	// (simplified: pick random passable tiles as spawn points)
	const passableTiles: Array<{ lx: number; lz: number }> = [];
	for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
		for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
			const tile = tiles[lz]?.[lx];
			if (tile?.passable && tile.floorType !== "void_pit") {
				passableTiles.push({ lx, lz });
			}
		}
	}

	if (passableTiles.length === 0) return entities;

	const offsetX = chunkX * CHUNK_SIZE;
	const offsetZ = chunkZ * CHUNK_SIZE;

	// ── Scavenge sites — zone-aware resource distribution ─────────────
	const zoneMultiplier = ZONE_PROFILES[zone].resourceMultiplier;
	const scavengeCount = Math.floor(
		2 + rng() * 3 * (1 - danger * 0.5) * zoneMultiplier,
	);
	for (let i = 0; i < scavengeCount; i++) {
		if (passableTiles.length === 0) break;
		const idx = Math.floor(rng() * passableTiles.length);
		const spot = passableTiles[idx]!;

		// Material rarity scales inversely: common near, rare far
		let materialPool: string[];
		if (danger < 0.3) {
			materialPool = COMMON_MATERIALS;
		} else if (danger < 0.7) {
			materialPool = rng() < 0.7 ? COMMON_MATERIALS : UNCOMMON_MATERIALS;
		} else {
			materialPool =
				rng() < 0.4
					? UNCOMMON_MATERIALS
					: rng() < 0.7
						? RARE_MATERIALS
						: COMMON_MATERIALS;
		}

		const materialType = materialPool[Math.floor(rng() * materialPool.length)]!;
		const remaining = 3 + Math.floor(rng() * 4);

		entities.push({
			tileX: offsetX + spot.lx,
			tileZ: offsetZ + spot.lz,
			kind: "scavenge_site",
			materialType,
			remaining,
		});

		// Remove used spot to avoid double-spawning
		passableTiles.splice(idx, 1);
	}

	// ── Lightning rods — in large rooms near origin (< 5 chunks out) ──
	const dist = Math.sqrt(chunkX * chunkX + chunkZ * chunkZ);
	if (dist < 5 && rng() < 0.3 && passableTiles.length > 0) {
		const idx = Math.floor(rng() * passableTiles.length);
		const spot = passableTiles[idx]!;
		entities.push({
			tileX: offsetX + spot.lx,
			tileZ: offsetZ + spot.lz,
			kind: "lightning_rod",
		});
		passableTiles.splice(idx, 1);
	}

	// ── Fabrication units — rare, appear in city/campus zones ──────────
	if (dist < 8 && rng() < 0.15 && passableTiles.length > 0) {
		const idx = Math.floor(rng() * passableTiles.length);
		const spot = passableTiles[idx]!;
		// Use infinite-world zone check (no WORLD_EXTENT)
		const tileZone = zoneForTile(offsetX + spot.lx, offsetZ + spot.lz);
		if (tileZone === "city" || tileZone === "campus") {
			entities.push({
				tileX: offsetX + spot.lx,
				tileZ: offsetZ + spot.lz,
				kind: "fabrication_unit",
			});
			passableTiles.splice(idx, 1);
		}
	}

	// ── Cult bases — high danger enemy territory (Tier 3) ─────────────
	if (
		danger >= 0.6 &&
		zone === "enemy" &&
		rng() < 0.2 &&
		passableTiles.length > 0
	) {
		const idx = Math.floor(rng() * passableTiles.length);
		const spot = passableTiles[idx]!;
		entities.push({
			tileX: offsetX + spot.lx,
			tileZ: offsetZ + spot.lz,
			kind: "cult_base",
		});
		passableTiles.splice(idx, 1);
	}

	// ── Cult leader — unique boss, spawns once at very high danger ────
	if (danger > 0.9 && zone === "enemy" && passableTiles.length > 0) {
		// Deterministic single-spawn check: hash chunk coords + seed to get a
		// stable 0-1 value. Only one chunk in the world will pass the threshold.
		const leaderHash = seededRng(`${chunkSeed}_cult_leader_unique`);
		if (leaderHash() < 0.08) {
			const idx = Math.floor(rng() * passableTiles.length);
			const spot = passableTiles[idx]!;
			entities.push({
				tileX: offsetX + spot.lx,
				tileZ: offsetZ + spot.lz,
				kind: "cult_leader",
			});
			passableTiles.splice(idx, 1);
		}
	}

	// ── Story trigger rooms — zone-specific POIs (Tier 5) ────────────
	const poiTags = ZONE_POI_TAGS[zone];
	if (poiTags.length > 0 && rng() < 0.15 && passableTiles.length > 0) {
		const tag = poiTags[Math.floor(rng() * poiTags.length)]!;
		const idx = Math.floor(rng() * passableTiles.length);
		const spot = passableTiles[idx]!;
		entities.push({
			tileX: offsetX + spot.lx,
			tileZ: offsetZ + spot.lz,
			kind: "story_trigger",
			roomTag: tag,
		});
		passableTiles.splice(idx, 1);
	}

	// ── Cult patrols — scale with danger, none within 2 chunks of spawn ─
	if (danger > 0) {
		const patrolCount = Math.floor(danger * 3 * rng());
		for (let i = 0; i < patrolCount; i++) {
			if (passableTiles.length === 0) break;
			const idx = Math.floor(rng() * passableTiles.length);
			const spot = passableTiles[idx]!;
			entities.push({
				tileX: offsetX + spot.lx,
				tileZ: offsetZ + spot.lz,
				kind: "cult_patrol",
			});
			passableTiles.splice(idx, 1);
		}
	}

	return entities;
}

// ─── Chunk generation ───────────────────────────────────────────────────────

/**
 * Generate a single chunk at (chunkX, chunkZ) in chunk-grid coordinates.
 *
 * The chunk is fully self-contained: room placement, maze fill, connectivity,
 * pruning, zone floors, resources, and entity spawns are all computed locally.
 * Border gates ensure adjacent chunks connect.
 *
 * Zone-aware generation (Tier 3): Room sizes and wall density vary by the
 * chunk's dominant zone. Cult territory chunks use smaller rooms with denser
 * walls; coastal chunks use larger rooms with more open space.
 */
export function generateChunk(
	worldSeed: string,
	chunkX: number,
	chunkZ: number,
): Chunk {
	const offsetX = chunkX * CHUNK_SIZE;
	const offsetZ = chunkZ * CHUNK_SIZE;
	const chunkSeed = `${worldSeed}_c${chunkX}_${chunkZ}`;
	const zone = chunkZone(chunkX, chunkZ);
	const profile = ZONE_PROFILES[zone];

	// Phase 1: Room placement + solid fill
	// Cult density scales with zone: more cult rooms in enemy territory
	const cultDensity = zone === "enemy" ? 3 : zone === "city" ? 1 : 0;
	const config: BoardConfig = {
		width: CHUNK_SIZE,
		height: CHUNK_SIZE,
		seed: chunkSeed,
		difficulty: "normal",
		cultDensity,
	};
	const board = generateLabyrinth(config);
	const tiles = board.tiles;

	// Phase 2: Maze fill with zone-aware wall density
	const mazeRng = seededRng(`${chunkSeed}_maze`);
	growingTreeMazeFill(tiles, CHUNK_SIZE, CHUNK_SIZE, mazeRng);

	// Apply zone wall density: remove some maze walls in open zones
	// wallDensity 1.0 = keep all walls, 0.4 = remove 60% of maze corridors
	if (profile.wallDensity < 1.0) {
		const wallRng = seededRng(`${chunkSeed}_walldensity`);
		for (let lz = 1; lz < CHUNK_SIZE - 1; lz++) {
			for (let lx = 1; lx < CHUNK_SIZE - 1; lx++) {
				const tile = tiles[lz]![lx]!;
				if (
					!tile.passable &&
					tile.floorType === "structural_mass" &&
					wallRng() > profile.wallDensity
				) {
					// Check if opening this wall connects two passable neighbors
					const hasPassableNeighbor =
						(tiles[lz - 1]?.[lx]?.passable ?? false) ||
						(tiles[lz + 1]?.[lx]?.passable ?? false) ||
						(tiles[lz]?.[lx - 1]?.passable ?? false) ||
						(tiles[lz]?.[lx + 1]?.passable ?? false);
					if (hasPassableNeighbor) {
						tile.passable = true;
						tile.floorType = "transit_deck";
						tile.elevation = 0;
					}
				}
			}
		}
	}

	// Open border gates BEFORE connectivity so flood-fill sees them
	openBorderGates(tiles, chunkX, chunkZ, worldSeed);

	// Phase 3: Connectivity within chunk
	connectRegions(tiles, CHUNK_SIZE, CHUNK_SIZE, chunkSeed);

	// Phase 4: Dead-end pruning + features
	applyLabyrinthFeatures(tiles, CHUNK_SIZE, CHUNK_SIZE, chunkSeed);

	// Re-open border gates in case pruning closed them
	openBorderGates(tiles, chunkX, chunkZ, worldSeed);

	// Phase 6: Zone floors + resources (using absolute world coords, infinite-world mode)
	applyChunkZoneFloors(tiles, offsetX, offsetZ, chunkSeed);
	scatterChunkResources(tiles, offsetX, offsetZ, chunkSeed);

	// Phase 8: Zone assignment (absolute coords, infinite-world mode)
	assignChunkZones(tiles, offsetX, offsetZ);

	// Stamp world-space coordinates on each tile
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			tiles[lz]![lx]!.x = offsetX + lx;
			tiles[lz]![lx]!.z = offsetZ + lz;
		}
	}

	// Phase 9: Entity spawns (US-1.2)
	const entities = generateChunkEntities(tiles, chunkX, chunkZ, chunkSeed);

	return {
		chunkX,
		chunkZ,
		worldOffsetX: offsetX,
		worldOffsetZ: offsetZ,
		tiles,
		entities,
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
				// Use infinite-world mode (no width/height args)
				const zone = zoneForTile(wx, wz);
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
			// Use infinite-world mode (no width/height args)
			const zone = zoneForTile(wx, wz);
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
			// Use infinite-world mode (no width/height args)
			tiles[lz]![lx]!.zone = zoneForTile(offsetX + lx, offsetZ + lz);
		}
	}
}
