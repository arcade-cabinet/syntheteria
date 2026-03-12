import { buildOverworldCityOverlayState } from "../overworldCityOverlay";
import type { WorldSessionSnapshot } from "../snapshots";

function createSession(): WorldSessionSnapshot {
	return {
		saveGame: {
			id: 1,
			name: "Overlay Test",
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
				id: 11,
				ecumenopolis_id: 1,
				type: "home_base",
				name: "Command Arcology",
				q: 0,
				r: 0,
				discovered: 1,
			},
			{
				id: 12,
				ecumenopolis_id: 1,
				type: "science_campus",
				name: "Archive Campus",
				q: 2,
				r: 3,
				discovered: 1,
			},
		],
		cityInstances: [
			{
				id: 21,
				ecumenopolis_id: 1,
				poi_id: 11,
				name: "Command Arcology",
				world_q: 0,
				world_r: 0,
				layout_seed: 77,
				generation_status: "instanced",
				state: "founded",
			},
			{
				id: 22,
				ecumenopolis_id: 1,
				poi_id: 12,
				name: "Archive Campus",
				world_q: 2,
				world_r: 3,
				layout_seed: 42,
				generation_status: "reserved",
				state: "surveyed",
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
	};
}

describe("overworld city overlay", () => {
	it("builds district stacks, fortifications, and founded substations", () => {
		const overlay = buildOverworldCityOverlayState({
			session: createSession(),
			units: [
				{
					entityId: "guard_1",
					sceneLocation: "world",
					position: { x: 0, y: 0, z: 0 },
					faction: "player",
				},
			],
		});

		expect(overlay.blocks.length).toBeGreaterThan(0);
		expect(overlay.fortifications).toHaveLength(1);
		expect(overlay.substations.length).toBeGreaterThan(0);
		expect(overlay.substations[0]?.ringCount).toBeGreaterThanOrEqual(1);
	});
});
