/**
 * Unified Save-All — persists every runtime subsystem to SQLite in one call.
 *
 * This is the single function that should be called for manual saves and
 * autosaves. It gathers state from every subsystem and writes it to the
 * database through the existing persistence functions.
 *
 * Subsystems persisted:
 *   - Campaign state (scene, tick)
 *   - Player resources
 *   - World entities (units, buildings, positions, AI state)
 *   - Turn state (turn number, phase, per-unit AP/MP)
 *   - Harvest state (consumed structures, active harvests)
 *   - Faction resource pools (per-rival economy)
 *   - Campaign statistics (kills, harvests, territory, etc.)
 *   - Sector cell discovery state
 *   - POI discovery state
 *   - City instance state
 */

import { getCampaignStats } from "../systems/campaignStats";
import {
	ALL_ECONOMY_FACTIONS,
	getAllFactionResources,
} from "../systems/factionEconomy";
import {
	getActiveHarvests,
	getConsumedFloorTiles,
	getConsumedStructureIds,
} from "../systems/harvestSystem";
import { getResources } from "../systems/resources";
import { getTurnState } from "../systems/turnSystem";
import { capturePersistableWorldEntities } from "../world/entityPersistence";
import { getRuntimeState } from "../world/runtimeState";
import { getActiveWorldSession } from "../world/session";
import { touchSaveGameSync } from "./saveGames";
import {
	persistCampaignStatisticsSync,
	persistFactionResourceStatesSync,
	persistHarvestStateSync,
	persistRuntimeWorldStateSync,
	persistTurnStateSync,
} from "./worldPersistence";

export interface SaveAllResult {
	success: boolean;
	saveGameId: number;
	turnNumber: number;
	error?: string;
}

/**
 * Persist ALL runtime state to the database for the active session.
 *
 * Returns a result indicating success/failure. Does not throw.
 */
export function saveAllStateSync(): SaveAllResult {
	const session = getActiveWorldSession();
	if (!session) {
		return {
			success: false,
			saveGameId: 0,
			turnNumber: 0,
			error: "No active session",
		};
	}

	const saveGameId = session.saveGame.id;
	const ecumenopolisId = session.ecumenopolis.id;
	const runtime = getRuntimeState();
	const turnState = getTurnState();
	const resources = getResources();
	const entities = capturePersistableWorldEntities();

	try {
		// 1. Core world state: campaign, resources, entities, discovery, cities
		persistRuntimeWorldStateSync({
			saveGameId,
			ecumenopolisId,
			tick: runtime.currentTick,
			activeScene: runtime.activeScene,
			activeCityInstanceId: runtime.activeCityInstanceId,
			resources,
			sectorCells: session.sectorCells.map((cell) => ({
				q: cell.q,
				r: cell.r,
				discovery_state: cell.discovery_state,
			})),
			pointsOfInterest: session.pointsOfInterest.map((poi) => ({
				id: poi.id,
				discovered: poi.discovered,
			})),
			cityInstances: session.cityInstances.map((city) => ({
				id: city.id,
				state: city.state,
			})),
			entities,
		});

		// 2. Turn state (turn number, phase, per-unit AP/MP)
		const unitStatesArray = Array.from(turnState.unitStates.values());
		persistTurnStateSync(
			saveGameId,
			turnState.turnNumber,
			turnState.phase,
			turnState.activeFaction,
			unitStatesArray,
		);

		// 3. Harvest state (consumed structures, active harvests, consumed floor tiles)
		const consumedIds = Array.from(getConsumedStructureIds());
		const activeHarvests = [...getActiveHarvests()];
		const consumedFloorTiles = Array.from(getConsumedFloorTiles());
		persistHarvestStateSync(
			saveGameId,
			consumedIds,
			activeHarvests,
			undefined,
			consumedFloorTiles,
		);

		// 4. Per-faction resource pools
		const allFactionResources = getAllFactionResources();
		const factionEntries = Array.from(allFactionResources.entries()).map(
			([factionId, pool]) => ({
				factionId,
				resources: pool as unknown as Record<string, number>,
			}),
		);
		persistFactionResourceStatesSync(saveGameId, factionEntries);

		// 5. Campaign statistics
		const stats = getCampaignStats();
		persistCampaignStatisticsSync(
			saveGameId,
			stats as unknown as Record<string, unknown>,
		);

		// 6. Touch save game record to update last_played_at
		touchSaveGameSync(saveGameId);

		return {
			success: true,
			saveGameId,
			turnNumber: turnState.turnNumber,
		};
	} catch (error) {
		return {
			success: false,
			saveGameId,
			turnNumber: turnState.turnNumber,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
