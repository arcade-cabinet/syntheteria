/**
 * @jest-environment node
 */
import {
	startFloorHarvest,
	isFloorTileConsumed,
	getConsumedFloorTiles,
	resetHarvestSystem,
	harvestSystem,
	getActiveHarvests,
} from "./harvestSystem";

// Mock dependencies
const mockAddResource = jest.fn();
const mockPushHarvestYield = jest.fn();
const mockQueueThought = jest.fn();

jest.mock("./resources", () => ({
	addResource: (...args: unknown[]) => mockAddResource(...args),
}));
jest.mock("./harvestEvents", () => ({
	expireHarvestEvents: jest.fn(),
	pushHarvestYield: (...args: unknown[]) => mockPushHarvestYield(...args),
}));
jest.mock("./narrative", () => ({
	queueThought: (...args: unknown[]) => mockQueueThought(...args),
}));
jest.mock("../ecs/world", () => ({
	units: [
		{
			get: () => ({ id: "fabricator_1", x: 5, y: 0, z: 5 }),
		},
	],
}));
jest.mock("../ecs/traits", () => ({
	Identity: { id: "Identity" },
	WorldPosition: "WorldPosition",
}));

describe("harvestSystem", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		resetHarvestSystem();
	});

	describe("startFloorHarvest", () => {
		it("starts floor harvest and adds to active harvests", () => {
			const ok = startFloorHarvest("fabricator_1", 3, 4, 0, "metal_panel");
			expect(ok).toBe(true);
			expect(mockQueueThought).toHaveBeenCalledWith("harvest_instinct");
			expect(getActiveHarvests().length).toBe(1);
			expect(getActiveHarvests()[0]?.isFloorHarvest).toBe(true);
			expect(getActiveHarvests()[0]?.floorMaterial).toBe("metal_panel");
			expect(getActiveHarvests()[0]?.targetX).toBe(3);
			expect(getActiveHarvests()[0]?.targetZ).toBe(4);
		});

		it("rejects duplicate harvest on same tile", () => {
			startFloorHarvest("fabricator_1", 3, 4, 0, "metal_panel");
			const ok2 = startFloorHarvest("fabricator_1", 3, 4, 0, "metal_panel");
			expect(ok2).toBe(false);
		});

		it("rejects non-harvestable floor material", () => {
			const ok = startFloorHarvest("fabricator_1", 3, 4, 0, "unknown_material");
			expect(ok).toBe(false);
		});
	});

	describe("isFloorTileConsumed", () => {
		it("returns false before harvest completes", () => {
			startFloorHarvest("fabricator_1", 3, 4, 0, "metal_panel");
			expect(isFloorTileConsumed(3, 4, 0)).toBe(false);
		});
	});

	describe("harvestSystem tick (floor harvest completion)", () => {
		it("completes floor harvest and marks tile consumed after ticks", () => {
			startFloorHarvest("fabricator_1", 5, 5, 0, "metal_panel");
			const harvest = getActiveHarvests()[0];
			const totalTicks = harvest?.totalTicks ?? 80;

			for (let t = 0; t < totalTicks; t++) {
				harvestSystem(t);
			}

			expect(getActiveHarvests().length).toBe(0);
			expect(isFloorTileConsumed(5, 5, 0)).toBe(true);
			expect(getConsumedFloorTiles().has("5,5,0")).toBe(true);
			expect(mockAddResource).toHaveBeenCalled();
			expect(mockPushHarvestYield).toHaveBeenCalled();
		});
	});

	describe("resetHarvestSystem", () => {
		it("clears consumed floor tiles", () => {
			// Unit is at (5, 0, 5) per mock — harvest target must be within 3 units
			startFloorHarvest("fabricator_1", 5, 5, 0, "metal_panel");
			const harvest = getActiveHarvests()[0];
			const totalTicks = harvest?.totalTicks ?? 80;
			for (let t = 0; t < totalTicks; t++) harvestSystem(t);
			expect(isFloorTileConsumed(5, 5, 0)).toBe(true);

			resetHarvestSystem();
			expect(isFloorTileConsumed(5, 5, 0)).toBe(false);
		});
	});
});
