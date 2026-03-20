/**
 * Biome terrain types — overworld biome taxonomy.
 *
 * Each BiomeType defines a natural terrain with yields when harvested/mined.
 * Improvement overlays (roboforming) transform tiles visually and functionally.
 */

/**
 * Impassable types:
 *   water    — deep water; impassable without bridges
 *   mountain — high elevation; impassable, mineable for stone/ore
 *
 * Passable types:
 *   grassland — open plains; food/fiber
 *   forest    — wooded areas; timber, slower movement
 *   desert    — arid wasteland; sand/glass
 *   hills     — rolling terrain; stone/ore (less than mountain)
 *   wetland   — marshy ground; reeds/peat, slow movement
 *   ruins     — legacy machine infrastructure; salvage
 *   tundra    — frozen terrain; sparse resources
 */
export type BiomeType =
	| "water"
	| "mountain"
	| "grassland"
	| "forest"
	| "desert"
	| "hills"
	| "wetland"
	| "ruins"
	| "tundra";

/**
 * Resource material taxonomy — natural → processed → synthetic.
 *
 * Natural tier: extracted directly from biomes
 * Processed tier: created at refineries/factories from natural materials
 * Synthetic tier: created at synthesizers from processed materials (late game)
 */
export type ResourceMaterial =
	// Natural tier — from biome harvesting/mining
	| "stone"
	| "timber"
	| "iron_ore"
	| "coal"
	| "food"
	| "fiber"
	| "sand"
	| "clay"
	// Processed tier — from refineries
	| "steel"
	| "concrete"
	| "glass"
	| "circuits"
	| "fuel"
	// Synthetic tier — from synthesizers (late game)
	| "alloy"
	| "nanomaterial"
	| "fusion_cell"
	| "quantum_crystal";

export type BiomeDef = {
	/** Human-readable label. */
	label: string;
	/** Whether a unit can harvest/mine this tile. */
	mineable: boolean;
	/** Turns required to fully harvest (0 = not mineable). */
	hardness: number;
	/** Primary resource material yielded. */
	resourceMaterial: ResourceMaterial | null;
	/** [min, max] resource units yielded. */
	resourceAmount: [number, number];
	/** Movement cost multiplier (1.0 = normal, 2.0 = double). */
	movementCost: number;
};

export const BIOME_DEFS: Record<BiomeType, BiomeDef> = {
	water: {
		label: "Water",
		mineable: false,
		hardness: 0,
		resourceMaterial: null,
		resourceAmount: [0, 0],
		movementCost: Infinity,
	},
	mountain: {
		label: "Mountain",
		mineable: true,
		hardness: 5,
		resourceMaterial: "stone",
		resourceAmount: [3, 7],
		movementCost: Infinity,
	},
	grassland: {
		label: "Grassland",
		mineable: true,
		hardness: 1,
		resourceMaterial: "food",
		resourceAmount: [2, 4],
		movementCost: 1.0,
	},
	forest: {
		label: "Forest",
		mineable: true,
		hardness: 3,
		resourceMaterial: "timber",
		resourceAmount: [2, 5],
		movementCost: 1.5,
	},
	desert: {
		label: "Desert",
		mineable: true,
		hardness: 2,
		resourceMaterial: "sand",
		resourceAmount: [1, 3],
		movementCost: 1.5,
	},
	hills: {
		label: "Hills",
		mineable: true,
		hardness: 3,
		resourceMaterial: "iron_ore",
		resourceAmount: [2, 4],
		movementCost: 1.5,
	},
	wetland: {
		label: "Wetland",
		mineable: true,
		hardness: 1,
		resourceMaterial: "clay",
		resourceAmount: [1, 3],
		movementCost: 2.0,
	},
	ruins: {
		label: "Ruins",
		mineable: true,
		hardness: 2,
		resourceMaterial: "iron_ore",
		resourceAmount: [1, 4],
		movementCost: 1.0,
	},
	tundra: {
		label: "Tundra",
		mineable: true,
		hardness: 2,
		resourceMaterial: "coal",
		resourceAmount: [1, 2],
		movementCost: 1.5,
	},
};

/** BiomeType → color index for rendering. */
export const BIOME_INDEX_MAP: Record<BiomeType, number> = {
	grassland: 0,
	forest: 1,
	hills: 2,
	desert: 3,
	wetland: 4,
	ruins: 5,
	tundra: 6,
	water: 7,
	mountain: 8,
};

/** True for passable biome types. */
export function isPassableBiome(t: BiomeType): boolean {
	return t !== "water" && t !== "mountain";
}
