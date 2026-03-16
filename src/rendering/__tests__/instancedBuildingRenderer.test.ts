/**
 * Tests for chunk-partitioned instanced building rendering.
 *
 * Tests the pure logic in chunkInstanceBuffers.ts:
 * - Building partitioning by chunk
 * - Buffer lifecycle (create on load, dispose on unload)
 * - Empty chunk handling
 * - Bounds checking
 */

jest.mock("../../config/chunks.json", () => ({
	chunkSize: 8,
	cellWorldSize: 2,
	loadRadius: 3,
	unloadRadius: 5,
}));

import { chunkKey } from "../../world/chunkLoader";
import { chunkToWorldBounds } from "../../world/chunks";
import {
	type BuildingData,
	ChunkBufferManager,
	isInChunkBounds,
	MAX_INSTANCES_PER_CHUNK,
	partitionBuildingsByChunk,
} from "../chunkInstanceBuffers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Chunk span = chunkSize * cellWorldSize = 8 * 2 = 16 world units */
const SPAN = 16;

function makeBldg(
	x: number,
	z: number,
	overrides?: Partial<BuildingData>,
): BuildingData {
	return {
		x,
		y: 0,
		z,
		faction: "player",
		buildingType: "fabrication_unit",
		operational: true,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// isInChunkBounds
// ---------------------------------------------------------------------------

describe("isInChunkBounds", () => {
	const bounds = chunkToWorldBounds(0, 0); // [0, 16) x [0, 16)

	it("returns true for a point inside the bounds", () => {
		expect(isInChunkBounds(8, 8, bounds)).toBe(true);
	});

	it("returns true for the min corner (inclusive)", () => {
		expect(isInChunkBounds(0, 0, bounds)).toBe(true);
	});

	it("returns false for the max corner (exclusive)", () => {
		expect(isInChunkBounds(SPAN, SPAN, bounds)).toBe(false);
	});

	it("returns false for a point outside the bounds", () => {
		expect(isInChunkBounds(-1, 8, bounds)).toBe(false);
		expect(isInChunkBounds(8, -1, bounds)).toBe(false);
		expect(isInChunkBounds(SPAN + 1, 8, bounds)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// partitionBuildingsByChunk
// ---------------------------------------------------------------------------

describe("partitionBuildingsByChunk", () => {
	it("partitions buildings into correct chunk buckets", () => {
		const buildings = [
			makeBldg(1, 1), // chunk (0,0)
			makeBldg(5, 5), // chunk (0,0)
			makeBldg(SPAN + 1, 1), // chunk (1,0)
			makeBldg(1, SPAN + 1), // chunk (0,1)
		];

		const loadedKeys = new Set([
			chunkKey(0, 0),
			chunkKey(1, 0),
			chunkKey(0, 1),
		]);

		const result = partitionBuildingsByChunk(buildings, loadedKeys);

		expect(result.get(chunkKey(0, 0))?.length).toBe(2);
		expect(result.get(chunkKey(1, 0))?.length).toBe(1);
		expect(result.get(chunkKey(0, 1))?.length).toBe(1);
	});

	it("drops buildings in unloaded chunks", () => {
		const buildings = [
			makeBldg(1, 1), // chunk (0,0)
			makeBldg(SPAN * 10, SPAN * 10), // chunk (10,10) — not loaded
		];

		const loadedKeys = new Set([chunkKey(0, 0)]);
		const result = partitionBuildingsByChunk(buildings, loadedKeys);

		expect(result.get(chunkKey(0, 0))?.length).toBe(1);
		expect(result.has(chunkKey(10, 10))).toBe(false);
	});

	it("returns empty arrays for loaded chunks with no buildings", () => {
		const loadedKeys = new Set([chunkKey(0, 0), chunkKey(1, 0)]);
		const result = partitionBuildingsByChunk([], loadedKeys);

		expect(result.get(chunkKey(0, 0))).toEqual([]);
		expect(result.get(chunkKey(1, 0))).toEqual([]);
	});

	it("handles negative chunk coordinates", () => {
		const buildings = [makeBldg(-1, -1)]; // chunk (-1,-1)
		const loadedKeys = new Set([chunkKey(-1, -1)]);
		const result = partitionBuildingsByChunk(buildings, loadedKeys);

		expect(result.get(chunkKey(-1, -1))?.length).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// ChunkBufferManager — lifecycle
// ---------------------------------------------------------------------------

describe("ChunkBufferManager", () => {
	let manager: ChunkBufferManager;

	beforeEach(() => {
		manager = new ChunkBufferManager();
	});

	afterEach(() => {
		manager.reset();
	});

	it("creates a buffer on chunk load", () => {
		manager.handleChunkLoad({ chunkX: 0, chunkZ: 0 });

		expect(manager.chunkCount).toBe(1);
		const buffer = manager.getBuffer(chunkKey(0, 0));
		expect(buffer).toBeDefined();
		expect(buffer!.chunkX).toBe(0);
		expect(buffer!.chunkZ).toBe(0);
		expect(buffer!.buildings).toEqual([]);
		expect(buffer!.instanceCount).toBe(0);
	});

	it("removes a buffer on chunk unload", () => {
		manager.handleChunkLoad({ chunkX: 0, chunkZ: 0 });
		expect(manager.chunkCount).toBe(1);

		manager.handleChunkUnload({ chunkX: 0, chunkZ: 0 });
		expect(manager.chunkCount).toBe(0);
		expect(manager.getBuffer(chunkKey(0, 0))).toBeUndefined();
	});

	it("fires onBufferCreated callback on chunk load", () => {
		const created: string[] = [];
		manager.onBufferCreated = (key) => created.push(key);

		manager.handleChunkLoad({ chunkX: 2, chunkZ: 3 });
		expect(created).toEqual([chunkKey(2, 3)]);
	});

	it("fires onBufferRemoved callback on chunk unload", () => {
		const removed: string[] = [];
		manager.onBufferRemoved = (key) => removed.push(key);

		manager.handleChunkLoad({ chunkX: 1, chunkZ: 1 });
		manager.handleChunkUnload({ chunkX: 1, chunkZ: 1 });
		expect(removed).toEqual([chunkKey(1, 1)]);
	});

	it("does not fire onBufferRemoved for non-existent chunk", () => {
		const removed: string[] = [];
		manager.onBufferRemoved = (key) => removed.push(key);

		manager.handleChunkUnload({ chunkX: 99, chunkZ: 99 });
		expect(removed).toEqual([]);
	});

	it("sets correct world bounds on the buffer", () => {
		manager.handleChunkLoad({ chunkX: 1, chunkZ: 2 });
		const buffer = manager.getBuffer(chunkKey(1, 2))!;

		expect(buffer.bounds.minX).toBe(1 * SPAN);
		expect(buffer.bounds.maxX).toBe(2 * SPAN);
		expect(buffer.bounds.minZ).toBe(2 * SPAN);
		expect(buffer.bounds.maxZ).toBe(3 * SPAN);
	});

	it("no instances created for empty chunks", () => {
		manager.handleChunkLoad({ chunkX: 0, chunkZ: 0 });
		manager.handleChunkLoad({ chunkX: 1, chunkZ: 0 });

		// No buildings at all
		manager.updateBuildings([]);

		for (const [, buffer] of manager.getBuffers()) {
			expect(buffer.instanceCount).toBe(0);
			expect(buffer.buildings).toEqual([]);
		}
	});
});

// ---------------------------------------------------------------------------
// ChunkBufferManager — building updates
// ---------------------------------------------------------------------------

describe("ChunkBufferManager.updateBuildings", () => {
	let manager: ChunkBufferManager;

	beforeEach(() => {
		manager = new ChunkBufferManager();
		manager.handleChunkLoad({ chunkX: 0, chunkZ: 0 });
		manager.handleChunkLoad({ chunkX: 1, chunkZ: 0 });
	});

	afterEach(() => {
		manager.reset();
	});

	it("partitions buildings into the correct chunk buffers", () => {
		const buildings = [
			makeBldg(1, 1), // chunk (0,0)
			makeBldg(SPAN + 3, 5), // chunk (1,0)
		];

		manager.updateBuildings(buildings);

		const buf00 = manager.getBuffer(chunkKey(0, 0))!;
		const buf10 = manager.getBuffer(chunkKey(1, 0))!;

		expect(buf00.instanceCount).toBe(1);
		expect(buf00.buildings[0].x).toBe(1);

		expect(buf10.instanceCount).toBe(1);
		expect(buf10.buildings[0].x).toBe(SPAN + 3);
	});

	it("clears buildings from a chunk when they are removed", () => {
		manager.updateBuildings([makeBldg(1, 1)]);
		expect(manager.getBuffer(chunkKey(0, 0))!.instanceCount).toBe(1);

		// Second update with no buildings
		manager.updateBuildings([]);
		expect(manager.getBuffer(chunkKey(0, 0))!.instanceCount).toBe(0);
	});

	it("caps instances at MAX_INSTANCES_PER_CHUNK", () => {
		const tooMany: BuildingData[] = [];
		for (let i = 0; i < MAX_INSTANCES_PER_CHUNK + 10; i++) {
			tooMany.push(makeBldg(i * 0.1, i * 0.1));
		}

		manager.updateBuildings(tooMany);

		const buf00 = manager.getBuffer(chunkKey(0, 0))!;
		expect(buf00.instanceCount).toBeLessThanOrEqual(MAX_INSTANCES_PER_CHUNK);
		expect(buf00.buildings.length).toBeLessThanOrEqual(MAX_INSTANCES_PER_CHUNK);
	});

	it("ignores buildings in unloaded chunks", () => {
		const buildings = [
			makeBldg(1, 1), // chunk (0,0) — loaded
			makeBldg(SPAN * 5, SPAN * 5), // chunk (5,5) — NOT loaded
		];

		manager.updateBuildings(buildings);

		expect(manager.getBuffer(chunkKey(0, 0))!.instanceCount).toBe(1);
		expect(manager.getBuffer(chunkKey(5, 5))).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// ChunkBufferManager.reset
// ---------------------------------------------------------------------------

describe("ChunkBufferManager.reset", () => {
	it("clears all buffers and nullifies callbacks", () => {
		const manager = new ChunkBufferManager();
		const removed: string[] = [];
		manager.onBufferRemoved = (key) => removed.push(key);

		manager.handleChunkLoad({ chunkX: 0, chunkZ: 0 });
		manager.handleChunkLoad({ chunkX: 1, chunkZ: 0 });

		manager.reset();

		expect(manager.chunkCount).toBe(0);
		// onBufferRemoved should have fired for both
		expect(removed.length).toBe(2);
	});
});
