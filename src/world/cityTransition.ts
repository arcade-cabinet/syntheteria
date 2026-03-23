import { persistRuntimeWorldStateSync } from "../db/worldPersistence";
import { getResources } from "../systems/resources";
import { applyEntryToCity } from "./cityLifecycle";
import { capturePersistableWorldEntities } from "./entityPersistence";
import {
	getRuntimeState,
	setCityKitLabOpen,
	setRuntimeScene,
} from "./runtimeState";
import { getActiveWorldSession } from "./session";
import {
	getStructuralCellRecords,
	getStructuralFragments,
} from "./structuralSpace";

export function syncActiveWorldSessionState() {
	const session = getActiveWorldSession();
	if (!session) {
		return;
	}

	const runtime = getRuntimeState();
	persistRuntimeWorldStateSync({
		saveGameId: session.saveGame.id,
		ecumenopolisId: session.ecumenopolis.id,
		tick: runtime.currentTick,
		activeScene: runtime.activeScene,
		activeCityInstanceId: runtime.activeCityInstanceId,
		resources: getResources(),
		sectorCells: getStructuralFragments().flatMap((fragment) =>
			getStructuralCellRecords(fragment.id).map((cell) => ({
				q: cell.q,
				r: cell.r,
				discovery_state: cell.discoveryState,
			})),
		),
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

export function enterCityInstance(cityInstanceId: number) {
	const session = getActiveWorldSession();
	if (!session) {
		throw new Error("Cannot enter a district without an active world session.");
	}

	const city = session.cityInstances.find(
		(candidate) => candidate.id === cityInstanceId,
	);
	if (!city) {
		throw new Error(`City instance ${cityInstanceId} does not exist.`);
	}

	applyEntryToCity(city);
	setRuntimeScene("city", cityInstanceId);
	syncActiveWorldSessionState();
}

export function returnToWorld() {
	setRuntimeScene("world", null);
	syncActiveWorldSessionState();
}

export function getActiveCityInstance() {
	const session = getActiveWorldSession();
	const runtime = getRuntimeState();
	if (!session || runtime.activeCityInstanceId === null) {
		return null;
	}

	return (
		session.cityInstances.find(
			(candidate) => candidate.id === runtime.activeCityInstanceId,
		) ?? null
	);
}

export function getSceneMode() {
	return getRuntimeState().activeScene;
}

export function openCityKitLab() {
	setCityKitLabOpen(true);
}

export function closeCityKitLab() {
	setCityKitLabOpen(false);
}
