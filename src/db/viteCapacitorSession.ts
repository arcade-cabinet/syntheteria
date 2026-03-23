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
 * Fails gracefully when jeep-sqlite web component is absent (E2E headless
 * Chromium, dev without the web component script) — session uses in-memory
 * sql.js only.
 */
export async function initCapacitorDbForVite(): Promise<void> {
	try {
		await initCapacitorDb();
		await runBootstrapCapacitor();
	} catch (err) {
		console.warn(
			"[Capacitor SQLite] Persistence layer unavailable — session will use in-memory DB only.",
			err,
		);
	}
}

/**
 * Create the in-memory session DB (sql.js) with schema and seed.
 * Call after initCapacitorDbForVite(). The session uses sync APIs; persistence
 * to Capacitor happens on save (future: flush session to Capacitor).
 */
export async function createSessionDbSync(): Promise<SyncDatabase> {
	return createTestDb();
}
