import type { ResourcePool } from "../systems/resources";
import type { WorldPoiType } from "./generation";

export type SceneMode = "world" | "city";

export interface NearbyPoiContext {
	cityInstanceId: number | null;
	discovered: boolean;
	distance: number;
	name: string;
	poiId: number;
	poiType: WorldPoiType;
}

type RuntimeState = {
	activeCityInstanceId: number | null;
	activeScene: SceneMode;
	currentTick: number;
	nearbyPoi: NearbyPoiContext | null;
	resources: ResourcePool;
};

const listeners = new Set<() => void>();

let runtimeState: RuntimeState = {
	activeCityInstanceId: null,
	activeScene: "world",
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
