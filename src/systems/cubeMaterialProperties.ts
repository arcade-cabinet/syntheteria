/**
 * Cube material properties — gameplay-affecting stats for each material type.
 *
 * cubeMaterials.json defines PBR visual specs, but cubes were functionally
 * identical. This module provides the gameplay side: compression speed,
 * wall strength, weight, stack limits, weather resistance, furnace tier
 * requirements, and conductivity.
 *
 * All data is hardcoded here (no config import) so the module is
 * self-contained and easy to test.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CubeMaterialProps {
	/** Internal key (e.g. "scrap_iron", "rare_alloy"). */
	materialType: string;
	/** Human-readable name for HUD display. */
	displayName: string;
	/** Seconds to compress powder into one cube. */
	compressionTime: number;
	/** Hit-points when used as a wall block (0–100). */
	wallStrength: number;
	/** Mass in kg — affects carry speed and throw distance. */
	weight: number;
	/** Maximum vertical stack height before collapse. */
	stackLimit: number;
	/** Damage reduction from weather effects (0–1). */
	weatherResistance: number;
	/** Furnace temperature tier required to smelt (1 = basic, 3 = advanced). */
	meltingPoint: number;
	/** Power transmission efficiency through this material (0–1). */
	conductivity: number;
	/** Hex colour for HUD indicators and minimap. */
	color: string;
	/** Technology tier required to produce (1 = starter, 3 = endgame). */
	tier: number;
}

// ---------------------------------------------------------------------------
// Material table
// ---------------------------------------------------------------------------

const MATERIAL_TABLE: ReadonlyMap<string, CubeMaterialProps> = new Map<
	string,
	CubeMaterialProps
>([
	[
		"scrap_iron",
		{
			materialType: "scrap_iron",
			displayName: "Scrap Iron",
			compressionTime: 2.0,
			wallStrength: 30,
			weight: 8,
			stackLimit: 6,
			weatherResistance: 0.3,
			meltingPoint: 1,
			conductivity: 0.2,
			color: "#8B7355",
			tier: 1,
		},
	],
	[
		"iron",
		{
			materialType: "iron",
			displayName: "Iron",
			compressionTime: 3.0,
			wallStrength: 60,
			weight: 12,
			stackLimit: 8,
			weatherResistance: 0.6,
			meltingPoint: 2,
			conductivity: 0.4,
			color: "#A8A8A8",
			tier: 2,
		},
	],
	[
		"copper",
		{
			materialType: "copper",
			displayName: "Copper",
			compressionTime: 2.5,
			wallStrength: 40,
			weight: 10,
			stackLimit: 7,
			weatherResistance: 0.5,
			meltingPoint: 2,
			conductivity: 0.9,
			color: "#B87333",
			tier: 2,
		},
	],
	[
		"e_waste",
		{
			materialType: "e_waste",
			displayName: "E-Waste",
			compressionTime: 1.5,
			wallStrength: 15,
			weight: 5,
			stackLimit: 4,
			weatherResistance: 0.1,
			meltingPoint: 1,
			conductivity: 0.3,
			color: "#4A6741",
			tier: 1,
		},
	],
	[
		"fiber_optics",
		{
			materialType: "fiber_optics",
			displayName: "Fiber Optics",
			compressionTime: 1.0,
			wallStrength: 10,
			weight: 2,
			stackLimit: 3,
			weatherResistance: 0.2,
			meltingPoint: 1,
			conductivity: 0.1,
			color: "#00BFFF",
			tier: 1,
		},
	],
	[
		"rare_alloy",
		{
			materialType: "rare_alloy",
			displayName: "Rare Alloy",
			compressionTime: 5.0,
			wallStrength: 100,
			weight: 15,
			stackLimit: 10,
			weatherResistance: 0.9,
			meltingPoint: 3,
			conductivity: 0.7,
			color: "#FFD700",
			tier: 3,
		},
	],
]);

/** Default fallback material key. */
const FALLBACK_MATERIAL = "scrap_iron";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up gameplay properties for a material type.
 *
 * Returns scrap_iron properties as a fallback for unknown types.
 */
export function getMaterialProps(materialType: string): CubeMaterialProps {
	return MATERIAL_TABLE.get(materialType) ?? MATERIAL_TABLE.get(FALLBACK_MATERIAL)!;
}

/**
 * Get the compression duration (seconds) for a material type.
 */
export function getCompressionTime(materialType: string): number {
	return getMaterialProps(materialType).compressionTime;
}

/**
 * Get the wall hit-points for a material type.
 */
export function getWallStrength(materialType: string): number {
	return getMaterialProps(materialType).wallStrength;
}

/**
 * Compute the carry speed when holding a cube of this material.
 *
 * Heavier cubes slow the player down:
 *   adjustedSpeed = baseSpeed * (1 - weight / 30)
 *
 * Weight is clamped so the result is never negative.
 */
export function getCarrySpeedModifier(
	materialType: string,
	baseSpeed: number,
): number {
	const { weight } = getMaterialProps(materialType);
	const factor = Math.max(0, 1 - weight / 30);
	return baseSpeed * factor;
}

/**
 * Get the maximum vertical stack height before collapse.
 */
export function getMaxStackHeight(materialType: string): number {
	return getMaterialProps(materialType).stackLimit;
}

/**
 * Check whether a furnace at the given tier can smelt this material.
 *
 * A furnace can smelt any material whose meltingPoint <= furnaceTier.
 */
export function canSmeltAtTier(
	materialType: string,
	furnaceTier: number,
): boolean {
	return furnaceTier >= getMaterialProps(materialType).meltingPoint;
}

/**
 * Get all materials that belong to a specific tech tier.
 */
export function getMaterialsByTier(tier: number): CubeMaterialProps[] {
	const result: CubeMaterialProps[] = [];
	for (const props of MATERIAL_TABLE.values()) {
		if (props.tier === tier) {
			result.push(props);
		}
	}
	return result;
}

/**
 * Get every registered material as an array.
 */
export function getAllMaterials(): CubeMaterialProps[] {
	return Array.from(MATERIAL_TABLE.values());
}

/**
 * Compare two materials by any numeric or string criterion.
 *
 * Returns a standard comparator value:
 *   negative if a < b, zero if equal, positive if a > b.
 */
export function compareMaterials(
	a: string,
	b: string,
	criterion: keyof CubeMaterialProps,
): number {
	const propsA = getMaterialProps(a);
	const propsB = getMaterialProps(b);

	const valA = propsA[criterion];
	const valB = propsB[criterion];

	if (typeof valA === "number" && typeof valB === "number") {
		return valA - valB;
	}

	// String comparison for non-numeric fields (materialType, displayName, color)
	return String(valA).localeCompare(String(valB));
}
