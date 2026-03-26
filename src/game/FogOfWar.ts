/**
 * FogOfWar — visual fog-of-war overlay for BabylonJS chunk meshes.
 *
 * Reads the fog grid from all player-faction fragments and updates
 * mesh visibility on loaded chunk tiles each frame.
 *
 * Fog states → visual:
 *   0 (Unexplored) → mesh hidden entirely (isVisible = false)
 *   1 (Abstract/Shroud) → dimmed (visibility = 0.35)
 *   2 (Detailed/Visible) → full brightness (visibility = 1.0)
 *
 * Uses mesh.visibility (a per-mesh float 0–1) which works independently
 * of frozen PBR materials. Unexplored tiles are disabled entirely via
 * mesh.setEnabled(false) to skip rendering.
 */

import {
	type FogState,
	getFragment,
	type MapFragment,
	worldToFogIndex,
} from "../ecs/terrain";
import { Faction, Fragment } from "../ecs/traits";
import { world } from "../ecs/world";
import type { ChunkManagerState } from "./ChunkManager";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Visibility value for shroud/abstract tiles (dimmed but recognizable). */
const SHROUD_VISIBILITY = 0.35;

// ─── Player fragment cache ──────────────────────────────────────────────────

/**
 * Collect all MapFragments belonging to player-faction entities.
 * Returns a deduplicated array of fragments.
 */
function getPlayerFragments(): MapFragment[] {
	const seen = new Set<string>();
	const result: MapFragment[] = [];

	for (const entity of world.query(Faction, Fragment)) {
		const faction = entity.get(Faction)!;
		if (faction.value !== "player") continue;

		const fragTrait = entity.get(Fragment)!;
		if (seen.has(fragTrait.fragmentId)) continue;
		seen.add(fragTrait.fragmentId);

		const fragment = getFragment(fragTrait.fragmentId);
		if (fragment) {
			result.push(fragment);
		}
	}

	return result;
}

/**
 * Get the best fog state across all player fragments for a world position.
 * Returns the maximum fog state (0=unexplored, 1=abstract, 2=detailed).
 */
function getBestFogState(
	fragments: MapFragment[],
	worldX: number,
	worldZ: number,
): FogState {
	let best: FogState = 0;

	for (const frag of fragments) {
		const idx = worldToFogIndex(worldX, worldZ);
		if (idx < 0) continue;
		const state = frag.fog[idx] as FogState;
		if (state > best) {
			best = state;
			if (best === 2) return 2; // can't get higher, early exit
		}
	}

	return best;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Update visual fog-of-war on all loaded chunk meshes.
 *
 * Call once per frame (or per simulation tick) after explorationSystem runs.
 * Iterates loaded chunk meshes and sets visibility based on the player's
 * combined fog grid.
 *
 * @param chunkState - The ChunkManager state containing loaded chunk meshes
 */
export function updateFogVisibility(chunkState: ChunkManagerState): void {
	const playerFragments = getPlayerFragments();

	// If no player fragments exist yet, hide everything
	const hasFragments = playerFragments.length > 0;

	for (const chunkMeshes of chunkState.loaded.values()) {
		for (const mesh of chunkMeshes.meshes) {
			// Extract world position from the mesh — this is the tile center
			const wx = mesh.position.x;
			const wz = mesh.position.z;

			if (!hasFragments) {
				// No player fragments — everything unexplored
				mesh.setEnabled(false);
				continue;
			}

			// Sample fog at tile center. Tiles are TILE_SIZE_M wide, so the
			// center position maps cleanly to the fog grid.
			const fogState = getBestFogState(playerFragments, wx, wz);

			switch (fogState) {
				case 0: // Unexplored — completely hidden
					mesh.setEnabled(false);
					break;
				case 1: // Shroud — dimmed
					mesh.setEnabled(true);
					mesh.visibility = SHROUD_VISIBILITY;
					break;
				case 2: // Visible — full brightness
					mesh.setEnabled(true);
					mesh.visibility = 1.0;
					break;
			}
		}
	}
}
