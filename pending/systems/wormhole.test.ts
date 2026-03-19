import {
	advanceWormholeStage,
	canStartWormhole,
	getNextStageCost,
	getTotalStages,
	getWormholeProgress,
	getWormholeState,
	getWormholeVisualPhase,
	resetWormhole,
	startWormholeConstruction,
} from "./wormhole";

// Mock dependencies
jest.mock("./factionEconomy", () => ({
	spendFactionResource: jest.fn(() => true),
}));

jest.mock("./techTree", () => ({
	hasTech: jest.fn(() => false),
}));

const { hasTech } = jest.mocked(jest.requireMock("./techTree"));
const { spendFactionResource } = jest.mocked(
	jest.requireMock("./factionEconomy"),
);

beforeEach(() => {
	resetWormhole();
	hasTech.mockReturnValue(false);
	spendFactionResource.mockReturnValue(true);
});

describe("canStartWormhole", () => {
	test("cannot start without wormhole_stabilization tech", () => {
		expect(canStartWormhole("player")).toBe(false);
	});

	test("can start with wormhole_stabilization tech", () => {
		hasTech.mockReturnValue(true);
		expect(canStartWormhole("player")).toBe(true);
	});

	test("cannot start if already building", () => {
		hasTech.mockReturnValue(true);
		startWormholeConstruction("player", 0, 0, 1);
		expect(canStartWormhole("player")).toBe(false);
	});
});

describe("startWormholeConstruction", () => {
	test("creates wormhole state at given position", () => {
		hasTech.mockReturnValue(true);
		const result = startWormholeConstruction("player", 10, 20, 5);
		expect(result).toBe(true);

		const state = getWormholeState();
		expect(state).not.toBeNull();
		expect(state!.builder).toBe("player");
		expect(state!.worldX).toBe(10);
		expect(state!.worldZ).toBe(20);
		expect(state!.stage).toBe(0);
		expect(state!.complete).toBe(false);
		expect(state!.startTurn).toBe(5);
	});

	test("returns false without tech", () => {
		const result = startWormholeConstruction("player", 0, 0, 1);
		expect(result).toBe(false);
		expect(getWormholeState()).toBeNull();
	});
});

describe("advanceWormholeStage", () => {
	beforeEach(() => {
		hasTech.mockReturnValue(true);
		startWormholeConstruction("player", 0, 0, 1);
	});

	test("increments stage and spends resources", () => {
		const result = advanceWormholeStage();
		expect(result).toBe(true);
		expect(getWormholeState()!.stage).toBe(1);
		expect(spendFactionResource).toHaveBeenCalled();
	});

	test("completes after all stages", () => {
		const total = getTotalStages();
		for (let i = 0; i < total; i++) {
			advanceWormholeStage();
		}
		expect(getWormholeState()!.complete).toBe(true);
		expect(getWormholeState()!.stage).toBe(total);
	});

	test("returns false when already complete", () => {
		const total = getTotalStages();
		for (let i = 0; i < total; i++) {
			advanceWormholeStage();
		}
		expect(advanceWormholeStage()).toBe(false);
	});

	test("returns false when resources insufficient", () => {
		spendFactionResource.mockReturnValue(false);
		expect(advanceWormholeStage()).toBe(false);
		expect(getWormholeState()!.stage).toBe(0);
	});
});

describe("getNextStageCost", () => {
	test("returns null when no wormhole exists", () => {
		expect(getNextStageCost()).toBeNull();
	});

	test("returns cost object for current stage", () => {
		hasTech.mockReturnValue(true);
		startWormholeConstruction("player", 0, 0, 1);
		const cost = getNextStageCost();
		expect(cost).not.toBeNull();
		expect(cost).toHaveProperty("uranics");
		expect(cost).toHaveProperty("heavy_metals");
	});
});

describe("progress and visual phase", () => {
	beforeEach(() => {
		hasTech.mockReturnValue(true);
		startWormholeConstruction("player", 0, 0, 1);
	});

	test("getWormholeProgress returns 0 at start", () => {
		expect(getWormholeProgress()).toBe(0);
	});

	test("getWormholeProgress increases with stages", () => {
		advanceWormholeStage();
		expect(getWormholeProgress()).toBeCloseTo(1 / getTotalStages());
	});

	test("visual phase progresses through stages", () => {
		expect(getWormholeVisualPhase()).toBe("foundation");

		advanceWormholeStage(); // stage 1
		expect(getWormholeVisualPhase()).toBe("frame");

		// Advance to stage 4
		advanceWormholeStage();
		advanceWormholeStage();
		advanceWormholeStage();
		expect(getWormholeVisualPhase()).toBe("vortex");

		// Advance to stage 8
		advanceWormholeStage();
		advanceWormholeStage();
		advanceWormholeStage();
		advanceWormholeStage();
		expect(getWormholeVisualPhase()).toBe("stabilization");

		// Complete
		advanceWormholeStage();
		advanceWormholeStage();
		expect(getWormholeVisualPhase()).toBe("complete");
	});
});

describe("reset", () => {
	test("resetWormhole clears state", () => {
		hasTech.mockReturnValue(true);
		startWormholeConstruction("player", 0, 0, 1);
		resetWormhole();
		expect(getWormholeState()).toBeNull();
		expect(getWormholeVisualPhase()).toBeNull();
	});
});
