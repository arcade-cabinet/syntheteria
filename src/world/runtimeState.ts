import type { ResourcePool } from "../systems/resources";
import type { NearbyPoiContext, SceneMode } from "./snapshots";

type RuntimeState = {
	activeCityInstanceId: number | null;
	activeScene: SceneMode;
	cityKitLabOpen: boolean;
	currentTick: number;
	nearbyPoi: NearbyPoiContext | null;
	resources: ResourcePool;
};

const listeners = new Set<() => void>();

let runtimeState: RuntimeState = {
	activeCityInstanceId: null,
	activeScene: "world",
	cityKitLabOpen: false,
	currentTick: 0,
	nearbyPoi: null,
	resources: {
		scrapMetal: 0,
		eWaste: 0,
		intactComponents: 0,
	},
};

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

export function subscribeRuntimeState(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getRuntimeState() {
	return runtimeState;
}

export function resetRuntimeState() {
	runtimeState = {
		activeCityInstanceId: null,
		activeScene: "world",
		cityKitLabOpen: false,
		currentTick: 0,
		nearbyPoi: null,
		resources: {
			scrapMetal: 0,
			eWaste: 0,
			intactComponents: 0,
		},
	};
	notify();
}

export function setRuntimeScene(
	activeScene: SceneMode,
	activeCityInstanceId: number | null,
) {
	runtimeState = {
		...runtimeState,
		activeScene,
		activeCityInstanceId,
	};
	notify();
}

export function setCityKitLabOpen(cityKitLabOpen: boolean) {
	runtimeState = {
		...runtimeState,
		cityKitLabOpen,
	};
	notify();
}

export function setRuntimeTick(currentTick: number) {
	runtimeState = {
		...runtimeState,
		currentTick,
	};
}

export function setNearbyPoi(nearbyPoi: NearbyPoiContext | null) {
	runtimeState = {
		...runtimeState,
		nearbyPoi,
	};
	notify();
}

export function setRuntimeResources(resources: ResourcePool) {
	runtimeState = {
		...runtimeState,
		resources: { ...resources },
	};
	notify();
}
