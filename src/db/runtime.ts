import type { SyncDatabase } from "./types";

let databaseResolver: (() => SyncDatabase) | null = null;

export function setDatabaseResolver(resolver: (() => SyncDatabase) | null) {
	databaseResolver = resolver;
}

export function getDatabaseSync(): SyncDatabase {
	if (!databaseResolver) {
		throw new Error(
			"SQLite runtime is unavailable. Configure a database resolver before calling persistence APIs.",
		);
	}

	return databaseResolver();
}
