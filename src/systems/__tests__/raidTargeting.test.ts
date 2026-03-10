/**
 * Unit tests for the raid targeting system.
 *
 * Tests cover:
 * - findRaidTargets: clustering, value scoring, threat assessment, sorting
 * - assessRaidViability: force ratio calculations, viable flag
 * - Cube clustering by proximity (CLUSTER_RADIUS = 6)
 * - Value weighting (scrapMetal=1, eWaste=2, intactComponents=5)
 * - Defender counting (DEFENDER_SCAN_RADIUS = 12)
 * - Edge cases: no cubes, no defenders, empty world
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock raidSystem to control getCubes()
vi.mock("../raidSystem", () => ({
	getCubes: vi.fn(() => []),
}));

import type { Entity, UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";
import type { CubeEntity } from "../raidSystem";
import { getCubes } from "../raidSystem";
import { assessRaidViability, findRaidTargets } from "../raidTargeting";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponents(
	overrides: Partial<Record<string, boolean>> = {},
): UnitComponent[] {
	const defaults: Record<string, boolean> = {
		camera: true,
		arms: true,
		legs: true,
		power_cell: true,
		...overrides,
	};
	return Object.entries(defaults).map(([name, functional]) => ({
		name,
		functional,
		material: "metal" as const,
	}));
}

function makeUnit(
	id: string,
	faction: Entity["faction"],
	pos: { x: number; y: number; z: number },
	opts: { components?: UnitComponent[] } = {},
): Entity {
	const entity = world.add({
		id,
		faction,
		worldPosition: { ...pos },
		mapFragment: { fragmentId: "test_frag" },
		unit: {
			type: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			components: opts.components ?? makeComponents(),
		},
		navigation: { path: [], pathIndex: 0, moving: false },
	} as Partial<Entity> as Entity);
	trackedEntities.push(entity);
	return entity;
}

function makeCube(
	id: string,
	faction: Entity["faction"],
	pos: { x: number; y: number; z: number },
	resourceType: "scrapMetal" | "eWaste" | "intactComponents" = "scrapMetal",
	value = 1,
): CubeEntity {
	return {
		id,
		faction,
		worldPosition: { ...pos },
		grabbable: {
			resourceType,
			value,
			weight: 1,
		},
	} as CubeEntity;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const trackedEntities: Entity[] = [];

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getCubes).mockReturnValue([]);
});

afterEach(() => {
	for (const e of trackedEntities) {
		try {
			world.remove(e);
		} catch {
			// already removed
		}
	}
	trackedEntities.length = 0;
});

// ---------------------------------------------------------------------------
// findRaidTargets — basic functionality
// ---------------------------------------------------------------------------

describe("raidTargeting — findRaidTargets", () => {
	it("returns empty array when no cubes exist", () => {
		vi.mocked(getCubes).mockReturnValue([]);
		const targets = findRaidTargets("feral");
		expect(targets).toEqual([]);
	});

	it("returns empty array when all cubes belong to the attacking faction", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "feral", { x: 0, y: 0, z: 0 }),
			makeCube("c2", "feral", { x: 1, y: 0, z: 0 }),
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toEqual([]);
	});

	it("ignores held cubes", () => {
		const cube = makeCube("c1", "player", { x: 0, y: 0, z: 0 });
		(cube as any).heldBy = "some_unit";
		vi.mocked(getCubes).mockReturnValue([cube]);
		const targets = findRaidTargets("feral");
		expect(targets).toEqual([]);
	});

	it("finds enemy cubes (player cubes when attacking as feral)", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(1);
		expect(targets[0].cubeIds).toContain("c1");
	});
});

// ---------------------------------------------------------------------------
// Cube clustering
// ---------------------------------------------------------------------------

describe("raidTargeting — cube clustering", () => {
	it("groups nearby cubes into a single cluster (within CLUSTER_RADIUS=6)", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
			makeCube("c2", "player", { x: 12, y: 0, z: 10 }), // dist=2 < 6
			makeCube("c3", "player", { x: 14, y: 0, z: 10 }), // dist=2 from c2, 4 from c1
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(1);
		expect(targets[0].cubeCount).toBe(3);
	});

	it("separates distant cubes into different clusters", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }),
			makeCube("c2", "player", { x: 1, y: 0, z: 0 }), // cluster 1
			makeCube("c3", "player", { x: 50, y: 0, z: 50 }), // cluster 2
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(2);
	});

	it("single-linkage clustering chains cubes", () => {
		// c1 -> c2 -> c3 each within 5 units of next, but c1 to c3 = 10
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }),
			makeCube("c2", "player", { x: 5, y: 0, z: 0 }),
			makeCube("c3", "player", { x: 10, y: 0, z: 0 }),
		]);
		const targets = findRaidTargets("feral");
		// All three should be in one cluster via chaining
		expect(targets).toHaveLength(1);
		expect(targets[0].cubeCount).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Value scoring
// ---------------------------------------------------------------------------

describe("raidTargeting — value scoring", () => {
	it("scores scrapMetal cubes at weight 1", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "scrapMetal", 3),
		]);
		const targets = findRaidTargets("feral");
		expect(targets[0].estimatedValue).toBe(3); // 1 * 3
	});

	it("scores eWaste cubes at weight 2", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "eWaste", 3),
		]);
		const targets = findRaidTargets("feral");
		expect(targets[0].estimatedValue).toBe(6); // 2 * 3
	});

	it("scores intactComponents cubes at weight 5", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "intactComponents", 2),
		]);
		const targets = findRaidTargets("feral");
		expect(targets[0].estimatedValue).toBe(10); // 5 * 2
	});

	it("sums values across a cluster", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "scrapMetal", 2),   // 1*2 = 2
			makeCube("c2", "player", { x: 1, y: 0, z: 0 }, "eWaste", 3),       // 2*3 = 6
			makeCube("c3", "player", { x: 2, y: 0, z: 0 }, "intactComponents", 1), // 5*1 = 5
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(1);
		expect(targets[0].estimatedValue).toBe(13); // 2 + 6 + 5
	});
});

// ---------------------------------------------------------------------------
// Threat assessment (defenders)
// ---------------------------------------------------------------------------

describe("raidTargeting — threat level", () => {
	it("counts player defenders near the stockpile", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		// Place two player defenders nearby
		makeUnit("d1", "player", { x: 10, y: 0, z: 12 });
		makeUnit("d2", "player", { x: 8, y: 0, z: 10 });

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(2);
	});

	it("does not count attacking faction's own units as defenders", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		// Feral unit near the stockpile — should not count as defender
		makeUnit("f1", "feral", { x: 10, y: 0, z: 12 });

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(0);
	});

	it("does not count wildlife as defenders", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		makeUnit("w1", "wildlife", { x: 10, y: 0, z: 12 });

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(0);
	});

	it("does not count units with all components broken", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		makeUnit("d1", "player", { x: 10, y: 0, z: 12 }, {
			components: makeComponents({
				camera: false,
				arms: false,
				legs: false,
				power_cell: false,
			}),
		});

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(0);
	});

	it("does not count defenders outside DEFENDER_SCAN_RADIUS (12)", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		makeUnit("d1", "player", { x: 25, y: 0, z: 10 }); // dist=15 > 12

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe("raidTargeting — sorting", () => {
	it("sorts higher-value lower-threat targets first", () => {
		vi.mocked(getCubes).mockReturnValue([
			// Cluster 1: low value (at x=0)
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "scrapMetal", 1),
			// Cluster 2: high value (at x=50)
			makeCube("c2", "player", { x: 50, y: 0, z: 50 }, "intactComponents", 5),
		]);

		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(2);

		// Higher value target should come first
		expect(targets[0].estimatedValue).toBeGreaterThan(targets[1].estimatedValue);
	});

	it("penalizes high-threat targets in sorting", () => {
		vi.mocked(getCubes).mockReturnValue([
			// Cluster 1: same value as cluster 2, but has defenders
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }, "scrapMetal", 5),
			// Cluster 2: same value, no defenders
			makeCube("c2", "player", { x: 50, y: 0, z: 50 }, "scrapMetal", 5),
		]);

		// Add defender near cluster 1
		makeUnit("d1", "player", { x: 10, y: 0, z: 12 });

		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(2);

		// Undefended cluster should sort first
		expect(targets[0].threatLevel).toBe(0);
		expect(targets[1].threatLevel).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Centroid computation
// ---------------------------------------------------------------------------

describe("raidTargeting — centroid", () => {
	it("computes centroid of a single cube", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 20 }),
		]);

		const targets = findRaidTargets("feral");
		expect(targets[0].position.x).toBeCloseTo(10);
		expect(targets[0].position.z).toBeCloseTo(20);
	});

	it("computes centroid of multiple cubes", () => {
		vi.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }),
			makeCube("c2", "player", { x: 4, y: 0, z: 0 }),
			makeCube("c3", "player", { x: 2, y: 0, z: 4 }), // all within CLUSTER_RADIUS=6
		]);

		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(1);
		expect(targets[0].position.x).toBeCloseTo(2);    // (0+4+2)/3
		expect(targets[0].position.z).toBeCloseTo(4 / 3); // (0+0+4)/3
	});
});

// ---------------------------------------------------------------------------
// assessRaidViability
// ---------------------------------------------------------------------------

describe("raidTargeting — assessRaidViability", () => {
	it("is viable when force ratio >= 1.5 and force > 0", () => {
		// 2 feral units with 4 components each = force of 8
		makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });
		makeUnit("r2", "feral", { x: -20, y: 0, z: 5 });

		const target = {
			position: { x: 10, y: 0, z: 10 },
			estimatedValue: 10,
			threatLevel: 1, // expectedDefense = 1 * 3 = 3
			cubeCount: 2,
			cubeIds: ["c1", "c2"],
		};

		const result = assessRaidViability("feral", target);
		expect(result.availableForce).toBe(8); // 4 + 4
		expect(result.expectedDefense).toBe(3); // 1 * 3
		expect(result.forceRatio).toBeCloseTo(8 / 3);
		expect(result.viable).toBe(true);
	});

	it("is not viable when force ratio < 1.5", () => {
		// 1 feral unit with 4 components = force of 4
		makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });

		const target = {
			position: { x: 10, y: 0, z: 10 },
			estimatedValue: 10,
			threatLevel: 3, // expectedDefense = 3 * 3 = 9
			cubeCount: 2,
			cubeIds: ["c1", "c2"],
		};

		const result = assessRaidViability("feral", target);
		expect(result.forceRatio).toBeCloseTo(4 / 9);
		expect(result.viable).toBe(false);
	});

	it("is not viable when no attacking units exist", () => {
		const target = {
			position: { x: 10, y: 0, z: 10 },
			estimatedValue: 10,
			threatLevel: 0,
			cubeCount: 1,
			cubeIds: ["c1"],
		};

		const result = assessRaidViability("feral", target);
		expect(result.availableForce).toBe(0);
		expect(result.viable).toBe(false);
	});

	it("returns forceRatio=10 when defenders are 0 and attackers exist", () => {
		makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });

		const target = {
			position: { x: 10, y: 0, z: 10 },
			estimatedValue: 5,
			threatLevel: 0, // expectedDefense = 0
			cubeCount: 1,
			cubeIds: ["c1"],
		};

		const result = assessRaidViability("feral", target);
		expect(result.forceRatio).toBe(10);
		expect(result.viable).toBe(true);
	});

	it("counts only functional components for available force", () => {
		// Unit with 2 of 4 components functional
		makeUnit("r1", "feral", { x: -20, y: 0, z: 0 }, {
			components: makeComponents({ camera: false, arms: false }),
		});

		const target = {
			position: { x: 10, y: 0, z: 10 },
			estimatedValue: 5,
			threatLevel: 0,
			cubeCount: 1,
			cubeIds: ["c1"],
		};

		const result = assessRaidViability("feral", target);
		expect(result.availableForce).toBe(2); // legs + power_cell
	});

	it("only counts units of the attacking faction", () => {
		makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });
		makeUnit("p1", "player", { x: -15, y: 0, z: 0 }); // should not count

		const target = {
			position: { x: 10, y: 0, z: 10 },
			estimatedValue: 5,
			threatLevel: 0,
			cubeCount: 1,
			cubeIds: ["c1"],
		};

		const result = assessRaidViability("feral", target);
		expect(result.availableForce).toBe(4); // only feral's 4 components
	});
});
