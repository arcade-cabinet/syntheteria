/**
 * Tests for the native SQLite database module (db.ts).
 *
 * These tests run in the Jest (web/Node) environment where expo-sqlite is not
 * available. They verify:
 *   - initNativeDb() returns null on web (Platform.OS === 'web')
 *   - isNativeDbAvailable() returns false when not initialized or on web
 *   - nativePutSave / nativeGetSave / nativeDeleteSave are safe no-ops on web
 *   - _resetNativeDb() clears state for test isolation
 */

jest.mock("react-native", () => ({
	Platform: { OS: "web" },
}));

import {
	_resetNativeDb,
	getNativeDb,
	initNativeDb,
	isNativeDbAvailable,
	nativeDeleteSave,
	nativeGetAllSaves,
	nativeGetSave,
	nativePutSave,
} from "../db";

describe("db — web environment (no native SQLite)", () => {
	beforeEach(() => {
		_resetNativeDb();
	});

	it("initNativeDb returns null on web", () => {
		const db = initNativeDb();
		expect(db).toBeNull();
	});

	it("getNativeDb returns null before init and on web", () => {
		expect(getNativeDb()).toBeNull();
		initNativeDb();
		expect(getNativeDb()).toBeNull();
	});

	it("isNativeDbAvailable returns false on web", () => {
		initNativeDb();
		expect(isNativeDbAvailable()).toBe(false);
	});

	it("initNativeDb is idempotent — calling twice is safe", () => {
		const db1 = initNativeDb();
		const db2 = initNativeDb();
		expect(db1).toBeNull();
		expect(db2).toBeNull();
	});

	it("nativePutSave is a no-op on web", () => {
		initNativeDb();
		// Should not throw
		expect(() => nativePutSave("slot_1", { version: 1 })).not.toThrow();
	});

	it("nativeGetSave returns undefined on web", () => {
		initNativeDb();
		const result = nativeGetSave("slot_1");
		expect(result).toBeUndefined();
	});

	it("nativeGetAllSaves returns empty array on web", () => {
		initNativeDb();
		const results = nativeGetAllSaves();
		expect(results).toEqual([]);
	});

	it("nativeDeleteSave is a no-op on web", () => {
		initNativeDb();
		expect(() => nativeDeleteSave("slot_1")).not.toThrow();
	});

	it("_resetNativeDb clears initialized state", () => {
		initNativeDb();
		_resetNativeDb();
		// After reset, calling init again should work (returns null since we're on web)
		const db = initNativeDb();
		expect(db).toBeNull();
	});
});

describe("db — schema module exports", () => {
	it("exports all required functions", () => {
		// Verify the public API is stable
		expect(typeof initNativeDb).toBe("function");
		expect(typeof getNativeDb).toBe("function");
		expect(typeof isNativeDbAvailable).toBe("function");
		expect(typeof nativePutSave).toBe("function");
		expect(typeof nativeGetSave).toBe("function");
		expect(typeof nativeGetAllSaves).toBe("function");
		expect(typeof nativeDeleteSave).toBe("function");
	});
});
