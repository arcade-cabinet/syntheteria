/** Minimal SQLite driver interface. Implementations: sql.js (web), Capacitor (native). */
export interface SqliteAdapter {
	run(sql: string, params?: unknown[]): void | Promise<void>;
	query<T = Record<string, unknown>>(
		sql: string,
		params?: unknown[],
	): T[] | Promise<T[]>;
	close(): void | Promise<void>;
}
