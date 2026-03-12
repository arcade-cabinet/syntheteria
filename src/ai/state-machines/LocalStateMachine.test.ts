import { LocalStateMachine } from "./LocalStateMachine";

describe("LocalStateMachine", () => {
	it("permits valid transitions", () => {
		const machine = new LocalStateMachine("idle", {
			idle: ["navigating"],
			navigating: ["idle", "blocked"],
			blocked: ["idle"],
		});

		machine.transition("navigating");
		machine.transition("blocked");
		machine.transition("idle");

		expect(machine.state).toBe("idle");
	});

	it("rejects invalid transitions", () => {
		const machine = new LocalStateMachine("idle", {
			idle: ["navigating"],
		});

		expect(() => machine.transition("blocked")).toThrow(
			"Invalid transition from idle to blocked.",
		);
	});
});
