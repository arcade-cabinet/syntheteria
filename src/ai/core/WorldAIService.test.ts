import { createFragment, resetTerrainState } from "../../ecs/terrain";
import {
	AIController,
	Identity,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	aiSystem,
	getAgentState,
	issueMoveCommand,
	resetWorldAIService,
} from "./WorldAIService";

describe("WorldAIService", () => {
	beforeEach(() => {
		resetWorldAIService();
		resetTerrainState();
		createFragment();
	});

	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
		resetWorldAIService();
		resetTerrainState();
	});

	it("turns a player move command into persisted AI runtime state", () => {
		const fragment = createFragment();
		const entity = world.spawn(
			Identity,
			WorldPosition,
			MapFragment,
			Unit,
			Navigation,
			AIController,
		);
		entity.set(Identity, { id: "player_1", faction: "player" });
		entity.set(WorldPosition, { x: 0, y: 0, z: 0 });
		entity.set(MapFragment, { fragmentId: fragment.id });
		entity.set(Unit, {
			type: "maintenance_bot",
			displayName: "Scout",
			speed: 2,
			selected: false,
			components: [],
		});
		entity.set(Navigation, { path: [], pathIndex: 0, moving: false });
		entity.set(AIController, {
			role: "player_unit",
			enabled: true,
			stateJson: null,
		});

		expect(issueMoveCommand("player_1", { x: 4, y: 0, z: 0 })).toBe(true);

		aiSystem(1 / 60, 1);

		const state = getAgentState("player_1");
		expect(state?.role).toBe("player_unit");
		expect(state?.task?.kind).toBe("move_to_point");
		expect(state?.status).toBe("navigating");
		expect(entity.get(Navigation)?.moving).toBe(true);
		expect(entity.get(AIController)?.stateJson).toContain("move_to_point");
	});
});
