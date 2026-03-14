/**
 * Chunk-based ecumenopolis map generator.
 *
 * Translating Civ terrain gen to machine-city terms:
 *   Mountains = buildings/structures (impassable)
 *   Plains    = floor tiles (walkable)
 *   Forests   = harvestable resource clusters (impassable)
 *   Hills     = raised platforms (walkable at elevation)
 *   Bridges   = platforms spanning over corridors
 *   Passes    = gaps in structure walls
 *
 * PLACEMENT RULES:
 *   1. Structures form CONNECTED runs — walls grow in cardinal directions,
 *      columns anchor endpoints/corners, pipes run parallel.
 *   2. Resources CLUSTER by family — barrels together, crystals together.
 *      Never random individual scatter.
 *   3. Props placed near CONTEXT — details near walls, vents near pipes.
 *   4. Floor materials form PATCHES — not random per-tile.
 *   5. Every model occupies exactly one 2m×2m tile, snapped to tile center.
 *
 * Each chunk is 8×8 tiles, generated deterministically from
 * worldSeed + chunk coordinates. The baseline is NEVER stored —
 * only player deltas go to SQLite.
 *
 * Model definitions and floor materials are read from SQLite (seeded at bootstrap).
 */

import { getFloorMaterials } from "../../db/gameConfig";
import { getModelDefinitionsFromDb, type ModelEntry } from "../../db/modelDefinitions";
import type { SyncDatabase } from "../../db/types";
import {
	CHUNK_SIZE,
	FOUR_DIRS,
	LEVEL_HEIGHTS,
	MAX_BRIDGE_SPAN,
	type FloorMaterial,
	type MapChunk,
	type MapTile,
	chunkTileIndex,
} from "./types";

// ─── PRNG ────────────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
	};
}

function hashChunkCoords(worldSeed: number, cx: number, cz: number): number {
	let h = worldSeed >>> 0;
	h = (Math.imul(h ^ (cx * 374761393), 668265263) + (cz * 2654435769)) >>> 0;
	h = (Math.imul(h ^ (h >>> 15), 2246822519)) >>> 0;
	h = (Math.imul(h ^ (h >>> 13), 3266489917)) >>> 0;
	return (h ^ (h >>> 16)) >>> 0;
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
	return arr[Math.floor(rng() * arr.length)]!;
}

function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
}

// ─── Build model pools from DB ───────────────────────────────────────────────

function buildModelPools(allModels: ModelEntry[]) {
	const wallPool = allModels.filter((m) => m.family === "wall" && !m.passable);
	const columnPool = allModels.filter((m) => m.family === "column" && !m.passable);
	const pipePool = allModels.filter((m) => m.family === "pipe" && !m.passable);
	const barrierPool = allModels.filter(
		(m) => ["barricade", "fence"].includes(m.family) && !m.passable,
	);
	const buildingPool = allModels.filter(
		(m) => m.family === "structure" && !m.passable,
	);
	const structurePool = allModels.filter(
		(m) =>
			!m.passable &&
			!m.hasHarvest &&
			["wall", "column", "structure", "support", "pipe", "barricade", "fence"].includes(m.family),
	);
	const containerPool = allModels.filter(
		(m) => m.hasHarvest && !m.passable && m.family === "container",
	);
	const naturalPool = allModels.filter(
		(m) => m.hasHarvest && !m.passable && m.family === "resource",
	);
	const generatorPool = allModels.filter(
		(m) => m.hasHarvest && !m.passable && m.family === "generator",
	);
	const vehiclePool = allModels.filter(
		(m) => m.hasHarvest && !m.passable && m.family === "vehicle",
	);
	const harvestableStructurePool = allModels.filter(
		(m) =>
			m.hasHarvest &&
			!m.passable &&
			["wall", "column", "pipe", "barricade", "fence", "antenna", "prop", "computer"].includes(
				m.family,
			),
	);
	const resourcePool = allModels.filter((m) => m.hasHarvest && !m.passable);
	const resourceFamilies: { pool: ModelEntry[]; weight: number }[] = [
		{ pool: containerPool, weight: 3 },
		{ pool: naturalPool, weight: 2 },
		{ pool: generatorPool, weight: 2 },
		{ pool: vehiclePool, weight: 1 },
		{ pool: harvestableStructurePool, weight: 2 },
	].filter((f) => f.pool.length > 0);
	const propPool = allModels.filter(
		(m) =>
			m.passable &&
			["detail", "floor", "cable", "vent", "conveyor", "sign", "collectible", "terrain"].includes(
				m.family,
			),
	);
	const detailProps = propPool.filter((m) => m.family === "detail" || m.family === "sign");
	const ventProps = propPool.filter((m) => m.family === "vent");
	const cableProps = propPool.filter((m) => ["cable", "conveyor"].includes(m.family));
	const floorProps = propPool.filter((m) =>
		["floor", "terrain", "collectible"].includes(m.family),
	);
	const bridgePool = allModels.filter((m) => m.isBridge);
	const supportPool = allModels.filter((m) => m.isSupport);
	const rampPool = allModels.filter((m) => m.isRamp);

	return {
		structurePool,
		wallPool,
		columnPool,
		pipePool,
		barrierPool,
		buildingPool,
		resourcePool,
		resourceFamilies,
		propPool,
		detailProps,
		ventProps,
		cableProps,
		floorProps,
		bridgePool,
		supportPool,
		rampPool,
	};
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isInBounds(lx: number, lz: number): boolean {
	return lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE;
}

function tileAt(tiles: MapTile[], lx: number, lz: number): MapTile | null {
	if (!isInBounds(lx, lz)) return null;
	return tiles[chunkTileIndex(lx, lz)] ?? null;
}

function isEmpty(tiles: MapTile[], lx: number, lz: number): boolean {
	const t = tileAt(tiles, lx, lz);
	return t !== null && t.passable && t.modelId === null;
}

function isStructure(tiles: MapTile[], lx: number, lz: number): boolean {
	const t = tileAt(tiles, lx, lz);
	return t !== null && !t.passable && t.modelLayer === "structure";
}

/** Count how many cardinal neighbors match a predicate */
function countNeighbors(
	tiles: MapTile[],
	lx: number,
	lz: number,
	pred: (t: MapTile) => boolean,
): number {
	let count = 0;
	for (const [dx, dz] of FOUR_DIRS) {
		const t = tileAt(tiles, lx + dx, lz + dz);
		if (t && pred(t)) count++;
	}
	return count;
}

/** Rotation that aligns a model's "front" with a direction */
function directionToRotation(dx: number, dz: number): 0 | 1 | 2 | 3 {
	if (dz === -1) return 0; // North
	if (dx === 1) return 1; // East
	if (dz === 1) return 2; // South
	if (dx === -1) return 3; // West
	return 0;
}

// ─── Chunk Generator ─────────────────────────────────────────────────────────

type ModelPools = ReturnType<typeof buildModelPools>;

/**
 * Generate a single map chunk deterministically.
 * The same (worldSeed, cx, cz) always produces the exact same chunk.
 * Model definitions and floor materials are read from SQLite.
 */
export function generateChunk(
	worldSeed: number,
	cx: number,
	cz: number,
	db: SyncDatabase,
): MapChunk {
	const allModels = getModelDefinitionsFromDb(db);
	const floorMaterials = getFloorMaterials(db);
	const pools = buildModelPools(allModels);

	// Fallback if DB has no floor materials
	const materials: FloorMaterial[] =
		floorMaterials.length > 0
			? (floorMaterials as FloorMaterial[])
			: (["metal_panel", "concrete_slab", "industrial_grating", "rusty_plating", "corroded_steel"] as FloorMaterial[]);

	const chunkSeed = hashChunkCoords(worldSeed, cx, cz);
	const rng = mulberry32(chunkSeed);

	const originX = cx * CHUNK_SIZE;
	const originZ = cz * CHUNK_SIZE;

	// Initialize all tiles as empty walkable floor
	const tiles: MapTile[] = new Array(CHUNK_SIZE * CHUNK_SIZE);
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			const idx = chunkTileIndex(lx, lz);
			tiles[idx] = {
				x: originX + lx,
				z: originZ + lz,
				level: 0,
				elevationY: 0,
				clearanceAbove: 100,
				floorMaterial: "metal_panel", // placeholder — painted in patches below
				modelId: null,
				modelLayer: null,
				rotation: 0,
				passable: true,
				isBridge: false,
				isRamp: false,
			};
		}
	}

	// Phase 0: Paint floor material PATCHES (not random per-tile)
	paintFloorPatches(tiles, rng, materials);

	// Phase 1: Grow connected structure runs ("mountain ranges")
	growStructureRuns(tiles, rng, pools);

	// Phase 2: Place resource CLUSTERS by family ("forests")
	placeResourceClusters(tiles, rng, pools);

	// Phase 3: Place platforms and bridges over choked corridors
	placeBridges(tiles, rng, pools);

	// Phase 4: Place props near their CONTEXT (not random scatter)
	placeContextualProps(tiles, rng, pools);

	// Phase 5: Validate walkability — ensure ≥70% passable
	enforceWalkability(tiles, rng);

	return { cx, cz, tiles };
}

// ─── Phase 0: Floor Material Patches ────────────────────────────────────────

/**
 * Paint floor materials in 2-4 contiguous patches across the chunk.
 * Adjacent tiles share materials — no random per-tile assignment.
 */
function paintFloorPatches(
	tiles: MapTile[],
	rng: () => number,
	floorMaterials: FloorMaterial[],
): void {
	if (floorMaterials.length === 0) return;

	// Pick 2-4 patch seeds
	const patchCount = 2 + Math.floor(rng() * 3);
	const patches: { lx: number; lz: number; material: FloorMaterial }[] = [];

	for (let i = 0; i < patchCount; i++) {
		patches.push({
			lx: Math.floor(rng() * CHUNK_SIZE),
			lz: Math.floor(rng() * CHUNK_SIZE),
			material: pickRandom(floorMaterials, rng),
		});
	}

	// Assign each tile to nearest patch (Voronoi-style)
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			let bestDist = Infinity;
			let bestMat: FloorMaterial = "metal_panel";
			for (const patch of patches) {
				const dist = Math.abs(lx - patch.lx) + Math.abs(lz - patch.lz);
				if (dist < bestDist) {
					bestDist = dist;
					bestMat = patch.material;
				}
			}
			tiles[chunkTileIndex(lx, lz)]!.floorMaterial = bestMat;
		}
	}
}

// ─── Phase 1: Structure Runs (Mountains) ────────────────────────────────────

/**
 * Grow connected structure runs from anchor points.
 *
 * Instead of random density threshold → random model assignment, we:
 * 1. Pick 2-4 anchor points in the chunk
 * 2. From each, grow wall runs in 1-2 cardinal directions (2-5 tiles long)
 * 3. All tiles in a run use the SAME wall variant
 * 4. Place columns at run endpoints
 * 5. Place pipes parallel to wall exteriors
 * 6. Punch gaps every 3-4 tiles for passability
 *
 * Target: ~20-25% structure coverage.
 */
function growStructureRuns(
	tiles: MapTile[],
	rng: () => number,
	pools: ModelPools,
): void {
	const { structurePool, wallPool, columnPool, pipePool, barrierPool } = pools;
	if (structurePool.length === 0) return;

	const anchorCount = 2 + Math.floor(rng() * 3); // 2-4 anchors

	for (let a = 0; a < anchorCount; a++) {
		const ax = 1 + Math.floor(rng() * (CHUNK_SIZE - 2));
		const az = 1 + Math.floor(rng() * (CHUNK_SIZE - 2));

		// Each anchor grows 1-2 wall runs
		const runCount = 1 + Math.floor(rng() * 2);
		const usedDirs = shuffled(FOUR_DIRS, rng);

		for (let r = 0; r < runCount && r < usedDirs.length; r++) {
			const [dx, dz] = usedDirs[r]!;
			const runLen = 2 + Math.floor(rng() * 4); // 2-5 tiles
			const wallVariant =
				wallPool.length > 0 ? pickRandom(wallPool, rng) : pickRandom(structurePool, rng);
			const rotation = directionToRotation(dx, dz);

			// Grow the run
			let placed = 0;
			for (let step = 0; step < runLen; step++) {
				const lx = ax + dx * step;
				const lz = az + dz * step;

				if (!isEmpty(tiles, lx, lz)) break;

				const idx = chunkTileIndex(lx, lz);
				tiles[idx]!.modelId = wallVariant.id;
				tiles[idx]!.modelLayer = "structure";
				tiles[idx]!.passable = false;
				tiles[idx]!.rotation = rotation;
				placed++;
			}

			// Place column at run endpoint
			if (placed > 0 && columnPool.length > 0) {
				const endX = ax + dx * (placed - 1);
				const endZ = az + dz * (placed - 1);
				const col = pickRandom(columnPool, rng);
				const idx = chunkTileIndex(endX, endZ);
				tiles[idx]!.modelId = col.id;
				// Keep structure layer and impassable

				// Also try to place a column at the start if it wasn't the anchor
				if (placed > 1) {
					const startIdx = chunkTileIndex(ax, az);
					const startCol = pickRandom(columnPool, rng);
					tiles[startIdx]!.modelId = startCol.id;
				}
			}

			// Place pipes parallel to the wall exterior
			if (placed >= 2 && pipePool.length > 0 && rng() < 0.4) {
				// Perpendicular offset direction
				const perpDx = dz;
				const perpDz = -dx;

				const pipeModel = pickRandom(pipePool, rng);
				for (let step = 0; step < placed; step++) {
					const px = ax + dx * step + perpDx;
					const pz = az + dz * step + perpDz;

					if (isEmpty(tiles, px, pz) && rng() < 0.6) {
						const pIdx = chunkTileIndex(px, pz);
						tiles[pIdx]!.modelId = pipeModel.id;
						tiles[pIdx]!.modelLayer = "structure";
						tiles[pIdx]!.passable = false;
						tiles[pIdx]!.rotation = rotation;
					}
				}
			}
		}
	}

	// Fill a few remaining random spots to hit ~20% target
	// But only adjacent to existing structures (grow the ranges)
	const targetStructures = Math.ceil(CHUNK_SIZE * CHUNK_SIZE * 0.20);
	let structureCount = tiles.filter((t) => !t.passable).length;

	if (structureCount < targetStructures) {
		// Grow outward from existing structures
		const candidates = shuffled(
			Array.from({ length: CHUNK_SIZE * CHUNK_SIZE }, (_, i) => i),
			rng,
		);

		for (const idx of candidates) {
			if (structureCount >= targetStructures) break;
			const t = tiles[idx]!;
			if (!t.passable || t.modelId !== null) continue;

			const lx = idx % CHUNK_SIZE;
			const lz = Math.floor(idx / CHUNK_SIZE);

			// Only place if adjacent to existing structure (grow the range)
			if (countNeighbors(tiles, lx, lz, (n) => !n.passable && n.modelLayer === "structure") > 0) {
				// Pick family matching the adjacent structure
				const model =
					barrierPool.length > 0 && rng() < 0.3
						? pickRandom(barrierPool, rng)
						: wallPool.length > 0
							? pickRandom(wallPool, rng)
							: pickRandom(structurePool, rng);
				t.modelId = model.id;
				t.modelLayer = "structure";
				t.passable = false;
				t.rotation = (Math.floor(rng() * 4)) as 0 | 1 | 2 | 3;
				structureCount++;
			}
		}
	}

	// Punch gaps for passability ("mountain passes")
	punchStructureGaps(tiles, rng);
}

function punchStructureGaps(tiles: MapTile[], rng: () => number): void {
	// Rows
	for (let z = 0; z < CHUNK_SIZE; z++) {
		let runLength = 0;
		const gapInterval = 3 + Math.floor(rng() * 2); // 3-4
		for (let x = 0; x < CHUNK_SIZE; x++) {
			const idx = chunkTileIndex(x, z);
			if (!tiles[idx]!.passable && tiles[idx]!.modelLayer === "structure") {
				runLength++;
				if (runLength >= gapInterval) {
					tiles[idx]!.modelId = null;
					tiles[idx]!.modelLayer = null;
					tiles[idx]!.passable = true;
					runLength = 0;
				}
			} else {
				runLength = 0;
			}
		}
	}

	// Columns
	for (let x = 0; x < CHUNK_SIZE; x++) {
		let runLength = 0;
		const gapInterval = 3 + Math.floor(rng() * 2);
		for (let z = 0; z < CHUNK_SIZE; z++) {
			const idx = chunkTileIndex(x, z);
			if (!tiles[idx]!.passable && tiles[idx]!.modelLayer === "structure") {
				runLength++;
				if (runLength >= gapInterval) {
					tiles[idx]!.modelId = null;
					tiles[idx]!.modelLayer = null;
					tiles[idx]!.passable = true;
					runLength = 0;
				}
			} else {
				runLength = 0;
			}
		}
	}
}

// ─── Phase 2: Resource Clusters (Forests) ────────────────────────────────────

/**
 * Place resources in CLUSTERS grouped by family.
 *
 * Instead of picking random individual tiles:
 * 1. Find clearings adjacent to structures
 * 2. Pick a family (containers, crystals, generators, vehicles)
 * 3. Fill 2-4 ADJACENT tiles with models from THAT family
 * 4. Each cluster uses the SAME model (or 1-2 variants from same family)
 *
 * Target: ~5-8% resource coverage.
 */
function placeResourceClusters(
	tiles: MapTile[],
	rng: () => number,
	pools: ModelPools,
): void {
	const { resourcePool, resourceFamilies } = pools;
	if (resourcePool.length === 0 || resourceFamilies.length === 0) return;

	const targetResources = Math.ceil(CHUNK_SIZE * CHUNK_SIZE * 0.07);
	let resourceCount = 0;

	// Find all structure-adjacent empty tiles
	const structureAdjacent: number[] = [];
	const openField: number[] = [];

	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			if (!isEmpty(tiles, lx, lz)) continue;
			const idx = chunkTileIndex(lx, lz);

			if (countNeighbors(tiles, lx, lz, (t) => t.modelLayer === "structure") > 0) {
				structureAdjacent.push(idx);
			} else {
				openField.push(idx);
			}
		}
	}

	// Shuffle candidates
	const adjShuffled = shuffled(structureAdjacent, rng);
	const openShuffled = shuffled(openField, rng);

	// Place clusters — prefer structure-adjacent
	const allSeeds = [...adjShuffled, ...openShuffled];
	const usedTiles = new Set<number>();

	for (const seedIdx of allSeeds) {
		if (resourceCount >= targetResources) break;
		if (usedTiles.has(seedIdx)) continue;

		const seedLx = seedIdx % CHUNK_SIZE;
		const seedLz = Math.floor(seedIdx / CHUNK_SIZE);

		if (!isEmpty(tiles, seedLx, seedLz)) continue;

		// Pick a resource family (weighted random)
		const totalWeight = resourceFamilies.reduce((s, f) => s + f.weight, 0);
		let roll = rng() * totalWeight;
		let chosenFamily = resourceFamilies[0]!;
		for (const fam of resourceFamilies) {
			roll -= fam.weight;
			if (roll <= 0) {
				chosenFamily = fam;
				break;
			}
		}

		// Pick 1-2 model variants from this family
		const primaryModel = pickRandom(chosenFamily.pool, rng);
		const secondaryModel = chosenFamily.pool.length > 1 && rng() < 0.3
			? pickRandom(chosenFamily.pool, rng)
			: primaryModel;

		// Grow cluster: 2-4 adjacent tiles
		const clusterSize = 2 + Math.floor(rng() * 3);
		const clusterTiles: number[] = [seedIdx];
		usedTiles.add(seedIdx);

		// BFS outward from seed to find adjacent empty tiles
		for (let attempt = 0; attempt < clusterSize * 3 && clusterTiles.length < clusterSize; attempt++) {
			const parent = clusterTiles[Math.floor(rng() * clusterTiles.length)]!;
			const px = parent % CHUNK_SIZE;
			const pz = Math.floor(parent / CHUNK_SIZE);
			const dir = FOUR_DIRS[Math.floor(rng() * 4)]!;
			const nx = px + dir[0];
			const nz = pz + dir[1];

			if (!isInBounds(nx, nz)) continue;
			const nIdx = chunkTileIndex(nx, nz);
			if (usedTiles.has(nIdx)) continue;
			if (!isEmpty(tiles, nx, nz)) continue;

			// Must have at least 1 walkable neighbor that's NOT in this cluster
			const walkableNonCluster = countNeighbors(tiles, nx, nz, (t) =>
				t.passable && t.modelId === null,
			) - 1; // -1 for the parent we came from
			if (walkableNonCluster < 1) continue;

			clusterTiles.push(nIdx);
			usedTiles.add(nIdx);
		}

		// Place the cluster — verify each tile still has a walkable neighbor
		const clusterSet = new Set(clusterTiles);
		for (let i = 0; i < clusterTiles.length; i++) {
			const idx = clusterTiles[i]!;
			const lx = idx % CHUNK_SIZE;
			const lz = Math.floor(idx / CHUNK_SIZE);

			// Verify at least 1 walkable neighbor that's NOT in this cluster
			let hasWalkable = false;
			for (const [ddx, ddz] of FOUR_DIRS) {
				const nx = lx + ddx;
				const nz = lz + ddz;
				if (!isInBounds(nx, nz)) continue;
				const nIdx = chunkTileIndex(nx, nz);
				if (!clusterSet.has(nIdx) && tiles[nIdx]!.passable && tiles[nIdx]!.modelLayer !== "resource") {
					hasWalkable = true;
					break;
				}
			}
			if (!hasWalkable) continue; // Skip this tile — would be inaccessible

			const model = i === 0 || rng() < 0.7 ? primaryModel : secondaryModel;
			tiles[idx]!.modelId = model.id;
			tiles[idx]!.modelLayer = "resource";
			tiles[idx]!.passable = false;
			tiles[idx]!.rotation = (Math.floor(rng() * 4)) as 0 | 1 | 2 | 3;
			resourceCount++;
		}
	}
}

// ─── Phase 3: Bridges & Platforms ────────────────────────────────────────────

function placeBridges(
	tiles: MapTile[],
	rng: () => number,
	pools: ModelPools,
): void {
	const { bridgePool, supportPool } = pools;
	if (bridgePool.length === 0 || supportPool.length === 0) return;

	for (let lz = 1; lz < CHUNK_SIZE - 1; lz++) {
		for (let lx = 1; lx < CHUNK_SIZE - 1; lx++) {
			const idx = chunkTileIndex(lx, lz);
			if (tiles[idx]!.passable) continue; // Only bridge over impassable

			// Bridge candidate: impassable tile with walkable on opposite sides
			const hasNSPassage =
				tiles[chunkTileIndex(lx, lz - 1)]!.passable &&
				tiles[chunkTileIndex(lx, lz + 1)]!.passable;
			const hasEWPassage =
				tiles[chunkTileIndex(lx - 1, lz)]!.passable &&
				tiles[chunkTileIndex(lx + 1, lz)]!.passable;

			if ((hasNSPassage || hasEWPassage) && rng() < 0.3) {
				const bridgeModel = pickRandom(bridgePool, rng);

				tiles[idx]!.modelId = bridgeModel.id;
				tiles[idx]!.modelLayer = "bridge";
				tiles[idx]!.level = 1;
				tiles[idx]!.elevationY = LEVEL_HEIGHTS[1]!;
				tiles[idx]!.passable = true;
				tiles[idx]!.isBridge = true;
				tiles[idx]!.clearanceAbove = LEVEL_HEIGHTS[1]!;

				// Place supports on adjacent structure tiles
				for (const [dx, dz] of FOUR_DIRS) {
					const nx = lx + dx;
					const nz = lz + dz;
					if (isInBounds(nx, nz)) {
						const nIdx = chunkTileIndex(nx, nz);
						if (!tiles[nIdx]!.passable && tiles[nIdx]!.modelLayer === "structure" && rng() < 0.5) {
							tiles[nIdx]!.modelId = pickRandom(supportPool, rng).id;
							tiles[nIdx]!.modelLayer = "support";
						}
					}
				}
			}
		}
	}

	enforceBridgeSpanLimit(tiles);
}

function enforceBridgeSpanLimit(tiles: MapTile[]): void {
	// Check rows
	for (let z = 0; z < CHUNK_SIZE; z++) {
		let span = 0;
		for (let x = 0; x < CHUNK_SIZE; x++) {
			const idx = chunkTileIndex(x, z);
			if (tiles[idx]!.isBridge) {
				span++;
				if (span > MAX_BRIDGE_SPAN) {
					tiles[idx]!.isBridge = false;
					tiles[idx]!.level = 0;
					tiles[idx]!.elevationY = 0;
					tiles[idx]!.clearanceAbove = 100;
					tiles[idx]!.passable = false;
					tiles[idx]!.modelLayer = "structure";
					span = 0;
				}
			} else {
				span = 0;
			}
		}
	}
	// Check columns
	for (let x = 0; x < CHUNK_SIZE; x++) {
		let span = 0;
		for (let z = 0; z < CHUNK_SIZE; z++) {
			const idx = chunkTileIndex(x, z);
			if (tiles[idx]!.isBridge) {
				span++;
				if (span > MAX_BRIDGE_SPAN) {
					tiles[idx]!.isBridge = false;
					tiles[idx]!.level = 0;
					tiles[idx]!.elevationY = 0;
					tiles[idx]!.clearanceAbove = 100;
					tiles[idx]!.passable = false;
					tiles[idx]!.modelLayer = "structure";
					span = 0;
				}
			} else {
				span = 0;
			}
		}
	}
}

// ─── Phase 4: Contextual Props ──────────────────────────────────────────────

/**
 * Place props near their architectural context:
 * - Details/signs near wall tiles
 * - Vents near pipe tiles
 * - Cables/conveyors in corridors between structures
 * - Floor props only in open areas
 *
 * NOT random 8% scatter.
 */
function placeContextualProps(
	tiles: MapTile[],
	rng: () => number,
	pools: ModelPools,
): void {
	const { propPool, wallPool, pipePool, detailProps, ventProps, cableProps, floorProps } = pools;
	if (propPool.length === 0) return;

	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			if (!isEmpty(tiles, lx, lz)) continue;

			const idx = chunkTileIndex(lx, lz);

			// What's adjacent?
			let nearWall = false;
			let nearPipe = false;
			let wallDir: [number, number] | null = null;
			let inCorridor = false;

			for (const [dx, dz] of FOUR_DIRS) {
				const n = tileAt(tiles, lx + dx, lz + dz);
				if (!n) continue;
				if (n.modelLayer === "structure") {
					if (n.modelId && wallPool.some((w) => w.id === n.modelId)) {
						nearWall = true;
						wallDir = [dx, dz];
					}
					if (n.modelId && pipePool.some((p) => p.id === n.modelId)) {
						nearPipe = true;
					}
				}
			}

			// Check if in a corridor (structure on 2+ sides)
			const structNeighborCount = countNeighbors(tiles, lx, lz,
				(t) => !t.passable && (t.modelLayer === "structure" || t.modelLayer === "support"),
			);
			inCorridor = structNeighborCount >= 2;

			// Decide what to place based on context
			let model: ModelEntry | null = null;
			let rotation: 0 | 1 | 2 | 3 = 0;

			if (nearWall && detailProps.length > 0 && rng() < 0.25) {
				model = pickRandom(detailProps, rng);
				if (wallDir) rotation = directionToRotation(wallDir[0], wallDir[1]);
			} else if (nearPipe && ventProps.length > 0 && rng() < 0.3) {
				model = pickRandom(ventProps, rng);
			} else if (inCorridor && cableProps.length > 0 && rng() < 0.2) {
				model = pickRandom(cableProps, rng);
			} else if (!nearWall && !nearPipe && !inCorridor && floorProps.length > 0 && rng() < 0.05) {
				model = pickRandom(floorProps, rng);
				rotation = (Math.floor(rng() * 4)) as 0 | 1 | 2 | 3;
			}

			if (model) {
				tiles[idx]!.modelId = model.id;
				tiles[idx]!.modelLayer = "prop";
				tiles[idx]!.rotation = rotation;
				// Props stay passable
			}
		}
	}
}

// ─── Phase 5: Walkability Enforcement ────────────────────────────────────────

function enforceWalkability(tiles: MapTile[], _rng: () => number): void {
	const total = tiles.length;
	let walkable = tiles.filter((t) => t.passable).length;
	const targetWalkable = Math.ceil(total * 0.70);

	if (walkable >= targetWalkable) return;

	// Remove interior structure walls first (most surrounded by other structures)
	const removeCandidates: { idx: number; neighborScore: number }[] = [];

	for (let i = 0; i < tiles.length; i++) {
		const tile = tiles[i]!;
		if (!tile.passable && tile.modelLayer === "structure") {
			const lx = i % CHUNK_SIZE;
			const lz = Math.floor(i / CHUNK_SIZE);
			const impassableNeighbors = countNeighbors(tiles, lx, lz, (t) => !t.passable);
			removeCandidates.push({ idx: i, neighborScore: impassableNeighbors });
		}
	}

	// Sort by highest neighbor score (interior walls first)
	removeCandidates.sort((a, b) => b.neighborScore - a.neighborScore);

	for (const { idx } of removeCandidates) {
		if (walkable >= targetWalkable) break;
		tiles[idx]!.modelId = null;
		tiles[idx]!.modelLayer = null;
		tiles[idx]!.passable = true;
		walkable++;
	}
}

// ─── Exports for testing ─────────────────────────────────────────────────────

export const _test = {
	mulberry32,
	hashChunkCoords,
	buildModelPools,
};
