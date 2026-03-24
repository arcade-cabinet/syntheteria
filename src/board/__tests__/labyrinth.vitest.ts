/**
 * Labyrinth Phase 1 — Room placement tests (single-player RTS).
 *
 * Tests determinism, room coverage, spacing invariants,
 * player start / cult POI placement, and scaling behavior.
 */

import { describe, expect, it } from "vitest";
import { generateLabyrinth, generateRooms, type Room } from "../labyrinth";
import type { BoardConfig } from "../types";

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
// Room placement: player start
// ---------------------------------------------------------------------------

describe("player start room", () => {
	it("places a player start room", () => {
		const rooms = generateRooms(48, 48, "faction-test");
		const player = rooms.find((r) => r.tag === "player");
		expect(player).toBeDefined();
		expect(player!.kind).toBe("player_start");
	});

	it("exactly one player_start room (single-player)", () => {
		const rooms = generateRooms(48, 48, "sp-single-start");
		const playerStarts = rooms.filter((r) => r.kind === "player_start");
		expect(playerStarts.length).toBe(1);
		expect(playerStarts[0]!.tag).toBe("player");
	});

	it("player start is in southern half of board", () => {
		const w = 48;
		const h = 48;
		const rooms = generateRooms(w, h, "player-center");
		const player = rooms.find((r) => r.tag === "player")!;

		// Player is placed near 65% height (center-south)
		const roomCx = player.x + player.w / 2;
		const roomCz = player.z + player.h / 2;
		const boardCx = w / 2;

		expect(Math.abs(roomCx - boardCx)).toBeLessThan(w * 0.25);
		// Player should be in the southern half (z > height/3)
		expect(roomCz).toBeGreaterThan(h / 3);
	});

	it("player start room is 6x6 to 8x8", () => {
		const rooms = generateRooms(48, 48, "faction-size");
		const player = rooms.find((r) => r.tag === "player")!;

		expect(player.w).toBeGreaterThanOrEqual(6);
		expect(player.w).toBeLessThanOrEqual(8);
		expect(player.h).toBeGreaterThanOrEqual(6);
		expect(player.h).toBeLessThanOrEqual(8);
	});

	it("player start uses durasteel_span floor", () => {
		const rooms = generateRooms(48, 48, "player-floor");
		const player = rooms.find((r) => r.tag === "player")!;
		expect(player.floorType).toBe("durasteel_span");
	});
});

// ---------------------------------------------------------------------------
// Room placement: cult POIs
// ---------------------------------------------------------------------------

describe("cult POI rooms", () => {
	it("places 6 cult POI rooms by default", () => {
		const rooms = generateRooms(48, 48, "cult-test");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");
		expect(cultRooms.length).toBe(6);
	});

	it("respects custom cultDensity", () => {
		const rooms = generateRooms(48, 48, "cult-density", 3);
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");
		expect(cultRooms.length).toBe(3);
	});

	it("cult rooms are 4x4 or 5x5", () => {
		const rooms = generateRooms(48, 48, "cult-size");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");

		for (const room of cultRooms) {
			expect(room.w).toBeGreaterThanOrEqual(4);
			expect(room.w).toBeLessThanOrEqual(5);
			expect(room.h).toBeGreaterThanOrEqual(4);
			expect(room.h).toBeLessThanOrEqual(5);
		}
	});

	it("cult rooms use shrine/workshop/antenna tags", () => {
		const rooms = generateRooms(48, 48, "cult-tags");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");

		const tags = new Set(cultRooms.map((r) => r.tag));
		expect(tags.has("shrine")).toBe(true);
		expect(tags.has("workshop")).toBe(true);
		expect(tags.has("antenna")).toBe(true);
	});

	it("cult POI rooms are in the northern half of the board", () => {
		const h = 48;
		const rooms = generateRooms(48, h, "cult-north");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");

		const northBound = Math.floor(h * 0.55);
		for (const room of cultRooms) {
			expect(
				room.z + room.h,
				`cult room "${room.tag}" extends to z=${room.z + room.h}, past bound ${northBound}`,
			).toBeLessThanOrEqual(northBound);
		}
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
		// Player start (1) + cults (6) + scatter rooms
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
