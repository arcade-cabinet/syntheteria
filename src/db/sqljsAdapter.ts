/**
 * SyncDatabase adapter for sql.js (Node.js, no native deps).
 * Used by build scripts and Jest to work with SQLite in memory, then export to file.
 */

import type { SyncDatabase, SyncRunResult } from "./types";

export interface SqlJsDatabase {
	run(
		sql: string,
		params?: unknown[] | Record<string, unknown>,
	): void | unknown;
	exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
	prepare(sql: string): {
		bind(params?: unknown[] | Record<string, unknown>): void;
		step(): boolean;
		getAsObject(): Record<string, unknown>;
		free(): void;
	};
}

export function createSyncDatabase(db: SqlJsDatabase): SyncDatabase {
	return {
		execSync(source: string): void {
			db.run(source);
		},
		getAllSync<T>(source: string, ...params: unknown[]): T[] {
			const stmt = db.prepare(source);
			try {
				if (params.length > 0) {
					stmt.bind(params);
				}
				const rows: T[] = [];
				while (stmt.step()) {
					rows.push(stmt.getAsObject() as T);
				}
				return rows;
			} finally {
				stmt.free();
			}
		},
		getFirstSync<T>(source: string, ...params: unknown[]): T | null {
			const stmt = db.prepare(source);
			try {
				if (params.length > 0) {
					stmt.bind(params);
				}
				return (stmt.step() ? stmt.getAsObject() : null) as T | null;
			} finally {
				stmt.free();
			}
		},
		runSync(source: string, ...params: unknown[]): SyncRunResult {
			db.run(source, params.length > 0 ? params : undefined);
			const results = db.exec("SELECT last_insert_rowid() as id");
			const id =
				results.length && results[0].values.length
					? (results[0].values[0][0] as number)
					: 0;
			return { lastInsertRowId: id };
		},
	};
}
