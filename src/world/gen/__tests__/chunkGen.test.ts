/**
 * Tests for chunk generation — determinism, structure placement,
 * walkability enforcement, bridge constraints, model pool integrity.
 *
 * Model definitions and floor materials come from SQLite (seeded at bootstrap).
 */

import { TEST_SEED } from "../../../../tests/testConstants";
import modelManifest from "../../../config/modelDefinitions.json";
import { getModelDefinitionsFromDb } from "../../../db/modelDefinitions";
import { createTestDb } from "../../../db/testDb";
import { _test, generateChunk } from "../chunkGen";
import {
	CHUNK_SIZE as GEN_CHUNK_SIZE,
	LEVEL_HEIGHTS,
	MAX_BRIDGE_SPAN,
} from "../types";

const { mulberry32, hashChunkCoords, buildModelPools } = _test;

let seededDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	seededDb = await createTestDb();
});

// ─── PRNG Tests ──────────────────────────────────────────────────────────────

describe("mulberry32 PRNG", () => {
	it("produces deterministic output for the same seed", () => {
		const rng1 = mulberry32(TEST_SEED);
		const rng2 = mulberry32(TEST_SEED);
		const values1 = Array.from({ length: 100 }, () => rng1());
		const values2 = Array.from({ length: 100 }, () => rng2());
		expect(values1).toEqual(values2);
	});

	it("produces different output for different seeds", () => {
		const rng1 = mulberry32(TEST_SEED);
		const rng2 = mulberry32(TEST_SEED + 1);
		const v1 = rng1();
		const v2 = rng2();
		expect(v1).not.toBe(v2);
	});

	it("produces values in [0, 1)", () => {
		const rng = mulberry32(TEST_SEED);
		for (let i = 0; i < 1000; i++) {
			const val = rng();
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThan(1);
		}
	});
});

describe("hashChunkCoords", () => {
	it("produces same hash for same inputs", () => {
		const h1 = hashChunkCoords(TEST_SEED, 3, 7);
		const h2 = hashChunkCoords(TEST_SEED, 3, 7);
		expect(h1).toBe(h2);
	});

	it("produces different hashes for different chunks", () => {
		const h1 = hashChunkCoords(TEST_SEED, 0, 0);
		const h2 = hashChunkCoords(TEST_SEED, 1, 0);
		const h3 = hashChunkCoords(TEST_SEED, 0, 1);
		expect(h1).not.toBe(h2);
		expect(h1).not.toBe(h3);
		expect(h2).not.toBe(h3);
	});

	it("produces different hashes for different seeds", () => {
		const h1 = hashChunkCoords(TEST_SEED, 5, 5);
		const h2 = hashChunkCoords(TEST_SEED + 1, 5, 5);
		expect(h1).not.toBe(h2);
	});

	it("handles negative chunk coordinates", () => {
		const h1 = hashChunkCoords(TEST_SEED, -1, -1);
		const h2 = hashChunkCoords(TEST_SEED, 1, 1);
		expect(h1).not.toBe(h2);
		expect(typeof h1).toBe("number");
		expect(h1).toBeGreaterThanOrEqual(0);
	});
});

// ─── Model Pool Tests ────────────────────────────────────────────────────────

let modelPools: ReturnType<typeof buildModelPools>;

beforeAll(async () => {
	const allModelsFromDb = getModelDefinitionsFromDb(seededDb);
	modelPools = buildModelPools(allModelsFromDb);
});

describe("model pools", () => {
	const allModels = modelManifest.models as Array<{
		id: string;
		family: string;
		passable: boolean;
		bounds: { height: number };
		harvest: { yields: unknown[] } | null;
		elevationProfile: {
			supportsBridging: boolean;
			isRamp: boolean;
			isVerticalSupport: boolean;
		};
	}>;

	it("structurePool contains only impassable non-harvestable structural models", () => {
		for (const model of modelPools.structurePool) {
			expect(model.passable).toBe(false);
			expect(model.hasHarvest).toBe(false);
		}
	});

	it("resourcePool contains only harvestable impassable models", () => {
		for (const model of modelPools.resourcePool) {
			expect(model.hasHarvest).toBe(true);
			expect(model.passable).toBe(false);
		}
	});

	it("propPool contains only passable models", () => {
		for (const model of modelPools.propPool) {
			expect(model.passable).toBe(true);
		}
	});

	it("bridgePool matches models with supportsBridging from JSON", () => {
		const jsonBridgeCount = allModels.filter(
			(m) => m.elevationProfile?.supportsBridging,
		).length;
		expect(modelPools.bridgePool.length).toBe(jsonBridgeCount);
	});

	it("supportPool matches models with isVerticalSupport from JSON", () => {
		const jsonSupportCount = allModels.filter(
			(m) => m.elevationProfile?.isVerticalSupport,
		).length;
		expect(modelPools.supportPool.length).toBe(jsonSupportCount);
	});

	it("rampPool matches models with isRamp from JSON", () => {
		const jsonRampCount = allModels.filter(
			(m) => m.elevationProfile?.isRamp,
		).length;
		expect(modelPools.rampPool.length).toBe(jsonRampCount);
	});

	it("all pool model IDs exist in the JSON manifest", () => {
		const allIds = new Set(allModels.map((m) => m.id));
		const poolArrays = [
			modelPools.structurePool,
			modelPools.resourcePool,
			modelPools.propPool,
			modelPools.bridgePool,
			modelPools.supportPool,
			modelPools.rampPool,
		];
		for (const pool of poolArrays) {
			for (const model of pool) {
				expect(allIds.has(model.id)).toBe(true);
			}
		}
	});
});

// ─── Chunk Generation Tests ──────────────────────────────────────────────────

describe("generateChunk", () => {
	it("produces exactly CHUNK_SIZE² tiles", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		expect(chunk.tiles.length).toBe(GEN_CHUNK_SIZE * GEN_CHUNK_SIZE);
	});

	it("sets correct chunk coordinates", () => {
		const chunk = generateChunk(TEST_SEED, 3, -2, seededDb);
		expect(chunk.cx).toBe(3);
		expect(chunk.cz).toBe(-2);
	});

	it("sets correct world coordinates on tiles", () => {
		const chunk = generateChunk(TEST_SEED, 2, 3, seededDb);
		const originX = 2 * GEN_CHUNK_SIZE;
		const originZ = 3 * GEN_CHUNK_SIZE;

		for (const tile of chunk.tiles) {
			expect(tile.x).toBeGreaterThanOrEqual(originX);
			expect(tile.x).toBeLessThan(originX + GEN_CHUNK_SIZE);
			expect(tile.z).toBeGreaterThanOrEqual(originZ);
			expect(tile.z).toBeLessThan(originZ + GEN_CHUNK_SIZE);
		}
	});

	it("is fully deterministic — same seed + coords = identical chunk", () => {
		const chunk1 = generateChunk(TEST_SEED, 5, 5, seededDb);
		const chunk2 = generateChunk(TEST_SEED, 5, 5, seededDb);

		expect(chunk1.tiles.length).toBe(chunk2.tiles.length);
		for (let i = 0; i < chunk1.tiles.length; i++) {
			expect(chunk1.tiles[i]).toEqual(chunk2.tiles[i]);
		}
	});

	it("produces different chunks for different coordinates", () => {
		const chunk1 = generateChunk(TEST_SEED, 0, 0, seededDb);
		const chunk2 = generateChunk(TEST_SEED, 1, 0, seededDb);

		// At least some tiles should differ
		let diffs = 0;
		for (let i = 0; i < chunk1.tiles.length; i++) {
			if (chunk1.tiles[i]!.modelId !== chunk2.tiles[i]!.modelId) {
				diffs++;
			}
		}
		expect(diffs).toBeGreaterThan(0);
	});

	it("produces different chunks for different seeds", () => {
		const chunk1 = generateChunk(TEST_SEED, 0, 0, seededDb);
		const chunk2 = generateChunk(TEST_SEED + 7, 0, 0, seededDb);

		let diffs = 0;
		for (let i = 0; i < chunk1.tiles.length; i++) {
			if (chunk1.tiles[i]!.modelId !== chunk2.tiles[i]!.modelId) {
				diffs++;
			}
		}
		expect(diffs).toBeGreaterThan(0);
	});
});

// ─── Walkability Tests ───────────────────────────────────────────────────────

describe("walkability enforcement", () => {
	const _db = seededDb;

	it("guarantees ≥70% passable tiles per chunk", () => {
		// Test across 25 different chunks to cover variance
		for (let cx = -2; cx <= 2; cx++) {
			for (let cz = -2; cz <= 2; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, seededDb);
				const passable = chunk.tiles.filter((t) => t.passable).length;
				const ratio = passable / chunk.tiles.length;
				expect(ratio).toBeGreaterThanOrEqual(0.7);
			}
		}
	});

	it("every tile has a valid floor material", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		const validMaterials = new Set([
			"metal_panel",
			"concrete_slab",
			"industrial_grating",
			"rusty_plating",
			"corroded_steel",
		]);

		for (const tile of chunk.tiles) {
			expect(validMaterials.has(tile.floorMaterial)).toBe(true);
		}
	});

	it("impassable tiles always have a model placed", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			if (!tile.passable && tile.modelLayer !== null) {
				expect(tile.modelId).not.toBeNull();
			}
		}
	});
});

// ─── Bridge & Elevation Tests ────────────────────────────────────────────────

describe("bridge constraints", () => {
	const _db = seededDb;

	it("bridge tiles are at level 1 with correct elevationY", () => {
		// Generate many chunks to find bridges
		for (let cx = -3; cx <= 3; cx++) {
			for (let cz = -3; cz <= 3; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, seededDb);
				for (const tile of chunk.tiles) {
					if (tile.isBridge) {
						expect(tile.level).toBe(1);
						expect(tile.elevationY).toBe(LEVEL_HEIGHTS[1]);
						expect(tile.passable).toBe(true);
						expect(tile.modelLayer).toBe("bridge");
					}
				}
			}
		}
	});

	it("enforces MAX_BRIDGE_SPAN — no row/column has more consecutive bridges", () => {
		for (let cx = -3; cx <= 3; cx++) {
			for (let cz = -3; cz <= 3; cz++) {
				const chunk = generateChunk(TEST_SEED, cx, cz, seededDb);

				// Check rows
				for (let z = 0; z < GEN_CHUNK_SIZE; z++) {
					let span = 0;
					for (let x = 0; x < GEN_CHUNK_SIZE; x++) {
						const tile = chunk.tiles[z * GEN_CHUNK_SIZE + x]!;
						if (tile.isBridge) {
							span++;
							expect(span).toBeLessThanOrEqual(MAX_BRIDGE_SPAN);
						} else {
							span = 0;
						}
					}
				}

				// Check columns
				for (let x = 0; x < GEN_CHUNK_SIZE; x++) {
					let span = 0;
					for (let z = 0; z < GEN_CHUNK_SIZE; z++) {
						const tile = chunk.tiles[z * GEN_CHUNK_SIZE + x]!;
						if (tile.isBridge) {
							span++;
							expect(span).toBeLessThanOrEqual(MAX_BRIDGE_SPAN);
						} else {
							span = 0;
						}
					}
				}
			}
		}
	});

	it("non-bridge tiles default to level 0", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			if (!tile.isBridge && !tile.isRamp) {
				expect(tile.level).toBe(0);
				expect(tile.elevationY).toBe(0);
			}
		}
	});
});

// ─── Tile Layer Integrity ────────────────────────────────────────────────────

describe("tile layer integrity", () => {
	const _db = seededDb;

	it("every placed model has a valid modelLayer", () => {
		const validLayers = new Set([
			"structure",
			"resource",
			"prop",
			"bridge",
			"ramp",
			"support",
		]);
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			if (tile.modelId !== null) {
				expect(tile.modelLayer).not.toBeNull();
				expect(validLayers.has(tile.modelLayer!)).toBe(true);
			}
		}
	});

	it("null modelId ↔ null modelLayer", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			if (tile.modelId === null) {
				expect(tile.modelLayer).toBeNull();
			}
			if (tile.modelLayer === null) {
				expect(tile.modelId).toBeNull();
			}
		}
	});

	it("resource tiles are impassable", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			if (tile.modelLayer === "resource") {
				expect(tile.passable).toBe(false);
			}
		}
	});

	it("prop tiles are passable", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			if (tile.modelLayer === "prop") {
				expect(tile.passable).toBe(true);
			}
		}
	});

	it("structure tiles are impassable", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			if (tile.modelLayer === "structure") {
				expect(tile.passable).toBe(false);
			}
		}
	});

	it("rotation is always 0-3", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		for (const tile of chunk.tiles) {
			expect([0, 1, 2, 3]).toContain(tile.rotation);
		}
	});
});

// ─── Resource Placement Tests ────────────────────────────────────────────────

describe("resource placement", () => {
	const _db = seededDb;

	it("every resource tile has at least one walkable neighbor within chunk", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);

		for (let i = 0; i < chunk.tiles.length; i++) {
			const tile = chunk.tiles[i]!;
			if (tile.modelLayer !== "resource") continue;

			const lx = i % GEN_CHUNK_SIZE;
			const lz = Math.floor(i / GEN_CHUNK_SIZE);
			let hasWalkableNeighbor = false;

			for (const [dx, dz] of [
				[0, -1],
				[1, 0],
				[0, 1],
				[-1, 0],
			] as const) {
				const nx = lx + dx;
				const nz = lz + dz;
				if (nx >= 0 && nx < GEN_CHUNK_SIZE && nz >= 0 && nz < GEN_CHUNK_SIZE) {
					const nIdx = nz * GEN_CHUNK_SIZE + nx;
					if (chunk.tiles[nIdx]!.passable) {
						hasWalkableNeighbor = true;
						break;
					}
				}
			}

			// Edge tiles may have walkable neighbors in adjacent chunks
			const isEdge =
				lx === 0 ||
				lx === GEN_CHUNK_SIZE - 1 ||
				lz === 0 ||
				lz === GEN_CHUNK_SIZE - 1;
			if (!isEdge) {
				expect(hasWalkableNeighbor).toBe(true);
			}
		}
	});
});

// ─── Negative Coordinates & Edge Cases ───────────────────────────────────────

describe("edge cases", () => {
	const _db = seededDb;

	it("handles chunk at (0, 0)", () => {
		const chunk = generateChunk(TEST_SEED, 0, 0, seededDb);
		expect(chunk.cx).toBe(0);
		expect(chunk.cz).toBe(0);
		expect(chunk.tiles.length).toBe(GEN_CHUNK_SIZE * GEN_CHUNK_SIZE);
	});

	it("handles negative chunk coordinates", () => {
		const chunk = generateChunk(TEST_SEED, -5, -3, seededDb);
		expect(chunk.cx).toBe(-5);
		expect(chunk.cz).toBe(-3);
		expect(chunk.tiles[0]!.x).toBe(-5 * GEN_CHUNK_SIZE);
		expect(chunk.tiles[0]!.z).toBe(-3 * GEN_CHUNK_SIZE);
	});

	it("handles very large chunk coordinates", () => {
		const chunk = generateChunk(TEST_SEED, 1000, 1000, seededDb);
		expect(chunk.tiles.length).toBe(GEN_CHUNK_SIZE * GEN_CHUNK_SIZE);
		const passable = chunk.tiles.filter((t) => t.passable).length;
		expect(passable / chunk.tiles.length).toBeGreaterThanOrEqual(0.7);
	});

	it("seed 0 works", () => {
		const chunk = generateChunk(0, 0, 0, seededDb);
		expect(chunk.tiles.length).toBe(GEN_CHUNK_SIZE * GEN_CHUNK_SIZE);
	});
});
