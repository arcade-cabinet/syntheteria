/**
 * ChunkManager — imperative chunk lifecycle for the game canvas.
 *
 * Loads/unloads labyrinth chunks as the camera pans. Keeps a Map of
 * loaded chunks and lazily generates new ones within VIEW_RADIUS of
 * the current camera chunk.
 *
 * Not a React component — called imperatively from GameCanvas.
 */

import type { Scene } from "@babylonjs/core/scene";
import {
	CHUNK_SIZE,
	type ChunkKey,
	type ChunkMeshes,
	chunkKey,
	disposeChunkMeshes,
	generateChunk,
	populateChunkScene,
	TILE_M,
} from "../board";

/** How many chunks to load in each direction from the camera chunk. */
const VIEW_RADIUS = 3;

export interface ChunkManagerState {
	loaded: Map<ChunkKey, ChunkMeshes>;
	lastCameraChunk: string;
	seed: string;
}

/**
 * Create the initial manager state and load chunks around the start position.
 *
 * @param scene - BabylonJS scene to populate
 * @param startWorldX - world-space X of the player start (tile coords * TILE_SIZE_M)
 * @param startWorldZ - world-space Z of the player start
 * @param seed - world generation seed
 */
export function initChunks(
	scene: Scene,
	startWorldX: number,
	startWorldZ: number,
	seed: string,
): ChunkManagerState {
	const startCx = Math.floor(startWorldX / (CHUNK_SIZE * TILE_M));
	const startCz = Math.floor(startWorldZ / (CHUNK_SIZE * TILE_M));

	const state: ChunkManagerState = {
		loaded: new Map(),
		lastCameraChunk: `${startCx},${startCz}`,
		seed,
	};

	loadChunksAround(startCx, startCz, scene, state);
	return state;
}

/**
 * Check camera position and load/unload chunks if the camera has moved
 * to a new chunk. Call this from the camera's onViewMatrixChanged observable.
 *
 * @param cameraTargetX - world-space X of the camera target
 * @param cameraTargetZ - world-space Z of the camera target
 * @param scene - BabylonJS scene
 * @param state - chunk manager state (mutated in place)
 */
export function updateChunks(
	cameraTargetX: number,
	cameraTargetZ: number,
	scene: Scene,
	state: ChunkManagerState,
): void {
	const cx = Math.floor(cameraTargetX / (CHUNK_SIZE * TILE_M));
	const cz = Math.floor(cameraTargetZ / (CHUNK_SIZE * TILE_M));
	const key = `${cx},${cz}`;

	if (key !== state.lastCameraChunk) {
		state.lastCameraChunk = key;
		loadChunksAround(cx, cz, scene, state);
	}
}

/**
 * Dispose all loaded chunk meshes. Call on cleanup / unmount.
 */
export function disposeAllChunks(state: ChunkManagerState): void {
	for (const cm of state.loaded.values()) {
		disposeChunkMeshes(cm);
	}
	state.loaded.clear();
}

// ─── Internal ────────────────────────────────────────────────────────────────

function loadChunksAround(
	cx: number,
	cz: number,
	scene: Scene,
	state: ChunkManagerState,
): void {
	const needed = new Set<ChunkKey>();

	for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
		for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
			const key = chunkKey(cx + dx, cz + dz);
			needed.add(key);

			if (!state.loaded.has(key)) {
				const chunk = generateChunk(state.seed, cx + dx, cz + dz);
				const meshes = populateChunkScene(chunk, scene);
				state.loaded.set(key, meshes);
			}
		}
	}

	// Unload chunks that are no longer within view radius
	for (const [key, cm] of state.loaded) {
		if (!needed.has(key)) {
			disposeChunkMeshes(cm);
			state.loaded.delete(key);
		}
	}
}
