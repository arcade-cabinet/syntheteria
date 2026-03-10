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
 * Building materials are also provided here for the CityRenderer and
 * UnitRenderer to consume.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PBRTextureSet } from "./materials/MaterialFactory";
import { materialFactory } from "./materials/MaterialFactory";

// ---------------------------------------------------------------------------
// Texture path configuration
// ---------------------------------------------------------------------------

const TERRAIN_TEXTURE_BASE = "textures/terrain/";

/** PBR texture set for MetalWalkway004 (dense grating, city center). */
const WALKWAY_004_TEXTURES: PBRTextureSet = {
	color: `${TERRAIN_TEXTURE_BASE}MetalWalkway004_1K-JPG_Color.jpg`,
	metalness: `${TERRAIN_TEXTURE_BASE}MetalWalkway004_1K-JPG_Metalness.jpg`,
	normal: `${TERRAIN_TEXTURE_BASE}MetalWalkway004_1K-JPG_NormalGL.jpg`,
	roughness: `${TERRAIN_TEXTURE_BASE}MetalWalkway004_1K-JPG_Roughness.jpg`,
};

/** PBR texture set for MetalWalkway008 (wider grating, periphery). */
const WALKWAY_008_TEXTURES: PBRTextureSet = {
	color: `${TERRAIN_TEXTURE_BASE}MetalWalkway008_1K-JPG_Color.jpg`,
	metalness: `${TERRAIN_TEXTURE_BASE}MetalWalkway008_1K-JPG_Metalness.jpg`,
	normal: `${TERRAIN_TEXTURE_BASE}MetalWalkway008_1K-JPG_NormalGL.jpg`,
	roughness: `${TERRAIN_TEXTURE_BASE}MetalWalkway008_1K-JPG_Roughness.jpg`,
};

// Building material textures (from public/textures/materials/)
const MATERIAL_BASE = "textures/materials/";

const IRON_TEXTURES: PBRTextureSet = {
	color: `${MATERIAL_BASE}iron/Metal038_1K-JPG_Color.jpg`,
	metalness: `${MATERIAL_BASE}iron/Metal038_1K-JPG_Metalness.jpg`,
	normal: `${MATERIAL_BASE}iron/Metal038_1K-JPG_NormalGL.jpg`,
	roughness: `${MATERIAL_BASE}iron/Metal038_1K-JPG_Roughness.jpg`,
	displacement: `${MATERIAL_BASE}iron/Metal038_1K-JPG_Displacement.jpg`,
};

const STEEL_TEXTURES: PBRTextureSet = {
	color: `${MATERIAL_BASE}steel/MetalPlates009_1K-JPG_Color.jpg`,
	metalness: `${MATERIAL_BASE}steel/MetalPlates009_1K-JPG_Metalness.jpg`,
	normal: `${MATERIAL_BASE}steel/MetalPlates009_1K-JPG_NormalGL.jpg`,
	roughness: `${MATERIAL_BASE}steel/MetalPlates009_1K-JPG_Roughness.jpg`,
	displacement: `${MATERIAL_BASE}steel/MetalPlates009_1K-JPG_Displacement.jpg`,
};

const CONCRETE_TEXTURES: PBRTextureSet = {
	color: `${MATERIAL_BASE}reinforced_concrete/Concrete028_1K-JPG_Color.jpg`,
	metalness: `${MATERIAL_BASE}reinforced_concrete/Concrete028_1K-JPG_Color.jpg`, // no metalness map; use color as fallback
	normal: `${MATERIAL_BASE}reinforced_concrete/Concrete028_1K-JPG_NormalGL.jpg`,
	roughness: `${MATERIAL_BASE}reinforced_concrete/Concrete028_1K-JPG_Roughness.jpg`,
	displacement: `${MATERIAL_BASE}reinforced_concrete/Concrete028_1K-JPG_Displacement.jpg`,
};

const RUST_TEXTURES: PBRTextureSet = {
	color: `${MATERIAL_BASE}rust/Rust003_1K-JPG_Color.jpg`,
	metalness: `${MATERIAL_BASE}rust/Rust003_1K-JPG_Metalness.jpg`,
	normal: `${MATERIAL_BASE}rust/Rust003_1K-JPG_NormalGL.jpg`,
	roughness: `${MATERIAL_BASE}rust/Rust003_1K-JPG_Roughness.jpg`,
};

const CARBON_TEXTURES: PBRTextureSet = {
	color: `${MATERIAL_BASE}carbon/Metal036_1K-JPG_Color.jpg`,
	metalness: `${MATERIAL_BASE}carbon/Metal036_1K-JPG_Metalness.jpg`,
	normal: `${MATERIAL_BASE}carbon/Metal036_1K-JPG_NormalGL.jpg`,
	roughness: `${MATERIAL_BASE}carbon/Metal036_1K-JPG_Roughness.jpg`,
	displacement: `${MATERIAL_BASE}carbon/Metal036_1K-JPG_Displacement.jpg`,
};

// ---------------------------------------------------------------------------
// UV repeat configuration
// ---------------------------------------------------------------------------

/** How many times to tile the terrain texture across the full world. */
const TERRAIN_UV_REPEAT = 40;

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
 */
export function getTerrainPBRMaterial(): THREE.MeshStandardMaterial {
	const existing = materialFactory.getMaterial("terrain_walkway_004");
	if (existing) return existing;

	const material = materialFactory.createMaterial(
		"terrain_walkway_004",
		WALKWAY_004_TEXTURES,
		{
			metalness: 0.7,
			roughness: 0.5,
			displacementScale: 0,
			envMapIntensity: 0.8,
			normalScale: 0.8,
		},
	);

	setMaterialRepeat(material, TERRAIN_UV_REPEAT);

	// Also set repeat on the placeholder textures that will be swapped in
	// when real textures load
	const checkAndSetRepeat = () => {
		setMaterialRepeat(material, TERRAIN_UV_REPEAT);
	};
	// Schedule a follow-up to catch async-loaded textures
	setTimeout(checkAndSetRepeat, 500);
	setTimeout(checkAndSetRepeat, 2000);

	return material;
}

/**
 * Get (or create) the secondary terrain PBR material (MetalWalkway008).
 * Used for terrain periphery areas.
 */
export function getTerrainPBRMaterialAlt(): THREE.MeshStandardMaterial {
	const existing = materialFactory.getMaterial("terrain_walkway_008");
	if (existing) return existing;

	const material = materialFactory.createMaterial(
		"terrain_walkway_008",
		WALKWAY_008_TEXTURES,
		{
			metalness: 0.65,
			roughness: 0.55,
			displacementScale: 0,
			envMapIntensity: 0.7,
			normalScale: 0.7,
		},
	);

	setMaterialRepeat(material, TERRAIN_UV_REPEAT);

	const checkAndSetRepeat = () => {
		setMaterialRepeat(material, TERRAIN_UV_REPEAT);
	};
	setTimeout(checkAndSetRepeat, 500);
	setTimeout(checkAndSetRepeat, 2000);

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
	const name = `building_${type}`;
	const existing = materialFactory.getMaterial(name);
	if (existing) return existing;

	switch (type) {
		case "conduit": {
			const mat = materialFactory.createMaterial(
				name,
				CARBON_TEXTURES,
				{
					metalness: 0.4,
					roughness: 0.6,
					displacementScale: 0,
					envMapIntensity: 0.6,
					normalScale: 0.8,
					color: new THREE.Color(0x2a2a3e),
				},
			);
			return mat;
		}
		case "node": {
			const mat = materialFactory.createMaterial(
				name,
				STEEL_TEXTURES,
				{
					metalness: 0.85,
					roughness: 0.3,
					displacementScale: 0,
					envMapIntensity: 1.2,
					normalScale: 1.0,
					color: new THREE.Color(0x3a3a4e),
				},
			);
			return mat;
		}
		case "tower": {
			const mat = materialFactory.createMaterial(
				name,
				IRON_TEXTURES,
				{
					metalness: 0.9,
					roughness: 0.25,
					displacementScale: 0,
					envMapIntensity: 1.4,
					normalScale: 1.0,
					color: new THREE.Color(0x4a4a60),
				},
			);
			return mat;
		}
		case "ruin": {
			const mat = materialFactory.createMaterial(
				name,
				RUST_TEXTURES,
				{
					metalness: 0.5,
					roughness: 0.85,
					displacementScale: 0,
					envMapIntensity: 0.4,
					normalScale: 1.2,
					color: new THREE.Color(0x5a4a3a),
				},
			);
			return mat;
		}
		case "wall": {
			const mat = materialFactory.createMaterial(
				name,
				CONCRETE_TEXTURES,
				{
					metalness: 0.1,
					roughness: 0.85,
					displacementScale: 0,
					envMapIntensity: 0.4,
					normalScale: 1.0,
					color: new THREE.Color(0x3a3a3a),
				},
			);
			// Concrete doesn't have a real metalness map
			mat.metalnessMap = null;
			return mat;
		}
	}
}

/**
 * Get a PBR material for lightning rod structures.
 * Highly metallic, polished steel appearance.
 */
export function getLightningRodPBRMaterial(): THREE.MeshStandardMaterial {
	const name = "building_lightning_rod";
	const existing = materialFactory.getMaterial(name);
	if (existing) return existing;

	return materialFactory.createMaterial(name, STEEL_TEXTURES, {
		metalness: 0.95,
		roughness: 0.15,
		displacementScale: 0,
		envMapIntensity: 1.8,
		normalScale: 0.6,
		color: new THREE.Color(0x8888aa),
	});
}

/**
 * Get a PBR material for fabrication unit structures.
 * Concrete/metal composite look.
 */
export function getFabricationPBRMaterial(): THREE.MeshStandardMaterial {
	const name = "building_fabrication";
	const existing = materialFactory.getMaterial(name);
	if (existing) return existing;

	return materialFactory.createMaterial(name, IRON_TEXTURES, {
		metalness: 0.7,
		roughness: 0.45,
		displacementScale: 0,
		envMapIntensity: 1.0,
		normalScale: 0.9,
		color: new THREE.Color(0x666677),
	});
}

/**
 * Get a PBR material for mining structures.
 * Rusted, weathered metal appearance.
 */
export function getMinerPBRMaterial(): THREE.MeshStandardMaterial {
	const name = "building_miner";
	const existing = materialFactory.getMaterial(name);
	if (existing) return existing;

	return materialFactory.createMaterial(name, RUST_TEXTURES, {
		metalness: 0.6,
		roughness: 0.75,
		displacementScale: 0,
		envMapIntensity: 0.5,
		normalScale: 1.0,
		color: new THREE.Color(0x887766),
	});
}

/**
 * Get a PBR material for processor/smelter structures.
 * Concrete base with metallic elements.
 */
export function getProcessorPBRMaterial(): THREE.MeshStandardMaterial {
	const name = "building_processor";
	const existing = materialFactory.getMaterial(name);
	if (existing) return existing;

	const mat = materialFactory.createMaterial(name, CONCRETE_TEXTURES, {
		metalness: 0.2,
		roughness: 0.75,
		displacementScale: 0,
		envMapIntensity: 0.5,
		normalScale: 1.0,
		color: new THREE.Color(0x777777),
	});
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
