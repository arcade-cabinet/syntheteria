import type { CityPurposePresentation } from "./cityPresentation";
import { getCityPurposePresentation } from "./cityPresentation";
import type { WorldPoiType } from "./contracts";
import type {
	CityRuntimeSnapshot,
	NearbyPoiContext,
	SectorPoiSnapshot,
	WorldSessionSnapshot,
} from "./snapshots";

export interface ActiveLocationContext {
	activeCity: CityRuntimeSnapshot | null;
	poi: SectorPoiSnapshot | null;
	presentation: CityPurposePresentation | null;
}

export function getActiveLocationContext(args: {
	activeCityInstanceId: number | null;
	activeScene: "world" | "city";
	nearbyPoi: NearbyPoiContext | null;
	session: WorldSessionSnapshot | null;
}): ActiveLocationContext {
	const { activeCityInstanceId, activeScene, nearbyPoi, session } = args;
	if (!session) {
		return { activeCity: null, poi: null, presentation: null };
	}

	function withPresentation(
		activeCity: CityRuntimeSnapshot | null,
		poi: SectorPoiSnapshot | null,
	): ActiveLocationContext {
		const presentation =
			poi?.type != null
				? getCityPurposePresentation(poi.type as WorldPoiType)
				: null;
		return { activeCity, poi, presentation };
	}

	if (activeScene === "city") {
		const activeCity =
			session.cityInstances.find((city) => city.id === activeCityInstanceId) ??
			null;
		const poi = activeCity?.poi_id
			? (session.pointsOfInterest.find(
					(candidate) => candidate.id === activeCity.poi_id,
				) ?? null)
			: null;
		return withPresentation(activeCity, poi);
	}

	if (!nearbyPoi) {
		return { activeCity: null, poi: null, presentation: null };
	}

	const poi =
		session.pointsOfInterest.find(
			(candidate) => candidate.id === nearbyPoi.poiId,
		) ?? null;
	const activeCity =
		nearbyPoi.cityInstanceId !== null
			? (session.cityInstances.find(
					(city) => city.id === nearbyPoi.cityInstanceId,
				) ?? null)
			: null;

	return withPresentation(activeCity, poi);
}
