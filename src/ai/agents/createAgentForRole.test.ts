import { CultistAgent } from "./CultistAgent";
import {
	createAgentForRole,
	rehydrateAgentFromState,
} from "./createAgentForRole";
import { HaulerAgent } from "./HaulerAgent";
import { HostileMachineAgent } from "./HostileMachineAgent";
import { PlayerUnitAgent } from "./PlayerUnitAgent";

describe("createAgentForRole", () => {
	it("creates typed wrappers for known roles", () => {
		expect(createAgentForRole("player_unit", "player-1")).toBeInstanceOf(
			PlayerUnitAgent,
		);
		expect(createAgentForRole("hauler", "hauler-1")).toBeInstanceOf(
			HaulerAgent,
		);
		expect(createAgentForRole("hostile_machine", "enemy-1")).toBeInstanceOf(
			HostileMachineAgent,
		);
		expect(createAgentForRole("cultist", "cultist-1")).toBeInstanceOf(
			CultistAgent,
		);
	});

	it("rehydrates persisted state onto role-specific agents", () => {
		const agent = rehydrateAgentFromState({
			entityId: "enemy-1",
			role: "hostile_machine",
			status: "executing_task",
			task: {
				id: "task-1",
				kind: "pursue_entity",
				phase: "moving",
				payload: {
					targetEntityId: "player-1",
					targetPosition: { x: 4, y: 0, z: 7 },
				},
			},
			steering: {
				behavior: "FollowPathBehavior",
				targetPosition: { x: 4, y: 0, z: 7 },
				arrivalTolerance: 0.25,
				maxSpeed: 1.75,
			},
			memory: {
				visibleEntities: ["player-1"],
				knownFacts: ["aggro"],
				lastUpdatedTick: 12,
			},
		});

		expect(agent).toBeInstanceOf(HostileMachineAgent);
		expect(agent.status).toBe("executing_task");
		expect(agent.maxSpeed).toBe(1.75);
		expect(agent.task?.kind).toBe("pursue_entity");
	});
});
