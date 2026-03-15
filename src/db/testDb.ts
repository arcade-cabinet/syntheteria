/**
 * Test database factory. Creates a real SQLite db (sql.js) with schema + seed.
 * Use in Jest beforeAll: const db = await createTestDb(); setDatabaseResolver(() => db);
 */

import initSqlJs from "sql.js";
import { initializeDatabaseSync } from "./bootstrap";
import { createSyncDatabase, type SqlJsDatabase } from "./sqljsAdapter";
import type { SyncDatabase } from "./types";

let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;

/** In browser, sql.js loads WASM from same origin; point to public copy so Vite/dev serves it. */
function getLocateFile(): ((file: string) => string) | undefined {
	if (typeof window === "undefined") return undefined;
	return (file: string) => `/${file}`;
}

async function getSqlJs() {
	if (!sqlJsModule) {
		const locateFile = getLocateFile();
		sqlJsModule = await initSqlJs(locateFile ? { locateFile } : undefined);
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
