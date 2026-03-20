/**
 * Board generator — public API.
 *
 * Generates a noise-based overworld board with biome-style terrain.
 * Uses elevation noise for mountains/water, floor type assignment
 * from terrain cluster noise, and deterministic resource scatter.
 *
 * Deterministic: same seed = identical output.
 */

import { FLOOR_DEFS, type FloorType, floorTypeForTile } from "../terrain";
import { seededRng } from "./noise";
import type { BoardConfig, Elevation, GeneratedBoard, TileData } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Fraction of tiles that should be passable (target, not guaranteed). */
const _TARGET_PASSABLE_RATIO = 0.65;

/**
 * Surface scatter rates per biome type.
 * Backstop deposits — survival-level basics when no buildings are in range.
 */
const SCATTER_RATE: Record<string, number> = {
	mountain: 0.7,
	water: 0,
	grassland: 0.08,
	forest: 0.12,
	desert: 0.08,
	hills: 0.15,
	wetland: 0.08,
	ruins: 0.2,
	tundra: 0.06,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a game board from a configuration.
 *
 * Pipeline:
 *   1. Create tile grid with default values
 *   2. Apply elevation noise (mountains, pits, flat ground)
 *   3. Assign floor types from cluster noise
 *   4. Scatter resources on eligible tiles
 *   5. Force player start at center
 *
 * Deterministic: same seed = identical output.
 */
export function generateBoard(config: BoardConfig): GeneratedBoard {
	const { width, height, seed } = config;
	const centerX = Math.floor(width / 2);
	const centerZ = Math.floor(height / 2);

	// Phase 1: Create tile grid
	const tiles = createTileGrid(width, height, seed);

	// Phase 2: Apply elevation noise
	applyElevation(tiles, width, height, seed);

	// Phase 3: Assign floor types from terrain noise
	assignFloorTypes(tiles, width, height, seed);

	// Phase 4: Scatter resources
	scatterResources(tiles, width, height, seed);

	// Phase 5: Force player start at center
	forcePlayerStart(tiles, centerX, centerZ, width, height);

	return { config, tiles };
}

// ─── Phase 1: Tile grid ─────────────────────────────────────────────────────

function createTileGrid(w: number, h: number, _seed: string): TileData[][] {
	const tiles: TileData[][] = [];
	for (let z = 0; z < h; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < w; x++) {
			row.push({
				x,
				z,
				elevation: 0,
				passable: true,
				floorType: "grassland",
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return tiles;
}

// ─── Phase 2: Elevation ─────────────────────────────────────────────────────

/**
 * Apply procedural elevation using layered sine/cosine noise.
 * Creates terrain features: mountains (elevation 2), hills (1),
 * flat ground (0), and water (-1).
 */
function applyElevation(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
): void {
	const rng = seededRng(seed + "_elevation");
	const phaseX = rng() * Math.PI * 2;
	const phaseZ = rng() * Math.PI * 2;
	const phaseX2 = rng() * Math.PI * 2;
	const phaseZ2 = rng() * Math.PI * 2;

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			const nx = x / w;
			const nz = z / h;
			const n1 = Math.sin(nx * 8 + phaseX) * Math.cos(nz * 8 + phaseZ) * 0.5;
			const n2 =
				Math.sin(nx * 16 + phaseX2) * Math.cos(nz * 16 + phaseZ2) * 0.25;
			const noise = n1 + n2;

			if (noise > 0.4) {
				tile.elevation = 2 as Elevation;
				tile.passable = false;
			} else if (noise > 0.2) {
				tile.elevation = 1 as Elevation;
			} else if (noise < -0.4) {
				tile.elevation = -1 as Elevation;
				tile.passable = false;
			} else {
				tile.elevation = 0 as Elevation;
			}
		}
	}
}

// ─── Phase 3: Floor types ───────────────────────────────────────────────────

/**
 * Assign floor types based on elevation and cluster noise.
 * Impassable tiles get geography-driven types; passable tiles get
 * cluster-noise-driven biome types.
 */
function assignFloorTypes(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
): void {
	const rng = seededRng(seed + "_floors");

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			if (tile.elevation === -1) {
				tile.floorType = "water";
				tile.passable = false;
				continue;
			}

			if (tile.elevation === 2) {
				tile.floorType = "mountain";
				tile.passable = false;
				continue;
			}

			// Passable tiles: use terrain noise for biome variety
			const noiseFloor = floorTypeForTile(x, z, 0, seed);
			if (noiseFloor !== "water" && noiseFloor !== "mountain") {
				tile.floorType = noiseFloor;
			} else {
				const passableTypes: FloorType[] = [
					"grassland",
					"forest",
					"desert",
					"hills",
					"wetland",
					"ruins",
					"tundra",
				];
				tile.floorType = passableTypes[
					Math.floor(rng() * passableTypes.length)
				] as FloorType;
			}
		}
	}
}

// ─── Phase 4: Resource scatter ──────────────────────────────────────────────

function scatterResources(
	tiles: TileData[][],
	w: number,
	h: number,
	seed: string,
): void {
	const rng = seededRng(seed + "_props");

	for (let z = 0; z < h; z++) {
		for (let x = 0; x < w; x++) {
			const tile = tiles[z]![x]!;

			const rate = SCATTER_RATE[tile.floorType] ?? 0;
			if (rate === 0) continue;
			if (rng() >= rate) continue;

			const def = FLOOR_DEFS[tile.floorType];
			if (!def.mineable || def.resourceMaterial === null) continue;

			tile.resourceMaterial = def.resourceMaterial;
			const [min, max] = def.resourceAmount;
			tile.resourceAmount = min + Math.floor(rng() * (max - min + 1));
		}
	}
}

// ─── Phase 5: Player start ─────────────────────────────────────────────────

function forcePlayerStart(
	tiles: TileData[][],
	cx: number,
	cz: number,
	w: number,
	h: number,
): void {
	const radius = 2;
	for (let dz = -radius; dz <= radius; dz++) {
		for (let dx = -radius; dx <= radius; dx++) {
			const tx = cx + dx;
			const tz = cz + dz;
			if (tx < 0 || tx >= w || tz < 0 || tz >= h) continue;
			const tile = tiles[tz]![tx]!;
			tile.elevation = 0;
			tile.passable = true;
			if (tile.floorType === "water" || tile.floorType === "mountain") {
				tile.floorType = "grassland";
			}
		}
	}

	const spawn = tiles[cz]![cx]!;
	spawn.floorType = "grassland";
	spawn.resourceMaterial = null;
	spawn.resourceAmount = 0;
}
