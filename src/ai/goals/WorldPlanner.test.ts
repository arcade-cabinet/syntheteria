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
import { RivalScoutAgent } from "../agents/RivalScoutAgent";
import { planAgentTask } from "./WorldPlanner";

function createMockEntity({
	faction,
	id,
	position,
	signalConnected = true,
	targetId = null,
}: {
	faction: string;
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

	it("plans rival scout patrol toward player when no threat assessment needed", () => {
		const scout = createMockEntity({
			faction: "reclaimers",
			id: "scout-1",
			position: { x: 30, y: 0, z: 30 },
		});
		const player = createMockEntity({
			faction: "player",
			id: "player-far",
			position: { x: 10, y: 0, z: 10 },
		});
		const decision = planAgentTask({
			tick: 700,
			entity: scout,
			agent: new RivalScoutAgent("scout-1"),
			nearestPlayerTarget: player,
		});

		expect(decision?.task?.kind).toBe("move_to_point");
		expect(decision?.task?.payload.scouting).toBe(true);
	});

	it("plans rival scout retreat when outmatched", () => {
		const scout = createMockEntity({
			faction: "volt_collective",
			id: "scout-2",
			position: { x: 10, y: 0, z: 10 },
		});
		const player = createMockEntity({
			faction: "player",
			id: "player-strong",
			position: { x: 12, y: 0, z: 10 },
		});
		const decision = planAgentTask({
			tick: 800,
			entity: scout,
			agent: new RivalScoutAgent("scout-2"),
			nearestPlayerTarget: player,
			scoutStrength: 1,
			playerStrength: 3, // 1/3 = 0.33 < 0.6 threshold
		});

		expect(decision?.task?.kind).toBe("move_to_point");
		expect(decision?.task?.payload.retreating).toBe(true);
	});

	it("plans rival scout engage when has numerical advantage", () => {
		const scout = createMockEntity({
			faction: "iron_creed",
			id: "scout-3",
			position: { x: 10, y: 0, z: 10 },
		});
		const player = createMockEntity({
			faction: "player",
			id: "player-weak",
			position: { x: 12, y: 0, z: 10 },
		});
		const decision = planAgentTask({
			tick: 900,
			entity: scout,
			agent: new RivalScoutAgent("scout-3"),
			nearestPlayerTarget: player,
			scoutStrength: 3,
			playerStrength: 1, // 3/1 = 3.0 >= 1.5 threshold
		});

		expect(decision?.task?.kind).toBe("move_to_entity");
		expect(decision?.task?.payload.targetEntityId).toBe("player-weak");
	});

	it("returns null for rival scout with no nearby player target", () => {
		const scout = createMockEntity({
			faction: "signal_choir",
			id: "scout-4",
			position: { x: 50, y: 0, z: 50 },
		});
		const decision = planAgentTask({
			tick: 700,
			entity: scout,
			agent: new RivalScoutAgent("scout-4"),
			nearestPlayerTarget: null,
		});

		expect(decision).toBeNull();
	});
});
