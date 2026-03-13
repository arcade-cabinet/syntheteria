import { useSyncExternalStore } from "react";
import { getActiveLocationContext } from "../world/locationContext";
import {
	getRuntimeState,
	setCitySiteModalOpen,
	subscribeRuntimeState,
} from "../world/runtimeState";
import { getActiveWorldSession } from "../world/session";
import { CitySiteModal } from "./CitySiteModal";

export function CitySiteOverlay() {
	const runtime = useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
	const session = getActiveWorldSession();

	if (!runtime.citySiteModalOpen || !session) {
		return null;
	}

	const { activeCity, poi } = getActiveLocationContext({
		activeCityInstanceId: runtime.activeCityInstanceId,
		activeScene: runtime.activeScene,
		nearbyPoi: runtime.citySiteModalContext ?? runtime.nearbyPoi,
		session,
	});

	if (!poi) {
		return null;
	}

	return (
		<CitySiteModal
			city={activeCity}
			context={{
				cityInstanceId: activeCity?.id ?? null,
				discovered: poi.discovered === 1,
				distance:
					runtime.citySiteModalContext?.distance ??
					runtime.nearbyPoi?.distance ??
					0,
				name: poi.name,
				poiId: poi.id,
				poiType: poi.type,
			}}
			mode={runtime.activeScene === "city" ? "city" : "world"}
			onClose={() => setCitySiteModalOpen(false)}
		/>
	);
}
