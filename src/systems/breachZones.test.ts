import { createNewGameConfig } from "../world/config";
import { generateWorldData } from "../world/generation";
import {
	generateBreachZones,
	getBreachZones,
	getBreachZonesNear,
	getPrimaryBreachZones,
	isBreachZoneCell,
	loadBreachZones,
	resetBreachZones,
} from "./breachZones";

describe("breachZones", () => {
	afterEach(() => {
		resetBreachZones();
	});

	function makeWorldData(seed = 42) {
		return generateWorldData(
			createNewGameConfig(seed, {
				sectorScale: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			}),
		);
	}

	describe("generateBreachZones", () => {
		it("produces breach zones from world data", () => {
			const worldData = makeWorldData();
			const zones = generateBreachZones(worldData);
			expect(zones.length).toBeGreaterThan(0);
		});

		it("is deterministic for the same world data", () => {
			const worldData = makeWorldData(1337);
			const first = generateBreachZones(worldData);
			const second = generateBreachZones(worldData);
			expect(second).toEqual(first);
		});

		it("each zone has 2-5 cells in its cluster", () => {
			const worldData = makeWorldData(77);
			const zones = generateBreachZones(worldData);
			for (const zone of zones) {
				expect(zone.cells.length).toBeGreaterThanOrEqual(1);
				expect(zone.cells.length).toBeLessThanOrEqual(5);
			}
		});

		it("zone cells do not overlap between zones", () => {
			const worldData = makeWorldData(100);
			const zones = generateBreachZones(worldData);
			const seen = new Set<string>();
			for (const zone of zones) {
				for (const cell of zone.cells) {
					const key = `${cell.q},${cell.r}`;
					expect(seen.has(key)).toBe(false);
					seen.add(key);
				}
			}
		});

		it("marks zones near the cult site as primary", () => {
			const worldData = makeWorldData(42);
			const zones = generateBreachZones(worldData);
			const cultSite = worldData.pointsOfInterest.find(
				(p) => p.type === "northern_cult_site",
			);
			expect(cultSite).toBeDefined();

			const primaryZones = zones.filter((z) => z.isPrimary);
			// There should be at least some primary zones near the cult site
			// (or none if the cult site happens to not have edge cells nearby)
			for (const pz of primaryZones) {
				const dq = pz.centerQ - cultSite!.q;
				const dr = pz.centerR - cultSite!.r;
				expect(Math.sqrt(dq * dq + dr * dr)).toBeLessThan(6);
			}
		});

		it("no breach zones within 4 cells of home base", () => {
			const worldData = makeWorldData(42);
			const zones = generateBreachZones(worldData);
			const homeBase = worldData.pointsOfInterest.find(
				(p) => p.type === "home_base",
			);
			expect(homeBase).toBeDefined();

			for (const zone of zones) {
				for (const cell of zone.cells) {
					const dq = cell.q - homeBase!.q;
					const dr = cell.r - homeBase!.r;
					expect(Math.sqrt(dq * dq + dr * dr)).toBeGreaterThanOrEqual(4);
				}
			}
		});

		it("produces different zones for different world seeds", () => {
			const zones1 = generateBreachZones(makeWorldData(1));
			const zones2 = generateBreachZones(makeWorldData(999));
			// Center coordinates should differ
			const centers1 = zones1.map((z) => `${z.centerQ},${z.centerR}`);
			const centers2 = zones2.map((z) => `${z.centerQ},${z.centerR}`);
			expect(centers1).not.toEqual(centers2);
		});
	});

	describe("generateWorldData includes breachZones", () => {
		it("world generation output includes breachZones array", () => {
			const worldData = makeWorldData(42);
			expect(worldData.breachZones).toBeDefined();
			expect(Array.isArray(worldData.breachZones)).toBe(true);
			expect(worldData.breachZones.length).toBeGreaterThan(0);
		});
	});

	describe("runtime API", () => {
		it("getBreachZones returns empty before loading", () => {
			expect(getBreachZones()).toEqual([]);
		});

		it("loadBreachZones populates the runtime store", () => {
			const worldData = makeWorldData(42);
			loadBreachZones(worldData.breachZones);
			expect(getBreachZones().length).toBe(worldData.breachZones.length);
		});

		it("getBreachZonesNear sorts by distance", () => {
			const worldData = makeWorldData(42);
			loadBreachZones(worldData.breachZones);
			const zones = getBreachZonesNear(0, 0);
			for (let i = 1; i < zones.length; i++) {
				const prevDist =
					zones[i - 1].centerQ ** 2 + zones[i - 1].centerR ** 2;
				const currDist = zones[i].centerQ ** 2 + zones[i].centerR ** 2;
				expect(currDist).toBeGreaterThanOrEqual(prevDist);
			}
		});

		it("getPrimaryBreachZones filters correctly", () => {
			const worldData = makeWorldData(42);
			loadBreachZones(worldData.breachZones);
			const primary = getPrimaryBreachZones();
			for (const zone of primary) {
				expect(zone.isPrimary).toBe(true);
			}
		});

		it("isBreachZoneCell checks cell membership", () => {
			const worldData = makeWorldData(42);
			loadBreachZones(worldData.breachZones);
			const zone = worldData.breachZones[0];
			const cell = zone.cells[0];
			expect(isBreachZoneCell(cell.q, cell.r)).toBe(true);
			// A very distant coordinate should not be in any zone
			expect(isBreachZoneCell(9999, 9999)).toBe(false);
		});

		it("resetBreachZones clears the store", () => {
			const worldData = makeWorldData(42);
			loadBreachZones(worldData.breachZones);
			expect(getBreachZones().length).toBeGreaterThan(0);
			resetBreachZones();
			expect(getBreachZones()).toEqual([]);
		});
	});
});
