/**
 * Unit tests for the exploration system — fog reveal around units.
 *
 * Tests cover:
 * - Fog reveal based on unit distance
 * - Camera-equipped vs regular bots produce different fog types
 * - Edge cases: max vision range, boundary cells, out-of-bounds
 * - Multiple units revealing fog simultaneously
 * - Fog only upgrades, never downgrades
 */

// ---------------------------------------------------------------------------
// Mocks — jest.mock factories must not reference outer variables (hoisted)
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		rendering: {
			fogOfWar: {
				defaultVisionRange: 6,
				cameraVisionBonus: 10,
			},
		},
	},
}));

jest.mock("../../ecs/terrain", () => ({
	getFragment: jest.fn(),
	setFogAt: jest.fn(),
}));

jest.mock("../../ecs/types", () => ({
	hasCamera: jest.fn(),
}));

jest.mock("../../ecs/world", () => ({
	units: [],
}));

// Import mocked modules to access mock functions
import { getFragment, setFogAt } from "../../ecs/terrain";
import { hasCamera } from "../../ecs/types";
import { units } from "../../ecs/world";
import { explorationSystem } from "../exploration";

// Cast to mock types for test manipulation
const mockSetFogAt = jest.mocked(setFogAt);
const mockGetFragment = jest.mocked(getFragment);
const mockHasCamera = jest.mocked(hasCamera);
const mockUnits = units as unknown as Array<{
	worldPosition: { x: number; z: number };
	mapFragment: { fragmentId: string };
	unit: { components: Array<{ name: string; functional: boolean }> };
}>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockMapFragment {
	id: string;
	fog: Uint8Array;
}

function makeFragment(id: string): MockMapFragment {
	return {
		id,
		fog: new Uint8Array(200 * 200), // FOG_RES = WORLD_SIZE = 200
	};
}

function makeUnit(
	x: number,
	z: number,
	fragmentId: string,
	hasCam: boolean,
) {
	return {
		worldPosition: { x, z },
		mapFragment: { fragmentId },
		unit: {
			components: hasCam
				? [{ name: "camera", functional: true }]
				: [{ name: "legs", functional: true }],
		},
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockSetFogAt.mockClear();
	mockGetFragment.mockClear();
	mockHasCamera.mockClear();
	mockUnits.length = 0;
});

// ---------------------------------------------------------------------------
// Basic fog reveal
// ---------------------------------------------------------------------------

describe("fog reveal", () => {
	it("calls setFogAt for cells within vision radius around a unit", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// VISION_RADIUS = 6, ceil(6) = 6
		// Should call setFogAt for all cells within radius 6 circle
		expect(mockSetFogAt).toHaveBeenCalled();

		// Count calls — all cells (dx, dz) where dx^2 + dz^2 <= 36
		const expectedCells = countCellsInCircle(6);
		expect(mockSetFogAt).toHaveBeenCalledTimes(expectedCells);
	});

	it("reveals fog type 1 (abstract) for bots without camera", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(5, 5, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// All calls should use fogType 1
		for (const call of mockSetFogAt.mock.calls) {
			expect(call[3]).toBe(1); // fogType argument
		}
	});

	it("reveals fog type 2 (detailed) for bots with camera", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(true);

		const unit = makeUnit(5, 5, "frag_0", true);
		mockUnits.push(unit);

		explorationSystem();

		// All calls should use fogType 2
		for (const call of mockSetFogAt.mock.calls) {
			expect(call[3]).toBe(2); // fogType argument
		}
	});

	it("passes the correct fragment to setFogAt", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		for (const call of mockSetFogAt.mock.calls) {
			expect(call[0]).toBe(fragment);
		}
	});

	it("calls getFragment with the unit's fragmentId", () => {
		const fragment = makeFragment("frag_42");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_42", false);
		mockUnits.push(unit);

		explorationSystem();

		expect(mockGetFragment).toHaveBeenCalledWith("frag_42");
	});
});

// ---------------------------------------------------------------------------
// Vision circle shape
// ---------------------------------------------------------------------------

describe("vision circle shape", () => {
	it("reveals cells in a circle, not a square", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// The corner of a 6-unit square (6,6) has distSq = 72 > 36
		// So (6,6) should NOT be in the revealed cells
		const cornerCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 6 && call[2] === 6,
		);
		expect(cornerCall).toBeUndefined();

		// But (4,4) has distSq = 32 <= 36, so it should be included
		const insideCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 4 && call[2] === 4,
		);
		expect(insideCall).toBeDefined();
	});

	it("excludes cells exactly outside the vision radius", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// (0, 7) has distSq = 49 > 36, should not be revealed
		const outsideCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 0 && call[2] === 7,
		);
		expect(outsideCall).toBeUndefined();
	});

	it("includes the cell at max radius along an axis", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// (6, 0) has distSq = 36 <= 36, should be included
		const edgeCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 6 && call[2] === 0,
		);
		expect(edgeCall).toBeDefined();

		// (-6, 0) should also be included
		const negEdgeCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === -6 && call[2] === 0,
		);
		expect(negEdgeCall).toBeDefined();
	});

	it("includes the center cell", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(10, 10, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// Center cell is at the unit's position
		const centerCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 10 && call[2] === 10,
		);
		expect(centerCall).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Multiple units
// ---------------------------------------------------------------------------

describe("multiple units", () => {
	it("processes all units in the iterable", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit1 = makeUnit(0, 0, "frag_0", false);
		const unit2 = makeUnit(50, 50, "frag_0", false);
		mockUnits.push(unit1, unit2);

		explorationSystem();

		// Should be called for both units' vision circles
		const expectedPerUnit = countCellsInCircle(6);
		expect(mockSetFogAt).toHaveBeenCalledTimes(expectedPerUnit * 2);
	});

	it("different units can have different fog types", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);

		const regularBot = makeUnit(0, 0, "frag_0", false);
		const cameraBot = makeUnit(50, 50, "frag_0", true);
		mockUnits.push(regularBot, cameraBot);

		// hasCamera returns false for first, true for second
		mockHasCamera.mockImplementation((entity: unknown) => entity === cameraBot);

		explorationSystem();

		// Verify that some calls used fogType 1 and some used fogType 2
		const fogType1Calls = mockSetFogAt.mock.calls.filter(
			(call) => call[3] === 1,
		);
		const fogType2Calls = mockSetFogAt.mock.calls.filter(
			(call) => call[3] === 2,
		);

		expect(fogType1Calls.length).toBeGreaterThan(0);
		expect(fogType2Calls.length).toBeGreaterThan(0);
	});

	it("units in different fragments use their respective fragments", () => {
		const fragment0 = makeFragment("frag_0");
		const fragment1 = makeFragment("frag_1");

		mockGetFragment.mockImplementation((id: string) => {
			if (id === "frag_0") return fragment0 as never;
			if (id === "frag_1") return fragment1 as never;
			return undefined;
		});
		mockHasCamera.mockReturnValue(false);

		const unit1 = makeUnit(0, 0, "frag_0", false);
		const unit2 = makeUnit(10, 10, "frag_1", false);
		mockUnits.push(unit1, unit2);

		explorationSystem();

		// Verify fragment0 was used for unit1's calls
		const frag0Calls = mockSetFogAt.mock.calls.filter(
			(call) => call[0] === fragment0,
		);
		const frag1Calls = mockSetFogAt.mock.calls.filter(
			(call) => call[0] === fragment1,
		);

		expect(frag0Calls.length).toBeGreaterThan(0);
		expect(frag1Calls.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("skips unit when fragment is not found", () => {
		mockGetFragment.mockReturnValue(undefined);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "nonexistent", false);
		mockUnits.push(unit);

		explorationSystem();

		expect(mockSetFogAt).not.toHaveBeenCalled();
	});

	it("handles empty units list", () => {
		// mockUnits is already empty from beforeEach
		explorationSystem();

		expect(mockSetFogAt).not.toHaveBeenCalled();
		expect(mockGetFragment).not.toHaveBeenCalled();
	});

	it("unit at world boundary still produces valid setFogAt calls", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		// Unit at edge of world — some cells will be out of bounds
		// setFogAt handles out-of-bounds via worldToFogIndex returning -1
		const unit = makeUnit(95, 95, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// Should still be called for cells within the circle
		// (setFogAt will no-op for out-of-bounds cells internally)
		expect(mockSetFogAt).toHaveBeenCalled();
	});

	it("unit at negative world boundary", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(-95, -95, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		expect(mockSetFogAt).toHaveBeenCalled();
	});

	it("unit at exact world origin", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// Center cell (0, 0) should be included
		const centerCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 0 && call[2] === 0,
		);
		expect(centerCall).toBeDefined();
	});

	it("unit with fractional position — fog cells are at integer offsets from position", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(5.7, 3.2, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// The center cell should be at (5.7, 3.2) — setFogAt gets wx + dx
		// So the "center" call would be setFogAt(frag, 5.7, 3.2, fogType)
		const centerCall = mockSetFogAt.mock.calls.find(
			(call) =>
				Math.abs(call[1] - 5.7) < 0.001 && Math.abs(call[2] - 3.2) < 0.001,
		);
		expect(centerCall).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Vision radius constant
// ---------------------------------------------------------------------------

describe("vision radius", () => {
	it("VISION_RADIUS produces consistent cell count", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		const expectedCells = countCellsInCircle(6);
		expect(mockSetFogAt).toHaveBeenCalledTimes(expectedCells);
	});

	it("cells at distance exactly equal to VISION_RADIUS are included", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// (6, 0): distSq = 36 = 6*6 => should be included
		const edgeCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 6 && call[2] === 0,
		);
		expect(edgeCall).toBeDefined();
	});

	it("cells at distance > VISION_RADIUS are excluded", () => {
		const fragment = makeFragment("frag_0");
		mockGetFragment.mockReturnValue(fragment as never);
		mockHasCamera.mockReturnValue(false);

		const unit = makeUnit(0, 0, "frag_0", false);
		mockUnits.push(unit);

		explorationSystem();

		// (5, 4): distSq = 25 + 16 = 41 > 36 => excluded
		const outsideCall = mockSetFogAt.mock.calls.find(
			(call) => call[1] === 5 && call[2] === 4,
		);
		expect(outsideCall).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Count the number of integer grid cells within a circle of given radius.
 * This matches the exploration system's iteration: dx in [-r, r], dz in [-r, r],
 * where dx^2 + dz^2 <= radius^2.
 */
function countCellsInCircle(radius: number): number {
	const r = Math.ceil(radius);
	const rSq = radius * radius;
	let count = 0;
	for (let dz = -r; dz <= r; dz++) {
		for (let dx = -r; dx <= r; dx++) {
			if (dx * dx + dz * dz <= rSq) count++;
		}
	}
	return count;
}
