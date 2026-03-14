/**
 * Tests for SQLite delta persistence — write, read, apply, round-trip.
 *
 * Uses a mock SyncDatabase to verify SQL correctness without real SQLite.
 * Chunk generation requires a seeded DB (model_definitions, game_config).
 */

import { createTestDb } from "../../../db/testDb";
import { TEST_SEED } from "../../../../tests/testConstants";
import { writeTileDelta, loadChunkDeltas, loadChunk, getWorldSeed } from "../persist";
import { generateChunk } from "../chunkGen";
import { CHUNK_SIZE } from "../types";
import type { TileDelta } from "../types";
import type { SyncDatabase, SyncRunResult } from "../../../db/types";

let seededDb: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	seededDb = await createTestDb();
});

/** Wraps seededDb and overrides getAllSync for map_deltas to inject custom rows */
function dbWithDeltaOverride(
	deltaRows: Array<{ tile_x: number; tile_y: number; change_type: string; change_json: string }>,
): SyncDatabase {
	return {
		...seededDb,
		getAllSync<T>(source: string, ...params: unknown[]): T[] {
			if (source.includes("FROM map_deltas")) {
				return deltaRows as T[];
			}
			return seededDb.getAllSync<T>(source, ...params);
		},
	};
}

// ─── Mock Database ──────────────────────────────────────────────────────────

interface StoredRow {
	tile_x: number;
	tile_y: number;
	change_type: string;
	change_json: string;
}

function mockDb(
	getAllResult: unknown[] = [],
	getFirstResult: unknown = null,
): SyncDatabase {
	return {
		execSync: jest.fn(),
		runSync: jest.fn(() => ({ lastInsertRowId: 1 })),
		getAllSync: jest.fn(() => getAllResult) as SyncDatabase["getAllSync"],
		getFirstSync: jest.fn(() => getFirstResult) as SyncDatabase["getFirstSync"],
	};
}

function createMockDb() {
	const deltaRows: StoredRow[] = [];
	const tileRows: Map<string, unknown> = new Map();
	let insertId = 0;

	const db: SyncDatabase = {
		execSync: jest.fn(),
		runSync: jest.fn((_sql: string, ...params: unknown[]) => {
			// Detect delta insert vs tile upsert by param count
			if (params.length === 6) {
				// map_deltas INSERT
				deltaRows.push({
					tile_x: params[2] as number,
					tile_y: params[3] as number,
					change_type: params[4] as string,
					change_json: params[5] as string,
				});
			} else if (params.length === 8) {
				// game_map_tiles UPSERT
				const key = `${params[1]},${params[2]}`;
				tileRows.set(key, params);
			}
			return { lastInsertRowId: ++insertId } as SyncRunResult;
		}),
		getAllSync: jest.fn(() => deltaRows) as SyncDatabase["getAllSync"],
		getFirstSync: jest.fn(() => ({ world_seed: TEST_SEED })) as SyncDatabase["getFirstSync"],
	};

	return { db, deltaRows, tileRows };
}

// ─── writeTileDelta ─────────────────────────────────────────────────────────

describe("writeTileDelta", () => {
	it("calls runSync twice (delta insert + tile upsert)", () => {
		const { db } = createMockDb();
		const delta: TileDelta = {
			tileX: 5,
			tileZ: 3,
			level: 0,
			changeType: "harvested",
			newModelId: null,
			newPassable: true,
			controllerFaction: null,
			resourceRemaining: null,
			turnNumber: 10,
		};

		writeTileDelta(db, 1, delta);
		expect(db.runSync).toHaveBeenCalledTimes(2);
	});

	it("stores correct values in delta insert", () => {
		const { db, deltaRows } = createMockDb();
		const delta: TileDelta = {
			tileX: 12,
			tileZ: 8,
			level: 1,
			changeType: "built",
			newModelId: "wall_001",
			newPassable: false,
			controllerFaction: "reclaimers",
			resourceRemaining: null,
			turnNumber: 5,
		};

		writeTileDelta(db, 2, delta);

		expect(deltaRows.length).toBe(1);
		expect(deltaRows[0]!.tile_x).toBe(12);
		expect(deltaRows[0]!.tile_y).toBe(8);
		expect(deltaRows[0]!.change_type).toBe("built");

		const parsed = JSON.parse(deltaRows[0]!.change_json);
		expect(parsed.level).toBe(1);
		expect(parsed.newModelId).toBe("wall_001");
		expect(parsed.newPassable).toBe(false);
		expect(parsed.controllerFaction).toBe("reclaimers");
	});

	it("serializes all delta change types", () => {
		const { db, deltaRows } = createMockDb();
		const changeTypes: TileDelta["changeType"][] = [
			"harvested",
			"built",
			"destroyed",
			"faction_change",
			"resource_depleted",
		];

		for (const ct of changeTypes) {
			writeTileDelta(db, 1, {
				tileX: 0,
				tileZ: 0,
				level: 0,
				changeType: ct,
				newModelId: null,
				newPassable: null,
				controllerFaction: null,
				resourceRemaining: null,
				turnNumber: 1,
			});
		}

		expect(deltaRows.length).toBe(changeTypes.length);
		const storedTypes = deltaRows.map((r) => r.change_type);
		expect(storedTypes).toEqual(changeTypes);
	});
});

// ─── loadChunkDeltas ────────────────────────────────────────────────────────

describe("loadChunkDeltas", () => {
	it("returns empty map when no deltas exist", () => {
		const { db } = createMockDb();
		const result = loadChunkDeltas(db, 1, 0, 0);
		expect(result.size).toBe(0);
	});

	it("groups multiple deltas for the same tile", () => {
		const rows: StoredRow[] = [
			{
				tile_x: 3,
				tile_y: 4,
				change_type: "built",
				change_json: JSON.stringify({ level: 0, newModelId: "wall_001" }),
			},
			{
				tile_x: 3,
				tile_y: 4,
				change_type: "destroyed",
				change_json: JSON.stringify({ level: 0, newModelId: null }),
			},
		];

		const db = mockDb(rows);

		const result = loadChunkDeltas(db, 1, 0, 0);
		expect(result.get("3,4")).toHaveLength(2);
		expect(result.get("3,4")![0]!.changeType).toBe("built");
		expect(result.get("3,4")![1]!.changeType).toBe("destroyed");
	});

	it("parses change_json correctly", () => {
		const rows: StoredRow[] = [
			{
				tile_x: 1,
				tile_y: 2,
				change_type: "built",
				change_json: JSON.stringify({
					level: 1,
					newModelId: "bridge_platform_001",
					newPassable: true,
					controllerFaction: "volt_collective",
					resourceRemaining: 50,
				}),
			},
		];

		const db = mockDb(rows);

		const result = loadChunkDeltas(db, 1, 0, 0);
		const delta = result.get("1,2")![0]!;
		expect(delta.tileX).toBe(1);
		expect(delta.tileZ).toBe(2);
		expect(delta.level).toBe(1);
		expect(delta.newModelId).toBe("bridge_platform_001");
		expect(delta.newPassable).toBe(true);
		expect(delta.controllerFaction).toBe("volt_collective");
		expect(delta.resourceRemaining).toBe(50);
	});
});

// ─── loadChunk (regenerate + apply deltas) ──────────────────────────────────

describe("loadChunk", () => {
	it("with seeded DB produces same result as generateChunk when no deltas", () => {
		const fromGen = generateChunk(TEST_SEED, 0, 0, seededDb);
		const fromLoad = loadChunk(seededDb, TEST_SEED, 0, 0, 0);

		expect(fromLoad.cx).toBe(fromGen.cx);
		expect(fromLoad.cz).toBe(fromGen.cz);
		expect(fromLoad.tiles.length).toBe(fromGen.tiles.length);

		for (let i = 0; i < fromGen.tiles.length; i++) {
			expect(fromLoad.tiles[i]).toEqual(fromGen.tiles[i]);
		}
	});

	it("applies 'harvested' delta — clears model and makes passable", () => {
		const baseline = generateChunk(TEST_SEED, 0, 0, seededDb);
		const structureTile = baseline.tiles.find(
			(t) => t.modelLayer === "structure" || t.modelLayer === "resource",
		);

		if (!structureTile) {
			return;
		}

		const harvestDelta = {
			tile_x: structureTile.x,
			tile_y: structureTile.z,
			change_type: "harvested",
			change_json: JSON.stringify({
				level: 0,
				newModelId: null,
				newPassable: true,
			}),
		};

		const db = dbWithDeltaOverride([harvestDelta]);
		const chunk = loadChunk(db, TEST_SEED, 1, 0, 0);
		const idx = baseline.tiles.indexOf(structureTile);
		const modified = chunk.tiles[idx]!;

		expect(modified.modelId).toBeNull();
		expect(modified.modelLayer).toBeNull();
		expect(modified.passable).toBe(true);
	});

	it("applies 'built' delta — places model and sets passability", () => {
		const baseline = generateChunk(TEST_SEED, 0, 0, seededDb);
		const emptyTile = baseline.tiles.find(
			(t) => t.passable && t.modelId === null,
		);

		if (!emptyTile) return;

		const buildDelta = {
			tile_x: emptyTile.x,
			tile_y: emptyTile.z,
			change_type: "built",
			change_json: JSON.stringify({
				level: 0,
				newModelId: "wall_heavy_001",
				newPassable: false,
			}),
		};

		const db = dbWithDeltaOverride([buildDelta]);
		const chunk = loadChunk(db, TEST_SEED, 1, 0, 0);
		const idx = baseline.tiles.indexOf(emptyTile);
		const modified = chunk.tiles[idx]!;

		expect(modified.modelId).toBe("wall_heavy_001");
		expect(modified.modelLayer).toBe("structure");
		expect(modified.passable).toBe(false);
	});
});

// ─── Delta round-trip (write → load → apply) ─────────────────────────────────

describe("delta round-trip", () => {
	it("writeTileDelta then loadChunk produces modified chunk", () => {
		const baseline = generateChunk(TEST_SEED, 0, 0, seededDb);
		const structureTile = baseline.tiles.find(
			(t) => t.modelLayer === "structure" || t.modelLayer === "resource",
		);
		if (!structureTile) return;

		const delta: TileDelta = {
			tileX: structureTile.x,
			tileZ: structureTile.z,
			level: 0,
			changeType: "harvested",
			newModelId: null,
			newPassable: true,
			controllerFaction: null,
			resourceRemaining: null,
			turnNumber: 5,
		};

		const { db: mockDb, deltaRows } = createMockDb();
		writeTileDelta(mockDb, 1, delta);

		expect(deltaRows.length).toBe(1);
		expect(deltaRows[0]!.tile_x).toBe(structureTile.x);
		expect(deltaRows[0]!.tile_y).toBe(structureTile.z);

		const deltaOverride = deltaRows.map((r) => ({
			tile_x: r.tile_x,
			tile_y: r.tile_y,
			change_type: r.change_type,
			change_json: r.change_json,
		}));
		const db = dbWithDeltaOverride(deltaOverride);
		const chunk = loadChunk(db, TEST_SEED, 1, 0, 0);
		const idx = baseline.tiles.findIndex(
			(t) => t.x === structureTile.x && t.z === structureTile.z,
		);
		const modified = chunk.tiles[idx]!;

		expect(modified.modelId).toBeNull();
		expect(modified.modelLayer).toBeNull();
		expect(modified.passable).toBe(true);
	});

	it("multiple deltas round-trip: harvested then built", () => {
		const baseline = generateChunk(TEST_SEED, 1, 1, seededDb);
		const emptyTile = baseline.tiles.find(
			(t) => t.passable && t.modelId === null,
		);
		if (!emptyTile) return;

		const deltaRows: Array<{ tile_x: number; tile_y: number; change_type: string; change_json: string }> = [];
		const captureDb: SyncDatabase = {
			execSync: seededDb.execSync.bind(seededDb),
			getAllSync: seededDb.getAllSync.bind(seededDb),
			getFirstSync: seededDb.getFirstSync.bind(seededDb),
			runSync: (source: string, ...params: unknown[]) => {
				if (params.length === 6 && source.includes("map_deltas")) {
					deltaRows.push({
						tile_x: params[2] as number,
						tile_y: params[3] as number,
						change_type: params[4] as string,
						change_json: params[5] as string,
					});
				}
				return seededDb.runSync(source, ...params);
			},
		};

		writeTileDelta(captureDb, 1, {
			tileX: emptyTile.x,
			tileZ: emptyTile.z,
			level: 0,
			changeType: "built",
			newModelId: "wall_001",
			newPassable: false,
			controllerFaction: "player",
			resourceRemaining: null,
			turnNumber: 1,
		});

		writeTileDelta(captureDb, 1, {
			tileX: emptyTile.x,
			tileZ: emptyTile.z,
			level: 0,
			changeType: "harvested",
			newModelId: null,
			newPassable: true,
			controllerFaction: null,
			resourceRemaining: null,
			turnNumber: 2,
		});

		expect(deltaRows.length).toBe(2);

		const db = dbWithDeltaOverride(deltaRows);
		const chunk = loadChunk(db, TEST_SEED, 1, 1, 1);
		const idx = baseline.tiles.findIndex(
			(t) => t.x === emptyTile.x && t.z === emptyTile.z,
		);
		const modified = chunk.tiles[idx]!;

		expect(modified.modelId).toBeNull();
		expect(modified.passable).toBe(true);
	});
});

// ─── getWorldSeed ───────────────────────────────────────────────────────────

describe("getWorldSeed", () => {
	it("returns seed from DB", () => {
		const db = mockDb([], { world_seed: 12345 });
		expect(getWorldSeed(db, 1)).toBe(12345);
	});

	it("returns 42 as fallback when no row exists", () => {
		const db = mockDb([], null);
		expect(getWorldSeed(db, 999)).toBe(42);
	});
});
