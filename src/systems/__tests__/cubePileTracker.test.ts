/**
 * Unit tests for the cube pile tracker system.
 *
 * Tests cover:
 * - Registering cubes and finding them in piles
 * - Unregistering removes from piles
 * - recalculatePiles groups nearby cubes correctly
 * - Cubes far apart form separate piles
 * - materialBreakdown counts per-material
 * - totalEconomicValue calculation
 * - getPilesByFaction filtering
 * - getLargestPile returns pile with most cubes
 * - getTotalValueByFaction
 * - getPileAt with radius
 * - Position updates trigger re-clustering
 * - reset clears everything
 */

import {
	registerCube,
	unregisterCube,
	updateCubePosition,
	recalculatePiles,
	getPiles,
	getPilesByFaction,
	getLargestPile,
	getTotalValueByFaction,
	getPileAt,
	reset,
} from "../cubePileTracker";
import type { CubeInfo } from "../cubePileTracker";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeCube(
	overrides: Partial<CubeInfo> & { cubeId: string },
): CubeInfo {
	return {
		materialType: "iron",
		position: { x: 0, y: 0, z: 0 },
		ownerFaction: "reclaimers",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// registerCube + recalculatePiles basics
// ---------------------------------------------------------------------------

describe("registerCube", () => {
	it("registers a cube and it appears in a pile after recalculation", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		recalculatePiles(2);

		const piles = getPiles();
		expect(piles.length).toBe(1);
		expect(piles[0].cubeCount).toBe(1);
	});

	it("registers multiple cubes in the same cell into one pile", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0.1, y: 0, z: 0.2 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 0.5, y: 1, z: 0.3 } }),
		);
		registerCube(
			makeCube({ cubeId: "c3", position: { x: 1.0, y: 2, z: 1.0 } }),
		);
		recalculatePiles(2);

		const piles = getPiles();
		expect(piles.length).toBe(1);
		expect(piles[0].cubeCount).toBe(3);
	});

	it("stores a copy of the cube info, not a reference", () => {
		const cube = makeCube({
			cubeId: "c1",
			position: { x: 5, y: 0, z: 5 },
		});
		registerCube(cube);

		// Mutate original — should not affect tracker
		cube.position.x = 999;

		recalculatePiles(2);
		const piles = getPiles();
		expect(piles[0].center.x).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// unregisterCube
// ---------------------------------------------------------------------------

describe("unregisterCube", () => {
	it("removes a cube so it no longer appears in piles", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		registerCube(makeCube({ cubeId: "c2" }));
		unregisterCube("c1");
		recalculatePiles(2);

		const piles = getPiles();
		expect(piles.length).toBe(1);
		expect(piles[0].cubeCount).toBe(1);
	});

	it("removing all cubes results in no piles", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		unregisterCube("c1");
		recalculatePiles(2);

		expect(getPiles().length).toBe(0);
	});

	it("does nothing for a nonexistent cube ID", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		unregisterCube("nonexistent");
		recalculatePiles(2);

		expect(getPiles().length).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Spatial clustering
// ---------------------------------------------------------------------------

describe("recalculatePiles — spatial clustering", () => {
	it("groups cubes in the same grid cell into one pile", () => {
		// With clusterRadius=4, positions 1 and 3 both map to cell (0, 0)
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 1, y: 0, z: 1 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 3, y: 0, z: 3 } }),
		);
		recalculatePiles(4);

		expect(getPiles().length).toBe(1);
		expect(getPiles()[0].cubeCount).toBe(2);
	});

	it("separates cubes in different grid cells into different piles", () => {
		// With clusterRadius=2: (0,0) → cell(0,0), (5,5) → cell(2,2)
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 0, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 5, y: 0, z: 5 } }),
		);
		recalculatePiles(2);

		expect(getPiles().length).toBe(2);
	});

	it("computes pile center as the average of cube positions", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 0, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 2, y: 4, z: 2 } }),
		);
		recalculatePiles(4);

		const pile = getPiles()[0];
		expect(pile.center.x).toBe(1);
		expect(pile.center.y).toBe(2);
		expect(pile.center.z).toBe(1);
	});

	it("sets topY to the highest cube Y in the pile", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 1, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 0, y: 5, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c3", position: { x: 0, y: 3, z: 0 } }),
		);
		recalculatePiles(4);

		expect(getPiles()[0].topY).toBe(5);
	});

	it("separates cubes of different factions in the same cell into different piles", () => {
		registerCube(
			makeCube({
				cubeId: "c1",
				position: { x: 1, y: 0, z: 1 },
				ownerFaction: "reclaimers",
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c2",
				position: { x: 1, y: 0, z: 1 },
				ownerFaction: "volt_collective",
			}),
		);
		recalculatePiles(4);

		expect(getPiles().length).toBe(2);
		expect(getPiles().map((p) => p.ownerFaction).sort()).toEqual([
			"reclaimers",
			"volt_collective",
		]);
	});

	it("assigns unique pileIds", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 0, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 100, y: 0, z: 100 } }),
		);
		recalculatePiles(2);

		const ids = getPiles().map((p) => p.pileId);
		expect(new Set(ids).size).toBe(2);
	});

	it("handles negative coordinates correctly", () => {
		// floor(-1/4) = -1, floor(-5/4) = -2 → different cells
		registerCube(
			makeCube({ cubeId: "c1", position: { x: -1, y: 0, z: -1 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: -5, y: 0, z: -5 } }),
		);
		recalculatePiles(4);

		expect(getPiles().length).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// materialBreakdown
// ---------------------------------------------------------------------------

describe("materialBreakdown", () => {
	it("counts each material type in a pile", () => {
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "iron",
				position: { x: 0, y: 0, z: 0 },
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c2",
				materialType: "iron",
				position: { x: 0, y: 1, z: 0 },
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c3",
				materialType: "copper",
				position: { x: 0, y: 2, z: 0 },
			}),
		);
		recalculatePiles(4);

		const pile = getPiles()[0];
		expect(pile.materialBreakdown).toEqual({ iron: 2, copper: 1 });
	});

	it("handles a single material type", () => {
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "rare_alloy",
			}),
		);
		recalculatePiles(4);

		expect(getPiles()[0].materialBreakdown).toEqual({ rare_alloy: 1 });
	});
});

// ---------------------------------------------------------------------------
// totalEconomicValue
// ---------------------------------------------------------------------------

describe("totalEconomicValue", () => {
	it("sums values of all cubes in a pile using hardcoded values", () => {
		// iron=25, copper=15
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "iron",
				position: { x: 0, y: 0, z: 0 },
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c2",
				materialType: "copper",
				position: { x: 0, y: 1, z: 0 },
			}),
		);
		recalculatePiles(4);

		expect(getPiles()[0].totalEconomicValue).toBe(40);
	});

	it("uses fallback value of 5 for unknown material types", () => {
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "unobtainium",
			}),
		);
		recalculatePiles(4);

		expect(getPiles()[0].totalEconomicValue).toBe(5);
	});

	it("calculates correctly for expensive materials", () => {
		// rare_alloy=100, fiber_optics=60
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "rare_alloy",
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c2",
				materialType: "fiber_optics",
			}),
		);
		recalculatePiles(4);

		expect(getPiles()[0].totalEconomicValue).toBe(160);
	});

	it("uses correct value for each known material", () => {
		const expectations: Record<string, number> = {
			scrap_iron: 5,
			iron: 25,
			copper: 15,
			e_waste: 10,
			fiber_optics: 60,
			rare_alloy: 100,
		};

		for (const [mat, expectedValue] of Object.entries(expectations)) {
			reset();
			registerCube(makeCube({ cubeId: `c_${mat}`, materialType: mat }));
			recalculatePiles(4);
			expect(getPiles()[0].totalEconomicValue).toBe(expectedValue);
		}
	});
});

// ---------------------------------------------------------------------------
// getPilesByFaction
// ---------------------------------------------------------------------------

describe("getPilesByFaction", () => {
	it("returns only piles belonging to the specified faction", () => {
		registerCube(
			makeCube({
				cubeId: "c1",
				ownerFaction: "reclaimers",
				position: { x: 0, y: 0, z: 0 },
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c2",
				ownerFaction: "volt_collective",
				position: { x: 0, y: 0, z: 0 },
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c3",
				ownerFaction: "reclaimers",
				position: { x: 100, y: 0, z: 100 },
			}),
		);
		recalculatePiles(4);

		const reclaimerPiles = getPilesByFaction("reclaimers");
		expect(reclaimerPiles.length).toBe(2);
		expect(reclaimerPiles.every((p) => p.ownerFaction === "reclaimers")).toBe(
			true,
		);
	});

	it("returns empty array for faction with no piles", () => {
		registerCube(makeCube({ cubeId: "c1", ownerFaction: "reclaimers" }));
		recalculatePiles(4);

		expect(getPilesByFaction("iron_creed")).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// getLargestPile
// ---------------------------------------------------------------------------

describe("getLargestPile", () => {
	it("returns null when there are no piles", () => {
		recalculatePiles(4);
		expect(getLargestPile()).toBeNull();
	});

	it("returns the pile with the most cubes", () => {
		// Pile at origin: 3 cubes
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 0, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 0, y: 1, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c3", position: { x: 0, y: 2, z: 0 } }),
		);
		// Pile far away: 1 cube
		registerCube(
			makeCube({ cubeId: "c4", position: { x: 100, y: 0, z: 100 } }),
		);
		recalculatePiles(4);

		const largest = getLargestPile();
		expect(largest).not.toBeNull();
		expect(largest!.cubeCount).toBe(3);
	});

	it("returns a pile when there is only one pile", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		recalculatePiles(4);

		expect(getLargestPile()).not.toBeNull();
		expect(getLargestPile()!.cubeCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// getTotalValueByFaction
// ---------------------------------------------------------------------------

describe("getTotalValueByFaction", () => {
	it("sums economic value across all piles for a faction", () => {
		// iron=25 each, two piles of 1 cube each
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "iron",
				ownerFaction: "reclaimers",
				position: { x: 0, y: 0, z: 0 },
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c2",
				materialType: "iron",
				ownerFaction: "reclaimers",
				position: { x: 100, y: 0, z: 100 },
			}),
		);
		recalculatePiles(4);

		expect(getTotalValueByFaction("reclaimers")).toBe(50);
	});

	it("returns 0 for a faction with no piles", () => {
		registerCube(
			makeCube({ cubeId: "c1", ownerFaction: "reclaimers" }),
		);
		recalculatePiles(4);

		expect(getTotalValueByFaction("signal_choir")).toBe(0);
	});

	it("does not include other factions' values", () => {
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "rare_alloy",
				ownerFaction: "reclaimers",
			}),
		);
		registerCube(
			makeCube({
				cubeId: "c2",
				materialType: "iron",
				ownerFaction: "volt_collective",
			}),
		);
		recalculatePiles(4);

		expect(getTotalValueByFaction("reclaimers")).toBe(100);
		expect(getTotalValueByFaction("volt_collective")).toBe(25);
	});
});

// ---------------------------------------------------------------------------
// getPileAt
// ---------------------------------------------------------------------------

describe("getPileAt", () => {
	it("finds a pile near the given position", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 5, y: 0, z: 5 } }),
		);
		recalculatePiles(4);

		const pile = getPileAt({ x: 5, y: 0, z: 5 }, 2);
		expect(pile).not.toBeNull();
		expect(pile!.cubeCount).toBe(1);
	});

	it("returns null when no pile is within radius", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 100, y: 0, z: 100 } }),
		);
		recalculatePiles(4);

		expect(getPileAt({ x: 0, y: 0, z: 0 }, 5)).toBeNull();
	});

	it("returns the nearest pile when multiple are in range", () => {
		// Pile A at ~(1,0,1), pile B at ~(10,0,10)
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 1, y: 0, z: 1 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 10, y: 0, z: 10 } }),
		);
		recalculatePiles(2);

		const pile = getPileAt({ x: 2, y: 0, z: 2 }, 20);
		expect(pile).not.toBeNull();
		expect(pile!.center.x).toBe(1);
		expect(pile!.center.z).toBe(1);
	});

	it("returns null when there are no piles at all", () => {
		recalculatePiles(4);
		expect(getPileAt({ x: 0, y: 0, z: 0 }, 100)).toBeNull();
	});

	it("considers Y distance in radius check", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 50, z: 0 } }),
		);
		recalculatePiles(4);

		// Close in XZ but far in Y — should be out of range
		expect(getPileAt({ x: 0, y: 0, z: 0 }, 10)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// updateCubePosition
// ---------------------------------------------------------------------------

describe("updateCubePosition", () => {
	it("moves a cube to a new cell, changing pile membership", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 0, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 0, y: 0, z: 0 } }),
		);
		recalculatePiles(2);
		expect(getPiles().length).toBe(1);
		expect(getPiles()[0].cubeCount).toBe(2);

		// Move c2 far away
		updateCubePosition("c2", { x: 100, y: 0, z: 100 });
		recalculatePiles(2);

		expect(getPiles().length).toBe(2);
		expect(getPiles().every((p) => p.cubeCount === 1)).toBe(true);
	});

	it("does nothing for a nonexistent cube ID", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		updateCubePosition("nonexistent", { x: 999, y: 999, z: 999 });
		recalculatePiles(4);

		expect(getPiles().length).toBe(1);
	});

	it("stores a copy of position, not a reference", () => {
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 0, z: 0 } }),
		);
		const pos = { x: 10, y: 5, z: 10 };
		updateCubePosition("c1", pos);

		// Mutate original
		pos.x = 999;
		recalculatePiles(4);

		expect(getPiles()[0].center.x).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all cubes and piles", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		registerCube(makeCube({ cubeId: "c2" }));
		recalculatePiles(4);
		expect(getPiles().length).toBe(1);

		reset();
		recalculatePiles(4);

		expect(getPiles().length).toBe(0);
	});

	it("clears piles without requiring recalculation", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		recalculatePiles(4);
		expect(getPiles().length).toBe(1);

		reset();

		// getPiles should be empty immediately after reset
		expect(getPiles().length).toBe(0);
	});

	it("allows fresh registration after reset", () => {
		registerCube(makeCube({ cubeId: "c1", materialType: "iron" }));
		recalculatePiles(4);
		reset();

		registerCube(makeCube({ cubeId: "c2", materialType: "copper" }));
		recalculatePiles(4);

		expect(getPiles().length).toBe(1);
		expect(getPiles()[0].materialBreakdown).toEqual({ copper: 1 });
	});
});

// ---------------------------------------------------------------------------
// Edge cases and integration
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles zero cubes gracefully", () => {
		recalculatePiles(4);

		expect(getPiles()).toEqual([]);
		expect(getLargestPile()).toBeNull();
		expect(getTotalValueByFaction("reclaimers")).toBe(0);
		expect(getPilesByFaction("reclaimers")).toEqual([]);
	});

	it("handles a single cube as a pile of one", () => {
		registerCube(
			makeCube({
				cubeId: "c1",
				materialType: "rare_alloy",
				position: { x: 5, y: 3, z: 5 },
			}),
		);
		recalculatePiles(4);

		const pile = getPiles()[0];
		expect(pile.cubeCount).toBe(1);
		expect(pile.center).toEqual({ x: 5, y: 3, z: 5 });
		expect(pile.topY).toBe(3);
		expect(pile.totalEconomicValue).toBe(100);
	});

	it("recalculation is idempotent with the same data", () => {
		registerCube(makeCube({ cubeId: "c1" }));
		registerCube(makeCube({ cubeId: "c2" }));

		recalculatePiles(4);
		const first = getPiles().map((p) => ({
			count: p.cubeCount,
			value: p.totalEconomicValue,
		}));

		recalculatePiles(4);
		const second = getPiles().map((p) => ({
			count: p.cubeCount,
			value: p.totalEconomicValue,
		}));

		expect(first).toEqual(second);
	});

	it("changing clusterRadius changes pile grouping", () => {
		// Two cubes 3 units apart
		registerCube(
			makeCube({ cubeId: "c1", position: { x: 0, y: 0, z: 0 } }),
		);
		registerCube(
			makeCube({ cubeId: "c2", position: { x: 3, y: 0, z: 0 } }),
		);

		// With radius 2: floor(0/2)=0, floor(3/2)=1 → 2 piles
		recalculatePiles(2);
		expect(getPiles().length).toBe(2);

		// With radius 4: floor(0/4)=0, floor(3/4)=0 → 1 pile
		recalculatePiles(4);
		expect(getPiles().length).toBe(1);
	});

	it("handles many cubes across multiple factions and locations", () => {
		const factions = ["reclaimers", "volt_collective", "signal_choir"];
		const materials = ["iron", "copper", "scrap_iron", "rare_alloy"];
		let id = 0;

		for (const faction of factions) {
			for (let x = 0; x < 3; x++) {
				for (let z = 0; z < 3; z++) {
					registerCube(
						makeCube({
							cubeId: `c${id++}`,
							ownerFaction: faction,
							materialType: materials[id % materials.length],
							position: { x: x * 50, y: 0, z: z * 50 },
						}),
					);
				}
			}
		}

		recalculatePiles(4);

		// Each faction has cubes at 9 grid positions spread across 50-unit gaps
		// All 3 factions at each of 9 locations = 27 piles
		const piles = getPiles();
		expect(piles.length).toBe(27);

		// Each faction should have 9 piles
		for (const faction of factions) {
			expect(getPilesByFaction(faction).length).toBe(9);
		}
	});
});
