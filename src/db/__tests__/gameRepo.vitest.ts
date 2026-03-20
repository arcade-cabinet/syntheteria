import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqliteAdapter } from "../adapter";
import { createTestAdapter } from "../adapter";
import { GameRepo } from "../gameRepo";
import { runMigrations } from "../migrations";

let db: SqliteAdapter;
let repo: GameRepo;

beforeEach(async () => {
	db = await createTestAdapter();
	await runMigrations(db);
	repo = new GameRepo(db);
});

afterEach(() => {
	db.close();
});

describe("GameRepo", () => {
	it("createGame returns a valid UUID string", async () => {
		const id = await repo.createGame("seed-1", 32, 32, "normal");
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it("getGame returns the created game with correct fields", async () => {
		const id = await repo.createGame("seed-abc", 64, 48, "hard", 3.0);
		const game = await repo.getGame(id);

		expect(game).not.toBeNull();
		expect(game!.id).toBe(id);
		expect(game!.seed).toBe("seed-abc");
		expect(game!.boardW).toBe(64);
		expect(game!.boardH).toBe(48);
		expect(game!.tileSizeM).toBe(3.0);
		expect(game!.difficulty).toBe("hard");
		expect(game!.turn).toBe(1);
		expect(game!.createdAt).toBeTruthy();
		expect(game!.updatedAt).toBeTruthy();
	});

	it("listGames returns games ordered by createdAt descending", async () => {
		const id1 = await repo.createGame("s1", 16, 16, "easy");
		// Ensure different timestamp
		await new Promise((r) => setTimeout(r, 10));
		const id2 = await repo.createGame("s2", 32, 32, "normal");

		const list = await repo.listGames();
		expect(list.length).toBe(2);
		// Most recent first
		expect(list[0].id).toBe(id2);
		expect(list[1].id).toBe(id1);
	});

	it("saveTiles + loadTiles round-trip", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		const tiles = [
			{
				gameId,
				x: 0,
				z: 0,
				zone: "ground",
				elevation: 0,
				passable: true,
			},
			{
				gameId,
				x: 1,
				z: 0,
				zone: "mountain",
				elevation: 3,
				passable: false,
			},
			{
				gameId,
				x: 0,
				z: 1,
				zone: "water",
				elevation: -1,
				passable: false,
			},
		];

		await repo.saveTiles(gameId, tiles);
		const loaded = await repo.loadTiles(gameId);

		expect(loaded.length).toBe(3);
		// Ordered by z, x
		expect(loaded[0].x).toBe(0);
		expect(loaded[0].z).toBe(0);
		expect(loaded[0].zone).toBe("ground");
		expect(loaded[0].passable).toBe(true);

		expect(loaded[1].x).toBe(1);
		expect(loaded[1].z).toBe(0);
		expect(loaded[1].zone).toBe("mountain");
		expect(loaded[1].passable).toBe(false);
		expect(loaded[1].elevation).toBe(3);

		expect(loaded[2].x).toBe(0);
		expect(loaded[2].z).toBe(1);
		expect(loaded[2].zone).toBe("water");
	});

	it("upsertUnit + loadUnits round-trip", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		const unit = {
			id: "unit-1",
			gameId,
			factionId: "reclaimers",
			tileX: 5,
			tileZ: 3,
			hp: 80,
			maxHp: 100,
			ap: 2,
			maxAp: 3,
			mp: 3,
			maxMp: 3,
			modelId: "scout-mk1",
		};

		await repo.upsertUnit(gameId, unit);
		const units = await repo.loadUnits(gameId);

		expect(units.length).toBe(1);
		expect(units[0].id).toBe("unit-1");
		expect(units[0].factionId).toBe("reclaimers");
		expect(units[0].tileX).toBe(5);
		expect(units[0].tileZ).toBe(3);
		expect(units[0].hp).toBe(80);
		expect(units[0].maxHp).toBe(100);
		expect(units[0].modelId).toBe("scout-mk1");
	});

	it("upsertUnit updates existing unit (same id, different tileX)", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		const unit = {
			id: "unit-1",
			gameId,
			factionId: "reclaimers",
			tileX: 5,
			tileZ: 3,
			hp: 100,
			maxHp: 100,
			ap: 3,
			maxAp: 3,
			mp: 3,
			maxMp: 3,
			modelId: "scout-mk1",
		};

		await repo.upsertUnit(gameId, unit);
		await repo.upsertUnit(gameId, { ...unit, tileX: 7, hp: 60 });

		const units = await repo.loadUnits(gameId);
		expect(units.length).toBe(1);
		expect(units[0].tileX).toBe(7);
		expect(units[0].hp).toBe(60);
	});

	it("appendEvent inserts a queryable event row", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		await repo.appendEvent(gameId, 1, "combat", {
			attacker: "unit-1",
			damage: 20,
		});

		const rows = await db.query<{
			game_id: string;
			turn: number;
			type: string;
			payload: string;
		}>("SELECT * FROM events WHERE game_id = ?", [gameId]);

		expect(rows.length).toBe(1);
		expect(rows[0].type).toBe("combat");
		expect(rows[0].turn).toBe(1);
		expect(JSON.parse(rows[0].payload)).toEqual({
			attacker: "unit-1",
			damage: 20,
		});
	});

	it("advanceTurn increments turn counter and returns new value", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");

		const turn2 = await repo.advanceTurn(gameId);
		expect(turn2).toBe(2);

		const turn3 = await repo.advanceTurn(gameId);
		expect(turn3).toBe(3);

		const game = await repo.getGame(gameId);
		expect(game!.turn).toBe(3);
	});
});

// ─── Analytics Tables ───────────────────────────────────────────────────────

describe("Campaign Statistics", () => {
	it("saveCampaignStats + loadCampaignStats round-trip", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		const stats = { turnsElapsed: 5, unitsBuilt: 3, unitsLost: 1 };

		await repo.saveCampaignStats(gameId, JSON.stringify(stats));
		const loaded = await repo.loadCampaignStats(gameId);

		expect(loaded).not.toBeNull();
		expect(loaded!.gameId).toBe(gameId);
		expect(JSON.parse(loaded!.statsJson)).toEqual(stats);
		expect(loaded!.updatedAt).toBeTruthy();
	});

	it("saveCampaignStats overwrites on subsequent save", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");

		await repo.saveCampaignStats(gameId, JSON.stringify({ turnsElapsed: 3 }));
		await repo.saveCampaignStats(gameId, JSON.stringify({ turnsElapsed: 7 }));

		const loaded = await repo.loadCampaignStats(gameId);
		expect(JSON.parse(loaded!.statsJson).turnsElapsed).toBe(7);
	});

	it("loadCampaignStats returns null for unknown game", async () => {
		const loaded = await repo.loadCampaignStats("nonexistent");
		expect(loaded).toBeNull();
	});
});

describe("Turn Event Logs", () => {
	it("appendTurnEventLog + loadTurnEventLogs round-trip", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		const events1 = [{ type: "combat", attacker: "unit-1" }];
		const events2 = [{ type: "harvest", material: "scrap" }];

		await repo.appendTurnEventLog(gameId, 1, JSON.stringify(events1));
		await repo.appendTurnEventLog(gameId, 2, JSON.stringify(events2));

		const logs = await repo.loadTurnEventLogs(gameId);
		expect(logs).toHaveLength(2);
		expect(logs[0].turn).toBe(1);
		expect(JSON.parse(logs[0].eventsJson)).toEqual(events1);
		expect(logs[1].turn).toBe(2);
		expect(JSON.parse(logs[1].eventsJson)).toEqual(events2);
	});

	it("loadTurnEventLogs filters by turn range", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		for (let t = 1; t <= 5; t++) {
			await repo.appendTurnEventLog(gameId, t, JSON.stringify([{ turn: t }]));
		}

		const range = await repo.loadTurnEventLogs(gameId, 2, 4);
		expect(range).toHaveLength(3);
		expect(range[0].turn).toBe(2);
		expect(range[2].turn).toBe(4);
	});

	it("loadTurnEventLogs returns empty for unknown game", async () => {
		const logs = await repo.loadTurnEventLogs("nonexistent");
		expect(logs).toEqual([]);
	});
});

describe("Faction Resource Snapshots", () => {
	it("saveFactionResourceSnapshot + loadFactionResourceSnapshots round-trip", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		const res1 = { stone: 10, iron_ore: 5 };
		const res2 = { stone: 20, steel: 3 };

		await repo.saveFactionResourceSnapshot(
			gameId,
			1,
			"player",
			JSON.stringify(res1),
		);
		await repo.saveFactionResourceSnapshot(
			gameId,
			1,
			"enemy",
			JSON.stringify(res2),
		);
		await repo.saveFactionResourceSnapshot(
			gameId,
			2,
			"player",
			JSON.stringify({ stone: 15 }),
		);

		const all = await repo.loadFactionResourceSnapshots(gameId);
		expect(all).toHaveLength(3);
		// Ordered by turn ASC, faction_id ASC
		expect(all[0].turn).toBe(1);
		expect(all[0].factionId).toBe("enemy");
		expect(all[1].turn).toBe(1);
		expect(all[1].factionId).toBe("player");
		expect(all[2].turn).toBe(2);
	});

	it("loadFactionResourceSnapshots filters by faction", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		await repo.saveFactionResourceSnapshot(gameId, 1, "player", "{}");
		await repo.saveFactionResourceSnapshot(gameId, 1, "enemy", "{}");
		await repo.saveFactionResourceSnapshot(gameId, 2, "player", "{}");

		const playerOnly = await repo.loadFactionResourceSnapshots(
			gameId,
			"player",
		);
		expect(playerOnly).toHaveLength(2);
		expect(playerOnly.every((s) => s.factionId === "player")).toBe(true);
	});
});

describe("Turn Snapshots", () => {
	it("saveTurnSnapshot + loadTurnSnapshots round-trip", async () => {
		const gameId = await repo.createGame("seed", 8, 8, "normal");
		const snap1 = {
			factions: [
				{
					factionId: "player",
					unitCount: 3,
					buildingCount: 2,
					territoryPercent: 15,
				},
			],
		};
		const snap2 = {
			factions: [
				{
					factionId: "player",
					unitCount: 5,
					buildingCount: 4,
					territoryPercent: 25,
				},
			],
		};

		await repo.saveTurnSnapshot(gameId, 1, JSON.stringify(snap1));
		await repo.saveTurnSnapshot(gameId, 2, JSON.stringify(snap2));

		const snapshots = await repo.loadTurnSnapshots(gameId);
		expect(snapshots).toHaveLength(2);
		expect(snapshots[0].turn).toBe(1);
		expect(JSON.parse(snapshots[0].snapshotJson)).toEqual(snap1);
		expect(snapshots[1].turn).toBe(2);
		expect(JSON.parse(snapshots[1].snapshotJson)).toEqual(snap2);
	});

	it("loadTurnSnapshots returns empty for unknown game", async () => {
		const snapshots = await repo.loadTurnSnapshots("nonexistent");
		expect(snapshots).toEqual([]);
	});
});
