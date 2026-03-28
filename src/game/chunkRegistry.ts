/**
 * Chunk registry — global ref for loaded chunk tile data.
 *
 * Exposes chunk tile passability to the minimap without coupling
 * the UI layer to the BabylonJS ChunkManager directly.
 */

import type { ChunkManagerState } from "./ChunkManager";

let registeredState: ChunkManagerState | null = null;

/** Register the ChunkManager state so the minimap can read loaded chunks. */
export function registerChunkState(state: ChunkManagerState): void {
	registeredState = state;
}

/** Unregister the chunk state on cleanup. */
export function unregisterChunkState(): void {
	registeredState = null;
}

/** Get the currently registered chunk state, or null. */
export function getChunkState(): ChunkManagerState | null {
	return registeredState;
}
