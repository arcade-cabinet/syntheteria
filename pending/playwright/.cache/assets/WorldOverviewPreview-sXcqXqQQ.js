import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { u as useThree, C as Canvas } from './react-three-fiber.esm-PzQKdL82.js';
import { g as generateWorldData, W as WorldProvider, A as AssetLoadBeacon, S as StructuralFloorRenderer, C as CityRenderer } from './generation-D8PdR-ni.js';
import { m as modelManifest, c as chunksConfig, r as reactExports } from './index-COtgIsy1.js';
import { r as resetGameState } from './gameState-CXdyHaTz.js';
import { r as resetRuntimeState, p as resetStructuralSpace, c as clearActiveWorldSession, w as world, s as setActiveWorldSession, t as loadStructuralFragment, a as setRuntimeScene, L as setRuntimeTick } from './contracts-Exa9P0hv.js';
import { c as createNewGameConfig } from './config-DqmIuxQs.js';
import { S as SECTOR_LATTICE_SIZE } from './sectorCoordinates-Bm5lA-nC.js';
import './cityCatalog-DOxnPYXe.js';
import './CityModelMesh-4r60Iq1p.js';
import './floorMaterialPresets-LMzl77Ms.js';
import './seed-BwjLk4HQ.js';

const TEST_SEED = 42;
const TEST_SEED_STRING = "syntheteria-test-deterministic-42";
const MODEL_DEFINITIONS = modelManifest.models;
const EXPECTED_MODEL_COUNT = modelManifest.models.length;
const TILE_SIZE_METERS = modelManifest.tileSize;
const STANDARD_MAP_WIDTH = 40;
const STANDARD_MAP_HEIGHT = 40;
const CHUNK_SIZE = chunksConfig.chunkSize;
const CELL_WORLD_SIZE = chunksConfig.cellWorldSize;
const VALID_CATEGORIES = [
  ...new Set(modelManifest.models.map((m) => m.category))
].sort();
const CATEGORY_COUNTS = {};
for (const model of modelManifest.models) {
  CATEGORY_COUNTS[model.category] = (CATEGORY_COUNTS[model.category] ?? 0) + 1;
}
const EXPECTED_CATEGORIES = [
  "city_kit",
  "defense",
  "exploration",
  "industrial",
  "infrastructure",
  "logistics",
  "robot",
  "structural"
];
const EXPECTED_POI_TYPES = [
  "home_base",
  "coast_mines",
  "science_campus",
  "northern_cult_site",
  "deep_sea_gateway"
];
const ASSET_BASE_PATH = "public/assets/models";

function createOverviewSession(seed) {
  const config = createNewGameConfig(seed, {
    sectorScale: "small",
    climateProfile: "temperate",
    stormProfile: "stable"
  });
  const generated = generateWorldData(config);
  const pointsOfInterest = generated.pointsOfInterest.map((poi, index) => ({
    id: index + 1,
    ecumenopolis_id: 1,
    type: poi.type,
    name: poi.name,
    q: poi.q,
    r: poi.r,
    discovered: 1
  }));
  const cityInstances = generated.cityInstances.map((city, index) => ({
    id: index + 1,
    ecumenopolis_id: 1,
    poi_id: pointsOfInterest[index]?.id ?? null,
    name: city.name,
    world_q: city.worldQ,
    world_r: city.worldR,
    layout_seed: city.layoutSeed,
    generation_status: city.generationStatus,
    state: city.state
  }));
  return {
    saveGame: {
      id: 1,
      name: "World Overview Test",
      world_seed: seed,
      sector_scale: config.sectorScale,
      difficulty: config.difficulty,
      climate_profile: config.climateProfile,
      storm_profile: config.stormProfile,
      created_at: 0,
      last_played_at: 0,
      playtime_seconds: 0
    },
    config,
    ecumenopolis: {
      id: 1,
      save_game_id: 1,
      width: generated.ecumenopolis.width,
      height: generated.ecumenopolis.height,
      sector_scale: config.sectorScale,
      climate_profile: config.climateProfile,
      storm_profile: config.stormProfile,
      spawn_sector_id: generated.ecumenopolis.spawnSectorId,
      spawn_anchor_key: generated.ecumenopolis.spawnAnchorKey,
      generated_at: 0
    },
    sectorCells: generated.sectorCells.map((cell, index) => ({
      id: index + 1,
      ecumenopolis_id: 1,
      q: cell.q,
      r: cell.r,
      structural_zone: cell.structuralZone,
      floor_preset_id: cell.floorPresetId,
      discovery_state: cell.discoveryState,
      passable: cell.passable ? 1 : 0,
      sector_archetype: cell.sectorArchetype,
      storm_exposure: cell.stormExposure,
      impassable_class: cell.impassableClass,
      anchor_key: cell.anchorKey
    })),
    sectorStructures: generated.sectorStructures.map((structure, index) => ({
      id: index + 1,
      ecumenopolis_id: 1,
      district_structure_id: structure.districtStructureId,
      anchor_key: structure.anchorKey,
      q: structure.q,
      r: structure.r,
      model_id: structure.modelId,
      placement_layer: structure.placementLayer,
      edge: structure.edge,
      rotation_quarter_turns: structure.rotationQuarterTurns,
      offset_x: structure.offsetX,
      offset_y: structure.offsetY,
      offset_z: structure.offsetZ,
      target_span: structure.targetSpan,
      sector_archetype: structure.sectorArchetype,
      source: structure.source,
      controller_faction: structure.controllerFaction
    })),
    pointsOfInterest,
    cityInstances,
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
}
function CameraRig({
  target,
  position
}) {
  const { camera } = useThree();
  reactExports.useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, target, position]);
  return null;
}
function WorldOverviewPreview() {
  const [ready, setReady] = reactExports.useState(false);
  const [sceneLoaded, setSceneLoaded] = reactExports.useState(false);
  const [session, setSession] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setReady(false);
    setSceneLoaded(false);
    resetGameState();
    resetRuntimeState();
    resetStructuralSpace();
    clearActiveWorldSession();
    for (const entity of [...world.entities]) {
      entity.destroy();
    }
    const session2 = createOverviewSession(TEST_SEED);
    setSession(session2);
    setActiveWorldSession(session2);
    loadStructuralFragment(
      session2.sectorCells.map((cell) => ({
        q: cell.q,
        r: cell.r,
        structuralZone: cell.structural_zone,
        floorPresetId: cell.floor_preset_id,
        discoveryState: cell.discovery_state,
        passable: Boolean(cell.passable)
      })),
      session2.ecumenopolis,
      "world_overview_test"
    );
    setRuntimeScene("world", null);
    setRuntimeTick(0);
    setReady(true);
    return () => {
      clearActiveWorldSession();
      resetRuntimeState();
      resetStructuralSpace();
      resetGameState();
    };
  }, []);
  const worldWidth = session?.ecumenopolis.width ?? 28;
  const worldHeight = session?.ecumenopolis.height ?? 28;
  const centerX = worldWidth / 2 * SECTOR_LATTICE_SIZE;
  const centerZ = worldHeight / 2 * SECTOR_LATTICE_SIZE;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      style: {
        width: 800,
        height: 600,
        position: "relative",
        background: "#03070d",
        overflow: "hidden"
      },
      children: ready && session ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(WorldProvider, { world, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Canvas,
          {
            style: { position: "absolute", inset: 0 },
            camera: {
              position: [centerX, 50, centerZ + 35],
              fov: 26
            },
            gl: { preserveDrawingBuffer: true },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("color", { attach: "background", args: ["#03070d"] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CameraRig,
                {
                  position: [centerX, 50, centerZ + 35],
                  target: [centerX, 0, centerZ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(AssetLoadBeacon, { onLoaded: () => setSceneLoaded(true) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ambientLight", { intensity: 1.05, color: 8162984 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("hemisphereLight", { args: [8370687, 463129, 0.9] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "directionalLight",
                {
                  position: [8, 30, 10],
                  intensity: 1.7,
                  color: 9168639
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                StructuralFloorRenderer,
                {
                  profile: "overview",
                  session
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CityRenderer, { profile: "overview", session }) })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-testid": "canvas-status",
            style: {
              position: "absolute",
              left: 8,
              bottom: 8,
              padding: "4px 8px",
              background: "rgba(0,0,0,0.7)",
              color: sceneLoaded ? "#6ff3c8" : "#ff9cb5",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              borderRadius: 6
            },
            children: sceneLoaded ? "Ready" : "Rendering"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              position: "absolute",
              right: 12,
              top: 12,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid rgba(139,230,255,0.18)",
              background: "rgba(3,7,13,0.75)",
              color: "#d8f6ff",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              pointerEvents: "none"
            },
            children: [
              "World Overview · Seed ",
              TEST_SEED,
              " · ",
              worldWidth,
              "x",
              worldHeight
            ]
          }
        )
      ] }) : null
    }
  );
}

export { WorldOverviewPreview };
//# sourceMappingURL=WorldOverviewPreview-sXcqXqQQ.js.map
