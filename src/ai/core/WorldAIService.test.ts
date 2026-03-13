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
import { generateWorldData } from "../../world/generation";
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

describe("WorldAIService", () => {
	beforeEach(() => {
		resetWorldAIService();
		resetStructuralSpace();
		const generatedWorld = generateWorldData(createNewGameConfig(42));
		setActiveWorldSession({
			saveGame: {
				id: 1,
				name: "AI Test",
				world_seed: 42,
				sector_scale: "standard",
				difficulty: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				created_at: 0,
				last_played_at: 0,
				playtime_seconds: 0,
			},
			config: createNewGameConfig(42),
			ecumenopolis: {
				id: 1,
				save_game_id: 1,
				width: generatedWorld.ecumenopolis.width,
				height: generatedWorld.ecumenopolis.height,
				sector_scale: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				spawn_sector_id: generatedWorld.ecumenopolis.spawnSectorId,
				spawn_anchor_key: generatedWorld.ecumenopolis.spawnAnchorKey,
				generated_at: 0,
			},
			sectorCells: generatedWorld.sectorCells.map((cell, index) => ({
				id: index + 1,
				ecumenopolis_id: 1,
				q: cell.q,
				r: cell.r,
				structural_zone: cell.structuralZone,
				floor_preset_id: cell.floorPresetId,
				discovery_state: cell.discoveryState,
				passable: cell.passable ? 1 : 0,
				sector_archetype: cell.sectorArchetype,
				storm_exposure: cell.stormExposure,
				impassable_class: cell.impassableClass,
				anchor_key: cell.anchorKey,
			})),
			sectorStructures: generatedWorld.sectorStructures.map(
				(structure, index) => ({
					id: index + 1,
					ecumenopolis_id: 1,
					district_structure_id: structure.districtStructureId,
					anchor_key: structure.anchorKey,
					q: structure.q,
					r: structure.r,
					model_id: structure.modelId,
					placement_layer: structure.placementLayer,
					edge: structure.edge,
					rotation_quarter_turns: structure.rotationQuarterTurns,
					offset_x: structure.offsetX,
					offset_y: structure.offsetY,
					offset_z: structure.offsetZ,
					target_span: structure.targetSpan,
					sector_archetype: structure.sectorArchetype,
					source: structure.source,
					controller_faction: structure.controllerFaction,
				}),
			),
			pointsOfInterest: [],
			cityInstances: [],
			campaignState: {
				id: 1,
				save_game_id: 1,
				active_scene: "world",
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
		});
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
