/**
 * Biome properties and gameplay modifiers.
 *
 * Each biome on the machine planet has distinct movement, harvesting,
 * visibility, and special modifiers. This module provides:
 *   - Biome definitions loaded from config/biomes.json
 *   - Grid-based biome lookup initialized from map generation output
 *   - Movement cost and passability queries for pathfinding / AI
 */

import biomesConfig from "../../config/biomes.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BiomeModifiers {
	/** Movement speed multiplier (1.0 = normal, 0 = impassable). */
	moveSpeedMod: number;
	/** Harvest efficiency multiplier. */
	harvestMod: number;
	/** Vision / fog-of-war range multiplier. */
	visibility: number;
	/** Background / terrain tint color (hex). */
	bgColor: string;
	/** Bonus to signal relay range in this biome (1.0 = none). */
	signalBonus: number;
	/** Whether units can enter this biome at all. */
	passable: boolean;
}

// ---------------------------------------------------------------------------
// Biome definitions — loaded from config/biomes.json
// ---------------------------------------------------------------------------

/**
 * Build the BiomeModifiers lookup from biomes.json.
 * Only the fields consumed by pathfinding / AI are extracted here;
 * additional per-biome data (lore names, resource multipliers, etc.)
 * lives in the config and can be read directly when needed.
 */
function buildBiomeDefinitions(): Record<string, BiomeModifiers> {
	const result: Record<string, BiomeModifiers> = {};
	for (const [name, biome] of Object.entries(biomesConfig.biomes)) {
		result[name] = {
			moveSpeedMod: biome.moveSpeedMod,
			harvestMod: biome.harvestMod,
			visibility: biome.visibility,
			bgColor: biome.bgColor,
			signalBonus: biome.signalBonus,
			passable: biome.passable,
		};
	}
	return result;
}

const BIOME_DEFINITIONS: Record<string, BiomeModifiers> = buildBiomeDefinitions();

/** Default modifiers returned when biome name is unknown. */
const DEFAULT_MODIFIERS: BiomeModifiers = {
	moveSpeedMod: biomesConfig.defaultModifiers.moveSpeedMod,
	harvestMod: biomesConfig.defaultModifiers.harvestMod,
	visibility: biomesConfig.defaultModifiers.visibility,
	bgColor: biomesConfig.defaultModifiers.bgColor,
	signalBonus: biomesConfig.defaultModifiers.signalBonus,
	passable: biomesConfig.defaultModifiers.passable,
};

// ---------------------------------------------------------------------------
// Module state — biome grid
// ---------------------------------------------------------------------------

let biomeGrid: string[][] = [];
let gridWidth = 0;
let gridHeight = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the static modifier definitions for a biome by name.
 * Returns default modifiers if the biome name is not recognized.
 */
export function getBiomeModifiers(biomeName: string): BiomeModifiers {
	return BIOME_DEFINITIONS[biomeName] ?? { ...DEFAULT_MODIFIERS };
}

/**
 * Get all biome names that have definitions.
 */
export function getDefinedBiomes(): string[] {
	return Object.keys(BIOME_DEFINITIONS);
}

/**
 * Initialize the biome grid from map generation output.
 *
 * @param grid - 2D array of biome name strings (z-major, i.e. grid[z][x]).
 */
export function setBiomeGrid(grid: string[][]): void {
	biomeGrid = grid;
	gridHeight = grid.length;
	gridWidth = gridHeight > 0 ? grid[0].length : 0;
}

/**
 * Clear the biome grid — for testing or world reset.
 */
export function resetBiomeGrid(): void {
	biomeGrid = [];
	gridWidth = 0;
	gridHeight = 0;
}

/**
 * Get the biome data at a world grid position.
 *
 * @param x - Grid x coordinate (integer).
 * @param z - Grid z coordinate (integer).
 * @returns BiomeModifiers for the cell, or default modifiers if out of bounds.
 */
export function getBiomeAt(x: number, z: number): BiomeModifiers {
	if (
		biomeGrid.length === 0 ||
		z < 0 ||
		z >= gridHeight ||
		x < 0 ||
		x >= gridWidth
	) {
		return { ...DEFAULT_MODIFIERS };
	}

	const biomeName = biomeGrid[z][x];
	return getBiomeModifiers(biomeName);
}

/**
 * Get the biome name string at a world grid position.
 *
 * @returns Biome name, or "unknown" if out of bounds or grid not set.
 */
export function getBiomeNameAt(x: number, z: number): string {
	if (
		biomeGrid.length === 0 ||
		z < 0 ||
		z >= gridHeight ||
		x < 0 ||
		x >= gridWidth
	) {
		return "unknown";
	}
	return biomeGrid[z][x];
}

/**
 * Get the effective movement cost at a world grid position.
 *
 * Returns the inverse of moveSpeedMod (higher = slower). Impassable cells
 * return Infinity so pathfinding algorithms skip them.
 *
 * @param x - Grid x coordinate.
 * @param z - Grid z coordinate.
 * @returns Movement cost multiplier (1.0 = normal, Infinity = impassable).
 */
export function getMovementCost(x: number, z: number): number {
	const modifiers = getBiomeAt(x, z);
	if (!modifiers.passable || modifiers.moveSpeedMod <= 0) {
		return Infinity;
	}
	return 1.0 / modifiers.moveSpeedMod;
}

/**
 * Check whether a cell is passable (units can enter).
 *
 * @param x - Grid x coordinate.
 * @param z - Grid z coordinate.
 * @returns true if the cell is walkable.
 */
export function isPassable(x: number, z: number): boolean {
	const modifiers = getBiomeAt(x, z);
	return modifiers.passable;
}
