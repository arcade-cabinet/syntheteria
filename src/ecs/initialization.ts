import { resetWorldAIService } from "../ai";
import { resetCombatState } from "../systems/combat";
import { resetEnemyState } from "../systems/enemies";
import { resetFabricationState } from "../systems/fabrication";
import { resetNarrativeState } from "../systems/narrative";
import { resetPowerSystem } from "../systems/power";
import { resetResources, setResources } from "../systems/resources";
import { hydratePersistedWorldEntities } from "../world/entityPersistence";
import { resetRuntimeState, setRuntimeScene } from "../world/runtimeState";
import type { PersistedWorldSnapshot } from "../world/snapshots";
import {
	type FogState,
	loadStructuralFragment,
	resetStructuralSpace,
} from "../world/structuralSpace";
import { resetCityLayout } from "./cityLayout";
import { resetFactoryEntityIds } from "./factory";
import { resetGameState } from "./gameState";
import { world } from "./world";

function destroyAllEntities() {
	for (const entity of [...world.entities]) {
		entity.destroy();
	}
}

export function initializeNewGame(persistedWorld: PersistedWorldSnapshot) {
	resetGameState();
	resetStructuralSpace();
	resetCityLayout();
	resetResources();
	resetRuntimeState();
	resetFabricationState();
	resetPowerSystem();
	resetEnemyState();
	resetWorldAIService();
	resetCombatState();
	resetNarrativeState();
	resetFactoryEntityIds();
	destroyAllEntities();
	setResources({
		scrapMetal: persistedWorld.resourceState.scrap_metal,
		eWaste: persistedWorld.resourceState.e_waste,
		intactComponents: persistedWorld.resourceState.intact_components,
	});
	setRuntimeScene(
		persistedWorld.campaignState.active_scene,
		persistedWorld.campaignState.active_city_instance_id,
	);

	const fragment = loadStructuralFragment(
		persistedWorld.sectorCells.map((cell) => {
			return {
				q: cell.q,
				r: cell.r,
				structuralZone: cell.structural_zone,
				discoveryState: cell.discovery_state as FogState,
				floorPresetId: cell.floor_preset_id,
				passable: cell.passable === 1,
			};
		}),
		{
			width: persistedWorld.ecumenopolis.width,
			height: persistedWorld.ecumenopolis.height,
		},
		"world_primary",
	);

	if (fragment.id !== "world_primary") {
		throw new Error(
			"World fragment failed to hydrate with expected identifier.",
		);
	}

	hydratePersistedWorldEntities(persistedWorld.entities);
}
