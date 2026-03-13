import type { PathResult } from "./navmesh";

// ── Mocks ──────────────────────────────────────────────────────────

const mockIssueMoveCommand = jest.fn<boolean, [string, unknown]>(() => true);

jest.mock("../ai", () => ({
	issueMoveCommand: (id: string, target: unknown) =>
		mockIssueMoveCommand(id, target),
}));

const mockFindPathWithCost = jest.fn<PathResult, [unknown, unknown, string?]>();
jest.mock("./pathfinding", () => ({
	findPathWithCost: (start: unknown, goal: unknown, unitId?: string) =>
		mockFindPathWithCost(start, goal, unitId),
}));

const mockInvalidateUnitPathCache = jest.fn();
jest.mock("./pathfindingCache", () => ({
	invalidateUnitPathCache: (id: string) => mockInvalidateUnitPathCache(id),
}));

const mockGetUnitTurnState = jest.fn();
const mockSpendMovementPoints = jest.fn<boolean, [string, number]>(() => true);
jest.mock("./turnSystem", () => ({
	getUnitTurnState: (id: string) => mockGetUnitTurnState(id),
	spendMovementPoints: (id: string, cost: number) =>
		mockSpendMovementPoints(id, cost),
}));

const mockShowMovementToast = jest.fn();
jest.mock("./movementFeedback", () => ({
	showMovementToast: (msg: string) => mockShowMovementToast(msg),
}));

import { tryMoveUnit } from "./moveCommand";

beforeEach(() => {
	jest.clearAllMocks();
});

const START = { x: 0, y: 0, z: 0 };
const TARGET = { x: 8, y: 0, z: 0 };

describe("tryMoveUnit", () => {
	it("succeeds when path is valid and MP is sufficient", () => {
		mockGetUnitTurnState.mockReturnValue({
			entityId: "u1",
			movementPoints: 4,
			maxMovementPoints: 4,
			actionPoints: 2,
			maxActionPoints: 2,
			activated: false,
		});
		mockFindPathWithCost.mockReturnValue({
			path: [
				{ q: 1, r: 0 },
				{ q: 2, r: 0 },
				{ q: 3, r: 0 },
				{ q: 4, r: 0 },
			],
			cost: 4,
			valid: true,
		});

		const result = tryMoveUnit("u1", START, TARGET);

		expect(result.success).toBe(true);
		expect(mockSpendMovementPoints).toHaveBeenCalledWith("u1", 4);
		expect(mockIssueMoveCommand).toHaveBeenCalledWith("u1", TARGET);
		expect(mockInvalidateUnitPathCache).toHaveBeenCalledWith("u1");
		expect(mockShowMovementToast).not.toHaveBeenCalled();
	});

	it("fails with 'no_path' when path is invalid", () => {
		mockGetUnitTurnState.mockReturnValue({
			entityId: "u1",
			movementPoints: 4,
			maxMovementPoints: 4,
			actionPoints: 2,
			maxActionPoints: 2,
			activated: false,
		});
		mockFindPathWithCost.mockReturnValue({
			path: [],
			cost: 0,
			valid: false,
		});

		const result = tryMoveUnit("u1", START, TARGET);

		expect(result.success).toBe(false);
		expect(result.reason).toBe("no_path");
		expect(mockShowMovementToast).toHaveBeenCalledWith("No path available");
		expect(mockSpendMovementPoints).not.toHaveBeenCalled();
		expect(mockIssueMoveCommand).not.toHaveBeenCalled();
	});

	it("fails with 'insufficient_mp' when path cost exceeds MP", () => {
		mockGetUnitTurnState.mockReturnValue({
			entityId: "u1",
			movementPoints: 2,
			maxMovementPoints: 3,
			actionPoints: 2,
			maxActionPoints: 2,
			activated: false,
		});
		mockFindPathWithCost.mockReturnValue({
			path: [
				{ q: 1, r: 0 },
				{ q: 2, r: 0 },
				{ q: 3, r: 0 },
			],
			cost: 3,
			valid: true,
		});

		const result = tryMoveUnit("u1", START, TARGET);

		expect(result.success).toBe(false);
		expect(result.reason).toBe("insufficient_mp");
		expect(mockShowMovementToast).toHaveBeenCalledWith("Not enough MP");
		expect(mockSpendMovementPoints).not.toHaveBeenCalled();
		expect(mockIssueMoveCommand).not.toHaveBeenCalled();
	});

	it("fails with 'no_turn_state' when unit has no turn state", () => {
		mockGetUnitTurnState.mockReturnValue(undefined);

		const result = tryMoveUnit("u1", START, TARGET);

		expect(result.success).toBe(false);
		expect(result.reason).toBe("no_turn_state");
		expect(mockShowMovementToast).toHaveBeenCalledWith("No turn state");
	});

	it("returns path result on failure for UI feedback", () => {
		mockGetUnitTurnState.mockReturnValue({
			entityId: "u1",
			movementPoints: 1,
			maxMovementPoints: 3,
			actionPoints: 2,
			maxActionPoints: 2,
			activated: false,
		});
		const pathResult: PathResult = {
			path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
			cost: 2,
			valid: true,
		};
		mockFindPathWithCost.mockReturnValue(pathResult);

		const result = tryMoveUnit("u1", START, TARGET);

		expect(result.success).toBe(false);
		expect(result.path).toEqual(pathResult);
	});
});
