/**
 * World geography zone tests.
 *
 * Verifies distance+direction zone assignment logic, zone profiles,
 * and that the generator produces distinct characteristics per zone.
 *
 * Zone assignment uses distance from center + compass direction:
 *   - Standalone boards: center = (width/2, height/2)
 *   - Infinite world: center = (0, 0)
 *   - Near center: always "city"
 *   - North (negative Z offset): enemy
 *   - East/South: coast
 *   - Southwest: campus
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
// Zone assignment (distance+direction with center offset)
// ---------------------------------------------------------------------------

describe("zoneForTile", () => {
	const W = 64;
	const H = 64;

	it("center of board is city zone", () => {
		expect(zoneForTile(32, 32, W, H)).toBe("city");
	});

	it("top of board (low z = north of center) is enemy zone", () => {
		expect(zoneForTile(32, 0, W, H)).toBe("enemy");
		expect(zoneForTile(32, 5, W, H)).toBe("enemy");
	});

	it("bottom-right (south-east of center) is coast zone", () => {
		expect(zoneForTile(60, 60, W, H)).toBe("coast");
	});

	it("bottom-left (southwest of center) is campus zone", () => {
		expect(zoneForTile(5, 60, W, H)).toBe("campus");
	});

	it("east side (beyond city center) is coast", () => {
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

	it("infinite world mode (no width/height) has origin as city", () => {
		expect(zoneForTile(0, 0)).toBe("city");
		expect(zoneForTile(10, 10)).toBe("city");
	});

	it("infinite world mode: far north is enemy", () => {
		expect(zoneForTile(0, -200)).toBe("enemy");
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

	it("city zone is largest near center (small board)", () => {
		// On a small board, most tiles are within city radius
		const counts = zoneCounts(32, 32);
		expect(counts.city).toBeGreaterThan(counts.coast);
	});

	it("enemy zone covers the northern band on a large board", () => {
		const counts = zoneCounts(128, 128);
		// Enemy is the northern direction — should have significant coverage
		const totalArea = 128 * 128;
		const enemyFraction = counts.enemy / totalArea;
		expect(enemyFraction).toBeGreaterThan(0.05);
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
	it("city zone has meaningful passable area", () => {
		const board = generateBoard(makeConfig("density-test", 64));

		const passable = countByZone(board.tiles, (t) => t.passable);
		const totals = totalByZone(board.tiles);

		const cityRatio = passable.city / Math.max(totals.city, 1);
		expect(cityRatio).toBeGreaterThan(0.2);
	});

	it("coast has fewer walls per area than city (density adjusted)", () => {
		const board = generateBoard(makeConfig("density-compare", 96));
		const walls = countByZone(
			board.tiles,
			(t) => t.floorType === "structural_mass",
		);
		const totals = totalByZone(board.tiles);

		if (totals.coast > 50 && totals.city > 50) {
			const cityWallRate = walls.city / Math.max(totals.city, 1);
			const coastWallRate = walls.coast / Math.max(totals.coast, 1);
			expect(coastWallRate).toBeLessThan(cityWallRate);
		}
	});
});

// ---------------------------------------------------------------------------
// Generated board: zone-specific resources
// ---------------------------------------------------------------------------

describe("zone resources", () => {
	it("coast zone has higher resource density than enemy zone", () => {
		const board = generateBoard(makeConfig("resource-zones", 128));
		const resources = countByZone(
			board.tiles,
			(t) => t.resourceMaterial !== null,
		);
		const totals = totalByZone(board.tiles);

		if (totals.coast > 50 && totals.enemy > 50) {
			const coastRate = resources.coast / Math.max(totals.coast, 1);
			const enemyRate = resources.enemy / Math.max(totals.enemy, 1);
			expect(coastRate).toBeGreaterThan(enemyRate);
		}
	});
});

// ---------------------------------------------------------------------------
// Zone-specific floor types
// ---------------------------------------------------------------------------

describe("zone floor types", () => {
	it("campus zone has bio_district tiles on a large board", () => {
		const board = generateBoard(makeConfig("campus-floors", 128));
		let campusBioCount = 0;
		for (const row of board.tiles) {
			for (const tile of row) {
				if (tile.zone === "campus" && tile.floorType === "bio_district") {
					campusBioCount++;
				}
			}
		}
		const totals = totalByZone(board.tiles);
		if (totals.campus > 50) {
			expect(campusBioCount).toBeGreaterThan(0);
		}
	});

	it("city zone has multiple floor types", () => {
		const board = generateBoard(makeConfig("floor-dist-city", 64));
		const cityFloors = new Set<string>();
		for (const row of board.tiles) {
			for (const tile of row) {
				if (tile.zone === "city" && tile.passable) {
					cityFloors.add(tile.floorType);
				}
			}
		}
		expect(cityFloors.size).toBeGreaterThanOrEqual(2);
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
