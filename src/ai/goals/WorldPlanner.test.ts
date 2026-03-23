import {
	Hacking,
	Identity,
	Signal,
	type UnitEntity,
	WorldPosition,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import { CultistAgent } from "../agents/CultistAgent";
import { HostileMachineAgent } from "../agents/HostileMachineAgent";
import { PlayerUnitAgent } from "../agents/PlayerUnitAgent";
import { planAgentTask } from "./WorldPlanner";

function createMockEntity({
	faction,
	id,
	position,
	signalConnected = true,
	targetId = null,
}: {
	faction: "player" | "feral" | "cultist";
	id: string;
	position: { x: number; y: number; z: number };
	signalConnected?: boolean;
	targetId?: string | null;
}) {
	return {
		get(trait: object) {
			if (trait === Identity) {
				return { id, faction };
			}
			if (trait === WorldPosition) {
				return position;
			}
			if (trait === Signal) {
				return { connected: signalConnected };
			}
			if (trait === Hacking) {
				return {
					targetId,
					technique: null,
					progress: 0,
					computeCostPerTick: 1,
				};
			}
			return undefined;
		},
	} as UnitEntity;
}

describe("planAgentTask", () => {
	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
	});

	it("plans hostile pursuit against the nearest player target", () => {
		const hostile = createMockEntity({
			faction: "feral",
			id: "feral-1",
			position: { x: 0, y: 0, z: 0 },
		});
		const player = createMockEntity({
			faction: "player",
			id: "player-1",
			position: { x: 4, y: 0, z: 2 },
		});
		const decision = planAgentTask({
			tick: 30,
			entity: hostile,
			agent: new HostileMachineAgent("feral-1"),
			nearestPlayerTarget: player,
		});

		expect(decision?.task?.kind).toBe("move_to_entity");
		expect(decision?.task?.payload.targetEntityId).toBe("player-1");
		expect(decision?.targetPosition).toEqual({ x: 4, y: 0, z: 2 });
	});

	it("plans a lightning attack for cultists already in range", () => {
		const cultist = createMockEntity({
			faction: "cultist",
			id: "cult-1",
			position: { x: 0, y: 0, z: 0 },
		});
		const player = createMockEntity({
			faction: "player",
			id: "player-2",
			position: { x: 3, y: 0, z: 2 },
		});
		const decision = planAgentTask({
			tick: 45,
			entity: cultist,
			agent: new CultistAgent("cult-1"),
			nearestPlayerTarget: player,
		});

		expect(decision?.task?.kind).toBe("call_lightning");
		expect(decision?.task?.phase).toBe("channeling");
		expect(decision?.task?.payload.targetEntityId).toBe("player-2");
	});

	it("turns hacking intent into an approach task for the requested target", () => {
		const player = createMockEntity({
			faction: "player",
			id: "player-hacker",
			position: { x: 0, y: 0, z: 0 },
			targetId: "feral-9",
		});
		const requestedHostile = world.spawn(Identity, WorldPosition);
		requestedHostile.set(Identity, { id: "feral-9", faction: "feral" });
		requestedHostile.set(WorldPosition, { x: 6, y: 0, z: 0 });
		const nearestOtherHostile = createMockEntity({
			faction: "feral",
			id: "feral-2",
			position: { x: 2, y: 0, z: 0 },
		});
		const decision = planAgentTask({
			tick: 60,
			entity: player,
			agent: new PlayerUnitAgent("player-hacker"),
			nearestHostileTarget: nearestOtherHostile,
		});

		expect(decision?.task?.kind).toBe("hack_target");
		expect(decision?.task?.phase).toBe("approach");
		expect(decision?.task?.payload.targetEntityId).toBe("feral-9");
		expect(decision?.targetPosition).toEqual({ x: 6, y: 0, z: 0 });
	});
});
