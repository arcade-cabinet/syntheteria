import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { u as useThree, C as Canvas } from './react-three-fiber.esm-PzQKdL82.js';
import { g as generateWorldData, W as WorldProvider, A as AssetLoadBeacon, S as StructuralFloorRenderer, C as CityRenderer } from './generation-D8PdR-ni.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { H as createStartingRoster, J as toWorldEntitySnapshots, r as resetRuntimeState, p as resetStructuralSpace, K as resetWorldAIService, c as clearActiveWorldSession, w as world, s as setActiveWorldSession, t as loadStructuralFragment, a as setRuntimeScene, L as setRuntimeTick, N as hydratePersistedWorldEntities, I as Identity, U as Unit, W as WorldPosition, b as setNearbyPoi, l as issueMoveCommand, O as aiSystem } from './contracts-Exa9P0hv.js';
import { r as resetGameState, C as resetNetworkOverlay, D as networkOverlaySystem } from './gameState-CXdyHaTz.js';
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
    const state = city.poiType === "home_base" ? "founded" : city.poiType === "research_site" ? "surveyed" : city.poiType === "coast_mines" ? "founded" : city.state;
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
      name: "Robot Ops Preview",
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
      scrap_metal: 18,
      e_waste: 9,
      intact_components: 3,
      last_synced_at: 0
    },
    entities: toWorldEntitySnapshots(1, startingEntities)
  };
}
function EcumenopolisRobotOpsPreview({
  mode
}) {
  const [session, setSession] = reactExports.useState(null);
  const [ready, setReady] = reactExports.useState(false);
  const [sceneLoaded, setSceneLoaded] = reactExports.useState(false);
  const [legend, setLegend] = reactExports.useState([]);
  const [cameraTarget, setCameraTarget] = reactExports.useState([
    0,
    0,
    0
  ]);
  const [cameraPosition, setCameraPosition] = reactExports.useState([0.6, 10.8, 15.6]);
  const [rosterMarkers, setRosterMarkers] = reactExports.useState([]);
  reactExports.useEffect(() => {
    setReady(false);
    setSceneLoaded(false);
    resetGameState();
    resetRuntimeState();
    resetStructuralSpace();
    resetNetworkOverlay();
    resetWorldAIService();
    clearActiveWorldSession();
    for (const entity of [...world.entities]) {
      entity.destroy();
    }
    const session2 = createPreviewSession(mode === "placement" ? 51515 : 62626);
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
    setRuntimeTick(0);
    const homeBase = session2.pointsOfInterest.find(
      (poi) => poi.type === "home_base"
    );
    const archiveCampus = session2.pointsOfInterest.find((poi) => poi.type === "research_site") ?? homeBase;
    const home = gridToWorld(homeBase.q, homeBase.r);
    hydratePersistedWorldEntities(
      session2.entities.filter(
        (entity) => entity.faction === "player" && entity.scene_location === "world"
      )
    );
    const roster = Array.from(world.query(Identity, Unit, WorldPosition)).map(
      (entity) => {
        const unit = entity.get(Unit);
        const position = entity.get(WorldPosition);
        return {
          id: entity.get(Identity).id,
          unitType: unit.type,
          position: [position.x, position.y, position.z],
          selected: unit.selected
        };
      }
    );
    setRosterMarkers(
      roster.map((member, index) => ({
        id: member.id,
        unitType: member.unitType,
        position: [
          member.position[0],
          member.position[1],
          member.position[2]
        ],
        color: member.selected ? 16765286 : member.unitType === "utility_drone" ? 9168639 : member.unitType === "fabrication_unit" ? 16172394 : member.unitType === "mecha_golem" ? 7336904 : 16748431
      }))
    );
    setNearbyPoi({
      cityInstanceId: session2.cityInstances.find((city) => city.poi_id === archiveCampus.id)?.id ?? null,
      discovered: true,
      distance: mode === "movement" ? 3.6 : 2.1,
      name: archiveCampus.name,
      poiId: archiveCampus.id,
      poiType: archiveCampus.type
    });
    if (mode === "movement") {
      issueMoveCommand("tech", { x: home.x + 2.8, y: 0, z: home.z - 1.6 });
      for (let tick = 1; tick <= 45; tick++) {
        aiSystem(1 / 30, tick);
        setRuntimeTick(tick);
      }
    }
    const homeFocus = getAnchorClusterFocus(session2, homeBase.q, homeBase.r);
    setCameraTarget(homeFocus.target);
    setCameraPosition(
      mode === "placement" ? homeFocus.position : [
        homeFocus.position[0] - 1.6,
        Math.max(5.8, homeFocus.position[1] - 0.8),
        homeFocus.position[2] - 1.4
      ]
    );
    networkOverlaySystem(mode === "movement" ? 45 : 0);
    setLegend(
      mode === "placement" ? [
        "Placement audit",
        "Five starting chassis staged at the Command Arcology",
        "Selected unit bubble should remain readable without obscuring the playfield"
      ] : [
        "Movement audit",
        "Field Technician issued AI-owned move command toward Archive Campus",
        "Selected unit should remain legible while in transit"
      ]
    );
    setReady(true);
    return () => {
      clearActiveWorldSession();
      resetRuntimeState();
      resetStructuralSpace();
      resetNetworkOverlay();
      resetWorldAIService();
      resetGameState();
      setRosterMarkers([]);
      setSession(null);
    };
  }, [mode]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      style: {
        width: 1400,
        height: 900,
        position: "relative",
        background: "linear-gradient(180deg, #0f1d29 0%, #061019 58%, #03070d 100%)",
        overflow: "hidden"
      },
      children: ready ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(WorldProvider, { world, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Canvas,
          {
            style: { position: "absolute", inset: 0 },
            camera: {
              position: [...cameraPosition],
              fov: mode === "placement" ? 34 : 38
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("color", { attach: "background", args: ["#03070d"] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(PreviewCameraRig, { target: cameraTarget }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(AssetLoadBeacon, { onLoaded: () => setSceneLoaded(true) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ambientLight", { intensity: 1, color: 8623274 }),
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
              /* @__PURE__ */ jsxRuntimeExports.jsx(StructuralFloorRenderer, { profile: "ops", session }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(NetworkLineRenderer, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CityRenderer, { profile: "ops", session }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UnitRenderer, {}) }),
              mode === "placement" ? rosterMarkers.map((marker) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "group",
                {
                  position: [
                    marker.position[0],
                    marker.position[1] + 0.1,
                    marker.position[2]
                  ],
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1.15, 0], children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.04, 0.04, 2.3, 10] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "meshBasicMaterial",
                        {
                          color: marker.color,
                          transparent: true,
                          opacity: 0.4
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 2.35, 0], children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("sphereGeometry", { args: [0.1, 12, 12] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "meshBasicMaterial",
                        {
                          color: marker.color,
                          transparent: true,
                          opacity: 0.95
                        }
                      )
                    ] })
                  ]
                },
                marker.id
              )) : null
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              position: "absolute",
              right: 20,
              bottom: 20,
              width: 380,
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
                  children: "Robot Ops Validation"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 10, fontSize: 13, color: "#ffffff" }, children: legend[0] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: { marginTop: 8, display: "grid", gap: 6, fontSize: 12 },
                  children: legend.slice(1).map((line) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "rgba(216,246,255,0.72)" }, children: line }, line))
                }
              )
            ]
          }
        )
      ] }) : null
    }
  );
}

export { EcumenopolisRobotOpsPreview };
//# sourceMappingURL=EcumenopolisRobotOpsPreview-B2SSUlu0.js.map
