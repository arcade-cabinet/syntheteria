/**
 * React hook and context for providing PBR materials to cube entities.
 *
 * Maps material type strings (from the MaterialCube Koota trait) to cached
 * Three.js MeshStandardMaterials. Material definitions are loaded from
 * config/cubeMaterials.json; textures from public/textures/materials/.
 *
 * Textures are loaded asynchronously. Fallback solid-color materials are
 * returned immediately while textures load. Once the color texture is
 * confirmed loadable, the material is upgraded to the full PBR version.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import cubeMaterialsConfig from "../../../config/cubeMaterials.json";
import type { PBRTextureSet } from "./MaterialFactory";
import { materialFactory } from "./MaterialFactory";

// ---------------------------------------------------------------------------
// Types derived from config
// ---------------------------------------------------------------------------

interface CubeMaterialDef {
	displayName: string;
	texturePath: string;
	texturePrefix: string;
	hasMetalness: boolean;
	hasAO: boolean;
	metalness: number;
	roughness: number;
	displacementScale: number;
	envMapIntensity: number;
	fallbackColor: string;
}

const MATERIAL_DEFS = cubeMaterialsConfig.materials as Record<
	string,
	CubeMaterialDef
>;

// ---------------------------------------------------------------------------
// Texture path construction
// ---------------------------------------------------------------------------

/**
 * Build PBR texture paths for a material definition using actual file names.
 * Uses the texturePrefix from config to construct full paths like:
 *   textures/materials/iron/Metal038_1K-JPG_Color.jpg
 */
function buildTexturePaths(def: CubeMaterialDef): PBRTextureSet {
	const base = def.texturePath.endsWith("/")
		? def.texturePath
		: `${def.texturePath}/`;
	const prefix = def.texturePrefix;

	return {
		color: `${base}${prefix}_Color.jpg`,
		metalness: def.hasMetalness
			? `${base}${prefix}_Metalness.jpg`
			: `${base}${prefix}_Color.jpg`, // fallback: color map for non-metals
		normal: `${base}${prefix}_NormalGL.jpg`,
		roughness: `${base}${prefix}_Roughness.jpg`,
		displacement: `${base}${prefix}_Displacement.jpg`,
	};
}

/**
 * Build the AO texture path for materials that have ambient occlusion.
 */
function buildAOPath(def: CubeMaterialDef): string | null {
	if (!def.hasAO) return null;
	const base = def.texturePath.endsWith("/")
		? def.texturePath
		: `${def.texturePath}/`;
	return `${base}${def.texturePrefix}_AmbientOcclusion.jpg`;
}

// ---------------------------------------------------------------------------
// Fallback material cache (procedural single-color materials)
// ---------------------------------------------------------------------------

const fallbackCache = new Map<string, THREE.MeshStandardMaterial>();

function createFallbackMaterial(
	name: string,
	def: CubeMaterialDef,
): THREE.MeshStandardMaterial {
	const cached = fallbackCache.get(name);
	if (cached) return cached;

	const material = new THREE.MeshStandardMaterial({
		color: new THREE.Color(def.fallbackColor),
		metalness: def.metalness,
		roughness: def.roughness,
		envMapIntensity: def.envMapIntensity,
	});

	fallbackCache.set(name, material);
	return material;
}

// ---------------------------------------------------------------------------
// Texture availability tracking
// ---------------------------------------------------------------------------

/** Set of material names whose textures have been confirmed available. */
const texturesAvailable = new Set<string>();
/** Set of material names whose textures have been confirmed missing. */
const texturesMissing = new Set<string>();
/** Set of material names currently being probed. */
const texturesProbing = new Set<string>();

/**
 * Probe whether a texture path is loadable by issuing a HEAD request.
 * Caches the result so subsequent calls are instant.
 */
async function probeTexture(path: string): Promise<boolean> {
	try {
		const resp = await fetch(path, { method: "HEAD" });
		return resp.ok;
	} catch {
		return false;
	}
}

/**
 * Create a PBR material for a given definition, handling non-metallic
 * materials specially (no metalness map, use AO instead).
 */
function createPBRMaterial(
	name: string,
	def: CubeMaterialDef,
): THREE.MeshStandardMaterial {
	const texPaths = buildTexturePaths(def);

	// For non-metallic materials, exclude the metalness map
	const effectiveTexPaths: PBRTextureSet = {
		...texPaths,
		metalness: def.hasMetalness ? texPaths.metalness : texPaths.color,
	};

	const material = materialFactory.createMaterial(name, effectiveTexPaths, {
		metalness: def.metalness,
		roughness: def.roughness,
		displacementScale: def.displacementScale,
		envMapIntensity: def.envMapIntensity,
	});

	// For non-metallic materials, clear the metalness map and load AO instead
	if (!def.hasMetalness) {
		material.metalnessMap = null;

		const aoPath = buildAOPath(def);
		if (aoPath) {
			const loader = new THREE.TextureLoader();
			loader.load(aoPath, (aoTex) => {
				aoTex.wrapS = THREE.RepeatWrapping;
				aoTex.wrapT = THREE.RepeatWrapping;
				aoTex.colorSpace = THREE.LinearSRGBColorSpace;
				material.aoMap = aoTex;
				material.aoMapIntensity = 1.0;
				material.needsUpdate = true;
			});
		}
	}

	return material;
}

// ---------------------------------------------------------------------------
// Material resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a material for a given cube material type. Attempts to load PBR
 * textures; falls back to a simple colored material if textures are missing.
 */
export function resolveCubeMaterial(
	materialType: string,
): THREE.MeshStandardMaterial {
	return resolveMaterial(materialType);
}

function resolveMaterial(materialType: string): THREE.MeshStandardMaterial {
	// Already in the factory cache?
	const existing = materialFactory.getMaterial(materialType);
	if (existing) return existing;

	const def = MATERIAL_DEFS[materialType];
	if (!def) {
		// Unknown material type -- return a default grey material
		return createFallbackMaterial(materialType, {
			displayName: materialType,
			texturePath: "",
			texturePrefix: "",
			hasMetalness: false,
			hasAO: false,
			metalness: 0.5,
			roughness: 0.5,
			displacementScale: 0.02,
			envMapIntensity: 1.0,
			fallbackColor: "#888888",
		});
	}

	// If we already know textures are missing, use fallback immediately
	if (texturesMissing.has(materialType)) {
		return createFallbackMaterial(materialType, def);
	}

	// If textures have been confirmed available, create PBR material
	if (texturesAvailable.has(materialType)) {
		return createPBRMaterial(materialType, def);
	}

	// First access -- probe in background and use fallback for now
	if (!texturesProbing.has(materialType)) {
		texturesProbing.add(materialType);
		const texPaths = buildTexturePaths(def);

		probeTexture(texPaths.color).then((available) => {
			texturesProbing.delete(materialType);
			if (available) {
				texturesAvailable.add(materialType);
				// Create the PBR material so it's cached for next access
				createPBRMaterial(materialType, def);
			} else {
				texturesMissing.add(materialType);
				console.warn(
					`[CubeMaterial] Textures not found for "${materialType}" at ${texPaths.color}, using fallback`,
				);
			}
		});
	}

	// Return fallback immediately -- the PBR version will be used on subsequent
	// calls once the probe confirms availability.
	return createFallbackMaterial(materialType, def);
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Hook that returns a cached MeshStandardMaterial for the given material type.
 *
 * On first render for a given type, triggers an async texture probe. If PBR
 * textures are available under `public/textures/materials/<type>/`, returns a
 * fully textured material. Otherwise falls back to a solid-color material
 * configured from cubeMaterials.json.
 *
 * The returned material is stable (same reference) for the lifetime of the
 * component unless the materialType prop changes.
 *
 * @param materialType - Material identifier (e.g. "iron", "copper", "steel")
 * @returns A Three.js MeshStandardMaterial ready for use
 */
export function useCubeMaterial(
	materialType: string,
): THREE.MeshStandardMaterial {
	const [, setTick] = useState(0);
	const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

	const material = useMemo(() => {
		const mat = resolveMaterial(materialType);
		materialRef.current = mat;
		return mat;
	}, [materialType]);

	// If the texture probe discovers PBR textures are available after the
	// initial fallback was returned, upgrade to the PBR version by re-rendering.
	useEffect(() => {
		if (texturesAvailable.has(materialType) && materialRef.current) {
			// Check if we still have only the fallback
			const factoryMat = materialFactory.getMaterial(materialType);
			if (factoryMat && factoryMat !== materialRef.current) {
				materialRef.current = factoryMat;
				setTick((t) => t + 1);
			}
		}

		// Poll briefly in case the probe finishes after mount
		const timer = setTimeout(() => {
			if (texturesAvailable.has(materialType)) {
				const factoryMat = materialFactory.getMaterial(materialType);
				if (factoryMat && factoryMat !== materialRef.current) {
					materialRef.current = factoryMat;
					setTick((t) => t + 1);
				}
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [materialType]);

	return materialRef.current ?? material;
}

/**
 * Hook that preloads all cube material textures in the background.
 * Call this once at the top level of the game scene to start loading all
 * PBR texture sets before any cubes are spawned.
 *
 * Does not block rendering -- cubes use fallback materials until textures
 * finish loading.
 */
export function usePreloadCubeMaterials(): void {
	useEffect(() => {
		for (const [name, def] of Object.entries(MATERIAL_DEFS)) {
			if (
				texturesAvailable.has(name) ||
				texturesMissing.has(name) ||
				texturesProbing.has(name)
			) {
				continue;
			}

			texturesProbing.add(name);
			const texPaths = buildTexturePaths(def);

			probeTexture(texPaths.color).then((available) => {
				texturesProbing.delete(name);
				if (available) {
					texturesAvailable.add(name);
					createPBRMaterial(name, def);
				} else {
					texturesMissing.add(name);
					console.warn(
						`[CubeMaterial] Preload: textures not found for "${name}" at ${texPaths.color}`,
					);
				}
			});
		}

		return () => {
			// Cleanup is handled by materialFactory.dispose() at the
			// application level -- individual preload hooks should not
			// dispose shared materials.
		};
	}, []);
}

/**
 * Returns the list of available material type keys from the config.
 * Useful for iterating over all material types in UI or spawning logic.
 */
export function getCubeMaterialTypes(): string[] {
	return Object.keys(MATERIAL_DEFS);
}

/**
 * Returns the display name for a material type.
 */
export function getCubeMaterialDisplayName(materialType: string): string {
	return MATERIAL_DEFS[materialType]?.displayName ?? materialType;
}

/**
 * Dispose all cube materials and textures. Call when tearing down the game
 * scene (e.g. returning to the title screen).
 */
export function disposeCubeMaterials(): void {
	materialFactory.dispose();

	for (const mat of fallbackCache.values()) {
		mat.dispose();
	}
	fallbackCache.clear();

	texturesAvailable.clear();
	texturesMissing.clear();
	texturesProbing.clear();
}
