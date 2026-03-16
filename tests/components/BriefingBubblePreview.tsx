import { useEffect, useState } from "react";
import { createBotUnitState } from "../../src/bots";
import { resetGameState } from "../../src/ecs/gameState";
import {
	Identity,
	MapFragment,
	Unit,
	WorldPosition,
} from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";
import { BriefingBubbleLayer } from "../../src/ui/BriefingBubbleLayer";
import {
	resetRuntimeState,
	setNearbyPoi,
	setRuntimeScene,
} from "../../src/world/runtimeState";
import {
	type ActiveWorldSession,
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../src/world/session";

const baseSession: ActiveWorldSession = {
	saveGame: {
		id: 1,
		name: "Briefing Bubble Test",
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
			type: "science_campus",
			name: "Archive Campus",
			q: 2,
			r: 3,
			discovered: 1,
		},
	],
	cityInstances: [
		{
			id: 22,
			ecumenopolis_id: 1,
			poi_id: 11,
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

export function BriefingBubblePreview() {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(false);
		resetRuntimeState();
		clearActiveWorldSession();
		setActiveWorldSession(baseSession);
		setRuntimeScene("world", null);
		setNearbyPoi({
			cityInstanceId: 22,
			discovered: true,
			distance: 1,
			name: "Archive Campus",
			poiId: 11,
			poiType: "science_campus",
		});

		const entity = world.spawn(Identity, MapFragment, Unit, WorldPosition);
		entity.set(Identity, { id: "bubble_unit", faction: "player" });
		entity.set(MapFragment, { fragmentId: "world_primary" });
		entity.set(
			Unit,
			createBotUnitState({
				unitType: "maintenance_bot",
				displayName: "Field Technician",
				speed: 1,
				selected: true,
				components: [],
			}),
		);
		entity.set(WorldPosition, { x: 2, y: 0, z: 3 });
		resetGameState();
		setReady(true);

		return () => {
			entity.destroy();
			clearActiveWorldSession();
			resetRuntimeState();
			resetGameState();
		};
	}, []);

	return (
		<div
			style={{
				width: 1400,
				height: 900,
				position: "relative",
				background: "#02050a",
			}}
		>
			{ready ? <BriefingBubbleLayer /> : null}
		</div>
	);
}
