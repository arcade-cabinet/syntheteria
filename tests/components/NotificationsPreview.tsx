import { useEffect, useState } from "react";
import { resetGameState } from "../../src/ecs/gameState";
import { setResources } from "../../src/systems/resources";
import { Notifications } from "../../src/ui/panels/Notifications";
import { executeDistrictOperation } from "../../src/world/districtOperations";
import {
	resetRuntimeState,
	setRuntimeTick,
} from "../../src/world/runtimeState";
import {
	type ActiveWorldSession,
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../src/world/session";

const session: ActiveWorldSession = {
	saveGame: {
		id: 1,
		name: "Notifications Preview",
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
};

export function NotificationsPreview() {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setReady(false);
		resetGameState();
		resetRuntimeState();
		clearActiveWorldSession();
		setActiveWorldSession(session);
		setResources({
			scrapMetal: 12,
			eWaste: 8,
			intactComponents: 2,
		});
		setRuntimeTick(240);
		executeDistrictOperation({
			cityInstanceId: 17,
			poiType: "home_base",
			state: "founded",
			operationId: "fabricate_components",
		});
		setReady(true);

		return () => {
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
				background:
					"linear-gradient(180deg, #10202c 0%, #07111a 55%, #03070d 100%)",
			}}
		>
			{ready ? <Notifications /> : null}
		</div>
	);
}
