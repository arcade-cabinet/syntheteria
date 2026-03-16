/**
 * Test database factory. Creates a real SQLite db (sql.js) with schema + seed.
 * Use in Jest beforeAll: const db = await createTestDb(); setDatabaseResolver(() => db);
 * Use in Playwright CT: called from playwright/index.tsx beforeMount hook.
 *
 * Environment detection uses `typeof document` (unavailable in Node.js, even
 * with mocked `window`) rather than `typeof window` to avoid test file pollution.
 */

import initSqlJs from "sql.js";
import { initializeDatabaseSync } from "./bootstrap";
import { createSyncDatabase, type SqlJsDatabase } from "./sqljsAdapter";
import type { SyncDatabase } from "./types";

let sqlJsModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getSqlJs() {
	if (!sqlJsModule) {
		// In a real browser (CT), load WASM from the public/ directory.
		// In Node.js (Jest), sql.js finds its own WASM from node_modules.
		const isBrowser = typeof document !== "undefined";
		sqlJsModule = await initSqlJs(
			isBrowser ? { locateFile: (file: string) => `/${file}` } : undefined,
		);
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
