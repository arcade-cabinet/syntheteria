import { persistRuntimeWorldStateSync } from "../db/worldPersistence";
import { getAllFragments } from "../ecs/terrain";
import { getResources } from "../systems/resources";
import { capturePersistableWorldEntities } from "./entityPersistence";
import { getRuntimeState, setRuntimeScene } from "./runtimeState";
import { getActiveWorldSession } from "./session";

function flushTransitionState() {
	const session = getActiveWorldSession();
	if (!session) {
		return;
	}

	const runtime = getRuntimeState();
	persistRuntimeWorldStateSync({
		saveGameId: session.saveGame.id,
		worldMapId: session.worldMap.id,
		tick: runtime.currentTick,
		activeScene: runtime.activeScene,
		activeCityInstanceId: runtime.activeCityInstanceId,
		resources: getResources(),
		tiles: getAllFragments().flatMap((fragment) =>
			Array.from(fragment.grid).map((tile) => ({
				q: tile.q,
				r: tile.r,
				fog_state: tile.fog,
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
		throw new Error("Cannot enter a city without an active world session.");
	}

	const city = session.cityInstances.find(
		(candidate) => candidate.id === cityInstanceId,
	);
	if (!city) {
		throw new Error(`City instance ${cityInstanceId} does not exist.`);
	}

	if (city.state === "latent") {
		city.state = "surveyed";
	}

	setRuntimeScene("city", cityInstanceId);
	flushTransitionState();
}

export function returnToWorld() {
	setRuntimeScene("world", null);
	flushTransitionState();
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
