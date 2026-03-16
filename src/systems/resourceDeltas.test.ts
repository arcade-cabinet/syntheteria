import {
	finalizeTurnDeltas,
	getResourceDeltas,
	resetResourceDeltas,
	subscribeResourceDeltas,
	trackResourceExpenditure,
	trackResourceIncome,
} from "./resourceDeltas";

beforeEach(() => {
	resetResourceDeltas();
});

describe("resourceDeltas", () => {
	test("returns null before any turn is finalized", () => {
		expect(getResourceDeltas()).toBeNull();
	});

	test("tracks income for a resource type", () => {
		trackResourceIncome("scrapMetal", 5);
		trackResourceIncome("scrapMetal", 3);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas();
		expect(deltas).not.toBeNull();
		expect(deltas!.scrapMetal.income).toBe(8);
		expect(deltas!.scrapMetal.expenditure).toBe(0);
		expect(deltas!.scrapMetal.net).toBe(8);
	});

	test("tracks expenditure for a resource type", () => {
		trackResourceExpenditure("eWaste", 2);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas();
		expect(deltas!.eWaste.income).toBe(0);
		expect(deltas!.eWaste.expenditure).toBe(2);
		expect(deltas!.eWaste.net).toBe(-2);
	});

	test("calculates net correctly with both income and expenditure", () => {
		trackResourceIncome("ferrousScrap", 10);
		trackResourceExpenditure("ferrousScrap", 4);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas();
		expect(deltas!.ferrousScrap.income).toBe(10);
		expect(deltas!.ferrousScrap.expenditure).toBe(4);
		expect(deltas!.ferrousScrap.net).toBe(6);
	});

	test("resets accumulators after finalize", () => {
		trackResourceIncome("scrapMetal", 5);
		finalizeTurnDeltas();

		// Second turn with no activity
		finalizeTurnDeltas();

		const deltas = getResourceDeltas();
		expect(deltas!.scrapMetal.income).toBe(0);
		expect(deltas!.scrapMetal.net).toBe(0);
	});

	test("ignores zero and negative amounts", () => {
		trackResourceIncome("alloyStock", 0);
		trackResourceIncome("alloyStock", -3);
		trackResourceExpenditure("alloyStock", 0);
		trackResourceExpenditure("alloyStock", -1);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas();
		expect(deltas!.alloyStock.income).toBe(0);
		expect(deltas!.alloyStock.expenditure).toBe(0);
	});

	test("tracks all 11 resource types", () => {
		trackResourceIncome("scrapMetal", 1);
		trackResourceIncome("eWaste", 2);
		trackResourceIncome("intactComponents", 3);
		trackResourceIncome("ferrousScrap", 4);
		trackResourceIncome("alloyStock", 5);
		trackResourceIncome("polymerSalvage", 6);
		trackResourceIncome("conductorWire", 7);
		trackResourceIncome("electrolyte", 8);
		trackResourceIncome("siliconWafer", 9);
		trackResourceIncome("stormCharge", 10);
		trackResourceIncome("elCrystal", 11);
		finalizeTurnDeltas();

		const deltas = getResourceDeltas();
		expect(deltas!.scrapMetal.income).toBe(1);
		expect(deltas!.elCrystal.income).toBe(11);
	});

	test("notifies subscribers on finalize", () => {
		const listener = jest.fn();
		const unsub = subscribeResourceDeltas(listener);

		finalizeTurnDeltas();
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
		finalizeTurnDeltas();
		expect(listener).toHaveBeenCalledTimes(1);
	});

	test("resetResourceDeltas clears everything", () => {
		trackResourceIncome("scrapMetal", 5);
		finalizeTurnDeltas();
		expect(getResourceDeltas()).not.toBeNull();

		resetResourceDeltas();
		expect(getResourceDeltas()).toBeNull();
	});
});
