/**
 * Drizzle ORM schema for game saves.
 *
 * Designed for expo-sqlite but works as a standalone schema definition.
 * Positions are stored as integers scaled by 100 for sub-unit precision
 * without floating-point quirks in SQLite.
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const saves = sqliteTable("saves", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	seed: integer("seed").notNull(),
	createdAt: integer("created_at").notNull(), // unix timestamp ms
	playTimeSeconds: integer("play_time_seconds").notNull().default(0),
});

export const savedEntities = sqliteTable("saved_entities", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveId: integer("save_id")
		.notNull()
		.references(() => saves.id),
	entityId: text("entity_id").notNull(),
	entityType: text("entity_type").notNull(), // "unit" | "building" | "belt" | …
	faction: text("faction").notNull(),
	posX: integer("pos_x").notNull(), // worldPosition.x * 100
	posY: integer("pos_y").notNull(), // worldPosition.y * 100
	posZ: integer("pos_z").notNull(), // worldPosition.z * 100
	componentData: text("component_data").notNull(), // JSON stringified
});

export const savedResources = sqliteTable("saved_resources", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveId: integer("save_id")
		.notNull()
		.references(() => saves.id),
	resourceType: text("resource_type").notNull(),
	amount: integer("amount").notNull(),
});

export const savedGameState = sqliteTable("saved_game_state", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	saveId: integer("save_id")
		.notNull()
		.references(() => saves.id),
	gameSpeed: integer("game_speed").notNull(), // actual speed * 100
	tickCount: integer("tick_count").notNull(),
	stormIntensity: integer("storm_intensity").notNull(), // intensity * 100
});

// ---------------------------------------------------------------------------
// Inferred row types
// ---------------------------------------------------------------------------

export type Save = typeof saves.$inferSelect;
export type NewSave = typeof saves.$inferInsert;

export type SavedEntity = typeof savedEntities.$inferSelect;
export type NewSavedEntity = typeof savedEntities.$inferInsert;

export type SavedResource = typeof savedResources.$inferSelect;
export type NewSavedResource = typeof savedResources.$inferInsert;

export type SavedGameState = typeof savedGameState.$inferSelect;
export type NewSavedGameState = typeof savedGameState.$inferInsert;
