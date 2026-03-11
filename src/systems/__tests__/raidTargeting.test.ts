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

// Mock raidSystem to control getCubes()
jest.mock("../raidSystem", () => ({
	getCubes: jest.fn(() => []),
}));

// Mock PerceptionSystem for pile-perception tests
const mockGetVisibleEnemyPiles = jest.fn().mockReturnValue([]);
const mockComputePileDetectionRange = jest.fn().mockImplementation((base: number, count: number) => base * (1 + count * 0.05));
jest.mock("../../ai/PerceptionSystem", () => ({
	getVisibleEnemyPiles: (...args: unknown[]) => mockGetVisibleEnemyPiles(...args),
	computePileDetectionRange: (...args: unknown[]) => mockComputePileDetectionRange(...args),
}));

// Compat layer: defer world access until iteration time to avoid circular init issues
jest.mock("../../ecs/koota/compat", () => ({
	get units() {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("../../ecs/world").units;
	},
}));

import type { Entity, UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";
import type { CubeEntity } from "../raidSystem";
import { getCubes } from "../raidSystem";
import type { CubePile } from "../cubePileTracker";
import { assessRaidViability, findRaidTargets, findRaidTargetsFromPiles } from "../raidTargeting";
import type { PerceivedPile } from "../../ai/PerceptionSystem";

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
	resourceType: string = "scrap_iron",
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
	jest.clearAllMocks();
	jest.mocked(getCubes).mockReturnValue([]);
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
		jest.mocked(getCubes).mockReturnValue([]);
		const targets = findRaidTargets("feral");
		expect(targets).toEqual([]);
	});

	it("returns empty array when all cubes belong to the attacking faction", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "feral", { x: 0, y: 0, z: 0 }),
			makeCube("c2", "feral", { x: 1, y: 0, z: 0 }),
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toEqual([]);
	});

	it("ignores held cubes", () => {
		const cube = makeCube("c1", "player", { x: 0, y: 0, z: 0 });
		(cube as any).heldBy = "some_unit";
		jest.mocked(getCubes).mockReturnValue([cube]);
		const targets = findRaidTargets("feral");
		expect(targets).toEqual([]);
	});

	it("finds enemy cubes (player cubes when attacking as feral)", () => {
		jest.mocked(getCubes).mockReturnValue([
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
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
			makeCube("c2", "player", { x: 12, y: 0, z: 10 }), // dist=2 < 6
			makeCube("c3", "player", { x: 14, y: 0, z: 10 }), // dist=2 from c2, 4 from c1
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(1);
		expect(targets[0].cubeCount).toBe(3);
	});

	it("separates distant cubes into different clusters", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }),
			makeCube("c2", "player", { x: 1, y: 0, z: 0 }), // cluster 1
			makeCube("c3", "player", { x: 50, y: 0, z: 50 }), // cluster 2
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(2);
	});

	it("single-linkage clustering chains cubes", () => {
		// c1 -> c2 -> c3 each within 5 units of next, but c1 to c3 = 10
		jest.mocked(getCubes).mockReturnValue([
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
	it("scores scrap_iron cubes at configured weight", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "scrap_iron", 3),
		]);
		const targets = findRaidTargets("feral");
		// scrap_iron weight = 1, 3 cubes → 1 * 3 = 3
		expect(targets[0].estimatedValue).toBe(3);
	});

	it("scores copper cubes at configured weight", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "copper", 3),
		]);
		const targets = findRaidTargets("feral");
		// copper weight = 2, 3 cubes → 2 * 3 = 6
		expect(targets[0].estimatedValue).toBe(6);
	});

	it("scores titanium cubes at configured weight", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "titanium", 2),
		]);
		const targets = findRaidTargets("feral");
		// titanium weight = 6, 2 cubes → 6 * 2 = 12
		expect(targets[0].estimatedValue).toBe(12);
	});

	it("sums values across a cluster", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 0, y: 0, z: 0 }, "scrap_iron", 2),  // 1*2 = 2
			makeCube("c2", "player", { x: 1, y: 0, z: 0 }, "copper", 3),      // 2*3 = 6
			makeCube("c3", "player", { x: 2, y: 0, z: 0 }, "titanium", 1),    // 6*1 = 6
		]);
		const targets = findRaidTargets("feral");
		expect(targets).toHaveLength(1);
		expect(targets[0].estimatedValue).toBe(14); // 2 + 6 + 6
	});
});

// ---------------------------------------------------------------------------
// Threat assessment (defenders)
// ---------------------------------------------------------------------------

describe("raidTargeting — threat level", () => {
	it("counts player defenders near the stockpile", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		// Place two player defenders nearby
		makeUnit("d1", "player", { x: 10, y: 0, z: 12 });
		makeUnit("d2", "player", { x: 8, y: 0, z: 10 });

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(2);
	});

	it("does not count attacking faction's own units as defenders", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		// Feral unit near the stockpile — should not count as defender
		makeUnit("f1", "feral", { x: 10, y: 0, z: 12 });

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(0);
	});

	it("does not count wildlife as defenders", () => {
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 10 }),
		]);

		makeUnit("w1", "wildlife", { x: 10, y: 0, z: 12 });

		const targets = findRaidTargets("feral");
		expect(targets[0].threatLevel).toBe(0);
	});

	it("does not count units with all components broken", () => {
		jest.mocked(getCubes).mockReturnValue([
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
		jest.mocked(getCubes).mockReturnValue([
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
		jest.mocked(getCubes).mockReturnValue([
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
		jest.mocked(getCubes).mockReturnValue([
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
		jest.mocked(getCubes).mockReturnValue([
			makeCube("c1", "player", { x: 10, y: 0, z: 20 }),
		]);

		const targets = findRaidTargets("feral");
		expect(targets[0].position.x).toBeCloseTo(10);
		expect(targets[0].position.z).toBeCloseTo(20);
	});

	it("computes centroid of multiple cubes", () => {
		jest.mocked(getCubes).mockReturnValue([
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

// ---------------------------------------------------------------------------
// findRaidTargetsFromPiles (§6.4 — pile-based governor raid discovery)
// ---------------------------------------------------------------------------

function makeCubePile(
	pileId: string,
	ownerFaction: string,
	cubeCount: number,
	totalEconomicValue: number,
	cx: number,
	cz: number,
): CubePile {
	return {
		pileId,
		center: { x: cx, y: 0, z: cz },
		cubeCount,
		materialBreakdown: {},
		totalEconomicValue,
		ownerFaction,
		topY: 0,
	};
}

function makePerceivedPile(
	pile: CubePile,
	effectiveRange = 20,
	distance = 10,
): PerceivedPile {
	return { pile, effectiveRange, distance };
}

describe("findRaidTargetsFromPiles", () => {
	beforeEach(() => {
		mockGetVisibleEnemyPiles.mockReturnValue([]);
		jest.clearAllMocks();
	});

	it("returns empty array when no piles are visible", () => {
		mockGetVisibleEnemyPiles.mockReturnValue([]);

		const result = findRaidTargetsFromPiles("reclaimers", { x: 0, z: 0 }, 20, []);
		expect(result).toEqual([]);
	});

	it("converts visible piles to RaidTargets", () => {
		const pile = makeCubePile("p1", "volt_collective", 10, 500, 20, 0);
		mockGetVisibleEnemyPiles.mockReturnValue([makePerceivedPile(pile)]);

		const result = findRaidTargetsFromPiles("reclaimers", { x: 0, z: 0 }, 20, [pile]);

		expect(result.length).toBe(1);
		expect(result[0].cubeCount).toBe(10);
		expect(result[0].estimatedValue).toBe(500);
		expect(result[0].position).toEqual(pile.center);
	});

	it("filters out own faction piles via getVisibleEnemyPiles filtering", () => {
		const ownPile = makeCubePile("own", "reclaimers", 5, 100, 10, 0);
		// getVisibleEnemyPiles was already passed only enemy piles — function filters before calling
		mockGetVisibleEnemyPiles.mockReturnValue([]); // no visible enemy piles

		const result = findRaidTargetsFromPiles("reclaimers", { x: 0, z: 0 }, 20, [ownPile]);
		expect(result).toEqual([]);
	});

	it("sorts results by composite score: value / (1 + threat)", () => {
		const richPile = makeCubePile("rich", "enemy", 5, 1000, 10, 0);
		const cheapPile = makeCubePile("cheap", "enemy", 5, 100, 15, 0);

		mockGetVisibleEnemyPiles.mockReturnValue([
			makePerceivedPile(cheapPile),
			makePerceivedPile(richPile),
		]);

		const result = findRaidTargetsFromPiles("reclaimers", { x: 0, z: 0 }, 20, [richPile, cheapPile]);

		// richPile should be sorted first (higher value, no defenders)
		expect(result[0].estimatedValue).toBe(1000);
		expect(result[1].estimatedValue).toBe(100);
	});

	it("cubeIds is empty for pile-based targets (piles don't carry individual IDs)", () => {
		const pile = makeCubePile("p1", "enemy", 5, 100, 10, 0);
		mockGetVisibleEnemyPiles.mockReturnValue([makePerceivedPile(pile)]);

		const result = findRaidTargetsFromPiles("reclaimers", { x: 0, z: 0 }, 20, [pile]);

		expect(result[0].cubeIds).toEqual([]);
	});

	it("calls getVisibleEnemyPiles with observer position, base range, and enemy-only piles", () => {
		const ownPile = makeCubePile("own", "reclaimers", 5, 100, 0, 0);
		const enemyPile = makeCubePile("enemy", "volt_collective", 5, 200, 10, 0);
		mockGetVisibleEnemyPiles.mockReturnValue([]);

		findRaidTargetsFromPiles("reclaimers", { x: 50, z: 50 }, 30, [ownPile, enemyPile]);

		expect(mockGetVisibleEnemyPiles).toHaveBeenCalledWith(
			{ x: 50, z: 50 },
			30,
			[enemyPile], // only enemy pile passed
		);
	});

	it("multiple visible piles all become raid targets", () => {
		const piles = [
			makeCubePile("p1", "enemy", 5, 100, 10, 0),
			makeCubePile("p2", "enemy", 5, 200, 15, 0),
			makeCubePile("p3", "enemy", 5, 300, 20, 0),
		];
		mockGetVisibleEnemyPiles.mockReturnValue(
			piles.map((p) => makePerceivedPile(p)),
		);

		const result = findRaidTargetsFromPiles("reclaimers", { x: 0, z: 0 }, 50, piles);

		expect(result.length).toBe(3);
	});
});
