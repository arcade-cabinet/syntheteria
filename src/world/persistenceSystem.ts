import { persistRuntimeWorldStateSync } from "../db/worldPersistence";
import { getResources } from "../systems/resources";
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
		saveGameId: session.saveGame.id,
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
}
