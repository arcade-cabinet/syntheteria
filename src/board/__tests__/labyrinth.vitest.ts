/**
 * Labyrinth Phase 1 — Room placement tests.
 *
 * Tests determinism, room coverage, spacing invariants,
 * faction/cult placement, and scaling behavior.
 */

import { describe, expect, it } from "vitest";
import { generateLabyrinth, generateRooms, type Room } from "../labyrinth";
import type { BoardConfig, TileData } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(
	width: number,
	height: number,
	seed = "test-seed",
): BoardConfig {
	return {
		width,
		height,
		seed,
		difficulty: "normal",
	};
}

/** Count tiles matching a predicate. */
function _countTiles(
	tiles: TileData[][],
	pred: (t: TileData) => boolean,
): number {
	let count = 0;
	for (const row of tiles) {
		for (const tile of row) {
			if (pred(tile)) count++;
		}
	}
	return count;
}

/** Manhattan distance between two rooms' closest edges. */
function roomGap(a: Room, b: Room): number {
	// Horizontal gap
	const hGap = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
	// Vertical gap
	const vGap = Math.max(0, Math.max(a.z, b.z) - Math.min(a.z + a.h, b.z + b.h));
	return hGap + vGap;
}

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("determinism", () => {
	it("same seed produces identical rooms", () => {
		const rooms1 = generateRooms(48, 48, "det-seed");
		const rooms2 = generateRooms(48, 48, "det-seed");

		expect(rooms1.length).toBe(rooms2.length);
		for (let i = 0; i < rooms1.length; i++) {
			expect(rooms1[i]).toEqual(rooms2[i]);
		}
	});

	it("same seed produces identical tile grid", () => {
		const config = makeConfig(44, 44, "det-grid");
		const board1 = generateLabyrinth(config);
		const board2 = generateLabyrinth(config);

		for (let z = 0; z < config.height; z++) {
			for (let x = 0; x < config.width; x++) {
				const t1 = board1.tiles[z]![x]!;
				const t2 = board2.tiles[z]![x]!;
				expect(t1.floorType).toBe(t2.floorType);
				expect(t1.passable).toBe(t2.passable);
				expect(t1.elevation).toBe(t2.elevation);
			}
		}
	});

	it("different seeds produce different rooms", () => {
		const rooms1 = generateRooms(48, 48, "seed-A");
		const rooms2 = generateRooms(48, 48, "seed-B");

		// At least one room should differ in position
		let anyDiff = false;
		const len = Math.min(rooms1.length, rooms2.length);
		for (let i = 0; i < len; i++) {
			if (rooms1[i]!.x !== rooms2[i]!.x || rooms1[i]!.z !== rooms2[i]!.z) {
				anyDiff = true;
				break;
			}
		}
		expect(anyDiff).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Room placement: faction starts
// ---------------------------------------------------------------------------

describe("faction start rooms", () => {
	it("places a player start room", () => {
		const rooms = generateRooms(48, 48, "faction-test");
		const player = rooms.find((r) => r.tag === "player");
		expect(player).toBeDefined();
		expect(player!.kind).toBe("faction_start");
	});

	it("player start is near board center", () => {
		const w = 48;
		const h = 48;
		const rooms = generateRooms(w, h, "player-center");
		const player = rooms.find((r) => r.tag === "player")!;

		// Room center should be within 25% of board center
		const roomCx = player.x + player.w / 2;
		const roomCz = player.z + player.h / 2;
		const boardCx = w / 2;
		const boardCz = h / 2;

		expect(Math.abs(roomCx - boardCx)).toBeLessThan(w * 0.25);
		expect(Math.abs(roomCz - boardCz)).toBeLessThan(h * 0.25);
	});

	// TODO(P1-2): Rewrite for single-player — dropped 4 competing AI factions
	it.skip("places all 4 AI faction start rooms", () => {
		// Requires FACTION_DEFINITIONS from dropped factions module
	});

	it("faction start rooms are 6x6 to 8x8", () => {
		const rooms = generateRooms(48, 48, "faction-size");
		const factionRooms = rooms.filter((r) => r.kind === "faction_start");

		for (const room of factionRooms) {
			expect(room.w).toBeGreaterThanOrEqual(6);
			expect(room.w).toBeLessThanOrEqual(8);
			expect(room.h).toBeGreaterThanOrEqual(6);
			expect(room.h).toBeLessThanOrEqual(8);
		}
	});

	it("faction rooms use terrain-affinity floor types", () => {
		const rooms = generateRooms(48, 48, "affinity-floors");

		// Reclaimers → collapsed_zone affinity → collapsed_zone floor
		const reclaimers = rooms.find((r) => r.tag === "reclaimers");
		expect(reclaimers?.floorType).toBe("collapsed_zone");

		// Volt Collective → aerostructure affinity → aerostructure floor
		const volt = rooms.find((r) => r.tag === "volt_collective");
		expect(volt?.floorType).toBe("aerostructure");

		// Signal Choir → bio_district affinity → bio_district floor
		const signal = rooms.find((r) => r.tag === "signal_choir");
		expect(signal?.floorType).toBe("bio_district");

		// Iron Creed → structural_mass affinity → durasteel_span floor (fortified)
		const iron = rooms.find((r) => r.tag === "iron_creed");
		expect(iron?.floorType).toBe("durasteel_span");
	});
});

// ---------------------------------------------------------------------------
// Room placement: cult POIs
// ---------------------------------------------------------------------------

describe("cult POI rooms", () => {
	it("places 3 cult POI rooms", () => {
		const rooms = generateRooms(48, 48, "cult-test");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");
		expect(cultRooms.length).toBe(3);
	});

	it("cult rooms are 4x4", () => {
		const rooms = generateRooms(48, 48, "cult-size");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");

		for (const room of cultRooms) {
			expect(room.w).toBe(4);
			expect(room.h).toBe(4);
		}
	});

	it("cult rooms have correct tags", () => {
		const rooms = generateRooms(48, 48, "cult-tags");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");

		const tags = cultRooms.map((r) => r.tag).sort();
		expect(tags).toEqual(["lost_signal", "null_monks", "static_remnants"]);
	});
});

// ---------------------------------------------------------------------------
// Room spacing
// ---------------------------------------------------------------------------

describe("room spacing", () => {
	it("all rooms have at least 2-tile gap between them", () => {
		const rooms = generateRooms(48, 48, "spacing-test");

		for (let i = 0; i < rooms.length; i++) {
			for (let j = i + 1; j < rooms.length; j++) {
				const gap = roomGap(rooms[i]!, rooms[j]!);
				expect(
					gap,
					`rooms ${i} (${rooms[i]!.tag}) and ${j} (${rooms[j]!.tag}) gap=${gap}`,
				).toBeGreaterThanOrEqual(2);
			}
		}
	});

	it("spacing holds on larger boards", () => {
		const rooms = generateRooms(64, 64, "spacing-64");

		for (let i = 0; i < rooms.length; i++) {
			for (let j = i + 1; j < rooms.length; j++) {
				const gap = roomGap(rooms[i]!, rooms[j]!);
				expect(gap).toBeGreaterThanOrEqual(2);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Room bounds
// ---------------------------------------------------------------------------

describe("room bounds", () => {
	it("all rooms are within board boundaries", () => {
		const w = 48;
		const h = 48;
		const rooms = generateRooms(w, h, "bounds-test");

		for (const room of rooms) {
			expect(room.x).toBeGreaterThanOrEqual(1);
			expect(room.z).toBeGreaterThanOrEqual(1);
			expect(room.x + room.w).toBeLessThan(w - 1);
			expect(room.z + room.h).toBeLessThan(h - 1);
		}
	});
});

// ---------------------------------------------------------------------------
// Tile grid properties
// ---------------------------------------------------------------------------

describe("tile grid", () => {
	it("non-room tiles are structural_mass", () => {
		const config = makeConfig(44, 44, "wall-test");
		const board = generateLabyrinth(config);
		const rooms = generateRooms(44, 44, "wall-test");

		// Build set of room tiles
		const roomTiles = new Set<string>();
		for (const room of rooms) {
			for (let rz = room.z; rz < room.z + room.h; rz++) {
				for (let rx = room.x; rx < room.x + room.w; rx++) {
					roomTiles.add(`${rx},${rz}`);
				}
			}
		}

		// Every non-room tile should be structural_mass
		for (let z = 0; z < config.height; z++) {
			for (let x = 0; x < config.width; x++) {
				if (!roomTiles.has(`${x},${z}`)) {
					const tile = board.tiles[z]![x]!;
					expect(tile.floorType).toBe("structural_mass");
					expect(tile.passable).toBe(false);
				}
			}
		}
	});

	it("room interior tiles are passable with correct floor type", () => {
		const config = makeConfig(44, 44, "passable-test");
		const board = generateLabyrinth(config);
		const rooms = generateRooms(44, 44, "passable-test");

		for (const room of rooms) {
			for (let rz = room.z; rz < room.z + room.h; rz++) {
				for (let rx = room.x; rx < room.x + room.w; rx++) {
					const tile = board.tiles[rz]![rx]!;
					expect(tile.passable).toBe(true);
					expect(tile.floorType).toBe(room.floorType);
					expect(tile.elevation).toBe(0);
				}
			}
		}
	});

	it("grid dimensions match config", () => {
		const config = makeConfig(44, 44);
		const board = generateLabyrinth(config);

		expect(board.tiles.length).toBe(44);
		expect(board.tiles[0]!.length).toBe(44);
	});
});

// ---------------------------------------------------------------------------
// Room count scaling
// ---------------------------------------------------------------------------

describe("room count scaling", () => {
	it("~15 rooms for 44x44 board", () => {
		const rooms = generateRooms(44, 44, "scale-44");
		// target = 8 + (1936/9216)*32 ≈ 15
		// Faction starts (5) + cults (3) + scatter rooms
		expect(rooms.length).toBeGreaterThanOrEqual(10);
		expect(rooms.length).toBeLessThanOrEqual(20);
	});

	it("~25 rooms for 64x64 board", () => {
		const rooms = generateRooms(64, 64, "scale-64");
		// target = 8 + (4096/9216)*32 ≈ 22
		expect(rooms.length).toBeGreaterThanOrEqual(15);
		expect(rooms.length).toBeLessThanOrEqual(30);
	});

	it("larger boards produce more rooms", () => {
		const small = generateRooms(44, 44, "scale-compare");
		const large = generateRooms(96, 96, "scale-compare");
		expect(large.length).toBeGreaterThan(small.length);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles minimum viable board size", () => {
		// Small board — may not fit all faction rooms
		const rooms = generateRooms(20, 20, "tiny-board");
		// Should at least get the player room
		const player = rooms.find((r) => r.tag === "player");
		expect(player).toBeDefined();
	});

	it("returns config in GeneratedBoard", () => {
		const config = makeConfig(44, 44, "config-pass");
		const board = generateLabyrinth(config);
		expect(board.config).toBe(config);
	});
});
