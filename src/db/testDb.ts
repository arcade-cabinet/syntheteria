/**
 * Test database factory. Creates a real SQLite db (sql.js) with schema + seed.
 * Use in Jest beforeAll: const db = await createTestDb(); setDatabaseResolver(() => db);
 */

import initSqlJs from "sql.js";
import { createSyncDatabase, type SqlJsDatabase } from "./sqljsAdapter";
import { initializeDatabaseSync } from "./bootstrap";
import type { SyncDatabase } from "./types";

let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getSqlJs() {
	if (!sqlJsModule) {
		sqlJsModule = await initSqlJs();
	}
	return sqlJsModule;
}

/**
 * Creates an in-memory SQLite database with schema and seed.
 * Call in beforeAll; use setDatabaseResolver(() => db) to wire it.
 */
export async function createTestDb(): Promise<SyncDatabase> {
	const SQL = await getSqlJs();
	const db = new SQL.Database();
	const syncDb = createSyncDatabase(db as unknown as SqlJsDatabase);
	initializeDatabaseSync(syncDb);
	return syncDb;
}
