import chunksConfig from "../../config/chunks.json";
import {
	discoverCell,
	getCellDiscoveryLevel,
	getChunkDiscoveryState,
	isCellDiscovered,
	onChunkLoad,
	onChunkUnload,
	resetChunkDiscovery,
	revealVision,
} from "../chunkDiscovery";
import { worldToChunk } from "../chunks";

const SPAN = chunksConfig.chunkSize * chunksConfig.cellWorldSize;

beforeEach(() => {
	resetChunkDiscovery();
});

// ---------------------------------------------------------------------------
// Per-chunk discovery isolation
// ---------------------------------------------------------------------------

describe("per-chunk discovery isolation", () => {
	it("discovers a cell in chunk (0,0) without affecting chunk (1,0)", () => {
		discoverCell(1, 1);
		expect(isCellDiscovered(1, 1)).toBe(true);

		// A cell in an adjacent chunk should not be discovered
		expect(isCellDiscovered(SPAN + 1, 1)).toBe(false);
	});

	it("stores cells in the correct chunk based on world position", () => {
		// Cell in chunk (0,0)
		discoverCell(0, 0);
		// Cell in chunk (1,0)
		discoverCell(SPAN, 0);
		// Cell in chunk (0,1)
		discoverCell(0, SPAN);

		const state00 = getChunkDiscoveryState(0, 0);
		const state10 = getChunkDiscoveryState(1, 0);
		const state01 = getChunkDiscoveryState(0, 1);

		expect(state00.size).toBe(1);
		expect(state10.size).toBe(1);
		expect(state01.size).toBe(1);
	});

	it("handles negative chunk coordinates", () => {
		discoverCell(-1, -1);
		const { chunkX, chunkZ } = worldToChunk(-1, -1);
		const state = getChunkDiscoveryState(chunkX, chunkZ);
		expect(state.size).toBe(1);
		expect(isCellDiscovered(-1, -1)).toBe(true);
	});

	it("discovery level only increases, never decreases", () => {
		discoverCell(5, 5, 1);
		expect(getCellDiscoveryLevel(5, 5)).toBe(1);

		discoverCell(5, 5, 2);
		expect(getCellDiscoveryLevel(5, 5)).toBe(2);

		// Attempting to downgrade to 1 should be ignored
		discoverCell(5, 5, 1);
		expect(getCellDiscoveryLevel(5, 5)).toBe(2);
	});

	it("returns 0 for undiscovered cells", () => {
		expect(getCellDiscoveryLevel(99, 99)).toBe(0);
		expect(isCellDiscovered(99, 99)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Cache round-trip (unload -> reload preserves state)
// ---------------------------------------------------------------------------

describe("cache round-trip", () => {
	it("preserves discovery state through unload -> load cycle", () => {
		onChunkLoad(0, 0);
		discoverCell(1, 1);
		discoverCell(3, 3, 2);

		// Unload the chunk
		onChunkUnload(0, 0);

		// State should still be queryable from cache
		expect(isCellDiscovered(1, 1)).toBe(true);
		expect(getCellDiscoveryLevel(3, 3)).toBe(2);

		// Reload the chunk
		onChunkLoad(0, 0);

		// State should be restored
		expect(isCellDiscovered(1, 1)).toBe(true);
		expect(getCellDiscoveryLevel(3, 3)).toBe(2);

		const state = getChunkDiscoveryState(0, 0);
		expect(state.size).toBe(2);
	});

	it("unloading an empty chunk does not create a cache entry", () => {
		onChunkLoad(5, 5);
		onChunkUnload(5, 5);

		// Should return empty map, not crash
		const state = getChunkDiscoveryState(5, 5);
		expect(state.size).toBe(0);
	});

	it("loading an already-loaded chunk is a no-op", () => {
		onChunkLoad(0, 0);
		discoverCell(2, 2);
		onChunkLoad(0, 0); // should not reset

		expect(isCellDiscovered(2, 2)).toBe(true);
	});

	it("unloading an untracked chunk is a no-op", () => {
		// Should not throw
		onChunkUnload(99, 99);
		expect(getChunkDiscoveryState(99, 99).size).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Cross-chunk vision
// ---------------------------------------------------------------------------

describe("cross-chunk vision", () => {
	it("unit near chunk boundary discovers cells in adjacent chunk", () => {
		// Place a unit near the right edge of chunk (0,0)
		// SPAN = chunkSize * cellWorldSize = 8 * 2 = 16
		// Position at (SPAN - 1, 8) is near the boundary with chunk (1,0)
		const unitX = SPAN - 1;
		const unitZ = 8;
		const radius = 4;

		revealVision(unitX, unitZ, radius);

		// Cells within chunk (0,0) should be discovered
		expect(isCellDiscovered(unitX, unitZ)).toBe(true);

		// Cells that cross into chunk (1,0) should also be discovered
		// With radius 4 and cellWorldSize 2, vision extends 2 cells = 4 world units
		// unitX + 2*cellWorldSize = SPAN - 1 + 4 = SPAN + 3 -> chunk (1,0)
		expect(isCellDiscovered(unitX + 4, unitZ)).toBe(true);
		const crossChunk = worldToChunk(unitX + 4, unitZ);
		expect(crossChunk.chunkX).toBe(1); // confirm it's in the next chunk
	});

	it("unit at chunk corner discovers cells in diagonal chunks", () => {
		// Position at origin — near corners of chunks (-1,-1), (-1,0), (0,-1), (0,0)
		const unitX = 1;
		const unitZ = 1;
		// Use a larger radius so the diagonal cell is within range.
		// cellWorldSize=2, need to reach (-1,-1) which is offset (-1,-1) in cells
		// distance = sqrt((1*2)^2 + (1*2)^2) = sqrt(8) ~ 2.83
		// radius must be >= 2.83
		const radius = 6;

		revealVision(unitX, unitZ, radius);

		// Should discover cells in chunk (0,0)
		expect(isCellDiscovered(unitX, unitZ)).toBe(true);

		// Should discover cells in chunk (-1,0) — one cell-step left crosses boundary
		// unitX - cellWorldSize = 1 - 2 = -1, which is in chunk (-1, *)
		expect(isCellDiscovered(unitX - 2, unitZ)).toBe(true);
		const leftChunk = worldToChunk(unitX - 2, unitZ);
		expect(leftChunk.chunkX).toBe(-1);

		// Should discover cells in chunk (-1,-1) — diagonal
		// unitX - cellWorldSize = -1, unitZ - cellWorldSize = -1
		expect(isCellDiscovered(unitX - 2, unitZ - 2)).toBe(true);
		const diagChunk = worldToChunk(unitX - 2, unitZ - 2);
		expect(diagChunk.chunkX).toBe(-1);
		expect(diagChunk.chunkZ).toBe(-1);
	});

	it("revealVision respects circular radius", () => {
		const unitX = 8;
		const unitZ = 8;
		const radius = 4;

		revealVision(unitX, unitZ, radius);

		// Center should be discovered
		expect(isCellDiscovered(unitX, unitZ)).toBe(true);

		// Cell at exactly the radius distance along an axis should be discovered
		expect(isCellDiscovered(unitX + 4, unitZ)).toBe(true);

		// Cell at a diagonal beyond the radius should NOT be discovered
		// distance = sqrt(4^2 + 4^2) = sqrt(32) ~ 5.66 > 4
		expect(isCellDiscovered(unitX + 4, unitZ + 4)).toBe(false);
	});

	it("revealVision supports detailed discovery level", () => {
		revealVision(4, 4, 2, 2);
		expect(getCellDiscoveryLevel(4, 4)).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Reset clears all state
// ---------------------------------------------------------------------------

describe("resetChunkDiscovery", () => {
	it("clears all active and cached discovery state", () => {
		// Set up some active state
		onChunkLoad(0, 0);
		discoverCell(1, 1);

		// Set up some cached state
		onChunkLoad(1, 1);
		discoverCell(SPAN + 1, SPAN + 1);
		onChunkUnload(1, 1);

		// Reset
		resetChunkDiscovery();

		expect(isCellDiscovered(1, 1)).toBe(false);
		expect(isCellDiscovered(SPAN + 1, SPAN + 1)).toBe(false);
		expect(getChunkDiscoveryState(0, 0).size).toBe(0);
		expect(getChunkDiscoveryState(1, 1).size).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases: discovering cells in unloaded chunks
// ---------------------------------------------------------------------------

describe("discovering cells in unloaded chunks", () => {
	it("discovering a cell in an unloaded chunk creates a cache entry", () => {
		// Don't call onChunkLoad — chunk is not active
		discoverCell(SPAN * 5, SPAN * 5);

		expect(isCellDiscovered(SPAN * 5, SPAN * 5)).toBe(true);

		// The state should be in cache, retrievable via getChunkDiscoveryState
		const state = getChunkDiscoveryState(5, 5);
		expect(state.size).toBe(1);
	});

	it("loading a chunk with pre-cached discovery from unloaded writes restores state", () => {
		// Discover while unloaded
		discoverCell(SPAN * 3 + 2, SPAN * 3 + 2);

		// Now load the chunk
		onChunkLoad(3, 3);

		// State should be available
		expect(isCellDiscovered(SPAN * 3 + 2, SPAN * 3 + 2)).toBe(true);
		const state = getChunkDiscoveryState(3, 3);
		expect(state.size).toBe(1);
	});

	it("multiple discoveries in the same unloaded chunk accumulate", () => {
		discoverCell(SPAN * 2, SPAN * 2);
		discoverCell(SPAN * 2 + 2, SPAN * 2 + 2);

		const state = getChunkDiscoveryState(2, 2);
		expect(state.size).toBe(2);
	});

	it("getChunkDiscoveryState returns empty map for never-touched chunk", () => {
		const state = getChunkDiscoveryState(999, 999);
		expect(state.size).toBe(0);
	});
});
