/**
 * Vite app: use Capacitor SQLite for persistence (web IndexedDB, native SQLite).
 * Session uses in-memory sql.js (sync API); save/load will sync to/from Capacitor.
 */

import { runBootstrapCapacitor } from "./capacitorBootstrap";
import { initCapacitorDb } from "./capacitorDb";
import { createTestDb } from "./testDb";
import type { SyncDatabase } from "./types";

/**
 * Initialize Capacitor SQLite for the Vite app (web and native).
 * Call once before creating the session DB.
 */
export async function initCapacitorDbForVite(): Promise<void> {
	await initCapacitorDb();
	await runBootstrapCapacitor();
}

/**
 * Create the in-memory session DB (sql.js) with schema and seed.
 * Call after initCapacitorDbForVite(). The session uses sync APIs; persistence
 * to Capacitor happens on save (future: flush session to Capacitor).
 */
export async function createSessionDbSync(): Promise<SyncDatabase> {
	return createTestDb();
}
