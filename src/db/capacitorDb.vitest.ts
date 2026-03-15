import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	closeCapacitorDb,
	execute,
	initCapacitorDb,
	isCapacitorDbOpen,
	query,
	run,
} from "./capacitorDb";

describe("capacitorDb", () => {
	beforeEach(() => {
		vi.resetModules();
	});
	afterEach(async () => {
		if (isCapacitorDbOpen()) {
			await closeCapacitorDb();
		}
	});

	it("isCapacitorDbOpen is false before init", () => {
		expect(isCapacitorDbOpen()).toBe(false);
	});

	it("execute throws when not initialized", async () => {
		await expect(execute("SELECT 1")).rejects.toThrow(
			"Capacitor DB not initialized",
		);
	});

	it("query throws when not initialized", async () => {
		await expect(query("SELECT 1")).rejects.toThrow(
			"Capacitor DB not initialized",
		);
	});

	it("run throws when not initialized", async () => {
		await expect(run("INSERT INTO t (a) VALUES (?)", [1])).rejects.toThrow(
			"Capacitor DB not initialized",
		);
	});

	it("closeCapacitorDb is no-op when not open", async () => {
		await expect(closeCapacitorDb()).resolves.toBeUndefined();
	});
});
