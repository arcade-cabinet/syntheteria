import { describe, expect, it } from "vitest";
import { EPOCH_EVENTS, getEpochEvent } from "../epochEventDefs";

describe("epochEventDefs", () => {
	it("defines events for epochs 2-5 (epoch 1 is awakening — no event)", () => {
		expect(EPOCH_EVENTS.length).toBe(4);
		const epochNumbers = EPOCH_EVENTS.map((e) => e.epochNumber);
		expect(epochNumbers).toContain(2);
		expect(epochNumbers).toContain(3);
		expect(epochNumbers).toContain(4);
		expect(epochNumbers).toContain(5);
		expect(epochNumbers).not.toContain(1);
	});

	it("getEpochEvent returns correct event for each epoch", () => {
		const e2 = getEpochEvent(2);
		expect(e2).toBeDefined();
		expect(e2!.id).toBe("signal_horizon");
		expect(e2!.title).toBe("Signal Horizon");

		const e3 = getEpochEvent(3);
		expect(e3).toBeDefined();
		expect(e3!.id).toBe("lattice_tightens");

		const e4 = getEpochEvent(4);
		expect(e4).toBeDefined();
		expect(e4!.id).toBe("eye_of_storm");

		const e5 = getEpochEvent(5);
		expect(e5).toBeDefined();
		expect(e5!.id).toBe("final_frequency");
	});

	it("getEpochEvent returns undefined for missing epoch", () => {
		expect(getEpochEvent(1)).toBeUndefined();
		expect(getEpochEvent(0)).toBeUndefined();
		expect(getEpochEvent(6)).toBeUndefined();
	});

	it("all events have required fields", () => {
		for (const event of EPOCH_EVENTS) {
			expect(event.id).toBeTruthy();
			expect(event.epochNumber).toBeGreaterThanOrEqual(2);
			expect(event.epochNumber).toBeLessThanOrEqual(5);
			expect(event.title).toBeTruthy();
			expect(event.description).toBeTruthy();
			expect(event.speechLine).toBeTruthy();
			expect(event.toastMessage).toBeTruthy();
		}
	});

	it("event IDs are unique", () => {
		const ids = EPOCH_EVENTS.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
