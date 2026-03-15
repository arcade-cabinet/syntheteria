/**
 * Capacitor Community SQLite adapter for persistence on web (IndexedDB) and native.
 * Vite app (main.tsx) inits this first, then uses in-memory sql.js for the session.
 * Use initCapacitorDb() then execute/query/run for async operations.
 */

import {
	CapacitorSQLite,
	type capSQLiteChanges,
	type capSQLiteValues,
} from "@capacitor-community/sqlite";

const DB_NAME = "syntheteria";

let connectionOpen = false;

/**
 * Initialize the web store (required on web before createConnection).
 * No-op on native.
 */
export async function initWebStore(): Promise<void> {
	try {
		await CapacitorSQLite.initWebStore();
	} catch {
		// Not on web or plugin not available
	}
}

/**
 * Create connection and open the database. Run once at app startup when using Capacitor SQLite.
 */
export async function initCapacitorDb(): Promise<void> {
	await initWebStore();
	await CapacitorSQLite.createConnection({
		database: DB_NAME,
		version: 1,
		encrypted: false,
	});
	await CapacitorSQLite.open({ database: DB_NAME });
	connectionOpen = true;
}

/**
 * Execute DDL/DML (CREATE, INSERT without bind, etc.). Statements separated by semicolon.
 */
export async function execute(
	statements: string,
	transaction = true,
): Promise<capSQLiteChanges> {
	if (!connectionOpen) throw new Error("Capacitor DB not initialized");
	return CapacitorSQLite.execute({
		database: DB_NAME,
		statements,
		transaction,
	});
}

/**
 * Run a single statement with optional bind values (INSERT/UPDATE/DELETE).
 */
export async function run(
	statement: string,
	values: unknown[] = [],
	transaction = true,
): Promise<capSQLiteChanges> {
	if (!connectionOpen) throw new Error("Capacitor DB not initialized");
	return CapacitorSQLite.run({
		database: DB_NAME,
		statement,
		values,
		transaction,
	});
}

/**
 * Query (SELECT). Returns capSQLiteValues with .values as array of rows.
 */
export async function query(
	statement: string,
	values: unknown[] = [],
): Promise<capSQLiteValues> {
	if (!connectionOpen) throw new Error("Capacitor DB not initialized");
	return CapacitorSQLite.query({
		database: DB_NAME,
		statement,
		values,
	});
}

/**
 * Close the database (e.g. on app teardown).
 */
export async function closeCapacitorDb(): Promise<void> {
	if (!connectionOpen) return;
	await CapacitorSQLite.close({ database: DB_NAME });
	await CapacitorSQLite.closeConnection({ database: DB_NAME });
	connectionOpen = false;
}

export function isCapacitorDbOpen(): boolean {
	return connectionOpen;
}
