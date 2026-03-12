import { seedToPhrase } from "../ecs/seed";
import type {
	ClimateProfile,
	Difficulty,
	SectorScale,
	StormProfile,
} from "../world/config";
import { initializeDatabaseSync } from "./bootstrap";
import { FakeDatabase } from "./fallbackDatabase";
import { getDatabaseSync } from "./runtime";
import type { SyncDatabase } from "./types";

export type SaveGameRecord = {
	id: number;
	name: string;
	world_seed: number;
	sector_scale: SectorScale;
	difficulty: Difficulty;
	climate_profile: ClimateProfile;
	storm_profile: StormProfile;
	created_at: number;
	last_played_at: number;
	playtime_seconds: number;
};

function persistFallbackDatabase(database: SyncDatabase) {
	if (database instanceof FakeDatabase) {
		database.persistToStorage();
	}
}

function selectLatestSaveGame(database: SyncDatabase) {
	return database.getFirstSync<SaveGameRecord>(
		`
			SELECT
				id,
				name,
				world_seed,
				sector_scale,
				difficulty,
				climate_profile,
				storm_profile,
				created_at,
				last_played_at,
				playtime_seconds
			FROM save_games
			ORDER BY last_played_at DESC, id DESC
			LIMIT 1
		`,
	);
}

function selectSaveGameById(database: SyncDatabase, saveGameId: number) {
	return database.getFirstSync<SaveGameRecord>(
		`
			SELECT
				id,
				name,
				world_seed,
				sector_scale,
				difficulty,
				climate_profile,
				storm_profile,
				created_at,
				last_played_at,
				playtime_seconds
			FROM save_games
			WHERE id = ?
		`,
		saveGameId,
	);
}

export function getSaveGameCountSync(
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const result = database.getFirstSync<{ count: number }>(
		"SELECT COUNT(*) as count FROM save_games",
	);
	return result?.count ?? 0;
}

export function getLatestSaveGameSync(
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	return selectLatestSaveGame(database);
}

export function createSaveGameSync(
	{
		worldSeed,
		sectorScale = "standard",
		difficulty = "standard",
		climateProfile = "temperate",
		stormProfile = "volatile",
	}: {
		worldSeed: number;
		sectorScale?: SectorScale;
		difficulty?: Difficulty;
		climateProfile?: ClimateProfile;
		stormProfile?: StormProfile;
	},
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	const now = Date.now();
	const name = `Network ${seedToPhrase(worldSeed)}`;

	const result = database.runSync(
		`
			INSERT INTO save_games (
				name,
				world_seed,
				sector_scale,
				difficulty,
				climate_profile,
				storm_profile,
				created_at,
				last_played_at,
				playtime_seconds
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
		`,
		name,
		worldSeed,
		sectorScale,
		difficulty,
		climateProfile,
		stormProfile,
		now,
		now,
	);

	persistFallbackDatabase(database);
	return selectSaveGameById(database, result.lastInsertRowId);
}

export function touchSaveGameSync(
	saveGameId: number,
	database: SyncDatabase = getDatabaseSync(),
) {
	initializeDatabaseSync(database);
	database.runSync(
		"UPDATE save_games SET last_played_at = ? WHERE id = ?",
		Date.now(),
		saveGameId,
	);
	persistFallbackDatabase(database);
	return selectSaveGameById(database, saveGameId);
}
