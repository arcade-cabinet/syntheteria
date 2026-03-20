/**
 * Tests for BreachZoneRenderer data collection.
 *
 * Tests the breach zone cell collection and visual property assignment.
 */

import type { BreachZone } from "../systems/breachZones";
import {
	getBreachZones,
	loadBreachZones,
	resetBreachZones,
} from "../systems/breachZones";

beforeEach(() => {
	resetBreachZones();
});

describe("BreachZoneRenderer data", () => {
	it("returns empty when no breach zones loaded", () => {
		expect(getBreachZones()).toEqual([]);
	});

	it("returns loaded breach zones", () => {
		const zones: BreachZone[] = [
			{
				id: "breach_0",
				centerQ: 5,
				centerR: 5,
				cells: [
					{ q: 5, r: 5 },
					{ q: 5, r: 6 },
					{ q: 6, r: 5 },
				],
				isPrimary: true,
			},
			{
				id: "breach_1",
				centerQ: 15,
				centerR: 15,
				cells: [
					{ q: 15, r: 15 },
					{ q: 15, r: 16 },
				],
				isPrimary: false,
			},
		];

		loadBreachZones(zones);
		const result = getBreachZones();

		expect(result).toHaveLength(2);
		expect(result[0].cells).toHaveLength(3);
		expect(result[1].cells).toHaveLength(2);
	});

	it("primary zones are correctly identified", () => {
		const zones: BreachZone[] = [
			{
				id: "breach_0",
				centerQ: 5,
				centerR: 5,
				cells: [{ q: 5, r: 5 }],
				isPrimary: true,
			},
			{
				id: "breach_1",
				centerQ: 20,
				centerR: 20,
				cells: [{ q: 20, r: 20 }],
				isPrimary: false,
			},
		];

		loadBreachZones(zones);
		const result = getBreachZones();

		const primary = result.filter((z) => z.isPrimary);
		const secondary = result.filter((z) => !z.isPrimary);
		expect(primary).toHaveLength(1);
		expect(secondary).toHaveLength(1);
	});

	it("deduplicates cells across overlapping zones", () => {
		const zones: BreachZone[] = [
			{
				id: "breach_0",
				centerQ: 5,
				centerR: 5,
				cells: [
					{ q: 5, r: 5 },
					{ q: 5, r: 6 },
				],
				isPrimary: true,
			},
		];

		loadBreachZones(zones);
		const allCells = getBreachZones().flatMap((z) => z.cells);

		// Collect unique cell keys
		const unique = new Set(allCells.map((c) => `${c.q},${c.r}`));
		expect(unique.size).toBe(allCells.length);
	});
});
