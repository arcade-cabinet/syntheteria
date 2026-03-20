/**
 * Capacitor SQLite adapter — unified DB for web (jeep-sqlite), Android, and iOS.
 *
 * Uses @capacitor-community/sqlite for all platforms.
 * Web uses jeep-sqlite web component (already in index.html).
 */

import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import type { SqliteAdapter } from "./adapter";

const DB_NAME = "syntheteria";

/**
 * Initialize Capacitor SQLite for the current platform.
 * Must be called ONCE at app startup before any DB operations.
 *
 * On web: initializes the jeep-sqlite web store
 * On native: no-op (SQLite is built in)
 */
export async function initCapacitorSqlite(): Promise<void> {
	const platform = Capacitor.getPlatform();
	if (platform === "web") {
		const jeepEl = document.querySelector("jeep-sqlite");
		if (jeepEl) {
			await customElements.whenDefined("jeep-sqlite");
			await CapacitorSQLite.initWebStore();
		}
	}
}

/**
 * Create a Capacitor SQLite adapter implementing SqliteAdapter.
 * Call initCapacitorSqlite() first on web platforms.
 */
export async function createCapacitorAdapter(): Promise<SqliteAdapter> {
	const sqlite = new SQLiteConnection(CapacitorSQLite);

	const db = await sqlite.createConnection(
		DB_NAME,
		false,
		"no-encryption",
		1,
		false,
	);
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
