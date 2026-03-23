import {
	AIController,
	Identity,
	MapFragment,
	Navigation,
	Unit,
	WorldPosition,
} from "../../ecs/traits";
import { world } from "../../ecs/world";
import { createNewGameConfig } from "../../world/config";
import {
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../world/session";
import {
	createStructuralFragment,
	resetStructuralSpace,
} from "../../world/structuralSpace";
import {
	aiSystem,
	getAgentState,
	issueMoveCommand,
	resetWorldAIService,
} from "./WorldAIService";

/**
 * Build a minimal world session for AI tests.
 * Creates a 5×5 passable grid — enough for basic pathfinding.
 */
function buildMinimalSession() {
	const cells = [];
	for (let q = -2; q <= 2; q++) {
		for (let r = -2; r <= 2; r++) {
			cells.push({
				id: cells.length + 1,
				ecumenopolis_id: 1,
				q,
				r,
				structural_zone: "transit",
				floor_preset_id: "corridor_transit",
				discovery_state: 2,
				passable: 1,
				sector_archetype: "industrial",
				storm_exposure: "shielded" as const,
				impassable_class: "none" as const,
				anchor_key: `cell_${q}_${r}`,
			});
		}
	}
	return {
		saveGame: {
			id: 1,
			name: "AI Test",
			world_seed: 42,
			sector_scale: "standard" as const,
			difficulty: "standard" as const,
			climate_profile: "temperate" as const,
			storm_profile: "volatile" as const,
			created_at: 0,
			last_played_at: 0,
			playtime_seconds: 0,
		},
		config: createNewGameConfig(42),
		ecumenopolis: {
			id: 1,
			save_game_id: 1,
			width: 5,
			height: 5,
			sector_scale: "standard",
			climate_profile: "temperate" as const,
			storm_profile: "volatile" as const,
			spawn_sector_id: "cell_0_0",
			spawn_anchor_key: "cell_0_0",
			generated_at: 0,
		},
		sectorCells: cells,
		sectorStructures: [],
		pointsOfInterest: [],
		cityInstances: [],
		campaignState: {
			id: 1,
			save_game_id: 1,
			active_scene: "world" as const,
			active_city_instance_id: null,
			current_tick: 0,
			last_synced_at: 0,
		},
		resourceState: {
			id: 1,
			save_game_id: 1,
			scrap_metal: 0,
			e_waste: 0,
			intact_components: 0,
			last_synced_at: 0,
		},
	};
}

describe("WorldAIService", () => {
	beforeEach(() => {
		resetWorldAIService();
		resetStructuralSpace();
		setActiveWorldSession(buildMinimalSession());
		createStructuralFragment();
	});

	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
		resetWorldAIService();
		resetStructuralSpace();
		clearActiveWorldSession();
	});

	it("turns a player move command into persisted AI runtime state", () => {
		const fragment = createStructuralFragment();
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
		entity.set(
			Unit,
			createBotUnitState({
				unitType: "maintenance_bot",
				displayName: "Scout",
				speed: 2,
				components: [],
			}),
		);
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
		expect(state?.profile.steeringProfile).toBe("biped_scout");
		expect(state?.profile.navigationProfile).toBe("sector_surface_standard");
		expect(state?.task?.kind).toBe("move_to_point");
		expect(state?.status).toBe("navigating");
		expect(entity.get(Navigation)?.moving).toBe(true);
		expect(entity.get(AIController)?.stateJson).toContain("move_to_point");
	});
});

import { createBotUnitState } from "../../bots";
