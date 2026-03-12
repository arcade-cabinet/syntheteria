import type { KootaEntitySnapshot } from "../bridge/KootaYukaBridge";
import { AITestHarness } from "./AITestHarness";

describe("AITestHarness", () => {
	const entity: KootaEntitySnapshot = {
		entityId: "player-1",
		faction: "player",
		unitType: "maintenance_bot",
		buildingType: null,
		position: { x: 0, y: 0, z: 0 },
		speed: 1,
		scene: "world",
	};

	it("spawns and registers deterministic player agents", () => {
		const harness = new AITestHarness();

		const agent = harness.spawnPlayerAgent(entity);

		expect(agent.entityId).toBe("player-1");
		expect(agent.role).toBe("player_unit");
		expect(harness.runtime.registry.get("player-1")).toBe(agent);
	});

	it("advances through the shared runtime clock", () => {
		const harness = new AITestHarness();

		expect(harness.step(0.1)).toBe(6);
		expect(harness.runtime.clock.getSnapshot().tick).toBe(6);
	});

	it("resets the harness runtime", () => {
		const harness = new AITestHarness();
		harness.spawnPlayerAgent(entity);

		harness.reset();

		expect(harness.runtime.registry.size).toBe(0);
		expect(harness.runtime.clock.getSnapshot().tick).toBe(0);
	});
});
