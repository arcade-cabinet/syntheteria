import type { RuntimeState } from "./runtimeState.types";

const listeners = new Set<() => void>();

let runtimeState: RuntimeState = {
	activeCityInstanceId: null,
	activeScene: "world",
	cityKitLabOpen: false,
	citySiteModalOpen: false,
	citySiteModalContext: null,
	currentTick: 0,
	districtEvents: [],
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
		citySiteModalOpen: false,
		citySiteModalContext: null,
		currentTick: 0,
		districtEvents: [],
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
	activeScene: RuntimeState["activeScene"],
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

export function setCitySiteModalOpen(
	citySiteModalOpen: boolean,
	citySiteModalContext: RuntimeState["citySiteModalContext"] = runtimeState.citySiteModalContext,
) {
	runtimeState = {
		...runtimeState,
		citySiteModalOpen,
		citySiteModalContext: citySiteModalOpen ? citySiteModalContext : null,
	};
	notify();
}

export function setRuntimeTick(currentTick: number) {
	runtimeState = {
		...runtimeState,
		currentTick,
	};
}

export function setNearbyPoi(nearbyPoi: RuntimeState["nearbyPoi"]) {
	runtimeState = {
		...runtimeState,
		nearbyPoi,
	};
	notify();
}

export function setRuntimeResources(resources: RuntimeState["resources"]) {
	runtimeState = {
		...runtimeState,
		resources: { ...resources },
	};
	notify();
}

export function pushDistrictEvent(
	event: Omit<RuntimeState["districtEvents"][number], "id">,
) {
	const eventIndex = runtimeState.districtEvents.length;
	runtimeState = {
		...runtimeState,
		districtEvents: [
			{
				...event,
				id: `${event.operationId}:${event.tick}:${eventIndex}`,
			},
			...runtimeState.districtEvents,
		].slice(0, 6),
	};
	notify();
}
