/**
 * Tests for ChunkManager — chunk lifecycle management.
 *
 * Mocks the BabylonJS scene and board module to test chunk loading/unloading
 * logic without GPU dependencies.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock board module ──────────────────────────────────────────────────────

const mockDispose = vi.fn();
const mockGenerateChunk = vi.fn((_seed: string, _cx: number, _cz: number) => ({
	tiles: [],
	entities: [],
	cx: 0,
	cz: 0,
}));
const mockPopulateChunkScene = vi.fn((_chunk: unknown, _scene: unknown) => ({
	floorMesh: { dispose: mockDispose },
	wallMeshes: [],
}));
const mockDisposeChunkMeshes = vi.fn();
const mockChunkKey = vi.fn((cx: number, cz: number) => `${cx},${cz}`);

vi.mock("../../board", () => ({
	CHUNK_SIZE: 32,
	TILE_M: 2.0,
	chunkKey: (cx: number, cz: number) => mockChunkKey(cx, cz),
	generateChunk: (seed: string, cx: number, cz: number) =>
		mockGenerateChunk(seed, cx, cz),
	populateChunkScene: (chunk: unknown, scene: unknown) =>
		mockPopulateChunkScene(chunk, scene),
	disposeChunkMeshes: (cm: unknown) => mockDisposeChunkMeshes(cm),
}));

// ─── Mock terrain module (needed by ChunkManager entity spawning) ────────
vi.mock("../../ecs/terrain", () => ({
	createFragment: () => ({ id: "test-fragment" }),
	getTerrainHeight: () => 0,
}));

import {
	type ChunkManagerState,
	disposeAllChunks,
	initChunks,
	updateChunks,
} from "../ChunkManager";

// ─── Mock scene ──────────────────────────────────────────────────────────────

function createMockScene() {
	return {} as import("@babylonjs/core/scene").Scene;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("initChunks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates initial chunks around start position", () => {
		const scene = createMockScene();
		// CHUNK_SIZE=32, TILE_M=2.0 -> chunk world size = 64
		// startWorldX=50 -> cx=0, startWorldZ=50 -> cz=0
		const state = initChunks(scene, 50, 50, "test-seed");

		expect(state.loaded.size).toBeGreaterThan(0);
		expect(state.seed).toBe("test-seed");
		expect(state.lastCameraChunk).toBe("0,0");
		expect(mockGenerateChunk).toHaveBeenCalled();
		expect(mockPopulateChunkScene).toHaveBeenCalled();
	});

	it("loads chunks in a radius around start chunk", () => {
		const scene = createMockScene();
		const state = initChunks(scene, 50, 50, "seed");

		// VIEW_RADIUS=3 -> (2*3+1)^2 = 49 chunks
		expect(state.loaded.size).toBe(49);
	});

	it("stores the correct lastCameraChunk", () => {
		const scene = createMockScene();
		// startWorldX=200 -> cx=200/(32*2)=3, startWorldZ=128 -> cz=128/(32*2)=2
		const state = initChunks(scene, 200, 128, "seed");

		expect(state.lastCameraChunk).toBe("3,2");
	});
});

describe("updateChunks", () => {
	let scene: ReturnType<typeof createMockScene>;
	let state: ChunkManagerState;

	beforeEach(() => {
		vi.clearAllMocks();
		scene = createMockScene();
		state = initChunks(scene, 50, 50, "seed");
		vi.clearAllMocks(); // Clear counts from init
	});

	it("does nothing when camera stays in same chunk", () => {
		// Camera still in chunk (0,0)
		updateChunks(50, 50, scene, state);

		expect(mockGenerateChunk).not.toHaveBeenCalled();
		expect(mockDisposeChunkMeshes).not.toHaveBeenCalled();
	});

	it("loads new chunks when camera moves to new chunk", () => {
		// Move camera to a distant chunk
		// CHUNK_SIZE=32, TILE_M=2.0 -> need to move 64+ world units for new chunk
		updateChunks(500, 500, scene, state);

		expect(mockGenerateChunk).toHaveBeenCalled();
	});

	it("unloads distant chunks when camera moves", () => {
		// Move far away — all original chunks should be unloaded
		updateChunks(2000, 2000, scene, state);

		expect(mockDisposeChunkMeshes).toHaveBeenCalled();
	});
});

describe("disposeAllChunks", () => {
	it("cleans up all loaded chunks", () => {
		const scene = createMockScene();
		const state = initChunks(scene, 50, 50, "seed");
		const loadedCount = state.loaded.size;

		vi.clearAllMocks();
		disposeAllChunks(state);

		expect(state.loaded.size).toBe(0);
		expect(mockDisposeChunkMeshes).toHaveBeenCalledTimes(loadedCount);
	});

	it("handles empty state", () => {
		const state: ChunkManagerState = {
			loaded: new Map(),
			chunkEntities: new Map(),
			lastCameraChunk: "0,0",
			seed: "test",
		};

		disposeAllChunks(state);
		expect(state.loaded.size).toBe(0);
	});
});
