import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { u as useThree, C as Canvas } from './react-three-fiber.esm-PzQKdL82.js';
import { g as generateWorldData, W as WorldProvider, A as AssetLoadBeacon, S as StructuralFloorRenderer, C as CityRenderer } from './generation-D8PdR-ni.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { r as resetGameState, C as resetNetworkOverlay, D as networkOverlaySystem } from './gameState-CXdyHaTz.js';
import { H as createStartingRoster, J as toWorldEntitySnapshots, r as resetRuntimeState, p as resetStructuralSpace, c as clearActiveWorldSession, w as world, s as setActiveWorldSession, t as loadStructuralFragment, a as setRuntimeScene, L as setRuntimeTick, N as hydratePersistedWorldEntities, b as setNearbyPoi } from './contracts-Exa9P0hv.js';
import { N as NetworkLineRenderer } from './NetworkLineRenderer-CZO0tNHf.js';
import { e as getAnchorClusterFocus, U as UnitRenderer } from './UnitRenderer-DZePMRJg.js';
import { B as BriefingBubbleLayer } from './BriefingBubbleLayer-Dk31fiiC.js';
import { c as createNewGameConfig } from './config-DqmIuxQs.js';
import { g as gridToWorld } from './sectorCoordinates-Bm5lA-nC.js';
import './cityCatalog-DOxnPYXe.js';
import './CityModelMesh-4r60Iq1p.js';
import './floorMaterialPresets-LMzl77Ms.js';
import './seed-BwjLk4HQ.js';
import './locationContext-Cp3DEtpX.js';
import './cityPresentation-D5dFAzX3.js';

function createPreviewSession(seed) {
  const config = createNewGameConfig(seed, {
    sectorScale: "standard",
    climateProfile: "temperate",
    stormProfile: "volatile"
  });
  const generated = generateWorldData(config);
  const startingEntities = createStartingRoster({
    spawnQ: Math.floor(generated.ecumenopolis.width / 2),
    spawnR: Math.floor(generated.ecumenopolis.height / 2)
  });
  const pointsOfInterest = generated.pointsOfInterest.map((poi, index) => ({
    id: index + 1,
    ecumenopolis_id: 1,
    type: poi.type,
    name: poi.name,
    q: poi.q,
    r: poi.r,
    discovered: 1
  }));
  const cityInstances = generated.cityInstances.map((city, index) => {
    const poi = pointsOfInterest[index];
    const state = city.poiType === "home_base" ? "founded" : city.poiType === "coast_mines" ? "founded" : city.poiType === "research_site" ? "surveyed" : city.poiType === "deep_sea_gateway" ? "surveyed" : city.state;
    return {
      id: index + 1,
      ecumenopolis_id: 1,
      poi_id: poi?.id ?? null,
      name: city.name,
      world_q: city.worldQ,
      world_r: city.worldR,
      layout_seed: city.layoutSeed,
      generation_status: state === "latent" ? city.generationStatus : "instanced",
      state
    };
  });
  return {
    saveGame: {
      id: 1,
      name: "Ecumenopolis Preview",
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
      current_tick: 120,
      last_synced_at: 0
    },
    resourceState: {
      id: 1,
      save_game_id: 1,
      scrap_metal: 14,
      e_waste: 6,
      intact_components: 2,
      last_synced_at: 0
    },
    entities: toWorldEntitySnapshots(1, startingEntities)
  };
}
function PreviewCameraRig({
  target
}) {
  const { camera } = useThree();
  reactExports.useEffect(() => {
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
  }, [camera, target]);
  return null;
}
function EcumenopolisWorldPreview({
  view
}) {
  const [ready, setReady] = reactExports.useState(false);
  const [sceneLoaded, setSceneLoaded] = reactExports.useState(false);
  const [session, setSession] = reactExports.useState(null);
  const [cameraTarget, setCameraTarget] = reactExports.useState([
    0,
    0,
    0
  ]);
  const [cameraPosition, setCameraPosition] = reactExports.useState([0, 18, 18]);
  reactExports.useEffect(() => {
    setReady(false);
    setSceneLoaded(false);
    resetGameState();
    resetRuntimeState();
    resetStructuralSpace();
    resetNetworkOverlay();
    clearActiveWorldSession();
    for (const entity of [...world.entities]) {
      entity.destroy();
    }
    const session2 = createPreviewSession(view === "overview" ? 31415 : 42424);
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
      "world_primary"
    );
    setRuntimeScene("world", null);
    setRuntimeTick(120);
    const homeBase = session2.pointsOfInterest.find(
      (poi) => poi.type === "home_base"
    );
    const archiveCampus = session2.pointsOfInterest.find((poi) => poi.type === "research_site") ?? homeBase;
    const homeBaseWorld = gridToWorld(homeBase.q, homeBase.r);
    const archiveWorld = gridToWorld(archiveCampus.q, archiveCampus.r);
    const cultWard = session2.pointsOfInterest.find(
      (poi) => poi.type === "northern_cult_site"
    ) ?? homeBase;
    const homeFocus = getAnchorClusterFocus(session2, homeBase.q, homeBase.r);
    const archiveFocus = getAnchorClusterFocus(
      session2,
      archiveCampus.q,
      archiveCampus.r
    );
    const cultFocus = getAnchorClusterFocus(session2, cultWard.q, cultWard.r);
    setCameraTarget(
      view === "overview" ? [
        (homeBaseWorld.x + archiveWorld.x) / 2,
        0.2,
        (homeBaseWorld.z + archiveWorld.z) / 2
      ] : view === "anchor-cluster" ? homeFocus.target : view === "rival-cluster" ? archiveFocus.target : view === "cult-cluster" ? cultFocus.target : homeFocus.target
    );
    setCameraPosition(
      view === "overview" ? [
        (homeBaseWorld.x + archiveWorld.x) / 2,
        18,
        (homeBaseWorld.z + archiveWorld.z) / 2 + 22
      ] : view === "anchor-cluster" ? homeFocus.position : view === "rival-cluster" ? archiveFocus.position : view === "cult-cluster" ? cultFocus.position : homeFocus.position
    );
    hydratePersistedWorldEntities(session2.entities);
    networkOverlaySystem(120);
    setNearbyPoi({
      cityInstanceId: session2.cityInstances.find((city) => city.poi_id === archiveCampus.id)?.id ?? null,
      discovered: true,
      distance: 1.4,
      name: archiveCampus.name,
      poiId: archiveCampus.id,
      poiType: archiveCampus.type
    });
    setReady(true);
    return () => {
      clearActiveWorldSession();
      resetRuntimeState();
      resetStructuralSpace();
      resetNetworkOverlay();
      resetGameState();
      setSession(null);
    };
  }, [view]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      style: {
        width: 1400,
        height: 900,
        position: "relative",
        background: "linear-gradient(180deg, #10202c 0%, #07111a 55%, #03070d 100%)",
        overflow: "hidden"
      },
      children: ready ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(WorldProvider, { world, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Canvas,
          {
            style: { position: "absolute", inset: 0 },
            camera: {
              position: [...cameraPosition],
              fov: view === "overview" ? 30 : view === "anchor-cluster" ? 34 : 38
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("color", { attach: "background", args: ["#03070d"] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(PreviewCameraRig, { target: cameraTarget }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(AssetLoadBeacon, { onLoaded: () => setSceneLoaded(true) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ambientLight", { intensity: 1.05, color: 8162984 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("hemisphereLight", { args: [8370687, 463129, 0.9] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "directionalLight",
                {
                  position: [8, 16, 10],
                  intensity: 1.7,
                  color: 9168639
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "directionalLight",
                {
                  position: [-8, 10, -6],
                  intensity: 0.85,
                  color: 16172394
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                StructuralFloorRenderer,
                {
                  profile: view === "overview" ? "overview" : "default",
                  session
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(NetworkLineRenderer, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                CityRenderer,
                {
                  profile: view === "overview" ? "overview" : "default",
                  session
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UnitRenderer, {}) })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(BriefingBubbleLayer, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              position: "absolute",
              left: 20,
              bottom: 20,
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid rgba(139,230,255,0.18)",
              background: "rgba(3,7,13,0.72)",
              color: sceneLoaded ? "#6ff3c8" : "rgba(216,246,255,0.72)",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
              letterSpacing: "0.16em",
              textTransform: "uppercase"
            },
            children: sceneLoaded ? "Scene Loaded" : "Scene Loading"
          }
        ),
        session ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              position: "absolute",
              right: 20,
              top: 20,
              width: 360,
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(139, 230, 255, 0.22)",
              background: "linear-gradient(180deg, rgba(7,17,26,0.88) 0%, rgba(3,7,13,0.92) 100%)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
              color: "#d8f6ff",
              fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
              pointerEvents: "none"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: {
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "#8be6ff"
                  },
                  children: "Ecumenopolis Validation"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 10, fontSize: 13, color: "#ffffff" }, children: view === "overview" ? "Generated Campaign Overview" : view === "anchor-cluster" ? "Command Arcology Anchor Cluster" : view === "player-substation" ? "Player Substation Cluster" : view === "rival-cluster" ? "Rival Research Cluster" : view === "cult-cluster" ? "Cult Incursion Cluster" : "Starting Sector Inspection" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    marginTop: 6,
                    fontSize: 12,
                    color: "rgba(216,246,255,0.72)"
                  },
                  children: [
                    "Seed ",
                    session.config.worldSeed,
                    " · Sector scale",
                    " ",
                    session.config.sectorScale
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    fontSize: 12
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      "Cells: ",
                      session.sectorCells.length
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      "POIs: ",
                      session.pointsOfInterest.length
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      "Founded:",
                      " ",
                      session.cityInstances.filter(
                        (city) => city.state === "founded"
                      ).length
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      "Surveyed:",
                      " ",
                      session.cityInstances.filter(
                        (city) => city.state === "surveyed"
                      ).length
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: {
                    marginTop: 14,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#6ff3c8"
                  },
                  children: "Visible Anchors"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: { marginTop: 8, display: "grid", gap: 6, fontSize: 12 },
                  children: session.pointsOfInterest.map((poi) => {
                    const city = session.cityInstances.find(
                      (candidate) => candidate.poi_id === poi.id
                    );
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          color: poi.type === "northern_cult_site" ? "#ff9cb5" : poi.type === "deep_sea_gateway" ? "#9ecbff" : "#d8f6ff"
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: poi.name }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "rgba(216,246,255,0.68)" }, children: city?.state ?? "latent" })
                        ]
                      },
                      poi.id
                    );
                  })
                }
              )
            ]
          }
        ) : null
      ] }) : null
    }
  );
}

export { EcumenopolisWorldPreview };
//# sourceMappingURL=EcumenopolisWorldPreview-C3F2IUVJ.js.map
