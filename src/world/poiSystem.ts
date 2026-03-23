import { Identity, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import {
	findNearbyPoiContext,
	markDiscoveredPoisNearPosition,
} from "./poiSession";
import { setNearbyPoi } from "./runtimeState";
import { getActiveWorldSession } from "./session";

export function poiSystem() {
	const session = getActiveWorldSession();
	if (!session) {
		return;
	}

	let bestContext = null;

	for (const unit of units) {
		if (unit.get(Identity)?.faction !== "player") {
			continue;
		}
		if (unit.get(WorldPosition) == null) {
			continue;
		}

		const position = unit.get(WorldPosition)!;
		markDiscoveredPoisNearPosition(session, {
			x: position.x,
			z: position.z,
		});
		const nearbyContext = findNearbyPoiContext(session, {
			x: position.x,
			z: position.z,
		});
		if (!nearbyContext) {
			continue;
		}
		if (!bestContext || nearbyContext.distance < bestContext.distance) {
			bestContext = nearbyContext;
		}
	}

	setNearbyPoi(bestContext);
}
