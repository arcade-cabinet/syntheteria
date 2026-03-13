import { resetWorldAIService } from "../ai";
import {
	initializeFactionGovernors,
	resetFactionGovernors,
} from "../ai/governor/factionGovernors";
import "../systems/playtestBridge";
import { resetCampaignStats, setCampaignStats } from "../systems/campaignStats";
import { resetCombatState } from "../systems/combat";
import {
	resetFactionSpawning,
	spawnRivalFactions,
} from "../systems/factionSpawning";
import { resetEnemyState } from "../systems/enemies";
import { resetFabricationState } from "../systems/fabrication";
import {
	resetFactionEconomy,
	seedFactionResources,
	type EconomyFactionId,
} from "../systems/factionEconomy";
import {
	type ActiveHarvest,
	rehydrateHarvestState,
	resetHarvestSystem,
} from "../systems/harvestSystem";
import { resetNarrativeState } from "../systems/narrative";
import { resetPowerSystem } from "../systems/power";
import { type ResourcePool, resetResources, setResources } from "../systems/resources";
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
	resetFactionEconomy();
	resetFactionGovernors();
	resetCampaignStats();
	resetTurnEventLog();
	resetVictorySystem();
	resetFactionSpawning();
	resetHarvestSystem();
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
		rehydrateHarvestState(consumedIds, activeHarvests);
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
