/**
 * Jest setup: provide a real SQLite test db before each test file.
 * Tests that need a custom db (e.g. FakeDatabase for execCalls) can override
 * via setDatabaseResolver / setWorldPersistenceDatabaseResolver in their beforeAll.
 *
 * UI tests (src/ui/__tests__) use jest-expo project and jest.setup.ui.ts instead.
 */

import { setDatabaseResolver } from "./src/db/runtime";
import { createTestDb } from "./src/db/testDb";
import { setWorldPersistenceDatabaseResolver } from "./src/db/worldPersistence";

beforeAll(async () => {
	const db = await createTestDb();
	setDatabaseResolver(() => db);
	setWorldPersistenceDatabaseResolver(() => db);
});
