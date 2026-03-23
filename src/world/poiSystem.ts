import { Identity, WorldPosition } from "../ecs/traits";
import { units } from "../ecs/world";
import { setNearbyPoi } from "./runtimeState";
import { getActiveWorldSession } from "./session";

const POI_DISCOVERY_RADIUS = 8;
const POI_INTERACTION_RADIUS = 5;

export function poiSystem() {
	const session = getActiveWorldSession();
	if (!session) {
		return;
	}

	let bestContext: {
		cityInstanceId: number | null;
		discovered: boolean;
		distance: number;
		name: string;
		poiId: number;
		poiType: (typeof session.pointsOfInterest)[number]["type"];
	} | null = null;

	for (const unit of units) {
		if (unit.get(Identity)?.faction !== "player") {
			continue;
		}
		if (unit.get(WorldPosition) == null) {
			continue;
		}

		const position = unit.get(WorldPosition)!;
		for (const poi of session.pointsOfInterest) {
			const dx = poi.q - position.x;
			const dz = poi.r - position.z;
			const distance = Math.sqrt(dx * dx + dz * dz);

			if (distance <= POI_DISCOVERY_RADIUS && poi.discovered === 0) {
				poi.discovered = 1;
				const city = session.cityInstances.find(
					(candidate) => candidate.poi_id === poi.id,
				);
				if (city && city.state === "latent") {
					city.state = "surveyed";
				}
			}

			if (distance <= POI_INTERACTION_RADIUS) {
				const city = session.cityInstances.find(
					(candidate) => candidate.poi_id === poi.id,
				);
				if (!bestContext || distance < bestContext.distance) {
					bestContext = {
						cityInstanceId: city?.id ?? null,
						discovered: poi.discovered === 1,
						distance,
						name: poi.name,
						poiId: poi.id,
						poiType: poi.type,
					};
				}
			}
		}
	}

	setNearbyPoi(bestContext);
}
