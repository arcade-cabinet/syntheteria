/**
 * World geography zone tests.
 *
 * Verifies zone assignment logic, zone boundary placement, zone profiles,
 * and that the generator produces distinct characteristics per zone.
 */

import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import type { BoardConfig, TileData } from "../types";
import {
	type WorldZone,
	ZONE_PROFILES,
	zoneCounts,
	zoneForTile,
} from "../zones";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(seed: string, size = 48): BoardConfig {
	return { width: size, height: size, seed, difficulty: "normal" };
}

function countByZone(
	tiles: TileData[][],
	predicate: (tile: TileData) => boolean,
): Record<WorldZone, number> {
	const counts: Record<WorldZone, number> = {
		city: 0,
		coast: 0,
		campus: 0,
		enemy: 0,
	};
	for (const row of tiles) {
		for (const tile of row) {
			if (tile.zone && predicate(tile)) {
				counts[tile.zone as WorldZone]++;
			}
		}
	}
	return counts;
}

function totalByZone(tiles: TileData[][]): Record<WorldZone, number> {
	const counts: Record<WorldZone, number> = {
		city: 0,
		coast: 0,
		campus: 0,
		enemy: 0,
	};
	for (const row of tiles) {
		for (const tile of row) {
			if (tile.zone) counts[tile.zone as WorldZone]++;
		}
	}
	return counts;
}

// ---------------------------------------------------------------------------
// Zone assignment (pure geometry)
// ---------------------------------------------------------------------------

describe("zoneForTile", () => {
	const W = 64;
	const H = 64;

	it("center of board is city zone", () => {
		expect(zoneForTile(32, 32, W, H)).toBe("city");
	});

	it("top of board (low z) is enemy zone", () => {
		expect(zoneForTile(32, 0, W, H)).toBe("enemy");
		expect(zoneForTile(32, 5, W, H)).toBe("enemy");
	});

	it("bottom-right is coast zone", () => {
		expect(zoneForTile(60, 60, W, H)).toBe("coast");
	});

	it("bottom-left is campus zone", () => {
		expect(zoneForTile(5, 60, W, H)).toBe("campus");
	});

	it("east side (beyond city) is coast", () => {
		expect(zoneForTile(60, 32, W, H)).toBe("coast");
	});

	it("handles 1x1 board without crashing", () => {
		const zone = zoneForTile(0, 0, 1, 1);
		expect(["city", "coast", "campus", "enemy"]).toContain(zone);
	});

	it("every tile gets exactly one zone (no gaps)", () => {
		const validZones = new Set<string>(["city", "coast", "campus", "enemy"]);
		for (let z = 0; z < H; z++) {
			for (let x = 0; x < W; x++) {
				const zone = zoneForTile(x, z, W, H);
				expect(
					validZones.has(zone),
					`tile (${x},${z}) has zone "${zone}"`,
				).toBe(true);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Zone counts
// ---------------------------------------------------------------------------

describe("zoneCounts", () => {
	it("all zones have tiles on a 64x64 board", () => {
		const counts = zoneCounts(64, 64);
		expect(counts.city).toBeGreaterThan(0);
		expect(counts.coast).toBeGreaterThan(0);
		expect(counts.campus).toBeGreaterThan(0);
		expect(counts.enemy).toBeGreaterThan(0);
	});

	it("total counts equal board area", () => {
		const w = 48;
		const h = 48;
		const counts = zoneCounts(w, h);
		const total = counts.city + counts.coast + counts.campus + counts.enemy;
		expect(total).toBe(w * h);
	});

	it("city zone is not the largest on a big board (coast + enemy are larger)", () => {
		const counts = zoneCounts(64, 64);
		// Coast wraps around east and south — typically larger than city
		expect(counts.coast).toBeGreaterThan(counts.city);
	});

	it("enemy zone covers the northern band", () => {
		const counts = zoneCounts(64, 64);
		// Enemy is top 25% of the board — should be roughly 25% of area
		const totalArea = 64 * 64;
		const enemyFraction = counts.enemy / totalArea;
		expect(enemyFraction).toBeGreaterThan(0.15);
		expect(enemyFraction).toBeLessThan(0.35);
	});
});

// ---------------------------------------------------------------------------
// Zone profiles
// ---------------------------------------------------------------------------

describe("ZONE_PROFILES", () => {
	it("city has highest wall density", () => {
		expect(ZONE_PROFILES.city.wallDensity).toBe(1.0);
		expect(ZONE_PROFILES.coast.wallDensity).toBeLessThan(
			ZONE_PROFILES.city.wallDensity,
		);
		expect(ZONE_PROFILES.campus.wallDensity).toBeLessThan(
			ZONE_PROFILES.city.wallDensity,
		);
	});

	it("coast has highest resource multiplier", () => {
		expect(ZONE_PROFILES.coast.resourceMultiplier).toBeGreaterThan(
			ZONE_PROFILES.city.resourceMultiplier,
		);
		expect(ZONE_PROFILES.coast.resourceMultiplier).toBeGreaterThan(
			ZONE_PROFILES.enemy.resourceMultiplier,
		);
	});

	it("enemy has lowest resource multiplier", () => {
		expect(ZONE_PROFILES.enemy.resourceMultiplier).toBeLessThan(
			ZONE_PROFILES.city.resourceMultiplier,
		);
	});

	it("all zones have at least one floor type", () => {
		for (const zone of ["city", "coast", "campus", "enemy"] as const) {
			expect(ZONE_PROFILES[zone].floorTypes.length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Generated board: zone stamps
// ---------------------------------------------------------------------------

describe("generated board zone assignment", () => {
	it("every tile has a zone stamp after generation", () => {
		const board = generateBoard(makeConfig("zone-stamp", 32));
		for (const row of board.tiles) {
			for (const tile of row) {
				expect(tile.zone).toBeDefined();
				expect(["city", "coast", "campus", "enemy"]).toContain(tile.zone);
			}
		}
	});

	it("zone stamps are deterministic (same seed = same zones)", () => {
		const b1 = generateBoard(makeConfig("zone-det", 32));
		const b2 = generateBoard(makeConfig("zone-det", 32));

		for (let z = 0; z < 32; z++) {
			for (let x = 0; x < 32; x++) {
				expect(b1.tiles[z]![x]!.zone).toBe(b2.tiles[z]![x]!.zone);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Generated board: zone-specific density
// ---------------------------------------------------------------------------

describe("zone density", () => {
	it("non-city zones have walls removed by density adjustment", () => {
		// Generate two boards: compare wall counts in coast/campus zones
		// between the raw zone assignment (which hasn't removed walls yet)
		// and the fact that density adjustment converts some walls.
		const board = generateBoard(makeConfig("density-test", 64));

		// Count passable tiles per zone
		const passable = countByZone(board.tiles, (t) => t.passable);
		const totals = totalByZone(board.tiles);

		const coastRatio = passable.coast / Math.max(totals.coast, 1);
		const campusRatio = passable.campus / Math.max(totals.campus, 1);

		// Coast and campus zones should have meaningful passable area
		// (wall removal makes them more open than a pure labyrinth)
		expect(coastRatio).toBeGreaterThan(0.25);
		expect(campusRatio).toBeGreaterThan(0.25);
	});

	it("coast has fewer walls per area than city (density adjusted)", () => {
		// Use a larger board for statistical significance
		const board = generateBoard(makeConfig("density-compare", 96));
		const walls = countByZone(
			board.tiles,
			(t) => t.floorType === "structural_mass",
		);
		const totals = totalByZone(board.tiles);

		const cityWallRate = walls.city / Math.max(totals.city, 1);
		const coastWallRate = walls.coast / Math.max(totals.coast, 1);

		// Coast should have fewer walls (more were removed)
		expect(coastWallRate).toBeLessThan(cityWallRate);
	});
});

// ---------------------------------------------------------------------------
// Generated board: zone-specific resources
// ---------------------------------------------------------------------------

describe("zone resources", () => {
	it("coast zone has higher resource density than enemy zone", () => {
		const board = generateBoard(makeConfig("resource-zones", 64));
		const resources = countByZone(
			board.tiles,
			(t) => t.resourceMaterial !== null,
		);
		const totals = totalByZone(board.tiles);

		const coastRate = resources.coast / Math.max(totals.coast, 1);
		const enemyRate = resources.enemy / Math.max(totals.enemy, 1);

		expect(coastRate).toBeGreaterThan(enemyRate);
	});
});

// ---------------------------------------------------------------------------
// Zone-specific floor types
// ---------------------------------------------------------------------------

describe("zone floor types", () => {
	it("campus zone has bio_district tiles", () => {
		const board = generateBoard(makeConfig("campus-floors", 64));
		let campusBioCount = 0;
		for (const row of board.tiles) {
			for (const tile of row) {
				if (tile.zone === "campus" && tile.floorType === "bio_district") {
					campusBioCount++;
				}
			}
		}
		// Campus profile includes bio_district — should appear
		expect(campusBioCount).toBeGreaterThan(0);
	});

	it("different zones have different floor type distributions", () => {
		const board = generateBoard(makeConfig("floor-dist", 64));

		const floorsByZone: Record<WorldZone, Set<string>> = {
			city: new Set(),
			coast: new Set(),
			campus: new Set(),
			enemy: new Set(),
		};

		for (const row of board.tiles) {
			for (const tile of row) {
				if (tile.zone && tile.passable) {
					floorsByZone[tile.zone as WorldZone].add(tile.floorType);
				}
			}
		}

		// Each zone should have at least 2 distinct passable floor types
		for (const zone of ["city", "coast", "campus", "enemy"] as const) {
			expect(
				floorsByZone[zone].size,
				`${zone} should have multiple floor types`,
			).toBeGreaterThanOrEqual(2);
		}
	});
});

// ---------------------------------------------------------------------------
// Player start zone
// ---------------------------------------------------------------------------

describe("player start zone", () => {
	it("player start tile is in city zone", () => {
		const size = 48;
		const board = generateBoard(makeConfig("player-zone", size));
		const cx = Math.floor(size / 2);
		const cz = Math.floor(size * 0.65);
		const start = board.tiles[cz]![cx]!;

		expect(start.zone).toBe("city");
	});
});
