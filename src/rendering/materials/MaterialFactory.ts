import * as THREE from "three";

/**
 * JSON-driven PBR material definitions.
 * Each definition describes a material's physical properties and optional texture
 * paths. The MaterialFactory creates Three.js MeshStandardMaterial instances from
 * these definitions, with caching to avoid duplicating GPU resources.
 */

export interface MaterialDefinition {
	id: string;
	label: string;
	color: number;
	emissive?: number;
	emissiveIntensity?: number;
	roughness: number;
	metalness: number;
	opacity?: number;
	transparent?: boolean;
	side?: "front" | "back" | "double";
	textures?: {
		map?: string;
		normalMap?: string;
		roughnessMap?: string;
		aoMap?: string;
		displacementMap?: string;
		emissiveMap?: string;
	};
	textureRepeat?: [number, number];
	displacementScale?: number;
}

/**
 * Built-in material palette matching Syntheteria's industrial/machine aesthetic.
 * Keyed by semantic role so renderers can request materials by purpose rather
 * than hard-coding colors.
 */
export const MATERIAL_DEFINITIONS: Record<string, MaterialDefinition> = {
	// ─── Structural ──────────────────────────────────────────────────────
	building_base: {
		id: "building_base",
		label: "Building Base",
		color: 0x5e6d7a,
		emissive: 0x111a22,
		emissiveIntensity: 0.12,
		roughness: 0.82,
		metalness: 0.14,
		side: "double",
	},
	building_unpowered: {
		id: "building_unpowered",
		label: "Building Unpowered",
		color: 0x4a4040,
		emissive: 0x0a0808,
		emissiveIntensity: 0.06,
		roughness: 0.9,
		metalness: 0.08,
		side: "double",
	},
	fabrication_hull: {
		id: "fabrication_hull",
		label: "Fabrication Hull",
		color: 0x7a634a,
		emissive: 0x2a1e0e,
		emissiveIntensity: 0.16,
		roughness: 0.72,
		metalness: 0.2,
	},
	fabrication_unpowered: {
		id: "fabrication_unpowered",
		label: "Fabrication Hull (Unpowered)",
		color: 0x554433,
		emissive: 0x0a0806,
		emissiveIntensity: 0.04,
		roughness: 0.88,
		metalness: 0.1,
	},
	lightning_rod_shaft: {
		id: "lightning_rod_shaft",
		label: "Lightning Rod Shaft",
		color: 0x6e7080,
		emissive: 0x0e1018,
		emissiveIntensity: 0.08,
		roughness: 0.58,
		metalness: 0.42,
	},
	lightning_rod_tip: {
		id: "lightning_rod_tip",
		label: "Lightning Rod Tip",
		color: 0x99aa22,
		emissive: 0x334400,
		emissiveIntensity: 0.35,
		roughness: 0.32,
		metalness: 0.18,
	},
	lightning_rod_radius: {
		id: "lightning_rod_radius",
		label: "Lightning Rod Radius Ring",
		color: 0x00ffaa,
		opacity: 0.15,
		transparent: true,
		roughness: 1.0,
		metalness: 0.0,
		side: "double",
	},
	// ─── Indicators ──────────────────────────────────────────────────────
	indicator_powered: {
		id: "indicator_powered",
		label: "Status LED (Powered)",
		color: 0x00ff00,
		emissive: 0x00ff00,
		emissiveIntensity: 0.8,
		roughness: 0.2,
		metalness: 0.05,
	},
	indicator_broken: {
		id: "indicator_broken",
		label: "Status LED (Broken)",
		color: 0xff4444,
		emissive: 0xff4444,
		emissiveIntensity: 0.8,
		roughness: 0.2,
		metalness: 0.05,
	},
	// ─── Utility ─────────────────────────────────────────────────────────
	machine_housing: {
		id: "machine_housing",
		label: "Machine Housing",
		color: 0x666666,
		roughness: 0.78,
		metalness: 0.22,
	},
	service_panel: {
		id: "service_panel",
		label: "Service Panel",
		color: 0x777766,
		emissive: 0x0e0e0a,
		emissiveIntensity: 0.08,
		roughness: 0.74,
		metalness: 0.16,
	},
	// ─── City model tinting ─────────────────────────────────────────────
	city_floor: {
		id: "city_floor",
		label: "City Floor",
		color: 0x7f9bb2,
		emissiveIntensity: 0.16,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_wall: {
		id: "city_wall",
		label: "City Wall",
		color: 0x8fb0c4,
		emissiveIntensity: 0.16,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_door: {
		id: "city_door",
		label: "City Door",
		color: 0x9fdde2,
		emissiveIntensity: 0.38,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_roof: {
		id: "city_roof",
		label: "City Roof",
		color: 0x6f8a9c,
		emissiveIntensity: 0.16,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_prop: {
		id: "city_prop",
		label: "City Prop",
		color: 0xd4b27a,
		emissiveIntensity: 0.16,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_detail: {
		id: "city_detail",
		label: "City Detail",
		color: 0x7de3f0,
		emissiveIntensity: 0.38,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_column: {
		id: "city_column",
		label: "City Column",
		color: 0xa5b4c8,
		emissiveIntensity: 0.16,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_stair: {
		id: "city_stair",
		label: "City Stair",
		color: 0x9eb0bf,
		emissiveIntensity: 0.16,
		roughness: 0.86,
		metalness: 0.12,
	},
	city_utility: {
		id: "city_utility",
		label: "City Utility",
		color: 0xc88d5f,
		emissiveIntensity: 0.16,
		roughness: 0.86,
		metalness: 0.12,
	},
	// ─── Ghost / Preview ─────────────────────────────────────────────────
	placement_ghost: {
		id: "placement_ghost",
		label: "Placement Ghost",
		color: 0x00ffaa,
		opacity: 0.3,
		transparent: true,
		roughness: 1.0,
		metalness: 0.0,
	},
};

const SIDE_MAP: Record<string, THREE.Side> = {
	front: THREE.FrontSide,
	back: THREE.BackSide,
	double: THREE.DoubleSide,
};

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Create a Three.js MeshStandardMaterial from a MaterialDefinition.
 * Results are cached by definition id — call `clearMaterialCache()` to free
 * GPU resources when the scene is torn down.
 */
export function createMaterial(
	definition: MaterialDefinition,
): THREE.MeshStandardMaterial {
	const cached = materialCache.get(definition.id);
	if (cached) {
		return cached;
	}

	const material = new THREE.MeshStandardMaterial({
		color: definition.color,
		roughness: definition.roughness,
		metalness: definition.metalness,
	});

	if (definition.emissive !== undefined) {
		material.emissive = new THREE.Color(definition.emissive);
	}
	if (definition.emissiveIntensity !== undefined) {
		material.emissiveIntensity = definition.emissiveIntensity;
	}
	if (definition.opacity !== undefined) {
		material.opacity = definition.opacity;
	}
	if (definition.transparent !== undefined) {
		material.transparent = definition.transparent;
	}
	if (definition.side) {
		material.side = SIDE_MAP[definition.side] ?? THREE.FrontSide;
	}
	if (definition.displacementScale !== undefined) {
		material.displacementScale = definition.displacementScale;
	}

	materialCache.set(definition.id, material);
	return material;
}

/**
 * Get a material by its semantic id from the built-in palette.
 * Returns a cached MeshStandardMaterial or creates one on first access.
 */
export function getMaterial(id: string): THREE.MeshStandardMaterial | null {
	const definition = MATERIAL_DEFINITIONS[id];
	if (!definition) {
		return null;
	}
	return createMaterial(definition);
}

/**
 * Get the MaterialDefinition for a city model family so that
 * CityModelMesh can tint loaded GLBs consistently.
 */
export function getCityFamilyMaterial(
	family: string,
): MaterialDefinition | null {
	const key = `city_${family}`;
	return MATERIAL_DEFINITIONS[key] ?? null;
}

/**
 * Modify an existing MeshStandardMaterial in-place to match a definition's
 * PBR properties. Used by renderers that clone GLB materials and want to
 * normalize them to the game's palette without replacing the texture maps
 * baked into the model.
 */
export function applyMaterialDefinition(
	material: THREE.MeshStandardMaterial,
	definition: MaterialDefinition,
	blendFactor = 0.35,
): void {
	const baseColor = new THREE.Color(definition.color);
	material.color = material.color.clone().lerp(baseColor, blendFactor);
	if (definition.emissive !== undefined) {
		material.emissive = material.emissive
			.clone()
			.lerp(
				new THREE.Color(definition.emissive ?? 0x000000),
				blendFactor * 0.3,
			);
	}
	material.emissiveIntensity =
		definition.emissiveIntensity ?? material.emissiveIntensity;
	material.roughness = Math.min(
		material.roughness ?? 0.9,
		definition.roughness,
	);
	material.metalness = Math.max(
		material.metalness ?? 0.1,
		definition.metalness,
	);
	if (definition.side) {
		material.side = SIDE_MAP[definition.side] ?? material.side;
	}
	material.needsUpdate = true;
}

/** Free all cached materials. Call on scene teardown. */
export function clearMaterialCache(): void {
	for (const material of materialCache.values()) {
		material.dispose();
	}
	materialCache.clear();
}

/** Visible for testing only. */
export function _getMaterialCacheSize(): number {
	return materialCache.size;
}
