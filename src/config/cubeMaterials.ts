/**
 * Cube material definitions for the stockpile system.
 *
 * Each material has a base value (for wealth calculations),
 * a display color, and a glow tint used by StockpileGlow.
 */

export interface CubeMaterial {
	/** Human-readable name */
	name: string;
	/** Base value per cube for wealth calculations */
	value: number;
	/** Hex color for cube rendering */
	color: number;
	/** Hex color for stockpile glow tint */
	glowColor: number;
	/** Resource category this material belongs to */
	category: "metal" | "electronic" | "organic" | "rare";
}

export const CUBE_MATERIALS: Record<string, CubeMaterial> = {
	iron: {
		name: "Iron",
		value: 1,
		color: 0x8a8a8a,
		glowColor: 0x99aacc,
		category: "metal",
	},
	copper: {
		name: "Copper",
		value: 3,
		color: 0xb87333,
		glowColor: 0xdd8844,
		category: "metal",
	},
	steel: {
		name: "Steel",
		value: 5,
		color: 0xaaaabc,
		glowColor: 0xbbccdd,
		category: "metal",
	},
	titanium: {
		name: "Titanium",
		value: 12,
		color: 0xc0c0d0,
		glowColor: 0xddddff,
		category: "metal",
	},
	silicon: {
		name: "Silicon",
		value: 4,
		color: 0x556688,
		glowColor: 0x4488cc,
		category: "electronic",
	},
	circuit: {
		name: "Circuit Board",
		value: 8,
		color: 0x228844,
		glowColor: 0x00ff88,
		category: "electronic",
	},
	processor: {
		name: "Processor",
		value: 20,
		color: 0x334455,
		glowColor: 0x00e5ff,
		category: "electronic",
	},
	polymer: {
		name: "Polymer",
		value: 2,
		color: 0x445544,
		glowColor: 0x66aa66,
		category: "organic",
	},
	crystal: {
		name: "Crystal",
		value: 15,
		color: 0x88aacc,
		glowColor: 0xaaddff,
		category: "rare",
	},
	power_core: {
		name: "Power Core",
		value: 25,
		color: 0xaaaa22,
		glowColor: 0xffff44,
		category: "rare",
	},
};

/**
 * Look up a cube material by ID. Returns undefined for unknown IDs.
 */
export function getCubeMaterial(id: string): CubeMaterial | undefined {
	return CUBE_MATERIALS[id];
}

/**
 * Get the value of a material by ID. Returns 1 as fallback for unknown materials.
 */
export function getMaterialValue(id: string): number {
	return CUBE_MATERIALS[id]?.value ?? 1;
}
