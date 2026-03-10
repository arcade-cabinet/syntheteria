/**
 * Unit tests for the compression system (powder to cube).
 *
 * Tests cover:
 * - Returns false if insufficient powder
 * - Returns true and begins timer if enough powder
 * - Powder deducted from PowderStorage on start
 * - updateCompression advances timer by delta
 * - getCompressionProgress returns 0.0 to 1.0
 * - On completion returns MaterialCube with correct material type
 * - Cube has 0.5m dimensions and Grabbable trait
 * - Cannot start new compression while one is active
 * - cancelCompression stops without refund
 * - Module state resets between tests
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	type CompressionResult,
	DEFAULT_COMPRESSION_CONFIGS,
	_resetCompressionState,
	cancelCompression,
	getCompressionProgress,
	isCompressing,
	startCompression,
	updateCompression,
} from "../compression";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a powder storage map with a given material and amount. */
function makePowder(material: string, amount: number): Map<string, number> {
	return new Map([[material, amount]]);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetCompressionState();
});

// ---------------------------------------------------------------------------
// startCompression -- insufficient powder
// ---------------------------------------------------------------------------

describe("startCompression — insufficient powder", () => {
	it("returns false when powder storage is empty", () => {
		const storage = new Map<string, number>();
		const result = startCompression("iron", storage);

		expect(result).toBe(false);
	});

	it("returns false when powder amount is less than required", () => {
		const storage = makePowder("iron", 50);
		const result = startCompression("iron", storage);

		expect(result).toBe(false);
	});

	it("does not deduct powder on failure", () => {
		const storage = makePowder("iron", 50);
		startCompression("iron", storage);

		expect(storage.get("iron")).toBe(50);
	});

	it("returns false for unknown material with no config", () => {
		const storage = makePowder("unobtainium", 1000);
		const result = startCompression("unobtainium", storage);

		expect(result).toBe(false);
	});

	it("returns false when powder is exactly zero", () => {
		const storage = makePowder("iron", 0);
		const result = startCompression("iron", storage);

		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// startCompression -- sufficient powder
// ---------------------------------------------------------------------------

describe("startCompression — sufficient powder", () => {
	it("returns true when enough powder is available", () => {
		const storage = makePowder("iron", 100);
		const result = startCompression("iron", storage);

		expect(result).toBe(true);
	});

	it("returns true when powder exactly equals required amount", () => {
		const required = DEFAULT_COMPRESSION_CONFIGS.iron.powderRequired;
		const storage = makePowder("iron", required);
		const result = startCompression("iron", storage);

		expect(result).toBe(true);
	});

	it("returns true when powder exceeds required amount", () => {
		const storage = makePowder("iron", 500);
		const result = startCompression("iron", storage);

		expect(result).toBe(true);
	});

	it("sets isCompressing to true", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		expect(isCompressing()).toBe(true);
	});

	it("sets initial progress to 0", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		expect(getCompressionProgress()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Powder deduction
// ---------------------------------------------------------------------------

describe("powder deduction", () => {
	it("deducts exact powder amount on start", () => {
		const required = DEFAULT_COMPRESSION_CONFIGS.iron.powderRequired;
		const storage = makePowder("iron", 200);
		startCompression("iron", storage);

		expect(storage.get("iron")).toBe(200 - required);
	});

	it("leaves zero powder when starting with exact amount", () => {
		const required = DEFAULT_COMPRESSION_CONFIGS.iron.powderRequired;
		const storage = makePowder("iron", required);
		startCompression("iron", storage);

		expect(storage.get("iron")).toBe(0);
	});

	it("does not affect other material types in storage", () => {
		const storage = new Map<string, number>([
			["iron", 200],
			["copper", 150],
		]);
		startCompression("iron", storage);

		expect(storage.get("copper")).toBe(150);
	});
});

// ---------------------------------------------------------------------------
// updateCompression -- timer advancement
// ---------------------------------------------------------------------------

describe("updateCompression — timer advancement", () => {
	it("does not complete on first tick with small delta", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		const result = updateCompression(0.016); // ~60fps frame

		expect(result.completed).toBe(false);
		expect(result.cube).toBeUndefined();
	});

	it("advances progress proportionally to delta", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		updateCompression(compressionTime / 2);

		expect(getCompressionProgress()).toBeCloseTo(0.5);
	});

	it("accumulates progress across multiple ticks", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		updateCompression(compressionTime * 0.25);
		updateCompression(compressionTime * 0.25);

		expect(getCompressionProgress()).toBeCloseTo(0.5);
	});

	it("returns no result when no compression is active", () => {
		const result = updateCompression(1.0);

		expect(result.completed).toBe(false);
		expect(result.cube).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getCompressionProgress
// ---------------------------------------------------------------------------

describe("getCompressionProgress", () => {
	it("returns 0 when no compression is active", () => {
		expect(getCompressionProgress()).toBe(0);
	});

	it("returns 0 at start of compression", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		expect(getCompressionProgress()).toBe(0);
	});

	it("returns value between 0 and 1 during compression", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		updateCompression(compressionTime * 0.3);
		const progress = getCompressionProgress();

		expect(progress).toBeGreaterThan(0);
		expect(progress).toBeLessThan(1);
		expect(progress).toBeCloseTo(0.3);
	});

	it("does not exceed 1.0", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		// Advance past completion but check progress before completion fires
		updateCompression(compressionTime * 0.99);
		expect(getCompressionProgress()).toBeLessThanOrEqual(1.0);
	});
});

// ---------------------------------------------------------------------------
// Completion -- MaterialCubeData
// ---------------------------------------------------------------------------

describe("compression completion", () => {
	it("produces a MaterialCubeData on completion", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		const result = updateCompression(compressionTime);

		expect(result.completed).toBe(true);
		expect(result.cube).toBeDefined();
	});

	it("cube has correct material type", () => {
		const storage = makePowder("copper", 100);
		const compressionTime =
			DEFAULT_COMPRESSION_CONFIGS.copper.compressionTime;
		startCompression("copper", storage);

		const result = updateCompression(compressionTime);

		expect(result.cube!.material).toBe("copper");
	});

	it("cube has 0.5m dimensions", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		const result = updateCompression(compressionTime);

		expect(result.cube!.size).toBe(0.5);
	});

	it("cube has Grabbable trait", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		const result = updateCompression(compressionTime);

		expect(result.cube!.traits).toContain("Grabbable");
	});

	it("cube has a unique id", () => {
		const storage = makePowder("iron", 200);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;

		startCompression("iron", storage);
		const result1 = updateCompression(compressionTime);

		startCompression("iron", storage);
		const result2 = updateCompression(compressionTime);

		expect(result1.cube!.id).not.toBe(result2.cube!.id);
		expect(result1.cube!.id).toMatch(/^cube_/);
		expect(result2.cube!.id).toMatch(/^cube_/);
	});

	it("resets compression state after completion", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		updateCompression(compressionTime);

		expect(isCompressing()).toBe(false);
		expect(getCompressionProgress()).toBe(0);
	});

	it("completes when delta overshoots compressionTime", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);

		const result = updateCompression(compressionTime + 10);

		expect(result.completed).toBe(true);
		expect(result.cube).toBeDefined();
	});

	it("completes when accumulated time reaches compressionTime", () => {
		const storage = makePowder("stone", 100);
		const compressionTime =
			DEFAULT_COMPRESSION_CONFIGS.stone.compressionTime;
		startCompression("stone", storage);

		// Advance in small steps
		const steps = 20;
		const stepSize = compressionTime / steps;
		let lastResult: CompressionResult = { completed: false };
		for (let i = 0; i < steps; i++) {
			lastResult = updateCompression(stepSize);
		}

		expect(lastResult.completed).toBe(true);
		expect(lastResult.cube!.material).toBe("stone");
		expect(lastResult.cube!.size).toBe(0.5);
		expect(lastResult.cube!.traits).toContain("Grabbable");
	});
});

// ---------------------------------------------------------------------------
// Cannot start while compressing
// ---------------------------------------------------------------------------

describe("concurrent compression prevention", () => {
	it("returns false when trying to start a second compression", () => {
		const storage = new Map<string, number>([
			["iron", 200],
			["copper", 200],
		]);
		startCompression("iron", storage);

		const result = startCompression("copper", storage);

		expect(result).toBe(false);
	});

	it("does not deduct powder for rejected second compression", () => {
		const storage = new Map<string, number>([
			["iron", 200],
			["copper", 200],
		]);
		startCompression("iron", storage);
		startCompression("copper", storage);

		expect(storage.get("copper")).toBe(200);
	});

	it("allows starting new compression after previous completes", () => {
		const storage = new Map<string, number>([
			["iron", 200],
			["copper", 200],
		]);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);
		updateCompression(compressionTime);

		const result = startCompression("copper", storage);

		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// cancelCompression
// ---------------------------------------------------------------------------

describe("cancelCompression", () => {
	it("stops active compression", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		cancelCompression();

		expect(isCompressing()).toBe(false);
		expect(getCompressionProgress()).toBe(0);
	});

	it("does NOT refund powder", () => {
		const required = DEFAULT_COMPRESSION_CONFIGS.iron.powderRequired;
		const storage = makePowder("iron", 200);
		startCompression("iron", storage);

		cancelCompression();

		expect(storage.get("iron")).toBe(200 - required);
	});

	it("allows starting new compression after cancel", () => {
		const storage = makePowder("iron", 200);
		startCompression("iron", storage);
		cancelCompression();

		const result = startCompression("iron", storage);

		expect(result).toBe(true);
	});

	it("does nothing when no compression is active", () => {
		expect(() => cancelCompression()).not.toThrow();
		expect(isCompressing()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Custom config override
// ---------------------------------------------------------------------------

describe("custom config override", () => {
	it("uses custom powderRequired", () => {
		const storage = makePowder("iron", 50);
		const customConfig = { powderRequired: 50, compressionTime: 1.0 };

		const result = startCompression("iron", storage, customConfig);

		expect(result).toBe(true);
		expect(storage.get("iron")).toBe(0);
	});

	it("uses custom compressionTime", () => {
		const storage = makePowder("iron", 100);
		const customConfig = { powderRequired: 10, compressionTime: 0.5 };
		startCompression("iron", storage, customConfig);

		const result = updateCompression(0.5);

		expect(result.completed).toBe(true);
	});

	it("allows unknown materials with explicit config", () => {
		const storage = makePowder("unobtainium", 50);
		const customConfig = { powderRequired: 50, compressionTime: 2.0 };

		const result = startCompression("unobtainium", storage, customConfig);

		expect(result).toBe(true);
		expect(isCompressing()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isCompressing
// ---------------------------------------------------------------------------

describe("isCompressing", () => {
	it("returns false when idle", () => {
		expect(isCompressing()).toBe(false);
	});

	it("returns true during compression", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		expect(isCompressing()).toBe(true);
	});

	it("returns false after completion", () => {
		const storage = makePowder("iron", 100);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;
		startCompression("iron", storage);
		updateCompression(compressionTime);

		expect(isCompressing()).toBe(false);
	});

	it("returns false after cancel", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);
		cancelCompression();

		expect(isCompressing()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// _resetCompressionState -- test cleanup
// ---------------------------------------------------------------------------

describe("_resetCompressionState", () => {
	it("clears active compression", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		_resetCompressionState();

		expect(isCompressing()).toBe(false);
		expect(getCompressionProgress()).toBe(0);
	});

	it("resets cube ID counter", () => {
		const storage = makePowder("iron", 200);
		const compressionTime = DEFAULT_COMPRESSION_CONFIGS.iron.compressionTime;

		startCompression("iron", storage);
		updateCompression(compressionTime);

		_resetCompressionState();

		startCompression("iron", storage);
		const result = updateCompression(compressionTime);

		expect(result.cube!.id).toBe("cube_0");
	});

	it("allows starting fresh compression after reset", () => {
		const storage = makePowder("iron", 100);
		startCompression("iron", storage);

		_resetCompressionState();

		const freshStorage = makePowder("copper", 100);
		const result = startCompression("copper", freshStorage);

		expect(result).toBe(true);
		expect(isCompressing()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Different material types
// ---------------------------------------------------------------------------

describe("material type handling", () => {
	it("works with all default config materials", () => {
		for (const material of Object.keys(DEFAULT_COMPRESSION_CONFIGS)) {
			_resetCompressionState();

			const config = DEFAULT_COMPRESSION_CONFIGS[material];
			const storage = makePowder(material, config.powderRequired);

			const started = startCompression(material, storage);
			expect(started).toBe(true);

			const result = updateCompression(config.compressionTime);
			expect(result.completed).toBe(true);
			expect(result.cube!.material).toBe(material);
			expect(result.cube!.size).toBe(0.5);
			expect(result.cube!.traits).toContain("Grabbable");
		}
	});
});
