import {
	_reset,
	getTooltipState,
	hideTooltip,
	showBuildingTooltip,
	showStructureTooltip,
	showUnitTooltip,
	subscribeTooltip,
} from "./tooltipSystem";

beforeEach(() => {
	_reset();
});

describe("tooltipSystem", () => {
	it("starts with tooltip hidden", () => {
		const state = getTooltipState();
		expect(state.visible).toBe(false);
		expect(state.kind).toBeNull();
	});

	it("shows a unit tooltip", () => {
		showUnitTooltip(100, 200, {
			entityId: "unit-1",
			name: "Field Technician",
			faction: "player",
			unitType: "maintenance_bot",
			archetype: "field_technician",
			markLevel: 2,
			hpCurrent: 4,
			hpMax: 5,
			turnState: null,
			currentAction: "Harvesting",
		});

		const state = getTooltipState();
		expect(state.visible).toBe(true);
		expect(state.kind).toBe("unit");
		expect(state.name).toBe("Field Technician");
		expect(state.screenX).toBe(100);
		expect(state.screenY).toBe(200);
		expect(state.archetype).toBe("field_technician");
		expect(state.markLevel).toBe(2);
		expect(state.hpCurrent).toBe(4);
		expect(state.hpMax).toBe(5);
		expect(state.currentAction).toBe("Harvesting");
	});

	it("shows a building tooltip", () => {
		showBuildingTooltip(300, 400, {
			entityId: "bldg-1",
			name: "Lightning Rod",
			faction: "player",
			buildingType: "lightning_rod",
			constructionStage: "Operational",
			buildingOutput: "5 kW",
			powered: true,
		});

		const state = getTooltipState();
		expect(state.visible).toBe(true);
		expect(state.kind).toBe("building");
		expect(state.buildingType).toBe("lightning_rod");
		expect(state.powered).toBe(true);
		expect(state.buildingOutput).toBe("5 kW");
	});

	it("shows a structure tooltip", () => {
		showStructureTooltip(50, 60, {
			entityId: "struct-1",
			name: "Rusted Pylon",
			harvestableResources: ["scrapMetal", "conductorWire"],
		});

		const state = getTooltipState();
		expect(state.visible).toBe(true);
		expect(state.kind).toBe("structure");
		expect(state.harvestableResources).toEqual(["scrapMetal", "conductorWire"]);
	});

	it("hides the tooltip", () => {
		showUnitTooltip(100, 200, {
			entityId: "unit-1",
			name: "Test",
			faction: "player",
			unitType: "maintenance_bot",
			archetype: "field_technician",
			markLevel: 1,
			hpCurrent: 3,
			hpMax: 3,
			turnState: null,
			currentAction: null,
		});

		hideTooltip();
		const state = getTooltipState();
		expect(state.visible).toBe(false);
	});

	it("does not notify when hiding already-hidden tooltip", () => {
		const listener = jest.fn();
		const unsub = subscribeTooltip(listener);

		hideTooltip(); // Already hidden
		expect(listener).not.toHaveBeenCalled();

		unsub();
	});

	it("notifies listeners on show", () => {
		const listener = jest.fn();
		const unsub = subscribeTooltip(listener);

		showUnitTooltip(0, 0, {
			entityId: "unit-1",
			name: "Test",
			faction: "player",
			unitType: "maintenance_bot",
			archetype: "field_technician",
			markLevel: 1,
			hpCurrent: 3,
			hpMax: 3,
			turnState: null,
			currentAction: null,
		});

		expect(listener).toHaveBeenCalledTimes(1);
		unsub();
	});

	it("notifies listeners on hide", () => {
		showUnitTooltip(0, 0, {
			entityId: "unit-1",
			name: "Test",
			faction: "player",
			unitType: "maintenance_bot",
			archetype: "field_technician",
			markLevel: 1,
			hpCurrent: 3,
			hpMax: 3,
			turnState: null,
			currentAction: null,
		});

		const listener = jest.fn();
		const unsub = subscribeTooltip(listener);

		hideTooltip();
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
	});

	it("replaces previous tooltip when showing new one", () => {
		showUnitTooltip(100, 200, {
			entityId: "unit-1",
			name: "First",
			faction: "player",
			unitType: "maintenance_bot",
			archetype: "field_technician",
			markLevel: 1,
			hpCurrent: 3,
			hpMax: 3,
			turnState: null,
			currentAction: null,
		});

		showBuildingTooltip(300, 400, {
			entityId: "bldg-1",
			name: "Second",
			faction: "player",
			buildingType: "relay_tower",
			constructionStage: null,
			buildingOutput: null,
			powered: false,
		});

		const state = getTooltipState();
		expect(state.kind).toBe("building");
		expect(state.name).toBe("Second");
		// Unit-specific fields should be cleared
		expect(state.unitType).toBeNull();
	});
});
