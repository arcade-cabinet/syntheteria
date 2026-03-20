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

describe("persistence round-trips", () => {
	it("saveUnits + loadUnits round-trips unit positions", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");
		const units = [
			{
				id: "u1",
				gameId,
				factionId: "reclaimers",
				tileX: 3,
				tileZ: 7,
				hp: 80,
				maxHp: 100,
				ap: 2,
				maxAp: 3,
				mp: 3,
				maxMp: 3,
				modelId: "scout-mk1",
			},
			{
				id: "u2",
				gameId,
				factionId: "synth-collective",
				tileX: 10,
				tileZ: 4,
				hp: 50,
				maxHp: 50,
				ap: 1,
				maxAp: 2,
				mp: 2,
				maxMp: 2,
				modelId: "harvester-bot",
			},
		];

		await repo.saveUnits(gameId, units);
		const loaded = await repo.loadUnits(gameId);

		expect(loaded.length).toBe(2);
		const u1 = loaded.find((u) => u.id === "u1")!;
		expect(u1.factionId).toBe("reclaimers");
		expect(u1.tileX).toBe(3);
		expect(u1.tileZ).toBe(7);
		expect(u1.hp).toBe(80);
		expect(u1.maxHp).toBe(100);
		expect(u1.ap).toBe(2);
		expect(u1.maxAp).toBe(3);
		expect(u1.modelId).toBe("scout-mk1");

		const u2 = loaded.find((u) => u.id === "u2")!;
		expect(u2.factionId).toBe("synth-collective");
		expect(u2.tileX).toBe(10);
		expect(u2.tileZ).toBe(4);
	});

	it("saveUnits overwrites existing unit on re-save", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");
		const unit = {
			id: "u1",
			gameId,
			factionId: "reclaimers",
			tileX: 3,
			tileZ: 7,
			hp: 100,
			maxHp: 100,
			ap: 3,
			maxAp: 3,
			mp: 3,
			maxMp: 3,
			modelId: "scout-mk1",
		};

		await repo.saveUnits(gameId, [unit]);
		await repo.saveUnits(gameId, [{ ...unit, tileX: 5, hp: 60 }]);

		const loaded = await repo.loadUnits(gameId);
		expect(loaded.length).toBe(1);
		expect(loaded[0].tileX).toBe(5);
		expect(loaded[0].hp).toBe(60);
	});

	it("saveBuildings + loadBuildings round-trips building positions", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");
		const buildings = [
			{
				id: "b1",
				gameId,
				factionId: "reclaimers",
				tileX: 4,
				tileZ: 4,
				type: "storm_transmitter",
				hp: 100,
				maxHp: 100,
			},
			{
				id: "b2",
				gameId,
				factionId: "reclaimers",
				tileX: 5,
				tileZ: 4,
				type: "storage_hub",
				hp: 40,
				maxHp: 50,
			},
		];

		await repo.saveBuildings(gameId, buildings);
		const loaded = await repo.loadBuildings(gameId);

		expect(loaded.length).toBe(2);
		const b1 = loaded.find((b) => b.id === "b1")!;
		expect(b1.factionId).toBe("reclaimers");
		expect(b1.tileX).toBe(4);
		expect(b1.tileZ).toBe(4);
		expect(b1.type).toBe("storm_transmitter");
		expect(b1.hp).toBe(100);
		expect(b1.maxHp).toBe(100);

		const b2 = loaded.find((b) => b.id === "b2")!;
		expect(b2.type).toBe("storage_hub");
		expect(b2.hp).toBe(40);
	});

	it("saveExplored + loadExplored round-trips explored tiles", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");
		const explored = [
			{ gameId, tileX: 0, tileZ: 0, explored: true, visibility: 1.0 },
			{ gameId, tileX: 1, tileZ: 0, explored: true, visibility: 0.7 },
			{ gameId, tileX: 2, tileZ: 0, explored: false, visibility: 0.0 },
		];

		await repo.saveExplored(gameId, explored);
		const loaded = await repo.loadExplored(gameId);

		expect(loaded.length).toBe(3);
		const t0 = loaded.find((e) => e.tileX === 0 && e.tileZ === 0)!;
		expect(t0.explored).toBe(true);
		expect(t0.visibility).toBe(1.0);

		const t1 = loaded.find((e) => e.tileX === 1 && e.tileZ === 0)!;
		expect(t1.explored).toBe(true);
		expect(t1.visibility).toBeCloseTo(0.7);

		const t2 = loaded.find((e) => e.tileX === 2 && e.tileZ === 0)!;
		expect(t2.explored).toBe(false);
		expect(t2.visibility).toBe(0.0);
	});

	it("saveExplored overwrites on re-save", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");

		await repo.saveExplored(gameId, [
			{ gameId, tileX: 0, tileZ: 0, explored: false, visibility: 0.0 },
		]);
		await repo.saveExplored(gameId, [
			{ gameId, tileX: 0, tileZ: 0, explored: true, visibility: 1.0 },
		]);

		const loaded = await repo.loadExplored(gameId);
		expect(loaded.length).toBe(1);
		expect(loaded[0].explored).toBe(true);
		expect(loaded[0].visibility).toBe(1.0);
	});

	it("saveResources + loadResources round-trips resource pools", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");
		const resources = [
			{
				gameId,
				factionId: "reclaimers",
				material: "iron_ore",
				amount: 25,
			},
			{ gameId, factionId: "reclaimers", material: "steel", amount: 10 },
			{
				gameId,
				factionId: "synth-collective",
				material: "fuel",
				amount: 5,
			},
		];

		await repo.saveResources(gameId, resources);
		const loaded = await repo.loadResources(gameId);

		expect(loaded.length).toBe(3);
		const fs = loaded.find(
			(r) => r.factionId === "reclaimers" && r.material === "iron_ore",
		)!;
		expect(fs.amount).toBe(25);

		const as = loaded.find(
			(r) => r.factionId === "reclaimers" && r.material === "steel",
		)!;
		expect(as.amount).toBe(10);

		const sc = loaded.find(
			(r) => r.factionId === "synth-collective" && r.material === "fuel",
		)!;
		expect(sc.amount).toBe(5);
	});

	it("saveResources overwrites existing amounts on re-save", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");

		await repo.saveResources(gameId, [
			{ gameId, factionId: "reclaimers", material: "stone", amount: 10 },
		]);
		await repo.saveResources(gameId, [
			{ gameId, factionId: "reclaimers", material: "stone", amount: 42 },
		]);

		const loaded = await repo.loadResources(gameId);
		expect(loaded.length).toBe(1);
		expect(loaded[0].amount).toBe(42);
	});

	it("load returns empty arrays for game with no saved data", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");

		expect(await repo.loadUnits(gameId)).toEqual([]);
		expect(await repo.loadBuildings(gameId)).toEqual([]);
		expect(await repo.loadExplored(gameId)).toEqual([]);
		expect(await repo.loadResources(gameId)).toEqual([]);
	});

	it("data is isolated between games", async () => {
		const g1 = await repo.createGame("s1", 16, 16, "normal");
		const g2 = await repo.createGame("s2", 16, 16, "normal");

		await repo.saveUnits(g1, [
			{
				id: "u1",
				gameId: g1,
				factionId: "f1",
				tileX: 0,
				tileZ: 0,
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				mp: 3,
				maxMp: 3,
				modelId: "m1",
			},
		]);
		await repo.saveResources(g2, [
			{ gameId: g2, factionId: "f2", material: "circuits", amount: 99 },
		]);

		expect((await repo.loadUnits(g2)).length).toBe(0);
		expect((await repo.loadResources(g1)).length).toBe(0);
		expect((await repo.loadUnits(g1)).length).toBe(1);
		expect((await repo.loadResources(g2)).length).toBe(1);
	});
});
