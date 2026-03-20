/**
 * @package rendering
 *
 * TRANSITIONAL — being decomposed. See docs/COMPREHENSIVE_ENGINEERING_PLAN.md §8.
 *
 * Rendering utilities — model paths, materials, particles, visibility, chronometry.
 * Sphere geometry has moved to src/board/sphere/.
 * Depth/labyrinth systems have been deleted (overworld replaces underground).
 */

// --- Sphere geometry & placement (canonical: src/board/sphere) ---
export {
	buildSphereGeometry,
	SEGS,
	sphereModelPlacement,
	sphereModelPlacementWithRotation,
	spherePosToTile,
	sphereRadius,
	tileToSpherePos,
	worldToTileCoords,
} from "../board";
export { cinematicState } from "./globe/cinematicState";
// --- Globe shaders ---
export {
	globeFragmentShader,
	globeVertexShader,
	hypercaneFragmentShader,
	hypercaneVertexShader,
	lightningFragmentShader,
	lightningVertexShader,
	stormFragmentShader,
	stormVertexShader,
} from "./globe/shaders";
// --- GLSL shaders (raw) ---
export { default as fogOfWarSphereFrag } from "./glsl/fogOfWarSphereFrag.glsl";
export { default as fogOfWarSphereVert } from "./glsl/fogOfWarSphereVert.glsl";
// --- Materials ---
export { makeHeightMaterial, updateHeightChronometry } from "./heightMaterial";
// --- Model paths + Faction colors ---
export {
	BUILDING_BASEMODULE_MODELS,
	BUILDING_CARGODEPOT_MODELS,
	BUILDING_COLONY_MODELS,
	BUILDING_PRODUCTION_MODELS,
	DEFENSE_BARRIER_MODELS,
	DEFENSE_GATE_MODELS,
	DEFENSE_MISC_MODELS,
	DEFENSE_TURRET_MODELS,
	FACTION_COLORS as MODEL_FACTION_COLORS,
	FACTION_COLORS,
	getAllBuildingModelUrls,
	getAllInfraModelUrls,
	getAllRobotModelUrls,
	getAllSalvageModelUrls,
	getAllStructureModelUrls,
	INFRA_ANTENNA_MODELS,
	INFRA_DECON_MODEL,
	INFRA_GATEWAY_MODELS,
	INFRA_LANDING_MODELS,
	INFRA_LIGHT_MODELS,
	INFRA_MONORAIL_MODELS,
	INFRA_PIPE_MODELS,
	INFRA_POWER_MODELS,
	INFRA_SUPPORT_MODELS,
	INFRA_TUNNEL_MODELS,
	LOGISTICS_CARGO_MODELS,
	LOGISTICS_DOOR_MODELS,
	resolveBuildingModelUrl,
	resolveRobotModelUrl,
	resolveSalvageModelUrl,
	resolveStructureModelUrl,
	STRUCTURE_COLUMN_MODELS,
	STRUCTURE_DETAIL_MODELS,
	STRUCTURE_DOOR_MODELS,
	STRUCTURE_DOOR_WALL_MODELS,
	STRUCTURE_FLOOR_CORNER_MODELS,
	STRUCTURE_FLOOR_HALLWAY_MODELS,
	STRUCTURE_FLOOR_MODELS,
	STRUCTURE_FLOOR_SIDE_MODELS,
	STRUCTURE_PIPES_MODEL,
	STRUCTURE_ROOF_CORNER_MODELS,
	STRUCTURE_ROOF_MODELS,
	STRUCTURE_STAIRCASE_MODEL,
	STRUCTURE_WALL_MODELS,
	STRUCTURE_WINDOW_WALL_MODELS,
	setPlayerFactionColor,
} from "./modelPaths";
export type { EffectEvent, EffectType } from "./particles/effectEvents";
// --- Particles ---
export {
	clearEffects,
	drainEffects,
	getEffectQueueLength,
	pushEffect,
} from "./particles/effectEvents";
export type { ParticleConfig } from "./particles/ParticlePool";
export { ParticlePool } from "./particles/ParticlePool";
export type { PathPoint } from "./pathPreview";
// --- Path preview (move hover, renderer-agnostic) ---
export {
	clearPreviewPath,
	getPathVersion,
	getPreviewPath,
	setPreviewPath,
	subscribePathState,
} from "./pathPreview";
export type { Chronometry } from "./sky/chronometry";
// --- Sky chronometry ---
export { turnToChronometry } from "./sky/chronometry";
// --- Tile visibility ---
export { buildExploredSet, isTileExplored } from "./tileVisibility";
export type { Scanner } from "./unitDetection";
// --- Unit detection ---
export { isUnitDetected } from "./unitDetection";
