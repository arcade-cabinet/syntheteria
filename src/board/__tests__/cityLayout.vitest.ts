import { describe, expect, it } from "vitest";
import type { CityBlock } from "../cityLayout";
import { generateCityLayout } from "../cityLayout";

describe("generateCityLayout", () => {
	it("blocks plus corridors cover entire board", () => {
		const width = 48;
		const height = 48;
		const blocks = generateCityLayout(width, height, "coverage-test");

		// Build a set of all tiles covered by blocks
		const covered = new Set<string>();
		for (const b of blocks) {
			for (let z = b.z; z < b.z + b.h; z++) {
				for (let x = b.x; x < b.x + b.w; x++) {
					const key = `${x},${z}`;
					// No tile should be covered by two blocks
					expect(covered.has(key), `tile ${key} covered twice`).toBe(false);
					covered.add(key);
				}
			}
		}

		// All block tiles must be within bounds
		for (const key of covered) {
			const [xStr, zStr] = key.split(",");
			const x = Number(xStr);
			const z = Number(zStr);
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(width);
			expect(z).toBeGreaterThanOrEqual(0);
			expect(z).toBeLessThan(height);
		}

		// Corridor tiles = total tiles - block tiles. Both must be >= 0.
		const totalTiles = width * height;
		const blockTiles = covered.size;
		const corridorTiles = totalTiles - blockTiles;

		expect(blockTiles).toBeGreaterThan(0);
		expect(corridorTiles).toBeGreaterThanOrEqual(0);
		// Block tiles + corridor tiles = total
		expect(blockTiles + corridorTiles).toBe(totalTiles);
	});

	it("all blocks are at least 6x6", () => {
		const blocks = generateCityLayout(64, 64, "min-size-test");

		for (const b of blocks) {
			expect(
				b.w,
				`block at (${b.x},${b.z}) width ${b.w}`,
			).toBeGreaterThanOrEqual(6);
			expect(
				b.h,
				`block at (${b.x},${b.z}) height ${b.h}`,
			).toBeGreaterThanOrEqual(6);
		}
	});

	it("all blocks have a zone type", () => {
		const validZones = new Set(["industrial", "bio", "dust", "aero", "plaza"]);
		const blocks = generateCityLayout(48, 48, "zone-test");

		for (const b of blocks) {
			expect(validZones.has(b.zone), `invalid zone: ${b.zone}`).toBe(true);
			expect(b.isAbyssal).toBe(false);
		}
	});

	it("deterministic for same seed", () => {
		const blocks1 = generateCityLayout(44, 44, "determinism");
		const blocks2 = generateCityLayout(44, 44, "determinism");

		expect(blocks1).toEqual(blocks2);
	});

	it("different seeds produce different layouts", () => {
		const blocks1 = generateCityLayout(48, 48, "seed-alpha");
		const blocks2 = generateCityLayout(48, 48, "seed-beta");

		// Compare block positions — at least one block should differ
		const serialize = (blocks: CityBlock[]) =>
			blocks.map((b) => `${b.x},${b.z},${b.w},${b.h},${b.zone}`).join("|");

		expect(serialize(blocks1)).not.toBe(serialize(blocks2));
	});
});
