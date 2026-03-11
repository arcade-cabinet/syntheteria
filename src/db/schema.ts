import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Separate long-term persistence from short-term Koota ECS ticks.
// These tables represent the "save file" of the player.

export const saveGames = sqliteTable("save_games", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	lastPlayedAt: integer("last_played_at", { mode: "timestamp" }).notNull(),
	playtimeSeconds: integer("playtime_seconds").notNull().default(0),
});

export const unlockedTechniques = sqliteTable("unlocked_techniques", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id").references(() => saveGames.id, {
		onDelete: "cascade",
	}),
	techniqueId: text("technique_id").notNull(),
	unlockedAt: integer("unlocked_at", { mode: "timestamp" }).notNull(),
});

export const mapDiscovery = sqliteTable("map_discovery", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveGameId: integer("save_game_id").references(() => saveGames.id, {
		onDelete: "cascade",
	}),
	chunkX: integer("chunk_x").notNull(),
	chunkY: integer("chunk_y").notNull(),
	discoveredState: text("discovered_state").notNull(), // 'unexplored', 'abstract', 'detailed'
});
