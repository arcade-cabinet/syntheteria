import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { initializeDatabaseSync } from "./bootstrap";
import { setDatabaseResolver } from "./runtime";
import * as schema from "./schema";

const canUseSyncExpoSqlite =
	typeof SharedArrayBuffer !== "undefined" && typeof window !== "undefined";

function tryOpenDatabase() {
	if (!canUseSyncExpoSqlite) return null;
	try {
		return openDatabaseSync("syntheteria.db");
	} catch {
		// expo-sqlite requires COOP/COEP headers for SharedArrayBuffer.
		// In Node (Jest), tests set the resolver via createTestDb().
		// In browser (Playwright CT), use FakeDatabase with game_config + model_definitions.
		return null;
	}
}

export const expoDb = tryOpenDatabase();

export const db = expoDb ? drizzle(expoDb, { schema }) : null;

if (expoDb) {
	setDatabaseResolver(() => expoDb);
	initializeDatabaseSync(expoDb);
} else if (typeof window !== "undefined") {
	throw new Error(
		"SQLite requires COOP/COEP headers (SharedArrayBuffer). " +
			"Ensure Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy are set.",
	);
}
// In Node (Jest): tests call setDatabaseResolver(createTestDb()) in beforeAll
