/**
 * Labyrinth generator — Rooms-and-Mazes algorithm (Bob Nystrom).
 *
 * Phase 1: Room placement (single-player RTS variant).
 *   - Start with ALL tiles as structural_mass (solid walls).
 *   - Carve rooms: ONE player start (6x6-8x8) near center-south,
 *     cult POI rooms (shrine/workshop/antenna, 4x4-5x5) in northern half,
 *     scatter rooms (3x3-6x6) everywhere.
 *   - ALL random decisions via seededRng. Same seed = identical output.
 *   - Rooms are disconnected at this point — Phase 2 fills corridors.
 *
 * Reference: journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/
 */

import { seededRng } from "./noise";
import type {
	BoardConfig,
	Elevation,
	FloorType,
	GeneratedBoard,
	TileData,
} from "./types";

// ─── Cult POI Definitions ───────────────────────────────────────────────────

export type CultPoiType = "shrine" | "workshop" | "antenna";

interface CultPoiDef {
	type: CultPoiType;
	floorType: FloorType;
	minSize: number;
	maxSize: number;
}

const CULT_POI_DEFS: readonly CultPoiDef[] = [
	{ type: "shrine", floorType: "dust_district", minSize: 4, maxSize: 5 },
	{ type: "workshop", floorType: "collapsed_zone", minSize: 4, maxSize: 5 },
	{ type: "antenna", floorType: "aerostructure", minSize: 4, maxSize: 4 },
];

// ─── Room Types ──────────────────────────────────────────────────────────────

export interface Room {
	x: number;
	z: number;
	w: number;
	h: number;
	kind: "player_start" | "cult_poi" | "scatter";
	/** Cult POI type or null for non-cult rooms. */
	tag: string | null;
	/** Floor type for room interior. */
	floorType: FloorType;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum wall gap between any two rooms. */
const MIN_ROOM_SPACING = 2;

/** Player start rooms: 6x6 to 8x8. */
const PLAYER_START_MIN = 6;
const PLAYER_START_MAX = 8;

/** Scatter rooms: 3x3 to 6x6. */
const SCATTER_MIN = 3;
const SCATTER_MAX = 6;

/** Default number of cult POI rooms when cultDensity is not specified. */
const DEFAULT_CULT_DENSITY = 6;

/** Room count scales with board area. ~15 for 44x44, ~25 for 64x64, ~40 for 96x96. */
function targetRoomCount(width: number, height: number): number {
	const area = width * height;
	return Math.round(8 + (area / 9216) * 32);
}

/** Max placement attempts per room before giving up. */
const MAX_PLACEMENT_ATTEMPTS = 200;

// ─── Room Placement ──────────────────────────────────────────────────────────

/**
 * Check if a room can be placed without overlapping existing rooms
 * or going out of bounds. Enforces MIN_ROOM_SPACING gap.
 */
function canPlaceRoom(
	room: { x: number; z: number; w: number; h: number },
	existingRooms: Room[],
	width: number,
	height: number,
): boolean {
	// Bounds check: rooms must be fully inside the board with 1-tile border
	if (room.x < 1 || room.z < 1) return false;
	if (room.x + room.w >= width - 1) return false;
	if (room.z + room.h >= height - 1) return false;

	// Overlap + spacing check against all existing rooms
	for (let i = 0; i < existingRooms.length; i++) {
		const other = existingRooms[i]!;
		const ox1 = other.x - MIN_ROOM_SPACING;
		const oz1 = other.z - MIN_ROOM_SPACING;
		const ox2 = other.x + other.w + MIN_ROOM_SPACING;
		const oz2 = other.z + other.h + MIN_ROOM_SPACING;

		if (
			room.x < ox2 &&
			room.x + room.w > ox1 &&
			room.z < oz2 &&
			room.z + room.h > oz1
		) {
			return false;
		}
	}

	return true;
}

/**
 * Place a room near a target position. Tries the exact position first,
 * then spirals outward.
 */
function placeRoomNear(
	targetX: number,
	targetZ: number,
	roomW: number,
	roomH: number,
	existingRooms: Room[],
	width: number,
	height: number,
): { x: number; z: number } | null {
	const startX = targetX - Math.floor(roomW / 2);
	const startZ = targetZ - Math.floor(roomH / 2);

	if (
		canPlaceRoom(
			{ x: startX, z: startZ, w: roomW, h: roomH },
			existingRooms,
			width,
			height,
		)
	) {
		return { x: startX, z: startZ };
	}

	for (let radius = 1; radius < Math.max(width, height) / 2; radius++) {
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;

				const x = startX + dx;
				const z = startZ + dz;
				if (
					canPlaceRoom(
						{ x, z, w: roomW, h: roomH },
						existingRooms,
						width,
						height,
					)
				) {
					return { x, z };
				}
			}
		}
	}

	return null;
}

/**
 * Place a room in the northern half of the board (z < height * 0.55).
 * Cult POI rooms are concentrated here — the cult stronghold is in the north.
 */
function placeRoomInNorthernHalf(
	roomW: number,
	roomH: number,
	existingRooms: Room[],
	width: number,
	height: number,
	rng: () => number,
): { x: number; z: number } | null {
	const northBound = Math.floor(height * 0.55);
	const zRange = Math.max(1, northBound - roomH - 2);

	for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
		const x = 1 + Math.floor(rng() * (width - roomW - 2));
		const z = 1 + Math.floor(rng() * zRange);

		if (
			canPlaceRoom({ x, z, w: roomW, h: roomH }, existingRooms, width, height)
		) {
			return { x, z };
		}
	}
	return null;
}

/**
 * Place a room at a random position within the board.
 */
function placeRoomRandom(
	roomW: number,
	roomH: number,
	existingRooms: Room[],
	width: number,
	height: number,
	rng: () => number,
): { x: number; z: number } | null {
	for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
		const x = 1 + Math.floor(rng() * (width - roomW - 2));
		const z = 1 + Math.floor(rng() * (height - roomH - 2));

		if (
			canPlaceRoom({ x, z, w: roomW, h: roomH }, existingRooms, width, height)
		) {
			return { x, z };
		}
	}
	return null;
}

// ─── Core Room Generation ────────────────────────────────────────────────────

/**
 * Generate the room list for a single-player labyrinth.
 * Shared by both generateLabyrinth() and generateRooms().
 */
function generateRoomList(
	width: number,
	height: number,
	seed: string,
	cultDensity: number,
): Room[] {
	const rng = seededRng(`${seed}_labyrinth`);
	const rooms: Room[] = [];

	// ── Player start near center-south ─────────────────────────────────
	const playerSize =
		PLAYER_START_MIN +
		Math.floor(rng() * (PLAYER_START_MAX - PLAYER_START_MIN + 1));
	const playerPos = placeRoomNear(
		Math.floor(width / 2),
		Math.floor(height * 0.65),
		playerSize,
		playerSize,
		rooms,
		width,
		height,
	);
	if (playerPos) {
		rooms.push({
			x: playerPos.x,
			z: playerPos.z,
			w: playerSize,
			h: playerSize,
			kind: "player_start",
			tag: "player",
			floorType: "durasteel_span",
		});
	}

	// ── Cult POI rooms — concentrated in northern half ─────────────────
	for (let i = 0; i < cultDensity; i++) {
		const def = CULT_POI_DEFS[i % CULT_POI_DEFS.length]!;
		const size =
			def.minSize + Math.floor(rng() * (def.maxSize - def.minSize + 1));

		const pos = placeRoomInNorthernHalf(size, size, rooms, width, height, rng);
		if (pos) {
			rooms.push({
				x: pos.x,
				z: pos.z,
				w: size,
				h: size,
				kind: "cult_poi",
				tag: def.type,
				floorType: def.floorType,
			});
		}
	}

	// ── Scatter additional rooms ─────────────────────────────────────────
	const target = targetRoomCount(width, height);
	const scatterFloors: FloorType[] = [
		"durasteel_span",
		"transit_deck",
		"collapsed_zone",
		"dust_district",
		"bio_district",
		"aerostructure",
	];

	while (rooms.length < target) {
		const w = SCATTER_MIN + Math.floor(rng() * (SCATTER_MAX - SCATTER_MIN + 1));
		const h = SCATTER_MIN + Math.floor(rng() * (SCATTER_MAX - SCATTER_MIN + 1));
		const floorType = scatterFloors[Math.floor(rng() * scatterFloors.length)]!;

		const pos = placeRoomRandom(w, h, rooms, width, height, rng);
		if (!pos) break;

		rooms.push({
			x: pos.x,
			z: pos.z,
			w,
			h,
			kind: "scatter",
			tag: null,
			floorType,
		});
	}

	return rooms;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate the labyrinth Phase 1: rooms carved from solid walls.
 *
 * Returns a GeneratedBoard where:
 * - Room interiors are passable floor types
 * - Everything else is structural_mass (walls)
 * - Rooms are NOT connected (Phase 2 adds maze corridors)
 */
export function generateLabyrinth(config: BoardConfig): GeneratedBoard {
	const { width, height, seed } = config;
	const cultDensity = config.cultDensity ?? DEFAULT_CULT_DENSITY;

	// ── Initialize all tiles as structural_mass (solid walls) ─────────────
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				z,
				elevation: 1 as Elevation,
				passable: false,
				floorType: "structural_mass",
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}

	const rooms = generateRoomList(width, height, seed, cultDensity);

	// ── Carve rooms into the tile grid ────────────────────────────────────
	for (let i = 0; i < rooms.length; i++) {
		const room = rooms[i]!;
		for (let rz = room.z; rz < room.z + room.h; rz++) {
			for (let rx = room.x; rx < room.x + room.w; rx++) {
				if (rx < 0 || rx >= width || rz < 0 || rz >= height) continue;
				const tile = tiles[rz]![rx]!;
				tile.floorType = room.floorType;
				tile.elevation = 0;
				tile.passable = true;
			}
		}
	}

	return { config, tiles };
}

/**
 * Get the rooms generated for a board. Useful for Phase 2+ and tests.
 * Deterministic: same seed = same rooms.
 */
export function generateRooms(
	width: number,
	height: number,
	seed: string,
	cultDensity = DEFAULT_CULT_DENSITY,
): Room[] {
	return generateRoomList(width, height, seed, cultDensity);
}
