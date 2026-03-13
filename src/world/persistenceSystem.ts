import {
	persistCampaignStatisticsSync,
	persistFactionResourceStatesSync,
	persistHarvestStateSync,
	persistRuntimeWorldStateSync,
	persistTurnStateSync,
} from "../db/worldPersistence";
import { getCampaignStats } from "../systems/campaignStats";
import {
	getAllFactionResources,
	type EconomyFactionId,
} from "../systems/factionEconomy";
import { getActiveHarvests, getConsumedStructureIds } from "../systems/harvestSystem";
import { getResources } from "../systems/resources";
import { getTurnState } from "../systems/turnSystem";
import { capturePersistableWorldEntities } from "./entityPersistence";
import { getRuntimeState } from "./runtimeState";
import { getActiveWorldSession } from "./session";
import { getStructuralCellRecords, getStructuralFragments } from "./structuralSpace";

const PERSIST_INTERVAL = 60;

export function persistenceSystem(tick: number) {
	if (tick % PERSIST_INTERVAL !== 0) {
		return;
	}

	const session = getActiveWorldSession();
	if (!session) {
		return;
	}

	const saveGameId = session.saveGame.id;
	const fragments = getStructuralFragments();
	const sectorCells = fragments.flatMap((fragment) =>
		getStructuralCellRecords(fragment.id).map((cell) => ({
			q: cell.q,
			r: cell.r,
			discovery_state: cell.discoveryState,
		})),
	);
	const runtime = getRuntimeState();

	persistRuntimeWorldStateSync({
		saveGameId,
		ecumenopolisId: session.ecumenopolis.id,
		tick,
		activeScene: runtime.activeScene,
		activeCityInstanceId: runtime.activeCityInstanceId,
		resources: getResources(),
		sectorCells,
		pointsOfInterest: session.pointsOfInterest.map((poi) => ({
			id: poi.id,
			discovered: poi.discovered,
		})),
		cityInstances: session.cityInstances.map((city) => ({
			id: city.id,
			state: city.state,
		})),
		entities: capturePersistableWorldEntities(),
	});

	// Persist harvest state
	persistHarvestStateSync(
		saveGameId,
		Array.from(getConsumedStructureIds()),
		Array.from(getActiveHarvests()),
	);

	// Persist turn state
	const turn = getTurnState();
	persistTurnStateSync(
		saveGameId,
		turn.turnNumber,
		turn.phase,
		turn.activeFaction,
		Array.from(turn.unitStates.values()),
	);

	// Persist per-faction resources
	const factionResources = getAllFactionResources();
	const factionEntries: Array<{
		factionId: string;
		resources: Record<string, number>;
	}> = [];
	for (const [factionId, pool] of factionResources) {
		factionEntries.push({
			factionId: factionId as EconomyFactionId,
			resources: pool as unknown as Record<string, number>,
		});
	}
	persistFactionResourceStatesSync(saveGameId, factionEntries);

	// Persist campaign statistics
	persistCampaignStatisticsSync(
		saveGameId,
		getCampaignStats() as unknown as Record<string, unknown>,
	);
}
