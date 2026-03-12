import type { NearbyPoiContext, WorldSessionSnapshot } from "./snapshots";
import { isFoundableCityPoiType } from "./contracts";

export const POI_DISCOVERY_RADIUS = 8;
export const POI_INTERACTION_RADIUS = 5;

export function findPoiById(session: WorldSessionSnapshot, poiId: number) {
	return session.pointsOfInterest.find((poi) => poi.id === poiId) ?? null;
}

export function findCityInstanceById(
	session: WorldSessionSnapshot,
	cityInstanceId: number,
) {
	return (
		session.cityInstances.find(
			(candidate) => candidate.id === cityInstanceId,
		) ?? null
	);
}

export function findCityForPoi(session: WorldSessionSnapshot, poiId: number) {
	return (
		session.cityInstances.find((candidate) => candidate.poi_id === poiId) ??
		null
	);
}

export function markDiscoveredPoisNearPosition(
	session: WorldSessionSnapshot,
	position: { x: number; z: number },
	discoveryRadius = POI_DISCOVERY_RADIUS,
) {
	for (const poi of session.pointsOfInterest) {
		const dx = poi.q - position.x;
		const dz = poi.r - position.z;
		const distance = Math.sqrt(dx * dx + dz * dz);
		if (distance <= discoveryRadius && poi.discovered === 0) {
			poi.discovered = 1;
		}
	}
}

export function findNearbyPoiContext(
	session: WorldSessionSnapshot,
	position: { x: number; z: number },
	interactionRadius = POI_INTERACTION_RADIUS,
): NearbyPoiContext | null {
	let bestContext: NearbyPoiContext | null = null;
	let bestActionableContext: NearbyPoiContext | null = null;

	for (const poi of session.pointsOfInterest) {
		const dx = poi.q - position.x;
		const dz = poi.r - position.z;
		const distance = Math.sqrt(dx * dx + dz * dz);
		if (distance > interactionRadius) {
			continue;
		}

		const city = findCityForPoi(session, poi.id);
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

		const isActionable =
			isFoundableCityPoiType(poi.type) && city != null && city.state !== "founded";
		if (
			isActionable &&
			(!bestActionableContext || distance < bestActionableContext.distance)
		) {
			bestActionableContext = {
				cityInstanceId: city?.id ?? null,
				discovered: poi.discovered === 1,
				distance,
				name: poi.name,
				poiId: poi.id,
				poiType: poi.type,
			};
		}
	}

	return bestActionableContext ?? bestContext;
}
