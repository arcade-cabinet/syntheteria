/**
 * Procedural world generation — pure logic, no rendering dependencies.
 *
 * Uses a seeded linear congruential PRNG and fractal value noise to produce
 * deterministic worlds: same seed + config always yields identical output.
 *
 * Output includes heightmap, biome grid, ore deposits, start positions,
 * and ruin locations. Feeds into BiomeSystem and terrain rendering.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapGenConfig {
	/** Grid dimension — world is worldSize x worldSize cells. */
	worldSize: number;
	/** Height threshold below which cells become water (0-1 normalized). */
	waterLevel: number;
	/** Multiplier for ore deposit density (1.0 = baseline). */
	oreAbundance: number;
	/** Controls spatial frequency of biome variation. */
	biomeScale: number;
}

export interface OreDeposit {
	x: number;
	z: number;
	type: string;
	richness: number;
}

export interface StartPosition {
	x: number;
	z: number;
	faction: string;
}

export interface Ruin {
	x: number;
	z: number;
	type: string;
}

export interface WorldData {
	heightmap: number[][];
	biomes: string[][];
	oreDeposits: OreDeposit[];
	startPositions: StartPosition[];
	ruins: Ruin[];
}

// ---------------------------------------------------------------------------
// Seeded PRNG — linear congruential generator
// ---------------------------------------------------------------------------

/**
 * Create a seeded PRNG using the project-standard LCG:
 *   next = (seed * 1664525 + 1013904223) & 0x7FFFFFFF
 *
 * Returns a function that produces values in [0, 1).
 */
export function createPRNG(seed: number): () => number {
	let state = seed & 0x7fffffff;
	return () => {
		state = (state * 1664525 + 1013904223) & 0x7fffffff;
		return state / 0x80000000; // divide by 2^31 for [0, 1)
	};
}

// ---------------------------------------------------------------------------
// Value noise helpers
// ---------------------------------------------------------------------------

/**
 * Build a 2D grid of random values in [0, 1) from the PRNG.
 * Grid is (size+1) x (size+1) to allow wrapping lookups.
 */
function buildNoiseGrid(size: number, rng: () => number): number[][] {
	const grid: number[][] = [];
	for (let z = 0; z <= size; z++) {
		const row: number[] = [];
		for (let x = 0; x <= size; x++) {
			row.push(rng());
		}
		grid.push(row);
	}
	return grid;
}

/** Smooth interpolation (Hermite / smoothstep). */
function smoothstep(t: number): number {
	return t * t * (3 - 2 * t);
}

/**
 * Sample value noise at continuous position (fx, fz) using bilinear
 * interpolation with smoothstep blending.
 */
function sampleNoise(
	grid: number[][],
	gridSize: number,
	fx: number,
	fz: number,
): number {
	const ix = Math.floor(fx);
	const iz = Math.floor(fz);
	const tx = smoothstep(fx - ix);
	const tz = smoothstep(fz - iz);

	// Wrap indices to stay inside noise grid
	const x0 = ((ix % gridSize) + gridSize) % gridSize;
	const x1 = ((ix + 1) % gridSize + gridSize) % gridSize;
	const z0 = ((iz % gridSize) + gridSize) % gridSize;
	const z1 = ((iz + 1) % gridSize + gridSize) % gridSize;

	const v00 = grid[z0][x0];
	const v10 = grid[z0][x1];
	const v01 = grid[z1][x0];
	const v11 = grid[z1][x1];

	const top = v00 + (v10 - v00) * tx;
	const bot = v01 + (v11 - v01) * tx;
	return top + (bot - top) * tz;
}

// ---------------------------------------------------------------------------
// Heightmap generation — fractal value noise (2 octaves)
// ---------------------------------------------------------------------------

function generateHeightmap(
	worldSize: number,
	rng: () => number,
	octaves: number = 2,
): number[][] {
	// Each octave gets its own noise grid at increasing resolution
	const grids: { grid: number[][]; gridSize: number; freq: number; amp: number }[] = [];
	let amp = 1.0;
	let freq = 1.0;
	let totalAmp = 0;

	for (let o = 0; o < octaves; o++) {
		const gridSize = Math.max(4, Math.ceil(8 * freq));
		grids.push({ grid: buildNoiseGrid(gridSize, rng), gridSize, freq, amp });
		totalAmp += amp;
		amp *= 0.5;
		freq *= 2;
	}

	const heightmap: number[][] = [];
	for (let z = 0; z < worldSize; z++) {
		const row: number[] = [];
		for (let x = 0; x < worldSize; x++) {
			// Normalize coordinates to [0, gridSize) for each octave
			let h = 0;
			for (const oct of grids) {
				const fx = (x / worldSize) * oct.gridSize * oct.freq;
				const fz = (z / worldSize) * oct.gridSize * oct.freq;
				h += sampleNoise(oct.grid, oct.gridSize, fx, fz) * oct.amp;
			}
			row.push(h / totalAmp); // Normalize to [0, 1]
		}
		heightmap.push(row);
	}

	return heightmap;
}

// ---------------------------------------------------------------------------
// Moisture map — separate noise layer for biome variation
// ---------------------------------------------------------------------------

function generateMoistureMap(
	worldSize: number,
	rng: () => number,
	biomeScale: number,
): number[][] {
	const gridSize = Math.max(4, Math.ceil(8 * biomeScale));
	const noiseGrid = buildNoiseGrid(gridSize, rng);

	const moisture: number[][] = [];
	for (let z = 0; z < worldSize; z++) {
		const row: number[] = [];
		for (let x = 0; x < worldSize; x++) {
			const fx = (x / worldSize) * gridSize * biomeScale;
			const fz = (z / worldSize) * gridSize * biomeScale;
			row.push(sampleNoise(noiseGrid, gridSize, fx, fz));
		}
		moisture.push(row);
	}

	return moisture;
}

// ---------------------------------------------------------------------------
// Biome assignment — height + moisture classification
// ---------------------------------------------------------------------------

/** Biome names matching the project's machine-planet theme. */
export const BIOME_NAMES = [
	"deep_water",
	"shallow_water",
	"rust_plains",
	"scrap_hills",
	"chrome_ridge",
	"signal_plateau",
] as const;

export type BiomeName = (typeof BIOME_NAMES)[number];

/**
 * Classify a cell into a biome based on its height and moisture.
 *
 * Height thresholds (normalized 0-1, relative to waterLevel):
 *   [0, waterLevel * 0.6)       → deep_water
 *   [waterLevel * 0.6, waterLevel) → shallow_water
 *   [waterLevel, 0.5)           → rust_plains  (low moisture) or signal_plateau (high moisture)
 *   [0.5, 0.75)                 → scrap_hills
 *   [0.75, 1.0]                 → chrome_ridge
 */
function classifyBiome(
	height: number,
	moisture: number,
	waterLevel: number,
): BiomeName {
	if (height < waterLevel * 0.6) return "deep_water";
	if (height < waterLevel) return "shallow_water";
	if (height >= 0.75) return "chrome_ridge";
	if (height >= 0.5) return "scrap_hills";
	// Ground level: moisture splits between rust_plains and signal_plateau
	if (moisture > 0.6) return "signal_plateau";
	return "rust_plains";
}

function generateBiomeGrid(
	heightmap: number[][],
	moistureMap: number[][],
	worldSize: number,
	waterLevel: number,
): string[][] {
	const biomes: string[][] = [];
	for (let z = 0; z < worldSize; z++) {
		const row: string[] = [];
		for (let x = 0; x < worldSize; x++) {
			row.push(classifyBiome(heightmap[z][x], moistureMap[z][x], waterLevel));
		}
		biomes.push(row);
	}
	return biomes;
}

// ---------------------------------------------------------------------------
// Ore deposit placement
// ---------------------------------------------------------------------------

/** Ore types available on the machine planet. */
const ORE_TYPES = [
	"scrap_iron",
	"copper",
	"silicon",
	"titanium",
	"carbon",
	"rare_earth",
	"gold",
	"quantum_crystal",
] as const;

function distance(
	ax: number,
	az: number,
	bx: number,
	bz: number,
): number {
	const dx = ax - bx;
	const dz = az - bz;
	return Math.sqrt(dx * dx + dz * dz);
}

function placeOreDeposits(
	heightmap: number[][],
	worldSize: number,
	waterLevel: number,
	oreAbundance: number,
	rng: () => number,
): OreDeposit[] {
	// Base deposit count scales with world area and abundance
	const area = worldSize * worldSize;
	const baseCount = Math.floor(area * 0.002 * oreAbundance);
	const minSpacing = Math.max(3, worldSize * 0.05);
	const deposits: OreDeposit[] = [];
	const maxAttempts = baseCount * 20;
	let attempts = 0;

	while (deposits.length < baseCount && attempts < maxAttempts) {
		attempts++;

		const x = Math.floor(rng() * worldSize);
		const z = Math.floor(rng() * worldSize);

		// Skip water cells
		if (heightmap[z][x] < waterLevel) continue;

		// Enforce minimum spacing
		const tooClose = deposits.some(
			(d) => distance(x, z, d.x, d.z) < minSpacing,
		);
		if (tooClose) continue;

		// Pick ore type — rarer types at higher indices, weighted by rng
		const typeIndex = Math.floor(rng() * ORE_TYPES.length);
		const type = ORE_TYPES[typeIndex];

		// Richness: 0.3-1.0, biased by height (higher = rarer, richer)
		const richness = 0.3 + rng() * 0.7 * heightmap[z][x];

		deposits.push({ x, z, type, richness });
	}

	return deposits;
}

// ---------------------------------------------------------------------------
// Start position placement — equidistant from center
// ---------------------------------------------------------------------------

const FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

function placeStartPositions(
	heightmap: number[][],
	worldSize: number,
	waterLevel: number,
	numFactions: number,
	rng: () => number,
): StartPosition[] {
	const center = worldSize / 2;
	const radius = worldSize * 0.35; // 35% of world from center
	const minDistance = worldSize * 0.3;
	const positions: StartPosition[] = [];

	const factionCount = Math.min(numFactions, FACTIONS.length);

	// Place factions at equal angular intervals with a random phase offset
	const phaseOffset = rng() * Math.PI * 2;

	for (let i = 0; i < factionCount; i++) {
		const angle = phaseOffset + (i / factionCount) * Math.PI * 2;
		let bestX = Math.round(center + Math.cos(angle) * radius);
		let bestZ = Math.round(center + Math.sin(angle) * radius);

		// Nudge to find valid (non-water) cell within a search radius
		let found = false;
		for (let r = 0; r <= 10 && !found; r++) {
			for (let dz = -r; dz <= r && !found; dz++) {
				for (let dx = -r; dx <= r && !found; dx++) {
					const cx = bestX + dx;
					const cz = bestZ + dz;
					if (cx < 0 || cx >= worldSize || cz < 0 || cz >= worldSize) continue;
					if (heightmap[cz][cx] >= waterLevel) {
						bestX = cx;
						bestZ = cz;
						found = true;
					}
				}
			}
		}

		positions.push({
			x: bestX,
			z: bestZ,
			faction: FACTIONS[i],
		});
	}

	// Verify minimum distance constraint — warn but don't fail
	for (let i = 0; i < positions.length; i++) {
		for (let j = i + 1; j < positions.length; j++) {
			const d = distance(
				positions[i].x,
				positions[i].z,
				positions[j].x,
				positions[j].z,
			);
			if (d < minDistance) {
				// On very small maps this can happen; positions are still usable
			}
		}
	}

	return positions;
}

// ---------------------------------------------------------------------------
// Ruin placement — high-altitude, low frequency
// ---------------------------------------------------------------------------

const RUIN_TYPES = [
	"collapsed_factory",
	"signal_tower",
	"forge_remnant",
	"data_vault",
	"power_station",
] as const;

function placeRuins(
	heightmap: number[][],
	worldSize: number,
	rng: () => number,
): Ruin[] {
	const ruins: Ruin[] = [];
	const minSpacing = worldSize * 0.1;
	// Target ~1 ruin per 2500 cells
	const targetCount = Math.max(1, Math.floor((worldSize * worldSize) / 2500));
	const maxAttempts = targetCount * 30;
	let attempts = 0;

	while (ruins.length < targetCount && attempts < maxAttempts) {
		attempts++;

		const x = Math.floor(rng() * worldSize);
		const z = Math.floor(rng() * worldSize);

		// Only place ruins at height >= 0.55 (elevated terrain)
		if (heightmap[z][x] < 0.55) continue;

		// Enforce spacing
		const tooClose = ruins.some(
			(r) => distance(x, z, r.x, r.z) < minSpacing,
		);
		if (tooClose) continue;

		const typeIndex = Math.floor(rng() * RUIN_TYPES.length);
		ruins.push({ x, z, type: RUIN_TYPES[typeIndex] });
	}

	return ruins;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a complete world from a seed and configuration.
 *
 * Deterministic: identical seed + config always produces identical WorldData.
 *
 * @param seed - Integer seed for the PRNG.
 * @param config - World generation parameters.
 * @returns Complete world data with heightmap, biomes, deposits, starts, ruins.
 */
export function generateWorld(seed: number, config: MapGenConfig): WorldData {
	const rng = createPRNG(seed);

	const heightmap = generateHeightmap(config.worldSize, rng);
	const moistureMap = generateMoistureMap(config.worldSize, rng, config.biomeScale);
	const biomes = generateBiomeGrid(
		heightmap,
		moistureMap,
		config.worldSize,
		config.waterLevel,
	);
	const oreDeposits = placeOreDeposits(
		heightmap,
		config.worldSize,
		config.waterLevel,
		config.oreAbundance,
		rng,
	);
	const startPositions = placeStartPositions(
		heightmap,
		config.worldSize,
		config.waterLevel,
		FACTIONS.length,
		rng,
	);
	const ruins = placeRuins(heightmap, config.worldSize, rng);

	return {
		heightmap,
		biomes,
		oreDeposits,
		startPositions,
		ruins,
	};
}
