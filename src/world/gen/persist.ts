/**
 * SQLite persistence for the world map.
 *
 * The baseline map is NEVER stored — it regenerates from seed.
 * Only player deltas (harvested, built, destroyed, faction changes)
 * are persisted to game_map_tiles and map_deltas.
 *
 * Load = regenerate chunk from seed + apply deltas.
 */

import type { SyncDatabase } from "../../db/types";
import { generateChunk } from "./chunkGen";
import type { MapChunk, MapTile, TileDelta } from "./types";
import { CHUNK_SIZE, chunkTileIndex } from "./types";

// ─── Write Deltas ────────────────────────────────────────────────────────────

/**
 * Persist a single tile delta to SQLite.
 * Called when the player harvests, builds, or destroys something.
 */
export function writeTileDelta(
	db: SyncDatabase,
	saveGameId: number,
	delta: TileDelta,
): void {
	db.runSync(
		`INSERT INTO map_deltas (save_game_id, turn_number, tile_x, tile_y, change_type, change_json)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		saveGameId,
		delta.turnNumber,
		delta.tileX,
		delta.tileZ,
		delta.changeType,
		JSON.stringify({
			level: delta.level,
			newModelId: delta.newModelId,
			newPassable: delta.newPassable,
			controllerFaction: delta.controllerFaction,
			resourceRemaining: delta.resourceRemaining,
		}),
	);

	// Also update the live tile state (upsert)
	db.runSync(
		`INSERT INTO game_map_tiles (save_game_id, tile_x, tile_y, level, zone_type, passable, placed_model_id, placed_model_rotation, controller_faction, resource_remaining, is_ramp, is_bridge, elevation_y, clearance_above)
		 VALUES (?, ?, ?, ?, 'modified', ?, ?, 0, ?, ?, 0, 0, 0, 100)
		 ON CONFLICT(save_game_id, tile_x, tile_y, level) DO UPDATE SET
		   passable = excluded.passable,
		   placed_model_id = excluded.placed_model_id,
		   controller_faction = excluded.controller_faction,
		   resource_remaining = excluded.resource_remaining`,
		saveGameId,
		delta.tileX,
		delta.tileZ,
		delta.level,
		delta.newPassable ? 1 : 0,
		delta.newModelId,
		delta.controllerFaction,
		delta.resourceRemaining,
	);
}

// ─── Read Deltas ─────────────────────────────────────────────────────────────

interface StoredDelta {
	tile_x: number;
	tile_y: number;
	change_type: string;
	change_json: string;
}

/**
 * Load all deltas for a chunk from SQLite.
 */
export function loadChunkDeltas(
	db: SyncDatabase,
	saveGameId: number,
	cx: number,
	cz: number,
): Map<string, TileDelta[]> {
	const originX = cx * CHUNK_SIZE;
	const originZ = cz * CHUNK_SIZE;
	const maxX = originX + CHUNK_SIZE;
	const maxZ = originZ + CHUNK_SIZE;

	const rows = db.getAllSync<StoredDelta>(
		`SELECT tile_x, tile_y, change_type, change_json FROM map_deltas
		 WHERE save_game_id = ? AND tile_x >= ? AND tile_x < ? AND tile_y >= ? AND tile_y < ?
		 ORDER BY id ASC`,
		saveGameId,
		originX,
		maxX,
		originZ,
		maxZ,
	);

	const deltaMap = new Map<string, TileDelta[]>();

	for (const row of rows) {
		const key = `${row.tile_x},${row.tile_y}`;
		const parsed = JSON.parse(row.change_json) as {
			level?: number;
			newModelId?: string | null;
			newPassable?: boolean | null;
			controllerFaction?: string | null;
			resourceRemaining?: number | null;
		};

		const delta: TileDelta = {
			tileX: row.tile_x,
			tileZ: row.tile_y,
			level: parsed.level ?? 0,
			changeType: row.change_type as TileDelta["changeType"],
			newModelId: parsed.newModelId ?? null,
			newPassable: parsed.newPassable ?? null,
			controllerFaction: parsed.controllerFaction ?? null,
			resourceRemaining: parsed.resourceRemaining ?? null,
			turnNumber: 0, // Not needed for replay
		};

		const existing = deltaMap.get(key);
		if (existing) {
			existing.push(delta);
		} else {
			deltaMap.set(key, [delta]);
		}
	}

	return deltaMap;
}

// ─── Load Chunk (regenerate + apply deltas) ──────────────────────────────────

/**
 * Load a chunk: regenerate baseline from seed, then apply player deltas.
 * This is the ONE way to get chunk data.
 * Requires db for model definitions and floor materials; if null, generation is skipped (caller must handle).
 */
export function loadChunk(
	db: SyncDatabase | null,
	worldSeed: number,
	saveGameId: number,
	cx: number,
	cz: number,
): MapChunk {
	// Step 1: Generate baseline chunk from seed (requires db for model/floor config)
	if (!db) {
		throw new Error("loadChunk requires a database for chunk generation");
	}
	const chunk = generateChunk(worldSeed, cx, cz, db);

	// Step 2: Load and apply deltas
	const deltas = loadChunkDeltas(db, saveGameId, cx, cz);
	applyDeltas(chunk, deltas);

	return chunk;
}

/**
 * Apply deltas to a generated chunk, mutating tiles in place.
 * Deltas are applied in order (oldest first) to reconstruct current state.
 */
function applyDeltas(
	chunk: MapChunk,
	deltaMap: Map<string, TileDelta[]>,
): void {
	for (const [key, deltas] of deltaMap) {
		const [xStr, zStr] = key.split(",");
		const worldX = Number(xStr);
		const worldZ = Number(zStr);
		const localX = worldX - chunk.cx * CHUNK_SIZE;
		const localZ = worldZ - chunk.cz * CHUNK_SIZE;

		if (localX < 0 || localX >= CHUNK_SIZE || localZ < 0 || localZ >= CHUNK_SIZE) {
			continue; // Delta outside this chunk
		}

		const idx = chunkTileIndex(localX, localZ);
		const tile = chunk.tiles[idx]!;

		// Apply each delta in sequence
		for (const delta of deltas) {
			switch (delta.changeType) {
				case "harvested":
				case "destroyed":
					tile.modelId = null;
					tile.modelLayer = null;
					tile.passable = true;
					tile.isBridge = false;
					tile.isRamp = false;
					break;
				case "built":
					tile.modelId = delta.newModelId;
					tile.modelLayer = "structure";
					tile.passable = delta.newPassable ?? false;
					break;
				case "faction_change":
					// Tile stays the same, just ownership changes
					break;
				case "resource_depleted":
					tile.modelId = delta.newModelId; // May become null if fully consumed
					if (delta.newModelId === null) {
						tile.modelLayer = null;
						tile.passable = true;
					}
					break;
			}

			// Always apply these if present
			if (delta.controllerFaction !== undefined) {
				// Controller faction would be stored on the tile if we add that field
			}
			if (delta.resourceRemaining !== null) {
				// Resource remaining would be tracked
			}
		}
	}
}

// ─── Utility: Get world seed from save game ──────────────────────────────────

export function getWorldSeed(db: SyncDatabase, saveGameId: number): number {
	const row = db.getFirstSync<{ world_seed: number }>(
		"SELECT world_seed FROM save_games WHERE id = ?",
		saveGameId,
	);
	return row?.world_seed ?? 42;
}
