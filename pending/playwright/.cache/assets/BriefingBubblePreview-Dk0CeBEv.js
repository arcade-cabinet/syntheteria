import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { r as resetRuntimeState, c as clearActiveWorldSession, s as setActiveWorldSession, a as setRuntimeScene, b as setNearbyPoi, w as world, I as Identity, M as MapFragment, U as Unit, W as WorldPosition, d as createBotUnitState } from './contracts-Exa9P0hv.js';
import { r as resetGameState } from './gameState-CXdyHaTz.js';
import { B as BriefingBubbleLayer } from './BriefingBubbleLayer-Dk31fiiC.js';
import './seed-BwjLk4HQ.js';
import './sectorCoordinates-Bm5lA-nC.js';
import './cityCatalog-DOxnPYXe.js';
import './config-DqmIuxQs.js';
import './locationContext-Cp3DEtpX.js';
import './cityPresentation-D5dFAzX3.js';

const baseSession = {
  saveGame: {
    id: 1,
    name: "Briefing Bubble Test",
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
      name: "Archive Campus",
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
      name: "Archive Campus",
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
function BriefingBubblePreview() {
  const [ready, setReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setReady(false);
    resetRuntimeState();
    clearActiveWorldSession();
    setActiveWorldSession(baseSession);
    setRuntimeScene("world", null);
    setNearbyPoi({
      cityInstanceId: 22,
      discovered: true,
      distance: 1,
      name: "Archive Campus",
      poiId: 11,
      poiType: "science_campus"
    });
    const entity = world.spawn(Identity, MapFragment, Unit, WorldPosition);
    entity.set(Identity, { id: "bubble_unit", faction: "player" });
    entity.set(MapFragment, { fragmentId: "world_primary" });
    entity.set(
      Unit,
      createBotUnitState({
        unitType: "maintenance_bot",
        displayName: "Field Technician",
        speed: 1,
        selected: true,
        components: []
      })
    );
    entity.set(WorldPosition, { x: 2, y: 0, z: 3 });
    resetGameState();
    setReady(true);
    return () => {
      entity.destroy();
      clearActiveWorldSession();
      resetRuntimeState();
      resetGameState();
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      style: {
        width: 1400,
        height: 900,
        position: "relative",
        background: "#02050a"
      },
      children: ready ? /* @__PURE__ */ jsxRuntimeExports.jsx(BriefingBubbleLayer, {}) : null
    }
  );
}

export { BriefingBubblePreview };
//# sourceMappingURL=BriefingBubblePreview-Dk0CeBEv.js.map
