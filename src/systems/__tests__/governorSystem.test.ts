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
	gameplayRandom: jest.fn(() => 0.5),
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
	getConstructionEvents,
	getHarvestEvents,
	getTerritoryChangeEvents,
	resetAICivilization,
} from "../aiCivilization";
import {
	getFactionActivityFeed,
	resetFactionActivityFeed,
} from "../factionActivityFeed";
import {
	governorSystem,
	initializeGovernor,
	resetGovernorSystem,
} from "../governorSystem";

describe("governorSystem", () => {
	beforeEach(() => {
		resetAICivilization();
		resetFactionActivityFeed();
		resetGovernorSystem();
		mockSpawn.mockClear();
		mockSpawn.mockReturnValue({ set: jest.fn() });
	});

	it("does nothing before initialization", () => {
		governorSystem(30);
		expect(getFactionActivityFeed()).toHaveLength(0);
	});

	it("does nothing on non-interval ticks", () => {
		initializeGovernor();
		// Tick 1 is not a multiple of 30
		governorSystem(1);
		expect(getFactionActivityFeed()).toHaveLength(0);
	});

	it("evaluates decisions on interval ticks", () => {
		initializeGovernor();

		// Run at a large enough tick that cooldowns have passed
		// Governor interval is 30, so tick 300 is a valid evaluation point
		// We need ticks large enough that build/expand/harvest cooldowns are met
		governorSystem(300);

		const feed = getFactionActivityFeed();
		// At least some factions should have acted
		expect(feed.length).toBeGreaterThan(0);
	});

	it("produces construction events from AI decisions", () => {
		initializeGovernor();

		// Run enough governor ticks for builds to happen
		for (let tick = 300; tick <= 3000; tick += 30) {
			governorSystem(tick);
		}

		const events = getConstructionEvents();
		// Over many ticks, at least one faction should build
		expect(events.length).toBeGreaterThan(0);
	});

	it("produces territory change events from AI expand decisions", () => {
		initializeGovernor();

		for (let tick = 300; tick <= 3000; tick += 30) {
			governorSystem(tick);
		}

		const events = getTerritoryChangeEvents();
		expect(events.length).toBeGreaterThan(0);
	});

	it("produces harvest events from AI harvest decisions", () => {
		initializeGovernor();

		for (let tick = 300; tick <= 3000; tick += 30) {
			governorSystem(tick);
		}

		const events = getHarvestEvents();
		expect(events.length).toBeGreaterThan(0);
	});

	it("activity feed captures events with correct structure", () => {
		initializeGovernor();

		for (let tick = 300; tick <= 5000; tick += 30) {
			governorSystem(tick);
		}

		const feed = getFactionActivityFeed();
		expect(feed.length).toBeGreaterThan(0);

		// Verify event structure
		for (const event of feed) {
			expect(event).toHaveProperty("turn");
			expect(event).toHaveProperty("faction");
			expect(event).toHaveProperty("action");
			expect(event).toHaveProperty("position");
			expect(typeof event.turn).toBe("number");
			expect(typeof event.faction).toBe("string");
			expect(typeof event.position.x).toBe("number");
			expect(typeof event.position.z).toBe("number");
		}

		// Verify events come from multiple factions
		const factionIds = new Set(feed.map((e) => e.faction));
		expect(factionIds.size).toBeGreaterThan(1);
	});

	it("resetGovernorSystem prevents further decisions", () => {
		initializeGovernor();
		resetGovernorSystem();

		governorSystem(300);
		expect(getFactionActivityFeed()).toHaveLength(0);
	});
});
