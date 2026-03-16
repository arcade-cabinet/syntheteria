/**
 * Playwright component testing entry. Apply theme, global styles, or providers
 * needed for mounted components. Components run in a real browser; tests run in Node.
 *
 * DB setup: previews that call generateWorldData() need getDatabaseSync() to work.
 * We initialize an in-memory sql.js database once and set it as the resolver.
 * sql-wasm.wasm is served from public/ by the Vite CT server.
 */
import { beforeMount } from "@playwright/experimental-ct-react/hooks";
import { setDatabaseResolver } from "../src/db/runtime";
import { createTestDb } from "../src/db/testDb";

let dbInitialized = false;

beforeMount(async () => {
	if (!dbInitialized) {
		const db = await createTestDb();
		setDatabaseResolver(() => db);
		dbInitialized = true;
	}
});
