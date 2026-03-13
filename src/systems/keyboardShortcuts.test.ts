// Mock window for node test environment
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
(globalThis as any).window = {
	addEventListener: mockAddEventListener,
	removeEventListener: mockRemoveEventListener,
};

jest.mock("../ecs/traits", () => ({
	Identity: Symbol("Identity"),
	Unit: Symbol("Unit"),
	Building: Symbol("Building"),
	WorldPosition: Symbol("WorldPosition"),
	MapFragment: Symbol("MapFragment"),
}));

jest.mock("../ecs/world", () => ({
	units: [],
	buildings: [],
}));

jest.mock("./radialMenu", () => ({
	getRadialMenuState: jest.fn(() => ({ open: false })),
	closeRadialMenu: jest.fn(),
}));

jest.mock("./buildingPlacement", () => ({
	getActivePlacement: jest.fn(() => null),
	cancelPlacement: jest.fn(),
}));

jest.mock("./unitSelection", () => ({
	selectEntity: jest.fn(),
	deselectAll: jest.fn(),
}));

jest.mock("./turnSystem", () => ({
	getTurnState: jest.fn(() => ({
		turnNumber: 1,
		phase: "player",
		activeFaction: "player",
		unitStates: new Map(),
		playerHasActions: true,
	})),
	endPlayerTurn: jest.fn(),
}));

import { cancelPlacement, getActivePlacement } from "./buildingPlacement";
import {
	_reset,
	handleEndTurn,
	handleEscape,
	installKeyboardShortcuts,
} from "./keyboardShortcuts";
import { closeRadialMenu, getRadialMenuState } from "./radialMenu";
import { endPlayerTurn, getTurnState } from "./turnSystem";

const mockGetRadialMenuState = getRadialMenuState as jest.Mock;
const mockGetActivePlacement = getActivePlacement as jest.Mock;
const mockGetTurnState = getTurnState as jest.Mock;

beforeEach(() => {
	_reset();
	jest.clearAllMocks();
	mockAddEventListener.mockClear();
	mockRemoveEventListener.mockClear();
	mockGetRadialMenuState.mockReturnValue({ open: false });
	mockGetActivePlacement.mockReturnValue(null);
	mockGetTurnState.mockReturnValue({
		turnNumber: 1,
		phase: "player",
		activeFaction: "player",
		unitStates: new Map(),
		playerHasActions: true,
	});
});

describe("keyboardShortcuts", () => {
	describe("handleEscape", () => {
		it("closes radial menu if open", () => {
			mockGetRadialMenuState.mockReturnValue({ open: true });
			handleEscape();
			expect(closeRadialMenu).toHaveBeenCalled();
			expect(cancelPlacement).not.toHaveBeenCalled();
		});

		it("cancels placement if active", () => {
			mockGetActivePlacement.mockReturnValue("lightning_rod");
			handleEscape();
			expect(cancelPlacement).toHaveBeenCalled();
		});

		it("calls pause callback if nothing else to cancel", () => {
			const pauseCb = jest.fn();
			installKeyboardShortcuts(pauseCb);

			handleEscape();
			expect(pauseCb).toHaveBeenCalled();

			_reset();
		});
	});

	describe("handleEndTurn", () => {
		it("calls endPlayerTurn when in player phase", () => {
			handleEndTurn();
			expect(endPlayerTurn).toHaveBeenCalled();
		});

		it("does not end turn during AI phase", () => {
			mockGetTurnState.mockReturnValue({
				turnNumber: 1,
				phase: "ai_faction",
				activeFaction: "reclaimers",
				unitStates: new Map(),
				playerHasActions: false,
			});

			handleEndTurn();
			expect(endPlayerTurn).not.toHaveBeenCalled();
		});
	});

	describe("installKeyboardShortcuts", () => {
		it("returns an uninstall function", () => {
			const uninstall = installKeyboardShortcuts();
			expect(typeof uninstall).toBe("function");
			uninstall();
		});

		it("installs keydown listener on window", () => {
			const uninstall = installKeyboardShortcuts();
			expect(mockAddEventListener).toHaveBeenCalledWith(
				"keydown",
				expect.any(Function),
			);
			uninstall();
		});

		it("removes keydown listener on uninstall", () => {
			const uninstall = installKeyboardShortcuts();
			uninstall();
			expect(mockRemoveEventListener).toHaveBeenCalledWith(
				"keydown",
				expect.any(Function),
			);
		});

		it("does not double-install", () => {
			const uninstall1 = installKeyboardShortcuts();
			installKeyboardShortcuts();
			// Second call should be a no-op — only one addEventListener
			expect(mockAddEventListener).toHaveBeenCalledTimes(1);

			uninstall1();
		});
	});
});
