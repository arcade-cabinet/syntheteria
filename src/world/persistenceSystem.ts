import { persistRuntimeWorldStateSync } from "../db/worldPersistence";
import { getAllFragments } from "../ecs/terrain";
import { getResources } from "../systems/resources";
import { capturePersistableWorldEntities } from "./entityPersistence";
import { getRuntimeState } from "./runtimeState";
import { getActiveWorldSession } from "./session";

const PERSIST_INTERVAL = 60;

export function persistenceSystem(tick: number) {
	if (tick % PERSIST_INTERVAL !== 0) {
		return;
	}

	const session = getActiveWorldSession();
	if (!session) {
		return;
	}

	const fragments = getAllFragments();
	const tiles = fragments.flatMap((fragment) =>
		Array.from(fragment.grid).map((tile) => ({
			q: tile.q,
			r: tile.r,
			fog_state: tile.fog,
		})),
	);
	const runtime = getRuntimeState();

	persistRuntimeWorldStateSync({
		saveGameId: session.saveGame.id,
		worldMapId: session.worldMap.id,
		tick,
		activeScene: runtime.activeScene,
		activeCityInstanceId: runtime.activeCityInstanceId,
		resources: getResources(),
		tiles,
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
