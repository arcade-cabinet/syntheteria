import {
	_reset,
	ADJACENCY_RADIUS,
	ADJACENCY_RULES,
	BUILDING_COSTS,
	cancelPlacement,
	canUnitBuild,
	computeAdjacencyBonuses,
	computeAdjacencyMultiplier,
	confirmPlacement,
	getActivePlacement,
	getBuilderEntityId,
	getGhostPosition,
	type PlaceableType,
	setActivePlacement,
	updateGhostPosition,
} from "./buildingPlacement";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../ecs/cityLayout", () => ({
	isInsideBuilding: jest.fn(() => false),
}));

const mockSpawnedEntity = {
	get: jest.fn((trait: string) => {
		if (trait === "Identity") return { id: "bldg_test_0", faction: "player" };
		return null;
	}),
};
jest.mock("../ecs/factory", () => ({
	spawnFabricationUnit: jest.fn(() => mockSpawnedEntity),
	spawnLightningRod: jest.fn(() => mockSpawnedEntity),
	spawnBuilding: jest.fn(() => mockSpawnedEntity),
}));

jest.mock("./constructionVisualization", () => ({
	startBuildingConstruction: jest.fn(),
}));

const _mockIdentityGet = jest.fn();
const _mockMapFragmentGet = jest.fn();
const _mockWorldPositionGet = jest.fn();
const _mockBuildingGet = jest.fn();
const _mockUnitGet = jest.fn();

jest.mock("../ecs/traits", () => ({
	Building: "Building",
	Identity: "Identity",
	MapFragment: "MapFragment",
	Unit: "Unit",
	WorldPosition: "WorldPosition",
}));

const mockUnits: any[] = [];
const mockBuildings: any[] = [];
const mockLightningRods: any[] = [];

jest.mock("../ecs/world", () => ({
	units: {
		[Symbol.iterator]: () => mockUnits[Symbol.iterator](),
		get length() {
			return mockUnits.length;
		},
	},
	buildings: {
		[Symbol.iterator]: () => mockBuildings[Symbol.iterator](),
		get length() {
			return mockBuildings.length;
		},
	},
	lightningRods: {
		[Symbol.iterator]: () => mockLightningRods[Symbol.iterator](),
		get length() {
			return mockLightningRods.length;
		},
	},
}));

jest.mock("../world/structuralSpace", () => ({
	isPassableAtWorldPosition: jest.fn(() => true),
}));

const mockResources: Record<string, number> = {};
jest.mock("./resources", () => ({
	getResources: jest.fn(() => ({ ...mockResources })),
	spendResource: jest.fn((type: string, amount: number) => {
		if ((mockResources[type] ?? 0) < amount) return false;
		mockResources[type] = (mockResources[type] ?? 0) - amount;
		return true;
	}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(overrides: {
	id?: string;
	faction?: string;
	fragmentId?: string;
	x?: number;
	z?: number;
	unitType?: string;
	buildingType?: string;
}) {
	return {
		get: (trait: string) => {
			if (trait === "Identity")
				return {
					id: overrides.id ?? "e1",
					faction: overrides.faction ?? "player",
				};
			if (trait === "MapFragment")
				return { fragmentId: overrides.fragmentId ?? "frag_0" };
			if (trait === "WorldPosition")
				return { x: overrides.x ?? 0, y: 0, z: overrides.z ?? 0 };
			if (trait === "Unit" && overrides.unitType)
				return { type: overrides.unitType };
			if (trait === "Building" && overrides.buildingType)
				return { type: overrides.buildingType };
			return null;
		},
	};
}

function setResources(values: Record<string, number>) {
	Object.keys(mockResources).forEach((k) => delete mockResources[k]);
	Object.assign(mockResources, values);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	_reset();
	mockUnits.length = 0;
	mockBuildings.length = 0;
	mockLightningRods.length = 0;
	setResources({});
});

describe("buildingPlacement", () => {
	describe("PlaceableType union", () => {
		it("includes all 8 building types", () => {
			const types: PlaceableType[] = [
				"lightning_rod",
				"fabrication_unit",
				"motor_pool",
				"relay_tower",
				"defense_turret",
				"power_sink",
				"storage_hub",
				"habitat_module",
				null,
			];
			expect(types).toHaveLength(9);
		});
	});

	describe("BUILDING_COSTS", () => {
		it("defines costs for all 8 building types", () => {
			expect(Object.keys(BUILDING_COSTS)).toHaveLength(8);
			expect(BUILDING_COSTS.lightning_rod).toBeDefined();
			expect(BUILDING_COSTS.fabrication_unit).toBeDefined();
			expect(BUILDING_COSTS.motor_pool).toBeDefined();
			expect(BUILDING_COSTS.relay_tower).toBeDefined();
			expect(BUILDING_COSTS.defense_turret).toBeDefined();
			expect(BUILDING_COSTS.power_sink).toBeDefined();
			expect(BUILDING_COSTS.storage_hub).toBeDefined();
			expect(BUILDING_COSTS.habitat_module).toBeDefined();
		});

		it("motor_pool costs match TURN_AND_ECONOMY spec", () => {
			const costs = BUILDING_COSTS.motor_pool;
			expect(costs).toEqual([
				{ type: "ferrousScrap", amount: 15 },
				{ type: "alloyStock", amount: 8 },
				{ type: "siliconWafer", amount: 4 },
			]);
		});

		it("relay_tower costs match spec", () => {
			const costs = BUILDING_COSTS.relay_tower;
			expect(costs).toEqual([
				{ type: "conductorWire", amount: 6 },
				{ type: "alloyStock", amount: 4 },
			]);
		});

		it("defense_turret costs match spec", () => {
			const costs = BUILDING_COSTS.defense_turret;
			expect(costs).toEqual([
				{ type: "ferrousScrap", amount: 10 },
				{ type: "conductorWire", amount: 4 },
			]);
		});

		it("every cost entry references a valid resource type", () => {
			for (const [_type, costs] of Object.entries(BUILDING_COSTS)) {
				for (const cost of costs) {
					expect(cost.amount).toBeGreaterThan(0);
					expect(typeof cost.type).toBe("string");
				}
			}
		});
	});

	describe("placement state machine", () => {
		it("starts with no active placement", () => {
			expect(getActivePlacement()).toBeNull();
			expect(getGhostPosition()).toBeNull();
		});

		it("setActivePlacement enables placement mode", () => {
			setActivePlacement("motor_pool");
			expect(getActivePlacement()).toBe("motor_pool");
		});

		it("setActivePlacement stores builder entity ID", () => {
			setActivePlacement("relay_tower", "unit_5");
			expect(getBuilderEntityId()).toBe("unit_5");
		});

		it("cancelPlacement resets all state", () => {
			setActivePlacement("defense_turret", "unit_3");
			cancelPlacement();
			expect(getActivePlacement()).toBeNull();
			expect(getGhostPosition()).toBeNull();
			expect(getBuilderEntityId()).toBeNull();
		});

		it("updateGhostPosition sets position and validity", () => {
			setActivePlacement("storage_hub");
			updateGhostPosition(10, 20);
			const ghost = getGhostPosition();
			expect(ghost).not.toBeNull();
			expect(ghost!.x).toBe(10);
			expect(ghost!.z).toBe(20);
			expect(ghost!.valid).toBe(true);
		});
	});

	describe("canUnitBuild", () => {
		it("returns false for null entity ID", () => {
			expect(canUnitBuild(null)).toBe(false);
		});

		it("returns false for non-fabricator bot", () => {
			mockUnits.push(makeEntity({ id: "unit_1", unitType: "maintenance_bot" }));
			expect(canUnitBuild("unit_1")).toBe(false);
		});

		it("returns true for mecha_golem", () => {
			mockUnits.push(makeEntity({ id: "unit_2", unitType: "mecha_golem" }));
			expect(canUnitBuild("unit_2")).toBe(true);
		});

		it("returns true for fabrication_unit", () => {
			mockUnits.push(makeEntity({ id: "fab_0", unitType: "fabrication_unit" }));
			expect(canUnitBuild("fab_0")).toBe(true);
		});

		it("returns false for unknown entity ID", () => {
			expect(canUnitBuild("nonexistent")).toBe(false);
		});
	});

	describe("confirmPlacement", () => {
		it("fails with no active placement", () => {
			expect(confirmPlacement()).toBe(false);
		});

		it("fails when resources are insufficient", () => {
			mockUnits.push(
				makeEntity({ id: "unit_0", faction: "player", fragmentId: "frag_0" }),
			);
			setActivePlacement("motor_pool");
			updateGhostPosition(10, 10);
			setResources({ ferrousScrap: 1 });
			expect(confirmPlacement()).toBe(false);
		});

		it("succeeds with sufficient resources for motor_pool", () => {
			mockUnits.push(
				makeEntity({ id: "unit_0", faction: "player", fragmentId: "frag_0" }),
			);
			setResources({ ferrousScrap: 15, alloyStock: 8, siliconWafer: 4 });
			setActivePlacement("motor_pool");
			updateGhostPosition(10, 10);
			expect(confirmPlacement()).toBe(true);
			expect(getActivePlacement()).toBeNull();
		});

		it("spends correct resources", () => {
			mockUnits.push(
				makeEntity({ id: "unit_0", faction: "player", fragmentId: "frag_0" }),
			);
			setResources({ ferrousScrap: 20, alloyStock: 10, siliconWafer: 5 });
			setActivePlacement("motor_pool");
			updateGhostPosition(10, 10);
			confirmPlacement();
			// spendResource was called for each cost
			const { spendResource } = require("./resources");
			expect(spendResource).toHaveBeenCalledWith("ferrousScrap", 15);
			expect(spendResource).toHaveBeenCalledWith("alloyStock", 8);
			expect(spendResource).toHaveBeenCalledWith("siliconWafer", 4);
		});
	});

	describe("adjacency bonuses", () => {
		it("returns empty bonuses when no rules exist for building type", () => {
			expect(computeAdjacencyBonuses("lightning_rod", 0, 0)).toEqual([]);
		});

		it("returns empty bonuses when no buildings are nearby", () => {
			expect(computeAdjacencyBonuses("motor_pool", 0, 0)).toEqual([]);
		});

		it("detects adjacent fabrication_unit for motor_pool", () => {
			mockBuildings.push(
				makeEntity({
					id: "fab_0",
					buildingType: "fabrication_unit",
					x: 3,
					z: 0,
				}),
			);
			const bonuses = computeAdjacencyBonuses("motor_pool", 0, 0);
			expect(bonuses).toHaveLength(1);
			expect(bonuses[0]!.sourceType).toBe("fabrication_unit");
			expect(bonuses[0]!.factor).toBe(0.2);
		});

		it("ignores buildings outside adjacency radius", () => {
			mockBuildings.push(
				makeEntity({
					id: "fab_0",
					buildingType: "fabrication_unit",
					x: ADJACENCY_RADIUS + 1,
					z: 0,
				}),
			);
			expect(computeAdjacencyBonuses("motor_pool", 0, 0)).toEqual([]);
		});

		it("does not duplicate same-type bonuses", () => {
			mockBuildings.push(
				makeEntity({
					id: "fab_0",
					buildingType: "fabrication_unit",
					x: 2,
					z: 0,
				}),
				makeEntity({
					id: "fab_1",
					buildingType: "fabrication_unit",
					x: -2,
					z: 0,
				}),
			);
			const bonuses = computeAdjacencyBonuses("motor_pool", 0, 0);
			expect(bonuses).toHaveLength(1);
		});

		it("stacks different bonus types", () => {
			mockBuildings.push(
				makeEntity({
					id: "fab_0",
					buildingType: "fabrication_unit",
					x: 2,
					z: 0,
				}),
				makeEntity({ id: "ps_0", buildingType: "power_sink", x: 0, z: 2 }),
				makeEntity({ id: "sh_0", buildingType: "storage_hub", x: -2, z: 0 }),
			);
			const bonuses = computeAdjacencyBonuses("motor_pool", 0, 0);
			expect(bonuses).toHaveLength(3);
		});

		it("computeAdjacencyMultiplier sums factors correctly", () => {
			mockBuildings.push(
				makeEntity({
					id: "fab_0",
					buildingType: "fabrication_unit",
					x: 2,
					z: 0,
				}),
				makeEntity({ id: "ps_0", buildingType: "power_sink", x: 0, z: 2 }),
			);
			// motor_pool: fabrication_unit=0.2, power_sink=0.15 → 1.35
			expect(computeAdjacencyMultiplier("motor_pool", 0, 0)).toBeCloseTo(1.35);
		});

		it("returns 1.0 multiplier with no adjacent bonuses", () => {
			expect(computeAdjacencyMultiplier("motor_pool", 0, 0)).toBe(1);
		});

		it("defense_turret benefits from adjacent relay_tower", () => {
			mockBuildings.push(
				makeEntity({ id: "rt_0", buildingType: "relay_tower", x: 3, z: 0 }),
			);
			const bonuses = computeAdjacencyBonuses("defense_turret", 0, 0);
			expect(bonuses).toHaveLength(1);
			expect(bonuses[0]!.label).toBe("Target Relay");
		});

		it("power_sink benefits from adjacent lightning_rod", () => {
			mockBuildings.push(
				makeEntity({ id: "lr_0", buildingType: "lightning_rod", x: 3, z: 0 }),
			);
			const bonuses = computeAdjacencyBonuses("power_sink", 0, 0);
			expect(bonuses).toHaveLength(1);
			expect(bonuses[0]!.factor).toBe(0.3);
		});

		it("relay_tower self-chains with Signal Chain bonus", () => {
			mockBuildings.push(
				makeEntity({ id: "rt_0", buildingType: "relay_tower", x: 3, z: 0 }),
			);
			const bonuses = computeAdjacencyBonuses("relay_tower", 0, 0);
			expect(bonuses).toHaveLength(1);
			expect(bonuses[0]!.label).toBe("Signal Chain");
			expect(bonuses[0]!.factor).toBe(0.25);
		});
	});
});
