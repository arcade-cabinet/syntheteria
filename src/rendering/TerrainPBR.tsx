/**
 * PBR terrain material integration.
 *
 * Applies MetalWalkway PBR textures to the terrain ground plane, giving it
 * an industrial metal grating look consistent with the machine-planet
 * aesthetic. Textures are tiled with UV repeat for the large terrain area.
 *
 * Uses MaterialFactory for loading/caching and supports two walkway variants:
 *   - MetalWalkway004: denser grating pattern (city center / high areas)
 *   - MetalWalkway008: wider grating pattern (periphery / low areas)
 *
 * Material parameters (metalness, roughness, tints, texture names) are read
 * from config/rendering.json `terrainPBR` and `buildingPBR` sections so they
 * can be tuned without touching rendering code.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { config } from "../../config";
import type { MaterialSpec } from "./materials/MaterialFactory";
import { materialFactory } from "./materials/MaterialFactory";

// ---------------------------------------------------------------------------
// Config-driven texture path helpers
// ---------------------------------------------------------------------------

/**
 * Build a PBR texture set for a MetalWalkway terrain texture directly from
 * the texture name stored in config.rendering.terrainPBR.
 *
 * Terrain textures live in `textures/terrain/` and follow the pattern
 * `<TextureName>_1K-JPG_<Map>.jpg`.
 */
function walkwayTexturePaths(textureName: string) {
	const base = `${config.rendering.terrainPBR.texturePath}${textureName}_1K-JPG_`;
	return {
		color: `${base}Color.jpg`,
		metalness: `${base}Metalness.jpg`,
		normal: `${base}NormalGL.jpg`,
		roughness: `${base}Roughness.jpg`,
	};
}

// ---------------------------------------------------------------------------
// UV repeat configuration
// ---------------------------------------------------------------------------

/**
 * Apply UV tiling to all textures in a material.
 * Must be called after texture loading completes (or on the placeholders).
 */
function setMaterialRepeat(
	material: THREE.MeshStandardMaterial,
	repeat: number,
): void {
	const maps = [
		material.map,
		material.metalnessMap,
		material.normalMap,
		material.roughnessMap,
		material.displacementMap,
	];

	for (const tex of maps) {
		if (tex) {
			tex.wrapS = THREE.RepeatWrapping;
			tex.wrapT = THREE.RepeatWrapping;
			tex.repeat.set(repeat, repeat);
			tex.needsUpdate = true;
		}
	}
}

// ---------------------------------------------------------------------------
// Terrain material creation
// ---------------------------------------------------------------------------

/**
 * Get (or create) the primary terrain PBR material (MetalWalkway004).
 * Tiled to cover the full world area with proper UV repeat.
 * Texture name and PBR params come from config.rendering.terrainPBR.
 */
export function getTerrainPBRMaterial(): THREE.MeshStandardMaterial {
	const existing = materialFactory.getMaterial("terrain_walkway_004");
	if (existing) return existing;

	const terrainCfg = config.rendering.terrainPBR;
	const uvRepeat = terrainCfg.uvRepeat;
	const params = terrainCfg.primaryMaterial;

	const material = materialFactory.createMaterial(
		"terrain_walkway_004",
		walkwayTexturePaths(terrainCfg.primaryTexture),
		{
			metalness: params.metalness,
			roughness: params.roughness,
			displacementScale: 0,
			envMapIntensity: params.envMapIntensity,
			normalScale: params.normalScale,
		},
	);

	setMaterialRepeat(material, uvRepeat);

	// Schedule follow-ups to catch async-loaded textures
	setTimeout(() => setMaterialRepeat(material, uvRepeat), 500);
	setTimeout(() => setMaterialRepeat(material, uvRepeat), 2000);

	return material;
}

/**
 * Get (or create) the secondary terrain PBR material (MetalWalkway008).
 * Used for terrain periphery areas.
 * Texture name and PBR params come from config.rendering.terrainPBR.
 */
export function getTerrainPBRMaterialAlt(): THREE.MeshStandardMaterial {
	const existing = materialFactory.getMaterial("terrain_walkway_008");
	if (existing) return existing;

	const terrainCfg = config.rendering.terrainPBR;
	const uvRepeat = terrainCfg.uvRepeat;
	const params = terrainCfg.secondaryMaterial;

	const material = materialFactory.createMaterial(
		"terrain_walkway_008",
		walkwayTexturePaths(terrainCfg.secondaryTexture),
		{
			metalness: params.metalness,
			roughness: params.roughness,
			displacementScale: 0,
			envMapIntensity: params.envMapIntensity,
			normalScale: params.normalScale,
		},
	);

	setMaterialRepeat(material, uvRepeat);

	setTimeout(() => setMaterialRepeat(material, uvRepeat), 500);
	setTimeout(() => setMaterialRepeat(material, uvRepeat), 2000);

	return material;
}

// ---------------------------------------------------------------------------
// Building material creation
// ---------------------------------------------------------------------------

/** Building type to PBR material mapping. */
export type CityBuildingMaterialType =
	| "conduit"
	| "node"
	| "tower"
	| "ruin"
	| "wall";

/**
 * Building types that use non-metallic textures (no dedicated metalness map).
 * These have their metalnessMap cleared after creation.
 */
const NON_METALLIC_BUILDING_TYPES = new Set<CityBuildingMaterialType>([
	"wall",
]);

/**
 * Extra building types exposed by helper functions that also pull from
 * config.rendering.buildingPBR.
 */
type ExtendedBuildingType =
	| CityBuildingMaterialType
	| "lightning_rod"
	| "fabrication"
	| "miner"
	| "processor";

/**
 * Get a PBR material for the given building type, driven entirely by
 * config.rendering.buildingPBR entries.
 *
 *   - conduit      -> dark carbon fiber (traces/corridors)
 *   - node         -> steel metal plates (junction blocks)
 *   - tower        -> iron/metallic (pylons/antennas)
 *   - ruin         -> rusted metal (collapsed structures)
 *   - wall         -> reinforced concrete (perimeter)
 *   - lightning_rod -> polished steel
 *   - fabrication  -> iron composite
 *   - miner        -> weathered rust
 *   - processor    -> concrete/metal base
 */
function getBuildingMaterial(type: ExtendedBuildingType): THREE.MeshStandardMaterial {
	const name = `building_${type}`;
	const existing = materialFactory.getMaterial(name);
	if (existing) return existing;

	const buildingPBR = config.rendering.buildingPBR as Record<
		string,
		{
			texture: string;
			metalness: number;
			roughness: number;
			tint: string;
			normalScale?: number;
			envMapIntensity?: number;
		}
	>;

	const entry = buildingPBR[type];
	if (!entry) {
		console.warn(
			`TerrainPBR: no buildingPBR config entry for type "${type}". Using fallback.`,
		);
		return materialFactory.createFromSpec(name, { textureMappingKey: "iron" });
	}

	const spec: MaterialSpec = {
		textureMappingKey: entry.texture,
		options: {
			metalness: entry.metalness,
			roughness: entry.roughness,
			displacementScale: 0,
			envMapIntensity: entry.envMapIntensity ?? 1.0,
			normalScale: entry.normalScale ?? 1.0,
			color: new THREE.Color(Number(entry.tint)),
		},
	};

	const mat = materialFactory.createFromSpec(name, spec);

	// Non-metallic materials (concrete) don't have a real metalness map
	if (NON_METALLIC_BUILDING_TYPES.has(type as CityBuildingMaterialType)) {
		mat.metalnessMap = null;
	}

	return mat;
}

/**
 * Get a PBR material for the given city building type.
 *
 *   - conduit  -> dark carbon fiber (traces/corridors)
 *   - node     -> steel metal plates (junction blocks)
 *   - tower    -> iron/metallic (pylons/antennas)
 *   - ruin     -> rusted metal (collapsed structures)
 *   - wall     -> reinforced concrete (perimeter)
 */
export function getBuildingPBRMaterial(
	type: CityBuildingMaterialType,
): THREE.MeshStandardMaterial {
	return getBuildingMaterial(type);
}

/**
 * Get a PBR material for lightning rod structures.
 * Highly metallic, polished steel appearance.
 */
export function getLightningRodPBRMaterial(): THREE.MeshStandardMaterial {
	return getBuildingMaterial("lightning_rod");
}

/**
 * Get a PBR material for fabrication unit structures.
 * Concrete/metal composite look.
 */
export function getFabricationPBRMaterial(): THREE.MeshStandardMaterial {
	return getBuildingMaterial("fabrication");
}

/**
 * Get a PBR material for mining structures.
 * Rusted, weathered metal appearance.
 */
export function getMinerPBRMaterial(): THREE.MeshStandardMaterial {
	return getBuildingMaterial("miner");
}

/**
 * Get a PBR material for processor/smelter structures.
 * Concrete base with metallic elements.
 */
export function getProcessorPBRMaterial(): THREE.MeshStandardMaterial {
	const name = "building_processor";
	const existing = materialFactory.getMaterial(name);
	if (existing) return existing;

	const mat = getBuildingMaterial("processor");
	// Processor uses concrete which has no metalness map
	mat.metalnessMap = null;
	return mat;
}

// ---------------------------------------------------------------------------
// React hook for preloading terrain PBR materials
// ---------------------------------------------------------------------------

/**
 * Hook that preloads all terrain and building PBR materials on mount.
 * Call once at the scene root level. Materials are cached in the
 * MaterialFactory singleton for subsequent access.
 */
export function usePreloadTerrainMaterials(): void {
	const loaded = useRef(false);

	useEffect(() => {
		if (loaded.current) return;
		loaded.current = true;

		// Kick off loading for all terrain/building materials
		getTerrainPBRMaterial();
		getTerrainPBRMaterialAlt();
		getBuildingPBRMaterial("conduit");
		getBuildingPBRMaterial("node");
		getBuildingPBRMaterial("tower");
		getBuildingPBRMaterial("ruin");
		getBuildingPBRMaterial("wall");
		getLightningRodPBRMaterial();
		getFabricationPBRMaterial();
		getMinerPBRMaterial();
		getProcessorPBRMaterial();
	}, []);
}
