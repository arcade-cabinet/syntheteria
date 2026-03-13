jest.mock("expo-asset", () => ({
	Asset: {
		fromModule: (mod: string | number) => ({
			uri: typeof mod === "string" ? mod : `/resolved/${mod}`,
			localUri: null,
		}),
	},
}));

jest.mock("../../config/assetValidation", () => ({
	validateAssetManifest: jest.fn(),
}));

jest.mock("../../systems/factionSpawning", () => ({
	spawnRivalFactions: jest.fn(),
	resetFactionSpawning: jest.fn(),
}));

import { getTurnState, resetTurnSystem } from "../../systems/turnSystem";
import type { PersistedWorldSnapshot } from "../../world/snapshots";
import { initializeNewGame } from "../initialization";
import { Building, Identity, Unit, WorldPosition } from "../traits";
import { buildings, units, world } from "../world";

function createPersistedWorld(): PersistedWorldSnapshot {
	return {
		saveGame: {
			id: 1,
			name: "Network Test",
			world_seed: 42,
			sector_scale: "small",
			difficulty: "standard",
			climate_profile: "temperate",
			storm_profile: "volatile",
			created_at: 0,
			last_played_at: 0,
			playtime_seconds: 0,
		},
		config: {
			worldSeed: 42,
			sectorScale: "small",
			difficulty: "standard",
			climateProfile: "temperate",
			stormProfile: "volatile",
		},
		ecumenopolis: {
			id: 1,
			save_game_id: 1,
			width: 6,
			height: 6,
			sector_scale: "small",
			climate_profile: "temperate",
			storm_profile: "volatile",
			spawn_sector_id: "command_arcology",
			spawn_anchor_key: "0,0",
			generated_at: 0,
		},
		sectorCells: [
			{
				id: 1,
				ecumenopolis_id: 1,
				q: 0,
				r: 0,
				structural_zone: "command",
				floor_preset_id: "command_core",
				discovery_state: 0,
				passable: 1,
				sector_archetype: "command_plate",
				storm_exposure: "shielded",
				impassable_class: "none",
				anchor_key: "0,0",
			},
		],
		sectorStructures: [],
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
			scrap_metal: 3,
			e_waste: 1,
			intact_components: 0,
			last_synced_at: 0,
		},
		harvestState: null,
		turnState: null,
		factionResourceStates: [],
		campaignStatistics: null,
		entities: [
			{
				id: 1,
				save_game_id: 1,
				entity_id: "unit_7",
				scene_location: "world",
				scene_building_id: null,
				faction: "player",
				unit_type: "maintenance_bot",
				bot_archetype_id: "field_technician",
				mark_level: 1,
				speech_profile: "mentor",
				building_type: null,
				display_name: "Scout",
				fragment_id: "world_primary",
				x: 1,
				y: 0,
				z: 2,
				speed: 2,
				selected: 0,
				components_json: "[]",
				navigation_json: '{"path":[],"pathIndex":0,"moving":false}',
				ai_role: null,
				ai_state_json: null,
				powered: null,
				operational: null,
				rod_capacity: null,
				current_output: null,
				protection_radius: null,
			},
			{
				id: 2,
				save_game_id: 1,
				entity_id: "bldg_9",
				scene_location: "world",
				scene_building_id: null,
				faction: "player",
				unit_type: null,
				bot_archetype_id: null,
				mark_level: null,
				speech_profile: null,
				building_type: "lightning_rod",
				display_name: "Rod",
				fragment_id: "world_primary",
				x: 2,
				y: 0,
				z: 3,
				speed: null,
				selected: 0,
				components_json: "[]",
				navigation_json: null,
				ai_role: null,
				ai_state_json: null,
				powered: 1,
				operational: 1,
				rod_capacity: 12,
				current_output: 4,
				protection_radius: 8,
			},
		],
	};
}

describe("initializeNewGame", () => {
	afterEach(() => {
		for (const entity of [...world.entities]) {
			entity.destroy();
		}
		resetTurnSystem();
	});

	it("hydrates persisted world actors instead of reseeding defaults", () => {
		initializeNewGame(createPersistedWorld());

		expect([...units]).toHaveLength(1);
		expect([...buildings]).toHaveLength(1);
		expect([...units][0]?.get(Identity)?.id).toBe("unit_7");
		expect([...units][0]?.get(Unit)?.displayName).toBe("Scout");
		expect([...units][0]?.get(WorldPosition)?.z).toBe(2);
		expect([...buildings][0]?.get(Identity)?.id).toBe("bldg_9");
		expect([...buildings][0]?.get(Building)?.type).toBe("lightning_rod");
	});

	it("initializes turn state for player units on new game", () => {
		initializeNewGame(createPersistedWorld());

		const turnState = getTurnState();
		expect(turnState.turnNumber).toBe(1);
		expect(turnState.phase).toBe("player");
		expect(turnState.unitStates.size).toBe(1);
		expect(turnState.unitStates.has("unit_7")).toBe(true);

		const unitTurn = turnState.unitStates.get("unit_7")!;
		expect(unitTurn.actionPoints).toBe(2);
		expect(unitTurn.movementPoints).toBe(3);
	});

	it("rehydrates saved turn state when present", () => {
		const pw = createPersistedWorld();
		pw.turnState = {
			id: 1,
			save_game_id: 1,
			turn_number: 5,
			phase: "player",
			active_faction: "player",
			unit_states_json: JSON.stringify([
				{
					entityId: "unit_7",
					actionPoints: 1,
					maxActionPoints: 2,
					movementPoints: 0,
					maxMovementPoints: 3,
					activated: true,
				},
			]),
			last_synced_at: 0,
		};

		initializeNewGame(pw);

		const turnState = getTurnState();
		expect(turnState.turnNumber).toBe(5);
		expect(turnState.unitStates.get("unit_7")!.actionPoints).toBe(1);
		expect(turnState.unitStates.get("unit_7")!.movementPoints).toBe(0);
	});
});
