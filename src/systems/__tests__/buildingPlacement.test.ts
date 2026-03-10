/**
 * Unit tests for the building placement system.
 *
 * Tests cover:
 * - Placement state machine (activate, update ghost, cancel)
 * - Ghost position validation (walkable terrain, inside buildings, rod spacing)
 * - Resource cost checking and spending
 * - Confirm placement (success and failure paths)
 * - BUILDING_COSTS constant
 * - Edge cases: no active placement, no ghost position, no player unit
 */

import type { Entity, LightningRodEntity } from "../../ecs/types";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockLightningRods: LightningRodEntity[] = [];
const mockUnits: Entity[] = [];
jest.mock("../../ecs/world", () => ({
	lightningRods: mockLightningRods,
	units: mockUnits,
	world: [],
}));

// Track walkable/inside state
const walkablePositions = new Set<string>();
const buildingPositions = new Set<string>();

jest.mock("../../ecs/terrain", () => ({
	isWalkable: (x: number, z: number) => {
		// Default: walkable unless explicitly marked
		const key = `${Math.round(x * 100)},${Math.round(z * 100)}`;
		if (walkablePositions.size === 0) return true;
		return walkablePositions.has(key);
	},
}));

jest.mock("../../ecs/cityLayout", () => ({
	isInsideBuilding: (x: number, z: number) => {
		const key = `${Math.round(x * 100)},${Math.round(z * 100)}`;
		return buildingPositions.has(key);
	},
}));

jest.mock("../../ecs/factory", () => ({
	spawnLightningRod: jest.fn(),
	spawnFabricationUnit: jest.fn(),
}));

jest.mock("../navmesh", () => ({
	buildNavGraph: jest.fn(),
}));

// Import after mocking
import {
	BUILDING_COSTS,
	cancelPlacement,
	confirmPlacement,
	getActivePlacement,
	getGhostPosition,
	setActivePlacement,
	updateGhostPosition,
} from "../buildingPlacement";
import {
	addResource,
	getResources,
	resetResourcePool,
} from "../resources";
import { spawnFabricationUnit, spawnLightningRod } from "../../ecs/factory";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockLightningRods.length = 0;
	mockUnits.length = 0;
	walkablePositions.clear();
	buildingPositions.clear();
	resetResourcePool();
	cancelPlacement(); // reset state machine
});

afterEach(() => {
	cancelPlacement();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addPlayerUnit(fragmentId: string): Entity {
	const unit: Entity = {
		id: "player-unit-1",
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		mapFragment: { fragmentId },
		unit: {
			type: "maintenance_bot",
			displayName: "Bot",
			speed: 3,
			selected: false,
			components: [],
		},
	};
	mockUnits.push(unit);
	return unit;
}

function makeRod(
	id: string,
	x: number,
	z: number,
): LightningRodEntity {
	return {
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		building: {
			type: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
		lightningRod: {
			rodCapacity: 10,
			currentOutput: 5,
			protectionRadius: 12,
		},
	} as LightningRodEntity;
}

function markInsideBuilding(x: number, z: number) {
	const key = `${Math.round(x * 100)},${Math.round(z * 100)}`;
	buildingPositions.add(key);
}

// ---------------------------------------------------------------------------
// BUILDING_COSTS constant
// ---------------------------------------------------------------------------

describe("BUILDING_COSTS", () => {
	it("lightning_rod costs scrapMetal and eWaste", () => {
		expect(BUILDING_COSTS.lightning_rod).toEqual([
			{ type: "scrapMetal", amount: 8 },
			{ type: "eWaste", amount: 4 },
		]);
	});

	it("fabrication_unit costs scrapMetal, eWaste, and intactComponents", () => {
		expect(BUILDING_COSTS.fabrication_unit).toEqual([
			{ type: "scrapMetal", amount: 12 },
			{ type: "eWaste", amount: 6 },
			{ type: "intactComponents", amount: 2 },
		]);
	});
});

// ---------------------------------------------------------------------------
// Placement state machine
// ---------------------------------------------------------------------------

describe("placement state machine", () => {
	it("starts with no active placement", () => {
		expect(getActivePlacement()).toBeNull();
	});

	it("setActivePlacement activates placement mode", () => {
		setActivePlacement("lightning_rod");
		expect(getActivePlacement()).toBe("lightning_rod");
	});

	it("setActivePlacement resets ghost position", () => {
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);
		expect(getGhostPosition()).not.toBeNull();

		setActivePlacement("fabrication_unit");
		expect(getGhostPosition()).toBeNull();
	});

	it("cancelPlacement resets everything", () => {
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);

		cancelPlacement();

		expect(getActivePlacement()).toBeNull();
		expect(getGhostPosition()).toBeNull();
	});

	it("setActivePlacement to null deactivates placement", () => {
		setActivePlacement("lightning_rod");
		setActivePlacement(null);
		expect(getActivePlacement()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Ghost position
// ---------------------------------------------------------------------------

describe("ghost position", () => {
	it("returns null when no active placement", () => {
		expect(getGhostPosition()).toBeNull();
	});

	it("returns null when no ghost position set", () => {
		setActivePlacement("lightning_rod");
		expect(getGhostPosition()).toBeNull();
	});

	it("returns position with valid=true on walkable terrain", () => {
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);

		const ghost = getGhostPosition();
		expect(ghost).not.toBeNull();
		expect(ghost!.x).toBe(5);
		expect(ghost!.z).toBe(5);
		expect(ghost!.valid).toBe(true);
	});

	it("returns valid=false when inside a building", () => {
		markInsideBuilding(10, 10);
		setActivePlacement("lightning_rod");
		updateGhostPosition(10, 10);

		const ghost = getGhostPosition();
		expect(ghost).not.toBeNull();
		expect(ghost!.valid).toBe(false);
	});

	it("lightning rod near another rod is invalid (< MIN_ROD_SPACING)", () => {
		mockLightningRods.push(makeRod("rod-1", 0, 0));

		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 0); // Distance = 5, min spacing = 10

		const ghost = getGhostPosition();
		expect(ghost!.valid).toBe(false);
	});

	it("lightning rod far from another rod is valid (>= MIN_ROD_SPACING)", () => {
		mockLightningRods.push(makeRod("rod-1", 0, 0));

		setActivePlacement("lightning_rod");
		updateGhostPosition(15, 0); // Distance = 15 > 10

		const ghost = getGhostPosition();
		expect(ghost!.valid).toBe(true);
	});

	it("fabrication_unit does not need rod spacing", () => {
		mockLightningRods.push(makeRod("rod-1", 0, 0));

		setActivePlacement("fabrication_unit");
		updateGhostPosition(5, 0); // Near rod but type is fabrication_unit

		const ghost = getGhostPosition();
		expect(ghost!.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// confirmPlacement
// ---------------------------------------------------------------------------

describe("confirmPlacement", () => {
	it("returns false when no active placement", () => {
		expect(confirmPlacement()).toBe(false);
	});

	it("returns false when no ghost position", () => {
		setActivePlacement("lightning_rod");
		expect(confirmPlacement()).toBe(false);
	});

	it("returns false when ghost is invalid", () => {
		markInsideBuilding(10, 10);
		setActivePlacement("lightning_rod");
		updateGhostPosition(10, 10);

		addResource("scrapMetal", 100);
		addResource("eWaste", 100);

		expect(confirmPlacement()).toBe(false);
	});

	it("returns false when insufficient resources", () => {
		addPlayerUnit("frag-1");
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);

		addResource("scrapMetal", 3); // Need 8

		expect(confirmPlacement()).toBe(false);
	});

	it("returns false when no player unit exists (no fragmentId)", () => {
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);
		addResource("scrapMetal", 100);
		addResource("eWaste", 100);

		expect(confirmPlacement()).toBe(false);
	});

	it("places lightning rod and spends resources on success", () => {
		addPlayerUnit("frag-1");
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);
		addResource("scrapMetal", 10);
		addResource("eWaste", 10);

		const result = confirmPlacement();

		expect(result).toBe(true);
		expect(spawnLightningRod).toHaveBeenCalledWith({
			x: 5,
			z: 5,
			fragmentId: "frag-1",
		});
		const pool = getResources();
		expect(pool.scrapMetal).toBe(2); // 10 - 8
		expect(pool.eWaste).toBe(6); // 10 - 4
	});

	it("places fabrication unit on success", () => {
		addPlayerUnit("frag-2");
		setActivePlacement("fabrication_unit");
		updateGhostPosition(10, 10);
		addResource("scrapMetal", 20);
		addResource("eWaste", 10);
		addResource("intactComponents", 5);

		const result = confirmPlacement();

		expect(result).toBe(true);
		expect(spawnFabricationUnit).toHaveBeenCalledWith({
			x: 10,
			z: 10,
			fragmentId: "frag-2",
			powered: false,
		});
	});

	it("resets placement state after successful placement", () => {
		addPlayerUnit("frag-3");
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);
		addResource("scrapMetal", 10);
		addResource("eWaste", 10);

		confirmPlacement();

		expect(getActivePlacement()).toBeNull();
		expect(getGhostPosition()).toBeNull();
	});

	it("does not reset placement state on failure", () => {
		setActivePlacement("lightning_rod");
		updateGhostPosition(5, 5);
		// No resources, no player unit => fail

		confirmPlacement();

		// activePlacement is still set (confirmPlacement returns early)
		expect(getActivePlacement()).toBe("lightning_rod");
	});
});
