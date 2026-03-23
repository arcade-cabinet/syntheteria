import type { AgentPersistenceState } from "../agents/types";
import {
	deserializeAIState,
	deserializeSingleAgentState,
	serializeAIState,
	serializeSingleAgentState,
} from "./AISerialization";

describe("AISerialization", () => {
	const agents: AgentPersistenceState[] = [
		{
			entityId: "hauler-1",
			role: "hauler",
			status: "executing_task",
			profile: {
				steeringProfile: "aerial_support",
				navigationProfile: "sector_aerial",
			},
			task: {
				id: "task-1",
				kind: "service_route",
				phase: "loading",
				payload: { routeId: "route-1" },
			},
			steering: {
				behavior: "FollowPathBehavior",
				targetPosition: { x: 1, y: 0, z: 2 },
				arrivalTolerance: 0.5,
				maxSpeed: 1.5,
			},
			memory: {
				visibleEntities: ["enemy-1"],
				knownFacts: ["poi:home_base"],
				lastUpdatedTick: 10,
			},
		},
	];

	it("round-trips AI bundles without mutation", () => {
		const serialized = serializeAIState(agents);
		const bundle = deserializeAIState(serialized);

		expect(bundle).toEqual({ version: 1, agents });
		expect(bundle.agents[0]).not.toBe(agents[0]);
	});

	it("rejects unsupported versions", () => {
		expect(() =>
			deserializeAIState(JSON.stringify({ version: 2, agents: [] })),
		).toThrow("Unsupported AI serialization version: 2");
	});

	it("round-trips a single agent state", () => {
		const serialized = serializeSingleAgentState(agents[0]);

		expect(deserializeSingleAgentState(serialized)).toEqual(agents[0]);
	});
});
