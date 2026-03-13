import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { FakeDatabase } from "./fallbackDatabase";
import { setDatabaseResolver } from "./runtime";
import * as schema from "./schema";

const canUseSyncExpoSqlite =
	typeof SharedArrayBuffer !== "undefined" && typeof window !== "undefined";

export const expoDb = canUseSyncExpoSqlite
	? openDatabaseSync("syntheteria.db")
	: null;

export const db = expoDb ? drizzle(expoDb, { schema }) : null;
const fallbackDb = expoDb ? null : new FakeDatabase();

setDatabaseResolver(() => expoDb ?? fallbackDb ?? new FakeDatabase());
