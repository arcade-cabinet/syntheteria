/**
 * Labyrinth generator — Rooms-and-Mazes algorithm (Bob Nystrom).
 *
 * Phase 1: Room placement.
 *   - Start with ALL tiles as structural_mass (solid walls).
 *   - Carve rooms: faction starts (6x6-8x8) at corner positions,
 *     cult POI rooms (4x4) in dust/abandoned areas, scatter rooms (3x3-6x6).
 *   - ALL random decisions via seededRng. Same seed = identical output.
 *   - Rooms are disconnected at this point — Phase 2 fills corridors.
 *
 * Reference: journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/
 */

import { FACTION_DEFINITIONS } from "../factions";
import type { FloorType } from "../terrain";
import { seededRng } from "./noise";
import type { BoardConfig, Elevation, GeneratedBoard, TileData } from "./types";

// ─── Room Types ──────────────────────────────────────────────────────────────

export interface Room {
	x: number;
	z: number;
	w: number;
	h: number;
	kind: "faction_start" | "cult_poi" | "scatter";
	/** Faction ID or cult sect for themed rooms. */
	tag: string | null;
	/** Floor type for room interior. */
	floorType: FloorType;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum wall gap between any two rooms. */
const MIN_ROOM_SPACING = 2;

/** Faction start rooms: 6x6 to 8x8. */
const FACTION_MIN = 6;
const FACTION_MAX = 8;

/** Cult POI rooms: 4x4 fixed. */
const CULT_SIZE = 4;

/** Scatter rooms: 3x3 to 6x6. */
const SCATTER_MIN = 3;
const SCATTER_MAX = 6;

/** Room count scales with board area. ~15 for 44x44, ~25 for 64x64, ~40 for 96x96. */
function targetRoomCount(width: number, height: number): number {
	const area = width * height;
	// ~15 for 1936 (44^2), ~25 for 4096 (64^2), ~40 for 9216 (96^2)
	return Math.round(8 + (area / 9216) * 32);
}

/** Max placement attempts per room before giving up. */
const MAX_PLACEMENT_ATTEMPTS = 200;

/** Terrain affinity → interior floor type. */
const AFFINITY_FLOOR: Record<string, FloorType> = {
	collapsed_zone: "collapsed_zone",
	aerostructure: "aerostructure",
	bio_district: "bio_district",
	structural_mass: "durasteel_span", // Iron Creed: fortified interior
	dust_district: "dust_district",
};

/** Start zone → corner position (as fraction of board). */
function startZonePosition(
	zone: string,
	width: number,
	height: number,
): { cx: number; cz: number } {
	// Place faction starts at ~15% inset from edges (not right at corner)
	const insetX = Math.floor(width * 0.15);
	const insetZ = Math.floor(height * 0.15);
	switch (zone) {
		case "corner_nw":
			return { cx: insetX, cz: insetZ };
		case "corner_ne":
			return { cx: width - insetX, cz: insetZ };
		case "corner_se":
			return { cx: width - insetX, cz: height - insetZ };
		case "corner_sw":
			return { cx: insetX, cz: height - insetZ };
		case "center":
		default:
			return { cx: Math.floor(width / 2), cz: Math.floor(height / 2) };
	}
}

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
		// Expand other by MIN_ROOM_SPACING on all sides for gap check
		const ox1 = other.x - MIN_ROOM_SPACING;
		const oz1 = other.z - MIN_ROOM_SPACING;
		const ox2 = other.x + other.w + MIN_ROOM_SPACING;
		const oz2 = other.z + other.h + MIN_ROOM_SPACING;

		// AABB overlap test
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
	rng: () => number,
): { x: number; z: number } | null {
	// Try placing centered on target first
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

	// Spiral outward from target
	for (let radius = 1; radius < Math.max(width, height) / 2; radius++) {
		// Try positions at this radius in deterministic order
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dx = -radius; dx <= radius; dx++) {
				// Only positions on the ring (not interior)
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
		// Random position, ensuring room fits with 1-tile border
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
	const rng = seededRng(seed + "_labyrinth");

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

	const rooms: Room[] = [];

	// ── Place player start room at center ─────────────────────────────────
	const playerSize =
		FACTION_MIN + Math.floor(rng() * (FACTION_MAX - FACTION_MIN + 1));
	const playerPos = placeRoomNear(
		Math.floor(width / 2),
		Math.floor(height / 2),
		playerSize,
		playerSize,
		rooms,
		width,
		height,
		rng,
	);
	if (playerPos) {
		rooms.push({
			x: playerPos.x,
			z: playerPos.z,
			w: playerSize,
			h: playerSize,
			kind: "faction_start",
			tag: "player",
			floorType: "durasteel_span",
		});
	}

	// ── Place AI faction start rooms at corners ───────────────────────────
	for (let i = 0; i < FACTION_DEFINITIONS.length; i++) {
		const faction = FACTION_DEFINITIONS[i]!;
		const size =
			FACTION_MIN + Math.floor(rng() * (FACTION_MAX - FACTION_MIN + 1));
		const { cx, cz } = startZonePosition(faction.startZone, width, height);
		const floorType =
			AFFINITY_FLOOR[faction.terrainAffinity] ?? "durasteel_span";

		const pos = placeRoomNear(cx, cz, size, size, rooms, width, height, rng);
		if (pos) {
			rooms.push({
				x: pos.x,
				z: pos.z,
				w: size,
				h: size,
				kind: "faction_start",
				tag: faction.id,
				floorType,
			});
		}
	}

	// ── Place cult POI rooms (3 sects × 1 room each) ─────────────────────
	// Cults spawn in dust/abandoned areas — place them away from faction starts
	const cultFloors: FloorType[] = [
		"dust_district",
		"collapsed_zone",
		"dust_district",
	];
	for (let i = 0; i < 3; i++) {
		const pos = placeRoomRandom(
			CULT_SIZE,
			CULT_SIZE,
			rooms,
			width,
			height,
			rng,
		);
		if (pos) {
			rooms.push({
				x: pos.x,
				z: pos.z,
				w: CULT_SIZE,
				h: CULT_SIZE,
				kind: "cult_poi",
				tag: ["static_remnants", "null_monks", "lost_signal"][i]!,
				floorType: cultFloors[i]!,
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
		if (!pos) break; // Board is full — stop trying

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
): Room[] {
	const rng = seededRng(seed + "_labyrinth");
	const rooms: Room[] = [];

	// Player start
	const playerSize =
		FACTION_MIN + Math.floor(rng() * (FACTION_MAX - FACTION_MIN + 1));
	const playerPos = placeRoomNear(
		Math.floor(width / 2),
		Math.floor(height / 2),
		playerSize,
		playerSize,
		rooms,
		width,
		height,
		rng,
	);
	if (playerPos) {
		rooms.push({
			x: playerPos.x,
			z: playerPos.z,
			w: playerSize,
			h: playerSize,
			kind: "faction_start",
			tag: "player",
			floorType: "durasteel_span",
		});
	}

	// AI faction starts
	for (let i = 0; i < FACTION_DEFINITIONS.length; i++) {
		const faction = FACTION_DEFINITIONS[i]!;
		const size =
			FACTION_MIN + Math.floor(rng() * (FACTION_MAX - FACTION_MIN + 1));
		const { cx, cz } = startZonePosition(faction.startZone, width, height);
		const floorType =
			AFFINITY_FLOOR[faction.terrainAffinity] ?? "durasteel_span";

		const pos = placeRoomNear(cx, cz, size, size, rooms, width, height, rng);
		if (pos) {
			rooms.push({
				x: pos.x,
				z: pos.z,
				w: size,
				h: size,
				kind: "faction_start",
				tag: faction.id,
				floorType,
			});
		}
	}

	// Cult POIs
	const cultFloors: FloorType[] = [
		"dust_district",
		"collapsed_zone",
		"dust_district",
	];
	for (let i = 0; i < 3; i++) {
		const pos = placeRoomRandom(
			CULT_SIZE,
			CULT_SIZE,
			rooms,
			width,
			height,
			rng,
		);
		if (pos) {
			rooms.push({
				x: pos.x,
				z: pos.z,
				w: CULT_SIZE,
				h: CULT_SIZE,
				kind: "cult_poi",
				tag: ["static_remnants", "null_monks", "lost_signal"][i]!,
				floorType: cultFloors[i]!,
			});
		}
	}

	// Scatter
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
