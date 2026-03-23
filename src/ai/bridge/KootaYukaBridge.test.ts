import type { AgentPersistenceState } from "../agents/types";
import {
	DEFAULT_OWNERSHIP_MATRIX,
	type KootaEntitySnapshot,
	KootaYukaBridge,
} from "./KootaYukaBridge";

describe("KootaYukaBridge", () => {
	const entity: KootaEntitySnapshot = {
		entityId: "player-1",
		faction: "player",
		unitType: "maintenance_bot",
		buildingType: null,
		position: { x: 5, y: 0, z: 7 },
		speed: 2,
		scene: "world",
	};

	it("projects ECS snapshots into persisted agent state", () => {
		const bridge = new KootaYukaBridge();

		expect(bridge.projectToAgentState(entity)).toEqual({
			entityId: "player-1",
			role: "player_unit",
			status: "idle",
			task: null,
			steering: {
				behavior: null,
				targetPosition: null,
				arrivalTolerance: 0.25,
				maxSpeed: 2,
			},
			memory: {
				visibleEntities: [],
				knownFacts: [],
				lastUpdatedTick: 0,
			},
		});
	});

	it("prefers persisted AI state where available", () => {
		const bridge = new KootaYukaBridge();
		const persisted: AgentPersistenceState = {
			entityId: "player-1",
			role: "hauler",
			status: "executing_task",
			task: {
				id: "route-1",
				kind: "service_route",
				phase: "to_source",
				payload: { nodeId: "n-1" },
			},
			steering: {
				behavior: "FollowPathBehavior",
				targetPosition: { x: 9, y: 0, z: 12 },
				arrivalTolerance: 0.5,
				maxSpeed: 3,
			},
			memory: {
				visibleEntities: ["enemy-1"],
				knownFacts: ["node_claimed"],
				lastUpdatedTick: 42,
			},
		};

		expect(bridge.projectToAgentState(entity, persisted)).toEqual(persisted);
	});

	it("projects bounded write-back data", () => {
		const bridge = new KootaYukaBridge();

		expect(
			bridge.projectToWriteback({
				entityId: "player-1",
				role: "player_unit",
				status: "navigating",
				task: {
					id: "task-1",
					kind: "travel_to_poi",
					phase: "moving",
					payload: {},
				},
				steering: {
					behavior: "ArriveBehavior",
					targetPosition: { x: 2, y: 0, z: 3 },
					arrivalTolerance: 0.25,
					maxSpeed: 2,
				},
				memory: {
					visibleEntities: [],
					knownFacts: [],
					lastUpdatedTick: 0,
				},
			}),
		).toEqual({
			entityId: "player-1",
			position: { x: 2, y: 0, z: 3 },
			status: "navigating",
			taskKind: "travel_to_poi",
		});
	});

	it("publishes an explicit ownership matrix", () => {
		expect(DEFAULT_OWNERSHIP_MATRIX).toEqual({
			kootaOwns: [
				"identity",
				"faction",
				"world_position",
				"scene",
				"unit_type",
				"building_type",
			],
			yukaOwns: ["steering_runtime", "task_runtime", "decision_runtime"],
			persistenceOwns: ["serialized_ai_state", "route_state", "agent_memory"],
		});
	});
});
