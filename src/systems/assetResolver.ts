/**
 * Asset resolver — maps game entity types to 3D model paths.
 *
 * The 3DPSX asset library at /Volumes/home/assets/3DPSX/ contains 1,452+
 * GLB models in a gritty PS1-style aesthetic that perfectly matches the
 * machine planet theme. This system resolves entity types to specific
 * model paths using config/assetMapping.json.
 *
 * Features:
 * - Deterministic model selection (same seed → same model variant)
 * - Faction-specific material overrides
 * - LOD-aware fallbacks
 * - Model variant cycling for visual diversity
 *
 * No file system access — pure mapping logic. The rendering layer
 * handles actual GLB loading via R3F's useGLTF.
 */

import assetMapping from "../../config/assetMapping.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Resolved asset reference for the rendering layer. */
export interface ResolvedAsset {
	/** Relative path from asset root to GLB file */
	modelPath: string;
	/** Scale multiplier */
	scale: number;
	/** Faction visual override (if applicable) */
	factionOverride: FactionVisualOverride | null;
	/** Human-readable description */
	description: string;
}

/** Per-faction material overrides from config. */
export interface FactionVisualOverride {
	materialTint: string;
	roughness: number;
	metalness: number;
	emissiveColor?: string;
}

/** Categories that can be resolved. */
export type AssetCategory =
	| "buildings"
	| "infrastructure"
	| "terrain"
	| "props";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash for variant selection.
 * Given a seed string, returns a positive integer.
 */
function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const chr = str.charCodeAt(i);
		hash = ((hash << 5) - hash + chr) | 0;
	}
	return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a building type to its model path.
 *
 * @param buildingType - Type name (e.g. "furnace", "turret", "lightning_rod")
 * @param entityId     - Entity ID for deterministic variant selection
 * @param faction      - Faction ID for material overrides
 * @returns Resolved asset, or null if type not mapped
 */
export function resolveBuilding(
	buildingType: string,
	entityId: string,
	faction?: string,
): ResolvedAsset | null {
	const mapping = (assetMapping.buildings as Record<string, { models: string[]; description: string; scale?: number }>)[buildingType];
	if (!mapping || !mapping.models || mapping.models.length === 0) {
		return null;
	}

	const variantIndex = simpleHash(entityId) % mapping.models.length;
	const factionOverride = faction ? getFactionOverride(faction) : null;

	return {
		modelPath: mapping.models[variantIndex],
		scale: mapping.scale ?? 1.0,
		factionOverride,
		description: mapping.description,
	};
}

/**
 * Resolve an infrastructure piece to its model path.
 *
 * @param pieceType - Type name (e.g. "pipe_straight", "valve", "beam_horizontal")
 * @param entityId  - Entity ID for variant selection
 * @returns Resolved asset, or null if type not mapped
 */
export function resolveInfrastructure(
	pieceType: string,
	entityId: string,
): ResolvedAsset | null {
	const mapping = (assetMapping.infrastructure as Record<string, { models: string[]; description: string }>)[pieceType];
	if (!mapping || !mapping.models || mapping.models.length === 0) {
		return null;
	}

	const variantIndex = simpleHash(entityId) % mapping.models.length;

	return {
		modelPath: mapping.models[variantIndex],
		scale: 1.0,
		factionOverride: null,
		description: mapping.description,
	};
}

/**
 * Resolve a terrain decoration to its model path.
 *
 * @param decorType - Type name (e.g. "debris", "ruins")
 * @param entityId  - Entity ID for variant selection
 * @returns Resolved asset, or null if type not mapped
 */
export function resolveTerrain(
	decorType: string,
	entityId: string,
): ResolvedAsset | null {
	const mapping = (assetMapping.terrain as Record<string, { models: string[]; description: string }>)[decorType];
	if (!mapping || !mapping.models || mapping.models.length === 0) {
		return null;
	}

	const variantIndex = simpleHash(entityId) % mapping.models.length;

	return {
		modelPath: mapping.models[variantIndex],
		scale: 1.0,
		factionOverride: null,
		description: mapping.description,
	};
}

/**
 * Resolve a prop to its model path.
 *
 * @param propType - Dot-separated path (e.g. "tools.pickaxe", "weapons.revolver")
 * @returns Resolved asset, or null if type not mapped
 */
export function resolveProp(propType: string): ResolvedAsset | null {
	const parts = propType.split(".");
	let current: Record<string, unknown> = assetMapping.props as Record<string, unknown>;

	for (const part of parts) {
		if (current && typeof current === "object" && part in current) {
			current = current[part] as Record<string, unknown>;
		} else {
			return null;
		}
	}

	const models = current?.models;
	if (!Array.isArray(models) || models.length === 0) {
		return null;
	}

	return {
		modelPath: models[0] as string,
		scale: 1.0,
		factionOverride: null,
		description: (current.description as string) ?? propType,
	};
}

/**
 * Get faction visual override for material tinting.
 */
export function getFactionOverride(
	factionId: string,
): FactionVisualOverride | null {
	const overrides = assetMapping.factionVisualOverrides as Record<
		string,
		{ materialTint: string; roughness: number; metalness: number; emissiveColor?: string }
	>;
	const override = overrides[factionId];
	if (!override) return null;

	return {
		materialTint: override.materialTint,
		roughness: override.roughness,
		metalness: override.metalness,
		emissiveColor: override.emissiveColor,
	};
}

/**
 * Get all available building types.
 */
export function getAvailableBuildingTypes(): string[] {
	return Object.keys(assetMapping.buildings);
}

/**
 * Get all available infrastructure piece types.
 */
export function getAvailableInfrastructureTypes(): string[] {
	return Object.keys(assetMapping.infrastructure);
}

/**
 * Get model variant count for a building type (for UI display).
 */
export function getBuildingVariantCount(buildingType: string): number {
	const mapping = (assetMapping.buildings as Record<string, { models: string[] }>)[buildingType];
	return mapping?.models?.length ?? 0;
}

/**
 * Get the asset root path (for constructing absolute paths).
 */
export function getAssetRoot(): string {
	return assetMapping._assetRoot;
}
