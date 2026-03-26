/**
 * Capacitor SQLite adapter — unified DB for web (jeep-sqlite), Android, and iOS.
 *
 * Uses @capacitor-community/sqlite for all platforms.
 * Web uses jeep-sqlite web component (registered in main.tsx, element in index.html).
 *
 * This adapter is optional — the app falls back to sql.js (webAdapter) on
 * platforms where Capacitor is unavailable (plain browser, dev server).
 *
 * @see https://github.com/capacitor-community/sqlite/blob/master/docs/Web-Usage.md
 */

import type { SqliteAdapter } from "./adapter";

const DB_NAME = "syntheteria";

/**
 * Dynamically import @capacitor-community/sqlite.
 * Returns null if the plugin is unavailable (e.g., no native bridge).
 */
async function loadSqlitePlugin() {
	try {
		const { CapacitorSQLite, SQLiteConnection } = await import(
			"@capacitor-community/sqlite"
		);
		return { CapacitorSQLite, SQLiteConnection };
	} catch {
		return null;
	}
}

/**
 * Initialize Capacitor SQLite for the current platform.
 * Returns true if Capacitor SQLite is available, false otherwise.
 *
 * On web: jeep-sqlite web component must be registered in index.html.
 * On native: no-op (SQLite is built in).
 */
export async function initCapacitorSqlite(): Promise<boolean> {
	const plugin = await loadSqlitePlugin();
	if (!plugin) return false;

	try {
		const sqlite = new plugin.SQLiteConnection(plugin.CapacitorSQLite);
		await sqlite.checkConnectionsConsistency();
		return true;
	} catch {
		return false;
	}
}

/**
 * Create a Capacitor SQLite adapter implementing SqliteAdapter.
 * Call initCapacitorSqlite() first to verify availability.
 *
 * Throws if Capacitor SQLite is not available — always check
 * initCapacitorSqlite() before calling this.
 */
export async function createCapacitorAdapter(): Promise<SqliteAdapter> {
	const plugin = await loadSqlitePlugin();
	if (!plugin) {
		throw new Error(
			"@capacitor-community/sqlite not available on this platform",
		);
	}

	const sqlite = new plugin.SQLiteConnection(plugin.CapacitorSQLite);

	// Check if connection already exists (handles HMR / reconnect)
	const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
	const db = isConn
		? await sqlite.retrieveConnection(DB_NAME, false)
		: await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);

	await db.open();

	return {
		async run(sql: string, params?: unknown[]) {
			if (params && params.length > 0) {
				await db.run(sql, params as (string | number | boolean | null)[]);
			} else {
				await db.execute(sql);
			}
		},
		async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
			const result = await db.query(
				sql,
				(params as (string | number | boolean | null)[]) ?? [],
			);
			return (result.values ?? []) as T[];
		},
		async close() {
			await sqlite.closeConnection(DB_NAME, false);
		},
	};
}
