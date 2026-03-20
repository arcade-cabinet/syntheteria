import { g as gridToWorld, S as SECTOR_LATTICE_SIZE, w as worldToGrid } from './sectorCoordinates-Bm5lA-nC.js';
import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { T as Text, r as resolveAssetUri, u as useGLTF } from './CityModelMesh-4r60Iq1p.js';
import { g as MeshStandardMaterial, a as Color, D as DoubleSide, d as useFrame, V as Vector3, h as Box3, i as Mesh } from './react-three-fiber.esm-PzQKdL82.js';
import { r as reactExports } from './index-COtgIsy1.js';
import { i as buildings, I as Identity, B as Building, W as WorldPosition, u as units, U as Unit, P as isPassableAtWorldPosition, Q as isInsideBuilding, R as lightningRods, m as getResources, n as spendResource, M as MapFragment, S as spawnLightningRod, T as spawnFabricationUnit, V as spawnBuilding, X as getBotArchetypeDefinition, Y as Experience, Z as BotLOD, _ as getSectorCell, $ as getBotDefinition, a0 as getStructuralFragment, a1 as Rotation, a2 as getEntityAnimationState, a3 as getSurfaceHeightAtWorldPosition } from './contracts-Exa9P0hv.js';
import { q as queueThought, G as hasAnyPoints } from './gameState-CXdyHaTz.js';

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
function getAnchorClusterFocus(session, q, r) {
  const anchorKey = `${q},${r}`;
  const structures = session.sectorStructures.filter(
    (structure) => structure.anchor_key === anchorKey
  );
  if (structures.length === 0) {
    const anchor = gridToWorld(q, r);
    return {
      target: [anchor.x, 0.55, anchor.z],
      position: [anchor.x + 4.8, 3.8, anchor.z + 5.6]
    };
  }
  const positions = structures.map((structure) => {
    const origin = gridToWorld(structure.q, structure.r);
    const edge = edgeOffset(structure.edge);
    return {
      x: origin.x + structure.offset_x + edge.x,
      y: (structure.placement_layer === "roof" ? 1.85 : structure.placement_layer === "detail" ? 0.4 : structure.placement_layer === "prop" ? 0.08 : 0) + structure.offset_y,
      z: origin.z + structure.offset_z + edge.z
    };
  });
  const center = positions.reduce(
    (acc, position) => ({
      x: acc.x + position.x,
      y: acc.y + position.y,
      z: acc.z + position.z
    }),
    { x: 0, y: 0, z: 0 }
  );
  center.x /= positions.length;
  center.y /= positions.length;
  center.z /= positions.length;
  let maxRadius = 0;
  for (const position of positions) {
    const dx = position.x - center.x;
    const dz = position.z - center.z;
    maxRadius = Math.max(maxRadius, Math.sqrt(dx * dx + dz * dz));
  }
  const radius = Math.max(1.75, maxRadius + 1.15);
  return {
    target: [center.x, 0.95, center.z],
    position: [
      center.x + radius * 0.78,
      Math.max(3.6, radius * 0.58),
      center.z + radius * 1.02
    ]
  };
}

const STAGE_VISUAL_CONFIG = {
  foundation: {
    progress: 0.25,
    opacity: 0.4,
    wireframe: true,
    emissiveIntensity: 0.1,
    tint: "#4a6670",
    label: "Foundation"
  },
  shell: {
    progress: 0.5,
    opacity: 0.6,
    wireframe: false,
    emissiveIntensity: 0.15,
    tint: "#5a7a8a",
    label: "Shell"
  },
  interior: {
    progress: 0.75,
    opacity: 0.85,
    wireframe: false,
    emissiveIntensity: 0.2,
    tint: "#7a9aaa",
    label: "Interior"
  },
  operational: {
    progress: 1,
    opacity: 1,
    wireframe: false,
    emissiveIntensity: 0,
    tint: "#ffffff",
    label: "Operational"
  }
};
const BUILDING_STAGE_TURNS = {
  lightning_rod: {
    foundation: 0,
    shell: 0,
    interior: 0,
    operational: 0
  },
  fabrication_unit: {
    foundation: 1,
    shell: 1,
    interior: 1,
    operational: 0
  },
  motor_pool: {
    foundation: 2,
    shell: 2,
    interior: 2,
    operational: 1
  },
  relay_tower: {
    foundation: 1,
    shell: 1,
    interior: 0,
    operational: 0
  },
  defense_turret: {
    foundation: 1,
    shell: 2,
    interior: 1,
    operational: 0
  },
  power_sink: {
    foundation: 1,
    shell: 1,
    interior: 1,
    operational: 0
  },
  storage_hub: {
    foundation: 1,
    shell: 1,
    interior: 0,
    operational: 0
  },
  habitat_module: {
    foundation: 2,
    shell: 2,
    interior: 1,
    operational: 1
  }
};
const STAGE_ORDER = [
  "foundation",
  "shell",
  "interior",
  "operational"
];
const constructionStates = /* @__PURE__ */ new Map();
function startBuildingConstruction(entityId, buildingType) {
  const stageTurns = BUILDING_STAGE_TURNS[buildingType];
  if (!stageTurns) return;
  const totalTurns = Object.values(stageTurns).reduce((a, b) => a + b, 0);
  if (totalTurns === 0) return;
  constructionStates.set(entityId, {
    entityId,
    buildingType,
    currentStage: "foundation",
    turnsRemaining: stageTurns.foundation,
    totalTurns
  });
}
function advanceConstructionTurn() {
  for (const state of constructionStates.values()) {
    if (state.turnsRemaining > 0) {
      state.turnsRemaining--;
      continue;
    }
    const currentIdx = STAGE_ORDER.indexOf(state.currentStage);
    if (currentIdx >= STAGE_ORDER.length - 1) {
      finalizeBuildingConstruction(state.entityId);
      constructionStates.delete(state.entityId);
      continue;
    }
    const nextStage = STAGE_ORDER[currentIdx + 1];
    const stageTurns = BUILDING_STAGE_TURNS[state.buildingType];
    if (!stageTurns) continue;
    state.currentStage = nextStage;
    state.turnsRemaining = stageTurns[nextStage];
  }
}
function finalizeBuildingConstruction(entityId) {
  for (const bldg of buildings) {
    if (bldg.get(Identity)?.id === entityId) {
      const buildingComp = bldg.get(Building);
      if (buildingComp) {
        bldg.set(Building, {
          ...buildingComp,
          powered: true,
          operational: true
        });
      }
      break;
    }
  }
}
function getBuildingConstructionState(entityId) {
  return constructionStates.get(entityId) ?? null;
}
function getAllConstructionStates() {
  return Array.from(constructionStates.values());
}
function isBuildingUnderConstruction(entityId) {
  return constructionStates.has(entityId);
}
function getConstructionVisualConfig(entityId) {
  const state = constructionStates.get(entityId);
  if (!state) return null;
  return STAGE_VISUAL_CONFIG[state.currentStage];
}
function getConstructionProgress(entityId) {
  const state = constructionStates.get(entityId);
  if (!state) return 1;
  const stageTurns = BUILDING_STAGE_TURNS[state.buildingType];
  if (!stageTurns) return 1;
  const currentIdx = STAGE_ORDER.indexOf(state.currentStage);
  let completedTurns = 0;
  for (let i = 0; i < currentIdx; i++) {
    completedTurns += stageTurns[STAGE_ORDER[i]];
  }
  const currentStageTotalTurns = stageTurns[state.currentStage];
  completedTurns += currentStageTotalTurns - state.turnsRemaining;
  return state.totalTurns > 0 ? completedTurns / state.totalTurns : 1;
}
function getConstructionOverlayData() {
  const overlays = [];
  for (const state of constructionStates.values()) {
    let position = null;
    for (const bldg of buildings) {
      if (bldg.get(Identity)?.id === state.entityId) {
        const pos = bldg.get(WorldPosition);
        if (pos) position = { x: pos.x, y: pos.y, z: pos.z };
        break;
      }
    }
    const visual = STAGE_VISUAL_CONFIG[state.currentStage];
    overlays.push({
      entityId: state.entityId,
      buildingType: state.buildingType,
      stage: state.currentStage,
      stageLabel: visual.label,
      progress: getConstructionProgress(state.entityId),
      turnsRemaining: state.turnsRemaining,
      position
    });
  }
  return overlays;
}
function resetConstructionVisualization() {
  constructionStates.clear();
}
function _reset$1() {
  constructionStates.clear();
}

const BUILDING_COSTS = {
  lightning_rod: [
    { type: "scrapMetal", amount: 8 },
    { type: "eWaste", amount: 4 }
  ],
  fabrication_unit: [
    { type: "scrapMetal", amount: 12 },
    { type: "eWaste", amount: 6 },
    { type: "intactComponents", amount: 2 }
  ],
  motor_pool: [
    { type: "ferrousScrap", amount: 15 },
    { type: "alloyStock", amount: 8 },
    { type: "siliconWafer", amount: 4 }
  ],
  relay_tower: [
    { type: "conductorWire", amount: 6 },
    { type: "alloyStock", amount: 4 }
  ],
  defense_turret: [
    { type: "ferrousScrap", amount: 10 },
    { type: "conductorWire", amount: 4 }
  ],
  power_sink: [
    { type: "ferrousScrap", amount: 8 },
    { type: "electrolyte", amount: 6 }
  ],
  storage_hub: [
    { type: "alloyStock", amount: 8 },
    { type: "polymerSalvage", amount: 4 }
  ],
  habitat_module: [
    { type: "ferrousScrap", amount: 12 },
    { type: "polymerSalvage", amount: 6 },
    { type: "alloyStock", amount: 4 }
  ]
};
const MIN_ROD_SPACING = 10;
const MIN_BUILDING_SPACING = 3;
const ADJACENCY_RADIUS = 8;
const ADJACENCY_RULES = {
  motor_pool: {
    fabrication_unit: {
      sourceType: "fabrication_unit",
      label: "Fabrication Support",
      factor: 0.2
    },
    power_sink: {
      sourceType: "power_sink",
      label: "Power Feed",
      factor: 0.15
    },
    storage_hub: {
      sourceType: "storage_hub",
      label: "Material Access",
      factor: 0.1
    }
  },
  fabrication_unit: {
    power_sink: {
      sourceType: "power_sink",
      label: "Power Feed",
      factor: 0.2
    },
    storage_hub: {
      sourceType: "storage_hub",
      label: "Material Access",
      factor: 0.15
    }
  },
  defense_turret: {
    relay_tower: {
      sourceType: "relay_tower",
      label: "Target Relay",
      factor: 0.2
    },
    power_sink: {
      sourceType: "power_sink",
      label: "Power Feed",
      factor: 0.15
    }
  },
  relay_tower: {
    power_sink: {
      sourceType: "power_sink",
      label: "Power Feed",
      factor: 0.15
    },
    relay_tower: {
      sourceType: "relay_tower",
      label: "Signal Chain",
      factor: 0.25
    }
  },
  power_sink: {
    lightning_rod: {
      sourceType: "lightning_rod",
      label: "Storm Capture",
      factor: 0.3
    }
  },
  storage_hub: {
    fabrication_unit: {
      sourceType: "fabrication_unit",
      label: "Production Link",
      factor: 0.15
    },
    motor_pool: {
      sourceType: "motor_pool",
      label: "Assembly Link",
      factor: 0.1
    }
  },
  habitat_module: {
    power_sink: {
      sourceType: "power_sink",
      label: "Power Feed",
      factor: 0.15
    },
    storage_hub: {
      sourceType: "storage_hub",
      label: "Supply Access",
      factor: 0.1
    }
  }
};
function computeAdjacencyBonuses(buildingType, x, z) {
  const rules = ADJACENCY_RULES[buildingType];
  if (!rules) return [];
  const bonuses = [];
  const seen = /* @__PURE__ */ new Set();
  for (const building of buildings) {
    const bComp = building.get(Building);
    const pos = building.get(WorldPosition);
    if (!bComp || !pos) continue;
    const rule = rules[bComp.type];
    if (!rule) continue;
    if (seen.has(bComp.type)) continue;
    const dx = pos.x - x;
    const dz = pos.z - z;
    if (Math.sqrt(dx * dx + dz * dz) <= ADJACENCY_RADIUS) {
      bonuses.push(rule);
      seen.add(bComp.type);
    }
  }
  return bonuses;
}
function computeAdjacencyMultiplier(buildingType, x, z) {
  const bonuses = computeAdjacencyBonuses(buildingType, x, z);
  return 1 + bonuses.reduce((sum, b) => sum + b.factor, 0);
}
const FABRICATOR_UNIT_TYPES = /* @__PURE__ */ new Set(["mecha_golem", "fabrication_unit"]);
function canUnitBuild(unitEntityId) {
  if (!unitEntityId) return false;
  for (const unit of units) {
    if (unit.get(Identity)?.id === unitEntityId) {
      const unitComp = unit.get(Unit);
      if (!unitComp) return false;
      return FABRICATOR_UNIT_TYPES.has(unitComp.type);
    }
  }
  return false;
}
let activePlacement = null;
let ghostPosition = null;
let ghostValid = false;
let builderEntityId = null;
function getActivePlacement() {
  return activePlacement;
}
function setActivePlacement(type, unitId) {
  activePlacement = type;
  ghostPosition = null;
  ghostValid = false;
  builderEntityId = unitId ?? null;
}
function getGhostPosition() {
  if (!ghostPosition || !activePlacement) return null;
  return { ...ghostPosition, valid: ghostValid };
}
function updateGhostPosition(x, z) {
  ghostPosition = { x, z };
  ghostValid = isValidPlacement(x, z, activePlacement);
}
function isValidPlacement(x, z, type) {
  if (!type) return false;
  if (!isPassableAtWorldPosition(x, z)) return false;
  if (isInsideBuilding(x, z)) return false;
  if (type === "lightning_rod") {
    for (const rod of lightningRods) {
      const rodPos = rod.get(WorldPosition);
      if (!rodPos) continue;
      const dx = rodPos.x - x;
      const dz = rodPos.z - z;
      if (Math.sqrt(dx * dx + dz * dz) < MIN_ROD_SPACING) return false;
    }
  }
  for (const building of buildings) {
    const pos = building.get(WorldPosition);
    if (!pos) continue;
    const dx = pos.x - x;
    const dz = pos.z - z;
    if (Math.sqrt(dx * dx + dz * dz) < MIN_BUILDING_SPACING) return false;
  }
  return true;
}
function confirmPlacement() {
  if (!activePlacement || !ghostPosition || !ghostValid) return false;
  const costs = BUILDING_COSTS[activePlacement];
  if (!costs) return false;
  const pool = getResources();
  for (const cost of costs) {
    if ((pool[cost.type] ?? 0) < cost.amount) return false;
  }
  for (const cost of costs) {
    if (!spendResource(cost.type, cost.amount)) return false;
  }
  let fragmentId = null;
  for (const unit of units) {
    if (unit.get(Identity)?.faction === "player") {
      fragmentId = unit.get(MapFragment).fragmentId;
      break;
    }
  }
  if (!fragmentId) return false;
  let placedEntity;
  if (activePlacement === "lightning_rod") {
    placedEntity = spawnLightningRod({
      x: ghostPosition.x,
      z: ghostPosition.z,
      fragmentId
    });
  } else if (activePlacement === "fabrication_unit") {
    placedEntity = spawnFabricationUnit({
      x: ghostPosition.x,
      z: ghostPosition.z,
      fragmentId,
      powered: false
    });
  } else {
    placedEntity = spawnBuilding({
      x: ghostPosition.x,
      z: ghostPosition.z,
      fragmentId,
      type: activePlacement,
      powered: false
    });
  }
  const placedId = placedEntity.get(Identity)?.id;
  if (placedId) {
    startBuildingConstruction(placedId, activePlacement);
  }
  queueThought("first_build");
  activePlacement = null;
  ghostPosition = null;
  ghostValid = false;
  builderEntityId = null;
  return true;
}
function cancelPlacement() {
  activePlacement = null;
  ghostPosition = null;
  ghostValid = false;
  builderEntityId = null;
}
function getBuilderEntityId() {
  return builderEntityId;
}
function _reset() {
  activePlacement = null;
  ghostPosition = null;
  ghostValid = false;
  builderEntityId = null;
}

const BASE_XP = 10;
const OFF_ROLE_MULTIPLIER = 0.5;
const MARK_XP_BASE = 100;
const MARK_XP_FACTOR = 2;
const ROLE_ACTIONS = {
  industry: ["harvest", "build", "repair"],
  utility: ["explore", "survey", "relay"],
  combat: ["combat", "hack", "breach"],
  logistics: ["haul", "relay"],
  expansion: ["found", "fortify", "build"],
  hostile: ["combat", "breach"]
};
function findUnitById$1(id) {
  for (const e of units) {
    if (e.get(Identity)?.id === id) return e;
  }
  return null;
}
function getMarkThreshold(mark) {
  if (mark <= 1) return 0;
  let total = 0;
  for (let m = 2; m <= mark; m++) {
    total += Math.floor(MARK_XP_BASE * Math.pow(MARK_XP_FACTOR, m - 2));
  }
  return total;
}
function getXPForNextMark(currentMark) {
  return getMarkThreshold(currentMark + 1) - getMarkThreshold(currentMark);
}
function isRoleAligned(archetypeId, action) {
  const archetype = getBotArchetypeDefinition(archetypeId);
  const alignedActions = ROLE_ACTIONS[archetype.roleFamily];
  return alignedActions?.includes(action) ?? false;
}
function calculateXPForAction(archetypeId, action, bonusMultiplier = 1) {
  const aligned = isRoleAligned(archetypeId, action);
  const multiplier = aligned ? 1 : OFF_ROLE_MULTIPLIER;
  return Math.floor(BASE_XP * multiplier * bonusMultiplier);
}
function buildUnitExperience(entity, archetypeId) {
  const trait = entity.get(Experience);
  const xpToNextMark = getXPForNextMark(trait.level);
  return {
    entityId: entity.get(Identity).id,
    archetypeId,
    currentXP: trait.xp,
    currentMark: trait.level,
    xpToNextMark,
    upgradeEligible: trait.xp >= xpToNextMark
  };
}
function awardXP(entityId, archetypeId, action, currentMark = 1, bonusMultiplier = 1) {
  const entity = findUnitById$1(entityId);
  const earned = calculateXPForAction(archetypeId, action, bonusMultiplier);
  if (!entity) {
    return { xpEarned: earned, upgradeEligible: false, newMark: currentMark };
  }
  const cur = entity.get(Experience);
  if (!cur) {
    return { xpEarned: earned, upgradeEligible: false, newMark: currentMark };
  }
  const newXp = cur.xp + earned;
  const newLevel = cur.level > 0 ? cur.level : Math.max(1, currentMark);
  entity.set(Experience, { ...cur, xp: newXp, level: newLevel });
  const xpToNextMark = getXPForNextMark(newLevel);
  const upgradeEligible = newXp >= xpToNextMark;
  return { xpEarned: earned, upgradeEligible, newMark: newLevel };
}
function applyMarkUpgrade(entityId) {
  const entity = findUnitById$1(entityId);
  if (!entity) return false;
  const cur = entity.get(Experience);
  if (!cur) return false;
  const xpToNextMark = getXPForNextMark(cur.level);
  if (cur.xp < xpToNextMark) return false;
  entity.set(Experience, {
    ...cur,
    xp: cur.xp - xpToNextMark,
    level: cur.level + 1
  });
  return true;
}
function getUnitExperience(entityId) {
  const entity = findUnitById$1(entityId);
  if (!entity) return void 0;
  const trait = entity.get(Experience);
  if (!trait) return void 0;
  const archetypeId = entity.get(Unit)?.archetypeId ?? "field_technician";
  return buildUnitExperience(entity, archetypeId);
}
function getAllUnitExperience() {
  const result = [];
  for (const entity of units) {
    const trait = entity.get(Experience);
    if (!trait) continue;
    const archetypeId = entity.get(Unit)?.archetypeId ?? "field_technician";
    result.push(buildUnitExperience(entity, archetypeId));
  }
  return result;
}
function getUpgradeEligibleUnits() {
  return getAllUnitExperience().filter((xp) => xp.upgradeEligible);
}
function getXPProgress(entityId) {
  const entity = findUnitById$1(entityId);
  if (!entity) return 0;
  const trait = entity.get(Experience);
  if (!trait) return 0;
  const xpToNextMark = getXPForNextMark(trait.level);
  if (xpToNextMark === 0) return 0;
  return Math.min(1, trait.xp / xpToNextMark);
}
function rehydrateExperience(states) {
  for (const state of states) {
    const entity = findUnitById$1(state.entityId);
    if (!entity) continue;
    const cur = entity.get(Experience);
    if (!cur) continue;
    entity.set(Experience, {
      ...cur,
      xp: state.currentXP,
      level: state.currentMark
    });
  }
}
function serializeExperience() {
  return getAllUnitExperience();
}
function resetExperience() {
  for (const entity of units) {
    const cur = entity.get(Experience);
    if (!cur) continue;
    entity.set(Experience, {
      ...cur,
      xp: 0,
      level: 1,
      killCount: 0,
      harvestCount: 0
    });
  }
}

const ArachnoidModel = "/assets/models/robots/hostile/Arachnoid.glb";
const MechaTrooperModel = "/assets/models/robots/hostile/MechaTrooper.glb";
const QuadrupedTankModel = "/assets/models/robots/hostile/QuadrupedTank.glb";
const MechaGolemModel = "/assets/models/robots/industrial/MechaGolem.glb";
const MobileStorageBotModel = "/assets/models/robots/industrial/MobileStorageBot.glb";
const CompanionBotModel = "/assets/models/robots/player/Companion-bot.glb";
const FieldFighterModel = "/assets/models/robots/player/FieldFighter.glb";
const Mecha01Model = "/assets/models/robots/player/Mecha01.glb";
const ReconBotModel = "/assets/models/robots/player/ReconBot.glb";
const modelAssets = {
  "Arachnoid.glb": ArachnoidModel,
  "Companion-bot.glb": CompanionBotModel,
  "FieldFighter.glb": FieldFighterModel,
  "Mecha01.glb": Mecha01Model,
  "MechaGolem.glb": MechaGolemModel,
  "MechaTrooper.glb": MechaTrooperModel,
  "MobileStorageBot.glb": MobileStorageBotModel,
  "QuadrupedTank.glb": QuadrupedTankModel,
  "ReconBot.glb": ReconBotModel
};

const FRUSTUM_PADDING = 5;
let currentBounds = {
  minX: -100,
  maxX: 100,
  minZ: -100,
  maxZ: 100
};
const listeners = /* @__PURE__ */ new Set();
function notify() {
  for (const listener of listeners) {
    listener();
  }
}
function updateFrustum(cameraX, cameraZ, cameraHeight, fov = 45, aspect = 16 / 9) {
  const halfFovRad = fov / 2 * Math.PI / 180;
  const visibleHeight = 2 * cameraHeight * Math.tan(halfFovRad);
  const visibleWidth = visibleHeight * aspect;
  const halfW = visibleWidth / 2 + FRUSTUM_PADDING;
  const halfH = visibleHeight / 2 + FRUSTUM_PADDING;
  currentBounds = {
    minX: cameraX - halfW,
    maxX: cameraX + halfW,
    minZ: cameraZ - halfH,
    maxZ: cameraZ + halfH
  };
  notify();
}
function isInFrustum(worldX, worldZ) {
  return worldX >= currentBounds.minX && worldX <= currentBounds.maxX && worldZ >= currentBounds.minZ && worldZ <= currentBounds.maxZ;
}
function isAABBInFrustum(minX, minZ, maxX, maxZ) {
  return maxX >= currentBounds.minX && minX <= currentBounds.maxX && maxZ >= currentBounds.minZ && minZ <= currentBounds.maxZ;
}
function distanceSquaredToCamera(worldX, worldZ) {
  const cx = (currentBounds.minX + currentBounds.maxX) / 2;
  const cz = (currentBounds.minZ + currentBounds.maxZ) / 2;
  const dx = worldX - cx;
  const dz = worldZ - cz;
  return dx * dx + dz * dz;
}
function getFrustumBounds() {
  return currentBounds;
}
function subscribeFrustum(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function resetFrustum() {
  currentBounds = {
    minX: -100,
    maxX: 100,
    minZ: -100,
    maxZ: 100
  };
  notify();
}

const _comment = "Snap-to zoom tiers for mobile 4X viewport. Tiers define visual LOD transitions.";
const tiers = {"tactical":{"cellsAcross":4.5,"_comment":"Unit models, building details, terrain features, thick network lines with particles, resource markers with quantities","networkLineOpacity":1,"resourceMarkersVisible":true,"structureDetail":"full","unitDetail":"full"},"default":{"cellsAcross":7.5,"_comment":"Units as icons, buildings as silhouettes, terrain colors, medium network lines with glow, small resource dots","networkLineOpacity":0.85,"resourceMarkersVisible":true,"structureDetail":"silhouette","unitDetail":"icon"},"strategic":{"cellsAcross":12,"_comment":"Ownership colors, city icons, unit group indicators, thin steady network lines, no resource markers","networkLineOpacity":0.6,"resourceMarkersVisible":false,"structureDetail":"icon","unitDetail":"badge"},"world":{"cellsAcross":22,"_comment":"Full map overview, city dots only, faint tracery lines, no units visible","networkLineOpacity":0.3,"resourceMarkersVisible":false,"structureDetail":"dot","unitDetail":"hidden"}};
const transitionDuration = 0.3;
const _comment_transitionDuration = "Seconds for smooth lerp between zoom tier boundaries";
const snapThreshold = 0.15;
const _comment_snapThreshold = "Fraction of tier range — if camera is within this fraction of a tier boundary, snap to that tier";
const doubleTapCycleOrder = ["tactical","default","strategic","world"];
const minScreenTileWidth = 1;
const _comment_minScreenTileWidth = "Minimum 1px screen-space width for network lines at any zoom";
const zoomConfig = {
  _comment,
  tiers,
  transitionDuration,
  _comment_transitionDuration,
  snapThreshold,
  _comment_snapThreshold,
  doubleTapCycleOrder,
  minScreenTileWidth,
  _comment_minScreenTileWidth,
};

let currentTier = "default";
let previousTier = "default";
let transitionProgress = 1;
let cameraHeight = 20;
let _viewportWidth = 375;
function computeCellsAcross(height, fov = 45) {
  const halfFovRad = fov / 2 * Math.PI / 180;
  const visibleWidth = 2 * height * Math.tan(halfFovRad);
  const hexWidth = SECTOR_LATTICE_SIZE * 2;
  return visibleWidth / hexWidth;
}
function tierForCellsAcross(cells) {
  const tiers = zoomConfig.tiers;
  if (cells <= (tiers.tactical.cellsAcross + tiers.default.cellsAcross) / 2) {
    return "tactical";
  }
  if (cells <= (tiers.default.cellsAcross + tiers.strategic.cellsAcross) / 2) {
    return "default";
  }
  if (cells <= (tiers.strategic.cellsAcross + tiers.world.cellsAcross) / 2) {
    return "strategic";
  }
  return "world";
}
function getTargetHeightForTier(tier, fov = 45) {
  const cellsAcross = zoomConfig.tiers[tier].cellsAcross;
  const hexWidth = SECTOR_LATTICE_SIZE * 2;
  const visibleWidth = cellsAcross * hexWidth;
  const halfFovRad = fov / 2 * Math.PI / 180;
  return visibleWidth / (2 * Math.tan(halfFovRad));
}
function lerpValue(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}
let zoomTierState = buildState();
function getTierConfig(tier) {
  return zoomConfig.tiers[tier];
}
function buildState() {
  const tierConfig = getTierConfig(currentTier);
  const prevConfig = getTierConfig(previousTier);
  const t = transitionProgress;
  return {
    tier: currentTier,
    transitionProgress,
    transitioning: t < 1,
    previousTier,
    networkLineOpacity: lerpValue(
      prevConfig.networkLineOpacity,
      tierConfig.networkLineOpacity,
      t
    ),
    resourceMarkersVisible: tierConfig.resourceMarkersVisible,
    structureDetail: tierConfig.structureDetail,
    unitDetail: tierConfig.unitDetail,
    cameraHeight,
    cellsAcross: computeCellsAcross(cameraHeight)
  };
}
function getZoomTierState() {
  return zoomTierState;
}
function getCurrentZoomTier() {
  return currentTier;
}
function getNextCycleTier() {
  const order = zoomConfig.doubleTapCycleOrder;
  const idx = order.indexOf(currentTier);
  return order[(idx + 1) % order.length];
}
function setViewportWidth(width) {
  _viewportWidth = width;
}
function resetZoomTier() {
  currentTier = "default";
  previousTier = "default";
  transitionProgress = 1;
  cameraHeight = 20;
  zoomTierState = buildState();
}
function updateZoomTier(newCameraHeight, deltaTime) {
  cameraHeight = newCameraHeight;
  const cellsAcross = computeCellsAcross(cameraHeight);
  const newTier = tierForCellsAcross(cellsAcross);
  if (newTier !== currentTier) {
    previousTier = currentTier;
    currentTier = newTier;
    transitionProgress = 0;
  }
  if (transitionProgress < 1) {
    transitionProgress += deltaTime / zoomConfig.transitionDuration;
    if (transitionProgress >= 1) {
      transitionProgress = 1;
    }
  }
  zoomTierState = buildState();
  return currentTier;
}

const FULL_TO_SIMPLIFIED_SQ = 30 * 30;
const SIMPLIFIED_TO_ICON_SQ = 60 * 60;
const ICON_TO_HIDDEN_SQ = 120 * 120;
const HYSTERESIS_SQ = 3 * 3;
function findUnitById(id) {
  for (const e of units) {
    if (e.get(Identity)?.id === id) return e;
  }
  return null;
}
function getLODLevel(entityId, worldX, worldZ) {
  const zoomState = getZoomTierState();
  const entity = findUnitById(entityId);
  const previousLOD = entity?.get(BotLOD)?.level ?? "full";
  const maxDetail = zoomTierToMaxLOD(zoomState);
  const distSq = distanceSquaredToCamera(worldX, worldZ);
  const distanceLOD = computeDistanceLOD(distSq, previousLOD);
  const finalLOD = coarsest(distanceLOD, maxDetail);
  if (entity) {
    const cur = entity.get(BotLOD);
    if (cur) entity.set(BotLOD, { ...cur, level: finalLOD });
  }
  return finalLOD;
}
function getLODLevelStateless(worldX, worldZ) {
  const zoomState = getZoomTierState();
  const maxDetail = zoomTierToMaxLOD(zoomState);
  const distSq = distanceSquaredToCamera(worldX, worldZ);
  const distanceLOD = computeDistanceLOD(distSq, "full");
  return coarsest(distanceLOD, maxDetail);
}
function resetBotLOD() {
  for (const entity of units) {
    const cur = entity.get(BotLOD);
    if (cur) entity.set(BotLOD, { ...cur, level: "full" });
  }
}
function getLODStats() {
  const stats = {
    full: 0,
    simplified: 0,
    icon: 0,
    hidden: 0
  };
  for (const entity of units) {
    const level = entity.get(BotLOD)?.level ?? "full";
    stats[level]++;
  }
  return stats;
}
function zoomTierToMaxLOD(state) {
  switch (state.unitDetail) {
    case "full":
      return "full";
    case "icon":
      return "simplified";
    case "badge":
      return "icon";
    case "hidden":
      return "hidden";
    default:
      return "full";
  }
}
function computeDistanceLOD(distSq, previousLOD) {
  const goingFarther = (threshold) => previousLOD === "full" || previousLOD === "simplified" ? threshold + HYSTERESIS_SQ : threshold;
  const _goingCloser = (threshold) => previousLOD === "hidden" || previousLOD === "icon" ? threshold - HYSTERESIS_SQ : threshold;
  if (distSq > ICON_TO_HIDDEN_SQ + HYSTERESIS_SQ) return "hidden";
  if (distSq > goingFarther(SIMPLIFIED_TO_ICON_SQ)) return "icon";
  if (distSq > goingFarther(FULL_TO_SIMPLIFIED_SQ)) return "simplified";
  return "full";
}
const LOD_ORDER = ["full", "simplified", "icon", "hidden"];
function coarsest(a, b) {
  const ai = LOD_ORDER.indexOf(a);
  const bi = LOD_ORDER.indexOf(b);
  return ai >= bi ? a : b;
}

const cultist = {"tint":"0xcc2255","emissive":"0x660022","materialEmissive":"0x8822aa","auraColor":"0xff2266","materialLerpColor":"0x1a0a1e","materialLerpAmount":0.65,"emissiveIntensity":0.35,"roughnessMax":0.7,"metalnessMin":0.3,"auraRingInner":0.6,"auraRingOuter":0.8,"auraOpacityBase":0.2,"auraOpacityPulseAmplitude":0.1,"auraPulseSpeed":2};
const markBadgeColors = {"1":"0xffffff","2":"0x44ff44","3":"0x4488ff","4":"0xaa44ff","5":"0xffd700"};
const damageVisuals = {"sparkingThreshold":0.5,"opacityMin":0.5,"glowIntensityMin":0.1,"desaturationMax":0.8};
const unitVisualsJson = {
  cultist,
  markBadgeColors,
  damageVisuals,
};

function assertUnitVisualsConfig(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("unitVisuals.json: invalid or missing config");
  }
  const o = raw;
  if (!o.cultist || !o.markBadgeColors || !o.damageVisuals) {
    throw new Error(
      "unitVisuals.json: missing cultist, markBadgeColors, or damageVisuals"
    );
  }
}
assertUnitVisualsConfig(unitVisualsJson);
const unitVisualsConfig = unitVisualsJson;
function parseHexColor(hex) {
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) {
    throw new Error(`unitVisuals: invalid hex color "${hex}"`);
  }
  return n;
}

const MARK_LABELS = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V"
};
let cachedCultist = null;
function getCultistVisualConfig() {
  if (cachedCultist) return cachedCultist;
  const c = unitVisualsConfig.cultist;
  cachedCultist = {
    tint: parseHexColor(c.tint),
    emissive: parseHexColor(c.emissive),
    materialEmissive: parseHexColor(c.materialEmissive),
    auraColor: parseHexColor(c.auraColor),
    materialLerpColor: parseHexColor(c.materialLerpColor),
    materialLerpAmount: c.materialLerpAmount,
    emissiveIntensity: c.emissiveIntensity,
    roughnessMax: c.roughnessMax,
    metalnessMin: c.metalnessMin,
    auraRingInner: c.auraRingInner,
    auraRingOuter: c.auraRingOuter,
    auraOpacityBase: c.auraOpacityBase,
    auraOpacityPulseAmplitude: c.auraOpacityPulseAmplitude,
    auraPulseSpeed: c.auraPulseSpeed
  };
  return cachedCultist;
}
function getBadgeColor(markLevel) {
  if (markLevel < 1 || markLevel > 5) return null;
  const hex = unitVisualsConfig.markBadgeColors[String(markLevel)];
  return hex != null ? parseHexColor(hex) : null;
}
function getBadgeLabel(markLevel) {
  if (markLevel < 1 || markLevel > 5) return null;
  return MARK_LABELS[markLevel] ?? null;
}
function getDamageRatio(components) {
  if (components.length === 0) return 0;
  const broken = components.filter((c) => !c.functional).length;
  return broken / components.length;
}
function isCultistVisual(faction) {
  return faction === "cultist" || faction === "rogue";
}
function getDamageVisuals(damageRatio) {
  const d = unitVisualsConfig.damageVisuals;
  const clamped = Math.max(0, Math.min(1, damageRatio));
  const opacityRange = 1 - d.opacityMin;
  const glowRange = 1 - d.glowIntensityMin;
  return {
    opacity: 1 - clamped * opacityRange,
    glowIntensity: 1 - clamped * glowRange,
    desaturation: clamped * d.desaturationMax,
    sparking: clamped >= d.sparkingThreshold
  };
}

const COLOR_SELECTED = 16755200;
const COLOR_BUILDING = 8947848;
const COLOR_BUILDING_UNPOWERED = 5588036;
const COLOR_FABRICATION = 11176004;
const COLOR_BROKEN = 16729156;
const FACTION_BEACON_COLORS = {
  player: 52428,
  // Cyan
  rogue: 16755268,
  // Amber — Reclaimers
  cult: 14256127,
  // Purple (legacy key)
  cultist: 14256127,
  // Purple — Signal Choir / Iron Creed
  feral: 4508740
  // Green — Volt Collective
};
function isUnitVisibleToPlayer(entity) {
  const faction = entity.get(Identity)?.faction ?? "player";
  if (faction === "player") return true;
  const pos = entity.get(WorldPosition);
  if (!pos) return false;
  const { q, r } = worldToGrid(pos.x, pos.z);
  const cell = getSectorCell(q, r);
  return cell ? cell.discovery_state >= 1 : false;
}
function normalizeUnitMaterial(material, beaconColor) {
  if (!(material instanceof MeshStandardMaterial)) {
    return;
  }
  const accent = new Color(beaconColor);
  material.color = material.color.clone().lerp(new Color(12044246), 0.4);
  material.emissive = material.emissive.clone().lerp(accent, 0.12);
  material.emissiveIntensity = 0.22;
  material.roughness = Math.min(material.roughness ?? 0.92, 0.84);
  material.metalness = Math.max(material.metalness ?? 0.1, 0.12);
  material.side = DoubleSide;
  material.needsUpdate = true;
}
function normalizeCultistMaterial(material) {
  if (!(material instanceof MeshStandardMaterial)) {
    return;
  }
  const cfg = getCultistVisualConfig();
  material.color = material.color.clone().lerp(new Color(cfg.materialLerpColor), cfg.materialLerpAmount);
  material.emissive = new Color(cfg.materialEmissive);
  material.emissiveIntensity = cfg.emissiveIntensity;
  material.roughness = Math.min(material.roughness ?? 0.92, cfg.roughnessMax);
  material.metalness = Math.max(material.metalness ?? 0.1, cfg.metalnessMin);
  material.side = DoubleSide;
  material.needsUpdate = true;
}
const CULTIST_GLITCH_SPEED = 3.5;
const CULTIST_GLITCH_AMPLITUDE = 0.04;
const SPENT_GRAY = new Color(6710886);
const _GLOW_PULSE_SPEED = 2.5;
const _GLOW_PULSE_MIN = 0.3;
const _GLOW_PULSE_MAX = 1;
const SPENT_OPACITY = 0.6;
const POSITION_LERP_SPEED = 8;
const POSITION_SNAP_THRESHOLD = 10;
const IDLE_BOB_SPEED = 1.8;
const IDLE_BOB_AMPLITUDE = 0.04;
const HARVEST_ROTATE_SPEED = 2;
const HARVEST_PULSE_SPEED = 3;
const ATTACK_FLASH_SPEED = 6;
const BUILDING_PULSE_SPEED = 2.5;
const COLOR_HARVEST_GLOW = new Color(65450);
const COLOR_ATTACK_FLASH = new Color(16729156);
const COLOR_BUILDING_GLOW = new Color(14527044);
function DamageSparks() {
  const sparkRef = reactExports.useRef(null);
  const sparkCount = 6;
  const positions = reactExports.useMemo(() => {
    const arr = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.6;
      arr[i * 3 + 1] = Math.random() * 0.8 + 0.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (!sparkRef.current) return;
    const geo = sparkRef.current.geometry;
    const posAttr = geo.getAttribute("position");
    if (!posAttr) return;
    const arr = posAttr.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < sparkCount; i++) {
      arr[i * 3 + 1] = (arr[i * 3 + 1] + 0.02) % 1 + 0.2 + Math.sin(t * 10 + i) * 0.05;
    }
    posAttr.needsUpdate = true;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("points", { ref: sparkRef, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("bufferGeometry", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("bufferAttribute", { attach: "attributes-position", args: [positions, 3] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "pointsMaterial",
      {
        color: 16755268,
        size: 0.06,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
      }
    )
  ] });
}
function CultistAura() {
  const ringRef = reactExports.useRef(null);
  const cfg = getCultistVisualConfig();
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const mat = ringRef.current.material;
    mat.opacity = cfg.auraOpacityBase + cfg.auraOpacityPulseAmplitude * Math.sin(clock.getElapsedTime() * cfg.auraPulseSpeed);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { ref: ringRef, rotation: [-Math.PI / 2, 0, 0], position: [0, 0.03, 0], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("ringGeometry", { args: [cfg.auraRingInner, cfg.auraRingOuter, 24] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "meshBasicMaterial",
      {
        color: cfg.auraColor,
        transparent: true,
        opacity: cfg.auraOpacityBase,
        side: DoubleSide,
        depthWrite: false
      }
    )
  ] });
}
function MarkBadge({ markLevel }) {
  const color = getBadgeColor(markLevel);
  const label = getBadgeLabel(markLevel);
  if (color === null || label === null) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { position: [0, 1.8, 0], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circleGeometry", { args: [0.18, 16] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshBasicMaterial",
        {
          color: 1118481,
          transparent: true,
          opacity: 0.7,
          side: DoubleSide,
          depthWrite: false
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Text,
      {
        position: [0, 0, 0.01],
        fontSize: 0.2,
        color: new Color(color),
        anchorX: "center",
        anchorY: "middle",
        depthOffset: -1,
        children: label
      }
    )
  ] });
}
function UnitMesh({ entity }) {
  const groupRef = reactExports.useRef(null);
  const modelGroupRef = reactExports.useRef(null);
  const ringRef = reactExports.useRef(null);
  const _glowRingRef = reactExports.useRef(null);
  const _glowMatRef = reactExports.useRef(null);
  const upgradeRef = reactExports.useRef(null);
  const upgradeMatRef = reactExports.useRef(null);
  const modelMaterialsRef = reactExports.useRef([]);
  const originalColorsRef = reactExports.useRef([]);
  const displayPosRef = reactExports.useRef(new Vector3());
  const initializedRef = reactExports.useRef(false);
  const unitComponent = entity.get(Unit);
  if (!unitComponent) {
    throw new Error(
      "UnitMesh: entity is missing Unit trait — cannot render a unit without a type"
    );
  }
  const unitType = unitComponent.type;
  const config = getBotDefinition(unitType);
  const modelPath = resolveAssetUri(modelAssets[config.model]);
  const gltf = useGLTF(modelPath);
  const scene = Array.isArray(gltf) ? gltf[0]?.scene : gltf.scene;
  const faction = entity.get(Identity)?.faction ?? "player";
  const isCultist = faction === "cultist";
  const beaconColor = FACTION_BEACON_COLORS[faction] ?? 9168639;
  const normalizedScene = reactExports.useMemo(() => {
    if (!scene) {
      return null;
    }
    const box = new Box3().setFromObject(scene);
    const center = new Vector3();
    box.getCenter(center);
    const clone = scene.clone(true);
    clone.position.set(-center.x, -box.min.y, -center.z);
    const materials = [];
    const origColors = [];
    clone.traverse((child) => {
      if (!(child instanceof Mesh)) {
        return;
      }
      child.castShadow = true;
      child.receiveShadow = true;
      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => {
          if (material instanceof MeshStandardMaterial) {
            const next = material.clone();
            if (isCultist) {
              normalizeCultistMaterial(next);
            } else {
              normalizeUnitMaterial(next, beaconColor);
            }
            materials.push(next);
            origColors.push(next.color.clone());
            return next;
          }
          return material;
        });
        return;
      }
      if (child.material instanceof MeshStandardMaterial) {
        child.material = child.material.clone();
        if (isCultist) {
          normalizeCultistMaterial(child.material);
        } else {
          normalizeUnitMaterial(child.material, beaconColor);
        }
        materials.push(child.material);
        origColors.push(child.material.color.clone());
      }
    });
    modelMaterialsRef.current = materials;
    originalColorsRef.current = origColors;
    return clone;
  }, [beaconColor, isCultist, scene]);
  useFrame(({ clock }, delta) => {
    const frag = entity.has(MapFragment) ? getStructuralFragment(entity.get(MapFragment).fragmentId) : null;
    const ox = frag?.displayOffset.x ?? 0;
    const oz = frag?.displayOffset.z ?? 0;
    if (groupRef.current) {
      const wp = entity.get(WorldPosition);
      const entityId2 = entity.get(Identity)?.id ?? "";
      const lod = getLODLevel(entityId2, wp.x + ox, wp.z + oz);
      groupRef.current.visible = lod !== "hidden";
      const targetX = wp.x + ox;
      const targetY = wp.y;
      const targetZ = wp.z + oz;
      const dp = displayPosRef.current;
      if (!initializedRef.current) {
        dp.set(targetX, targetY, targetZ);
        initializedRef.current = true;
      } else {
        const gapX = targetX - dp.x;
        const gapY = targetY - dp.y;
        const gapZ = targetZ - dp.z;
        const gap = Math.sqrt(gapX * gapX + gapY * gapY + gapZ * gapZ);
        if (gap > POSITION_SNAP_THRESHOLD) {
          dp.set(targetX, targetY, targetZ);
        } else {
          const t = Math.min(1, POSITION_LERP_SPEED * delta);
          dp.x += gapX * t;
          dp.y += gapY * t;
          dp.z += gapZ * t;
        }
      }
      groupRef.current.position.set(dp.x, dp.y, dp.z);
      const rot = entity.get(Rotation);
      if (rot) {
        groupRef.current.rotation.set(0, rot.y, 0);
      }
    }
    if (ringRef.current) {
      ringRef.current.visible = entity.get(Unit)?.selected ?? false;
    }
    const entityId = entity.get(Identity)?.id ?? "";
    const hasPoints = hasAnyPoints(entityId);
    const animState = getEntityAnimationState(entityId);
    if (modelGroupRef.current) {
      switch (animState) {
        case "idle": {
          const bob = Math.sin(clock.elapsedTime * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
          modelGroupRef.current.position.y = bob;
          modelGroupRef.current.rotation.y = 0;
          break;
        }
        case "walking": {
          modelGroupRef.current.position.y = 0;
          modelGroupRef.current.rotation.y = 0;
          break;
        }
        case "harvesting": {
          modelGroupRef.current.rotation.y = clock.elapsedTime * HARVEST_ROTATE_SPEED;
          modelGroupRef.current.position.y = 0;
          break;
        }
        case "attacking": {
          modelGroupRef.current.position.y = 0;
          modelGroupRef.current.rotation.y = 0;
          break;
        }
        case "building": {
          const pump = Math.abs(Math.sin(clock.elapsedTime * BUILDING_PULSE_SPEED)) * 0.06;
          modelGroupRef.current.position.y = pump;
          modelGroupRef.current.rotation.y = 0;
          break;
        }
      }
    }
    const mats = modelMaterialsRef.current;
    const origColors = originalColorsRef.current;
    for (let i = 0; i < mats.length; i++) {
      const mat = mats[i];
      const orig = origColors[i];
      if (hasPoints) {
        mat.color.copy(orig);
        mat.opacity = 1;
        mat.transparent = false;
        if (!isCultist) {
          switch (animState) {
            case "harvesting": {
              const hPulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * HARVEST_PULSE_SPEED);
              mat.emissive.copy(COLOR_HARVEST_GLOW);
              mat.emissiveIntensity = 0.15 + hPulse * 0.2;
              break;
            }
            case "attacking": {
              const flash = 0.5 + 0.5 * Math.sin(clock.elapsedTime * ATTACK_FLASH_SPEED);
              mat.emissive.copy(COLOR_ATTACK_FLASH);
              mat.emissiveIntensity = 0.1 + flash * 0.35;
              break;
            }
            case "building": {
              const bPulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * BUILDING_PULSE_SPEED);
              mat.emissive.copy(COLOR_BUILDING_GLOW);
              mat.emissiveIntensity = 0.12 + bPulse * 0.18;
              break;
            }
            default: {
              mat.emissiveIntensity = 0.22;
              break;
            }
          }
        }
      } else {
        mat.color.copy(orig).lerp(SPENT_GRAY, 0.55);
        mat.opacity = SPENT_OPACITY;
        mat.transparent = true;
        if (!isCultist) {
          mat.emissiveIntensity = 0.1;
        }
      }
    }
    const unitComponents = entity.get(Unit)?.components ?? [];
    const damageRatio = getDamageRatio(unitComponents);
    if (damageRatio > 0) {
      const damageVis = getDamageVisuals(damageRatio);
      for (let i = 0; i < mats.length; i++) {
        const mat = mats[i];
        mat.emissiveIntensity *= damageVis.glowIntensity;
        if (!isCultist) {
          const gray = 0.3 + damageVis.desaturation * 0.2;
          mat.color.lerp(
            new Color(gray, gray, gray),
            damageVis.desaturation * 0.3
          );
        }
      }
    }
    if (isCultist) {
      const cultistEmissive = getCultistVisualConfig().materialEmissive;
      for (const mat of mats) {
        mat.emissive = new Color(cultistEmissive);
      }
    }
    if (isCultist && groupRef.current) {
      const t = clock.elapsedTime * CULTIST_GLITCH_SPEED;
      const flicker = Math.sin(t * 7.3) * Math.sin(t * 13.1);
      const jitterX = flicker > 0.7 ? CULTIST_GLITCH_AMPLITUDE * Math.sin(t * 47) : 0;
      const jitterZ = flicker > 0.7 ? CULTIST_GLITCH_AMPLITUDE * Math.cos(t * 51) : 0;
      groupRef.current.position.x += jitterX;
      groupRef.current.position.z += jitterZ;
      for (const mat of mats) {
        mat.emissiveIntensity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.1));
      }
    }
    if (upgradeRef.current) {
      const xp = getUnitExperience(entityId);
      if (xp?.upgradeEligible && !isCultist) {
        upgradeRef.current.visible = true;
        upgradeRef.current.rotation.y = clock.elapsedTime * 1.5;
        upgradeRef.current.position.y = 1.8 + Math.sin(clock.elapsedTime * 2.5) * 0.06;
        if (upgradeMatRef.current) {
          upgradeMatRef.current.emissiveIntensity = 0.6 + 0.3 * Math.sin(clock.elapsedTime * 3);
        }
      } else {
        upgradeRef.current.visible = false;
      }
    }
  });
  const modelScale = (config.scale || 1) * 1.25;
  const showCultist = isCultistVisual(faction);
  const renderComponents = entity.get(Unit)?.components ?? [];
  const markLevel = faction === "player" ? entity.get(Unit)?.markLevel ?? 1 : 0;
  const renderDamageRatio = getDamageRatio(renderComponents);
  const renderDamageVisuals = getDamageVisuals(renderDamageRatio);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { ref: groupRef, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("group", { ref: modelGroupRef, children: normalizedScene ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "primitive",
      {
        object: normalizedScene,
        scale: [modelScale, modelScale, modelScale]
      }
    ) : null }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1.4, 0], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("sphereGeometry", { args: [0.09, 14, 14] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshStandardMaterial",
        {
          color: beaconColor,
          emissive: beaconColor,
          emissiveIntensity: 0.75,
          roughness: 0.18,
          metalness: 0.08
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.15, 0], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.09, 0.14, 0.12, 10] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshStandardMaterial",
        {
          color: 1319725,
          emissive: beaconColor,
          emissiveIntensity: 0.18,
          roughness: 0.84,
          metalness: 0.1
        }
      )
    ] }),
    showCultist && /* @__PURE__ */ jsxRuntimeExports.jsx(CultistAura, {}),
    faction === "player" && markLevel >= 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(MarkBadge, { markLevel }),
    renderDamageVisuals.sparking && /* @__PURE__ */ jsxRuntimeExports.jsx(DamageSparks, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "mesh",
      {
        ref: ringRef,
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, 0.05, 0],
        visible: false,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("ringGeometry", { args: [0.5, 0.65, 16] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("meshBasicMaterial", { color: COLOR_SELECTED, side: DoubleSide })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("group", { ref: upgradeRef, position: [0, 1.8, 0], visible: false, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { rotation: [0, 0, Math.PI / 4], children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("octahedronGeometry", { args: [0.1, 0] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshStandardMaterial",
        {
          ref: upgradeMatRef,
          color: 16172394,
          emissive: 16172394,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 0.9
        }
      )
    ] }) })
  ] });
}
function BuildingMesh({ entity }) {
  const groupRef = reactExports.useRef(null);
  const ringRef = reactExports.useRef(null);
  useFrame(() => {
    const frag = entity.has(MapFragment) ? getStructuralFragment(entity.get(MapFragment).fragmentId) : null;
    const ox = frag?.displayOffset.x ?? 0;
    const oz = frag?.displayOffset.z ?? 0;
    if (groupRef.current) {
      groupRef.current.position.set(
        entity.get(WorldPosition).x + ox,
        entity.get(WorldPosition).y,
        entity.get(WorldPosition).z + oz
      );
    }
    if (ringRef.current) {
      const selected = entity.get(Unit) ? entity.get(Unit)?.selected : entity.get(Building)?.selected;
      ringRef.current.visible = selected ?? false;
    }
  });
  const buildingType = entity.get(Building)?.type ?? "";
  const isPowered = entity.get(Building)?.powered;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("group", { ref: groupRef, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.15, 0], castShadow: true, receiveShadow: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [1.6, 0.3, 1.6] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "meshStandardMaterial",
        {
          color: isPowered ? COLOR_BUILDING : COLOR_BUILDING_UNPOWERED,
          roughness: isPowered ? 0.82 : 0.9,
          metalness: isPowered ? 0.14 : 0.08,
          emissive: isPowered ? 1120802 : 657416,
          emissiveIntensity: isPowered ? 0.12 : 0.06,
          side: DoubleSide
        }
      )
    ] }),
    buildingType === "fabrication_unit" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.7, 0], castShadow: true, receiveShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [1.2, 0.8, 1.2] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? COLOR_FABRICATION : 5588019,
            roughness: 0.72,
            metalness: 0.2,
            emissive: isPowered ? 2760206 : 657414,
            emissiveIntensity: isPowered ? 0.16 : 0.04
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1.3, 0], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.08, 0.08, 0.5, 8] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 6710886,
            roughness: 0.78,
            metalness: 0.22
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0.5, 0.9, 0.61], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("sphereGeometry", { args: [0.08, 8, 8] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 65280 : COLOR_BROKEN,
            emissive: isPowered ? 65280 : COLOR_BROKEN,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.05
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1.2, 0.4], castShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [0.4, 0.3, 0.3] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 7829350,
            roughness: 0.74,
            metalness: 0.16,
            emissive: 921098,
            emissiveIntensity: 0.08
          }
        )
      ] })
    ] }),
    buildingType === "lightning_rod" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1.5, 0], castShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.06, 0.1, 2.5, 6] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 7237760,
            roughness: 0.58,
            metalness: 0.42,
            emissive: 921624,
            emissiveIntensity: 0.08
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 2.8, 0], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("coneGeometry", { args: [0.12, 0.4, 6] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 10070562,
            emissive: 3359744,
            emissiveIntensity: 0.35,
            roughness: 0.32,
            metalness: 0.18
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.02, 0], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("ringGeometry", { args: [7.5, 8, 32] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshBasicMaterial",
          {
            color: 65450,
            transparent: true,
            opacity: 0.15,
            side: DoubleSide
          }
        )
      ] })
    ] }),
    buildingType === "defense_turret" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.55, 0], castShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.55, 0.65, 0.5, 8] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 6975616 : 4868688,
            roughness: 0.6,
            metalness: 0.35,
            emissive: isPowered ? 922136 : 394760,
            emissiveIntensity: 0.1
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "mesh",
        {
          position: [0, 0.7, 0.5],
          rotation: [Math.PI / 2, 0, 0],
          castShadow: true,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.06, 0.08, 0.7, 6] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "meshStandardMaterial",
              {
                color: 5592416,
                roughness: 0.5,
                metalness: 0.5
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.7, 0.85], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("sphereGeometry", { args: [0.06, 6, 6] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 16729156 : 4473924,
            emissive: isPowered ? 16720418 : 0,
            emissiveIntensity: isPowered ? 0.5 : 0,
            roughness: 0.3,
            metalness: 0.1
          }
        )
      ] })
    ] }),
    buildingType === "relay_tower" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1.2, 0], castShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("cylinderGeometry", { args: [0.05, 0.08, 2, 6] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 7372960,
            roughness: 0.55,
            metalness: 0.4
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0.3, 1.8, 0], rotation: [0, 0, -Math.PI / 6], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("coneGeometry", { args: [0.25, 0.15, 8, 1, true] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 9168639 : 4478310,
            emissive: isPowered ? 2254506 : 0,
            emissiveIntensity: isPowered ? 0.3 : 0,
            roughness: 0.4,
            metalness: 0.3,
            side: DoubleSide
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 2.3, 0], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("sphereGeometry", { args: [0.06, 6, 6] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 52479 : 3359829,
            emissive: isPowered ? 43775 : 0,
            emissiveIntensity: isPowered ? 0.7 : 0,
            roughness: 0.2,
            metalness: 0.1
          }
        )
      ] })
    ] }),
    buildingType === "power_sink" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.7, 0], castShadow: true, receiveShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [1, 0.8, 1] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 5596808 : 3816004,
            roughness: 0.65,
            metalness: 0.3,
            emissive: isPowered ? 1122884 : 0,
            emissiveIntensity: isPowered ? 0.15 : 0
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1.2, 0], rotation: [Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("torusGeometry", { args: [0.35, 0.04, 8, 16] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 16172394 : 6706500,
            emissive: isPowered ? 11167266 : 0,
            emissiveIntensity: isPowered ? 0.35 : 0,
            roughness: 0.4,
            metalness: 0.4
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 1, 0], rotation: [Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("torusGeometry", { args: [0.4, 0.03, 8, 16] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 14527044 : 5588019,
            roughness: 0.5,
            metalness: 0.3
          }
        )
      ] })
    ] }),
    buildingType === "storage_hub" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.55, 0], castShadow: true, receiveShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [1.4, 0.5, 1] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 6977382,
            roughness: 0.8,
            metalness: 0.12,
            emissive: 658952,
            emissiveIntensity: 0.06
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0.2, 1, 0.1], castShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [0.8, 0.4, 0.6] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 8030310,
            roughness: 0.75,
            metalness: 0.1
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [-0.4, 0.55, 0.35], castShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [0.4, 0.3, 0.3] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: 6715221,
            roughness: 0.82,
            metalness: 0.08
          }
        )
      ] })
    ] }),
    buildingType === "habitat_module" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.8, 0], castShadow: true, receiveShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "sphereGeometry",
          {
            args: [0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 8952234 : 5596774,
            roughness: 0.7,
            metalness: 0.2,
            emissive: isPowered ? 1122867 : 0,
            emissiveIntensity: isPowered ? 0.12 : 0
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.9, 0.6], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("circleGeometry", { args: [0.15, 12] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 11202303 : 4478310,
            emissive: isPowered ? 4500172 : 0,
            emissiveIntensity: isPowered ? 0.4 : 0,
            roughness: 0.15,
            metalness: 0.05,
            transparent: true,
            opacity: 0.85
          }
        )
      ] })
    ] }),
    buildingType === "motor_pool" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.65, 0], castShadow: true, receiveShadow: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [1.4, 0.7, 1.2] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 8028304 : 5264728,
            roughness: 0.7,
            metalness: 0.25,
            emissive: isPowered ? 922656 : 263174,
            emissiveIntensity: isPowered ? 0.1 : 0.03
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.5, 0.61], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [0.8, 0.6, 0.04] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 5595248 : 3817028,
            roughness: 0.6,
            metalness: 0.3
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.85, 0.62], children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [0.9, 0.06, 0.02] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "meshStandardMaterial",
          {
            color: isPowered ? 52394 : 3355443,
            emissive: isPowered ? 43656 : 0,
            emissiveIntensity: isPowered ? 0.6 : 0,
            roughness: 0.3,
            metalness: 0.1
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "mesh",
      {
        ref: ringRef,
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, 0.05, 0],
        visible: false,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("ringGeometry", { args: [1, 1.2, 16] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("meshBasicMaterial", { color: COLOR_SELECTED, side: DoubleSide })
        ]
      }
    )
  ] });
}
function GhostBuilding() {
  const groupRef = reactExports.useRef(null);
  useFrame(() => {
    const ghost = getGhostPosition();
    const active = getActivePlacement();
    if (!groupRef.current) return;
    if (!ghost || !active) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;
    const y = getSurfaceHeightAtWorldPosition(ghost.x, ghost.z);
    groupRef.current.position.set(ghost.x, y, ghost.z);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("group", { ref: groupRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("mesh", { position: [0, 0.8, 0], children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("boxGeometry", { args: [1.6, 1.6, 1.6] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "meshBasicMaterial",
      {
        color: 65450,
        transparent: true,
        opacity: 0.3,
        wireframe: true
      }
    )
  ] }) });
}
function UnitRenderer() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    Array.from(units).filter((entity) => entity.get(Unit)?.type !== "fabrication_unit").filter(isUnitVisibleToPlayer).map((entity) => /* @__PURE__ */ jsxRuntimeExports.jsx(UnitMesh, { entity }, entity.get(Identity)?.id)),
    Array.from(buildings).map((entity) => /* @__PURE__ */ jsxRuntimeExports.jsx(BuildingMesh, { entity }, entity.get(Identity)?.id)),
    /* @__PURE__ */ jsxRuntimeExports.jsx(GhostBuilding, {})
  ] });
}

export { BUILDING_COSTS as B, UnitRenderer as U, awardXP as a, getXPProgress as b, canUnitBuild as c, applyMarkUpgrade as d, getAnchorClusterFocus as e, getUnitExperience as g, setActivePlacement as s };
//# sourceMappingURL=UnitRenderer-DZePMRJg.js.map
