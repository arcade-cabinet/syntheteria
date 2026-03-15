/**
 * Run schema DDL in Capacitor SQLite. Call after initCapacitorDb() (Vite web + native).
 * Session uses in-memory sql.js; this ensures Capacitor has the schema for persistence.
 */

import { BOOTSTRAP_DDL } from "./bootstrap";
import { execute } from "./capacitorDb";

/** Run the main DDL in Capacitor SQLite. No seed (seed runs on sql.js session). */
export async function runBootstrapCapacitor(): Promise<void> {
	// Capacitor execute() runs statements separated by semicolon; skip empty and PRAGMA
	const statements = BOOTSTRAP_DDL.split(";")
		.map((s) => s.trim())
		.filter((s) => s.length > 0 && !s.toUpperCase().startsWith("PRAGMA"));
	const batch = statements.join(";\n");
	if (batch.length > 0) {
		await execute(batch, true);
	}
}
