import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { r as reactExports, C as CHUNK_SIZE, g as getDatabaseSync } from './index-COtgIsy1.js';
import { D as DoubleSide, P as PlaneGeometry, b as BufferAttribute, a as Color, d as useFrame, u as useThree, T as TextureLoader, R as RepeatWrapping } from './react-three-fiber.esm-PzQKdL82.js';
import { c as findCityModelById } from './cityCatalog-DOxnPYXe.js';
import { C as CityModelMesh, r as resolveAssetUri, a as useProgress } from './CityModelMesh-4r60Iq1p.js';
import { a5 as createQuery, a6 as $internal, a7 as HarvestOp, f as getActiveWorldSession, U as Unit, W as WorldPosition, I as Identity, a8 as Scene, a9 as FloorCell, D as DEFAULT_CITY_GENERATION_STATUS, aa as generateChunk } from './contracts-Exa9P0hv.js';
import { v as isStructureConsumed } from './gameState-CXdyHaTz.js';
import { g as gridToWorld, w as worldToGrid, S as SECTOR_LATTICE_SIZE } from './sectorCoordinates-Bm5lA-nC.js';
import { F as FLOOR_MATERIAL_PRESETS, g as getDefaultFloorMaterialForZone } from './floorMaterialPresets-LMzl77Ms.js';
import { S as SECTOR_SCALE_SPECS } from './config-DqmIuxQs.js';

"use strict";
var WorldContext = reactExports.createContext(null);

// ../react/src/world/use-world.ts
function useWorld() {
  const world = reactExports.useContext(WorldContext);
  if (!world) {
    throw new Error("Koota: useWorld must be used within a WorldProvider");
  }
  return world;
}

// ../react/src/hooks/use-actions.ts
function useActions(actions) {
  const world = useWorld();
  return actions(world);
}
function useQuery(...parameters) {
  const world = useWorld();
  const [, forceUpdate] = reactExports.useReducer((x) => x + 1, 0);
  const queryRef = reactExports.useMemo(() => createQuery(...parameters), parameters);
  const cacheRef = reactExports.useRef(null);
  const getResult = () => {
    const query = world[$internal].queriesHashMap.get(queryRef.hash);
    if (query && cacheRef.current?.hash === queryRef.hash && cacheRef.current.version === query.version) {
      return cacheRef.current.result;
    }
    const result2 = world.query(queryRef).sort();
    const registeredQuery = world[$internal].queriesHashMap.get(queryRef.hash);
    cacheRef.current = {
      hash: queryRef.hash,
      version: registeredQuery.version,
      result: result2
    };
    return result2;
  };
  const result = getResult();
  reactExports.useEffect(() => {
    const update = () => forceUpdate();
    let unsubAdd = () => {
    };
    let unsubRemove = () => {
    };
    const subscribe = () => {
      unsubAdd = world.onQueryAdd(queryRef, update);
      unsubRemove = world.onQueryRemove(queryRef, update);
      const query = world[$internal].queriesHashMap.get(queryRef.hash);
      if (cacheRef.current && query.version !== cacheRef.current.version) {
        update();
      }
    };
    const handleReset = () => {
      cacheRef.current = null;
      unsubAdd();
      unsubRemove();
      subscribe();
      update();
    };
    subscribe();
    world[$internal].resetSubscriptions.add(handleReset);
    return () => {
      world[$internal].resetSubscriptions.delete(handleReset);
      unsubAdd();
      unsubRemove();
    };
  }, [world, queryRef]);
  return result;
}

// ../react/src/hooks/use-query-first.ts
function useQueryFirst(...parameters) {
  const query = useQuery(...parameters);
  return query[0];
}

// ../react/src/utils/is-world.ts
function isWorld(target) {
  return typeof target?.spawn === "function";
}

// ../react/src/hooks/use-tag.ts
function useTag(target, tag) {
  const contextWorld = useWorld();
  const [, forceUpdate] = reactExports.useReducer((x) => x + 1, 0);
  const memo = reactExports.useMemo(() => target ? createSubscriptions(target, tag, contextWorld) : void 0, [target, tag, contextWorld]);
  const valueRef = reactExports.useRef(false);
  const memoRef = reactExports.useRef(memo);
  if (memoRef.current !== memo) {
    memoRef.current = memo;
    valueRef.current = memo?.entity.has(tag) ?? false;
  }
  reactExports.useEffect(() => {
    if (!memo) {
      valueRef.current = false;
      forceUpdate();
      return;
    }
    const unsubscribe = memo.subscribe((value) => {
      valueRef.current = value;
      forceUpdate();
    });
    return () => unsubscribe();
  }, [memo]);
  return valueRef.current;
}
function createSubscriptions(target, tag, contextWorld) {
  const world = isWorld(target) ? target : contextWorld;
  const entity = isWorld(target) ? target[$internal].worldEntity : target;
  return {
    entity,
    subscribe: (setValue) => {
      const onAddUnsub = world.onAdd(tag, (e) => {
        if (e === entity) setValue(true);
      });
      const onRemoveUnsub = world.onRemove(tag, (e) => {
        if (e === entity) setValue(false);
      });
      setValue(entity.has(tag));
      return () => {
        onAddUnsub();
        onRemoveUnsub();
      };
    }
  };
}
function useHas(target, trait) {
  const contextWorld = useWorld();
  const [, forceUpdate] = reactExports.useReducer((x) => x + 1, 0);
  const memo = reactExports.useMemo(() => target ? createSubscriptions2(target, trait, contextWorld) : void 0, [target, trait, contextWorld]);
  const valueRef = reactExports.useRef(false);
  const memoRef = reactExports.useRef(memo);
  if (memoRef.current !== memo) {
    memoRef.current = memo;
    valueRef.current = memo?.entity.has(trait) ?? false;
  }
  reactExports.useEffect(() => {
    if (!memo) {
      valueRef.current = false;
      forceUpdate();
      return;
    }
    const unsubscribe = memo.subscribe((value) => {
      valueRef.current = value;
      forceUpdate();
    });
    return () => unsubscribe();
  }, [memo]);
  return valueRef.current;
}
function createSubscriptions2(target, trait, contextWorld) {
  const world = isWorld(target) ? target : contextWorld;
  const entity = isWorld(target) ? target[$internal].worldEntity : target;
  return {
    entity,
    subscribe: (setValue) => {
      const onAddUnsub = world.onAdd(trait, (e) => {
        if (e === entity) setValue(true);
      });
      const onRemoveUnsub = world.onRemove(trait, (e) => {
        if (e === entity) setValue(false);
      });
      setValue(entity.has(trait));
      return () => {
        onAddUnsub();
        onRemoveUnsub();
      };
    }
  };
}
function useTarget(target, relation) {
  const contextWorld = useWorld();
  const [, forceUpdate] = reactExports.useReducer((x) => x + 1, 0);
  const memo = reactExports.useMemo(() => target ? createSubscriptions3(target, relation, contextWorld) : void 0, [target, relation, contextWorld]);
  const valueRef = reactExports.useRef(void 0);
  const memoRef = reactExports.useRef(memo);
  if (memoRef.current !== memo) {
    memoRef.current = memo;
    valueRef.current = memo?.entity.targetFor(relation);
  }
  reactExports.useEffect(() => {
    if (!memo) {
      valueRef.current = void 0;
      forceUpdate();
      return;
    }
    const unsubscribe = memo.subscribe((value) => {
      valueRef.current = value;
      forceUpdate();
    });
    return () => unsubscribe();
  }, [memo]);
  return valueRef.current;
}
function createSubscriptions3(target, relation, contextWorld) {
  const world = isWorld(target) ? target : contextWorld;
  const entity = isWorld(target) ? target[$internal].worldEntity : target;
  return {
    entity,
    subscribe: (setValue) => {
      const onAddUnsub = world.onAdd(relation, (e) => {
        if (e === entity) setValue(entity.targetFor(relation));
      });
      const onRemoveUnsub = world.onRemove(relation, (e) => {
        if (e === entity) setValue(entity.targetFor(relation));
      });
      const onChangeUnsub = world.onChange(relation, (e) => {
        if (e === entity) setValue(entity.targetFor(relation));
      });
      setValue(entity.targetFor(relation));
      return () => {
        onAddUnsub();
        onRemoveUnsub();
        onChangeUnsub();
      };
    }
  };
}
function useTargets(target, relation) {
  const contextWorld = useWorld();
  const [, forceUpdate] = reactExports.useReducer((x) => x + 1, 0);
  const memo = reactExports.useMemo(() => target ? createSubscriptions4(target, relation, contextWorld) : void 0, [target, relation, contextWorld]);
  const valueRef = reactExports.useRef([]);
  const memoRef = reactExports.useRef(memo);
  if (memoRef.current !== memo) {
    memoRef.current = memo;
    valueRef.current = memo?.entity.targetsFor(relation) ?? [];
  }
  reactExports.useEffect(() => {
    if (!memo) {
      valueRef.current = [];
      forceUpdate();
      return;
    }
    const unsubscribe = memo.subscribe((value) => {
      valueRef.current = value;
      forceUpdate();
    });
    return () => unsubscribe();
  }, [memo]);
  return valueRef.current;
}
function createSubscriptions4(target, relation, contextWorld) {
  const world = isWorld(target) ? target : contextWorld;
  const entity = isWorld(target) ? target[$internal].worldEntity : target;
  return {
    entity,
    subscribe: (setValue) => {
      let currentValue = [];
      const update = (value) => {
        currentValue = value;
        setValue(value);
      };
      const onAddUnsub = world.onAdd(relation, (e) => {
        if (e === entity) update(entity.targetsFor(relation));
      });
      const onRemoveUnsub = world.onRemove(relation, (e, t) => {
        if (e === entity) update(currentValue.filter((p) => p !== t));
      });
      const onChangeUnsub = world.onChange(relation, (e) => {
        if (e === entity) update(entity.targetsFor(relation));
      });
      update(entity.targetsFor(relation));
      return () => {
        onAddUnsub();
        onRemoveUnsub();
        onChangeUnsub();
      };
    }
  };
}
function useTrait(target, trait) {
  const contextWorld = useWorld();
  const [, forceUpdate] = reactExports.useReducer((x) => x + 1, 0);
  const valueRef = reactExports.useRef(void 0);
  const memoRef = reactExports.useRef(void 0);
  const memo = reactExports.useMemo(() => target ? createSubscriptions5(target, trait, contextWorld) : void 0, [target, trait, contextWorld]);
  if (memoRef.current !== memo) {
    memoRef.current = memo;
    valueRef.current = memo?.entity.has(trait) ? memo.entity.get(trait) : void 0;
  }
  reactExports.useEffect(() => {
    if (!memo) return;
    const unsub = memo.subscribe((value) => {
      valueRef.current = value;
      forceUpdate();
    });
    return () => unsub();
  }, [memo]);
  return valueRef.current;
}
function createSubscriptions5(target, trait, contextWorld) {
  const world = isWorld(target) ? target : contextWorld;
  const entity = isWorld(target) ? target[$internal].worldEntity : target;
  return {
    entity,
    subscribe: (setValue) => {
      const onChangeUnsub = world.onChange(trait, (e) => {
        if (e === entity) setValue(e.get(trait));
      });
      const onAddUnsub = world.onAdd(trait, (e) => {
        if (e === entity) setValue(e.get(trait));
      });
      const onRemoveUnsub = world.onRemove(trait, (e) => {
        if (e === entity) setValue(void 0);
      });
      setValue(entity.has(trait) ? entity.get(trait) : void 0);
      return () => {
        onChangeUnsub();
        onAddUnsub();
        onRemoveUnsub();
      };
    }
  };
}
function useTraitEffect(target, trait, callback) {
  const contextWorld = useWorld();
  const world = reactExports.useMemo(() => isWorld(target) ? target : contextWorld, [target, contextWorld]);
  const entity = reactExports.useMemo(() => isWorld(target) ? target[$internal].worldEntity : target, [target]);
  const callbackRef = reactExports.useRef(callback);
  callbackRef.current = callback;
  reactExports.useEffect(() => {
    const onChangeUnsub = world.onChange(trait, (e) => {
      if (e === entity) callbackRef.current(e.get(trait));
    });
    const onAddUnsub = world.onAdd(trait, (e) => {
      if (e === entity) callbackRef.current(e.get(trait));
    });
    const onRemoveUnsub = world.onRemove(trait, (e) => {
      if (e === entity) callbackRef.current(void 0);
    });
    callbackRef.current(entity.has(trait) ? entity.get(trait) : void 0);
    return () => {
      onChangeUnsub();
      onAddUnsub();
      onRemoveUnsub();
    };
  }, [trait, world, entity]);
}
function WorldProvider({
  children,
  world
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorldContext.Provider, { value: world, children });
}

function hash(seed, step) {
  const value = Math.sin(seed * 12.9898 + step * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
function getPoiForCity(session, city) {
  return session.pointsOfInterest.find((poi) => poi.id === city.poi_id) ?? null;
}
function getCityRole(poiType) {
  switch (poiType) {
    case "home_base":
      return "core";
    case "coast_mines":
      return "industrial";
    case "science_campus":
      return "research";
    case "northern_cult_site":
      return "fortress";
    case "deep_sea_gateway":
      return "gateway";
    default:
      return "industrial";
  }
}
function getCityPalette(role) {
  switch (role) {
    case "core":
      return { color: 1780275, emissive: 7336904 };
    case "industrial":
      return { color: 2827293, emissive: 16299356 };
    case "research":
      return { color: 1517111, emissive: 9230591 };
    case "fortress":
      return { color: 2758692, emissive: 16739226 };
    case "gateway":
      return { color: 2107440, emissive: 8963071 };
  }
}
function getStateMultiplier(city) {
  switch (city.state) {
    case "founded":
      return 1;
    case "surveyed":
      return 0.55;
    case "latent":
    default:
      return 0.35;
  }
}
function _getBaseBlockCount(poiType, city) {
  const multiplier = getStateMultiplier(city);
  const base = poiType === "home_base" ? 9 : poiType === "coast_mines" ? 7 : poiType === "science_campus" ? 8 : poiType === "northern_cult_site" ? 6 : 5;
  return Math.max(3, Math.round(base * multiplier));
}
function getBlockHeight(poiType, city, index, seed) {
  const stateMultiplier = getStateMultiplier(city);
  const verticalBias = poiType === "science_campus" ? 1.35 : poiType === "home_base" ? 1.1 : poiType === "northern_cult_site" ? 1.2 : 0.95;
  return (0.28 + hash(seed, index) * 0.75) * verticalBias * stateMultiplier;
}
function createCityBlocks(_session, city, poi) {
  const origin = gridToWorld(city.world_q, city.world_r);
  const blockCount = _getBaseBlockCount(poi.type, city);
  const role = getCityRole(poi.type);
  const palette = getCityPalette(role);
  const blocks = [];
  const seed = city.layout_seed;
  for (let index = 0; index < blockCount; index++) {
    const baseHeight = getBlockHeight(poi.type, city, index, seed);
    const ring = 0.18 + hash(seed, index + 11) * 0.62;
    const angle = hash(seed, index + 37) * Math.PI * 2;
    const width = 0.18 + hash(seed, index + 101) * 0.22;
    const depth = 0.18 + hash(seed, index + 151) * 0.22;
    const x = origin.x + Math.cos(angle) * ring;
    const z = origin.z + Math.sin(angle) * ring;
    blocks.push({
      id: `${city.id}:block:${index}`,
      districtId: city.id,
      role,
      position: { x, y: baseHeight / 2 + 0.08, z },
      size: { x: width, y: baseHeight, z: depth },
      emissive: palette.emissive,
      color: palette.color
    });
  }
  return blocks;
}
function createFortifications(city, units) {
  const stationed = units.filter((unit) => {
    if (unit.sceneLocation !== "world") {
      return false;
    }
    const hex = worldToGrid(unit.position.x, unit.position.z);
    return hex.q === city.world_q && hex.r === city.world_r;
  });
  return stationed.map((unit, index) => ({
    id: `${city.id}:fort:${unit.entityId}`,
    districtId: city.id,
    position: {
      x: unit.position.x,
      y: unit.position.y + 0.08 + index * 0.01,
      z: unit.position.z
    },
    radius: 0.68 + index * 0.08,
    height: 0.18,
    unitCount: stationed.length
  }));
}
function createSubstationBeacon(city, poi) {
  if (city.state !== "founded" && poi.type !== "home_base") {
    return null;
  }
  const origin = gridToWorld(city.world_q, city.world_r);
  const role = getCityRole(poi.type);
  const palette = getCityPalette(role);
  const ringCount = poi.type === "home_base" ? 3 : poi.type === "science_campus" ? 2 : 1;
  return {
    id: `${city.id}:substation`,
    districtId: city.id,
    position: {
      x: origin.x,
      y: 0.12,
      z: origin.z
    },
    radius: poi.type === "home_base" ? 1.2 : 0.92,
    height: poi.type === "home_base" ? 1.35 : 1,
    ringCount,
    color: palette.color,
    emissive: palette.emissive
  };
}
function buildOverworldCityOverlayState(args) {
  if (!args.session) {
    return { blocks: [], fortifications: [], substations: [] };
  }
  const blocks = [];
  const fortifications = [];
  const substations = [];
  for (const city of args.session.cityInstances) {
    const poi = getPoiForCity(args.session, city);
    if (!poi) {
      continue;
    }
    blocks.push(...createCityBlocks(args.session, city, poi));
    fortifications.push(...createFortifications(city, args.units));
    const substation = createSubstationBeacon(city, poi);
    if (substation) {
      substations.push(substation);
    }
  }
  return { blocks, fortifications, substations };
}

function edgeOffset(edge) {
  switch (edge) {
    case "north":
      return { x: 0, z: -1.02 };
    case "east":
      return { x: 1.02, z: 0 };
    case "south":
      return { x: 0, z: 1.02 };
    case "west":
      return { x: -1.02, z: 0 };
    default:
      return { x: 0, z: 0 };
  }
}
function SectorStructureInstances({
  profile,
  session: providedSession
}) {
  useQuery(HarvestOp);
  const session = providedSession ?? getActiveWorldSession();
  const discoveredCells = reactExports.useMemo(() => {
    if (!session) return /* @__PURE__ */ new Set();
    const set = /* @__PURE__ */ new Set();
    for (const cell of session.sectorCells) {
      if (cell.discovery_state >= 1) {
        set.add(`${cell.q},${cell.r}`);
      }
    }
    return set;
  }, [session?.sectorCells, session]);
  if (!session) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: session.sectorStructures.map((structure) => {
    if (!discoveredCells.has(`${structure.q},${structure.r}`)) {
      return null;
    }
    if (isStructureConsumed(structure.id)) {
      return null;
    }
    const model = findCityModelById(structure.model_id);
    if (!model) {
      return null;
    }
    const worldPosition = gridToWorld(structure.q, structure.r);
    const edge = edgeOffset(structure.edge);
    const yBase = structure.placement_layer === "roof" ? 1.85 : structure.placement_layer === "detail" ? 0.4 : structure.placement_layer === "prop" ? 0.08 : 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "group",
      {
        position: [
          worldPosition.x + structure.offset_x + edge.x,
          yBase + structure.offset_y,
          worldPosition.z + structure.offset_z + edge.z
        ],
        rotation: [0, Math.PI / 2 * structure.rotation_quarter_turns, 0],
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(CityModelMesh, { model, targetSpan: structure.target_span })
      },
      `${structure.id}:${structure.model_id}`
    );
  }) });
}
function CityOverlayMarkers({
  profile,
  session: providedSession
}) {
  const unitEntities = useQuery(Unit, WorldPosition, Identity);
  const session = providedSession ?? getActiveWorldSession();
  if (profile === "ops") {
    return null;
  }
  const units = unitEntities.map((entity) => ({
    entityId: entity.get(Identity).id,
    sceneLocation: entity.get(Scene)?.location ?? "world",
    position: { ...entity.get(WorldPosition) },
    faction: entity.get(Identity).faction
  }));
  const overlay = buildOverworldCityOverlayState({ session, units });
  const ringOpacity = 0.26;
  const substationOpacity = 0.26;
  const beaconScale = profile === "overview" ? 1 : 0.9;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    overlay.fortifications.map((marker) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "group",
      {
        position: [marker.position.x, marker.position.y, marker.position.z],
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("ringGeometry", { args: [marker.radius, marker.radius + 0.07, 24] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "meshBasicMaterial",
              {
                color: 7336904,
                transparent: true,
                opacity: ringOpacity,
                side: DoubleSide
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, marker.height, 0], children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "cylinderGeometry",
              {
                args: [
                  marker.radius * 0.9,
                  marker.radius * 0.96,
                  0.08,
                  18,
                  1,
                  true
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "meshStandardMaterial",
              {
                color: 2110522,
                emissive: 7336904,
                emissiveIntensity: 0.18,
                roughness: 0.85,
                metalness: 0.12
              }
            )
          ] })
        ]
      },
      marker.id
    )),
    overlay.substations.map((marker) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "group",
      {
        position: [marker.position.x, marker.position.y, marker.position.z],
        scale: [beaconScale, beaconScale, beaconScale],
        children: [
          Array.from({ length: marker.ringCount }).map((_, index) => {
            const inner = marker.radius + index * 0.16;
            const outer = inner + 0.05;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "mesh",
              {
                rotation: [-Math.PI / 2, 0, 0],
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("ringGeometry", { args: [inner, outer, 28] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "meshBasicMaterial",
                    {
                      color: marker.emissive,
                      transparent: true,
                      opacity: substationOpacity - index * 0.04,
                      side: DoubleSide
                    }
                  )
                ]
              },
              `${marker.id}:ring:${index}`
            );
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, marker.height / 2, 0], children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.07, 0.12, marker.height, 14] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "meshStandardMaterial",
              {
                color: marker.color,
                emissive: marker.emissive,
                emissiveIntensity: 0.42,
                roughness: 0.52,
                metalness: 0.22
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, marker.height + 0.08, 0], children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("sphereGeometry", { args: [0.08, 14, 14] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "meshStandardMaterial",
              {
                color: marker.emissive,
                emissive: marker.emissive,
                emissiveIntensity: 0.65,
                roughness: 0.2,
                metalness: 0.1
              }
            )
          ] })
        ]
      },
      marker.id
    ))
  ] });
}
function CityRenderer({
  profile = "default",
  session
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectorStructureInstances, { profile, session }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CityOverlayMarkers, { profile, session })
  ] });
}

const $schema = "zone-blending configuration — controls visual transitions between floor biomes";
const blendWidthFraction = 0.15;
const blendWidthFractionRange = [0.1,0.2];
const innerStripRatio = 0.5;
const outerOpacity = 0.1;
const innerOpacity = 0.18;
const breachGlow = {"enabled":true,"color":"0xff4422","intensity":0.6,"pulseSpeed":1.8,"crackWidth":0.06,"crackOpacity":0.35};
const yOffsetOuter = 0.004;
const yOffsetInner = 0.005;
const yOffsetBreach = 0.007;
const blendConfig = {
  $schema,
  blendWidthFraction,
  blendWidthFractionRange,
  innerStripRatio,
  outerOpacity,
  innerOpacity,
  breachGlow,
  yOffsetOuter,
  yOffsetInner,
  yOffsetBreach,
};

function getBlendWidthFraction() {
  return blendConfig.blendWidthFraction;
}
function getBreachGlowConfig() {
  return blendConfig.breachGlow;
}
function computeBlendFactor(zoneA, zoneB) {
  if (zoneB === null) return 0;
  if (zoneA === zoneB) return 0;
  const eitherBreach = zoneA === "breach_exposed" || zoneB === "breach_exposed";
  if (eitherBreach) return 1;
  return 0.5;
}
function isBreachBoundary(zoneA, zoneB) {
  if (zoneB === null) return false;
  if (zoneA === zoneB) return false;
  return zoneA === "breach_exposed" || zoneB === "breach_exposed";
}
function computeBlendStripParams(direction, plateSize) {
  const blendFrac = blendConfig.blendWidthFraction;
  const innerRatio = blendConfig.innerStripRatio;
  const blendDepth = plateSize * blendFrac;
  const blendWidth = plateSize * 0.98;
  const innerDepth = blendDepth * innerRatio;
  const outer = computeStripGeometry(
    direction,
    plateSize,
    blendDepth,
    blendWidth
  );
  const inner = computeStripGeometry(
    direction,
    plateSize,
    innerDepth,
    blendWidth
  );
  return {
    outer,
    inner,
    outerOpacity: blendConfig.outerOpacity,
    innerOpacity: blendConfig.innerOpacity,
    yOuter: blendConfig.yOffsetOuter,
    yInner: blendConfig.yOffsetInner
  };
}
function computeBreachStripParams(direction, plateSize) {
  const cfg = blendConfig.breachGlow;
  const crackDepth = plateSize * cfg.crackWidth;
  const crackWidth = plateSize * 0.98;
  const crack = computeStripGeometry(
    direction,
    plateSize,
    crackDepth,
    crackWidth
  );
  return {
    crack,
    glowColor: Number.parseInt(cfg.color.replace("0x", ""), 16),
    glowIntensity: cfg.intensity,
    crackOpacity: cfg.crackOpacity,
    yOffset: blendConfig.yOffsetBreach,
    pulseSpeed: cfg.pulseSpeed
  };
}
function computeStripGeometry(direction, plateSize, depth, width) {
  let px = 0;
  let pz = 0;
  let sx = width;
  let sz = depth;
  if (direction === "px") {
    px = plateSize / 2 - depth / 2;
    sx = depth;
    sz = width;
  } else if (direction === "nx") {
    px = -(plateSize / 2 - depth / 2);
    sx = depth;
    sz = width;
  } else if (direction === "pz") {
    pz = plateSize / 2 - depth / 2;
  } else {
    pz = -(plateSize / 2 - depth / 2);
  }
  return { px, pz, sx, sz };
}
function computeBlendEdges(cell, cellByCoord, floorColors, defaultColor) {
  const neighbors = [
    ["px", cell.q + 1, cell.r],
    ["nx", cell.q - 1, cell.r],
    ["pz", cell.q, cell.r + 1],
    ["nz", cell.q, cell.r - 1]
  ];
  const edges = [];
  for (const [dir, nq, nr] of neighbors) {
    const neighbor = cellByCoord.get(`${nq},${nr}`);
    if (!neighbor) continue;
    if (neighbor.floor_preset_id === cell.floor_preset_id) continue;
    const nColor = floorColors[neighbor.floor_preset_id] ?? defaultColor;
    const breach = isBreachBoundary(
      cell.floor_preset_id,
      neighbor.floor_preset_id
    );
    edges.push({ direction: dir, neighborColor: nColor, isBreach: breach });
  }
  return edges;
}

const FLOOR_COLORS = {
  command_core: 6189957,
  corridor_transit: 7440283,
  fabrication: 8020810,
  storage: 7692623,
  power: 6448522,
  habitation: 5930895,
  breach_exposed: 5264479,
  // FloorMaterial values from world gen
  metal_panel: 6978441,
  concrete_slab: 6057594,
  industrial_grating: 6846592,
  rusty_plating: 8020040,
  corroded_steel: 6320224
};
const FLOOR_ACCENTS = {
  command_core: 7336904,
  corridor_transit: 9168639,
  fabrication: 16172394,
  storage: 12950889,
  power: 8955903,
  habitation: 8312549,
  breach_exposed: 16748431,
  // FloorMaterial values from world gen
  metal_panel: 9168639,
  concrete_slab: 7336904,
  industrial_grating: 9168639,
  rusty_plating: 12950889,
  corroded_steel: 10471584
};
const floorPresetById = new Map(
  FLOOR_MATERIAL_PRESETS.map((preset) => [preset.id, preset])
);
const FLOOR_PRESET_TO_MATERIAL = {
  command_core: "command_concrete",
  corridor_transit: "service_walkway",
  fabrication: "fabrication_plate",
  storage: "fabrication_plate",
  habitation: "painted_habitation",
  power: "command_concrete",
  breach_exposed: "service_walkway",
  // FloorMaterial values from world gen (material-semantic names)
  metal_panel: "fabrication_plate",
  concrete_slab: "command_concrete",
  industrial_grating: "service_walkway",
  rusty_plating: "fabrication_plate",
  corroded_steel: "service_walkway"
};
function resolveTexturePresetId(floorPresetId) {
  const resolved = FLOOR_PRESET_TO_MATERIAL[floorPresetId];
  if (!resolved) {
    throw new Error(
      `FATAL: No texture mapping for floor preset "${floorPresetId}". Add it to FLOOR_PRESET_TO_MATERIAL.`
    );
  }
  return resolved;
}
const blendStripVertexShader = `
	varying float vBlendCoord;
	attribute float blendCoord;

	void main() {
		vBlendCoord = blendCoord;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;
const blendStripFragmentShader = `
	uniform vec3 uColor;
	uniform float uOpacity;

	varying float vBlendCoord;

	void main() {
		// smoothstep falloff: full opacity at vBlendCoord=0 (edge),
		// fading to 0 at vBlendCoord=1 (inner boundary)
		float alpha = uOpacity * smoothstep(1.0, 0.0, vBlendCoord);
		gl_FragColor = vec4(uColor, alpha);
	}
`;
const breachGlowVertexShader = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;
const breachGlowFragmentShader = `
	uniform vec3 uGlowColor;
	uniform float uIntensity;
	uniform float uTime;
	uniform float uPulseSpeed;
	uniform float uCrackOpacity;

	varying vec2 vUv;

	void main() {
		// Crack line: bright center, sharp falloff on edges
		float crackDist = abs(vUv.y - 0.5) * 2.0;
		float crackLine = 1.0 - smoothstep(0.0, 0.4, crackDist);

		// Glow halo: wider, softer falloff
		float glowHalo = 1.0 - smoothstep(0.0, 1.0, crackDist);
		glowHalo *= 0.4;

		// Pulse animation
		float pulse = 0.7 + 0.3 * sin(uTime * uPulseSpeed);

		// Procedural crack variation along the length
		float variation = 0.8 + 0.2 * sin(vUv.x * 31.4 + uTime * 0.5);

		float alpha = (crackLine * uCrackOpacity + glowHalo * uIntensity) * pulse * variation;
		vec3 color = uGlowColor * (1.0 + crackLine * 0.5);

		gl_FragColor = vec4(color, alpha);
	}
`;
function makeBlendPlaneGeometry(sx, sz, direction) {
  const geo = new PlaneGeometry(sx, sz);
  const posAttr = geo.getAttribute("position");
  const count = posAttr.count;
  const coords = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    let t;
    if (direction === "px") {
      t = 1 - (x / sx + 0.5);
    } else if (direction === "nx") {
      t = x / sx + 0.5;
    } else if (direction === "pz") {
      t = 1 - (y / sz + 0.5);
    } else {
      t = y / sz + 0.5;
    }
    coords[i] = Math.max(0, Math.min(1, t));
  }
  geo.setAttribute("blendCoord", new BufferAttribute(coords, 1));
  return geo;
}
function BlendEdgeStrip({
  direction,
  neighborColor,
  plateSize
}) {
  const params = computeBlendStripParams(direction, plateSize);
  const { outer } = params;
  const geometry = reactExports.useMemo(
    () => makeBlendPlaneGeometry(outer.sx, outer.sz, direction),
    [outer.sx, outer.sz, direction]
  );
  const uniforms = reactExports.useMemo(
    () => ({
      uColor: { value: new Color(neighborColor) },
      uOpacity: { value: params.innerOpacity }
    }),
    [neighborColor, params.innerOpacity]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "mesh",
    {
      rotation: [-Math.PI / 2, 0, 0],
      position: [outer.px, params.yOuter, outer.pz],
      geometry,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "shaderMaterial",
        {
          uniforms,
          vertexShader: blendStripVertexShader,
          fragmentShader: blendStripFragmentShader,
          transparent: true,
          side: DoubleSide,
          depthWrite: false
        }
      )
    }
  );
}
function BreachEdgeStrip({
  direction,
  plateSize
}) {
  const params = computeBreachStripParams(direction, plateSize);
  const materialRef = reactExports.useRef(null);
  const uniforms = reactExports.useMemo(
    () => ({
      uGlowColor: { value: new Color(params.glowColor) },
      uIntensity: { value: params.glowIntensity },
      uTime: { value: 0 },
      uPulseSpeed: { value: params.pulseSpeed },
      uCrackOpacity: { value: params.crackOpacity }
    }),
    [
      params.glowColor,
      params.glowIntensity,
      params.pulseSpeed,
      params.crackOpacity
    ]
  );
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "mesh",
    {
      rotation: [-Math.PI / 2, 0, 0],
      position: [params.crack.px, params.yOffset, params.crack.pz],
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("planeGeometry", { args: [params.crack.sx, params.crack.sz] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "shaderMaterial",
          {
            ref: materialRef,
            uniforms,
            vertexShader: breachGlowVertexShader,
            fragmentShader: breachGlowFragmentShader,
            transparent: true,
            side: DoubleSide,
            depthWrite: false
          }
        )
      ]
    }
  );
}
function StructuralCellMesh({
  q,
  r,
  floorPresetId,
  structuralZone,
  passable,
  profile,
  textures,
  blendEdges
}) {
  const pos = gridToWorld(q, r);
  const _preset = floorPresetById.get(floorPresetId) ?? getDefaultFloorMaterialForZone(
    structuralZone === "command" ? "core" : structuralZone === "transit" ? "corridor" : structuralZone === "storage" ? "storage" : structuralZone === "habitation" ? "habitation" : structuralZone === "fabrication" ? "fabrication" : "power"
  );
  const color = FLOOR_COLORS[floorPresetId] ?? (passable ? FLOOR_COLORS.command_core : FLOOR_COLORS.breach_exposed);
  const accent = FLOOR_ACCENTS[floorPresetId] ?? 9168639;
  const emissive = floorPresetId === "power" ? 5400742 : floorPresetId === "corridor_transit" ? 2572621 : floorPresetId === "command_core" ? 1587258 : 1118481;
  const plateWidth = SECTOR_LATTICE_SIZE;
  const plateDepth = SECTOR_LATTICE_SIZE;
  const accentLength = plateWidth * 0.56;
  const accentWidth = profile === "ops" ? 0.04 : 0.05;
  const overlayOpacity = profile === "overview" ? 0.12 : profile === "ops" ? 0.1 : 0.09;
  const shellOpacity = profile === "overview" ? 0.06 : profile === "ops" ? 0.04 : 0.05;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { position: [pos.x, 0, pos.z], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.05, 0], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("planeGeometry", { args: [plateWidth * 1.02, plateDepth * 1.02] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshBasicMaterial",
        {
          color: 331029,
          transparent: true,
          opacity: shellOpacity,
          side: DoubleSide
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, -5e-3, 0], receiveShadow: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [plateWidth, 0.02, plateDepth] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshStandardMaterial",
        {
          color,
          map: textures?.map ?? null,
          normalMap: textures?.normalMap ?? null,
          roughnessMap: textures?.roughnessMap ?? null,
          aoMap: textures?.aoMap ?? null,
          displacementMap: textures?.displacementMap ?? null,
          displacementScale: textures ? 0.01 : 0,
          emissive,
          emissiveIntensity: profile === "ops" ? 0.24 : 0.2,
          roughness: 0.72,
          metalness: 0.08
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 8e-3, 0], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("planeGeometry", { args: [accentLength, accentWidth] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshBasicMaterial",
        {
          color: accent,
          transparent: true,
          opacity: passable ? overlayOpacity : overlayOpacity * 0.3,
          side: DoubleSide,
          depthWrite: false
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 6e-3, 0], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("planeGeometry", { args: [accentWidth, plateDepth * 0.52] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshBasicMaterial",
        {
          color: accent,
          transparent: true,
          opacity: passable ? overlayOpacity * 0.48 : overlayOpacity * 0.24,
          side: DoubleSide,
          depthWrite: false
        }
      )
    ] }),
    blendEdges.map(
      (edge) => edge.isBreach ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        BreachEdgeStrip,
        {
          direction: edge.direction,
          plateSize: plateWidth
        },
        `breach_${edge.direction}`
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        BlendEdgeStrip,
        {
          direction: edge.direction,
          neighborColor: edge.neighborColor,
          plateSize: plateWidth
        },
        edge.direction
      )
    )
  ] });
}
const VOID_FLOOR_HALF_EXTENT = 200;
const VOID_FOG_COLOR = new Color(197896);
const VOID_GRID_COLOR = new Color(658964);
const voidFloorVertexShader = `
	varying vec2 vWorldXZ;
	void main() {
		vec4 worldPos = modelMatrix * vec4(position, 1.0);
		vWorldXZ = worldPos.xz;
		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}
`;
const voidFloorFragmentShader = `
	uniform vec3 uFogColor;
	uniform vec3 uGridColor;

	varying vec2 vWorldXZ;

	void main() {
		// Subtle grid lines at integer coordinates for visual grounding
		vec2 grid = abs(fract(vWorldXZ * 0.25) - 0.5);
		float gridLine = 1.0 - smoothstep(0.0, 0.04, min(grid.x, grid.y));
		gridLine *= 0.08;

		vec3 color = uFogColor + uGridColor * gridLine;
		gl_FragColor = vec4(color, 1.0);
	}
`;
function VoidFillFloor() {
  const meshRef = reactExports.useRef(null);
  const { camera } = useThree();
  const uniforms = reactExports.useMemo(
    () => ({
      uFogColor: { value: VOID_FOG_COLOR },
      uGridColor: { value: VOID_GRID_COLOR }
    }),
    []
  );
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.x = camera.position.x;
    meshRef.current.position.z = camera.position.z;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "mesh",
    {
      ref: meshRef,
      rotation: [-Math.PI / 2, 0, 0],
      position: [0, -0.06, 0],
      frustumCulled: false,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "planeGeometry",
          {
            args: [VOID_FLOOR_HALF_EXTENT * 2, VOID_FLOOR_HALF_EXTENT * 2]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "shaderMaterial",
          {
            uniforms,
            vertexShader: voidFloorVertexShader,
            fragmentShader: voidFloorFragmentShader,
            side: DoubleSide,
            depthWrite: false
          }
        )
      ]
    }
  );
}
function StructuralFloorRenderer({
  profile = "default",
  session: providedSession
}) {
  const session = providedSession ?? getActiveWorldSession();
  const floorCellEntities = useQuery(FloorCell);
  const presetTextureSources = reactExports.useMemo(
    () => Object.fromEntries(
      FLOOR_MATERIAL_PRESETS.flatMap((preset) => [
        [`${preset.id}_map`, resolveAssetUri(preset.textureSet.color)],
        [`${preset.id}_normal`, resolveAssetUri(preset.textureSet.normal)],
        [
          `${preset.id}_roughness`,
          resolveAssetUri(preset.textureSet.roughness)
        ],
        [
          `${preset.id}_ao`,
          resolveAssetUri(preset.textureSet.ao ?? preset.textureSet.color)
        ],
        [
          `${preset.id}_height`,
          resolveAssetUri(
            preset.textureSet.height ?? preset.textureSet.color
          )
        ]
      ])
    ),
    []
  );
  const [texturesByPreset, setTexturesByPreset] = reactExports.useState(/* @__PURE__ */ new Map());
  const liveDiscovery = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const e of floorCellEntities) {
      const c = e.get(FloorCell);
      if (c) m.set(`${c.q},${c.r}`, c.discoveryState);
    }
    return m;
  }, [floorCellEntities]);
  const orderedCells = reactExports.useMemo(
    () => [...session?.sectorCells ?? []].filter((cell) => {
      const live = liveDiscovery.get(`${cell.q},${cell.r}`);
      return (live ?? cell.discovery_state) >= 1;
    }).sort((a, b) => a.r === b.r ? a.q - b.q : a.r - b.r),
    [session, liveDiscovery]
  );
  const cellByCoord = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const cell of orderedCells) {
      map.set(`${cell.q},${cell.r}`, cell);
    }
    return map;
  }, [orderedCells]);
  reactExports.useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    async function loadTextures() {
      const next = /* @__PURE__ */ new Map();
      await Promise.all(
        FLOOR_MATERIAL_PRESETS.map(async (preset) => {
          const repeatX = preset.textureRepeat[0] ?? 1;
          const repeatY = preset.textureRepeat[1] ?? 1;
          const mapUri = presetTextureSources[`${preset.id}_map`];
          if (!mapUri) {
            throw new Error(
              `FATAL: Floor texture for preset "${preset.id}" resolved to empty URI. Asset pipeline is broken — check resolveAssetUri() and metro.config.js assetExts.`
            );
          }
          const [map, normalMap, roughnessMap, aoMap, displacementMap] = await Promise.all([
            loader.loadAsync(mapUri),
            loader.loadAsync(presetTextureSources[`${preset.id}_normal`]),
            loader.loadAsync(presetTextureSources[`${preset.id}_roughness`]),
            loader.loadAsync(presetTextureSources[`${preset.id}_ao`]),
            loader.loadAsync(presetTextureSources[`${preset.id}_height`])
          ]);
          const bundle = {
            map,
            normalMap,
            roughnessMap,
            aoMap,
            displacementMap
          };
          for (const texture of Object.values(bundle)) {
            texture.wrapS = RepeatWrapping;
            texture.wrapT = RepeatWrapping;
            texture.repeat.set(repeatX, repeatY);
            texture.anisotropy = 8;
            texture.needsUpdate = true;
          }
          next.set(preset.id, bundle);
        })
      );
      if (!cancelled) {
        setTexturesByPreset(next);
      }
    }
    loadTextures().catch((err) => {
      console.error(
        "[StructuralFloorRenderer] Floor texture loading FAILED:",
        err
      );
      throw err;
    });
    return () => {
      cancelled = true;
    };
  }, [presetTextureSources]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(VoidFillFloor, {}),
    orderedCells.map((cell) => {
      const edges = computeBlendEdges(
        cell,
        cellByCoord,
        FLOOR_COLORS,
        FLOOR_COLORS.command_core
      );
      const resolvedPresetId = resolveTexturePresetId(cell.floor_preset_id);
      const cellTextures = texturesByPreset.size > 0 ? texturesByPreset.get(resolvedPresetId) ?? null : null;
      if (texturesByPreset.size > 0 && !cellTextures) {
        throw new Error(
          `FATAL: No texture bundle for floor preset "${cell.floor_preset_id}" (resolved: "${resolvedPresetId}"). Available: [${Array.from(texturesByPreset.keys()).join(", ")}]`
        );
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        StructuralCellMesh,
        {
          q: cell.q,
          r: cell.r,
          floorPresetId: cell.floor_preset_id,
          structuralZone: cell.structural_zone,
          passable: cell.passable,
          profile,
          textures: cellTextures,
          blendEdges: edges
        },
        `${cell.q},${cell.r}`
      );
    })
  ] });
}

function AssetLoadBeacon({ onLoaded }) {
  const { active, loaded, total } = useProgress();
  reactExports.useEffect(() => {
    if (!active && (total === 0 || loaded >= total)) {
      onLoaded();
    }
  }, [active, loaded, onLoaded, total]);
  return null;
}

let breachZones = [];
function tileKey(q, r) {
  return `${q},${r}`;
}
const NEIGHBOR_OFFSETS = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1]
];
function generateBreachZones(worldData) {
  const { sectorCells, pointsOfInterest } = worldData;
  const cellMap = /* @__PURE__ */ new Map();
  for (const cell of sectorCells) {
    cellMap.set(tileKey(cell.q, cell.r), cell);
  }
  const edgeCells = [];
  for (const cell of sectorCells) {
    if (!cell.passable) continue;
    const homeBase = pointsOfInterest.find((p) => p.type === "home_base");
    if (homeBase) {
      const dq = cell.q - homeBase.q;
      const dr = cell.r - homeBase.r;
      if (Math.sqrt(dq * dq + dr * dr) < 4) continue;
    }
    let bordersImpassable = false;
    for (const [dq, dr] of NEIGHBOR_OFFSETS) {
      const neighbor = cellMap.get(tileKey(cell.q + dq, cell.r + dr));
      if (!neighbor || !neighbor.passable) {
        bordersImpassable = true;
        break;
      }
    }
    if (bordersImpassable) {
      edgeCells.push(cell);
    }
  }
  const targetFraction = 0.07;
  const targetCount = Math.max(
    3,
    Math.floor(edgeCells.length * targetFraction)
  );
  const sorted = [...edgeCells].sort((a, b) => {
    const ha = hashCoord(a.q, a.r);
    const hb = hashCoord(b.q, b.r);
    return ha - hb;
  });
  const stride = Math.max(1, Math.floor(sorted.length / targetCount));
  const seedCells = [];
  for (let i = 0; i < sorted.length && seedCells.length < targetCount; i += stride) {
    seedCells.push(sorted[i]);
  }
  const cultSite = pointsOfInterest.find(
    (p) => p.type === "northern_cult_site"
  );
  const used = /* @__PURE__ */ new Set();
  const zones = [];
  for (let i = 0; i < seedCells.length; i++) {
    const seed = seedCells[i];
    const key = tileKey(seed.q, seed.r);
    if (used.has(key)) continue;
    const cluster = [{ q: seed.q, r: seed.r }];
    used.add(key);
    const clusterSize = 2 + hashCoord(seed.q, seed.r) % 3;
    const frontier = [{ q: seed.q, r: seed.r }];
    while (cluster.length < clusterSize && frontier.length > 0) {
      const current = frontier.shift();
      for (const [dq, dr] of NEIGHBOR_OFFSETS) {
        const nq = current.q + dq;
        const nr = current.r + dr;
        const nk = tileKey(nq, nr);
        if (used.has(nk)) continue;
        const neighbor = cellMap.get(nk);
        if (!neighbor || !neighbor.passable) continue;
        cluster.push({ q: nq, r: nr });
        used.add(nk);
        frontier.push({ q: nq, r: nr });
        if (cluster.length >= clusterSize) break;
      }
    }
    let isPrimary = false;
    if (cultSite) {
      const dq = seed.q - cultSite.q;
      const dr = seed.r - cultSite.r;
      isPrimary = Math.sqrt(dq * dq + dr * dr) < 6;
    }
    zones.push({
      id: `breach_${i}`,
      centerQ: seed.q,
      centerR: seed.r,
      cells: cluster,
      isPrimary
    });
  }
  return zones;
}
function hashCoord(q, r) {
  const qh = Math.imul(q ^ 73244475, 73244475);
  const rh = Math.imul(r ^ 295559667, 295559667);
  return ((qh ^ rh) >>> 0) % 1e4;
}
function loadBreachZones(zones) {
  breachZones = [...zones];
}
function getBreachZones() {
  return breachZones;
}
function getBreachZonesNear(q, r) {
  return [...breachZones].sort((a, b) => {
    const da = (a.centerQ - q) ** 2 + (a.centerR - r) ** 2;
    const db = (b.centerQ - q) ** 2 + (b.centerR - r) ** 2;
    return da - db;
  });
}
function getPrimaryBreachZones() {
  return breachZones.filter((z) => z.isPrimary);
}
function isBreachZoneCell(q, r) {
  for (const zone of breachZones) {
    for (const cell of zone.cells) {
      if (cell.q === q && cell.r === r) return true;
    }
  }
  return false;
}
function resetBreachZones() {
  breachZones = [];
}

function mulberry32$1(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967295;
  };
}
function seedCityInstances(pois, worldSeed) {
  const rng = mulberry32$1(worldSeed * 6271 + 17);
  return pois.map((poi) => ({
    poiType: poi.type,
    name: poi.name,
    worldQ: poi.q,
    worldR: poi.r,
    layoutSeed: Math.floor(rng() * 4294967295) ^ worldSeed,
    generationStatus: DEFAULT_CITY_GENERATION_STATUS,
    state: poi.type === "home_base" ? "founded" : "latent"
  }));
}

const pointsOfInterest = [{"type":"home_base","name":"Command Nexus","relativeQ":0.5,"relativeR":0.5,"discoveredAtStart":true},{"type":"resource_depot","name":"Salvage Yard","relativeQ":0.2,"relativeR":0.3,"discoveredAtStart":false},{"type":"research_site","name":"Signal Lab","relativeQ":0.75,"relativeR":0.25,"discoveredAtStart":false},{"type":"faction_outpost","name":"Iron Creed Outpost","relativeQ":0.8,"relativeR":0.7,"discoveredAtStart":false},{"type":"ruin","name":"Collapsed Sector","relativeQ":0.3,"relativeR":0.8,"discoveredAtStart":false},{"type":"northern_cult_site","name":"Fracture Rift","relativeQ":0.15,"relativeR":0.15,"discoveredAtStart":false},{"type":"deep_sea_gateway","name":"Sunken Conduit","relativeQ":0.9,"relativeR":0.9,"discoveredAtStart":false}];
const discoveryRadius = 5;
const discoveryFringeRadius = 2;
const foundableTypes = ["home_base","resource_depot","research_site","science_campus"];
const poisConfig = {
  pointsOfInterest,
  discoveryRadius,
  discoveryFringeRadius,
  foundableTypes,
};

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967295;
  };
}
function placeInitialPOIs(cells, gridWidth, gridHeight, worldSeed) {
  const rng = mulberry32(worldSeed * 7919 + 31);
  const passable = cells.filter((c) => c.passable);
  if (passable.length === 0) return [];
  const placed = [];
  const occupiedKeys = /* @__PURE__ */ new Set();
  for (const def of poisConfig.pointsOfInterest) {
    const targetQ = Math.floor(def.relativeQ * gridWidth);
    const targetR = Math.floor(def.relativeR * gridHeight);
    let best = null;
    let bestDist = Infinity;
    for (const cell of passable) {
      const key = `${cell.q},${cell.r}`;
      if (occupiedKeys.has(key)) continue;
      const dist = Math.abs(cell.q - targetQ) + Math.abs(cell.r - targetR);
      if (dist < bestDist) {
        bestDist = dist;
        best = cell;
      }
    }
    if (!best) continue;
    const jitterQ = Math.floor(rng() * 3) - 1;
    const jitterR = Math.floor(rng() * 3) - 1;
    const finalQ = Math.max(0, Math.min(gridWidth - 1, best.q + jitterQ));
    const finalR = Math.max(0, Math.min(gridHeight - 1, best.r + jitterR));
    occupiedKeys.add(`${finalQ},${finalR}`);
    placed.push({
      type: def.type,
      name: def.name,
      q: finalQ,
      r: finalR,
      discovered: def.discoveredAtStart
    });
  }
  return placed;
}

function classifyZone(tile) {
  if (!tile.passable && tile.modelLayer === "structure") return "fabrication";
  if (tile.modelLayer === "resource") return "storage";
  if (tile.modelLayer === "prop") return "habitation";
  if (tile.isBridge || tile.isRamp) return "transit";
  return "corridor_transit";
}
function classifyArchetype(tile) {
  if (tile.modelLayer === "resource") return "resource_zone";
  if (tile.modelLayer === "structure" || tile.modelLayer === "support")
    return "industrial";
  return "service_plate";
}
function generateTerrain(worldSeed, gridWidth, gridHeight) {
  const chunksX = Math.ceil(gridWidth / CHUNK_SIZE);
  const chunksZ = Math.ceil(gridHeight / CHUNK_SIZE);
  const cells = [];
  const structures = [];
  let structId = 0;
  for (let cz = 0; cz < chunksZ; cz++) {
    for (let cx = 0; cx < chunksX; cx++) {
      const chunk = generateChunk(worldSeed, cx, cz, getDatabaseSync());
      for (const tile of chunk.tiles) {
        if (tile.x < 0 || tile.z < 0 || tile.x >= gridWidth || tile.z >= gridHeight)
          continue;
        cells.push({
          q: tile.x,
          r: tile.z,
          structuralZone: classifyZone(tile),
          floorPresetId: tile.floorMaterial,
          discoveryState: 0,
          passable: tile.passable,
          sectorArchetype: classifyArchetype(tile),
          stormExposure: "shielded",
          impassableClass: tile.passable ? "none" : "structural_void",
          anchorKey: `${tile.x},${tile.z}`
        });
        if (tile.modelId && tile.modelLayer) {
          structures.push({
            districtStructureId: `struct_${structId++}`,
            anchorKey: `${tile.x},${tile.z}`,
            q: tile.x,
            r: tile.z,
            modelId: tile.modelId,
            placementLayer: tile.modelLayer,
            edge: null,
            rotationQuarterTurns: tile.rotation,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            targetSpan: 1,
            sectorArchetype: classifyArchetype(tile),
            source: "seeded_district",
            controllerFaction: null
          });
        }
      }
    }
  }
  return { cells, structures };
}
function generateWorldData(config) {
  const scale = SECTOR_SCALE_SPECS[config.sectorScale];
  const { width, height } = scale;
  const terrain = generateTerrain(config.worldSeed, width, height);
  const pois = placeInitialPOIs(terrain.cells, width, height, config.worldSeed);
  const cities = seedCityInstances(pois, config.worldSeed);
  const spawnQ = Math.floor(width / 2);
  const spawnR = Math.floor(height / 2);
  for (const cell of terrain.cells) {
    const dist = Math.max(Math.abs(cell.q - spawnQ), Math.abs(cell.r - spawnR));
    if (dist <= 5) cell.discoveryState = 2;
    else if (dist <= 7) cell.discoveryState = 1;
  }
  const partialWorld = {
    sectorCells: terrain.cells,
    sectorStructures: terrain.structures,
    pointsOfInterest: pois,
    cityInstances: cities,
    breachZones: [],
    ecumenopolis: {
      width,
      height,
      spawnSectorId: `${spawnQ},${spawnR}`,
      spawnAnchorKey: `${spawnQ},${spawnR}`
    }
  };
  const breachZones = generateBreachZones(partialWorld);
  return {
    ecumenopolis: partialWorld.ecumenopolis,
    sectorCells: terrain.cells,
    sectorStructures: terrain.structures,
    pointsOfInterest: pois,
    cityInstances: cities,
    breachZones
  };
}

export { AssetLoadBeacon as A, CityRenderer as C, StructuralFloorRenderer as S, WorldProvider as W, generateWorldData as g };
//# sourceMappingURL=generation-D8PdR-ni.js.map
