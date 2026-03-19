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
		trackIncome("scrap_metal", 5);
		trackIncome("scrap_metal", 3);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.scrap_metal?.income).toBe(8);
		expect(deltas.scrap_metal?.expenditure).toBe(0);
		expect(deltas.scrap_metal?.net).toBe(8);
	});

	it("tracks expenditure for a resource type", () => {
		trackExpenditure("e_waste", 2);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.e_waste?.income).toBe(0);
		expect(deltas.e_waste?.expenditure).toBe(2);
		expect(deltas.e_waste?.net).toBe(-2);
	});

	it("calculates net correctly with both income and expenditure", () => {
		trackIncome("ferrous_scrap", 10);
		trackExpenditure("ferrous_scrap", 4);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.ferrous_scrap?.income).toBe(10);
		expect(deltas.ferrous_scrap?.expenditure).toBe(4);
		expect(deltas.ferrous_scrap?.net).toBe(6);
	});

	it("resets accumulators after finalize", () => {
		trackIncome("scrap_metal", 5);
		finalizeTurnDeltas();

		// Second turn with no activity
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.scrap_metal?.income).toBe(0);
		expect(deltas.scrap_metal?.net).toBe(0);
	});

	it("ignores zero and negative amounts", () => {
		trackIncome("alloy_stock", 0);
		trackIncome("alloy_stock", -3);
		trackExpenditure("alloy_stock", 0);
		trackExpenditure("alloy_stock", -1);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.alloy_stock?.income).toBe(0);
		expect(deltas.alloy_stock?.expenditure).toBe(0);
	});

	it("tracks all 13 resource materials", () => {
		trackIncome("ferrous_scrap", 1);
		trackIncome("alloy_stock", 2);
		trackIncome("polymer_salvage", 3);
		trackIncome("conductor_wire", 4);
		trackIncome("electrolyte", 5);
		trackIncome("silicon_wafer", 6);
		trackIncome("storm_charge", 7);
		trackIncome("el_crystal", 8);
		trackIncome("scrap_metal", 9);
		trackIncome("e_waste", 10);
		trackIncome("intact_components", 11);
		trackIncome("thermal_fluid", 12);
		trackIncome("depth_salvage", 13);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas()!;
		expect(deltas.ferrous_scrap?.income).toBe(1);
		expect(deltas.depth_salvage?.income).toBe(13);
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
		trackIncome("scrap_metal", 5);
		finalizeTurnDeltas();
		expect(getResourceDeltas()).not.toBeNull();

		resetResourceDeltas();
		expect(getResourceDeltas()).toBeNull();
	});

	it("finalizeTurnDeltas returns the snapshot", () => {
		trackIncome("el_crystal", 3);
		const deltas = finalizeTurnDeltas();
		expect(deltas.el_crystal?.income).toBe(3);
		expect(deltas.el_crystal?.net).toBe(3);
	});

	it("multiple finalize calls each reflect their own turn", () => {
		// Turn 1
		trackIncome("storm_charge", 10);
		trackExpenditure("storm_charge", 2);
		finalizeTurnDeltas();
		expect(getResourceDeltas()?.storm_charge?.net).toBe(8);

		// Turn 2
		trackExpenditure("storm_charge", 5);
		finalizeTurnDeltas();
		expect(getResourceDeltas()?.storm_charge?.net).toBe(-5);
	});
});
