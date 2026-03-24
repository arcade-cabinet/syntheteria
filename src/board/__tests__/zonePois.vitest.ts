/**
 * Zone POI (Point of Interest) placement tests.
 *
 * Verifies that observatory, lab, and mine_shaft rooms are placed
 * in the correct geographic zones with proper sizes and floor types.
 */

import { describe, expect, it } from "vitest";
import { generateRooms, type Room, ZONE_POI_DEFS } from "../labyrinth";
import { zoneForTile } from "../zones";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRooms(seed: string, size = 64): Room[] {
	return generateRooms(size, size, seed);
}

function zonePois(rooms: Room[]): Room[] {
	return rooms.filter((r) => r.kind === "zone_poi");
}

function poisByTag(rooms: Room[], tag: string): Room[] {
	return rooms.filter((r) => r.kind === "zone_poi" && r.tag === tag);
}

/** Check that a room's center is in the expected zone. */
function roomCenterZone(room: Room, w: number, h: number): string {
	const cx = room.x + Math.floor(room.w / 2);
	const cz = room.z + Math.floor(room.h / 2);
	return zoneForTile(cx, cz, w, h);
}

// ---------------------------------------------------------------------------
// Zone POI definitions
// ---------------------------------------------------------------------------

describe("ZONE_POI_DEFS", () => {
	it("defines observatory, lab, and mine_shaft", () => {
		const types = ZONE_POI_DEFS.map((d) => d.type);
		expect(types).toContain("observatory");
		expect(types).toContain("lab");
		expect(types).toContain("mine_shaft");
	});

	it("observatory is in campus zone", () => {
		const obs = ZONE_POI_DEFS.find((d) => d.type === "observatory")!;
		expect(obs.zone).toBe("campus");
	});

	it("mine_shaft is in coast zone", () => {
		const mine = ZONE_POI_DEFS.find((d) => d.type === "mine_shaft")!;
		expect(mine.zone).toBe("coast");
	});

	it("lab is in campus zone", () => {
		const lab = ZONE_POI_DEFS.find((d) => d.type === "lab")!;
		expect(lab.zone).toBe("campus");
	});

	it("exactly 1 observatory", () => {
		const obs = ZONE_POI_DEFS.find((d) => d.type === "observatory")!;
		expect(obs.count).toBe(1);
	});

	it("multiple mine shafts", () => {
		const mine = ZONE_POI_DEFS.find((d) => d.type === "mine_shaft")!;
		expect(mine.count).toBeGreaterThan(1);
	});
});

// ---------------------------------------------------------------------------
// Observatory placement
// ---------------------------------------------------------------------------

describe("observatory placement", () => {
	it("places an observatory room", () => {
		const rooms = getRooms("obs-test", 64);
		const obs = poisByTag(rooms, "observatory");
		expect(obs.length).toBe(1);
	});

	it("observatory is in the campus zone (southwest)", () => {
		const size = 64;
		const rooms = getRooms("obs-zone", size);
		const obs = poisByTag(rooms, "observatory")[0]!;
		expect(roomCenterZone(obs, size, size)).toBe("campus");
	});

	it("observatory uses bio_district floor type", () => {
		const rooms = getRooms("obs-floor", 64);
		const obs = poisByTag(rooms, "observatory")[0]!;
		expect(obs.floorType).toBe("bio_district");
	});

	it("observatory is 5x5 to 7x7", () => {
		for (const seed of ["obs-size-a", "obs-size-b", "obs-size-c"]) {
			const rooms = getRooms(seed, 64);
			const obs = poisByTag(rooms, "observatory")[0]!;
			expect(obs.w).toBeGreaterThanOrEqual(5);
			expect(obs.w).toBeLessThanOrEqual(7);
			expect(obs.h).toBeGreaterThanOrEqual(5);
			expect(obs.h).toBeLessThanOrEqual(7);
		}
	});
});

// ---------------------------------------------------------------------------
// Lab placement
// ---------------------------------------------------------------------------

describe("lab placement", () => {
	it("places lab rooms", () => {
		const rooms = getRooms("lab-test", 64);
		const labs = poisByTag(rooms, "lab");
		expect(labs.length).toBeGreaterThan(0);
	});

	it("labs are in the campus zone", () => {
		const size = 64;
		const rooms = getRooms("lab-zone", size);
		const labs = poisByTag(rooms, "lab");
		for (const lab of labs) {
			expect(roomCenterZone(lab, size, size)).toBe("campus");
		}
	});

	it("labs use transit_deck floor type", () => {
		const rooms = getRooms("lab-floor", 64);
		const labs = poisByTag(rooms, "lab");
		for (const lab of labs) {
			expect(lab.floorType).toBe("transit_deck");
		}
	});
});

// ---------------------------------------------------------------------------
// Mine shaft placement
// ---------------------------------------------------------------------------

describe("mine shaft placement", () => {
	it("places mine shaft rooms", () => {
		const rooms = getRooms("mine-test", 64);
		const mines = poisByTag(rooms, "mine_shaft");
		expect(mines.length).toBeGreaterThan(0);
	});

	it("mine shafts are in the coast zone (east/south)", () => {
		const size = 64;
		const rooms = getRooms("mine-zone", size);
		const mines = poisByTag(rooms, "mine_shaft");
		for (const mine of mines) {
			expect(roomCenterZone(mine, size, size)).toBe("coast");
		}
	});

	it("mine shafts use collapsed_zone floor type", () => {
		const rooms = getRooms("mine-floor", 64);
		const mines = poisByTag(rooms, "mine_shaft");
		for (const mine of mines) {
			expect(mine.floorType).toBe("collapsed_zone");
		}
	});

	it("mine shafts are 4x4 to 6x6", () => {
		for (const seed of ["mine-size-a", "mine-size-b", "mine-size-c"]) {
			const rooms = getRooms(seed, 64);
			const mines = poisByTag(rooms, "mine_shaft");
			for (const mine of mines) {
				expect(mine.w).toBeGreaterThanOrEqual(4);
				expect(mine.w).toBeLessThanOrEqual(6);
				expect(mine.h).toBeGreaterThanOrEqual(4);
				expect(mine.h).toBeLessThanOrEqual(6);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("zone POI determinism", () => {
	it("same seed produces identical zone POIs", () => {
		const rooms1 = zonePois(getRooms("poi-det", 64));
		const rooms2 = zonePois(getRooms("poi-det", 64));

		expect(rooms1.length).toBe(rooms2.length);
		for (let i = 0; i < rooms1.length; i++) {
			expect(rooms1[i]).toEqual(rooms2[i]);
		}
	});
});

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

describe("zone POI spacing", () => {
	it("zone POIs respect room spacing rules", () => {
		const rooms = getRooms("poi-spacing", 64);
		const pois = zonePois(rooms);

		// POIs should not overlap with any other rooms
		for (const poi of pois) {
			for (const other of rooms) {
				if (poi === other) continue;
				// Check no overlap (rooms should have MIN_ROOM_SPACING gap)
				const noOverlap =
					poi.x + poi.w <= other.x ||
					other.x + other.w <= poi.x ||
					poi.z + poi.h <= other.z ||
					other.z + other.h <= poi.z;
				expect(noOverlap, `POI ${poi.tag} overlaps with ${other.tag}`).toBe(
					true,
				);
			}
		}
	});
});
