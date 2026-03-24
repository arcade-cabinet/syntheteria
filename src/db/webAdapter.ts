/**
 * sql.js adapter for web — pure JS SQLite, no native dependencies.
 * Uses sql.js/dist/sql-asm.js (no WASM, works in all browsers).
 */
import initSqlJs, { type Database } from "sql.js";
import type { SqliteAdapter } from "./adapter";

let cachedDb: Database | null = null;

/**
 * Create an in-browser SQLite adapter backed by sql.js.
 * If a Uint8Array is provided, the DB is restored from that snapshot.
 */
export async function createWebAdapter(
	data?: ArrayLike<number> | null,
): Promise<SqliteAdapter> {
	const SQL = await initSqlJs({
		// Use the ASM.js build (no WASM fetch needed)
		locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
	});

	cachedDb = data ? new SQL.Database(new Uint8Array(data)) : new SQL.Database();

	const db = cachedDb;

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
