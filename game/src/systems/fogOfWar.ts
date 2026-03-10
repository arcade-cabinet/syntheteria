/**
 * Faction-aware fog of war system.
 *
 * Maintains a 2D visibility grid per faction. Each cell tracks one of three
 * states: UNEXPLORED (0), EXPLORED (1), or VISIBLE (2).
 *
 * Key behaviours:
 *   - Units reveal cells within their vision range each tick.
 *   - Cells that were VISIBLE but leave all units' range decay to EXPLORED.
 *   - Territory areas grant permanent VISIBLE status.
 *   - A DataTexture is generated per faction for shader consumption.
 *
 * Grid resolution is configurable (default: 1 cell per 2 world units).
 */

import * as THREE from "three";
import type { FactionId } from "../../ecs/traits/core";
import { WORLD_HALF, WORLD_SIZE } from "../ecs/terrain";
import renderingConfig from "../../../config/rendering.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const UNEXPLORED = 0 as const;
export const EXPLORED = 1 as const;
export const VISIBLE = 2 as const;
export type VisibilityState = typeof UNEXPLORED | typeof EXPLORED | typeof VISIBLE;

// ---------------------------------------------------------------------------
// Config — read from rendering.json with sensible defaults
// ---------------------------------------------------------------------------

const fowConfig = (renderingConfig as Record<string, unknown>).fogOfWar as
	| {
			gridResolution?: number;
			defaultVisionRange?: number;
			cameraVisionBonus?: number;
			exploredDarkness?: number;
			edgeBlendSize?: number;
	  }
	| undefined;

/** World units per grid cell. */
export const GRID_RESOLUTION = fowConfig?.gridResolution ?? 2.0;

/** Default vision range in world units. */
export const DEFAULT_VISION_RANGE = fowConfig?.defaultVisionRange ?? 15;

/** Extra vision range for units with a functional camera component. */
export const CAMERA_VISION_BONUS = fowConfig?.cameraVisionBonus ?? 10;

/** Alpha value for explored-but-not-visible cells (shader uniform). */
export const EXPLORED_DARKNESS = fowConfig?.exploredDarkness ?? 0.6;

/** Blend radius in texels for edge smoothing (shader uniform). */
export const EDGE_BLEND_SIZE = fowConfig?.edgeBlendSize ?? 3.0;

// ---------------------------------------------------------------------------
// Grid dimensions
// ---------------------------------------------------------------------------

/** Number of cells along each axis. */
export const GRID_CELLS = Math.ceil(WORLD_SIZE / GRID_RESOLUTION);

// ---------------------------------------------------------------------------
// Per-faction state
// ---------------------------------------------------------------------------

interface FactionFogState {
	/** Current visibility per cell — written every tick. */
	visibility: Uint8Array;
	/** Cells that have ever been seen (so we can decay VISIBLE -> EXPLORED). */
	everSeen: Uint8Array;
	/** Territory mask — cells permanently VISIBLE for this faction. */
	territory: Uint8Array;
	/** Three.js DataTexture for shader consumption. */
	texture: THREE.DataTexture;
	/** Raw pixel data backing the texture. */
	textureData: Uint8Array;
	/** Whether the texture needs re-upload this frame. */
	dirty: boolean;
}

const factionStates = new Map<FactionId, FactionFogState>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function worldToGrid(wx: number, wz: number): { gx: number; gz: number } {
	const gx = Math.floor((wx + WORLD_HALF) / GRID_RESOLUTION);
	const gz = Math.floor((wz + WORLD_HALF) / GRID_RESOLUTION);
	return { gx, gz };
}

function gridToIndex(gx: number, gz: number): number {
	if (gx < 0 || gx >= GRID_CELLS || gz < 0 || gz >= GRID_CELLS) return -1;
	return gz * GRID_CELLS + gx;
}

function createFactionState(): FactionFogState {
	const totalCells = GRID_CELLS * GRID_CELLS;
	const textureData = new Uint8Array(totalCells); // single-channel (R)
	const texture = new THREE.DataTexture(
		textureData,
		GRID_CELLS,
		GRID_CELLS,
		THREE.RedFormat,
		THREE.UnsignedByteType,
	);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.needsUpdate = true;

	return {
		visibility: new Uint8Array(totalCells),
		everSeen: new Uint8Array(totalCells),
		territory: new Uint8Array(totalCells),
		texture,
		textureData,
		dirty: true,
	};
}

function ensureFactionState(factionId: FactionId): FactionFogState {
	let state = factionStates.get(factionId);
	if (!state) {
		state = createFactionState();
		factionStates.set(factionId, state);
	}
	return state;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Update fog of war for a faction based on current unit positions.
 *
 * Call once per tick. All cells previously VISIBLE (that are not territory)
 * decay to EXPLORED, then each unit re-reveals its vision circle.
 *
 * @param factionId  — which faction to update
 * @param unitPositions — world-space positions of all this faction's units
 * @param visionRange — base vision range in world units (per unit)
 * @param visionRanges — optional per-unit vision range overrides (same length as unitPositions)
 */
export function updateFogOfWar(
	factionId: FactionId,
	unitPositions: THREE.Vector3[],
	visionRange: number = DEFAULT_VISION_RANGE,
	visionRanges?: number[],
): void {
	const state = ensureFactionState(factionId);
	const totalCells = GRID_CELLS * GRID_CELLS;

	// Phase 1: Decay all VISIBLE cells to EXPLORED (unless territory).
	for (let i = 0; i < totalCells; i++) {
		if (state.visibility[i] === VISIBLE && state.territory[i] === 0) {
			state.visibility[i] = EXPLORED;
		}
	}

	// Phase 2: Reveal cells within each unit's vision range.
	for (let u = 0; u < unitPositions.length; u++) {
		const pos = unitPositions[u];
		const range = visionRanges ? visionRanges[u] : visionRange;
		const center = worldToGrid(pos.x, pos.z);
		const cellRadius = Math.ceil(range / GRID_RESOLUTION);

		for (let dz = -cellRadius; dz <= cellRadius; dz++) {
			for (let dx = -cellRadius; dx <= cellRadius; dx++) {
				const gx = center.gx + dx;
				const gz = center.gz + dz;
				const idx = gridToIndex(gx, gz);
				if (idx < 0) continue;

				// Distance check in world units
				const worldDx = dx * GRID_RESOLUTION;
				const worldDz = dz * GRID_RESOLUTION;
				if (worldDx * worldDx + worldDz * worldDz > range * range) continue;

				state.visibility[idx] = VISIBLE;
				state.everSeen[idx] = 1;
			}
		}
	}

	// Phase 3: Territory cells are always VISIBLE.
	for (let i = 0; i < totalCells; i++) {
		if (state.territory[i] === 1) {
			state.visibility[i] = VISIBLE;
		}
	}

	// Phase 4: Update texture data.
	for (let i = 0; i < totalCells; i++) {
		const v = state.visibility[i];
		// Map: UNEXPLORED -> 0, EXPLORED -> 128, VISIBLE -> 255
		if (v === VISIBLE) {
			state.textureData[i] = 255;
		} else if (v === EXPLORED) {
			state.textureData[i] = 128;
		} else {
			state.textureData[i] = 0;
		}
	}

	state.texture.needsUpdate = true;
	state.dirty = true;
}

/**
 * Query visibility at a world position for a specific faction.
 */
export function getVisibility(
	factionId: FactionId,
	position: { x: number; z: number },
): VisibilityState {
	const state = factionStates.get(factionId);
	if (!state) return UNEXPLORED;

	const { gx, gz } = worldToGrid(position.x, position.z);
	const idx = gridToIndex(gx, gz);
	if (idx < 0) return UNEXPLORED;

	return state.visibility[idx] as VisibilityState;
}

/**
 * Get the DataTexture for a faction's fog of war.
 * The texture is a single-channel (R) greyscale:
 *   0 = UNEXPLORED, 128 = EXPLORED, 255 = VISIBLE
 *
 * The returned texture is owned by this module — do NOT dispose it externally.
 */
export function getFogTexture(factionId: FactionId): THREE.DataTexture {
	const state = ensureFactionState(factionId);
	return state.texture;
}

/**
 * Mark a rectangular world-space region as permanent territory for a faction.
 * Territory cells are always VISIBLE regardless of unit proximity.
 */
export function setTerritory(
	factionId: FactionId,
	minX: number,
	minZ: number,
	maxX: number,
	maxZ: number,
): void {
	const state = ensureFactionState(factionId);
	const gMin = worldToGrid(minX, minZ);
	const gMax = worldToGrid(maxX, maxZ);

	for (let gz = Math.max(0, gMin.gz); gz <= Math.min(GRID_CELLS - 1, gMax.gz); gz++) {
		for (let gx = Math.max(0, gMin.gx); gx <= Math.min(GRID_CELLS - 1, gMax.gx); gx++) {
			const idx = gridToIndex(gx, gz);
			if (idx >= 0) {
				state.territory[idx] = 1;
			}
		}
	}
}

/**
 * Clear a faction's territory in a rectangular world-space region.
 */
export function clearTerritory(
	factionId: FactionId,
	minX: number,
	minZ: number,
	maxX: number,
	maxZ: number,
): void {
	const state = factionStates.get(factionId);
	if (!state) return;
	const gMin = worldToGrid(minX, minZ);
	const gMax = worldToGrid(maxX, maxZ);

	for (let gz = Math.max(0, gMin.gz); gz <= Math.min(GRID_CELLS - 1, gMax.gz); gz++) {
		for (let gx = Math.max(0, gMin.gx); gx <= Math.min(GRID_CELLS - 1, gMax.gx); gx++) {
			const idx = gridToIndex(gx, gz);
			if (idx >= 0) {
				state.territory[idx] = 0;
			}
		}
	}
}

/**
 * Reset all fog of war state for a faction (e.g., on game restart).
 */
export function resetFogOfWar(factionId: FactionId): void {
	const state = factionStates.get(factionId);
	if (!state) return;
	state.visibility.fill(0);
	state.everSeen.fill(0);
	state.territory.fill(0);
	state.textureData.fill(0);
	state.texture.needsUpdate = true;
	state.dirty = true;
}

/**
 * Dispose all faction fog textures. Call on unmount / game shutdown.
 */
export function disposeAllFogTextures(): void {
	for (const state of factionStates.values()) {
		state.texture.dispose();
	}
	factionStates.clear();
}

/**
 * Dispose fog texture for a single faction.
 */
export function disposeFogTexture(factionId: FactionId): void {
	const state = factionStates.get(factionId);
	if (state) {
		state.texture.dispose();
		factionStates.delete(factionId);
	}
}

/**
 * Check if a faction's fog data has changed since last check.
 * Resets the dirty flag after reading.
 */
export function isFogDirty(factionId: FactionId): boolean {
	const state = factionStates.get(factionId);
	if (!state) return false;
	const wasDirty = state.dirty;
	state.dirty = false;
	return wasDirty;
}
