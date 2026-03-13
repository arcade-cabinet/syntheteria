import chunksConfig from "../../config/chunks.json";
import {
	chunkDistance,
	chunkKey,
	computeChunkDelta,
	getChunkState,
	getChunksInRadius,
	getLastCameraChunk,
	getLoadedChunks,
	isChunkLoaded,
	isChunkTracked,
	type LoadedChunk,
	resetChunkLoader,
	setChunkCallbacks,
	updateChunkLoader,
} from "../chunkLoader";

/** World-unit span of one chunk along each axis. */
const CHUNK_SPAN = chunksConfig.chunkSize * chunksConfig.cellWorldSize;

const LOAD_RADIUS = (chunksConfig as Record<string, number>).loadRadius ?? 3;
const UNLOAD_RADIUS =
	(chunksConfig as Record<string, number>).unloadRadius ?? 5;

afterEach(() => {
	resetChunkLoader();
});

// ---------------------------------------------------------------------------
// Pure helper tests
// ---------------------------------------------------------------------------

describe("chunkKey", () => {
	it("produces unique keys for distinct coordinates", () => {
		expect(chunkKey(0, 0)).not.toBe(chunkKey(0, 1));
		expect(chunkKey(1, 0)).not.toBe(chunkKey(0, 1));
	});

	it("handles negative coordinates", () => {
		expect(chunkKey(-1, -2)).toBe("-1,-2");
	});
});

describe("chunkDistance", () => {
	it("returns 0 for the same chunk", () => {
		expect(chunkDistance(3, 4, 3, 4)).toBe(0);
	});

	it("returns Chebyshev distance", () => {
		expect(chunkDistance(0, 0, 3, 4)).toBe(4);
		expect(chunkDistance(0, 0, -2, 1)).toBe(2);
	});
});

describe("getChunksInRadius", () => {
	it("returns (2r+1)^2 chunks for radius r", () => {
		const r = 2;
		const chunks = getChunksInRadius(0, 0, r);
		expect(chunks.length).toBe((2 * r + 1) ** 2);
	});

	it("includes the center chunk", () => {
		const chunks = getChunksInRadius(5, 7, 1);
		expect(chunks).toContainEqual({ chunkX: 5, chunkZ: 7 });
	});

	it("radius 0 returns only the center", () => {
		const chunks = getChunksInRadius(3, -1, 0);
		expect(chunks).toEqual([{ chunkX: 3, chunkZ: -1 }]);
	});
});

// ---------------------------------------------------------------------------
// computeChunkDelta — pure delta computation
// ---------------------------------------------------------------------------

describe("computeChunkDelta", () => {
	it("loads all chunks in radius when map is empty", () => {
		const { toLoad, toUnload } = computeChunkDelta(
			{ chunkX: 0, chunkZ: 0 },
			new Map(),
			LOAD_RADIUS,
			UNLOAD_RADIUS,
		);
		expect(toLoad.length).toBe((2 * LOAD_RADIUS + 1) ** 2);
		expect(toUnload.length).toBe(0);
	});

	it("skips chunks already loaded", () => {
		const existing = new Map<string, LoadedChunk>();
		existing.set(chunkKey(0, 0), {
			chunkX: 0,
			chunkZ: 0,
			state: "ready",
		});

		const { toLoad } = computeChunkDelta(
			{ chunkX: 0, chunkZ: 0 },
			existing,
			LOAD_RADIUS,
			UNLOAD_RADIUS,
		);

		// Should not include the chunk already loaded
		const keys = toLoad.map((c) => chunkKey(c.chunkX, c.chunkZ));
		expect(keys).not.toContain(chunkKey(0, 0));
	});

	it("re-loads chunks that were in 'unloading' state", () => {
		const existing = new Map<string, LoadedChunk>();
		existing.set(chunkKey(0, 0), {
			chunkX: 0,
			chunkZ: 0,
			state: "unloading",
		});

		const { toLoad } = computeChunkDelta(
			{ chunkX: 0, chunkZ: 0 },
			existing,
			LOAD_RADIUS,
			UNLOAD_RADIUS,
		);

		const keys = toLoad.map((c) => chunkKey(c.chunkX, c.chunkZ));
		expect(keys).toContain(chunkKey(0, 0));
	});

	it("unloads chunks beyond unload radius", () => {
		const existing = new Map<string, LoadedChunk>();
		// Place a chunk far from the camera
		const farX = UNLOAD_RADIUS + 1;
		existing.set(chunkKey(farX, 0), {
			chunkX: farX,
			chunkZ: 0,
			state: "ready",
		});

		const { toUnload } = computeChunkDelta(
			{ chunkX: 0, chunkZ: 0 },
			existing,
			LOAD_RADIUS,
			UNLOAD_RADIUS,
		);

		const keys = toUnload.map((c) => chunkKey(c.chunkX, c.chunkZ));
		expect(keys).toContain(chunkKey(farX, 0));
	});

	it("does not unload chunks within unload radius", () => {
		const existing = new Map<string, LoadedChunk>();
		// Place a chunk just at the unload radius boundary
		existing.set(chunkKey(UNLOAD_RADIUS, 0), {
			chunkX: UNLOAD_RADIUS,
			chunkZ: 0,
			state: "ready",
		});

		const { toUnload } = computeChunkDelta(
			{ chunkX: 0, chunkZ: 0 },
			existing,
			LOAD_RADIUS,
			UNLOAD_RADIUS,
		);

		const keys = toUnload.map((c) => chunkKey(c.chunkX, c.chunkZ));
		expect(keys).not.toContain(chunkKey(UNLOAD_RADIUS, 0));
	});
});

// ---------------------------------------------------------------------------
// updateChunkLoader — stateful integration
// ---------------------------------------------------------------------------

describe("updateChunkLoader", () => {
	it("loads chunks around the camera on first call", () => {
		const changed = updateChunkLoader(0, 0);
		expect(changed).toBe(true);

		const loaded = getLoadedChunks();
		const expectedCount = (2 * LOAD_RADIUS + 1) ** 2;
		expect(loaded.size).toBe(expectedCount);

		// All should be "ready" with no async callback
		for (const [, chunk] of loaded) {
			expect(chunk.state).toBe("ready");
		}
	});

	it("returns false when camera stays in the same chunk", () => {
		updateChunkLoader(0, 0);
		const changed = updateChunkLoader(1, 1); // still within chunk (0,0)
		expect(changed).toBe(false);
	});

	it("returns true when camera crosses into a new chunk", () => {
		updateChunkLoader(0, 0);
		// Move to the next chunk in the +X direction
		const changed = updateChunkLoader(CHUNK_SPAN, 0);
		expect(changed).toBe(true);
	});

	it("tracks last camera chunk correctly", () => {
		expect(getLastCameraChunk()).toBeNull();

		updateChunkLoader(0, 0);
		expect(getLastCameraChunk()).toEqual({ chunkX: 0, chunkZ: 0 });

		updateChunkLoader(CHUNK_SPAN * 3, CHUNK_SPAN * -2);
		expect(getLastCameraChunk()).toEqual({ chunkX: 3, chunkZ: -2 });
	});

	it("loads new chunks when camera enters a new region", () => {
		updateChunkLoader(0, 0);
		const sizeBefore = getLoadedChunks().size;

		// Move far enough to load new chunks and potentially unload old ones
		updateChunkLoader(CHUNK_SPAN * 2, 0);
		const sizeAfter = getLoadedChunks().size;

		// New chunks at the +X edge should now exist
		const edgeChunkX = 2 + LOAD_RADIUS;
		expect(isChunkTracked(edgeChunkX, 0)).toBe(true);

		// Size should remain roughly the same (load new, no unload yet within radius)
		expect(sizeAfter).toBeGreaterThanOrEqual(sizeBefore);
	});

	it("unloads chunks beyond unload radius when camera moves far", () => {
		updateChunkLoader(0, 0);
		expect(isChunkLoaded(0, 0)).toBe(true);

		// Move camera far enough that chunk (0,0) is beyond the unload radius
		const farDistance = UNLOAD_RADIUS + LOAD_RADIUS + 2;
		updateChunkLoader(CHUNK_SPAN * farDistance, 0);

		// Chunk (0,0) should no longer be tracked
		expect(isChunkTracked(0, 0)).toBe(false);
	});

	it("handles negative chunk coordinates", () => {
		updateChunkLoader(CHUNK_SPAN * -5, CHUNK_SPAN * -3);
		expect(getLastCameraChunk()).toEqual({ chunkX: -5, chunkZ: -3 });
		expect(isChunkLoaded(-5, -3)).toBe(true);
		expect(isChunkLoaded(-5 - LOAD_RADIUS, -3)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Rapid camera movement (edge cases)
// ---------------------------------------------------------------------------

describe("rapid camera movement", () => {
	it("handles jumping many chunks in one frame", () => {
		updateChunkLoader(0, 0);

		// Teleport the camera 100 chunks away
		updateChunkLoader(CHUNK_SPAN * 100, CHUNK_SPAN * 100);

		// Should have chunks around (100, 100) and nothing near (0, 0)
		expect(isChunkLoaded(100, 100)).toBe(true);
		expect(isChunkTracked(0, 0)).toBe(false);
	});

	it("handles re-entering a previously unloaded chunk", () => {
		updateChunkLoader(0, 0);
		expect(isChunkLoaded(0, 0)).toBe(true);

		// Move far away
		const farDistance = UNLOAD_RADIUS + LOAD_RADIUS + 2;
		updateChunkLoader(CHUNK_SPAN * farDistance, 0);
		expect(isChunkTracked(0, 0)).toBe(false);

		// Move back to origin
		updateChunkLoader(0, 0);
		expect(isChunkLoaded(0, 0)).toBe(true);
	});

	it("produces no duplicates across sequential updates", () => {
		// Walk the camera one chunk at a time and verify no duplicate keys
		for (let i = 0; i < 10; i++) {
			updateChunkLoader(CHUNK_SPAN * i, 0);
			const keys = new Set<string>();
			for (const [key] of getLoadedChunks()) {
				expect(keys.has(key)).toBe(false);
				keys.add(key);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Async chunk lifecycle callbacks
// ---------------------------------------------------------------------------

describe("chunk lifecycle callbacks", () => {
	it("invokes load callback for each new chunk", () => {
		const loaded: string[] = [];
		setChunkCallbacks((coord) => {
			loaded.push(chunkKey(coord.chunkX, coord.chunkZ));
		}, null);

		updateChunkLoader(0, 0);
		expect(loaded.length).toBe((2 * LOAD_RADIUS + 1) ** 2);
	});

	it("invokes unload callback for distant chunks", () => {
		const unloaded: string[] = [];
		setChunkCallbacks(null, (coord) => {
			unloaded.push(chunkKey(coord.chunkX, coord.chunkZ));
		});

		updateChunkLoader(0, 0);
		expect(unloaded.length).toBe(0);

		// Move far away to trigger unloads
		const farDistance = UNLOAD_RADIUS + LOAD_RADIUS + 2;
		updateChunkLoader(CHUNK_SPAN * farDistance, 0);
		expect(unloaded.length).toBeGreaterThan(0);
	});

	it("sets state to 'loading' during async load callback", async () => {
		let resolveLoad: (() => void) | null = null;
		const loadPromise = new Promise<void>((resolve) => {
			resolveLoad = resolve;
		});

		setChunkCallbacks(() => loadPromise, null);

		updateChunkLoader(0, 0);

		// While the promise is pending, chunks should be "loading"
		expect(getChunkState(0, 0)).toBe("loading");

		// Resolve the async load
		resolveLoad!();
		await loadPromise;

		// After resolution, chunk should be "ready"
		expect(getChunkState(0, 0)).toBe("ready");
	});

	it("sets state to 'unloading' during async unload callback", async () => {
		let resolveUnload: (() => void) | null = null;
		const unloadPromise = new Promise<void>((resolve) => {
			resolveUnload = resolve;
		});

		updateChunkLoader(0, 0);
		expect(isChunkLoaded(0, 0)).toBe(true);

		setChunkCallbacks(null, () => unloadPromise);

		// Move far away
		const farDistance = UNLOAD_RADIUS + LOAD_RADIUS + 2;
		updateChunkLoader(CHUNK_SPAN * farDistance, 0);

		// Chunk (0,0) should be in "unloading" state while promise is pending
		expect(getChunkState(0, 0)).toBe("unloading");

		// Resolve the async unload
		resolveUnload!();
		await unloadPromise;

		// After resolution, chunk should be fully removed
		expect(isChunkTracked(0, 0)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

describe("query helpers", () => {
	it("isChunkLoaded returns false for loading chunks", () => {
		setChunkCallbacks(
			() => new Promise<void>(() => {}), // never resolves
			null,
		);

		updateChunkLoader(0, 0);
		expect(isChunkLoaded(0, 0)).toBe(false);
		expect(isChunkTracked(0, 0)).toBe(true);
		expect(getChunkState(0, 0)).toBe("loading");
	});

	it("getChunkState returns null for unknown chunks", () => {
		expect(getChunkState(999, 999)).toBeNull();
	});

	it("isChunkTracked returns false for unknown chunks", () => {
		expect(isChunkTracked(999, 999)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// resetChunkLoader
// ---------------------------------------------------------------------------

describe("resetChunkLoader", () => {
	it("clears all state and callbacks", () => {
		const loaded: string[] = [];
		setChunkCallbacks((coord) => {
			loaded.push(chunkKey(coord.chunkX, coord.chunkZ));
		}, null);

		updateChunkLoader(0, 0);
		expect(getLoadedChunks().size).toBeGreaterThan(0);
		expect(getLastCameraChunk()).not.toBeNull();

		resetChunkLoader();

		expect(getLoadedChunks().size).toBe(0);
		expect(getLastCameraChunk()).toBeNull();

		// Callbacks should be cleared — load again, the old callback should not fire
		loaded.length = 0;
		updateChunkLoader(0, 0);
		expect(loaded.length).toBe(0);
	});
});
