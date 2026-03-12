import { useEffect, useState } from "react";
import { resetGameState } from "../../src/ecs/gameState";
import { LocationPanel } from "../../src/ui/panels/LocationPanel";
import {
	resetRuntimeState,
	setNearbyPoi,
	setRuntimeScene,
} from "../../src/world/runtimeState";
import type { ActiveWorldSession } from "../../src/world/session";
import {
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../src/world/session";

const baseSession: ActiveWorldSession = {
	saveGame: {
		id: 1,
		name: "Location Panel Test",
		world_seed: 1,
		map_size: "standard",
		difficulty: "standard",
		climate_profile: "temperate",
		storm_profile: "volatile",
		created_at: 0,
		last_played_at: 0,
		playtime_seconds: 0,
	},
	config: {
		worldSeed: 1,
		mapSize: "standard",
		difficulty: "standard",
		climateProfile: "temperate",
		stormProfile: "volatile",
	},
	worldMap: {
		id: 1,
		save_game_id: 1,
		width: 40,
		height: 40,
		map_size: "standard",
		climate_profile: "temperate",
		storm_profile: "volatile",
		spawn_q: 0,
		spawn_r: 0,
		generated_at: 0,
	},
	tiles: [],
	pointsOfInterest: [
		{
			id: 11,
			world_map_id: 1,
			type: "science_campus",
			name: "Science Campus",
			q: 2,
			r: 3,
			discovered: 1,
		},
	],
	cityInstances: [
		{
			id: 22,
			world_map_id: 1,
			poi_id: 11,
			name: "Science Campus",
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

export function LocationPanelPreview({ scene }: { scene: "world" | "city" }) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(false);
		resetRuntimeState();
		clearActiveWorldSession();
		setActiveWorldSession(baseSession);

		if (scene === "world") {
			setRuntimeScene("world", null);
			const context = {
				cityInstanceId: 22,
				discovered: true,
				distance: 1.2,
				name: "Science Campus",
				poiId: 11,
				poiType: "science_campus",
			} as const;
			setNearbyPoi(context);
			const keepAlive = setInterval(() => {
				setNearbyPoi(context);
			}, 50);
			resetGameState();
			setReady(true);

			return () => {
				clearInterval(keepAlive);
				clearActiveWorldSession();
				resetRuntimeState();
				resetGameState();
			};
		} else {
			setRuntimeScene("city", 22);
			setNearbyPoi(null);
		}

		resetGameState();
		setReady(true);

		return () => {
			clearActiveWorldSession();
			resetRuntimeState();
			resetGameState();
		};
	}, [scene]);

	return (
		<div style={{ width: 1400, height: 900, position: "relative" }}>
			{ready ? <LocationPanel /> : null}
		</div>
	);
}
