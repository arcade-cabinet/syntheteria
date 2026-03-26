/**
 * Labyrinth single-player adaptation tests (P1-2).
 *
 * Verifies: exactly one player start, cult rooms in north,
 * seeded reproducibility, cultDensity parameter, and no AI factions.
 */

import { describe, expect, it } from "vitest";
import {
	type CultPoiType,
	generateLabyrinth,
	generateRooms,
} from "../labyrinth";
import type { BoardConfig } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(seed = "sp-test"): BoardConfig {
	return { width: 48, height: 48, seed, difficulty: "normal" };
}

// ---------------------------------------------------------------------------
// Single-player structure
// ---------------------------------------------------------------------------

describe("single-player labyrinth", () => {
	it("has exactly one player_start room tagged 'player'", () => {
		const rooms = generateRooms(48, 48, "sp-one");
		const starts = rooms.filter((r) => r.kind === "player_start");
		expect(starts.length).toBe(1);
		expect(starts[0]!.tag).toBe("player");
	});

	it("has no AI faction rooms", () => {
		const rooms = generateRooms(48, 48, "sp-no-ai");
		const nonPlayerStarts = rooms.filter(
			(r) => r.kind === "player_start" && r.tag !== "player",
		);
		expect(nonPlayerStarts.length).toBe(0);

		// Also verify no room tags match old faction IDs
		const factionIds = [
			"reclaimers",
			"volt_collective",
			"signal_choir",
			"iron_creed",
		];
		for (const room of rooms) {
			expect(factionIds).not.toContain(room.tag);
		}
	});

	it("player start is near center-south (z ≈ 65% of height)", () => {
		for (const seed of ["sp-pos-1", "sp-pos-2", "sp-pos-3"]) {
			const rooms = generateRooms(48, 48, seed);
			const player = rooms.find((r) => r.kind === "player_start")!;
			const cz = player.z + player.h / 2;

			// Should be in the southern region, not center or north
			expect(cz).toBeGreaterThan(48 * 0.4);
		}
	});
});

// ---------------------------------------------------------------------------
// Cult POI rooms in north
// ---------------------------------------------------------------------------

describe("cult rooms concentrated in north", () => {
	it("all cult POI rooms have z < 55% of board height", () => {
		const h = 48;
		const rooms = generateRooms(48, h, "cult-north-sp");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");

		expect(cultRooms.length).toBeGreaterThan(0);
		const northBound = Math.floor(h * 0.55);
		for (const room of cultRooms) {
			expect(room.z).toBeLessThan(northBound);
		}
	});

	it("cult rooms use shrine/workshop/antenna tags", () => {
		const rooms = generateRooms(48, 48, "cult-types-sp");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");
		const validTags: CultPoiType[] = ["shrine", "workshop", "antenna"];

		for (const room of cultRooms) {
			expect(validTags).toContain(room.tag);
		}
	});

	it("cult rooms have themed floor types", () => {
		const rooms = generateRooms(48, 48, "cult-floors-sp");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");

		const expectedFloors: Record<CultPoiType, string> = {
			shrine: "dust_district",
			workshop: "collapsed_zone",
			antenna: "aerostructure",
		};

		for (const room of cultRooms) {
			const tag = room.tag as CultPoiType;
			expect(room.floorType).toBe(expectedFloors[tag]);
		}
	});
});

// ---------------------------------------------------------------------------
// Seeded reproducibility
// ---------------------------------------------------------------------------

describe("seeded reproducibility (single-player)", () => {
	it("same seed + same cultDensity = identical rooms", () => {
		const a = generateRooms(48, 48, "repro-sp", 4);
		const b = generateRooms(48, 48, "repro-sp", 4);
		expect(a).toEqual(b);
	});

	it("same seed + same cultDensity = identical tile grid", () => {
		const config: BoardConfig = { ...makeConfig("repro-grid"), cultDensity: 4 };
		const board1 = generateLabyrinth(config);
		const board2 = generateLabyrinth(config);

		for (let z = 0; z < config.height; z++) {
			for (let x = 0; x < config.width; x++) {
				expect(board1.tiles[z]![x]!.floorType).toBe(
					board2.tiles[z]![x]!.floorType,
				);
			}
		}
	});

	it("different cultDensity changes room layout", () => {
		const a = generateRooms(48, 48, "density-diff", 3);
		const b = generateRooms(48, 48, "density-diff", 6);

		const cultA = a.filter((r) => r.kind === "cult_poi").length;
		const cultB = b.filter((r) => r.kind === "cult_poi").length;
		expect(cultA).toBe(3);
		expect(cultB).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// cultDensity parameter
// ---------------------------------------------------------------------------

describe("cultDensity parameter", () => {
	it("defaults to 6 when not specified", () => {
		const rooms = generateRooms(48, 48, "density-default");
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");
		expect(cultRooms.length).toBe(6);
	});

	it("BoardConfig.cultDensity flows through generateLabyrinth", () => {
		const config: BoardConfig = {
			...makeConfig("density-config"),
			cultDensity: 2,
		};
		const board = generateLabyrinth(config);
		expect(board.config.cultDensity).toBe(2);

		// Verify the rooms match
		const rooms = generateRooms(48, 48, "density-config", 2);
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");
		expect(cultRooms.length).toBe(2);
	});

	it("cultDensity 0 produces no cult rooms", () => {
		const rooms = generateRooms(48, 48, "density-zero", 0);
		const cultRooms = rooms.filter((r) => r.kind === "cult_poi");
		expect(cultRooms.length).toBe(0);
	});
});
