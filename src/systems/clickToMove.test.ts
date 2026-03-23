// Trait keys used by both mock factory and test helpers
const IDENTITY_KEY = "mock_identity";
const UNIT_KEY = "mock_unit";
const WORLD_POSITION_KEY = "mock_wp";
const NAVIGATION_KEY = "mock_nav";

const mockUnits: Array<{
	data: Record<string, unknown>;
	get: (trait: unknown) => unknown;
	set: (trait: unknown, value: unknown) => void;
}> = [];

jest.mock("../ecs/traits", () => ({
	Identity: IDENTITY_KEY,
	Unit: UNIT_KEY,
	WorldPosition: WORLD_POSITION_KEY,
	Navigation: NAVIGATION_KEY,
}));

jest.mock("../ecs/world", () => ({
	units: {
		[Symbol.iterator]: () => mockUnits[Symbol.iterator](),
	},
}));

jest.mock("../world/sectorCoordinates", () => ({
	worldToGrid: (x: number, z: number) => ({
		q: Math.round(x / 2),
		r: Math.round(z / 2),
	}),
	gridToWorld: (q: number, r: number) => ({
		x: q * 2,
		y: 0,
		z: r * 2,
	}),
}));

jest.mock("./pathfinding", () => ({
	findPathWithCost: (
		start: { x: number; z: number },
		goal: { x: number; z: number },
	) => {
		const sq = Math.round(start.x / 2);
		const sr = Math.round(start.z / 2);
		const gq = Math.round(goal.x / 2);
		const gr = Math.round(goal.z / 2);

		if (gq === 999) {
			return { path: [], cost: 0, valid: false };
		}

		const path: { q: number; r: number }[] = [];
		let cq = sq;
		let cr = sr;
		while (cq !== gq || cr !== gr) {
			if (cq < gq) cq++;
			else if (cq > gq) cq--;
			if (cr < gr) cr++;
			else if (cr > gr) cr--;
			path.push({ q: cq, r: cr });
		}
		return { path, cost: path.length, valid: path.length > 0 };
	},
}));

import {
	getSelectedPlayerUnit,
	issueClickToMove,
	previewClickToMove,
} from "./clickToMove";
import { initializeTurnForUnits, resetTurnSystem } from "./turnSystem";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
			selected,
			speed: 3,
			components: [{ name: "legs", functional: true, material: "metal" }],
		},
		[WORLD_POSITION_KEY]: { x, y: 0, z },
		[NAVIGATION_KEY]: {
			path: [] as { q: number; r: number }[],
			pathIndex: 0,
			moving: false,
		},
	};
	const entity = {
		data,
		get: (trait: unknown) => data[trait as string],
		set: (trait: unknown, value: unknown) => {
			data[trait as string] = value;
		},
	};
	mockUnits.push(entity);
	return entity;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("clickToMove", () => {
	beforeEach(() => {
		mockUnits.length = 0;
		resetTurnSystem();
	});

	describe("getSelectedPlayerUnit", () => {
		it("returns null when no units exist", () => {
			expect(getSelectedPlayerUnit()).toBeNull();
		});

		it("returns null when no unit is selected", () => {
			createMockUnit("u1", "player", 0, 0, false);
			expect(getSelectedPlayerUnit()).toBeNull();
		});

		it("returns the selected player unit", () => {
			createMockUnit("u1", "player", 0, 0, true);
			const selected = getSelectedPlayerUnit();
			expect(selected).not.toBeNull();
		});

		it("ignores selected non-player units", () => {
			createMockUnit("e1", "feral", 0, 0, true);
			expect(getSelectedPlayerUnit()).toBeNull();
		});
	});

	describe("issueClickToMove", () => {
		it("fails with no_selected_unit when nothing selected", () => {
			const result = issueClickToMove(10, 10);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("no_selected_unit");
		});

		it("fails with no_movement_points when unit has no MP", () => {
			createMockUnit("u1", "player", 0, 0, true);
			const result = issueClickToMove(10, 10);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("no_movement_points");
		});

		it("fails with already_there when clicking current cell", () => {
			createMockUnit("u1", "player", 0, 0, true);
			initializeTurnForUnits(["u1"]);
			const result = issueClickToMove(0, 0);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("already_there");
		});

		it("fails with no_path when target is unreachable", () => {
			createMockUnit("u1", "player", 0, 0, true);
			initializeTurnForUnits(["u1"]);
			const result = issueClickToMove(999 * 2, 0);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("no_path");
		});

		it("succeeds and sets navigation path for affordable move", () => {
			const entity = createMockUnit("u1", "player", 0, 0, true);
			initializeTurnForUnits(["u1"]); // 3 MP by default
			const result = issueClickToMove(4, 4);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.path.length).toBeGreaterThan(0);
				expect(result.cost).toBeLessThanOrEqual(3);
			}
			const nav = entity.get(NAVIGATION_KEY) as {
				path: unknown[];
				moving: boolean;
			};
			expect(nav.moving).toBe(true);
			expect(nav.path.length).toBeGreaterThan(0);
		});

		it("trims path to available MP", () => {
			createMockUnit("u1", "player", 0, 0, true);
			initializeTurnForUnits(["u1"]); // 3 MP default
			const result = issueClickToMove(20, 20);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.path.length).toBeLessThanOrEqual(3);
			}
		});
	});

	describe("previewClickToMove", () => {
		it("returns empty preview when no unit selected", () => {
			const preview = previewClickToMove(10, 10);
			expect(preview.path).toEqual([]);
			expect(preview.affordable).toBe(false);
		});

		it("returns full path info and affordability", () => {
			createMockUnit("u1", "player", 0, 0, true);
			initializeTurnForUnits(["u1"]); // 3 MP
			const preview = previewClickToMove(4, 4);
			expect(preview.path.length).toBeGreaterThan(0);
			expect(preview.totalCost).toBe(preview.path.length);
			expect(preview.availableMP).toBe(3);
			expect(preview.affordable).toBe(true);
		});

		it("marks unaffordable paths correctly", () => {
			createMockUnit("u1", "player", 0, 0, true);
			initializeTurnForUnits(["u1"]); // 3 MP
			const preview = previewClickToMove(20, 20);
			expect(preview.affordable).toBe(false);
			expect(preview.totalCost).toBeGreaterThan(3);
		});
	});
});
