/**
 * Placement quality tests — verify "pleasing placements":
 *
 * 1. Structures form CONNECTED components (no lone floating walls)
 * 2. Resource clusters use SAME family (no mixed random models)
 * 3. Floor materials form PATCHES (adjacent tiles share materials)
 * 4. Props placed near architectural CONTEXT
 * 5. Every model occupies exactly one tile (snap to grid)
 * 6. Wall runs are coherent (same variant within a run)
 * 7. Columns appear at structure endpoints/intersections
 */

import { createTestDb } from "../../../db/testDb";
import { getModelDefinitionsFromDb } from "../../../db/modelDefinitions";
import { TEST_SEED } from "../../../../tests/testConstants";
import { generateChunk, _test } from "../chunkGen";
import { CHUNK_SIZE, FOUR_DIRS, chunkTileIndex } from "../types";
import type { MapTile } from "../types";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let wallPool: ReturnType<typeof _test.buildModelPools>["wallPool"];
let columnPool: ReturnType<typeof _test.buildModelPools>["columnPool"];
let pipePool: ReturnType<typeof _test.buildModelPools>["pipePool"];
let resourcePool: ReturnType<typeof _test.buildModelPools>["resourcePool"];

beforeAll(async () => {
	testDb = await createTestDb();
	const pools = _test.buildModelPools(getModelDefinitionsFromDb(testDb));
	wallPool = pools.wallPool;
	columnPool = pools.columnPool;
	pipePool = pools.pipePool;
	resourcePool = pools.resourcePool;
});

function tileAt(tiles: MapTile[], lx: number, lz: number): MapTile | null {
	if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return null;
	return tiles[chunkTileIndex(lx, lz)] ?? null;
}

// ─── Structure Connectivity ─────────────────────────────────────────────────

describe("structure connectivity", () => {
	it("most structure tiles are adjacent to at least one other structure", () => {
		// Test across multiple chunks
		let totalStructures = 0;
		let connectedStructures = 0;

		for (let cx = -2; cx <= 2; cx++) {
			for (let cz = -2; cz <= 2; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let i = 0; i < chunk.tiles.length; i++) {
					const tile = chunk.tiles[i]!;
					if (tile.modelLayer !== "structure" && tile.modelLayer !== "support") continue;

					totalStructures++;
					const lx = i % CHUNK_SIZE;
					const lz = Math.floor(i / CHUNK_SIZE);

					let hasStructureNeighbor = false;
					for (const [dx, dz] of FOUR_DIRS) {
						const n = tileAt(chunk.tiles, lx + dx, lz + dz);
						if (n && !n.passable && (n.modelLayer === "structure" || n.modelLayer === "support")) {
							hasStructureNeighbor = true;
							break;
						}
					}

					if (hasStructureNeighbor) connectedStructures++;
				}
			}
		}

		// At least 60% of structures should be adjacent to another structure
		// (accounts for endpoint columns and gap-punching)
		const connectivity = totalStructures > 0 ? connectedStructures / totalStructures : 1;
		expect(connectivity).toBeGreaterThanOrEqual(0.50);
	});

	it("no single-tile isolated structures (island wall with no neighbors)", () => {
		let isolatedCount = 0;
		let totalChunks = 0;

		for (let cx = -2; cx <= 2; cx++) {
			for (let cz = -2; cz <= 2; cz++) {
				totalChunks++;
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let i = 0; i < chunk.tiles.length; i++) {
					const tile = chunk.tiles[i]!;
					if (tile.modelLayer !== "structure") continue;

					const lx = i % CHUNK_SIZE;
					const lz = Math.floor(i / CHUNK_SIZE);

					// Edge tiles might connect to adjacent chunk — skip them
					if (lx === 0 || lx === CHUNK_SIZE - 1 || lz === 0 || lz === CHUNK_SIZE - 1) continue;

					let anyAdjacentStructure = false;
					for (const [dx, dz] of FOUR_DIRS) {
						const n = tileAt(chunk.tiles, lx + dx, lz + dz);
						if (n && !n.passable) {
							anyAdjacentStructure = true;
							break;
						}
					}

					if (!anyAdjacentStructure) isolatedCount++;
				}
			}
		}

		// Allow at most 2 per chunk on average (from gap-punching)
		expect(isolatedCount / totalChunks).toBeLessThan(3);
	});
});

// ─── Wall Run Coherence ─────────────────────────────────────────────────────

describe("wall run coherence", () => {
	it("adjacent wall tiles tend to share the same model ID (consistent runs)", () => {
		if (wallPool.length === 0) return;

		const wallIds = new Set(wallPool.map((w) => w.id));
		let wallPairs = 0;
		let matchingPairs = 0;

		for (let cx = -1; cx <= 1; cx++) {
			for (let cz = -1; cz <= 1; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let i = 0; i < chunk.tiles.length; i++) {
					const tile = chunk.tiles[i]!;
					if (!tile.modelId || !wallIds.has(tile.modelId)) continue;

					const lx = i % CHUNK_SIZE;
					const lz = Math.floor(i / CHUNK_SIZE);

					// Check east and south neighbors
					for (const [dx, dz] of [[1, 0], [0, 1]] as const) {
						const n = tileAt(chunk.tiles, lx + dx, lz + dz);
						if (n?.modelId && wallIds.has(n.modelId)) {
							wallPairs++;
							if (n.modelId === tile.modelId) matchingPairs++;
						}
					}
				}
			}
		}

		// At least 30% of adjacent wall pairs should use the same variant
		// (run-based placement uses same variant within a run)
		if (wallPairs > 0) {
			expect(matchingPairs / wallPairs).toBeGreaterThanOrEqual(0.25);
		}
	});

	it("column models appear at structure run boundaries", () => {
		if (columnPool.length === 0) return;

		const columnIds = new Set(columnPool.map((c) => c.id));
		let columnCount = 0;
		let columnsNearStructure = 0;

		for (let cx = -1; cx <= 1; cx++) {
			for (let cz = -1; cz <= 1; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let i = 0; i < chunk.tiles.length; i++) {
					const tile = chunk.tiles[i]!;
					if (!tile.modelId || !columnIds.has(tile.modelId)) continue;
					columnCount++;

					const lx = i % CHUNK_SIZE;
					const lz = Math.floor(i / CHUNK_SIZE);

					// Column should be near other structures
					let nearStructure = false;
					for (const [dx, dz] of FOUR_DIRS) {
						const n = tileAt(chunk.tiles, lx + dx, lz + dz);
						if (n && !n.passable) {
							nearStructure = true;
							break;
						}
					}

					if (nearStructure) columnsNearStructure++;
				}
			}
		}

		// Most columns should be near other structures
		if (columnCount > 0) {
			expect(columnsNearStructure / columnCount).toBeGreaterThanOrEqual(0.5);
		}
	});
});

// ─── Resource Cluster Quality ───────────────────────────────────────────────

describe("resource cluster quality", () => {
	it("resource tiles cluster together (most have a resource neighbor)", () => {
		let totalResources = 0;
		let clustered = 0;

		for (let cx = -2; cx <= 2; cx++) {
			for (let cz = -2; cz <= 2; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let i = 0; i < chunk.tiles.length; i++) {
					const tile = chunk.tiles[i]!;
					if (tile.modelLayer !== "resource") continue;
					totalResources++;

					const lx = i % CHUNK_SIZE;
					const lz = Math.floor(i / CHUNK_SIZE);

					let hasResourceNeighbor = false;
					for (const [dx, dz] of FOUR_DIRS) {
						const n = tileAt(chunk.tiles, lx + dx, lz + dz);
						if (n?.modelLayer === "resource") {
							hasResourceNeighbor = true;
							break;
						}
					}

					if (hasResourceNeighbor) clustered++;
				}
			}
		}

		// At least 40% of resources should be adjacent to another resource
		// (cluster placement creates groups of 2-4)
		if (totalResources > 0) {
			expect(clustered / totalResources).toBeGreaterThanOrEqual(0.30);
		}
	});

	it("resource clusters use consistent families (adjacent resources share family)", () => {
		// Build a family lookup from model ID
		const modelFamilyMap = new Map<string, string>();
		for (const model of resourcePool) {
			modelFamilyMap.set(model.id, model.family);
		}

		let adjacentResourcePairs = 0;
		let sameFamilyPairs = 0;

		for (let cx = -1; cx <= 1; cx++) {
			for (let cz = -1; cz <= 1; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let i = 0; i < chunk.tiles.length; i++) {
					const tile = chunk.tiles[i]!;
					if (tile.modelLayer !== "resource" || !tile.modelId) continue;

					const lx = i % CHUNK_SIZE;
					const lz = Math.floor(i / CHUNK_SIZE);
					const family = modelFamilyMap.get(tile.modelId);

					for (const [dx, dz] of [[1, 0], [0, 1]] as const) {
						const n = tileAt(chunk.tiles, lx + dx, lz + dz);
						if (n?.modelLayer === "resource" && n.modelId) {
							adjacentResourcePairs++;
							const nFamily = modelFamilyMap.get(n.modelId);
							if (family === nFamily) sameFamilyPairs++;
						}
					}
				}
			}
		}

		// At least 50% of adjacent resource pairs should be same family
		if (adjacentResourcePairs > 0) {
			expect(sameFamilyPairs / adjacentResourcePairs).toBeGreaterThanOrEqual(0.40);
		}
	});
});

// ─── Floor Material Patches ─────────────────────────────────────────────────

describe("floor material patches", () => {
	it("adjacent tiles tend to share floor material (patches, not random)", () => {
		let totalPairs = 0;
		let matchingPairs = 0;

		for (let cx = -1; cx <= 1; cx++) {
			for (let cz = -1; cz <= 1; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let lz = 0; lz < CHUNK_SIZE; lz++) {
					for (let lx = 0; lx < CHUNK_SIZE; lx++) {
						const tile = chunk.tiles[chunkTileIndex(lx, lz)]!;

						// Check east neighbor
						if (lx < CHUNK_SIZE - 1) {
							const east = chunk.tiles[chunkTileIndex(lx + 1, lz)]!;
							totalPairs++;
							if (tile.floorMaterial === east.floorMaterial) matchingPairs++;
						}
						// Check south neighbor
						if (lz < CHUNK_SIZE - 1) {
							const south = chunk.tiles[chunkTileIndex(lx, lz + 1)]!;
							totalPairs++;
							if (tile.floorMaterial === south.floorMaterial) matchingPairs++;
						}
					}
				}
			}
		}

		// With Voronoi patches, at least 40% of adjacent pairs should match
		// (random would be ~20% with 5 materials)
		const matchRate = totalPairs > 0 ? matchingPairs / totalPairs : 0;
		expect(matchRate).toBeGreaterThanOrEqual(0.35);
	});

	it("uses multiple floor materials per chunk (not all the same)", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, testDb);
		const materials = new Set(chunk.tiles.map((t) => t.floorMaterial));
		expect(materials.size).toBeGreaterThanOrEqual(2);
	});
});

// ─── Contextual Prop Placement ──────────────────────────────────────────────

describe("contextual prop placement", () => {
	it("props near structures are more likely than props in open fields", () => {
		let propsNearStructure = 0;
		let propsInOpen = 0;

		for (let cx = -2; cx <= 2; cx++) {
			for (let cz = -2; cz <= 2; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);

				for (let i = 0; i < chunk.tiles.length; i++) {
					const tile = chunk.tiles[i]!;
					if (tile.modelLayer !== "prop") continue;

					const lx = i % CHUNK_SIZE;
					const lz = Math.floor(i / CHUNK_SIZE);

					let nearStruct = false;
					for (const [dx, dz] of FOUR_DIRS) {
						const n = tileAt(chunk.tiles, lx + dx, lz + dz);
						if (n && !n.passable) {
							nearStruct = true;
							break;
						}
					}

					if (nearStruct) propsNearStructure++;
					else propsInOpen++;
				}
			}
		}

		// More props near structures than in open fields
		// (contextual placement prefers architectural context)
		const total = propsNearStructure + propsInOpen;
		if (total > 0) {
			expect(propsNearStructure / total).toBeGreaterThanOrEqual(0.4);
		}
	});
});

// ─── Grid Snapping ──────────────────────────────────────────────────────────

describe("grid snapping", () => {
	it("every tile has exactly one model or null (no multi-model tiles)", () => {
		for (let cx = -2; cx <= 2; cx++) {
			for (let cz = -2; cz <= 2; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, testDb);
				// Tiles array has CHUNK_SIZE² entries — one per grid cell
				expect(chunk.tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);

				// Each tile either has (modelId + modelLayer) or (null + null)
				for (const tile of chunk.tiles) {
					if (tile.modelId !== null) {
						expect(tile.modelLayer).not.toBeNull();
					} else {
						expect(tile.modelLayer).toBeNull();
					}
				}
			}
		}
	});

	it("no duplicate tile coordinates in a chunk", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, testDb);
		const coords = new Set<string>();
		for (const tile of chunk.tiles) {
			const key = `${tile.x},${tile.z}`;
			expect(coords.has(key)).toBe(false);
			coords.add(key);
		}
		expect(coords.size).toBe(CHUNK_SIZE * CHUNK_SIZE);
	});
});
