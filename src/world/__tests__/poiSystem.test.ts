import { createBotUnitState } from "../../bots";
import { Identity, MapFragment, Unit, WorldPosition } from "../../ecs/traits";
import { world } from "../../ecs/world";
import { poiSystem } from "../poiSystem";
import { getRuntimeState, resetRuntimeState } from "../runtimeState";
import { clearActiveWorldSession, setActiveWorldSession } from "../session";

describe("poiSystem", () => {
	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
		clearActiveWorldSession();
		resetRuntimeState();
	});

	it("discovers nearby POIs and exposes interaction context", () => {
		setActiveWorldSession({
			saveGame: {
				id: 1,
				name: "Network Test",
				world_seed: 1,
				sector_scale: "standard",
				difficulty: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				created_at: 0,
				last_played_at: 0,
				playtime_seconds: 0,
			},
			config: {
				worldSeed: 1,
				sectorScale: "standard",
				difficulty: "standard",
				climateProfile: "temperate",
				stormProfile: "volatile",
			},
			ecumenopolis: {
				id: 1,
				save_game_id: 1,
				width: 40,
				height: 40,
				sector_scale: "standard",
				climate_profile: "temperate",
				storm_profile: "volatile",
				spawn_sector_id: "command_arcology",
				spawn_anchor_key: "0,0",
				generated_at: 0,
			},
			sectorCells: [],
			sectorStructures: [],
			pointsOfInterest: [
				{
					id: 1,
					ecumenopolis_id: 1,
					type: "science_campus",
					name: "Science Campus",
					q: 2,
					r: 2,
					discovered: 0,
				},
			],
			cityInstances: [
				{
					id: 9,
					ecumenopolis_id: 1,
					poi_id: 1,
					name: "Science Campus",
					world_q: 2,
					world_r: 2,
					layout_seed: 99,
					generation_status: "reserved",
					state: "latent",
				},
			],
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

		const entity = world.spawn(Identity, MapFragment, Unit, WorldPosition);
		entity.set(Identity, { id: "unit_1", faction: "player" });
		entity.set(MapFragment, { fragmentId: "frag_0" });
		entity.set(
			Unit,
			createBotUnitState({
				unitType: "maintenance_bot",
				displayName: "Scout",
				speed: 1,
				components: [],
			}),
		);
		entity.set(WorldPosition, { x: 1, y: 0, z: 1 });

		poiSystem();

		expect(getRuntimeState().nearbyPoi?.name).toBe("Science Campus");
		expect(getRuntimeState().nearbyPoi?.cityInstanceId).toBe(9);
		expect(getRuntimeState().nearbyPoi?.poiType).toBe("science_campus");
		expect(getRuntimeState().nearbyPoi?.discovered).toBe(true);
	});
});
