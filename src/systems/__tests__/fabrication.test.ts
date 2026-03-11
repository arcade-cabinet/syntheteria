/**
 * Unit tests for the fabrication system.
 *
 * Tests cover:
 * - RECIPES constant structure and completeness
 * - Starting fabrication jobs (validation, resource spending, queueing)
 * - Fabrication system tick (progress, completion, resource output)
 * - Edge cases: unpowered fabricator, duplicate jobs, missing resources
 * - getActiveJobs returns copies
 */

import type { BuildingEntity, Entity } from "../../ecs/types";

// ---------------------------------------------------------------------------
// Mock ECS world collections
// ---------------------------------------------------------------------------

const mockBuildings: BuildingEntity[] = [];
jest.mock("../../ecs/world", () => ({
	buildings: mockBuildings,
	world: [],
}));

// Also mock the Koota compat layer (fabrication.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
	buildings: mockBuildings,
}));

// Import after mocking
import {
	RECIPES,
	fabricationSystem,
	getActiveJobs,
	startFabrication,
} from "../fabrication";
import {
	addResource,
	getResources,
	resetResourcePool,
} from "../resources";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFabricator(
	id: string,
	opts: { powered?: boolean; operational?: boolean } = {},
): Entity {
	const entity: Entity = {
		id,
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		building: {
			type: "fabrication_unit",
			powered: opts.powered ?? true,
			operational: opts.operational ?? true,
			selected: false,
			components: [],
		},
	};
	mockBuildings.push(entity as BuildingEntity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockBuildings.length = 0;
	// Clear any leftover active jobs by running fabrication until empty
	const jobs = getActiveJobs();
	if (jobs.length > 0) {
		for (const job of jobs) {
			mockBuildings.push({
				id: job.fabricatorId,
				faction: "player",
				worldPosition: { x: 0, y: 0, z: 0 },
				building: {
					type: "fabrication_unit",
					powered: true,
					operational: true,
					selected: false,
					components: [],
				},
			} as BuildingEntity);
		}
		for (let i = 0; i < 20; i++) {
			fabricationSystem();
		}
		mockBuildings.length = 0;
	}
	// Reset resources AFTER draining jobs (draining adds intactComponents)
	resetResourcePool();
});

afterEach(() => {
	mockBuildings.length = 0;
});

// ---------------------------------------------------------------------------
// RECIPES constant
// ---------------------------------------------------------------------------

describe("RECIPES", () => {
	it("contains 5 recipes", () => {
		expect(RECIPES).toHaveLength(5);
	});

	it("Camera Module recipe requires eWaste and intactComponents", () => {
		const recipe = RECIPES.find((r) => r.name === "Camera Module");
		expect(recipe).toBeDefined();
		expect(recipe!.outputComponent).toBe("camera");
		expect(recipe!.outputMaterial).toBe("electronic");
		expect(recipe!.costs).toEqual([
			{ type: "eWaste", amount: 4 },
			{ type: "intactComponents", amount: 1 },
		]);
		expect(recipe!.buildTime).toBe(8);
	});

	it("Arm Assembly recipe costs scrapMetal", () => {
		const recipe = RECIPES.find((r) => r.name === "Arm Assembly");
		expect(recipe).toBeDefined();
		expect(recipe!.costs).toEqual([{ type: "scrapMetal", amount: 5 }]);
		expect(recipe!.buildTime).toBe(6);
	});

	it("Power Cell recipe requires eWaste and scrapMetal", () => {
		const recipe = RECIPES.find((r) => r.name === "Power Cell");
		expect(recipe).toBeDefined();
		expect(recipe!.costs).toEqual([
			{ type: "eWaste", amount: 3 },
			{ type: "scrapMetal", amount: 2 },
		]);
	});

	it("all recipes have positive buildTime", () => {
		for (const recipe of RECIPES) {
			expect(recipe.buildTime).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// startFabrication
// ---------------------------------------------------------------------------

describe("startFabrication", () => {
	it("returns true and queues a job when valid", () => {
		const fab = makeFabricator("fab-1");
		addResource("scrapMetal", 10);

		const result = startFabrication(fab, "Arm Assembly");

		expect(result).toBe(true);
		const jobs = getActiveJobs();
		expect(jobs).toHaveLength(1);
		expect(jobs[0].fabricatorId).toBe("fab-1");
		expect(jobs[0].recipe.name).toBe("Arm Assembly");
		expect(jobs[0].ticksRemaining).toBe(6);
	});

	it("spends resources on start", () => {
		makeFabricator("fab-1");
		addResource("scrapMetal", 10);

		startFabrication(
			{ id: "fab-1", faction: "player", building: { type: "fabrication_unit", powered: true, operational: true, selected: false, components: [] } } as Entity,
			"Arm Assembly",
		);

		const pool = getResources();
		expect(pool.scrapMetal).toBe(5); // 10 - 5
	});

	it("returns false for non-fabrication_unit building", () => {
		const entity: Entity = {
			id: "not-fab",
			faction: "player",
			building: {
				type: "outpost",
				powered: true,
				operational: true,
				selected: false,
				components: [],
			},
		};

		const result = startFabrication(entity, "Arm Assembly");
		expect(result).toBe(false);
	});

	it("returns false when unpowered", () => {
		const fab = makeFabricator("fab-2", { powered: false });
		addResource("scrapMetal", 10);

		const result = startFabrication(fab, "Arm Assembly");
		expect(result).toBe(false);
	});

	it("returns false when not operational", () => {
		const fab = makeFabricator("fab-3", { operational: false });
		addResource("scrapMetal", 10);

		const result = startFabrication(fab, "Arm Assembly");
		expect(result).toBe(false);
	});

	it("returns false for unknown recipe", () => {
		const fab = makeFabricator("fab-4");
		addResource("scrapMetal", 100);

		const result = startFabrication(fab, "Nonexistent Recipe");
		expect(result).toBe(false);
	});

	it("returns false when insufficient resources", () => {
		const fab = makeFabricator("fab-5");
		addResource("scrapMetal", 2); // Need 5 for Arm Assembly

		const result = startFabrication(fab, "Arm Assembly");
		expect(result).toBe(false);
	});

	it("does not spend resources when insufficient", () => {
		const fab = makeFabricator("fab-6");
		addResource("scrapMetal", 2);

		startFabrication(fab, "Arm Assembly");

		const pool = getResources();
		expect(pool.scrapMetal).toBe(2); // unchanged
	});

	it("returns false when fabricator already has a job", () => {
		const fab = makeFabricator("fab-7");
		addResource("scrapMetal", 20);

		expect(startFabrication(fab, "Arm Assembly")).toBe(true);
		expect(startFabrication(fab, "Leg Assembly")).toBe(false);
	});

	it("allows different fabricators to have concurrent jobs", () => {
		const fab1 = makeFabricator("fab-a");
		const fab2 = makeFabricator("fab-b");
		addResource("scrapMetal", 20);

		expect(startFabrication(fab1, "Arm Assembly")).toBe(true);
		expect(startFabrication(fab2, "Leg Assembly")).toBe(true);
		expect(getActiveJobs()).toHaveLength(2);
	});

	it("handles multi-resource cost (Power Cell)", () => {
		const fab = makeFabricator("fab-8");
		addResource("eWaste", 3);
		addResource("scrapMetal", 2);

		const result = startFabrication(fab, "Power Cell");
		expect(result).toBe(true);

		const pool = getResources();
		expect(pool.eWaste).toBe(0);
		expect(pool.scrapMetal).toBe(0);
	});

	it("fails when one of multiple costs is not met", () => {
		const fab = makeFabricator("fab-9");
		addResource("eWaste", 3);
		addResource("scrapMetal", 0); // Need 2

		const result = startFabrication(fab, "Power Cell");
		expect(result).toBe(false);
	});

	it("returns false when entity has no building component", () => {
		const entity: Entity = { id: "no-building", faction: "player" };
		expect(startFabrication(entity, "Arm Assembly")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getActiveJobs
// ---------------------------------------------------------------------------

describe("getActiveJobs", () => {
	it("returns empty array when no jobs", () => {
		expect(getActiveJobs()).toEqual([]);
	});

	it("returns a copy (not the internal array)", () => {
		const fab = makeFabricator("fab-copy");
		addResource("scrapMetal", 10);
		startFabrication(fab, "Arm Assembly");

		const jobs1 = getActiveJobs();
		const jobs2 = getActiveJobs();
		expect(jobs1).not.toBe(jobs2);
		expect(jobs1).toEqual(jobs2);
	});
});

// ---------------------------------------------------------------------------
// fabricationSystem tick
// ---------------------------------------------------------------------------

describe("fabricationSystem", () => {
	it("decrements ticksRemaining each tick when fabricator is powered", () => {
		const fab = makeFabricator("fab-tick");
		addResource("scrapMetal", 10);
		startFabrication(fab, "Arm Assembly"); // buildTime = 6

		fabricationSystem();

		const jobs = getActiveJobs();
		expect(jobs[0].ticksRemaining).toBe(5);
	});

	it("completes job and adds intactComponents when done", () => {
		const fab = makeFabricator("fab-complete");
		addResource("scrapMetal", 10);
		startFabrication(fab, "Arm Assembly"); // buildTime = 6

		for (let i = 0; i < 6; i++) {
			fabricationSystem();
		}

		expect(getActiveJobs()).toHaveLength(0);
		const pool = getResources();
		expect(pool.intactComponents).toBe(1);
	});

	it("pauses when fabricator loses power (does not advance)", () => {
		const fab = makeFabricator("fab-pause");
		addResource("scrapMetal", 10);
		startFabrication(fab, "Arm Assembly"); // buildTime = 6

		// Run 2 ticks powered
		fabricationSystem();
		fabricationSystem();
		expect(getActiveJobs()[0].ticksRemaining).toBe(4);

		// Unpower the fabricator
		fab.building!.powered = false;

		// Run 3 more ticks — should not advance
		fabricationSystem();
		fabricationSystem();
		fabricationSystem();
		expect(getActiveJobs()[0].ticksRemaining).toBe(4);
	});

	it("resumes when fabricator regains power", () => {
		const fab = makeFabricator("fab-resume");
		addResource("scrapMetal", 10);
		startFabrication(fab, "Arm Assembly");

		fabricationSystem(); // ticks = 5

		fab.building!.powered = false;
		fabricationSystem(); // paused, ticks = 5

		fab.building!.powered = true;
		fabricationSystem(); // ticks = 4
		expect(getActiveJobs()[0].ticksRemaining).toBe(4);
	});

	it("handles multiple concurrent jobs independently", () => {
		const fab1 = makeFabricator("fab-m1");
		const fab2 = makeFabricator("fab-m2");
		addResource("scrapMetal", 20);

		startFabrication(fab1, "Arm Assembly"); // buildTime = 6
		startFabrication(fab2, "Leg Assembly"); // buildTime = 5

		for (let i = 0; i < 5; i++) {
			fabricationSystem();
		}

		// Leg Assembly should be done (5 ticks)
		// Arm Assembly should have 1 tick remaining
		const jobs = getActiveJobs();
		expect(jobs).toHaveLength(1);
		expect(jobs[0].recipe.name).toBe("Arm Assembly");
		expect(jobs[0].ticksRemaining).toBe(1);
		expect(getResources().intactComponents).toBe(1);
	});

	it("does nothing when there are no active jobs", () => {
		expect(() => fabricationSystem()).not.toThrow();
	});

	it("does not cancel job when fabricator is removed from buildings list", () => {
		const fab = makeFabricator("fab-removed");
		addResource("scrapMetal", 10);
		startFabrication(fab, "Arm Assembly");

		fabricationSystem(); // ticks = 5

		// Remove fabricator from buildings list
		mockBuildings.length = 0;

		// Job should pause, not cancel
		fabricationSystem();
		fabricationSystem();

		const jobs = getActiveJobs();
		expect(jobs).toHaveLength(1);
		expect(jobs[0].ticksRemaining).toBe(5); // unchanged since unpowered
	});
});
