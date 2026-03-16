import { Vector3 } from "yuka";
import { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import {
	applyArrive,
	applyArriveWithSeparation,
	applyFlee,
	applySeek,
	applySeekWithSeparation,
	applySeparation,
	clearSteering,
} from "./SteeringComposer";

function createTestAgent(entityId = "test-bot"): SyntheteriaAgent {
	return new SyntheteriaAgent({
		entityId,
		role: "player_unit",
		maxSpeed: 3,
		steeringProfile: "biped_scout",
		navigationProfile: "sector_surface_standard",
	});
}

describe("SteeringComposer", () => {
	describe("applySeek", () => {
		it("adds a seek behavior to the agent", () => {
			const agent = createTestAgent();
			const target = new Vector3(10, 0, 10);

			applySeek(agent, target);

			expect(agent.steering.behaviors.length).toBe(1);
			expect(agent.steering.behaviors[0].constructor.name).toBe("SeekBehavior");
		});
	});

	describe("applyArrive", () => {
		it("adds an arrive behavior to the agent", () => {
			const agent = createTestAgent();
			const target = new Vector3(5, 0, 5);

			applyArrive(agent, target);

			expect(agent.steering.behaviors.length).toBe(1);
			expect(agent.steering.behaviors[0].constructor.name).toBe(
				"ArriveBehavior",
			);
		});

		it("respects custom deceleration parameter", () => {
			const agent = createTestAgent();
			const target = new Vector3(5, 0, 5);

			applyArrive(agent, target, 5);

			expect(agent.steering.behaviors.length).toBe(1);
		});
	});

	describe("applyFlee", () => {
		it("adds a flee behavior and boosts speed", () => {
			const agent = createTestAgent();
			const originalSpeed = agent.maxSpeed;
			const threat = new Vector3(2, 0, 2);

			applyFlee(agent, threat);

			expect(agent.steering.behaviors.length).toBe(1);
			expect(agent.steering.behaviors[0].constructor.name).toBe("FleeBehavior");
			// Flee policy boosts maxSpeed by 1.2x
			expect(agent.maxSpeed).toBeCloseTo(originalSpeed * 1.2);
		});
	});

	describe("applySeparation", () => {
		it("adds a separation behavior with neighborhood radius", () => {
			const agent = createTestAgent();
			const neighbors = [createTestAgent("neighbor-1")];

			applySeparation(agent, neighbors);

			expect(agent.steering.behaviors.length).toBe(1);
			expect(agent.steering.behaviors[0].constructor.name).toBe(
				"SeparationBehavior",
			);
			expect(agent.neighborhoodRadius).toBe(1.5);
			expect(agent.updateNeighborhood).toBe(true);
		});

		it("respects custom separation radius", () => {
			const agent = createTestAgent();

			applySeparation(agent, [], 3.0);

			expect(agent.neighborhoodRadius).toBe(3.0);
		});
	});

	describe("clearSteering", () => {
		it("removes all behaviors", () => {
			const agent = createTestAgent();
			applySeek(agent, new Vector3(1, 0, 1));
			applySeek(agent, new Vector3(2, 0, 2));
			expect(agent.steering.behaviors.length).toBe(2);

			clearSteering(agent);

			expect(agent.steering.behaviors.length).toBe(0);
		});
	});

	describe("combo behaviors", () => {
		it("applySeekWithSeparation adds 2 behaviors", () => {
			const agent = createTestAgent();

			applySeekWithSeparation(agent, new Vector3(10, 0, 10));

			expect(agent.steering.behaviors.length).toBe(2);
			const names = agent.steering.behaviors.map((b) => b.constructor.name);
			expect(names).toContain("SeekBehavior");
			expect(names).toContain("SeparationBehavior");
		});

		it("applyArriveWithSeparation adds 2 behaviors", () => {
			const agent = createTestAgent();

			applyArriveWithSeparation(agent, new Vector3(5, 0, 5));

			expect(agent.steering.behaviors.length).toBe(2);
			const names = agent.steering.behaviors.map((b) => b.constructor.name);
			expect(names).toContain("ArriveBehavior");
			expect(names).toContain("SeparationBehavior");
		});

		it("sets neighborhood radius for separation combos", () => {
			const agent = createTestAgent();

			applySeekWithSeparation(agent, new Vector3(1, 0, 1), 2.5);

			expect(agent.neighborhoodRadius).toBe(2.5);
			expect(agent.updateNeighborhood).toBe(true);
		});
	});

	describe("behavior stacking", () => {
		it("allows layering multiple behaviors sequentially", () => {
			const agent = createTestAgent();
			applySeek(agent, new Vector3(10, 0, 10));
			applySeparation(agent, []);

			expect(agent.steering.behaviors.length).toBe(2);
		});
	});
});
