import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RadialOpenContext } from "../radialMenu";
import {
	_reset,
	closeRadialMenu,
	confirmRadialSelection,
	getRadialMenuState,
	getResolvedActionsForCategory,
	hitTestRadial,
	openRadialMenu,
	registerRadialProvider,
	updateRadialHover,
} from "../radialMenu";

function makeContext(
	overrides: Partial<RadialOpenContext> = {},
): RadialOpenContext {
	return {
		selectionType: "unit",
		targetEntityId: "unit-1",
		targetSector: { q: 3, r: 5 },
		targetFaction: "player",
		...overrides,
	};
}

describe("radialMenu", () => {
	beforeEach(() => {
		_reset();
	});

	it("registerRadialProvider adds a provider", () => {
		const execute = vi.fn();
		registerRadialProvider({
			id: "test",
			category: {
				id: "test_cat",
				label: "Test",
				icon: "T",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "test_action",
					label: "Test Action",
					icon: "T",
					tone: "neutral",
					enabled: true,
					onExecute: execute,
				},
			],
		});

		openRadialMenu(100, 200, makeContext());
		const state = getRadialMenuState();
		expect(state.open).toBe(true);
		expect(state.innerPetals).toHaveLength(1);
		expect(state.innerPetals[0].id).toBe("test_cat");
	});

	it("openRadialMenu composes categories from providers", () => {
		registerRadialProvider({
			id: "move",
			category: {
				id: "move",
				label: "Move",
				icon: "M",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "move_here",
					label: "Move Here",
					icon: "M",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});
		registerRadialProvider({
			id: "attack",
			category: {
				id: "attack",
				label: "Attack",
				icon: "A",
				tone: "hostile",
				priority: 2,
			},
			getActions: () => [
				{
					id: "attack",
					label: "Attack",
					icon: "A",
					tone: "hostile",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		openRadialMenu(300, 400, makeContext());
		const state = getRadialMenuState();
		expect(state.open).toBe(true);
		expect(state.centerX).toBe(300);
		expect(state.centerY).toBe(400);
		expect(state.innerPetals).toHaveLength(2);
		// Sorted by priority
		expect(state.innerPetals[0].id).toBe("move");
		expect(state.innerPetals[1].id).toBe("attack");
	});

	it("openRadialMenu does nothing when no providers match", () => {
		registerRadialProvider({
			id: "empty",
			category: {
				id: "empty",
				label: "Empty",
				icon: "E",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [],
		});

		openRadialMenu(100, 200, makeContext());
		expect(getRadialMenuState().open).toBe(false);
	});

	it("updateRadialHover sets hovered index for inner ring", () => {
		registerRadialProvider({
			id: "test",
			category: {
				id: "test_cat",
				label: "Test",
				icon: "T",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "a1",
					label: "A1",
					icon: "1",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
				{
					id: "a2",
					label: "A2",
					icon: "2",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		openRadialMenu(500, 500, makeContext());

		// Hover near 12 o'clock but slightly right to avoid gap boundary
		// Inner ring is at innerRadius=40 to outerRadius=90, midpoint ~65px
		// Slight offset to avoid the exact gap start at -90deg
		updateRadialHover(500 + 5, 500 - 65);
		const state = getRadialMenuState();
		expect(state.innerHoveredIndex).toBe(0);
	});

	it("confirmRadialSelection calls onExecute for outer ring", () => {
		const execute1 = vi.fn();
		const execute2 = vi.fn();
		registerRadialProvider({
			id: "cat_a",
			category: {
				id: "cat_a",
				label: "Cat A",
				icon: "A",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "a1",
					label: "Action 1",
					icon: "1",
					tone: "neutral",
					enabled: true,
					onExecute: execute1,
				},
				{
					id: "a2",
					label: "Action 2",
					icon: "2",
					tone: "neutral",
					enabled: true,
					onExecute: execute2,
				},
			],
		});
		registerRadialProvider({
			id: "cat_b",
			category: {
				id: "cat_b",
				label: "Cat B",
				icon: "B",
				tone: "hostile",
				priority: 2,
			},
			getActions: () => [
				{
					id: "b1",
					label: "B1",
					icon: "B",
					tone: "hostile",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		openRadialMenu(500, 500, makeContext());

		// With 2 categories, each gets ~178deg arc.
		// Cat A (priority 1) starts near -88deg (12 o'clock).
		// Hover at 12 o'clock direction to hit cat_a inner petal
		updateRadialHover(500 + 5, 500 - 65);
		let state = getRadialMenuState();
		expect(state.innerHoveredIndex).toBe(0);
		expect(state.outerRingOpen).toBe(true);

		// The inner petal midpoint for cat_a: start ~ -88, end ~ 88ish
		// mid ~ 0 degrees (3 o'clock / right direction)
		// Outer ring fans around that: 2 actions, maxArc=90, so from -45 to +45 deg
		// First outer petal centered around -20ish deg (above-right)
		// Hover in that direction at outer ring distance (~123px)
		const outerAngle = -20 * (Math.PI / 180); // radians
		const outerDist = 123;
		updateRadialHover(
			500 + Math.cos(outerAngle) * outerDist,
			500 + Math.sin(outerAngle) * outerDist,
		);
		state = getRadialMenuState();
		expect(state.outerHoveredIndex).toBeGreaterThanOrEqual(0);

		confirmRadialSelection();
		// One of the two actions should have been called
		expect(execute1.mock.calls.length + execute2.mock.calls.length).toBe(1);
		expect(getRadialMenuState().open).toBe(false);
	});

	it("closeRadialMenu resets state", () => {
		registerRadialProvider({
			id: "test",
			category: {
				id: "cat",
				label: "Cat",
				icon: "C",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "a",
					label: "A",
					icon: "A",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		openRadialMenu(100, 200, makeContext());
		expect(getRadialMenuState().open).toBe(true);

		closeRadialMenu();
		const state = getRadialMenuState();
		expect(state.open).toBe(false);
		expect(state.innerPetals).toHaveLength(0);
		expect(state.outerPetals).toHaveLength(0);
		expect(state.context).toBeNull();
	});

	it("hitTestRadial returns correct ring and index", () => {
		registerRadialProvider({
			id: "test",
			category: {
				id: "cat",
				label: "Cat",
				icon: "C",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "a",
					label: "A",
					icon: "A",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		openRadialMenu(0, 0, makeContext());

		// Test inner ring hit (distance ~65, within 40-90)
		// Slight X offset to avoid exact gap boundary at -90deg
		const innerHit = hitTestRadial(5, -65);
		expect(innerHit.ring).toBe("inner");
		expect(innerHit.index).toBe(0);

		// Test miss (distance ~20, inside inner radius)
		const miss = hitTestRadial(10, 10);
		expect(miss.ring).toBe("none");

		// Test miss (distance way outside)
		const farMiss = hitTestRadial(500, 500);
		expect(farMiss.ring).toBe("none");
	});

	it("single-action category executes directly without outer ring", () => {
		const execute = vi.fn();
		registerRadialProvider({
			id: "single",
			category: {
				id: "single_cat",
				label: "Single",
				icon: "S",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "only_action",
					label: "Only",
					icon: "O",
					tone: "neutral",
					enabled: true,
					onExecute: execute,
				},
			],
		});

		openRadialMenu(500, 500, makeContext());

		// Hover the single inner petal (slight offset to avoid gap)
		updateRadialHover(500 + 5, 500 - 65);
		const state = getRadialMenuState();
		// Single-action category: outer ring should NOT open
		expect(state.outerRingOpen).toBe(false);
		expect(state.innerHoveredIndex).toBe(0);

		// Confirm — should execute the single action directly
		confirmRadialSelection();
		expect(execute).toHaveBeenCalledTimes(1);
		expect(getRadialMenuState().open).toBe(false);
	});

	it("getResolvedActionsForCategory returns actions for open menu", () => {
		registerRadialProvider({
			id: "test",
			category: {
				id: "cat",
				label: "Cat",
				icon: "C",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "a1",
					label: "A1",
					icon: "1",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		openRadialMenu(100, 200, makeContext());
		const actions = getResolvedActionsForCategory("cat");
		expect(actions).toHaveLength(1);
		expect(actions[0].id).toBe("a1");
	});

	it("disabled actions are not executed", () => {
		const execute = vi.fn();
		registerRadialProvider({
			id: "disabled",
			category: {
				id: "cat",
				label: "Cat",
				icon: "C",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "disabled_action",
					label: "Disabled",
					icon: "D",
					tone: "neutral",
					enabled: false,
					disabledReason: "No AP",
					onExecute: execute,
				},
			],
		});

		openRadialMenu(500, 500, makeContext());
		updateRadialHover(500, 500 - 65);
		confirmRadialSelection();
		expect(execute).not.toHaveBeenCalled();
	});

	it("replaces existing provider with same ID", () => {
		registerRadialProvider({
			id: "dup",
			category: {
				id: "cat",
				label: "Old",
				icon: "O",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "old",
					label: "Old",
					icon: "O",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		registerRadialProvider({
			id: "dup",
			category: {
				id: "cat",
				label: "New",
				icon: "N",
				tone: "neutral",
				priority: 1,
			},
			getActions: () => [
				{
					id: "new",
					label: "New",
					icon: "N",
					tone: "neutral",
					enabled: true,
					onExecute: vi.fn(),
				},
			],
		});

		openRadialMenu(100, 200, makeContext());
		const state = getRadialMenuState();
		expect(state.innerPetals).toHaveLength(1);
		expect(state.innerPetals[0].label).toBe("New");
	});
});
