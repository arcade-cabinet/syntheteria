import {
	computeSpawnRegions,
	findPassableCell,
	resetFactionSpawning,
	spawnRivalFactions,
	getFactionUnitIds,
	getAllFactionSpawns,
} from "./factionSpawning";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("../bots", () => ({
	createBotUnitState: jest.fn((args: any) => ({
		type: args.unitType,
		archetypeId: "mock_archetype",
		markLevel: 1,
		speechProfile: "mentor",
		displayName: args.displayName ?? "Unit",
		speed: args.speed ?? 3,
		selected: false,
		components: args.components ?? [],
	})),
	getBotDefinition: jest.fn((type: string) => ({
		unitType: type,
		label: type,
		model: "test.glb",
		scale: 1,
		baseSpeed: 3,
		powerDemand: 0.5,
		movingPowerBonus: 0.3,
		archetypeId: "mock",
		defaultSpeechProfile: "mentor",
		startingFaction: "player",
		defaultAiRole: "player_unit",
		steeringProfile: "biped_scout",
		navigationProfile: "sector_surface_standard",
		role: "scout",
		markScaling: "vision",
	})),
}));

jest.mock("../ecs/traits", () => ({
	AIController: "AIController",
	Identity: "Identity",
	MapFragment: "MapFragment",
	Navigation: "Navigation",
	Unit: "Unit",
	WorldPosition: "WorldPosition",
}));

function makeMockEntity(): any {
	const traits = new Map<string, any>();
	const mockEntity: any = {
		_traits: traits,
		set: jest.fn((trait: string, value: any) => {
			traits.set(trait, value);
		}),
		get: jest.fn((trait: string) => traits.get(trait)),
	};
	return mockEntity;
}

const mockEntities: any[] = [];
jest.mock("../ecs/world", () => ({
	world: {
		spawn: jest.fn((..._traits: any[]) => {
			const entity = makeMockEntity();
			entity.id = `mock_${mockEntities.length}`;
			mockEntities.push(entity);
			return entity;
		}),
	},
}));

jest.mock("../ecs/seed", () => ({
	gameplayRandom: jest.fn(() => 0.5),
}));

jest.mock("../world/sectorCoordinates", () => ({
	getWorldDimensions: jest.fn(() => ({ width: 40, height: 40 })),
	gridToWorld: jest.fn((q: number, r: number) => ({ x: q * 2, y: 0, z: r * 2 })),
	SECTOR_LATTICE_SIZE: 2,
}));

const mockSectorCells = new Map<string, any>();
jest.mock("../world/structuralSpace", () => ({
	getSectorCell: jest.fn((q: number, r: number) => {
		const key = `${q},${r}`;
		return mockSectorCells.get(key) ?? { passable: true, discovery_state: 0 };
	}),
	requirePrimaryStructuralFragment: jest.fn(() => ({
		id: "world_primary",
	})),
	getSurfaceHeightAtWorldPosition: jest.fn(() => 0),
}));

jest.mock("../ai/governor/factionGovernors", () => ({
	RIVAL_FACTIONS: [
		{ factionName: "reclaimers", economyId: "rogue", label: "Reclaimers" },
		{ factionName: "volt_collective", economyId: "feral", label: "Volt Collective" },
		{ factionName: "iron_creed", economyId: "cultist", label: "Iron Creed" },
	],
}));

jest.mock("./factionEconomy", () => ({
	seedFactionResources: jest.fn(),
}));

jest.mock("./turnSystem", () => ({
	addUnitsToTurnState: jest.fn(),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockEntities.length = 0;
	mockSectorCells.clear();
	resetFactionSpawning();
});

describe("computeSpawnRegions", () => {
	it("returns 3 regions for 3 rival factions", () => {
		const regions = computeSpawnRegions(40, 40);
		expect(regions).toHaveLength(3);
	});

	it("places regions in different quadrants", () => {
		const regions = computeSpawnRegions(40, 40);
		// All regions should be unique positions
		const keys = regions.map((r) => `${r.centerQ},${r.centerR}`);
		const uniqueKeys = new Set(keys);
		expect(uniqueKeys.size).toBe(3);
	});

	it("respects margin from world edges", () => {
		const regions = computeSpawnRegions(40, 40);
		const halfW = 20;
		const halfH = 20;
		for (const region of regions) {
			expect(Math.abs(region.centerQ)).toBeLessThanOrEqual(halfW);
			expect(Math.abs(region.centerR)).toBeLessThanOrEqual(halfH);
		}
	});
});

describe("findPassableCell", () => {
	it("returns target if passable", () => {
		mockSectorCells.set("5,5", { passable: true, discovery_state: 0 });
		const result = findPassableCell(5, 5, 3);
		expect(result).toEqual({ q: 5, r: 5 });
	});

	it("returns null if no passable cells in radius", () => {
		// All cells impassable
		for (let dq = -5; dq <= 5; dq++) {
			for (let dr = -5; dr <= 5; dr++) {
				mockSectorCells.set(`${10 + dq},${10 + dr}`, {
					passable: false,
					discovery_state: 0,
				});
			}
		}
		const result = findPassableCell(10, 10, 3);
		expect(result).toBeNull();
	});

	it("spirals outward to find passable cell", () => {
		// Center is impassable, but neighbor is passable
		mockSectorCells.set("5,5", { passable: false, discovery_state: 0 });
		mockSectorCells.set("5,6", { passable: true, discovery_state: 0 });
		const result = findPassableCell(5, 5, 3);
		expect(result).not.toBeNull();
	});
});

describe("spawnRivalFactions", () => {
	it("spawns entities for each rival faction", () => {
		const result = spawnRivalFactions();
		// 3 factions, 4 units each (2 scouts, 1 fab, 1 guardian)
		expect(mockEntities.length).toBe(12);
		expect(result.size).toBe(3);
	});

	it("assigns correct faction to each unit", () => {
		spawnRivalFactions();
		// Each entity gets Identity.set called with the faction's economyId
		const factions = mockEntities.map(
			(e) => e._traits.get("Identity")?.faction,
		);
		const rogueCount = factions.filter((f: string) => f === "rogue").length;
		const feralCount = factions.filter((f: string) => f === "feral").length;
		const cultistCount = factions.filter((f: string) => f === "cultist").length;
		expect(rogueCount).toBe(4);
		expect(feralCount).toBe(4);
		expect(cultistCount).toBe(4);
	});

	it("returns entity IDs keyed by faction name", () => {
		const result = spawnRivalFactions();
		expect(result.has("reclaimers")).toBe(true);
		expect(result.has("volt_collective")).toBe(true);
		expect(result.has("iron_creed")).toBe(true);
		expect(result.get("reclaimers")!.length).toBe(4);
	});

	it("getFactionUnitIds works after spawn", () => {
		spawnRivalFactions();
		expect(getFactionUnitIds("reclaimers").length).toBe(4);
		expect(getFactionUnitIds("nonexistent").length).toBe(0);
	});

	it("resetFactionSpawning clears state", () => {
		spawnRivalFactions();
		expect(getAllFactionSpawns().size).toBe(3);
		resetFactionSpawning();
		expect(getAllFactionSpawns().size).toBe(0);
	});
});
