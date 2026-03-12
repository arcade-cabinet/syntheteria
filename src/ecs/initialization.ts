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
import { resetCityLayout } from "./cityLayout";
import { resetFactoryEntityIds } from "./factory";
import { resetGameState } from "./gameState";
import { loadTerrainFragment, resetTerrainState } from "./terrain";
import { world } from "./world";

function destroyAllEntities() {
	for (const entity of [...world.entities]) {
		entity.destroy();
	}
}

export function initializeNewGame(persistedWorld: PersistedWorldSnapshot) {
	resetGameState();
	resetTerrainState();
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

	const fragment = loadTerrainFragment(
		persistedWorld.tiles.map((tile) => ({
			q: tile.q,
			r: tile.r,
			biome: tile.biome,
			fog: tile.fog_state,
			terrainSetId: tile.terrain_set_id,
		})),
		{
			width: persistedWorld.worldMap.width,
			height: persistedWorld.worldMap.height,
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
