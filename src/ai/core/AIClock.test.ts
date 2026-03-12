import { AIClock } from "./AIClock";

describe("AIClock", () => {
	it("steps deterministically in fixed increments", () => {
		const clock = new AIClock(0.5);

		expect(clock.step(0.4)).toBe(0);
		expect(clock.getSnapshot().tick).toBe(0);

		expect(clock.step(0.6)).toBe(2);
		expect(clock.getSnapshot().tick).toBe(2);
		expect(clock.getSnapshot().accumulator).toBeCloseTo(0, 6);
	});

	it("rejects negative deltas", () => {
		const clock = new AIClock();

		expect(() => clock.step(-0.1)).toThrow("AIClock cannot step backwards.");
	});

	it("resets accumulated state", () => {
		const clock = new AIClock(0.25);
		clock.step(1);

		clock.reset();

		expect(clock.getSnapshot()).toEqual({
			accumulator: 0,
			deltaSeconds: 0,
			fixedStepSeconds: 0.25,
			tick: 0,
		});
	});
});
