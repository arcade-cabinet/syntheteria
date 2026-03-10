import {
	applyStormDamageToShelters,
	getExposedCubes,
	getNearestShelter,
	getSheltersByFaction,
	getShelterCapacity,
	getTotalShelterCoverage,
	isPositionSheltered,
	registerShelter,
	removeShelter,
	repairShelter,
	reset,
	updateShelterDurability,
} from "../shelterSystem.ts";
import type { Shelter } from "../shelterSystem.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeShelter(overrides: Partial<Shelter> = {}): Shelter {
	return {
		id: "shelter-1",
		position: { x: 0, y: 0, z: 0 },
		radius: 5,
		height: 3,
		coveragePercent: 1.0,
		material: "steel",
		durability: 100,
		maxDurability: 100,
		protectsFromWeather: true,
		hidesFromPerception: true,
		ownerFaction: "player",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("shelterSystem", () => {
	beforeEach(() => {
		reset();
	});

	// -----------------------------------------------------------------------
	// registerShelter / removeShelter
	// -----------------------------------------------------------------------

	describe("registerShelter", () => {
		it("registers a shelter that can be found by position check", () => {
			registerShelter(makeShelter());
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.sheltered).toBe(true);
			expect(status.shelterId).toBe("shelter-1");
		});

		it("overwrites shelter with same ID", () => {
			registerShelter(makeShelter({ coveragePercent: 0.5 }));
			registerShelter(makeShelter({ coveragePercent: 1.0 }));
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.coveragePercent).toBe(1.0);
		});
	});

	describe("removeShelter", () => {
		it("removes a shelter so it no longer covers positions", () => {
			registerShelter(makeShelter());
			removeShelter("shelter-1");
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.sheltered).toBe(false);
		});

		it("does nothing for nonexistent ID", () => {
			expect(() => removeShelter("nope")).not.toThrow();
		});
	});

	// -----------------------------------------------------------------------
	// updateShelterDurability
	// -----------------------------------------------------------------------

	describe("updateShelterDurability", () => {
		it("reduces durability by damage amount", () => {
			registerShelter(makeShelter({ durability: 100, maxDurability: 100 }));
			const result = updateShelterDurability("shelter-1", 30);
			expect(result.destroyed).toBe(false);
		});

		it("destroys shelter when durability reaches 0", () => {
			registerShelter(makeShelter({ durability: 50, maxDurability: 100 }));
			const result = updateShelterDurability("shelter-1", 50);
			expect(result.destroyed).toBe(true);
			// Shelter should be removed
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.sheltered).toBe(false);
		});

		it("does not go below 0 durability", () => {
			registerShelter(makeShelter({ durability: 10, maxDurability: 100 }));
			const result = updateShelterDurability("shelter-1", 999);
			expect(result.destroyed).toBe(true);
		});

		it("returns destroyed=false for unknown shelter", () => {
			const result = updateShelterDurability("nonexistent", 10);
			expect(result.destroyed).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// repairShelter
	// -----------------------------------------------------------------------

	describe("repairShelter", () => {
		it("increases durability up to max", () => {
			registerShelter(makeShelter({ durability: 50, maxDurability: 100 }));
			const repaired = repairShelter("shelter-1", 30);
			expect(repaired).toBe(30);
		});

		it("caps at maxDurability", () => {
			registerShelter(makeShelter({ durability: 90, maxDurability: 100 }));
			const repaired = repairShelter("shelter-1", 50);
			expect(repaired).toBe(10);
		});

		it("returns 0 for unknown shelter", () => {
			const repaired = repairShelter("nonexistent", 50);
			expect(repaired).toBe(0);
		});

		it("returns 0 when already at max durability", () => {
			registerShelter(makeShelter({ durability: 100, maxDurability: 100 }));
			const repaired = repairShelter("shelter-1", 20);
			expect(repaired).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// isPositionSheltered
	// -----------------------------------------------------------------------

	describe("isPositionSheltered", () => {
		it("returns unsheltered for position outside radius", () => {
			registerShelter(makeShelter({ radius: 5 }));
			const status = isPositionSheltered({ x: 100, y: 1, z: 100 });
			expect(status.sheltered).toBe(false);
			expect(status.shelterId).toBeNull();
			expect(status.coveragePercent).toBe(0);
			expect(status.weatherDamageReduction).toBe(0);
			expect(status.perceptionBlocked).toBe(false);
		});

		it("returns unsheltered for position above shelter height", () => {
			registerShelter(makeShelter({ height: 3 }));
			const status = isPositionSheltered({ x: 0, y: 10, z: 0 });
			expect(status.sheltered).toBe(false);
		});

		it("returns unsheltered for position below shelter floor", () => {
			registerShelter(makeShelter({ position: { x: 0, y: 5, z: 0 } }));
			const status = isPositionSheltered({ x: 0, y: 0, z: 0 });
			expect(status.sheltered).toBe(false);
		});

		it("reports weatherDamageReduction based on coveragePercent", () => {
			registerShelter(
				makeShelter({ coveragePercent: 0.7, protectsFromWeather: true }),
			);
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.weatherDamageReduction).toBeCloseTo(0.7);
		});

		it("reports 0 weatherDamageReduction when protectsFromWeather is false", () => {
			registerShelter(
				makeShelter({ coveragePercent: 1.0, protectsFromWeather: false }),
			);
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.weatherDamageReduction).toBe(0);
		});

		it("reports perceptionBlocked from hidesFromPerception", () => {
			registerShelter(makeShelter({ hidesFromPerception: true }));
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.perceptionBlocked).toBe(true);
		});

		it("picks shelter with highest coveragePercent when overlapping", () => {
			registerShelter(makeShelter({ id: "low", coveragePercent: 0.3 }));
			registerShelter(
				makeShelter({ id: "high", coveragePercent: 0.9 }),
			);
			const status = isPositionSheltered({ x: 0, y: 1, z: 0 });
			expect(status.shelterId).toBe("high");
			expect(status.coveragePercent).toBeCloseTo(0.9);
		});

		it("handles position exactly at shelter boundary", () => {
			registerShelter(makeShelter({ radius: 5, height: 3 }));
			// Exactly at radius edge (x=5, z=0 => dist=5)
			const status = isPositionSheltered({ x: 5, y: 1, z: 0 });
			expect(status.sheltered).toBe(true);
		});
	});

	// -----------------------------------------------------------------------
	// getExposedCubes
	// -----------------------------------------------------------------------

	describe("getExposedCubes", () => {
		it("returns all cubes when no shelters exist", () => {
			const cubes = [
				{ id: "c1", position: { x: 0, y: 0, z: 0 } },
				{ id: "c2", position: { x: 5, y: 0, z: 5 } },
			];
			const exposed = getExposedCubes(cubes);
			expect(exposed).toEqual(["c1", "c2"]);
		});

		it("returns empty array when all cubes are sheltered", () => {
			registerShelter(makeShelter({ radius: 10, height: 5 }));
			const cubes = [
				{ id: "c1", position: { x: 0, y: 1, z: 0 } },
				{ id: "c2", position: { x: 2, y: 1, z: 2 } },
			];
			const exposed = getExposedCubes(cubes);
			expect(exposed).toEqual([]);
		});

		it("returns only unsheltered cubes", () => {
			registerShelter(makeShelter({ radius: 3 }));
			const cubes = [
				{ id: "inside", position: { x: 0, y: 1, z: 0 } },
				{ id: "outside", position: { x: 50, y: 1, z: 50 } },
			];
			const exposed = getExposedCubes(cubes);
			expect(exposed).toEqual(["outside"]);
		});
	});

	// -----------------------------------------------------------------------
	// getShelterCapacity
	// -----------------------------------------------------------------------

	describe("getShelterCapacity", () => {
		it("returns {0,0} for unknown shelter", () => {
			const cap = getShelterCapacity("nonexistent");
			expect(cap).toEqual({ current: 0, max: 0 });
		});

		it("calculates max based on radius and height", () => {
			// radius=2, height=1 => area=pi*4=12.57, slots=floor(12.57/0.25)=50,
			// layers=floor(1/0.5)=2, max=100
			registerShelter(makeShelter({ radius: 2, height: 1 }));
			const cap = getShelterCapacity("shelter-1");
			expect(cap.max).toBe(100);
			expect(cap.current).toBe(0);
		});

		it("scales with larger shelters", () => {
			registerShelter(makeShelter({ id: "small", radius: 1, height: 1 }));
			registerShelter(makeShelter({ id: "large", radius: 4, height: 2 }));
			const small = getShelterCapacity("small");
			const large = getShelterCapacity("large");
			expect(large.max).toBeGreaterThan(small.max);
		});
	});

	// -----------------------------------------------------------------------
	// applyStormDamageToShelters
	// -----------------------------------------------------------------------

	describe("applyStormDamageToShelters", () => {
		it("damages shelters proportional to storm intensity", () => {
			registerShelter(makeShelter({ durability: 100, maxDurability: 100 }));
			const reports = applyStormDamageToShelters(0.5, 1.0);
			expect(reports).toHaveLength(1);
			expect(reports[0].damageTaken).toBeGreaterThan(0);
			expect(reports[0].remainingDurability).toBeLessThan(100);
			expect(reports[0].destroyed).toBe(false);
		});

		it("skips shelters that do not protect from weather", () => {
			registerShelter(makeShelter({ protectsFromWeather: false }));
			const reports = applyStormDamageToShelters(1.0, 1.0);
			expect(reports).toHaveLength(0);
		});

		it("destroys shelter when damage exceeds remaining durability", () => {
			registerShelter(makeShelter({ durability: 1, maxDurability: 100 }));
			const reports = applyStormDamageToShelters(1.0, 10.0);
			expect(reports[0].destroyed).toBe(true);
			// Shelter should be gone
			expect(getSheltersByFaction("player")).toHaveLength(0);
		});

		it("returns empty array when no shelters exist", () => {
			const reports = applyStormDamageToShelters(1.0, 1.0);
			expect(reports).toEqual([]);
		});

		it("applies zero damage when stormIntensity is 0", () => {
			registerShelter(makeShelter({ durability: 100 }));
			const reports = applyStormDamageToShelters(0, 1.0);
			expect(reports).toHaveLength(1);
			expect(reports[0].damageTaken).toBe(0);
			expect(reports[0].remainingDurability).toBe(100);
		});
	});

	// -----------------------------------------------------------------------
	// getSheltersByFaction
	// -----------------------------------------------------------------------

	describe("getSheltersByFaction", () => {
		it("returns shelters for the given faction", () => {
			registerShelter(makeShelter({ id: "p1", ownerFaction: "player" }));
			registerShelter(makeShelter({ id: "p2", ownerFaction: "player" }));
			registerShelter(makeShelter({ id: "e1", ownerFaction: "enemy" }));
			const playerShelters = getSheltersByFaction("player");
			expect(playerShelters).toHaveLength(2);
			expect(playerShelters.map((s) => s.id).sort()).toEqual(["p1", "p2"]);
		});

		it("returns empty array for faction with no shelters", () => {
			registerShelter(makeShelter({ ownerFaction: "player" }));
			expect(getSheltersByFaction("voltCollective")).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// getNearestShelter
	// -----------------------------------------------------------------------

	describe("getNearestShelter", () => {
		it("returns the nearest shelter", () => {
			registerShelter(
				makeShelter({ id: "far", position: { x: 100, y: 0, z: 100 } }),
			);
			registerShelter(
				makeShelter({ id: "near", position: { x: 5, y: 0, z: 0 } }),
			);
			const nearest = getNearestShelter({ x: 0, y: 0, z: 0 });
			expect(nearest).not.toBeNull();
			expect(nearest!.id).toBe("near");
		});

		it("returns null when no shelters exist", () => {
			const nearest = getNearestShelter({ x: 0, y: 0, z: 0 });
			expect(nearest).toBeNull();
		});

		it("respects maxRange parameter", () => {
			registerShelter(
				makeShelter({ id: "s1", position: { x: 50, y: 0, z: 0 } }),
			);
			const nearest = getNearestShelter({ x: 0, y: 0, z: 0 }, 10);
			expect(nearest).toBeNull();
		});

		it("returns shelter within maxRange", () => {
			registerShelter(
				makeShelter({ id: "s1", position: { x: 5, y: 0, z: 0 } }),
			);
			const nearest = getNearestShelter({ x: 0, y: 0, z: 0 }, 10);
			expect(nearest).not.toBeNull();
			expect(nearest!.id).toBe("s1");
		});
	});

	// -----------------------------------------------------------------------
	// getTotalShelterCoverage
	// -----------------------------------------------------------------------

	describe("getTotalShelterCoverage", () => {
		it("sums area of all faction shelters", () => {
			registerShelter(
				makeShelter({ id: "s1", radius: 5, ownerFaction: "player" }),
			);
			registerShelter(
				makeShelter({ id: "s2", radius: 3, ownerFaction: "player" }),
			);
			const expected = Math.PI * 25 + Math.PI * 9;
			const coverage = getTotalShelterCoverage("player");
			expect(coverage).toBeCloseTo(expected);
		});

		it("returns 0 for faction with no shelters", () => {
			expect(getTotalShelterCoverage("nobody")).toBe(0);
		});

		it("excludes other factions", () => {
			registerShelter(
				makeShelter({ id: "s1", radius: 5, ownerFaction: "player" }),
			);
			registerShelter(
				makeShelter({ id: "s2", radius: 3, ownerFaction: "enemy" }),
			);
			const coverage = getTotalShelterCoverage("player");
			expect(coverage).toBeCloseTo(Math.PI * 25);
		});
	});

	// -----------------------------------------------------------------------
	// reset
	// -----------------------------------------------------------------------

	describe("reset", () => {
		it("clears all shelters", () => {
			registerShelter(makeShelter({ id: "a" }));
			registerShelter(makeShelter({ id: "b" }));
			reset();
			expect(getSheltersByFaction("player")).toEqual([]);
			expect(isPositionSheltered({ x: 0, y: 1, z: 0 }).sheltered).toBe(false);
		});
	});
});
