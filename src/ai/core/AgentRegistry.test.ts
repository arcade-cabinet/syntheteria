import { PlayerUnitAgent } from "../agents/PlayerUnitAgent";
import { AgentRegistry } from "./AgentRegistry";

describe("AgentRegistry", () => {
	it("registers and retrieves agents", () => {
		const registry = new AgentRegistry();
		const agent = new PlayerUnitAgent("player-1");

		registry.register(agent);

		expect(registry.get("player-1")).toBe(agent);
		expect(registry.size).toBe(1);
	});

	it("rejects duplicate registration", () => {
		const registry = new AgentRegistry();
		registry.register(new PlayerUnitAgent("player-1"));

		expect(() => registry.register(new PlayerUnitAgent("player-1"))).toThrow(
			"Agent player-1 is already registered.",
		);
	});

	it("supports upsert and removal", () => {
		const registry = new AgentRegistry();
		const agent = new PlayerUnitAgent("player-1");

		registry.upsert(agent);

		expect(registry.remove("player-1")).toBe(true);
		expect(registry.get("player-1")).toBeNull();
	});
});
