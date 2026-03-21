/** Minimal SQLite driver interface. Both Capacitor SQLite and sql.js implement this. */
export interface SqliteAdapter {
	run(sql: string, params?: unknown[]): void | Promise<void>;
	query<T = Record<string, unknown>>(
		sql: string,
		params?: unknown[],
	): T[] | Promise<T[]>;
	close(): void | Promise<void>;
}

/**
 * Create an in-memory sql.js adapter for TESTS ONLY.
 * NOT used in production — production uses Capacitor SQLite.
 * Uses the asm.js build to avoid wasm loading issues in Node/test environments.
 */
export async function createTestAdapter(): Promise<SqliteAdapter> {
	const initSqlJs = (await import("sql.js/dist/sql-asm.js")).default;
	const SQL = await initSqlJs();
	const db = new SQL.Database();

	return {
		run(sql: string, params?: unknown[]) {
			db.run(sql, params as Parameters<typeof db.run>[1]);
		},
		query<T>(sql: string, params?: unknown[]): T[] {
			const stmt = db.prepare(sql);
			if (params) stmt.bind(params as Parameters<typeof stmt.bind>[0]);
			const rows: T[] = [];
			while (stmt.step()) {
				rows.push(stmt.getAsObject() as T);
			}
			stmt.free();
			return rows;
		},
		close() {
			db.close();
		},
	};
}
