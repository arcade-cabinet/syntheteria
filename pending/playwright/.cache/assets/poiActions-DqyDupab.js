import { g as getCityPurposePresentation, d as describeCityState } from './cityPresentation-D5dFAzX3.js';
import { y as isFoundableCityPoiType, D as DEFAULT_CITY_GENERATION_STATUS, f as getActiveWorldSession, g as getRuntimeState, z as persistRuntimeWorldStateSync, A as capturePersistableWorldEntities, C as getStructuralFragments, E as getStructuralCellRecords, m as getResources, a as setRuntimeScene, F as setCityKitLabOpen, G as requireActiveWorldSession } from './contracts-Exa9P0hv.js';

function getInitialCityState(poiType) {
  return poiType === "home_base" ? "founded" : "latent";
}
function surveyCityState(state) {
  return state === "latent" ? "surveyed" : state;
}
function foundCityState(state) {
  if (state === "founded") {
    return state;
  }
  return "founded";
}
function enterCityState(state) {
  return surveyCityState(state);
}
function canFoundCitySite(poiType, state) {
  return isFoundableCityPoiType(poiType) && state !== "founded";
}
function canEnterCitySite(state) {
  return state !== "latent";
}
function createGeneratedCitySeed(poiType, name, worldQ, worldR, layoutSeed) {
  return {
    poiType,
    name,
    worldQ,
    worldR,
    layoutSeed,
    state: getInitialCityState(poiType),
    generationStatus: DEFAULT_CITY_GENERATION_STATUS
  };
}
function applySurveyToCity(city) {
  city.state = surveyCityState(city.state);
  return city;
}
function applyFoundingToCity(city) {
  city.state = foundCityState(city.state);
  return city;
}
function applyEntryToCity(city) {
  city.state = enterCityState(city.state);
  return city;
}

function getCitySiteViewModel(args) {
  const { city, context, mode } = args;
  const presentation = getCityPurposePresentation(context.poiType);
  const canSurvey = city?.state === "latent";
  const canFound = city ? canFoundCitySite(context.poiType, city.state) : false;
  const canEnter = city ? canEnterCitySite(city.state) : false;
  const actions = [];
  if (canSurvey) {
    actions.push({
      id: "survey",
      label: presentation.surveyLabel,
      meta: "mark linked interior as surveyed",
      variant: "secondary"
    });
  }
  if (canFound) {
    actions.push({
      id: "found",
      label: presentation.foundationLabel,
      meta: "establish substation and claim site",
      variant: "primary"
    });
  }
  if (canEnter) {
    actions.push({
      id: "enter",
      label: presentation.enterLabel,
      meta: "transition into linked city",
      variant: "secondary"
    });
  }
  if (mode === "city") {
    actions.push({
      id: "return",
      label: "Return To World",
      meta: "restore outdoor scene",
      variant: "secondary"
    });
  }
  return {
    presentation,
    canSurvey,
    canFound,
    canEnter,
    cityStatus: describeCityState(city?.state),
    cityStatusMeta: city ? `Layout seed ${city.layout_seed} · ${city.generation_status}` : "No linked city instance.",
    actionFlowSummary: "Surveying commits the site layout to the archive. Establishing a substation claims the site as an operational node. Entering transfers command relay into the site interior.",
    actions
  };
}

function syncActiveWorldSessionState() {
  const session = getActiveWorldSession();
  if (!session) {
    return;
  }
  const runtime = getRuntimeState();
  persistRuntimeWorldStateSync({
    saveGameId: session.saveGame.id,
    ecumenopolisId: session.ecumenopolis.id,
    tick: runtime.currentTick,
    activeScene: runtime.activeScene,
    activeCityInstanceId: runtime.activeCityInstanceId,
    resources: getResources(),
    sectorCells: getStructuralFragments().flatMap(
      (fragment) => getStructuralCellRecords(fragment.id).map((cell) => ({
        q: cell.q,
        r: cell.r,
        discovery_state: cell.discoveryState
      }))
    ),
    pointsOfInterest: session.pointsOfInterest.map((poi) => ({
      id: poi.id,
      discovered: poi.discovered
    })),
    cityInstances: session.cityInstances.map((city) => ({
      id: city.id,
      state: city.state
    })),
    entities: capturePersistableWorldEntities()
  });
}
function enterCityInstance(cityInstanceId) {
  const session = getActiveWorldSession();
  if (!session) {
    throw new Error("Cannot enter a district without an active world session.");
  }
  const city = session.cityInstances.find(
    (candidate) => candidate.id === cityInstanceId
  );
  if (!city) {
    throw new Error(`City instance ${cityInstanceId} does not exist.`);
  }
  applyEntryToCity(city);
  setRuntimeScene("city", cityInstanceId);
  syncActiveWorldSessionState();
}
function returnToWorld() {
  setRuntimeScene("world", null);
  syncActiveWorldSessionState();
}
function getActiveCityInstance() {
  const session = getActiveWorldSession();
  const runtime = getRuntimeState();
  if (!session || runtime.activeCityInstanceId === null) {
    return null;
  }
  return session.cityInstances.find(
    (candidate) => candidate.id === runtime.activeCityInstanceId
  ) ?? null;
}
function getSceneMode() {
  return getRuntimeState().activeScene;
}
function openCityKitLab() {
  setCityKitLabOpen(true);
}
function closeCityKitLab() {
  setCityKitLabOpen(false);
}

function getCityForPoi(cityInstanceId) {
  const session = requireActiveWorldSession();
  const city = session.cityInstances.find(
    (candidate) => candidate.id === cityInstanceId
  );
  if (!city) {
    throw new Error(`City instance ${cityInstanceId} does not exist.`);
  }
  return city;
}
function surveyCitySite(cityInstanceId) {
  const city = getCityForPoi(cityInstanceId);
  const previousState = city.state;
  applySurveyToCity(city);
  if (city.state !== previousState) {
    syncActiveWorldSessionState();
  }
  return city;
}
function foundCitySite(cityInstanceId) {
  const city = getCityForPoi(cityInstanceId);
  const previousState = city.state;
  applyFoundingToCity(city);
  if (city.state !== previousState) {
    syncActiveWorldSessionState();
  }
  return city;
}

export { enterCityInstance as e, foundCitySite as f, getCitySiteViewModel as g, openCityKitLab as o, returnToWorld as r, surveyCitySite as s };
//# sourceMappingURL=poiActions-DqyDupab.js.map
