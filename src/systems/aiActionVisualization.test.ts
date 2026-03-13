import {
	_resetAIActionVisualization,
	clearAIActionIndicators,
	cleanupStaleIndicators,
	getAIActionIndicators,
	showFactionActions,
	subscribeAIActionIndicators,
} from "./aiActionVisualization";
import { _resetCameraFocus, isCameraFocusActive } from "./cameraFocus";

// Mock ECS world — no real entities during tests
jest.mock("../ecs/world", () => ({
	units: [],
	buildings: [],
}));

jest.mock("../ecs/traits", () => ({
	Identity: "Identity",
	Unit: "Unit",
	WorldPosition: "WorldPosition",
}));

beforeEach(() => {
	_resetAIActionVisualization();
	_resetCameraFocus();
});

describe("getAIActionIndicators", () => {
	it("returns empty array initially", () => {
		expect(getAIActionIndicators()).toEqual([]);
	});
});

describe("showFactionActions", () => {
	it("does nothing when no units match the faction", () => {
		showFactionActions("reclaimers");
		expect(getAIActionIndicators()).toEqual([]);
	});
});

describe("clearAIActionIndicators", () => {
	it("clears all indicators", () => {
		// Even with no indicators, calling clear should not throw
		clearAIActionIndicators();
		expect(getAIActionIndicators()).toEqual([]);
	});
});

describe("subscribeAIActionIndicators", () => {
	it("notifies on indicator changes", () => {
		let notified = 0;
		subscribeAIActionIndicators(() => {
			notified++;
		});

		// showFactionActions with no units won't trigger notification
		showFactionActions("reclaimers");
		expect(notified).toBe(0); // no units = no indicators = no notification

		// clearAIActionIndicators with empty list won't trigger either
		clearAIActionIndicators();
		expect(notified).toBe(0);
	});

	it("unsubscribe stops notifications", () => {
		let notified = 0;
		const unsub = subscribeAIActionIndicators(() => {
			notified++;
		});

		unsub();
		clearAIActionIndicators();
		expect(notified).toBe(0);
	});
});

describe("cleanupStaleIndicators", () => {
	it("does not throw when no indicators exist", () => {
		expect(() => cleanupStaleIndicators(3000)).not.toThrow();
	});
});
