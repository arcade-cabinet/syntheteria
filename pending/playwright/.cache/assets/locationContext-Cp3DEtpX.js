import { g as getCityPurposePresentation } from './cityPresentation-D5dFAzX3.js';

function getActiveLocationContext(args) {
  const { activeCityInstanceId, activeScene, nearbyPoi, session } = args;
  if (!session) {
    return { activeCity: null, poi: null, presentation: null };
  }
  function withPresentation(activeCity2, poi2) {
    const presentation = poi2?.type != null ? getCityPurposePresentation(poi2.type) : null;
    return { activeCity: activeCity2, poi: poi2, presentation };
  }
  if (activeScene === "city") {
    const activeCity2 = session.cityInstances.find((city) => city.id === activeCityInstanceId) ?? null;
    const poi2 = activeCity2?.poi_id ? session.pointsOfInterest.find(
      (candidate) => candidate.id === activeCity2.poi_id
    ) ?? null : null;
    return withPresentation(activeCity2, poi2);
  }
  if (!nearbyPoi) {
    return { activeCity: null, poi: null, presentation: null };
  }
  const poi = session.pointsOfInterest.find(
    (candidate) => candidate.id === nearbyPoi.poiId
  ) ?? null;
  const activeCity = nearbyPoi.cityInstanceId !== null ? session.cityInstances.find(
    (city) => city.id === nearbyPoi.cityInstanceId
  ) ?? null : null;
  return withPresentation(activeCity, poi);
}

export { getActiveLocationContext as g };
//# sourceMappingURL=locationContext-Cp3DEtpX.js.map
