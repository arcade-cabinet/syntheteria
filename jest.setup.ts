/**
 * Jest setup: provide a real SQLite test db before each test file.
 * Tests that need a custom db (e.g. FakeDatabase for execCalls) can override
 * via setDatabaseResolver / setWorldPersistenceDatabaseResolver in their beforeAll.
 */
import { createTestDb } from "./src/db/testDb";
import { setDatabaseResolver } from "./src/db/runtime";
import { setWorldPersistenceDatabaseResolver } from "./src/db/worldPersistence";

beforeAll(async () => {
	const db = await createTestDb();
	setDatabaseResolver(() => db);
	setWorldPersistenceDatabaseResolver(() => db);
});
