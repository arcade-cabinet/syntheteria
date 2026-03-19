const IDENTITY_KEY = "mock_identity";
const UNIT_KEY = "mock_unit";
const BUILDING_KEY = "mock_building";
const WORLD_POSITION_KEY = "mock_wp";

const mockUnits: Array<{
	data: Record<string, unknown>;
	get: (trait: unknown) => unknown;
}> = [];

const mockBuildings: Array<{
	data: Record<string, unknown>;
	get: (trait: unknown) => unknown;
}> = [];

jest.mock("../ecs/traits", () => ({
	Identity: IDENTITY_KEY,
	Unit: UNIT_KEY,
	Building: BUILDING_KEY,
	WorldPosition: WORLD_POSITION_KEY,
}));

jest.mock("../ecs/world", () => ({
	units: {
		[Symbol.iterator]: () => mockUnits[Symbol.iterator](),
	},
	buildings: {
		[Symbol.iterator]: () => mockBuildings[Symbol.iterator](),
	},
}));

jest.mock("./turnSystem", () => ({
	getUnitTurnState: (entityId: string) => ({
		entityId,
		actionPoints: 2,
		maxActionPoints: 2,
		movementPoints: 3,
		maxMovementPoints: 3,
		activated: false,
	}),
}));

import {
	deselectAll,
	getSelectedUnitInfo,
	notifySelectionChanged,
	selectEntity,
	subscribeSelection,
} from "./unitSelection";

function createMockUnit(
	id: string,
	faction: string,
	x: number,
	z: number,
	selected: boolean,
) {
	const data: Record<string, unknown> = {
		[IDENTITY_KEY]: { id, faction },
		[UNIT_KEY]: {
			type: "maintenance_bot",
			displayName: "Test Unit",
			markLevel: 1,
			selected,
		},
		[WORLD_POSITION_KEY]: { x, y: 0, z },
	};
	return {
		data,
		get: (trait: unknown) => data[trait as string] ?? null,
	};
}

function createMockBuilding(
	id: string,
	faction: string,
	x: number,
	z: number,
	selected: boolean,
) {
	const data: Record<string, unknown> = {
		[IDENTITY_KEY]: { id, faction },
		[BUILDING_KEY]: {
			type: "lightning_rod",
			selected,
		},
		[WORLD_POSITION_KEY]: { x, y: 0, z },
	};
	return {
		data,
		get: (trait: unknown) => data[trait as string] ?? null,
	};
}

beforeEach(() => {
	mockUnits.length = 0;
	mockBuildings.length = 0;
});

describe("unitSelection", () => {
	describe("getSelectedUnitInfo", () => {
		it("returns null when no unit is selected", () => {
			mockUnits.push(createMockUnit("u1", "player", 0, 0, false));
			expect(getSelectedUnitInfo()).toBeNull();
		});

		it("returns selected unit info", () => {
			mockUnits.push(createMockUnit("u1", "player", 5, 10, true));
			const info = getSelectedUnitInfo();
			expect(info).not.toBeNull();
			expect(info!.entityId).toBe("u1");
			expect(info!.faction).toBe("player");
			expect(info!.type).toBe("unit");
			expect(info!.worldX).toBe(5);
			expect(info!.worldZ).toBe(10);
		});

		it("returns selected building info", () => {
			mockBuildings.push(createMockBuilding("b1", "player", 3, 7, true));
			const info = getSelectedUnitInfo();
			expect(info).not.toBeNull();
			expect(info!.entityId).toBe("b1");
			expect(info!.type).toBe("building");
			expect(info!.unitType).toBe("lightning_rod");
		});

		it("prefers units over buildings when both selected", () => {
			mockUnits.push(createMockUnit("u1", "player", 0, 0, true));
			mockBuildings.push(createMockBuilding("b1", "player", 0, 0, true));
			const info = getSelectedUnitInfo();
			expect(info!.entityId).toBe("u1");
			expect(info!.type).toBe("unit");
		});
	});

	describe("deselectAll", () => {
		it("deselects all units and buildings", () => {
			const unit = createMockUnit("u1", "player", 0, 0, true);
			const building = createMockBuilding("b1", "player", 0, 0, true);
			mockUnits.push(unit);
			mockBuildings.push(building);

			deselectAll();

			const unitData = unit.data[UNIT_KEY] as { selected: boolean };
			const buildingData = building.data[BUILDING_KEY] as {
				selected: boolean;
			};
			expect(unitData.selected).toBe(false);
			expect(buildingData.selected).toBe(false);
		});
	});

	describe("selectEntity", () => {
		it("selects a unit and deselects others", () => {
			const u1 = createMockUnit("u1", "player", 0, 0, true);
			const u2 = createMockUnit("u2", "player", 5, 5, false);
			mockUnits.push(u1, u2);

			selectEntity(u2 as any);

			const u1Data = u1.data[UNIT_KEY] as { selected: boolean };
			const u2Data = u2.data[UNIT_KEY] as { selected: boolean };
			expect(u1Data.selected).toBe(false);
			expect(u2Data.selected).toBe(true);
		});
	});

	describe("subscribeSelection", () => {
		it("notifies listeners on selection change", () => {
			const listener = jest.fn();
			const unsubscribe = subscribeSelection(listener);

			notifySelectionChanged();
			expect(listener).toHaveBeenCalledTimes(1);

			notifySelectionChanged();
			expect(listener).toHaveBeenCalledTimes(2);

			unsubscribe();
			notifySelectionChanged();
			expect(listener).toHaveBeenCalledTimes(2);
		});
	});

	describe("turnState integration", () => {
		it("includes turn state in selected unit info", () => {
			mockUnits.push(createMockUnit("u1", "player", 0, 0, true));
			const info = getSelectedUnitInfo();
			expect(info!.turnState).toBeDefined();
			expect(info!.turnState!.actionPoints).toBe(2);
			expect(info!.turnState!.movementPoints).toBe(3);
		});
	});
});
