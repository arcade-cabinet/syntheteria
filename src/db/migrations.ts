import type { SqliteAdapter } from "./adapter";
import { ALL_CREATE_STATEMENTS, SCHEMA_VERSION } from "./schema";

export async function runMigrations(db: SqliteAdapter): Promise<void> {
	for (const sql of ALL_CREATE_STATEMENTS) {
		await db.run(sql);
	}
	await db.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [
		"schema_version",
		String(SCHEMA_VERSION),
	]);
}
