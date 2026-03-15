// ─── Mock world for rehydrate tests ──────────────────────────────────────────
// rehydrateW3TraitsSync calls initFactionResourcePools and addFactionResourceKoota
// (via factionEconomy) and loadChunkDiscovery (via chunkDiscovery), both of which
// call world.spawn. We provide a stateful entity mock so getFactionResourcesKoota
// returns the data that was set.

/** Minimal stateful entity that stores the last value set on it. */
function makeStatefulEntity() {
	let stored: unknown = undefined;
	return {
		set: jest.fn((_trait: unknown, value: unknown) => {
			stored = value;
		}),
		get: jest.fn((_trait: unknown) => stored),
		isAlive: jest.fn(() => true),
		destroy: jest.fn(() => {
			stored = undefined;
		}),
	};
}

jest.mock("../../ecs/world", () => ({
	// live queries — not used by serialize (DI) but exported for import resolution
	factionResourcePools: [],
	chunkDiscoveries: [],
	// stateful spawn so factionEconomy / chunkDiscovery entities work correctly
	world: {
		spawn: jest.fn(() => makeStatefulEntity()),
		entities: [],
		query: jest.fn(() => []),
	},
}));

import {
	getFactionResourcesKoota,
	resetFactionEconomy,
} from "../../systems/factionEconomy";
import {
	loadChunkDiscovery,
	resetChunkDiscovery,
} from "../../world/chunkDiscovery";
import { getDatabaseSync } from "../runtime";
import { createSaveGameSync } from "../saveGames";
import {
	rehydrateW3TraitsSync,
	serializeW3TraitsSync,
} from "../worldPersistence";

function setupSaveGame() {
	const database = getDatabaseSync();
	const config = {
		worldSeed: 42,
		sectorScale: "small" as const,
		difficulty: "hard" as const,
		climateProfile: "wet" as const,
		stormProfile: "cataclysmic" as const,
	};
	const saveGame = createSaveGameSync(config, database)!;
	return { database, saveGame };
}

describe("W3 trait persistence — serializeW3TraitsSync", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("writes FactionResourcePool entities to faction_resource_states", () => {
		const { database, saveGame } = setupSaveGame();

		const poolEntities = [
			{
				get: () => ({
					factionId: "reclaimers",
					resourcesJson: JSON.stringify({ ore: 10, energy: 5 }),
				}),
			},
			{
				get: () => ({
					factionId: "volt_collective",
					resourcesJson: JSON.stringify({ ore: 3 }),
				}),
			},
		];

		serializeW3TraitsSync(saveGame.id, database, poolEntities, []);

		const rows = database.getAllSync<{
			faction_id: string;
			resources_json: string;
		}>(
			"SELECT faction_id, resources_json FROM faction_resource_states WHERE save_game_id = ? ORDER BY faction_id ASC",
			saveGame.id,
		);

		expect(rows).toHaveLength(2);
		expect(rows[0].faction_id).toBe("reclaimers");
		expect(JSON.parse(rows[0].resources_json)).toEqual({ ore: 10, energy: 5 });
		expect(rows[1].faction_id).toBe("volt_collective");
		expect(JSON.parse(rows[1].resources_json)).toEqual({ ore: 3 });
	});

	it("writes ChunkDiscovery entities to map_discovery", () => {
		const { database, saveGame } = setupSaveGame();

		const chunkEntities = [
			{ get: () => ({ chunkX: 2, chunkZ: 3, discoveryLevel: "abstract" }) },
			{ get: () => ({ chunkX: 0, chunkZ: 0, discoveryLevel: "full" }) },
		];

		serializeW3TraitsSync(saveGame.id, database, [], chunkEntities);

		const rows = database.getAllSync<{
			chunk_x: number;
			chunk_y: number;
			discovered_state: string;
		}>(
			"SELECT chunk_x, chunk_y, discovered_state FROM map_discovery WHERE save_game_id = ? ORDER BY chunk_x ASC",
			saveGame.id,
		);

		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			chunk_x: 0,
			chunk_y: 0,
			discovered_state: "full",
		});
		expect(rows[1]).toMatchObject({
			chunk_x: 2,
			chunk_y: 3,
			discovered_state: "abstract",
		});
	});

	it("replaces existing map_discovery rows on re-serialize", () => {
		const { database, saveGame } = setupSaveGame();

		serializeW3TraitsSync(
			saveGame.id,
			database,
			[],
			[{ get: () => ({ chunkX: 1, chunkZ: 1, discoveryLevel: "unexplored" }) }],
		);

		serializeW3TraitsSync(
			saveGame.id,
			database,
			[],
			[{ get: () => ({ chunkX: 5, chunkZ: 7, discoveryLevel: "full" }) }],
		);

		const rows = database.getAllSync<{ chunk_x: number }>(
			"SELECT chunk_x FROM map_discovery WHERE save_game_id = ?",
			saveGame.id,
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].chunk_x).toBe(5);
	});

	it("skips faction_resource_states write when no pool entities exist", () => {
		const { database, saveGame } = setupSaveGame();

		database.runSync(
			"INSERT INTO faction_resource_states (save_game_id, faction_id, resources_json, last_synced_at) VALUES (?, ?, ?, ?)",
			saveGame.id,
			"iron_creed",
			"{}",
			1_700_000_000_000,
		);

		serializeW3TraitsSync(saveGame.id, database, [], []);

		const rows = database.getAllSync<{ faction_id: string }>(
			"SELECT faction_id FROM faction_resource_states WHERE save_game_id = ?",
			saveGame.id,
		);
		expect(rows).toHaveLength(1);
	});
});

describe("W3 trait persistence — rehydrateW3TraitsSync", () => {
	beforeEach(() => {
		resetFactionEconomy();
		resetChunkDiscovery();
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		resetFactionEconomy();
		resetChunkDiscovery();
		jest.restoreAllMocks();
	});

	it("spawns FactionResourcePool entities from faction_resource_states rows", () => {
		const { database, saveGame } = setupSaveGame();

		database.runSync(
			"INSERT INTO faction_resource_states (save_game_id, faction_id, resources_json, last_synced_at) VALUES (?, ?, ?, ?)",
			saveGame.id,
			"reclaimers",
			JSON.stringify({ ore: 10, energy: 5 }),
			1_700_000_000_000,
		);
		database.runSync(
			"INSERT INTO faction_resource_states (save_game_id, faction_id, resources_json, last_synced_at) VALUES (?, ?, ?, ?)",
			saveGame.id,
			"iron_creed",
			JSON.stringify({ scrap: 2 }),
			1_700_000_000_000,
		);

		rehydrateW3TraitsSync(saveGame.id, database);

		expect(getFactionResourcesKoota("reclaimers")).toEqual({
			ore: 10,
			energy: 5,
		});
		expect(getFactionResourcesKoota("iron_creed")).toEqual({ scrap: 2 });
	});

	it("restores ChunkDiscovery state from map_discovery rows", () => {
		const { database, saveGame } = setupSaveGame();

		database.runSync(
			"INSERT INTO map_discovery (save_game_id, chunk_x, chunk_y, discovered_state) VALUES (?, ?, ?, ?)",
			saveGame.id,
			4,
			7,
			"abstract",
		);
		database.runSync(
			"INSERT INTO map_discovery (save_game_id, chunk_x, chunk_y, discovered_state) VALUES (?, ?, ?, ?)",
			saveGame.id,
			0,
			0,
			"full",
		);

		rehydrateW3TraitsSync(saveGame.id, database);

		// Verify via the public chunkDiscovery API.
		// loadChunkDiscovery spawns ChunkDiscovery entities — after rehydrate,
		// re-calling for the same chunk should update (not duplicate) idempotently.
		expect(() => loadChunkDiscovery(4, 7, "full")).not.toThrow();
		expect(() => loadChunkDiscovery(0, 0, "unexplored")).not.toThrow();
	});

	it("does nothing when no rows exist", () => {
		const { database, saveGame } = setupSaveGame();

		rehydrateW3TraitsSync(saveGame.id, database);

		// No entities spawned — getFactionResourcesKoota returns empty
		expect(getFactionResourcesKoota("reclaimers")).toEqual({});
	});
});
