import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	finalizeTurnDeltas,
	getResourceDeltas,
	resetResourceDeltas,
	subscribeResourceDeltas,
	trackExpenditure,
	trackIncome,
} from "../resourceDeltaSystem";

beforeEach(() => {
	resetResourceDeltas();
});

describe("resourceDeltaSystem", () => {
	it("returns null before any turn is finalized", () => {
		expect(getResourceDeltas()).toBeNull();
	});

	it("tracks income for a resource type", () => {
		trackIncome("stone", 5);
		trackIncome("stone", 3);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.stone?.income).toBe(8);
		expect(deltas.stone?.expenditure).toBe(0);
		expect(deltas.stone?.net).toBe(8);
	});

	it("tracks expenditure for a resource type", () => {
		trackExpenditure("sand", 2);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.sand?.income).toBe(0);
		expect(deltas.sand?.expenditure).toBe(2);
		expect(deltas.sand?.net).toBe(-2);
	});

	it("calculates net correctly with both income and expenditure", () => {
		trackIncome("iron_ore", 10);
		trackExpenditure("iron_ore", 4);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.iron_ore?.income).toBe(10);
		expect(deltas.iron_ore?.expenditure).toBe(4);
		expect(deltas.iron_ore?.net).toBe(6);
	});

	it("resets accumulators after finalize", () => {
		trackIncome("stone", 5);
		finalizeTurnDeltas();

		// Second turn with no activity
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.stone?.income).toBe(0);
		expect(deltas.stone?.net).toBe(0);
	});

	it("ignores zero and negative amounts", () => {
		trackIncome("steel", 0);
		trackIncome("steel", -3);
		trackExpenditure("steel", 0);
		trackExpenditure("steel", -1);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.steel?.income).toBe(0);
		expect(deltas.steel?.expenditure).toBe(0);
	});

	it("tracks all 13 resource materials", () => {
		trackIncome("iron_ore", 1);
		trackIncome("steel", 2);
		trackIncome("timber", 3);
		trackIncome("circuits", 4);
		trackIncome("coal", 5);
		trackIncome("glass", 6);
		trackIncome("fuel", 7);
		trackIncome("quantum_crystal", 8);
		trackIncome("stone", 9);
		trackIncome("sand", 10);
		trackIncome("steel", 11);
		trackIncome("fuel", 12);
		trackIncome("alloy", 13);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.iron_ore?.income).toBe(1);
		expect(deltas.alloy?.income).toBe(13);
	});

	it("notifies subscribers on finalize", () => {
		const listener = vi.fn();
		const unsub = subscribeResourceDeltas(listener);

		finalizeTurnDeltas();
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
		finalizeTurnDeltas();
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("notifies subscribers on reset", () => {
		const listener = vi.fn();
		const unsub = subscribeResourceDeltas(listener);

		resetResourceDeltas();
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
	});

	it("resetResourceDeltas clears everything", () => {
		trackIncome("stone", 5);
		finalizeTurnDeltas();
		expect(getResourceDeltas()).not.toBeNull();

		resetResourceDeltas();
		expect(getResourceDeltas()).toBeNull();
	});

	it("finalizeTurnDeltas returns the snapshot", () => {
		trackIncome("quantum_crystal", 3);
		const deltas = finalizeTurnDeltas();
		expect(deltas.quantum_crystal?.income).toBe(3);
		expect(deltas.quantum_crystal?.net).toBe(3);
	});

	it("multiple finalize calls each reflect their own turn", () => {
		// Turn 1
		trackIncome("fuel", 10);
		trackExpenditure("fuel", 2);
		finalizeTurnDeltas();
		expect(getResourceDeltas()?.fuel?.net).toBe(8);

		// Turn 2
		trackExpenditure("fuel", 5);
		finalizeTurnDeltas();
		expect(getResourceDeltas()?.fuel?.net).toBe(-5);
	});
});
