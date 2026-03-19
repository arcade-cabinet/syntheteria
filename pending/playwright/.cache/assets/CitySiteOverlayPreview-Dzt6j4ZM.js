import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { r as resetGameState } from './gameState-CXdyHaTz.js';
import { g as getActiveLocationContext } from './locationContext-Cp3DEtpX.js';
import { e as subscribeRuntimeState, g as getRuntimeState, f as getActiveWorldSession, h as setCitySiteModalOpen, r as resetRuntimeState, c as clearActiveWorldSession, s as setActiveWorldSession, a as setRuntimeScene, b as setNearbyPoi } from './contracts-Exa9P0hv.js';
import { CitySiteModal } from './CitySiteModal-CHVpT2ze.js';
import './seed-BwjLk4HQ.js';
import './config-DqmIuxQs.js';
import './sectorCoordinates-Bm5lA-nC.js';
import './cityPresentation-D5dFAzX3.js';
import './cityCatalog-DOxnPYXe.js';
import './poiActions-DqyDupab.js';
import './HudButton-CEI_uBOF.js';

function CitySiteOverlay() {
  const runtime = reactExports.useSyncExternalStore(subscribeRuntimeState, getRuntimeState);
  const session = getActiveWorldSession();
  if (!runtime.citySiteModalOpen || !session) {
    return null;
  }
  const { activeCity, poi } = getActiveLocationContext({
    activeCityInstanceId: runtime.activeCityInstanceId,
    activeScene: runtime.activeScene,
    nearbyPoi: runtime.citySiteModalContext ?? runtime.nearbyPoi,
    session
  });
  if (!poi) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CitySiteModal,
    {
      city: activeCity,
      context: {
        cityInstanceId: activeCity?.id ?? null,
        discovered: poi.discovered === 1,
        distance: runtime.citySiteModalContext?.distance ?? runtime.nearbyPoi?.distance ?? 0,
        name: poi.name,
        poiId: poi.id,
        poiType: poi.type
      },
      mode: runtime.activeScene === "city" ? "city" : "world",
      onClose: () => setCitySiteModalOpen(false)
    }
  );
}

const baseSession = {
  saveGame: {
    id: 1,
    name: "City Site Overlay Test",
    world_seed: 1,
    sector_scale: "standard",
    difficulty: "standard",
    climate_profile: "temperate",
    storm_profile: "volatile",
    created_at: 0,
    last_played_at: 0,
    playtime_seconds: 0
  },
  config: {
    worldSeed: 1,
    sectorScale: "standard",
    difficulty: "standard",
    climateProfile: "temperate",
    stormProfile: "volatile"
  },
  ecumenopolis: {
    id: 1,
    save_game_id: 1,
    width: 40,
    height: 40,
    sector_scale: "standard",
    climate_profile: "temperate",
    storm_profile: "volatile",
    spawn_sector_id: "command_arcology",
    spawn_anchor_key: "0,0",
    generated_at: 0
  },
  sectorCells: [],
  sectorStructures: [],
  pointsOfInterest: [
    {
      id: 11,
      ecumenopolis_id: 1,
      type: "science_campus",
      name: "Science Campus",
      q: 2,
      r: 3,
      discovered: 1
    }
  ],
  cityInstances: [
    {
      id: 22,
      ecumenopolis_id: 1,
      poi_id: 11,
      name: "Science Campus",
      world_q: 2,
      world_r: 3,
      layout_seed: 42,
      generation_status: "reserved",
      state: "surveyed"
    }
  ],
  campaignState: {
    id: 1,
    save_game_id: 1,
    active_scene: "world",
    active_city_instance_id: null,
    current_tick: 0,
    last_synced_at: 0
  },
  resourceState: {
    id: 1,
    save_game_id: 1,
    scrap_metal: 0,
    e_waste: 0,
    intact_components: 0,
    last_synced_at: 0
  }
};
function CitySiteOverlayPreview({ scene }) {
  const [ready, setReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setReady(false);
    resetRuntimeState();
    clearActiveWorldSession();
    setActiveWorldSession(baseSession);
    setRuntimeScene(scene, scene === "city" ? 22 : null);
    const nearbyPoiContext = scene === "world" ? {
      cityInstanceId: 22,
      discovered: true,
      distance: 1.2,
      name: "Science Campus",
      poiId: 11,
      poiType: "science_campus"
    } : null;
    setNearbyPoi(nearbyPoiContext);
    setCitySiteModalOpen(true, nearbyPoiContext);
    resetGameState();
    setReady(true);
    const keepAlive = scene === "world" && nearbyPoiContext ? setInterval(() => {
      setNearbyPoi(nearbyPoiContext);
      setCitySiteModalOpen(true, nearbyPoiContext);
    }, 50) : null;
    return () => {
      if (keepAlive) {
        clearInterval(keepAlive);
      }
      clearActiveWorldSession();
      resetRuntimeState();
      resetGameState();
    };
  }, [scene]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 1400, height: 900, position: "relative" }, children: ready ? /* @__PURE__ */ jsxRuntimeExports.jsx(CitySiteOverlay, {}) : null });
}

export { CitySiteOverlayPreview };
//# sourceMappingURL=CitySiteOverlayPreview-Dzt6j4ZM.js.map
