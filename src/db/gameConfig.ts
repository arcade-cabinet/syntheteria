/**
 * Read game config from SQLite (chunks, floor materials).
 * All config is seeded at bootstrap; this module provides typed accessors.
 */

import type { SyncDatabase } from "./types";

export interface ChunksConfig {
	chunkSize: number;
	cellWorldSize: number;
	loadRadius: number;
	unloadRadius: number;
}

export type FloorMaterial =
	| "metal_panel"
	| "concrete_slab"
	| "industrial_grating"
	| "rusty_plating"
	| "corroded_steel";

/**
 * Get parsed JSON from game_config by key.
 */
export function getGameConfigFromDb<T>(
	db: SyncDatabase,
	key: string,
): T | null {
	const row = db.getFirstSync<{ value_json: string }>(
		"SELECT value_json FROM game_config WHERE key = ?",
		key,
	);
	if (!row) return null;
	try {
		return JSON.parse(row.value_json) as T;
	} catch {
		return null;
	}
}

/**
 * Get chunks config (loadRadius, unloadRadius, etc.).
 */
export function getChunksConfig(db: SyncDatabase): ChunksConfig | null {
	return getGameConfigFromDb<ChunksConfig>(db, "chunks");
}

/**
 * Get floor materials array for chunk gen.
 */
export function getFloorMaterials(db: SyncDatabase): FloorMaterial[] {
	const arr = getGameConfigFromDb<FloorMaterial[]>(db, "floor_materials");
	return Array.isArray(arr) ? arr : [];
}

export interface UndermaterialDef {
	id: string;
	texturePath: string;
}

/**
 * Get undermaterials for pit interiors (harvested floor tiles).
 * Seeded empty; ingest from 2DPhotorealistic to populate.
 */
export function getUndermaterials(db: SyncDatabase): UndermaterialDef[] {
	const arr = getGameConfigFromDb<UndermaterialDef[]>(db, "undermaterials");
	return Array.isArray(arr) ? arr : [];
}
