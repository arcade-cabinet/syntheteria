/**
 * sql.js adapter for web — pure JS SQLite, no native dependencies.
 * Uses sql.js/dist/sql-asm.js (no WASM, works in all browsers).
 */
// Use the pure ASM.js build — no WASM fetch, works everywhere

import type { Database } from "sql.js";
import initSqlJs from "sql.js/dist/sql-asm.js";
import type { SqliteAdapter } from "./adapter";

let cachedDb: Database | null = null;

/**
 * Create an in-browser SQLite adapter backed by sql.js.
 * If a Uint8Array is provided, the DB is restored from that snapshot.
 */
export async function createWebAdapter(
	data?: ArrayLike<number> | null,
): Promise<SqliteAdapter> {
	// sql-asm.js is pure JavaScript — no WASM fetch, no locateFile needed
	const SQL = await initSqlJs();

	const db = data ? new SQL.Database(new Uint8Array(data)) : new SQL.Database();
	cachedDb = db;

	return {
		run(sql: string, params?: unknown[]) {
			db.run(sql, params as (string | number | null | Uint8Array)[]);
		},
		query<T>(sql: string, params?: unknown[]): T[] {
			const stmt = db.prepare(sql);
			if (params && params.length > 0) {
				stmt.bind(params as (string | number | null | Uint8Array)[]);
			}
			const results: T[] = [];
			while (stmt.step()) {
				const row = stmt.getAsObject() as T;
				results.push(row);
			}
			stmt.free();
			return results;
		},
		close() {
			db.close();
			cachedDb = null;
		},
	};
}

/** Export the raw DB bytes for persistence (IndexedDB, file download, etc.) */
export function exportDatabase(): Uint8Array | null {
	return cachedDb?.export() ?? null;
}
