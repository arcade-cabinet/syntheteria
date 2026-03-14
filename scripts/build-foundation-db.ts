#!/usr/bin/env npx tsx
/**
 * Build-time script: generate foundation.db with schema + all JSON config.
 * Run: pnpm db:build:foundation
 *
 * Output: assets/db/foundation.db
 * Contains: model_definitions, tile_definitions, robot_definitions, game_config.
 * Does NOT contain save games — those are created at runtime when user hits New Game.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { createSyncDatabase, type SqlJsDatabase } from "../src/db/sqljsAdapter";
import { initializeDatabaseSync } from "../src/db/bootstrap";

const __dirname =
	typeof import.meta?.url !== "undefined"
		? dirname(fileURLToPath(import.meta.url))
		: process.cwd();
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "assets", "db");
const OUT_PATH = join(OUT_DIR, "foundation.db");

async function main() {
	if (!existsSync(OUT_DIR)) {
		mkdirSync(OUT_DIR, { recursive: true });
	}

	const SQL = await initSqlJs();
	const db = new SQL.Database();
	const syncDb = createSyncDatabase(db as unknown as SqlJsDatabase);
	initializeDatabaseSync(syncDb);

	const buffer = db.export();
	writeFileSync(OUT_PATH, Buffer.from(buffer));
	db.close();
	console.log(`Wrote ${OUT_PATH}`);
}

main();
