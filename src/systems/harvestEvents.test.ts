import {
	expireHarvestEvents,
	getHarvestYieldEvents,
	pushHarvestYield,
	resetHarvestEvents,
} from "./harvestEvents";

beforeEach(() => {
	resetHarvestEvents();
});

describe("harvestEvents", () => {
	it("pushes a yield event from a harvest yield map", () => {
		const yields = new Map<any, number>();
		yields.set("heavy_metals", 3);
		yields.set("scrap", 1);

		pushHarvestYield(10, 20, yields, 100);

		const events = getHarvestYieldEvents();
		expect(events).toHaveLength(1);
		expect(events[0].x).toBe(10);
		expect(events[0].z).toBe(20);
		expect(events[0].yields).toHaveLength(2);
		expect(events[0].yields[0]).toEqual({
			resource: "heavy_metals",
			amount: 3,
		});
		expect(events[0].yields[1]).toEqual({ resource: "scrap", amount: 1 });
		expect(events[0].createdAtTick).toBe(100);
	});

	it("skips yields with zero amounts", () => {
		const yields = new Map<any, number>();
		yields.set("heavy_metals", 0);
		yields.set("scrap", 2);

		pushHarvestYield(0, 0, yields, 50);

		const events = getHarvestYieldEvents();
		expect(events).toHaveLength(1);
		expect(events[0].yields).toHaveLength(1);
		expect(events[0].yields[0].resource).toBe("scrap");
	});

	it("does not push an event with all-zero yields", () => {
		const yields = new Map<any, number>();
		yields.set("heavy_metals", 0);

		pushHarvestYield(0, 0, yields, 50);

		expect(getHarvestYieldEvents()).toHaveLength(0);
	});

	it("caps at 6 events", () => {
		const yields = new Map<any, number>();
		yields.set("scrap", 1);

		for (let i = 0; i < 10; i++) {
			pushHarvestYield(i, i, yields, i);
		}

		expect(getHarvestYieldEvents()).toHaveLength(6);
	});

	it("expires events older than lifetime", () => {
		const yields = new Map<any, number>();
		yields.set("scrap", 1);

		pushHarvestYield(0, 0, yields, 100);
		pushHarvestYield(1, 1, yields, 200);

		// Event at tick 100 should expire at tick 281 (lifetime = 180)
		expireHarvestEvents(280);
		expect(getHarvestYieldEvents()).toHaveLength(2);

		expireHarvestEvents(281);
		expect(getHarvestYieldEvents()).toHaveLength(1);
		expect(getHarvestYieldEvents()[0].x).toBe(1);
	});

	it("notifies listeners on push", () => {
		const { subscribeHarvestEvents } = require("./harvestEvents");
		const listener = jest.fn();
		const unsub = subscribeHarvestEvents(listener);

		const yields = new Map<any, number>();
		yields.set("scrap", 1);
		pushHarvestYield(0, 0, yields, 0);

		expect(listener).toHaveBeenCalledTimes(1);
		unsub();
	});

	it("resets clears all events", () => {
		const yields = new Map<any, number>();
		yields.set("scrap", 1);
		pushHarvestYield(0, 0, yields, 0);

		resetHarvestEvents();
		expect(getHarvestYieldEvents()).toHaveLength(0);
	});
});
