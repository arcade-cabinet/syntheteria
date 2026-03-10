/**
 * Rendering materials — barrel export.
 *
 * Provides PBR material creation, normal map composition, cube material
 * assignment, and the existing procedural material generators.
 */

// Existing procedural materials
export {
	createBeltMaterial,
	createRailMaterial,
	updateBeltUV,
} from "./BeltMaterial";
export { createCircuitMaterial } from "./CircuitMaterial";
// Cube material provider (React hooks)
export {
	disposeCubeMaterials,
	getCubeMaterialDisplayName,
	getCubeMaterialTypes,
	resolveCubeMaterial,
	useCubeMaterial,
	usePreloadCubeMaterials,
} from "./CubeMaterialProvider";
export type {
	MaterialOptions,
	PBRTextureSet,
	VariantModifications,
} from "./MaterialFactory";
// PBR material factory
export { MaterialFactory, materialFactory } from "./MaterialFactory";
export { createMetalMaterial } from "./MetalMaterial";
export type { ComposerLayers } from "./NormalMapComposer";
// Normal map composer
export { NormalMapComposer } from "./NormalMapComposer";
export { createTerrainMaterial } from "./TerrainMaterial";
// PBR terrain and building materials
export {
	getBuildingPBRMaterial,
	getFabricationPBRMaterial,
	getLightningRodPBRMaterial,
	getMinerPBRMaterial,
	getProcessorPBRMaterial,
	getTerrainPBRMaterial,
	getTerrainPBRMaterialAlt,
	usePreloadTerrainMaterials,
} from "../TerrainPBR";
