/**
 * Persistence round-trip tests.
 *
 * Uses a minimal in-memory SqliteAdapter (Map-backed) so tests run
 * without sql.js or any native bindings.
 */
import { createWorld } from "koota";
import { afterEach, describe, expect, it } from "vitest";

import {
	BuildingTrait,
	EntityId,
	Faction,
	Fragment,
	LightningRod,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import type { SqliteAdapter } from "../adapter";
import { GameRepo } from "../gameRepo";
import { runMigrations } from "../migrations";
import {
	applyBuildings,
	applyUnits,
	serializeBuildings,
	serializeUnits,
} from "../serialize";

// ─── Minimal in-memory adapter (no native deps) ────────────────────────────

interface Row {
	[key: string]: string | number | null;
}

function createMemoryAdapter(): SqliteAdapter {
	const tables = new Map<string, Row[]>();
	const meta = new Map<string, string>();

	return {
		run(sql: string, params?: unknown[]) {
			const trimmed = sql.trim().toUpperCase();

			// CREATE TABLE — just register the table name
			if (trimmed.startsWith("CREATE TABLE")) {
				const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
				if (match) {
					const name = match[1]!;
					if (!tables.has(name)) tables.set(name, []);
				}
				return;
			}

			// INSERT OR REPLACE INTO meta
			if (trimmed.startsWith("INSERT OR REPLACE INTO META")) {
				if (params && params.length >= 2) {
					meta.set(String(params[0]), String(params[1]));
				}
				return;
			}

			// DELETE FROM <table> WHERE game_id = ? or WHERE id = ?
			if (trimmed.startsWith("DELETE FROM")) {
				const match = sql.match(/DELETE FROM (\w+) WHERE (\w+) = \?/i);
				if (match) {
					const tableName = match[1]!;
					const colName = match[2]!;
					const val = params?.[0];
					const rows = tables.get(tableName);
					if (rows) {
						tables.set(
							tableName,
							rows.filter((r) => r[colName] !== val),
						);
					}
				}
				return;
			}

			// INSERT INTO <table> (...) VALUES (...)
			if (trimmed.startsWith("INSERT")) {
				const tableMatch = sql.match(
					/INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+(\w+)\s*\(/i,
				);
				if (!tableMatch) return;
				const tableName = tableMatch[1]!;

				// Extract column names
				const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
				if (!colMatch || !params) return;
				const cols = colMatch[1]!.split(",").map((c) => c.trim());

				const row: Row = {};
				for (let i = 0; i < cols.length; i++) {
					const val = params[i];
					row[cols[i]!] =
						val === undefined || val === null
							? null
							: typeof val === "boolean"
								? val
									? 1
									: 0
								: (val as string | number);
				}

				if (!tables.has(tableName)) tables.set(tableName, []);

				// Handle OR REPLACE — remove existing row with same PK
				if (sql.toUpperCase().includes("OR REPLACE")) {
					// For simplicity, just push (our tests don't rely on PK uniqueness)
				}

				tables.get(tableName)!.push(row);
				return;
			}

			// UPDATE — not needed for tests currently
		},

		query<T>(sql: string, params?: unknown[]): T[] {
			const match = sql.match(/SELECT\s+.+\s+FROM\s+(\w+)/i);
			if (!match) return [];
			const tableName = match[1]!;
			let rows = tables.get(tableName) ?? [];

			// Simple WHERE clause handling
			const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
			if (whereMatch && params && params.length > 0) {
				const col = whereMatch[1]!;
				const val = params[0];
				rows = rows.filter((r) => r[col] === val);
			}

			// ORDER BY — ignore for tests
			return rows as T[];
		},

		close() {
			tables.clear();
		},
	};
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("persistence round-trip", () => {
	let db: SqliteAdapter;
	let repo: GameRepo;

	afterEach(() => {
		db.close();
	});

	async function setup() {
		db = createMemoryAdapter();
		await runMigrations(db);
		repo = new GameRepo(db);
	}

	it("creates and retrieves a game record", async () => {
		await setup();
		const id = await repo.createGame("test-seed", "normal", 42, 1.0);
		expect(id).toBeTruthy();

		const game = await repo.getGame(id);
		expect(game).not.toBeNull();
		expect(game!.seed).toBe("test-seed");
		expect(game!.difficulty).toBe("normal");
		expect(game!.elapsedTicks).toBe(42);
	});

	it("lists saved games", async () => {
		await setup();
		await repo.createGame("seed-a", "easy", 10, 1.0);
		await repo.createGame("seed-b", "hard", 20, 2.0);

		const saves = await repo.listGames();
		expect(saves.length).toBe(2);
	});

	it("round-trips units through serialize -> save -> load -> apply", async () => {
		await setup();
		const gameId = await repo.createGame("test", "normal", 0, 1.0);

		// Create a world with a unit
		const world = createWorld();
		world.spawn(
			EntityId({ value: "unit_0" }),
			Position({ x: 5, y: 0.3, z: 10 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_1" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Bot Alpha",
				speed: 3,
				selected: false,
			}),
			UnitComponents({
				componentsJson: JSON.stringify([
					{ name: "camera", functional: true, material: "electronic" },
					{ name: "arms", functional: false, material: "metal" },
				]),
			}),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		);

		// Serialize and save
		const unitRecords = serializeUnits(world, gameId);
		expect(unitRecords.length).toBe(1);
		expect(unitRecords[0]!.entityId).toBe("unit_0");
		expect(unitRecords[0]!.x).toBe(5);

		await repo.saveUnits(gameId, unitRecords);

		// Load back
		const loaded = await repo.loadUnits(gameId);
		expect(loaded.length).toBe(1);
		expect(loaded[0]!.entityId).toBe("unit_0");
		expect(loaded[0]!.x).toBe(5);
		expect(loaded[0]!.displayName).toBe("Bot Alpha");

		// Apply to a fresh world
		const world2 = createWorld();
		applyUnits(world2, loaded);

		const restored = [...world2.query(Unit, EntityId, Position)];
		expect(restored.length).toBe(1);

		const eid = restored[0]!.get(EntityId)!;
		const pos = restored[0]!.get(Position)!;
		const unit = restored[0]!.get(Unit)!;
		expect(eid.value).toBe("unit_0");
		expect(pos.x).toBe(5);
		expect(pos.z).toBe(10);
		expect(unit.displayName).toBe("Bot Alpha");

		world.destroy();
		world2.destroy();
	});

	it("round-trips buildings with lightning rod data", async () => {
		await setup();
		const gameId = await repo.createGame("test", "normal", 0, 1.0);

		const world = createWorld();
		world.spawn(
			EntityId({ value: "bldg_0" }),
			Position({ x: 10, y: 0.2, z: 13 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_1" }),
			BuildingTrait({
				buildingType: "lightning_rod",
				powered: true,
				operational: true,
				selected: false,
				buildingComponentsJson: "[]",
			}),
			LightningRod({
				rodCapacity: 10,
				currentOutput: 7,
				protectionRadius: 8,
			}),
		);

		const { buildings, rods } = serializeBuildings(world, gameId);
		expect(buildings.length).toBe(1);
		expect(rods.length).toBe(1);
		expect(buildings[0]!.buildingType).toBe("lightning_rod");
		expect(rods[0]!.rodCapacity).toBe(10);

		await repo.saveBuildings(gameId, buildings);
		await repo.saveLightningRods(gameId, rods);

		const loadedBuildings = await repo.loadBuildings(gameId);
		const loadedRods = await repo.loadLightningRods(gameId);

		// Apply to fresh world
		const world2 = createWorld();
		applyBuildings(world2, loadedBuildings, loadedRods);

		const restored = [...world2.query(BuildingTrait, LightningRod)];
		expect(restored.length).toBe(1);

		const bldg = restored[0]!.get(BuildingTrait)!;
		const rod = restored[0]!.get(LightningRod)!;
		expect(bldg.buildingType).toBe("lightning_rod");
		expect(bldg.powered).toBe(true);
		expect(rod.rodCapacity).toBe(10);
		expect(rod.currentOutput).toBe(7);

		world.destroy();
		world2.destroy();
	});

	it("round-trips fabrication units with both Unit and Building traits", async () => {
		await setup();
		const gameId = await repo.createGame("test", "normal", 0, 1.0);

		const world = createWorld();
		world.spawn(
			EntityId({ value: "fab_0" }),
			Position({ x: 13, y: 0.2, z: 14 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_1" }),
			Unit({
				unitType: "fabrication_unit",
				displayName: "Fabrication Unit",
				speed: 0,
				selected: false,
			}),
			UnitComponents({
				componentsJson: JSON.stringify([
					{ name: "fabrication_arm", functional: true, material: "metal" },
				]),
			}),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
			BuildingTrait({
				buildingType: "fabrication_unit",
				powered: false,
				operational: false,
				selected: false,
				buildingComponentsJson: JSON.stringify([
					{ name: "fabrication_arm", functional: true, material: "metal" },
				]),
			}),
		);

		const serialized = serializeBuildings(world, gameId);
		expect(serialized.buildings.length).toBe(1);
		expect(serialized.buildings[0]!.buildingType).toBe("fabrication_unit");

		await repo.saveBuildings(gameId, serialized.buildings);

		const loaded = await repo.loadBuildings(gameId);
		const world2 = createWorld();
		applyBuildings(world2, loaded, []);

		// Fabrication units should have BOTH Building and Unit traits
		const restored = [...world2.query(BuildingTrait, Unit)];
		expect(restored.length).toBe(1);

		const unit = restored[0]!.get(Unit)!;
		expect(unit.unitType).toBe("fabrication_unit");
		expect(unit.speed).toBe(0);

		world.destroy();
		world2.destroy();
	});

	it("component damage state survives serialization", async () => {
		await setup();
		const gameId = await repo.createGame("test", "normal", 0, 1.0);

		const components = [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: false, material: "electronic" },
		];

		const world = createWorld();
		world.spawn(
			EntityId({ value: "unit_dmg" }),
			Position({ x: 1, y: 0, z: 2 }),
			Faction({ value: "player" }),
			Fragment({ fragmentId: "frag_1" }),
			Unit({
				unitType: "maintenance_bot",
				displayName: "Damaged Bot",
				speed: 3,
				selected: false,
			}),
			UnitComponents({ componentsJson: JSON.stringify(components) }),
			Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
		);

		const records = serializeUnits(world, gameId);
		await repo.saveUnits(gameId, records);
		const loaded = await repo.loadUnits(gameId);

		const restoredComponents = JSON.parse(loaded[0]!.componentsJson);
		expect(restoredComponents).toHaveLength(4);
		expect(restoredComponents[0].name).toBe("camera");
		expect(restoredComponents[0].functional).toBe(true);
		expect(restoredComponents[1].name).toBe("arms");
		expect(restoredComponents[1].functional).toBe(false);
		expect(restoredComponents[3].name).toBe("power_cell");
		expect(restoredComponents[3].functional).toBe(false);

		world.destroy();
	});

	it("resources round-trip through repo", async () => {
		await setup();
		const gameId = await repo.createGame("test", "normal", 0, 1.0);

		await repo.saveResources(gameId, {
			gameId,
			scrapMetal: 15,
			circuitry: 8,
			powerCells: 3,
			durasteel: 2,
		});

		const loaded = await repo.loadResources(gameId);
		expect(loaded).not.toBeNull();
		expect(loaded!.scrapMetal).toBe(15);
		expect(loaded!.circuitry).toBe(8);
		expect(loaded!.powerCells).toBe(3);
		expect(loaded!.durasteel).toBe(2);
	});

	it("scavenge points round-trip through repo", async () => {
		await setup();
		const gameId = await repo.createGame("test", "normal", 0, 1.0);

		await repo.saveScavengePoints(gameId, [
			{
				gameId,
				x: 5.5,
				z: 10.2,
				remaining: 3,
				resourceType: "scrapMetal",
				amountPerScavenge: 2,
			},
			{
				gameId,
				x: 20.1,
				z: 15.8,
				remaining: 0,
				resourceType: "circuitry",
				amountPerScavenge: 1,
			},
		]);

		const loaded = await repo.loadScavengePoints(gameId);
		expect(loaded.length).toBe(2);
		expect(loaded[0]!.remaining).toBe(3);
		expect(loaded[1]!.remaining).toBe(0);
	});

	it("DB failure does not crash — persistence manager returns null/false", async () => {
		// Create a broken adapter that throws on everything
		const brokenAdapter: SqliteAdapter = {
			run() {
				throw new Error("DB broken");
			},
			query() {
				throw new Error("DB broken");
			},
			close() {},
		};

		const { initPersistence, saveGame, loadGame, listSaves } = await import(
			"../persistence"
		);

		const world = createWorld();

		const initResult = await initPersistence(brokenAdapter);
		expect(initResult).toBe(false);

		const saveResult = await saveGame(world, "seed", "normal", 0, 1.0);
		expect(saveResult).toBeNull();

		const loadResult = await loadGame(world, "nonexistent");
		expect(loadResult).toBe(false);

		const saves = await listSaves();
		expect(saves).toEqual([]);

		world.destroy();
	});
});
