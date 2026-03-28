/**
 * FogOfWar — visual fog-of-war overlay for BabylonJS chunk meshes.
 *
 * Combines the permanent fog grid (explored state) with transient vision
 * (computed each frame from player unit positions) to produce three visual
 * states:
 *
 *   Unexplored → dark silhouette (visibility = 0.12) — terrain shape visible
 *   Shroud     → explored but NOT in current vision (visibility = 0.35)
 *   Visible    → in active vision range of a player unit (visibility = 1.0)
 *
 * Combined with scene.fogMode=FOGMODE_EXP2 for atmospheric depth falloff.
 * All terrain meshes stay enabled — full labyrinth always visible as a map.
 */

import {
	type FogState,
	getFragment,
	type MapFragment,
	worldToFogIndex,
} from "../ecs/terrain";
import { Faction, Fragment, Position, Unit } from "../ecs/traits";
import { world } from "../ecs/world";
import type { ChunkManagerState } from "./ChunkManager";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Visibility for unexplored tiles — dark but terrain shape visible (like StarCraft fog). */
const UNEXPLORED_VISIBILITY = 0.12;

/** Visibility for explored-but-not-in-vision tiles (shroud). */
const SHROUD_VISIBILITY = 0.35;

/** Vision radius in world units — must match exploration.ts VISION_RADIUS. */
const VISION_RADIUS = 6;
const VISION_RADIUS_SQ = VISION_RADIUS * VISION_RADIUS;

// ─── Reusable buffers (avoid per-frame allocations) ─────────────────────────

/** Cached player unit positions — reused each frame. */
const playerPositions: Array<{ x: number; z: number }> = [];

// ─── Player fragment helpers ────────────────────────────────────────────────

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
 * Collect world positions of all player units.
 * Fills the reusable `playerPositions` array (cleared each call).
 */
function collectPlayerUnitPositions(): void {
	playerPositions.length = 0;

	for (const entity of world.query(Position, Unit, Faction)) {
		const faction = entity.get(Faction)!;
		if (faction.value !== "player") continue;

		const pos = entity.get(Position)!;
		playerPositions.push({ x: pos.x, z: pos.z });
	}
}

/**
 * Check if a world position is within vision range of any player unit.
 */
function isInPlayerVision(worldX: number, worldZ: number): boolean {
	for (const pos of playerPositions) {
		const dx = worldX - pos.x;
		const dz = worldZ - pos.z;
		if (dx * dx + dz * dz <= VISION_RADIUS_SQ) {
			return true;
		}
	}
	return false;
}

/**
 * Get the best permanent fog state across all player fragments for a world position.
 * Returns the maximum fog state (0=unexplored, 1=abstract, 2=detailed).
 */
function getBestFogState(
	fragments: MapFragment[],
	worldX: number,
	worldZ: number,
): FogState {
	const idx = worldToFogIndex(worldX, worldZ);
	if (idx < 0) return 0;

	let best: FogState = 0;

	for (const frag of fragments) {
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
 * Call once per frame after explorationSystem runs.
 * Combines permanent fog grid (what's been explored) with transient
 * vision (what player units can currently see) to set mesh visibility.
 *
 * @param chunkState - The ChunkManager state containing loaded chunk meshes
 */
export function updateFogVisibility(chunkState: ChunkManagerState): void {
	const playerFragments = getPlayerFragments();
	collectPlayerUnitPositions();

	// If no player fragments exist yet, hide everything
	const hasFragments = playerFragments.length > 0;

	for (const chunkMeshes of chunkState.loaded.values()) {
		for (const mesh of chunkMeshes.meshes) {
			// Extract world position from the mesh — this is the tile center
			const wx = mesh.position.x;
			const wz = mesh.position.z;

			if (!hasFragments) {
				mesh.setEnabled(true);
				mesh.visibility = UNEXPLORED_VISIBILITY;
				continue;
			}

			// Check permanent fog grid — has this tile ever been explored?
			const fogState = getBestFogState(playerFragments, wx, wz);

			// NEVER hide terrain — always show the full labyrinth map.
			// Unexplored = very dark, shroud = dim, vision = full brightness.
			mesh.setEnabled(true);

			if (fogState === 0) {
				// Unexplored — dark silhouette, terrain shape visible
				mesh.visibility = UNEXPLORED_VISIBILITY;
			} else if (isInPlayerVision(wx, wz)) {
				// Currently in vision — full brightness
				mesh.visibility = 1.0;
			} else {
				// Explored but not in current vision — shroud
				mesh.visibility = SHROUD_VISIBILITY;
			}
		}
	}
}
