import { resetWorldAIService } from "../ai";
import {
	initializeFactionGovernors,
	resetFactionGovernors,
} from "../ai/governor/factionGovernors";
import { validateAssetManifest } from "../config/assetValidation";
import "../systems/playtestBridge";
import { getDatabaseSync } from "../db/runtime";
import { resetAICivilization } from "../systems/aiCivilization";
import { resetCampaignStats, setCampaignStats } from "../systems/campaignStats";
import { resetCombatState } from "../systems/combat";
import { resetEnemyState } from "../systems/enemies";
import { resetFabricationState } from "../systems/fabrication";
import { resetFactionActivityFeed } from "../systems/factionActivityFeed";
import {
	type EconomyFactionId,
	resetFactionEconomy,
	seedFactionResources,
} from "../systems/factionEconomy";
import {
	resetFactionSpawning,
	spawnRivalFactions,
} from "../systems/factionSpawning";
import { resetGovernorSystem } from "../systems/governorSystem";
import {
	type ActiveHarvest,
	rehydrateHarvestState,
	resetHarvestSystem,
} from "../systems/harvestSystem";
import { resetNarrativeState } from "../systems/narrative";
import { clearPOIEntities, spawnPOIEntities } from "../systems/poiEntities";
import { resetPowerSystem } from "../systems/power";
import {
	type ResourcePool,
	resetResources,
	setResources,
} from "../systems/resources";
import { resetTurnEventLog } from "../systems/turnEventLog";
import {
	addUnitsToTurnState,
	initializeTurnForUnits,
	rehydrateTurnState,
	resetTurnSystem,
	type TurnPhase,
	type UnitTurnState,
} from "../systems/turnSystem";
import { resetVictorySystem } from "../systems/victorySystem";
import { hydratePersistedWorldEntities } from "../world/entityPersistence";
import { initWorldGrid } from "../world/gen/worldGrid";
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
import { Identity, Unit } from "./traits";
import { world } from "./world";

function destroyAllEntities() {
	for (const entity of [...world.entities]) {
		entity.destroy();
	}
}

export function initializeNewGame(persistedWorld: PersistedWorldSnapshot) {
	validateAssetManifest();
	resetGameState();
	resetStructuralSpace();

	// Initialize WorldGrid for chunk-based map (reads config from SQLite)
	initWorldGrid(
		getDatabaseSync(),
		persistedWorld.config.worldSeed,
		persistedWorld.saveGame.id,
	);
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
	resetFactionEconomy();
	resetFactionGovernors();
	resetCampaignStats();
	resetTurnEventLog();
	resetVictorySystem();
	resetFactionSpawning();
	resetHarvestSystem();
	resetAICivilization();
	resetFactionActivityFeed();
	resetGovernorSystem();
	clearPOIEntities();
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

	// Spawn POI Koota entities for reactive UI/renderer access
	spawnPOIEntities(persistedWorld.pointsOfInterest);

	// Initialize turn system — restore from save or create fresh
	resetTurnSystem();
	if (persistedWorld.turnState) {
		const saved = persistedWorld.turnState;
		const unitStates: UnitTurnState[] = JSON.parse(saved.unit_states_json);
		rehydrateTurnState({
			turnNumber: saved.turn_number,
			phase: saved.phase as TurnPhase,
			activeFaction: saved.active_faction,
			unitStates,
		});
	} else {
		const playerUnitIds: string[] = [];
		const markLevels = new Map<string, number>();
		for (const entity of world.entities) {
			const identity = entity.get(Identity);
			const unit = entity.get(Unit);
			if (identity && unit && identity.faction === "player") {
				playerUnitIds.push(identity.id);
				markLevels.set(identity.id, unit.markLevel);
			}
		}
		initializeTurnForUnits(playerUnitIds, markLevels);
	}

	// Initialize rival faction units' AP/MP and create governor instances
	const rivalUnitIds: string[] = [];
	const rivalMarkLevels = new Map<string, number>();
	for (const entity of world.entities) {
		const identity = entity.get(Identity);
		const unit = entity.get(Unit);
		if (identity && unit && identity.faction !== "player") {
			rivalUnitIds.push(identity.id);
			rivalMarkLevels.set(identity.id, unit.markLevel);
		}
	}
	if (rivalUnitIds.length > 0) {
		addUnitsToTurnState(rivalUnitIds, rivalMarkLevels);
	}
	initializeFactionGovernors();

	// Spawn rival faction units (only on new game, not on load)
	if (!persistedWorld.turnState) {
		spawnRivalFactions();
	}

	// Rehydrate harvest state from save
	if (persistedWorld.harvestState) {
		const consumedIds: number[] = JSON.parse(
			persistedWorld.harvestState.consumed_structure_ids_json,
		);
		const activeHarvests: ActiveHarvest[] = JSON.parse(
			persistedWorld.harvestState.active_harvests_json,
		);
		const consumedFloorKeys: string[] = JSON.parse(
			persistedWorld.harvestState.consumed_floor_tiles_json ?? "[]",
		);
		rehydrateHarvestState(consumedIds, activeHarvests, consumedFloorKeys);
	}

	// Rehydrate per-faction resources from save
	if (persistedWorld.factionResourceStates.length > 0) {
		for (const frs of persistedWorld.factionResourceStates) {
			const resources: Partial<ResourcePool> = JSON.parse(frs.resources_json);
			seedFactionResources(frs.faction_id as EconomyFactionId, resources);
		}
	}

	// Rehydrate campaign statistics from save
	if (persistedWorld.campaignStatistics) {
		const stats = JSON.parse(persistedWorld.campaignStatistics.stats_json);
		setCampaignStats(stats);
	}
}
