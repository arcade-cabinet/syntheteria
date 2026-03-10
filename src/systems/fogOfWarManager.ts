/**
 * Fog of War Manager — high-level fog state management.
 *
 * Manages per-faction visibility grids independent of Three.js rendering.
 * Each cell in the grid tracks one of three states:
 *   - hidden  (0): never seen
 *   - explored (1): previously seen but no current vision
 *   - visible  (2): currently within a unit's vision range
 *
 * Key behaviors:
 *   - Fog only upgrades: hidden → explored → visible
 *   - When units move away, cells transition visible → explored (never back to hidden)
 *   - Each faction maintains its own independent fog map
 *   - clearVisibility() downgrades all "visible" to "explored" before re-scanning
 *
 * This module complements the lower-level fogOfWar.ts (which handles
 * Three.js DataTexture generation) and the exploration.ts system (which
 * reveals fog around individual entities).
 *
 * Vision range defaults come from config/rendering.json → fogOfWar.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FogState = "hidden" | "explored" | "visible";

/** Numeric fog levels used internally — matches the state enum order. */
export const FOG_HIDDEN = 0 as const;
export const FOG_EXPLORED = 1 as const;
export const FOG_VISIBLE = 2 as const;

export type FogLevel = typeof FOG_HIDDEN | typeof FOG_EXPLORED | typeof FOG_VISIBLE;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const fowConfig = config.rendering.fogOfWar;
const DEFAULT_VISION_RANGE: number = fowConfig.defaultVisionRange;

// ---------------------------------------------------------------------------
// Per-faction state
// ---------------------------------------------------------------------------

interface FactionFogMap {
	width: number;
	height: number;
	/** Flat array of fog levels, row-major: index = z * width + x */
	cells: Uint8Array;
}

const factionMaps = new Map<string, FactionFogMap>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMap(faction: string): FactionFogMap | undefined {
	return factionMaps.get(faction);
}

function cellIndex(map: FactionFogMap, x: number, z: number): number {
	if (x < 0 || x >= map.width || z < 0 || z >= map.height) return -1;
	return z * map.width + x;
}

function fogLevelToState(level: FogLevel): FogState {
	if (level === FOG_VISIBLE) return "visible";
	if (level === FOG_EXPLORED) return "explored";
	return "hidden";
}

function stateToFogLevel(state: FogState): FogLevel {
	if (state === "visible") return FOG_VISIBLE;
	if (state === "explored") return FOG_EXPLORED;
	return FOG_HIDDEN;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize (or reinitialize) a fog map for a faction.
 * All cells start as hidden (0).
 */
export function initFogMap(
	faction: string,
	worldWidth: number,
	worldHeight: number,
): void {
	const cells = new Uint8Array(worldWidth * worldHeight);
	factionMaps.set(faction, { width: worldWidth, height: worldHeight, cells });
}

/**
 * Reveal a single cell to the given fog level.
 * Fog only upgrades — setting a cell to "explored" when it is already "visible"
 * is a no-op.
 *
 * @param fogLevel 1 = explored, 2 = visible
 */
export function revealCell(
	faction: string,
	x: number,
	z: number,
	fogLevel: FogLevel,
): void {
	const map = getMap(faction);
	if (!map) return;

	const idx = cellIndex(map, x, z);
	if (idx < 0) return;

	// Only upgrade, never downgrade
	if (fogLevel > map.cells[idx]) {
		map.cells[idx] = fogLevel;
	}
}

/**
 * Query the fog state of a cell.
 * Returns "hidden" for unknown factions or out-of-bounds coordinates.
 */
export function getCellState(faction: string, x: number, z: number): FogState {
	const map = getMap(faction);
	if (!map) return "hidden";

	const idx = cellIndex(map, x, z);
	if (idx < 0) return "hidden";

	return fogLevelToState(map.cells[idx] as FogLevel);
}

/**
 * Return the percentage of the map that has been explored (state >= explored).
 * Returns 0.0 for unknown factions or empty maps.
 */
export function getExploredPercentage(faction: string): number {
	const map = getMap(faction);
	if (!map) return 0;

	const total = map.cells.length;
	if (total === 0) return 0;

	let explored = 0;
	for (let i = 0; i < total; i++) {
		if (map.cells[i] >= FOG_EXPLORED) {
			explored++;
		}
	}

	return explored / total;
}

/**
 * Return all cells currently in the "visible" state.
 */
export function getVisibleCells(faction: string): { x: number; z: number }[] {
	const map = getMap(faction);
	if (!map) return [];

	const result: { x: number; z: number }[] = [];
	for (let i = 0; i < map.cells.length; i++) {
		if (map.cells[i] === FOG_VISIBLE) {
			const x = i % map.width;
			const z = Math.floor(i / map.width);
			result.push({ x, z });
		}
	}
	return result;
}

/**
 * Downgrade all "visible" cells to "explored" for a faction.
 * Called before re-scanning unit vision so that cells no longer in range
 * transition to explored rather than staying visible.
 */
export function clearVisibility(faction: string): void {
	const map = getMap(faction);
	if (!map) return;

	for (let i = 0; i < map.cells.length; i++) {
		if (map.cells[i] === FOG_VISIBLE) {
			map.cells[i] = FOG_EXPLORED;
		}
	}
}

/**
 * Full fog-of-war tick.
 *
 * For each faction:
 *   1. clearVisibility — all visible → explored
 *   2. For each unit, reveal cells within vision range as visible
 *
 * @param factionUnits Map of faction ID → array of unit descriptors
 */
export function fogOfWarManagerSystem(
	factionUnits: Map<string, { x: number; z: number; visionRange: number }[]>,
): void {
	for (const [faction, units] of factionUnits.entries()) {
		const map = getMap(faction);
		if (!map) continue;

		// Phase 1: Decay visible → explored
		clearVisibility(faction);

		// Phase 2: Reveal cells in each unit's vision circle
		for (const unit of units) {
			const range = unit.visionRange;
			const r = Math.ceil(range);
			const rSq = range * range;

			for (let dz = -r; dz <= r; dz++) {
				for (let dx = -r; dx <= r; dx++) {
					if (dx * dx + dz * dz > rSq) continue;

					const cx = Math.floor(unit.x) + dx;
					const cz = Math.floor(unit.z) + dz;

					revealCell(faction, cx, cz, FOG_VISIBLE);
				}
			}
		}
	}
}

/**
 * Reset all fog of war state. Removes all faction maps.
 * Used for tests and new-game initialization.
 */
export function resetFogOfWar(): void {
	factionMaps.clear();
}
