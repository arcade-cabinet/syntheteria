import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { setDatabaseResolver } from "./runtime";
import * as schema from "./schema";

export const expoDb = openDatabaseSync("syntheteria.db");
export const db = drizzle(expoDb, { schema });

setDatabaseResolver(() => expoDb);
