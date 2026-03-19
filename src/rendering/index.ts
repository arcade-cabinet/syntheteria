/**
 * @package rendering
 *
 * Rendering utilities — geometry builders, sphere placement, model paths, and materials.
 * TSX renderer components are NOT exported here (they live in individual files for now).
 */

// --- Sphere geometry ---
export {
	SEGS,
	sphereRadius,
	tileToSpherePos,
	spherePosToTile,
	buildSphereGeometry,
} from "./boardGeometry";

// --- Sphere placement ---
export {
	sphereModelPlacement,
	sphereModelPlacementWithRotation,
	worldToTileCoords,
} from "./spherePlacement";

// --- Depth layers ---
export { createDepthLayerStack, boardToDepthLayers } from "./depthLayerStack";
export type { DepthLayerStack } from "./depthLayerStack";
export {
	STRUCTURAL_ATLAS_INDEX,
	GRAVEL_ATLAS_INDEX,
	GRATING_ATLAS_INDEX,
	VOID_ATLAS_INDEX,
	createDepthMappedLayer,
	classifyEdges,
	buildLayerGeometry,
} from "./depthMappedLayer";
export type {
	EdgeDirection,
	EdgeType,
	FloorQuad,
	RampQuad,
	WallQuad,
	VoidPlane,
	LayerGeometryResult,
	DepthMappedLayer,
} from "./depthMappedLayer";

// --- Materials ---
export { makeHeightMaterial, updateHeightChronometry } from "./heightMaterial";

// --- Model paths ---
export {
	INFRA_PIPE_MODELS,
	INFRA_SUPPORT_MODELS,
	INFRA_GATEWAY_MODELS,
	INFRA_MONORAIL_MODELS,
	INFRA_TUNNEL_MODELS,
	INFRA_ANTENNA_MODELS,
	INFRA_LIGHT_MODELS,
	INFRA_POWER_MODELS,
	INFRA_LANDING_MODELS,
	INFRA_DECON_MODEL,
	getAllInfraModelUrls,
	BUILDING_BASEMODULE_MODELS,
	BUILDING_CARGODEPOT_MODELS,
	BUILDING_COLONY_MODELS,
	BUILDING_PRODUCTION_MODELS,
	DEFENSE_TURRET_MODELS,
	DEFENSE_BARRIER_MODELS,
	DEFENSE_GATE_MODELS,
	DEFENSE_MISC_MODELS,
	LOGISTICS_CARGO_MODELS,
	LOGISTICS_DOOR_MODELS,
	STRUCTURE_WALL_MODELS,
	STRUCTURE_WINDOW_WALL_MODELS,
	STRUCTURE_DOOR_WALL_MODELS,
	STRUCTURE_DOOR_MODELS,
	STRUCTURE_COLUMN_MODELS,
	STRUCTURE_FLOOR_MODELS,
	STRUCTURE_FLOOR_SIDE_MODELS,
	STRUCTURE_FLOOR_CORNER_MODELS,
	STRUCTURE_FLOOR_HALLWAY_MODELS,
	STRUCTURE_ROOF_MODELS,
	STRUCTURE_ROOF_CORNER_MODELS,
	STRUCTURE_DETAIL_MODELS,
	STRUCTURE_PIPES_MODEL,
	STRUCTURE_STAIRCASE_MODEL,
	resolveStructureModelUrl,
	getAllStructureModelUrls,
	FACTION_COLORS as MODEL_FACTION_COLORS,
	setPlayerFactionColor,
	resolveSalvageModelUrl,
	resolveBuildingModelUrl,
	resolveRobotModelUrl,
	getAllSalvageModelUrls,
	getAllBuildingModelUrls,
	getAllRobotModelUrls,
} from "./modelPaths";

// --- Structure helpers ---
export {
	getStructuralEdges,
	getColumnPositions,
	getInteriorTiles,
	wallHeight,
} from "./structureHelpers";
export type { StructuralEdge, ColumnPosition } from "./structureHelpers";

// --- Tile visibility ---
export { buildExploredSet, isTileExplored } from "./tileVisibility";

// --- Unit detection ---
export { isUnitDetected } from "./unitDetection";
export type { Scanner } from "./unitDetection";
