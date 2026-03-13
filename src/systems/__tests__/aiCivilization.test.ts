const mockSpawn = jest.fn(() => ({
	set: jest.fn(),
}));

jest.mock("../../ecs/world", () => ({
	world: {
		spawn: mockSpawn,
		entities: [],
		query: jest.fn(() => []),
	},
	units: {
		[Symbol.iterator]: function* () {},
		filter: () => [],
		find: () => undefined,
		get length() {
			return 0;
		},
		map: () => [],
		toArray: () => [],
	},
	buildings: {
		[Symbol.iterator]: function* () {},
		filter: () => [],
		find: () => undefined,
		get length() {
			return 0;
		},
		map: () => [],
		toArray: () => [],
	},
}));

jest.mock("../../world/sectorCoordinates", () => ({
	gridToWorld: jest.fn((q: number, r: number) => ({ x: q, y: 0, z: r })),
	worldToGrid: jest.fn((x: number, z: number) => ({
		q: Math.round(x),
		r: Math.round(z),
	})),
	SECTOR_LATTICE_SIZE: 2,
}));

jest.mock("../../world/structuralSpace", () => ({
	getSurfaceHeightAtWorldPosition: jest.fn(() => 0),
	isPassableAtWorldPosition: jest.fn(() => true),
}));

jest.mock("../../ecs/seed", () => ({
	gameplayRandom: jest.fn(() => 0.3),
}));

jest.mock("../../ecs/traits", () => ({
	AIController: "AIController",
	Building: "Building",
	Identity: "Identity",
	LightningRod: "LightningRod",
	MapFragment: "MapFragment",
	Navigation: "Navigation",
	Unit: "Unit",
	WorldPosition: "WorldPosition",
}));

import {
	aiFactionBuild,
	aiFactionDeployScout,
	aiFactionExpand,
	aiFactionHarvest,
	getAIFactionState,
	getAllAIFactions,
	getConstructionEvents,
	getHarvestEvents,
	getTerritoryChangeEvents,
	initializeAIFactions,
	resetAICivilization,
} from "../aiCivilization";
import {
	getFactionActivityFeed,
	resetFactionActivityFeed,
} from "../factionActivityFeed";

describe("aiCivilization", () => {
	beforeEach(() => {
		resetAICivilization();
		resetFactionActivityFeed();
		mockSpawn.mockClear();
		mockSpawn.mockReturnValue({ set: jest.fn() });
		initializeAIFactions();
	});

	describe("initialization", () => {
		it("creates all 4 AI factions", () => {
			const factions = getAllAIFactions();
			expect(factions.size).toBe(4);
			expect(factions.has("reclaimers")).toBe(true);
			expect(factions.has("volt_collective")).toBe(true);
			expect(factions.has("signal_choir")).toBe(true);
			expect(factions.has("iron_creed")).toBe(true);
		});

		it("each faction starts with initial territory cells", () => {
			for (const [, state] of getAllAIFactions()) {
				expect(state.territoryCells.size).toBeGreaterThan(0);
			}
		});

		it("each faction starts with 10 resources", () => {
			for (const [, state] of getAllAIFactions()) {
				expect(state.resources).toBe(10);
			}
		});
	});

	describe("aiFactionBuild", () => {
		it("produces a construction event", () => {
			const result = aiFactionBuild(
				"reclaimers",
				{ x: 5, z: 10 },
				"fabrication_unit",
				200,
			);

			expect(result).toBe(true);
			const events = getConstructionEvents();
			expect(events).toHaveLength(1);
			expect(events[0].faction).toBe("reclaimers");
			expect(events[0].buildingType).toBe("fabrication_unit");
			expect(events[0].position).toEqual({ x: 5, z: 10 });
		});

		it("spawns a building entity via world.spawn", () => {
			aiFactionBuild("reclaimers", { x: 5, z: 10 }, "fabrication_unit", 200);
			expect(mockSpawn).toHaveBeenCalled();
		});

		it("records event to activity feed", () => {
			aiFactionBuild("reclaimers", { x: 5, z: 10 }, "fabrication_unit", 200);

			const feed = getFactionActivityFeed();
			expect(feed).toHaveLength(1);
			expect(feed[0].faction).toBe("reclaimers");
			expect(feed[0].action).toBe("build");
		});

		it("increments building count", () => {
			aiFactionBuild("reclaimers", { x: 5, z: 10 }, "fabrication_unit", 200);
			const state = getAIFactionState("reclaimers");
			expect(state?.buildingCount).toBe(1);
		});

		it("respects build cooldown", () => {
			aiFactionBuild("reclaimers", { x: 5, z: 10 }, "fabrication_unit", 200);
			// Too soon — should fail
			const result = aiFactionBuild(
				"reclaimers",
				{ x: 8, z: 12 },
				"fabrication_unit",
				210,
			);
			expect(result).toBe(false);
			expect(getConstructionEvents()).toHaveLength(1);
		});

		it("respects max building limit", () => {
			// Build up to the limit
			for (let i = 0; i < 8; i++) {
				aiFactionBuild(
					"reclaimers",
					{ x: i, z: i },
					"fabrication_unit",
					200 + i * 200,
				);
			}

			// Should fail — at limit
			const result = aiFactionBuild(
				"reclaimers",
				{ x: 100, z: 100 },
				"fabrication_unit",
				2000,
			);
			expect(result).toBe(false);
		});
	});

	describe("aiFactionExpand", () => {
		it("updates territory borders", () => {
			const stateBefore = getAIFactionState("volt_collective");
			const sizeBefore = stateBefore?.territoryCells.size ?? 0;

			const result = aiFactionExpand("volt_collective", 200);
			expect(result).toBe(true);

			const stateAfter = getAIFactionState("volt_collective");
			expect(stateAfter?.territoryCells.size).toBeGreaterThan(sizeBefore);
		});

		it("produces territory change events", () => {
			aiFactionExpand("volt_collective", 200);

			const events = getTerritoryChangeEvents();
			expect(events).toHaveLength(1);
			expect(events[0].faction).toBe("volt_collective");
			expect(events[0].cells.length).toBeGreaterThan(0);
		});

		it("records event to activity feed", () => {
			aiFactionExpand("volt_collective", 200);

			const feed = getFactionActivityFeed();
			expect(feed).toHaveLength(1);
			expect(feed[0].faction).toBe("volt_collective");
			expect(feed[0].action).toBe("expand");
		});
	});

	describe("aiFactionHarvest", () => {
		it("increases faction resources", () => {
			const before = getAIFactionState("signal_choir")?.resources ?? 0;
			aiFactionHarvest("signal_choir", { x: 10, z: 10 }, 200);
			const after = getAIFactionState("signal_choir")?.resources ?? 0;
			expect(after).toBeGreaterThan(before);
		});

		it("produces harvest events", () => {
			aiFactionHarvest("signal_choir", { x: 10, z: 10 }, 200);

			const events = getHarvestEvents();
			expect(events).toHaveLength(1);
			expect(events[0].faction).toBe("signal_choir");
			expect(events[0].position).toEqual({ x: 10, z: 10 });
		});

		it("records event to activity feed", () => {
			aiFactionHarvest("signal_choir", { x: 10, z: 10 }, 200);

			const feed = getFactionActivityFeed();
			expect(feed).toHaveLength(1);
			expect(feed[0].action).toBe("harvest");
		});
	});

	describe("aiFactionDeployScout", () => {
		it("spawns a scout entity", () => {
			aiFactionDeployScout("iron_creed", { x: 15, z: 15 }, 200);
			expect(mockSpawn).toHaveBeenCalled();
		});

		it("increments scout count", () => {
			aiFactionDeployScout("iron_creed", { x: 15, z: 15 }, 200);
			const state = getAIFactionState("iron_creed");
			expect(state?.scoutCount).toBe(1);
		});

		it("records event to activity feed", () => {
			aiFactionDeployScout("iron_creed", { x: 15, z: 15 }, 200);

			const feed = getFactionActivityFeed();
			expect(feed).toHaveLength(1);
			expect(feed[0].faction).toBe("iron_creed");
			expect(feed[0].action).toBe("scout");
		});
	});

	describe("reset", () => {
		it("clears all state", () => {
			aiFactionBuild("reclaimers", { x: 5, z: 10 }, "fabrication_unit", 200);
			resetAICivilization();

			expect(getAllAIFactions().size).toBe(0);
			expect(getConstructionEvents()).toHaveLength(0);
			expect(getTerritoryChangeEvents()).toHaveLength(0);
			expect(getHarvestEvents()).toHaveLength(0);
		});
	});
});
