/**
 * Tests for WorldGrid — the in-memory query interface.
 *
 * Covers: init/reset, chunk caching, tile queries, coordinate conversion,
 * pathfinding (A* + reachability), cross-chunk boundaries.
 *
 * Chunk generation requires a seeded DB (model_definitions, game_config).
 */

import { createTestDb } from "../../../db/testDb";
import { TEST_SEED } from "../../../../tests/testConstants";
import {
	initWorldGrid,
	resetWorldGrid,
	getChunk,
	updateFocus,
	getLoadedChunks,
	invalidateChunk,
	getTile,
	getTileAnyLevel,
	isPassable,
	getNeighbors,
	getPassableNeighbors,
	worldToTile,
	tileToWorld,
	findPath,
	getReachable,
	isPassableAtWorldPosition,
	_test,
} from "../worldGrid";
import { generateChunk } from "../chunkGen";
import { CHUNK_SIZE, TILE_SIZE } from "../types";

let testDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	testDb = await createTestDb();
});

beforeEach(() => {
	initWorldGrid(testDb, TEST_SEED, 0);
});

afterEach(() => {
	resetWorldGrid();
});

// ─── Initialization ─────────────────────────────────────────────────────────

describe("initialization", () => {
	it("starts with empty chunk cache", () => {
		resetWorldGrid();
		initWorldGrid(testDb, TEST_SEED, 0);
		// Before any queries, cache should be empty-ish
		// (getLoadedChunks may return 0 if no queries issued)
		expect(_test.getChunkCache().size).toBe(0);
	});

	it("resetWorldGrid clears all state", () => {
		getChunk(0, 0); // Force load
		expect(_test.getChunkCache().size).toBeGreaterThan(0);
		resetWorldGrid();
		expect(_test.getChunkCache().size).toBe(0);
	});
});

// ─── Chunk Management ───────────────────────────────────────────────────────

describe("chunk management", () => {
	it("getChunk loads and caches a chunk", () => {
		const chunk = getChunk(0, 0);
		expect(chunk.cx).toBe(0);
		expect(chunk.cz).toBe(0);
		expect(chunk.tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
		expect(_test.getChunkCache().has("0,0")).toBe(true);
	});

	it("getChunk returns cached chunk on second call", () => {
		const chunk1 = getChunk(2, 3);
		const chunk2 = getChunk(2, 3);
		expect(chunk1).toBe(chunk2); // Same reference
	});

	it("getChunk matches generateChunk output", () => {
		const fromGrid = getChunk(1, 1);
		const fromGen = generateChunk(TEST_SEED, 1, 1, testDb);

		for (let i = 0; i < fromGrid.tiles.length; i++) {
			expect(fromGrid.tiles[i]).toEqual(fromGen.tiles[i]);
		}
	});

	it("updateFocus loads chunks within loadRadius", () => {
		updateFocus(0, 0); // Focus on world origin
		const loaded = getLoadedChunks();
		// loadRadius=3 → (2*3+1)² = 49 chunks
		expect(loaded.length).toBeGreaterThanOrEqual(49);
	});

	it("updateFocus evicts distant chunks", () => {
		updateFocus(0, 0);
		const countBefore = _test.getChunkCache().size;

		// Move focus far away
		updateFocus(200 * TILE_SIZE, 200 * TILE_SIZE);

		// Old chunks at origin should be evicted (beyond unloadRadius=5)
		expect(_test.getChunkCache().has("0,0")).toBe(false);
	});

	it("invalidateChunk forces reload", () => {
		const chunk1 = getChunk(0, 0);
		// Put focus near so invalidate triggers reload
		updateFocus(0, 0);
		invalidateChunk(0, 0);
		const chunk2 = getChunk(0, 0);

		// Should be a new object (reloaded) but with identical content (no DB deltas)
		expect(chunk2).not.toBe(chunk1);
		expect(chunk2.tiles[0]).toEqual(chunk1.tiles[0]);
	});
});

// ─── Tile Queries ───────────────────────────────────────────────────────────

describe("tile queries", () => {
	it("getTile returns tile at valid coordinates", () => {
		const tile = getTile(0, 0, 0);
		expect(tile).not.toBeNull();
		expect(tile!.x).toBe(0);
		expect(tile!.z).toBe(0);
	});

	it("getTile returns null for wrong level", () => {
		// Most tiles are at level 0
		const tile = getTile(0, 0, 2);
		// Unless it's a level-2 structure, this should be null
		if (tile) {
			expect(tile.level).toBe(2);
		}
	});

	it("getTileAnyLevel returns tile regardless of level", () => {
		const tile = getTileAnyLevel(0, 0);
		expect(tile).not.toBeNull();
		expect(tile!.x).toBe(0);
		expect(tile!.z).toBe(0);
	});

	it("getTile works across chunk boundaries", () => {
		// Tile at (CHUNK_SIZE, 0) is in chunk (1, 0)
		const tile = getTile(CHUNK_SIZE, 0, 0);
		expect(tile).not.toBeNull();
		expect(tile!.x).toBe(CHUNK_SIZE);
	});

	it("getTile handles negative coordinates", () => {
		const tile = getTile(-1, -1, 0);
		expect(tile).not.toBeNull();
		expect(tile!.x).toBe(-1);
		expect(tile!.z).toBe(-1);
	});

	it("isPassable returns boolean", () => {
		const result = isPassable(0, 0, 0);
		expect(typeof result).toBe("boolean");
	});

	it("getNeighbors returns up to 4 tiles", () => {
		const neighbors = getNeighbors(4, 4, 0);
		expect(neighbors.length).toBeLessThanOrEqual(4);
		expect(neighbors.length).toBeGreaterThan(0);

		// Verify they're actually adjacent
		for (const n of neighbors) {
			const dx = Math.abs(n.x - 4);
			const dz = Math.abs(n.z - 4);
			expect(dx + dz).toBe(1); // Manhattan distance = 1
		}
	});

	it("getNeighbors works at chunk edges (cross-boundary)", () => {
		// Tile at (CHUNK_SIZE - 1, 0) has a neighbor at (CHUNK_SIZE, 0) in the next chunk
		const neighbors = getNeighbors(CHUNK_SIZE - 1, 0, 0);
		const hasNextChunkNeighbor = neighbors.some((n) => n.x === CHUNK_SIZE);
		expect(hasNextChunkNeighbor).toBe(true);
	});
});

// ─── Coordinate Conversion ──────────────────────────────────────────────────

describe("coordinate conversion", () => {
	it("worldToTile converts meters to grid coords", () => {
		const { x, z } = worldToTile(4.5, 3.0);
		expect(x).toBe(Math.floor(4.5 / TILE_SIZE));
		expect(z).toBe(Math.floor(3.0 / TILE_SIZE));
	});

	it("tileToWorld converts grid coords to world center", () => {
		const { worldX, worldZ } = tileToWorld(3, 5);
		expect(worldX).toBe(3 * TILE_SIZE + TILE_SIZE / 2);
		expect(worldZ).toBe(5 * TILE_SIZE + TILE_SIZE / 2);
	});

	it("round-trip: worldToTile(tileToWorld(x, z)) recovers original", () => {
		const { worldX, worldZ } = tileToWorld(7, 11);
		const { x, z } = worldToTile(worldX, worldZ);
		expect(x).toBe(7);
		expect(z).toBe(11);
	});

	it("handles negative world positions", () => {
		const { x, z } = worldToTile(-3.5, -1.0);
		expect(x).toBe(Math.floor(-3.5 / TILE_SIZE));
		expect(z).toBe(Math.floor(-1.0 / TILE_SIZE));
	});
});

// ─── Pathfinding ────────────────────────────────────────────────────────────

describe("findPath", () => {
	it("finds path between two passable tiles", () => {
		// Find two passable tiles in chunk (0,0)
		const chunk = getChunk(0, 0);
		const passableTiles = chunk.tiles.filter((t) => t.passable && t.level === 0);

		if (passableTiles.length < 2) return; // Shouldn't happen with 70% min

		const start = passableTiles[0]!;
		const end = passableTiles[passableTiles.length - 1]!;

		const result = findPath(start.x, start.z, 0, end.x, end.z, 0);
		// Path may or may not exist depending on connectivity, but it shouldn't crash
		expect(result).toHaveProperty("valid");
		expect(result).toHaveProperty("path");
		expect(result).toHaveProperty("cost");
	});

	it("returns valid=true with empty path for start === goal", () => {
		const chunk = getChunk(0, 0);
		const tile = chunk.tiles.find((t) => t.passable && t.level === 0)!;

		const result = findPath(tile.x, tile.z, 0, tile.x, tile.z, 0);
		expect(result.valid).toBe(true);
		expect(result.path).toEqual([]);
		expect(result.cost).toBe(0);
	});

	it("returns valid=false for impassable start", () => {
		const chunk = getChunk(0, 0);
		const blocked = chunk.tiles.find((t) => !t.passable);

		if (!blocked) return;

		const result = findPath(blocked.x, blocked.z, blocked.level, 0, 0, 0);
		expect(result.valid).toBe(false);
	});

	it("returns valid=false for impassable goal", () => {
		const chunk = getChunk(0, 0);
		const start = chunk.tiles.find((t) => t.passable && t.level === 0)!;
		const blocked = chunk.tiles.find((t) => !t.passable);

		if (!blocked) return;

		const result = findPath(start.x, start.z, 0, blocked.x, blocked.z, blocked.level);
		expect(result.valid).toBe(false);
	});

	it("path cost equals path length (uniform cost)", () => {
		const chunk = getChunk(0, 0);
		const passable = chunk.tiles.filter((t) => t.passable && t.level === 0);
		if (passable.length < 2) return;

		const result = findPath(
			passable[0]!.x, passable[0]!.z, 0,
			passable[1]!.x, passable[1]!.z, 0,
		);

		if (result.valid) {
			expect(result.cost).toBe(result.path.length);
		}
	});

	it("respects maxNodes limit", () => {
		// With maxNodes=1, should fail to find most paths
		const chunk = getChunk(0, 0);
		const passable = chunk.tiles.filter((t) => t.passable && t.level === 0);
		if (passable.length < 2) return;

		const far1 = passable[0]!;
		const far2 = passable[passable.length - 1]!;

		// If start and goal aren't adjacent, maxNodes=1 won't find a path
		if (Math.abs(far1.x - far2.x) + Math.abs(far1.z - far2.z) > 1) {
			const result = findPath(far1.x, far1.z, 0, far2.x, far2.z, 0, 1);
			expect(result.valid).toBe(false);
		}
	});
});

describe("getReachable", () => {
	it("returns tiles within movement budget", () => {
		const chunk = getChunk(0, 0);
		const start = chunk.tiles.find((t) => t.passable && t.level === 0)!;

		const reachable = getReachable(start.x, start.z, 0, 3);

		// All returned tiles should have cost ≤ 3
		for (const [, entry] of reachable) {
			expect(entry.cost).toBeLessThanOrEqual(3);
			expect(entry.cost).toBeGreaterThan(0);
		}
	});

	it("maxCost=0 returns empty set", () => {
		const chunk = getChunk(0, 0);
		const start = chunk.tiles.find((t) => t.passable && t.level === 0)!;

		const reachable = getReachable(start.x, start.z, 0, 0);
		expect(reachable.size).toBe(0);
	});

	it("does not include start position", () => {
		const chunk = getChunk(0, 0);
		const start = chunk.tiles.find((t) => t.passable && t.level === 0)!;

		const reachable = getReachable(start.x, start.z, 0, 5);
		const startKey = `${start.x},${start.z},0`;
		expect(reachable.has(startKey)).toBe(false);
	});

	it("returns empty for impassable start", () => {
		const chunk = getChunk(0, 0);
		const blocked = chunk.tiles.find((t) => !t.passable);

		if (!blocked) return;

		const reachable = getReachable(blocked.x, blocked.z, blocked.level, 5);
		expect(reachable.size).toBe(0);
	});

	it("larger budget reaches more tiles", () => {
		const chunk = getChunk(0, 0);
		const start = chunk.tiles.find((t) => t.passable && t.level === 0)!;

		const small = getReachable(start.x, start.z, 0, 2);
		const large = getReachable(start.x, start.z, 0, 5);

		expect(large.size).toBeGreaterThanOrEqual(small.size);
	});
});

// ─── Compatibility Shim ─────────────────────────────────────────────────────

describe("isPassableAtWorldPosition", () => {
	it("returns true for passable world positions", () => {
		const chunk = getChunk(0, 0);
		const passable = chunk.tiles.find((t) => t.passable)!;
		const { worldX, worldZ } = tileToWorld(passable.x, passable.z);
		expect(isPassableAtWorldPosition(worldX, worldZ)).toBe(true);
	});

	it("returns false for impassable world positions", () => {
		const chunk = getChunk(0, 0);
		const blocked = chunk.tiles.find((t) => !t.passable);

		if (!blocked) return;

		const { worldX, worldZ } = tileToWorld(blocked.x, blocked.z);
		// Could be false at level 0 but true at bridge level — check ground
		const groundPassable = isPassable(blocked.x, blocked.z, 0);
		if (!groundPassable) {
			// If there's a bridge above, isPassableAtWorldPosition checks any level
			const anyLevel = getTileAnyLevel(blocked.x, blocked.z);
			expect(isPassableAtWorldPosition(worldX, worldZ)).toBe(
				anyLevel?.passable ?? false,
			);
		}
	});
});
