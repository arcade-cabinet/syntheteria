import { j as jsxRuntimeExports } from './jsx-runtime-CJ_nBwe_.js';
import { u as useThree, C as Canvas } from './react-three-fiber.esm-PzQKdL82.js';
import { g as generateWorldData, W as WorldProvider, A as AssetLoadBeacon, S as StructuralFloorRenderer, C as CityRenderer } from './generation-D8PdR-ni.js';
import { r as reactExports, g as getDatabaseSync } from './index-COtgIsy1.js';
import { u as units, U as Unit, I as Identity, W as WorldPosition, i as buildings, B as Building, w as world, j as getBotCommandProfile, k as isBotCategoryAllowed, l as issueMoveCommand, m as getResources, h as setCitySiteModalOpen, g as getRuntimeState, n as spendResource, o as getTile, f as getActiveWorldSession, r as resetRuntimeState, p as resetStructuralSpace, c as clearActiveWorldSession, s as setActiveWorldSession, q as setResources, t as loadStructuralFragment, a as setRuntimeScene, M as MapFragment, d as createBotUnitState, b as setNearbyPoi, v as initWorldGrid, x as resetWorldGrid } from './contracts-Exa9P0hv.js';
import { g as getUnitTurnState, q as queueThought, h as hasMovementPoints, a as hasActionPoints, b as areFactionsHostile, H as HACK_RANGE, c as checkHackEligibility, i as initiateHack, s as spendActionPoint, l as logTurnEvent, d as startRepair, R as RECIPES, e as startFabrication, f as getMotorPoolState, M as MOTOR_POOL_TIER_CONFIG, B as BOT_FABRICATION_RECIPES, j as queueBotFabrication, u as upgradeMotorPool, k as getMarkUpgradeCost, m as canMotorPoolUpgradeMark, n as isFloorHarvestable, o as isFloorTileConsumed, p as getResourcePoolForFloorMaterial, t as startFloorHarvest, v as isStructureConsumed, w as isHarvestable, x as getResourcePoolForModel, y as startHarvest, z as togglePause, A as setGameSpeed, r as resetGameState } from './gameState-CXdyHaTz.js';
import { a as awardXP, B as BUILDING_COSTS, s as setActivePlacement, c as canUnitBuild, g as getUnitExperience, b as getXPProgress, d as applyMarkUpgrade, e as getAnchorClusterFocus, U as UnitRenderer } from './UnitRenderer-DZePMRJg.js';
import { g as gameplayRandom } from './seed-BwjLk4HQ.js';
import { o as openCityKitLab, g as getCitySiteViewModel, s as surveyCitySite, f as foundCitySite, e as enterCityInstance, r as returnToWorld } from './poiActions-DqyDupab.js';
import { g as gridToWorld } from './sectorCoordinates-Bm5lA-nC.js';
import { B as BriefingBubbleLayer } from './BriefingBubbleLayer-Dk31fiiC.js';
import { c as createNewGameConfig } from './config-DqmIuxQs.js';
import './cityCatalog-DOxnPYXe.js';
import './CityModelMesh-4r60Iq1p.js';
import './floorMaterialPresets-LMzl77Ms.js';
import './cityPresentation-D5dFAzX3.js';
import './locationContext-Cp3DEtpX.js';

const _comment = "Config for the SVG radial context menu. Replaces build toolbar and action panels.";
const appearance = {"innerRadius":28,"outerRadius":90,"gapAngle":3,"strokeWidth":1.5,"iconSize":20,"labelFontSize":9,"animationDuration":150,"_comment_innerRadius":"dp — dead zone at center (prevents accidental selection)","_comment_outerRadius":"dp — outer edge of petals","_comment_gapAngle":"degrees between petals"};
const colors = {"petalFill":"rgba(7, 17, 23, 0.88)","petalStroke":"rgba(111, 243, 200, 0.25)","petalHover":"rgba(111, 243, 200, 0.12)","petalActive":"rgba(111, 243, 200, 0.22)","petalDisabled":"rgba(40, 40, 50, 0.6)","labelColor":"#d9fff3","labelDisabled":"rgba(255, 255, 255, 0.25)","iconColor":"#7ee7cb","centerDot":"rgba(111, 243, 200, 0.4)","_comment_petalFill":"Same dark translucent as HUD panels"};
const toneOverrides = {"_comment":"Certain action categories use different accent colors","power":{"petalStroke":"rgba(246, 197, 106, 0.25)","petalHover":"rgba(246, 197, 106, 0.12)","iconColor":"#f6c56a"},"combat":{"petalStroke":"rgba(255, 143, 143, 0.25)","petalHover":"rgba(255, 143, 143, 0.12)","iconColor":"#ff8f8f"},"signal":{"petalStroke":"rgba(137, 217, 255, 0.25)","petalHover":"rgba(137, 217, 255, 0.12)","iconColor":"#89d9ff"}};
const _comment_contexts = "Contexts are now populated dynamically by radialProviders.ts — each system registers what actions it can provide. See src/systems/radialProviders.ts.";
const radialConfig = {
  _comment,
  appearance,
  colors,
  toneOverrides,
  _comment_contexts,
};

const providers = [];
function registerRadialProvider(provider) {
  const existing = providers.findIndex((p) => p.id === provider.id);
  if (existing >= 0) {
    providers[existing] = provider;
  } else {
    providers.push(provider);
  }
}
let menuState = closedState();
let resolvedActions = /* @__PURE__ */ new Map();
function closedState() {
  return {
    open: false,
    centerX: 0,
    centerY: 0,
    innerPetals: [],
    outerPetals: [],
    innerHoveredIndex: -1,
    outerHoveredIndex: -1,
    outerRingOpen: false,
    expandedInnerIndex: -1,
    context: null
  };
}
function computePetalAngles(count, gapAngle) {
  if (count === 0) return [];
  const totalGap = gapAngle * count;
  const availableDegrees = 360 - totalGap;
  const petalArc = availableDegrees / count;
  const result = [];
  let currentAngle = -90;
  for (let i = 0; i < count; i++) {
    const start = currentAngle + gapAngle / 2;
    const end = start + petalArc;
    result.push({ startAngle: start, endAngle: end });
    currentAngle = end + gapAngle / 2;
  }
  return result;
}
function computeOuterPetalAngles(innerPetal, count, gapAngle) {
  if (count === 0) return [];
  const midAngle = (innerPetal.startAngle + innerPetal.endAngle) / 2;
  const totalGap = gapAngle * count;
  const maxArc = Math.min(180, count * 45);
  const availableArc = maxArc - totalGap;
  const petalArc = availableArc / count;
  const result = [];
  let startOffset = midAngle - maxArc / 2;
  for (let i = 0; i < count; i++) {
    const start = startOffset + gapAngle / 2;
    const end = start + petalArc;
    result.push({ startAngle: start, endAngle: end });
    startOffset = end + gapAngle / 2;
  }
  return result;
}
function hitTestRing(dx, dy, petals, innerR, outerR) {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < innerR || dist > outerR * 1.2) return -1;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  for (let i = 0; i < petals.length; i++) {
    const petal = petals[i];
    let start = petal.startAngle;
    let end = petal.endAngle;
    let testAngle = angle;
    if (start < -180) {
      start += 360;
      end += 360;
      if (testAngle < 0) testAngle += 360;
    }
    if (testAngle >= start && testAngle <= end) return i;
    if (testAngle + 360 >= start && testAngle + 360 <= end) return i;
  }
  return -1;
}
function hitTestRadial(dx, dy) {
  const { innerRadius, outerRadius } = radialConfig.appearance;
  const outerRingInner = outerRadius + 8;
  const outerRingOuter = outerRingInner + (outerRadius - innerRadius);
  if (menuState.outerRingOpen && menuState.outerPetals.length > 0) {
    const outerIdx = hitTestRing(
      dx,
      dy,
      menuState.outerPetals,
      outerRingInner,
      outerRingOuter
    );
    if (outerIdx >= 0) return { ring: "outer", index: outerIdx };
  }
  const innerIdx = hitTestRing(
    dx,
    dy,
    menuState.innerPetals,
    innerRadius,
    outerRadius
  );
  if (innerIdx >= 0) return { ring: "inner", index: innerIdx };
  return { ring: "none", index: -1 };
}
function composeMenu(context) {
  const categoryActions = /* @__PURE__ */ new Map();
  const categories = /* @__PURE__ */ new Map();
  for (const provider of providers) {
    const actions = provider.getActions(context);
    if (actions.length === 0) continue;
    const catId = provider.category.id;
    if (!categories.has(catId)) {
      categories.set(catId, provider.category);
      categoryActions.set(catId, []);
    }
    categoryActions.get(catId).push(...actions);
  }
  const sortedCategories = Array.from(categories.values()).sort(
    (a, b) => a.priority - b.priority
  );
  const gapAngle = radialConfig.appearance.gapAngle;
  const angles = computePetalAngles(sortedCategories.length, gapAngle);
  const innerPetals = sortedCategories.map((cat, i) => {
    const actions = categoryActions.get(cat.id) ?? [];
    const anyEnabled = actions.some((a) => a.enabled);
    return {
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
      tone: cat.tone,
      enabled: anyEnabled,
      startAngle: angles[i].startAngle,
      endAngle: angles[i].endAngle,
      childCount: actions.length
    };
  });
  return { innerPetals, actionsByCategory: categoryActions };
}
function getRadialMenuState() {
  return menuState;
}
function getResolvedActionsForCategory(categoryId) {
  return [...resolvedActions.get(categoryId) ?? []];
}
function openRadialMenu(screenX, screenY, context) {
  const { innerPetals, actionsByCategory } = composeMenu(context);
  if (innerPetals.length === 0) return;
  resolvedActions = actionsByCategory;
  menuState = {
    open: true,
    centerX: screenX,
    centerY: screenY,
    innerPetals,
    outerPetals: [],
    innerHoveredIndex: -1,
    outerHoveredIndex: -1,
    outerRingOpen: false,
    expandedInnerIndex: -1,
    context
  };
}
function updateRadialHover(screenX, screenY) {
  if (!menuState.open) return;
  const dx = screenX - menuState.centerX;
  const dy = screenY - menuState.centerY;
  const hit = hitTestRadial(dx, dy);
  if (hit.ring === "outer") {
    menuState.outerHoveredIndex = hit.index;
    menuState.innerHoveredIndex = menuState.expandedInnerIndex;
  } else if (hit.ring === "inner") {
    menuState.innerHoveredIndex = hit.index;
    menuState.outerHoveredIndex = -1;
    if (hit.index !== menuState.expandedInnerIndex) {
      expandOuterRing(hit.index);
    }
  } else {
    menuState.innerHoveredIndex = -1;
    menuState.outerHoveredIndex = -1;
    if (menuState.outerRingOpen) {
      menuState.outerRingOpen = false;
      menuState.outerPetals = [];
      menuState.expandedInnerIndex = -1;
    }
  }
}
function expandOuterRing(innerIndex) {
  const innerPetal = menuState.innerPetals[innerIndex];
  if (!innerPetal) return;
  const actions = resolvedActions.get(innerPetal.id);
  if (!actions || actions.length === 0) return;
  if (actions.length === 1) {
    menuState.outerRingOpen = false;
    menuState.outerPetals = [];
    menuState.expandedInnerIndex = innerIndex;
    return;
  }
  const gapAngle = radialConfig.appearance.gapAngle;
  const angles = computeOuterPetalAngles(innerPetal, actions.length, gapAngle);
  const outerPetals = actions.map((action, i) => ({
    id: action.id,
    label: action.label,
    icon: action.icon,
    tone: action.tone,
    enabled: action.enabled,
    disabledReason: action.disabledReason,
    startAngle: angles[i].startAngle,
    endAngle: angles[i].endAngle,
    childCount: 0
  }));
  menuState.outerRingOpen = true;
  menuState.outerPetals = outerPetals;
  menuState.expandedInnerIndex = innerIndex;
}
function confirmRadialSelection() {
  if (!menuState.open || !menuState.context) return;
  if (menuState.outerRingOpen && menuState.outerHoveredIndex >= 0 && menuState.expandedInnerIndex >= 0) {
    const innerPetal = menuState.innerPetals[menuState.expandedInnerIndex];
    const actions = resolvedActions.get(innerPetal.id);
    if (actions) {
      const action = actions[menuState.outerHoveredIndex];
      if (action?.enabled) {
        action.onExecute(menuState.context);
      }
    }
    closeRadialMenu();
    return;
  }
  if (menuState.innerHoveredIndex >= 0) {
    const innerPetal = menuState.innerPetals[menuState.innerHoveredIndex];
    const actions = resolvedActions.get(innerPetal.id);
    if (actions && actions.length === 1 && actions[0].enabled) {
      actions[0].onExecute(menuState.context);
    }
  }
  closeRadialMenu();
}
function closeRadialMenu() {
  menuState = closedState();
  resolvedActions.clear();
}
function resetRadialMenu() {
  closeRadialMenu();
}
function getRadialGeometry() {
  const { innerRadius, outerRadius } = radialConfig.appearance;
  return {
    innerRingInner: innerRadius,
    innerRingOuter: outerRadius,
    outerRingInner: outerRadius + 8,
    outerRingOuter: outerRadius + 8 + (outerRadius - innerRadius)
  };
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4e3;
let nextId = 1;
let toasts = [];
let mutedCategories = /* @__PURE__ */ new Set();
const listeners$1 = /* @__PURE__ */ new Set();
const timers = /* @__PURE__ */ new Map();
function notify$1() {
  for (const listener of listeners$1) {
    listener();
  }
}
function subscribeToasts(listener) {
  listeners$1.add(listener);
  return () => listeners$1.delete(listener);
}
let _visibleCache = [];
let _visibleCacheSource = [];
function getVisibleToasts() {
  if (toasts === _visibleCacheSource) return _visibleCache;
  _visibleCacheSource = toasts;
  _visibleCache = toasts.slice(0, MAX_VISIBLE);
  return _visibleCache;
}
function pushToast(category, title, message, duration = DEFAULT_DURATION) {
  if (mutedCategories.has(category)) return "";
  const id = `toast-${nextId++}`;
  const toast = {
    id,
    category,
    title,
    message,
    createdAt: Date.now(),
    duration
  };
  toasts = [toast, ...toasts];
  if (toasts.length > 10) {
    const removed = toasts.splice(10);
    for (const r of removed) {
      const timer = timers.get(r.id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(r.id);
      }
    }
  }
  if (duration > 0) {
    const timer = setTimeout(() => {
      dismissToast(id);
    }, duration);
    timers.set(id, timer);
  }
  notify$1();
  return id;
}
function dismissToast(id) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  notify$1();
}
function dismissAllToasts() {
  for (const [_, timer] of timers) {
    clearTimeout(timer);
  }
  timers.clear();
  toasts = [];
  notify$1();
}
function muteCategory(category) {
  mutedCategories.add(category);
}
function unmuteCategory(category) {
  mutedCategories.delete(category);
}
function isCategoryMuted(category) {
  return mutedCategories.has(category);
}
function getMutedCategories() {
  return Array.from(mutedCategories);
}
function _reset() {
  for (const [_, timer] of timers) {
    clearTimeout(timer);
  }
  timers.clear();
  toasts = [];
  mutedCategories = /* @__PURE__ */ new Set();
  nextId = 1;
  notify$1();
}

const listeners = /* @__PURE__ */ new Set();
function notify() {
  for (const listener of listeners) {
    listener();
  }
}
function subscribeSelection(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSelectedUnitInfo() {
  for (const entity of units) {
    const unit = entity.get(Unit);
    if (!unit?.selected) continue;
    const identity = entity.get(Identity);
    if (!identity) continue;
    const pos = entity.get(WorldPosition);
    if (!pos) continue;
    return {
      entityId: identity.id,
      faction: identity.faction,
      type: "unit",
      unitType: unit.type,
      displayName: unit.displayName,
      markLevel: unit.markLevel,
      turnState: getUnitTurnState(identity.id),
      worldX: pos.x,
      worldY: pos.y,
      worldZ: pos.z
    };
  }
  for (const entity of buildings) {
    const building = entity.get(Building);
    if (!building?.selected) continue;
    const identity = entity.get(Identity);
    if (!identity) continue;
    const pos = entity.get(WorldPosition);
    if (!pos) continue;
    return {
      entityId: identity.id,
      faction: identity.faction,
      type: "building",
      unitType: building.type,
      displayName: building.type.replace(/_/g, " "),
      markLevel: 0,
      turnState: getUnitTurnState(identity.id),
      worldX: pos.x,
      worldY: pos.y,
      worldZ: pos.z
    };
  }
  return null;
}
function notifySelectionChanged() {
  notify();
}
function deselectAll() {
  for (const u of units) {
    u.get(Unit).selected = false;
  }
  for (const b of buildings) {
    b.get(Building).selected = false;
  }
  notify();
}
function selectEntity(entity) {
  deselectAllSilent();
  const unit = entity.get(Unit);
  if (unit) {
    unit.selected = true;
    queueThought("first_selection");
  }
  const building = entity.get(Building);
  if (building) {
    building.selected = true;
  }
  notify();
}
function deselectAllSilent() {
  for (const u of units) {
    u.get(Unit).selected = false;
  }
  for (const b of buildings) {
    b.get(Building).selected = false;
  }
}

function findEntityById(id) {
  if (!id) return null;
  return world.entities.find((e) => e.get(Identity)?.id === id) ?? null;
}
function getSelectedBotProfile(ctx) {
  const entity = findEntityById(ctx.targetEntityId);
  const unit = entity?.get(Unit);
  return unit ? getBotCommandProfile(unit.type) : null;
}
function isSelectedBotCategoryAllowed(ctx, categoryId) {
  const entity = findEntityById(ctx.targetEntityId);
  const unit = entity?.get(Unit);
  if (!unit) {
    return true;
  }
  return isBotCategoryAllowed(unit.type, categoryId);
}
function awardXPToActor(entityId, action) {
  if (!entityId) return;
  const entity = findEntityById(entityId);
  const unit = entity?.get(Unit);
  if (!unit) return;
  awardXP(entityId, unit.archetypeId, action, unit.markLevel);
}
registerRadialProvider({
  id: "movement",
  category: {
    id: "move",
    label: "Move",
    icon: "arrow",
    tone: "default",
    priority: 10
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "unit") return [];
    if (ctx.targetFaction !== "player") return [];
    if (!isSelectedBotCategoryAllowed(ctx, "move")) return [];
    const profile = getSelectedBotProfile(ctx);
    if (!profile?.canMove) return [];
    const unitHasMP = ctx.targetEntityId ? hasMovementPoints(ctx.targetEntityId) : false;
    return [
      {
        id: "move_to",
        label: "Move",
        icon: "arrow",
        tone: "default",
        enabled: unitHasMP,
        disabledReason: unitHasMP ? void 0 : "No MP remaining",
        onExecute: () => {
        }
      },
      ...profile.canPatrol ? [
        {
          id: "patrol",
          label: "Patrol",
          icon: "loop",
          tone: "default",
          enabled: unitHasMP,
          disabledReason: unitHasMP ? void 0 : "No MP remaining",
          onExecute: () => {
            const entity = findEntityById(ctx.targetEntityId ?? null);
            if (!entity || !ctx.targetEntityId) return;
            if (!hasMovementPoints(ctx.targetEntityId)) {
              pushToast("system", "No MP", "No movement points to patrol");
              return;
            }
            const pos = entity.get(WorldPosition);
            if (!pos) return;
            const angle = gameplayRandom() * Math.PI * 2;
            const dist = 4 + gameplayRandom() * 6;
            issueMoveCommand(ctx.targetEntityId, {
              x: pos.x + Math.cos(angle) * dist,
              y: pos.y,
              z: pos.z + Math.sin(angle) * dist
            });
          }
        }
      ] : []
    ];
  }
});
registerRadialProvider({
  id: "combat",
  category: {
    id: "combat",
    label: "Combat",
    icon: "sword",
    tone: "combat",
    priority: 20
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "unit") return [];
    if (ctx.targetFaction !== "player") return [];
    if (!isSelectedBotCategoryAllowed(ctx, "combat")) return [];
    const profile = getSelectedBotProfile(ctx);
    if (!profile) return [];
    const unitHasAP = ctx.targetEntityId ? hasActionPoints(ctx.targetEntityId) : false;
    const noApReason = unitHasAP ? void 0 : "No AP remaining";
    const actions = [];
    if (profile.canAttack) {
      actions.push({
        id: "attack",
        label: "Attack",
        icon: "sword",
        tone: "combat",
        enabled: unitHasAP,
        disabledReason: noApReason,
        onExecute: () => {
          const entity = findEntityById(ctx.targetEntityId ?? null);
          if (!entity || !ctx.targetEntityId) return;
          const pos = entity.get(WorldPosition);
          const identity = entity.get(Identity);
          if (!pos || !identity) return;
          let nearestPos = null;
          let nearestDist = Infinity;
          for (const candidate of units) {
            const cId = candidate.get(Identity);
            if (!cId || !areFactionsHostile(identity.faction, cId.faction))
              continue;
            const cPos = candidate.get(WorldPosition);
            if (!cPos) continue;
            const dx = cPos.x - pos.x;
            const dz = cPos.z - pos.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < nearestDist) {
              nearestDist = d;
              nearestPos = { x: cPos.x, y: cPos.y, z: cPos.z };
            }
          }
          if (!nearestPos) {
            pushToast("combat", "No target", "No hostiles nearby to engage");
            return;
          }
          if (nearestDist <= 2.5) {
            pushToast(
              "combat",
              "Engaging",
              "Attacking — hold position to continue"
            );
            return;
          }
          if (hasMovementPoints(ctx.targetEntityId)) {
            issueMoveCommand(ctx.targetEntityId, nearestPos);
            awardXPToActor(ctx.targetEntityId, "combat");
          } else {
            pushToast(
              "combat",
              "No MP",
              "No movement points to close on target"
            );
          }
        }
      });
    }
    if (profile.canHack) {
      actions.push({
        id: "hack",
        label: "Hack",
        icon: "signal",
        tone: "signal",
        enabled: unitHasAP,
        disabledReason: noApReason,
        onExecute: () => {
          const hackerEntity = findEntityById(ctx.targetEntityId ?? null);
          if (!hackerEntity || !ctx.targetEntityId) return;
          if (!hasActionPoints(ctx.targetEntityId)) return;
          const hackerPos = hackerEntity.get(WorldPosition);
          if (!hackerPos) return;
          for (const candidate of units) {
            const cId = candidate.get(Identity);
            if (!cId || cId.faction === "player") continue;
            const cPos = candidate.get(WorldPosition);
            if (!cPos) continue;
            const dx = cPos.x - hackerPos.x;
            const dz = cPos.z - hackerPos.z;
            if (Math.sqrt(dx * dx + dz * dz) > HACK_RANGE) continue;
            const check = checkHackEligibility(hackerEntity, candidate);
            if (!check.canHack) continue;
            if (initiateHack(hackerEntity, candidate)) {
              spendActionPoint(ctx.targetEntityId, 1);
              awardXPToActor(ctx.targetEntityId, "hack");
            }
            return;
          }
          pushToast(
            "system",
            "No hack target",
            `No hackable units within ${HACK_RANGE}m`
          );
        }
      });
    }
    if (profile.canFortify) {
      actions.push({
        id: "fortify",
        label: "Fortify",
        icon: "city",
        tone: "power",
        enabled: unitHasAP,
        disabledReason: noApReason,
        onExecute: () => {
          if (!ctx.targetEntityId) return;
          spendActionPoint(ctx.targetEntityId, 1);
          awardXPToActor(ctx.targetEntityId, "fortify");
          logTurnEvent("combat", ctx.targetEntityId, "player", {
            message: "Unit holds position — taunt active"
          });
        }
      });
    }
    return actions;
  }
});
registerRadialProvider({
  id: "hack_capture",
  category: {
    id: "hack_capture",
    label: "Capture",
    icon: "signal",
    tone: "signal",
    priority: 21
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "unit" || !ctx.targetEntityId) return [];
    if (ctx.targetFaction === "player" || ctx.targetFaction === "cultist")
      return [];
    const targetEntity = findEntityById(ctx.targetEntityId);
    if (!targetEntity) return [];
    const selected = getSelectedUnitInfo();
    if (!selected || selected.type !== "unit" || selected.faction !== "player")
      return [];
    const hackerEntity = findEntityById(selected.entityId);
    if (!hackerEntity) return [];
    const hackerPos = hackerEntity.get(WorldPosition);
    const targetPos = targetEntity.get(WorldPosition);
    if (!hackerPos || !targetPos) return [];
    const dx = hackerPos.x - targetPos.x;
    const dz = hackerPos.z - targetPos.z;
    if (Math.sqrt(dx * dx + dz * dz) > HACK_RANGE) return [];
    const check = checkHackEligibility(hackerEntity, targetEntity);
    if (!check.canHack) return [];
    const unitHasAP = hasActionPoints(selected.entityId);
    return [
      {
        id: "hack",
        label: "Hack",
        icon: "signal",
        tone: "signal",
        enabled: unitHasAP,
        disabledReason: unitHasAP ? void 0 : "No AP remaining",
        onExecute: () => {
          if (unitHasAP) {
            spendActionPoint(selected.entityId, 1);
            initiateHack(hackerEntity, targetEntity);
            awardXPToActor(selected.entityId, "hack");
          }
        }
      }
    ];
  }
});
function makeBuildAction(id, label, icon, tone, buildingType, resources, unitHasAP, ctx) {
  const costs = BUILDING_COSTS[buildingType];
  if (!costs) return null;
  const canAfford = costs.every(
    (cost) => (resources[cost.type] ?? 0) >= cost.amount
  );
  const disabledReason = !unitHasAP ? "No AP remaining" : !canAfford ? "Insufficient materials" : void 0;
  return {
    id,
    label,
    icon,
    tone,
    enabled: canAfford && unitHasAP,
    disabledReason,
    onExecute: () => {
      if (ctx.selectionType === "unit" && ctx.targetEntityId) {
        spendActionPoint(ctx.targetEntityId, 1);
        awardXPToActor(ctx.targetEntityId, "build");
      }
      setActivePlacement(
        buildingType,
        ctx.targetEntityId ?? void 0
      );
    }
  };
}
registerRadialProvider({
  id: "build",
  category: {
    id: "build",
    label: "Build",
    icon: "gear",
    tone: "default",
    priority: 30
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "empty_sector" && ctx.selectionType !== "unit") {
      return [];
    }
    const profile = ctx.selectionType === "unit" ? getSelectedBotProfile(ctx) : null;
    if (ctx.selectionType === "unit" && !profile) {
      return [];
    }
    if (ctx.selectionType === "unit" && !isSelectedBotCategoryAllowed(ctx, "build")) {
      return [];
    }
    if (ctx.selectionType === "unit" && !canUnitBuild(ctx.targetEntityId)) {
      return [];
    }
    const resources = getResources();
    const unitHasAP = ctx.selectionType === "unit" && ctx.targetEntityId ? hasActionPoints(ctx.targetEntityId) : true;
    const actions = [];
    if (ctx.selectionType === "empty_sector" || profile?.canBuildRod) {
      const action = makeBuildAction(
        "build_rod",
        "Rod",
        "bolt",
        "power",
        "lightning_rod",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    if (ctx.selectionType === "empty_sector" || profile?.canBuildFabricator) {
      const action = makeBuildAction(
        "build_fab",
        "Fabricator",
        "gear",
        "signal",
        "fabrication_unit",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    {
      const action = makeBuildAction(
        "build_motor_pool",
        "Motor Pool",
        "gear",
        "power",
        "motor_pool",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    if (ctx.selectionType === "empty_sector" || profile?.canBuildRelay) {
      const action = makeBuildAction(
        "build_relay",
        "Relay",
        "signal",
        "signal",
        "relay_tower",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    {
      const action = makeBuildAction(
        "build_turret",
        "Turret",
        "sword",
        "combat",
        "defense_turret",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    {
      const action = makeBuildAction(
        "build_power_sink",
        "Power Sink",
        "bolt",
        "power",
        "power_sink",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    {
      const action = makeBuildAction(
        "build_storage",
        "Storage",
        "gear",
        "default",
        "storage_hub",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    {
      const action = makeBuildAction(
        "build_habitat",
        "Habitat",
        "city",
        "signal",
        "habitat_module",
        resources,
        unitHasAP,
        ctx
      );
      if (action) actions.push(action);
    }
    if (profile?.canEstablishSubstation) {
      actions.push({
        id: "build_substation",
        label: "Establish",
        icon: "city",
        tone: "power",
        enabled: unitHasAP,
        disabledReason: unitHasAP ? void 0 : "No AP remaining",
        onExecute: () => {
          if (ctx.targetEntityId) {
            spendActionPoint(ctx.targetEntityId, 1);
            awardXPToActor(ctx.targetEntityId, "found");
          }
          setCitySiteModalOpen(true, getRuntimeState().nearbyPoi);
        }
      });
    }
    return actions;
  }
});
registerRadialProvider({
  id: "repair",
  category: {
    id: "repair",
    label: "Repair",
    icon: "wrench",
    tone: "power",
    priority: 40
  },
  getActions: (ctx) => {
    const profile = getSelectedBotProfile(ctx);
    if (!isSelectedBotCategoryAllowed(ctx, "repair")) return [];
    if (!profile?.canRepair) return [];
    const entity = findEntityById(ctx.targetEntityId);
    if (!entity) return [];
    if (ctx.targetFaction !== "player") return [];
    const unitComp = entity.get(Unit);
    const buildingComp = entity.get(Building);
    const components = unitComp?.components ?? buildingComp?.components ?? [];
    const broken = components.filter((c) => !c.functional);
    if (broken.length === 0) return [];
    const repairer = Array.from(units).find((u) => {
      if (u.get(Identity)?.id === ctx.targetEntityId) return false;
      if (u.get(Identity)?.faction !== "player") return false;
      const hasArms = u.get(Unit)?.components.some((c) => c.name === "arms" && c.functional);
      if (!hasArms) return false;
      const uPos = u.get(WorldPosition);
      const ePos = entity.get(WorldPosition);
      if (!uPos || !ePos) return false;
      const dx = uPos.x - ePos.x;
      const dz = uPos.z - ePos.z;
      return Math.sqrt(dx * dx + dz * dz) < 3;
    });
    const unitHasAP = ctx.targetEntityId ? hasActionPoints(ctx.targetEntityId) : false;
    const repairDisabledReason = !unitHasAP ? "No AP remaining" : !repairer ? "No repairer nearby" : void 0;
    return broken.map((comp) => ({
      id: `repair_${comp.name}`,
      label: comp.name.replace(/_/g, " "),
      icon: "wrench",
      tone: "power",
      enabled: !!repairer && unitHasAP,
      disabledReason: repairDisabledReason,
      onExecute: () => {
        if (repairer && ctx.targetEntityId) {
          spendActionPoint(ctx.targetEntityId, 1);
          awardXPToActor(ctx.targetEntityId, "repair");
          startRepair(repairer, entity, comp.name);
        }
      }
    }));
  }
});
registerRadialProvider({
  id: "fabrication",
  category: {
    id: "fabricate",
    label: "Fabricate",
    icon: "gear",
    tone: "default",
    priority: 35
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "unit" && ctx.selectionType !== "building") {
      return [];
    }
    const entity = findEntityById(ctx.targetEntityId);
    if (!entity) return [];
    const profile = entity.get(Unit) ? getBotCommandProfile(entity.get(Unit).type) : null;
    if (entity.get(Unit) && !isSelectedBotCategoryAllowed(ctx, "fabricate")) {
      return [];
    }
    if (!profile?.canFabricate) return [];
    const unit = entity.get(Unit);
    const building = entity.get(Building);
    if (!unit || unit.type !== "fabrication_unit") return [];
    if (!building?.powered || !building.operational) return [];
    const resources = getResources();
    const unitHasAP = ctx.targetEntityId ? hasActionPoints(ctx.targetEntityId) : false;
    return RECIPES.map((recipe) => {
      const canAfford = recipe.costs.every(
        (cost) => (resources[cost.type] ?? 0) >= cost.amount
      );
      const fabDisabledReason = !unitHasAP ? "No AP remaining" : !canAfford ? "Insufficient materials" : void 0;
      return {
        id: `fab_${recipe.name}`,
        label: recipe.name.replace(/_/g, " "),
        icon: "gear",
        tone: "default",
        enabled: canAfford && unitHasAP,
        disabledReason: fabDisabledReason,
        onExecute: () => {
          if (ctx.targetEntityId) {
            spendActionPoint(ctx.targetEntityId, 1);
            awardXPToActor(ctx.targetEntityId, "build");
          }
          startFabrication(entity, recipe.name);
        }
      };
    });
  }
});
registerRadialProvider({
  id: "motor_pool",
  category: {
    id: "motor_pool",
    label: "Motor Pool",
    icon: "gear",
    tone: "power",
    priority: 36
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "building") return [];
    const entity = findEntityById(ctx.targetEntityId);
    if (!entity) return [];
    const building = entity.get(Building);
    if (!building || building.type !== "motor_pool") return [];
    if (!building.powered || !building.operational) return [];
    const entityId = ctx.targetEntityId;
    if (!entityId) return [];
    const poolState = getMotorPoolState(entityId);
    if (!poolState) return [];
    const tierConfig = MOTOR_POOL_TIER_CONFIG[poolState.tier];
    const queueFull = poolState.queue.length >= tierConfig.maxQueue;
    const resources = getResources();
    const actions = [];
    for (const recipe of BOT_FABRICATION_RECIPES) {
      const canAfford = recipe.costs.every(
        (cost) => (resources[cost.type] ?? 0) >= cost.amount
      );
      actions.push({
        id: `mp_fab_${recipe.botType}`,
        label: recipe.label,
        icon: "gear",
        tone: "power",
        enabled: canAfford && !queueFull,
        onExecute: () => queueBotFabrication(entityId, recipe.botType)
      });
    }
    if (poolState.tier !== "elite") {
      const nextTier = poolState.tier === "basic" ? "Advanced" : "Elite";
      actions.push({
        id: "mp_upgrade",
        label: `Upgrade → ${nextTier}`,
        icon: "bolt",
        tone: "signal",
        enabled: true,
        onExecute: () => upgradeMotorPool(entityId)
      });
    }
    return actions;
  }
});
const MARK_UPGRADE_RANGE = 5;
registerRadialProvider({
  id: "mark_upgrade",
  category: {
    id: "upgrade",
    label: "Upgrade",
    icon: "bolt",
    tone: "signal",
    priority: 37
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "unit") return [];
    if (ctx.targetFaction !== "player") return [];
    const entity = findEntityById(ctx.targetEntityId);
    if (!entity) return [];
    const unit = entity.get(Unit);
    if (!unit) return [];
    const entityPos = entity.get(WorldPosition);
    if (!entityPos) return [];
    const nearbyMotorPool = Array.from(buildings).find((b) => {
      const building = b.get(Building);
      if (!building || building.type !== "motor_pool") return false;
      if (!building.powered || !building.operational) return false;
      if (b.get(Identity)?.faction !== "player") return false;
      const bPos = b.get(WorldPosition);
      if (!bPos) return false;
      const dx = entityPos.x - bPos.x;
      const dz = entityPos.z - bPos.z;
      return Math.sqrt(dx * dx + dz * dz) <= MARK_UPGRADE_RANGE;
    });
    if (!nearbyMotorPool) return [];
    const unitHasAP = ctx.targetEntityId ? hasActionPoints(ctx.targetEntityId) : false;
    const xpState = ctx.targetEntityId ? getUnitExperience(ctx.targetEntityId) : void 0;
    const xpEligible = xpState?.upgradeEligible ?? false;
    const progress = ctx.targetEntityId ? getXPProgress(ctx.targetEntityId) : 0;
    const currentMark = xpState?.currentMark ?? unit.markLevel;
    const upgradeCost = getMarkUpgradeCost(currentMark);
    const resources = getResources();
    const canAfford = upgradeCost ? upgradeCost.costs.every(
      (cost) => (resources[cost.type] ?? 0) >= cost.amount
    ) : false;
    const motorPoolId = nearbyMotorPool.get(Identity)?.id;
    const tierAllows = motorPoolId && upgradeCost ? canMotorPoolUpgradeMark(motorPoolId, upgradeCost.toMark) : false;
    const canUpgrade = xpEligible && canAfford && tierAllows;
    const disabledReason = !unitHasAP ? "No AP remaining" : !xpEligible ? `XP: ${Math.round(progress * 100)}% to Mark ${currentMark + 1}` : !canAfford ? "Insufficient resources" : !tierAllows ? "Motor Pool tier too low" : void 0;
    return [
      {
        id: "mark_upgrade",
        label: `Mark ${currentMark} → ${currentMark + 1}`,
        icon: "bolt",
        tone: "signal",
        enabled: canUpgrade && unitHasAP,
        disabledReason,
        onExecute: () => {
          if (ctx.targetEntityId && canUpgrade && upgradeCost) {
            for (const cost of upgradeCost.costs) {
              spendResource(cost.type, cost.amount);
            }
            spendActionPoint(ctx.targetEntityId, 1);
            const success = applyMarkUpgrade(ctx.targetEntityId);
            if (success) {
              const upgradeEntity = findEntityById(ctx.targetEntityId);
              const currentUnit = upgradeEntity?.get(Unit);
              if (upgradeEntity && currentUnit) {
                upgradeEntity.set(Unit, {
                  ...currentUnit,
                  markLevel: upgradeCost.toMark
                });
              }
              logTurnEvent("fabrication", ctx.targetEntityId, "player", {
                action: "mark_upgrade",
                newMark: upgradeCost.toMark
              });
            }
          }
        }
      }
    ];
  }
});
const HARVEST_SCAN_RANGE = 4;
registerRadialProvider({
  id: "harvest",
  category: {
    id: "harvest",
    label: "Harvest",
    icon: "pickaxe",
    tone: "power",
    priority: 36
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "unit") return [];
    if (ctx.targetFaction !== "player") return [];
    if (!isSelectedBotCategoryAllowed(ctx, "harvest")) return [];
    const profile = getSelectedBotProfile(ctx);
    if (!profile?.canHarvest) return [];
    const entity = findEntityById(ctx.targetEntityId);
    if (!entity) return [];
    const entityPos = entity.get(WorldPosition);
    if (!entityPos) return [];
    const unitHasAP = ctx.targetEntityId ? hasActionPoints(ctx.targetEntityId) : false;
    const actions = [];
    if (ctx.targetSector && ctx.targetEntityId) {
      const tile = getTile(ctx.targetSector.q, ctx.targetSector.r, 0);
      if (tile && tile.passable && !tile.modelId && isFloorHarvestable(tile.floorMaterial) && !isFloorTileConsumed(ctx.targetSector.q, ctx.targetSector.r, 0)) {
        const worldPos = gridToWorld(ctx.targetSector.q, ctx.targetSector.r);
        const dx = worldPos.x - entityPos.x;
        const dz = worldPos.z - entityPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= HARVEST_SCAN_RANGE) {
          const pool = getResourcePoolForFloorMaterial(tile.floorMaterial);
          actions.push({
            id: "harvest_floor",
            label: pool.label,
            icon: "pickaxe",
            tone: "power",
            enabled: unitHasAP,
            disabledReason: unitHasAP ? void 0 : "No AP remaining",
            onExecute: () => {
              if (ctx.targetEntityId) {
                spendActionPoint(ctx.targetEntityId, 1);
                awardXPToActor(ctx.targetEntityId, "harvest");
                startFloorHarvest(
                  ctx.targetEntityId,
                  ctx.targetSector.q,
                  ctx.targetSector.r,
                  0,
                  tile.floorMaterial
                );
              }
            }
          });
        }
      }
    }
    const session = getActiveWorldSession();
    if (session) {
      for (const structure of session.sectorStructures) {
        if (isStructureConsumed(structure.id)) continue;
        const family = structure.placement_layer;
        if (!isHarvestable(family)) continue;
        const worldPos = gridToWorld(structure.q, structure.r);
        const dx = worldPos.x + structure.offset_x - entityPos.x;
        const dz = worldPos.z + structure.offset_z - entityPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > HARVEST_SCAN_RANGE) continue;
        const pool = getResourcePoolForModel(family, structure.model_id);
        const _yieldPreview = pool.yields.map((y) => `${y.min}-${y.max} ${y.resource.replace(/_/g, " ")}`).join(", ");
        actions.push({
          id: `harvest_${structure.id}`,
          label: `${pool.label}`,
          icon: "pickaxe",
          tone: "power",
          enabled: unitHasAP,
          disabledReason: unitHasAP ? void 0 : "No AP remaining",
          onExecute: () => {
            if (ctx.targetEntityId) {
              spendActionPoint(ctx.targetEntityId, 1);
              awardXPToActor(ctx.targetEntityId, "harvest");
              startHarvest(
                ctx.targetEntityId,
                structure.id,
                structure.model_id,
                family,
                worldPos.x + structure.offset_x,
                worldPos.z + structure.offset_z
              );
            }
          }
        });
        if (actions.length >= 6) break;
      }
    }
    return actions;
  }
});
registerRadialProvider({
  id: "sim_control",
  category: {
    id: "system",
    label: "System",
    icon: "gear",
    tone: "default",
    priority: 90
  },
  getActions: () => {
    return [
      {
        id: "pause_toggle",
        label: "Pause",
        icon: "pause",
        tone: "default",
        enabled: true,
        onExecute: () => togglePause()
      },
      {
        id: "speed_05x",
        label: "0.5x",
        icon: "slow",
        tone: "default",
        enabled: true,
        onExecute: () => setGameSpeed(0.5)
      },
      {
        id: "speed_1x",
        label: "1x",
        icon: "normal",
        tone: "default",
        enabled: true,
        onExecute: () => setGameSpeed(1)
      },
      {
        id: "speed_2x",
        label: "2x",
        icon: "fast",
        tone: "power",
        enabled: true,
        onExecute: () => setGameSpeed(2)
      },
      {
        id: "city_lab",
        label: "Lab",
        icon: "city",
        tone: "signal",
        enabled: true,
        onExecute: () => openCityKitLab()
      }
    ];
  }
});
registerRadialProvider({
  id: "survey",
  category: {
    id: "survey",
    label: "Survey",
    icon: "eye",
    tone: "default",
    priority: 50
  },
  getActions: (ctx) => {
    if (ctx.selectionType !== "empty_sector" && ctx.selectionType !== "resource_node") {
      if (!isSelectedBotCategoryAllowed(ctx, "survey")) {
        return [];
      }
      const profile = getSelectedBotProfile(ctx);
      if (!profile?.canSurvey) {
        return [];
      }
    }
    const runtime = getRuntimeState();
    const session = getActiveWorldSession();
    const mode = runtime.activeScene === "city" ? "city" : "world";
    const context = runtime.citySiteModalContext ?? runtime.nearbyPoi;
    const actions = [
      {
        id: "brief_sector",
        label: "Brief",
        icon: "eye",
        tone: "default",
        enabled: true,
        onExecute: () => {
          setCitySiteModalOpen(true, runtime.nearbyPoi);
        }
      }
    ];
    if (!context || !session) {
      return actions;
    }
    const city = context.cityInstanceId == null ? null : session.cityInstances.find(
      (candidate) => candidate.id === context.cityInstanceId
    ) ?? null;
    const viewModel = getCitySiteViewModel({ city, context, mode });
    const unitHasAP = ctx.selectionType === "unit" && ctx.targetEntityId ? hasActionPoints(ctx.targetEntityId) : true;
    if (viewModel.actions.some((a) => a.id === "survey") && city) {
      actions.push({
        id: "site_survey",
        label: "Survey",
        icon: "eye",
        tone: "default",
        enabled: unitHasAP,
        disabledReason: unitHasAP ? void 0 : "No AP remaining",
        onExecute: () => {
          if (ctx.selectionType === "unit" && ctx.targetEntityId) {
            spendActionPoint(ctx.targetEntityId, 1);
            awardXPToActor(ctx.targetEntityId, "survey");
          }
          surveyCitySite(city.id);
        }
      });
    }
    if (viewModel.actions.some((a) => a.id === "found") && city) {
      const profile = ctx.selectionType === "unit" ? getSelectedBotProfile(ctx) : null;
      const canEstablish = ctx.selectionType !== "unit" || profile?.canEstablishSubstation === true;
      const establishReason = !unitHasAP ? "No AP remaining" : !canEstablish ? "Wrong unit role" : void 0;
      actions.push({
        id: "site_establish",
        label: "Establish",
        icon: "city",
        tone: "power",
        enabled: canEstablish && unitHasAP,
        disabledReason: establishReason,
        onExecute: () => {
          if (canEstablish) {
            if (ctx.selectionType === "unit" && ctx.targetEntityId) {
              spendActionPoint(ctx.targetEntityId, 1);
              awardXPToActor(ctx.targetEntityId, "found");
            }
            foundCitySite(city.id);
          }
        }
      });
    }
    if (viewModel.actions.some((a) => a.id === "enter") && city && mode === "world") {
      actions.push({
        id: "site_enter",
        label: "Enter",
        icon: "arrow",
        tone: "signal",
        enabled: true,
        onExecute: () => {
          enterCityInstance(city.id);
        }
      });
    }
    if (mode === "city") {
      actions.push({
        id: "site_return",
        label: "Return",
        icon: "arrow",
        tone: "default",
        enabled: true,
        onExecute: () => {
          returnToWorld();
        }
      });
    }
    return actions;
  }
});
registerRadialProvider({
  id: "city_interior",
  category: {
    id: "city",
    label: "City",
    icon: "city",
    tone: "signal",
    priority: 60
  },
  getActions: (ctx) => {
    if (ctx.selectionType === "none") return [];
    if (getRuntimeState().activeScene !== "city") return [];
    return [
      {
        id: "city_brief",
        label: "Brief",
        icon: "eye",
        tone: "signal",
        enabled: true,
        onExecute: () => {
          setCitySiteModalOpen(true, getRuntimeState().nearbyPoi);
        }
      },
      {
        id: "return_world",
        label: "Return",
        icon: "arrow",
        tone: "default",
        enabled: true,
        onExecute: () => returnToWorld()
      }
    ];
  }
});

void radialConfig;
const INNER_RADIUS = 110;
const OUTER_RADIUS = 70;
const BUTTON_SIZE = 64;
const SUB_BUTTON_SIZE = 52;
const CENTER_SIZE = 48;
const TONE_COLORS = {
  default: {
    border: "rgba(126, 231, 203, 0.4)",
    text: "#d9fff3",
    bg: "rgba(7, 17, 23, 0.88)",
    hover: "rgba(126, 231, 203, 0.18)"
  },
  power: {
    border: "rgba(246, 197, 106, 0.4)",
    text: "#ffe9b0",
    bg: "rgba(7, 17, 23, 0.88)",
    hover: "rgba(246, 197, 106, 0.18)"
  },
  combat: {
    border: "rgba(255, 120, 120, 0.4)",
    text: "#ffd7d7",
    bg: "rgba(7, 17, 23, 0.88)",
    hover: "rgba(255, 120, 120, 0.18)"
  },
  system: {
    border: "rgba(139, 230, 255, 0.4)",
    text: "#d0f4ff",
    bg: "rgba(7, 17, 23, 0.88)",
    hover: "rgba(139, 230, 255, 0.18)"
  }
};
function getToneColors(tone) {
  return TONE_COLORS[tone] ?? TONE_COLORS.default;
}
function angleForIndex(index, total) {
  return index / total * Math.PI * 2 - Math.PI / 2;
}
function positionAtAngle(centerX, centerY, angle, radius) {
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius
  };
}
function RadialButton({
  petal,
  x,
  y,
  size,
  isHovered,
  testIDPrefix
}) {
  const colors = getToneColors(petal.tone);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": `${testIDPrefix}-${petal.id}`,
      style: {
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        borderWidth: 1.5,
        borderStyle: "solid",
        borderColor: isHovered ? colors.text : colors.border,
        backgroundColor: isHovered ? colors.hover : colors.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: petal.enabled ? 1 : 0.4
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            style: {
              fontSize: size > 56 ? 20 : 16,
              color: colors.text,
              textAlign: "center"
            },
            children: petal.icon
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "data-testid": `radial-petal-label-${petal.label.toLowerCase()}`,
            style: {
              fontSize: 8,
              fontFamily: "monospace",
              letterSpacing: 1,
              color: !petal.enabled && petal.disabledReason ? "rgba(255, 140, 140, 0.7)" : colors.text,
              textTransform: "uppercase",
              marginTop: 2,
              textAlign: "center",
              overflow: "hidden",
              whiteSpace: "nowrap",
              maxWidth: size - 8
            },
            children: !petal.enabled && petal.disabledReason && isHovered ? petal.disabledReason : petal.label
          }
        ),
        petal.childCount > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              position: "absolute",
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: colors.border,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                style: {
                  fontSize: 8,
                  fontFamily: "monospace",
                  color: "#071117",
                  fontWeight: 700
                },
                children: petal.childCount
              }
            )
          }
        )
      ]
    }
  );
}
function RadialMenu() {
  const state = getRadialMenuState();
  const [vw, setVw] = reactExports.useState(window.innerWidth);
  const [vh, setVh] = reactExports.useState(window.innerHeight);
  const [visible, setVisible] = reactExports.useState(false);
  const [animScale, setAnimScale] = reactExports.useState(0.6);
  const [animOpacity, setAnimOpacity] = reactExports.useState(0);
  const wasOpen = reactExports.useRef(false);
  const pointerOrigin = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const handleResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  reactExports.useEffect(() => {
    if (state.open && !wasOpen.current) {
      setVisible(true);
      requestAnimationFrame(() => {
        setAnimScale(1);
        setAnimOpacity(1);
      });
    } else if (!state.open && wasOpen.current) {
      setAnimScale(0.6);
      setAnimOpacity(0);
      const t = setTimeout(() => setVisible(false), 150);
      return () => clearTimeout(t);
    }
    wasOpen.current = state.open;
  }, [state.open]);
  const handlePointerDown = (e) => {
    pointerOrigin.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerMove = (e) => {
    if (!state.open || !pointerOrigin.current) return;
    updateRadialHover(
      state.centerX + (e.clientX - pointerOrigin.current.x),
      state.centerY + (e.clientY - pointerOrigin.current.y)
    );
  };
  const handlePointerUp = () => {
    if (!state.open) return;
    confirmRadialSelection();
    pointerOrigin.current = null;
  };
  if (!state.open && !visible) return null;
  const cx = Math.max(
    INNER_RADIUS + 40,
    Math.min(vw - INNER_RADIUS - 40, state.centerX)
  );
  const cy = Math.max(
    INNER_RADIUS + 40,
    Math.min(vh - INNER_RADIUS - 40, state.centerY)
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-testid": "radial-menu",
      className: "absolute inset-0",
      style: { zIndex: 60, pointerEvents: "none" },
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "aria-label": "Close radial menu",
            className: "absolute inset-0 w-full h-full",
            style: {
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              pointerEvents: "auto",
              border: "none",
              cursor: "default"
            },
            onClick: closeRadialMenu
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              opacity: animOpacity,
              transform: `scale(${animScale})`,
              transition: "opacity 120ms ease, transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              pointerEvents: "none"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: closeRadialMenu,
                  style: {
                    position: "absolute",
                    left: cx - CENTER_SIZE / 2,
                    top: cy - CENTER_SIZE / 2,
                    width: CENTER_SIZE,
                    height: CENTER_SIZE,
                    borderRadius: "50%",
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderColor: "rgba(139, 230, 255, 0.5)",
                    backgroundColor: "rgba(7, 17, 23, 0.92)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    pointerEvents: "auto"
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        fontSize: 18,
                        color: "#8be6ff",
                        fontWeight: 700
                      },
                      children: "✕"
                    }
                  )
                }
              ),
              state.innerPetals.map((petal, index) => {
                const angle = angleForIndex(index, state.innerPetals.length);
                const pos = positionAtAngle(cx, cy, angle, INNER_RADIUS);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RadialButton,
                  {
                    petal,
                    x: pos.x,
                    y: pos.y,
                    size: BUTTON_SIZE,
                    isHovered: state.innerHoveredIndex === index,
                    testIDPrefix: "radial-inner"
                  },
                  petal.id
                );
              }),
              state.outerRingOpen && state.expandedInnerIndex >= 0 && state.outerPetals.map((petal, index) => {
                const innerAngle = angleForIndex(
                  state.expandedInnerIndex,
                  state.innerPetals.length
                );
                const innerPos = positionAtAngle(cx, cy, innerAngle, INNER_RADIUS);
                const subAngleStart = innerAngle - Math.PI / 6;
                const subAngleSpan = state.outerPetals.length > 1 ? Math.PI / 3 : 0;
                const subAngle = state.outerPetals.length > 1 ? subAngleStart + index / (state.outerPetals.length - 1) * subAngleSpan : innerAngle;
                const pos = positionAtAngle(
                  innerPos.x,
                  innerPos.y,
                  subAngle,
                  OUTER_RADIUS
                );
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RadialButton,
                  {
                    petal,
                    x: pos.x,
                    y: pos.y,
                    size: SUB_BUTTON_SIZE,
                    isHovered: state.outerHoveredIndex === index,
                    testIDPrefix: "radial-outer"
                  },
                  petal.id
                );
              })
            ]
          }
        )
      ]
    }
  );
}

function createPreviewSession(seed) {
  const config = createNewGameConfig(seed, {
    sectorScale: "standard",
    climateProfile: "temperate",
    stormProfile: "volatile"
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
    generation_status: "instanced",
    state: city.poiType === "home_base" ? "founded" : "surveyed"
  }));
  return {
    saveGame: {
      id: 1,
      name: "Radial Bot Preview",
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
      scrap_metal: 30,
      e_waste: 20,
      intact_components: 8,
      last_synced_at: 0
    }
  };
}
function polarPoint(cx, cy, radius, angleDeg) {
  const radians = angleDeg * Math.PI / 180;
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius
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
function EcumenopolisRadialBotPreview({
  unitType
}) {
  const [session, setSession] = reactExports.useState(null);
  const [ready, setReady] = reactExports.useState(false);
  const [sceneLoaded, setSceneLoaded] = reactExports.useState(false);
  const [renderVersion, setRenderVersion] = reactExports.useState(0);
  const [cameraTarget, setCameraTarget] = reactExports.useState([
    0,
    0,
    0
  ]);
  const [cameraPosition, setCameraPosition] = reactExports.useState([6, 8.5, 9]);
  const [visibleCategories, setVisibleCategories] = reactExports.useState([]);
  const [visibleActions, setVisibleActions] = reactExports.useState([]);
  const commandProfile = reactExports.useMemo(
    () => getBotCommandProfile(unitType),
    [unitType]
  );
  reactExports.useEffect(() => {
    setReady(false);
    setSceneLoaded(false);
    resetGameState();
    resetRuntimeState();
    resetStructuralSpace();
    resetRadialMenu();
    clearActiveWorldSession();
    for (const entity2 of [...world.entities]) {
      entity2.destroy();
    }
    const session2 = createPreviewSession(71717);
    setSession(session2);
    setActiveWorldSession(session2);
    setResources({
      scrapMetal: 30,
      eWaste: 20,
      intactComponents: 8
    });
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
    const homeBase = session2.pointsOfInterest.find(
      (poi) => poi.type === "home_base"
    );
    const home = gridToWorld(homeBase.q, homeBase.r);
    const homeFocus = getAnchorClusterFocus(session2, homeBase.q, homeBase.r);
    setCameraTarget(homeFocus.target);
    setCameraPosition(homeFocus.position);
    const entity = world.spawn(
      Identity,
      MapFragment,
      Unit,
      WorldPosition,
      ...unitType === "fabrication_unit" ? [Building] : []
    );
    entity.set(Identity, { id: "radial_preview_bot", faction: "player" });
    entity.set(MapFragment, { fragmentId: "world_primary" });
    entity.set(
      Unit,
      createBotUnitState({
        unitType,
        selected: true,
        components: []
      })
    );
    entity.set(WorldPosition, { x: home.x, y: 0, z: home.z });
    if (unitType === "fabrication_unit") {
      entity.set(Building, {
        type: "fabrication_unit",
        powered: true,
        operational: true,
        selected: false,
        components: []
      });
    }
    setNearbyPoi({
      cityInstanceId: session2.cityInstances[0]?.id ?? null,
      discovered: true,
      distance: 1.2,
      name: session2.pointsOfInterest[0]?.name ?? "Command Arcology",
      poiId: session2.pointsOfInterest[0]?.id ?? 1,
      poiType: session2.pointsOfInterest[0]?.type ?? "home_base"
    });
    initWorldGrid(getDatabaseSync(), session2.saveGame.world_seed, session2.saveGame.id);
    const centerX = 980;
    const centerY = 430;
    openRadialMenu(centerX, centerY, {
      selectionType: "unit",
      targetEntityId: "radial_preview_bot",
      targetSector: { q: homeBase.q, r: homeBase.r },
      targetFaction: "player"
    });
    const state = getRadialMenuState();
    const targetPetal = state.innerPetals.find(
      (petal) => petal.id === commandProfile.preferredPreviewCategory
    );
    if (targetPetal) {
      const { innerRingInner, innerRingOuter } = getRadialGeometry();
      const midAngle = (targetPetal.startAngle + targetPetal.endAngle) / 2;
      const hoverRadius = (innerRingInner + innerRingOuter) / 2;
      const point = polarPoint(centerX, centerY, hoverRadius, midAngle);
      updateRadialHover(point.x, point.y);
    }
    const resolvedState = getRadialMenuState();
    setVisibleCategories(resolvedState.innerPetals.map((petal) => petal.label));
    setVisibleActions(
      getResolvedActionsForCategory(
        commandProfile.preferredPreviewCategory
      ).map((action) => action.label)
    );
    setRenderVersion((value) => value + 1);
    setReady(true);
    return () => {
      entity.destroy();
      resetRadialMenu();
      resetWorldGrid();
      clearActiveWorldSession();
      resetRuntimeState();
      resetStructuralSpace();
      resetGameState();
      setSession(null);
    };
  }, [commandProfile.preferredPreviewCategory, unitType]);
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
            camera: { position: [...cameraPosition], fov: 34 },
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
              /* @__PURE__ */ jsxRuntimeExports.jsx(StructuralFloorRenderer, { profile: "ops", session }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CityRenderer, { profile: "ops", session }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(UnitRenderer, {}) })
            ]
          },
          renderVersion
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(BriefingBubbleLayer, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(RadialMenu, {}, `radial-${renderVersion}`),
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
                  children: "Radial Ownership Validation"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 10, fontSize: 13, color: "#ffffff" }, children: createBotUnitState({ unitType, components: [] }).displayName }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: { marginTop: 8, display: "grid", gap: 6, fontSize: 12 },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "rgba(216,246,255,0.72)" }, children: [
                      "Preferred category: ",
                      commandProfile.preferredPreviewCategory
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "rgba(216,246,255,0.72)" }, children: [
                      "Allowed categories:",
                      " ",
                      commandProfile.allowedCategories.join(", ")
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "rgba(216,246,255,0.72)" }, children: [
                      "Highlights: ",
                      commandProfile.actionHighlights.join(", ")
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "rgba(216,246,255,0.72)" }, children: [
                      "Visible categories: ",
                      visibleCategories.join(", ")
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "rgba(216,246,255,0.72)" }, children: [
                      "Expanded actions: ",
                      visibleActions.join(", ")
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "rgba(216,246,255,0.72)" }, children: [
                      "Role brief: ",
                      commandProfile.roleBrief
                    ] })
                  ]
                }
              )
            ]
          }
        )
      ] }) : null
    }
  );
}

export { EcumenopolisRadialBotPreview };
//# sourceMappingURL=EcumenopolisRadialBotPreview-D-lQd5kA.js.map
