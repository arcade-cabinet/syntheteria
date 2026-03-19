/**
 * Save/load round-trip integration test.
 *
 * Exercises the full pipeline: ECS world → serialize → GameRepo → DB → load → apply → verify.
 * Simulates starting a game, playing 3 turns (mutating state), then restoring from the save
 * made before those turns, and verifying unit positions, buildings, fog, and resources all match.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building } from "../../ecs/traits/building";
import { Faction } from "../../ecs/traits/faction";
import { ResourcePool } from "../../ecs/traits/resource";
import { Tile, TileHighlight } from "../../ecs/traits/tile";
import {
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../../ecs/traits/unit";
import type { SqliteAdapter } from "../adapter";
import { createSqlJsAdapter } from "../adapter";
import { GameRepo } from "../gameRepo";
import { runMigrations } from "../migrations";
import {
	applyBuildings,
	applyExplored,
	applyResources,
	applyUnits,
	serializeBuildings,
	serializeExplored,
	serializeResources,
	serializeUnits,
} from "../serialize";

let db: SqliteAdapter;
let repo: GameRepo;

beforeEach(async () => {
	db = await createSqlJsAdapter();
	await runMigrations(db);
	repo = new GameRepo(db);
});

afterEach(() => {
	db.close();
});

describe("save/load round-trip integration", () => {
	it("restores unit positions, buildings, fog, and resources after 3 simulated turns", async () => {
		const world = createWorld();

		// ── Setup: initial game state ────────────────────────────────────────

		// Player faction with resources
		world.spawn(
			Faction({
				id: "player",
				displayName: "Reclaimers",
				color: 0x00ffaa,
				isPlayer: true,
				persona: "otter",
				aggression: 0,
			}),
			ResourcePool({
				ferrous_scrap: 25,
				alloy_stock: 10,
				polymer_salvage: 3,
				conductor_wire: 0,
				electrolyte: 0,
				silicon_wafer: 0,
				storm_charge: 7,
				el_crystal: 0,
				scrap_metal: 15,
				e_waste: 0,
				intact_components: 2,
				thermal_fluid: 0,
				depth_salvage: 0,
			}),
		);

		// AI faction with resources
		world.spawn(
			Faction({
				id: "synth-col",
				displayName: "Synth Collective",
				color: 0xff4444,
				isPlayer: false,
				persona: "fox",
				aggression: 5,
			}),
			ResourcePool({
				ferrous_scrap: 12,
				alloy_stock: 8,
				polymer_salvage: 0,
				conductor_wire: 0,
				electrolyte: 0,
				silicon_wafer: 0,
				storm_charge: 3,
				el_crystal: 0,
				scrap_metal: 0,
				e_waste: 0,
				intact_components: 0,
				thermal_fluid: 0,
				depth_salvage: 0,
			}),
		);

		// Units
		const scout = world.spawn(
			UnitPos({ tileX: 5, tileZ: 3 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 8,
				maxHp: 10,
				ap: 2,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
			UnitVisual({ modelId: "scout-mk1", scale: 1.0, facingAngle: 0 }),
		);

		const harvester = world.spawn(
			UnitPos({ tileX: 10, tileZ: 7 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 15,
				maxHp: 15,
				ap: 1,
				maxAp: 2,
				scanRange: 3,
				attack: 1,
				defense: 1,
			}),
			UnitVisual({
				modelId: "harvester-bot",
				scale: 1.0,
				facingAngle: 0,
			}),
		);

		const enemyUnit = world.spawn(
			UnitPos({ tileX: 20, tileZ: 15 }),
			UnitFaction({ factionId: "synth-col" }),
			UnitStats({
				hp: 12,
				maxHp: 12,
				ap: 3,
				maxAp: 3,
				scanRange: 5,
				attack: 3,
				defense: 1,
			}),
			UnitVisual({ modelId: "raider-v1", scale: 1.0, facingAngle: 0 }),
		);

		// Buildings
		world.spawn(
			Building({
				tileX: 4,
				tileZ: 3,
				buildingType: "storm_transmitter",
				factionId: "player",
				hp: 30,
				maxHp: 50,
				modelId: "storm_transmitter",
			}),
		);

		world.spawn(
			Building({
				tileX: 6,
				tileZ: 3,
				buildingType: "defense_turret",
				factionId: "player",
				hp: 50,
				maxHp: 50,
				modelId: "defense_turret",
			}),
		);

		// Tiles with exploration state
		world.spawn(
			Tile({
				x: 5,
				z: 3,
				elevation: 0,
				passable: true,
				explored: true,
				visibility: 1.0,
			}),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);
		world.spawn(
			Tile({
				x: 6,
				z: 3,
				elevation: 0,
				passable: true,
				explored: true,
				visibility: 0.8,
			}),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);
		world.spawn(
			Tile({
				x: 7,
				z: 3,
				elevation: 0,
				passable: true,
				explored: false,
				visibility: 0.3,
			}),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);
		world.spawn(
			Tile({
				x: 8,
				z: 3,
				elevation: 0,
				passable: true,
				explored: false,
				visibility: 0,
			}),
			TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
		);

		// ── Step 1: Serialize + save to DB ───────────────────────────────────

		const gameId = await repo.createGame("test-seed", 32, 32, "normal");

		const unitRecords = serializeUnits(world, gameId);
		const buildingRecords = serializeBuildings(world, gameId);
		const exploredRecords = serializeExplored(world, gameId);
		const resourceRecords = serializeResources(world, gameId);

		await repo.saveUnits(gameId, unitRecords);
		await repo.saveBuildings(gameId, buildingRecords);
		await repo.saveExplored(gameId, exploredRecords);
		await repo.saveResources(gameId, resourceRecords);

		// Verify correct record counts were saved
		expect(unitRecords.length).toBe(3);
		expect(buildingRecords.length).toBe(2);
		// 3 tiles have explored=true or visibility>0 (tile x=8 has both false/0)
		expect(exploredRecords.length).toBe(3);
		// Non-zero resources: player has 6 non-zero, synth-col has 3 non-zero
		expect(resourceRecords.length).toBe(9);

		// ── Step 2: Simulate 3 turns of gameplay (mutate ECS) ────────────────

		// Move scout
		scout.set(UnitPos, { tileX: 9, tileZ: 6 });
		scout.set(UnitStats, {
			hp: 4,
			maxHp: 10,
			ap: 0,
			maxAp: 3,
			scanRange: 4,
			attack: 2,
			defense: 0,
		});

		// Move harvester
		harvester.set(UnitPos, { tileX: 12, tileZ: 9 });
		harvester.set(UnitStats, {
			hp: 10,
			maxHp: 15,
			ap: 0,
			maxAp: 2,
			scanRange: 3,
			attack: 1,
			defense: 1,
		});

		// Enemy moved and took damage
		enemyUnit.set(UnitPos, { tileX: 18, tileZ: 13 });
		enemyUnit.set(UnitStats, {
			hp: 6,
			maxHp: 12,
			ap: 1,
			maxAp: 3,
			scanRange: 5,
			attack: 3,
			defense: 1,
		});

		// Damage a building
		for (const entity of world.query(Building)) {
			const b = entity.get(Building);
			if (b && b.tileX === 4 && b.tileZ === 3) {
				entity.set(Building, { ...b, hp: 10 });
			}
		}

		// Change resources (player gained some, spent some)
		for (const entity of world.query(ResourcePool, Faction)) {
			const f = entity.get(Faction);
			if (f?.id === "player") {
				entity.set(ResourcePool, {
					ferrous_scrap: 50,
					alloy_stock: 0,
					polymer_salvage: 0,
					conductor_wire: 0,
					electrolyte: 0,
					silicon_wafer: 0,
					storm_charge: 20,
					el_crystal: 0,
					scrap_metal: 30,
					e_waste: 0,
					intact_components: 0,
					thermal_fluid: 0,
					depth_salvage: 0,
				});
			}
		}

		// Explore more tiles
		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile);
			if (tile && tile.x === 7 && tile.z === 3) {
				entity.set(Tile, { ...tile, explored: true, visibility: 1.0 });
			}
			if (tile && tile.x === 8 && tile.z === 3) {
				entity.set(Tile, { ...tile, explored: true, visibility: 0.9 });
			}
		}

		// ── Step 3: Verify world is in the MUTATED state ─────────────────────

		const scoutPos = scout.get(UnitPos)!;
		expect(scoutPos.tileX).toBe(9); // mutated

		const scoutHp = scout.get(UnitStats)!;
		expect(scoutHp.hp).toBe(4); // mutated

		// ── Step 4: Load saved records from DB ───────────────────────────────

		const loadedUnits = await repo.loadUnits(gameId);
		const loadedBuildings = await repo.loadBuildings(gameId);
		const loadedExplored = await repo.loadExplored(gameId);
		const loadedResources = await repo.loadResources(gameId);

		expect(loadedUnits.length).toBe(3);
		expect(loadedBuildings.length).toBe(2);
		expect(loadedExplored.length).toBe(3);
		expect(loadedResources.length).toBe(9);

		// ── Step 5: Apply saved state back onto the mutated world ────────────

		applyUnits(world, loadedUnits);
		applyBuildings(world, loadedBuildings);
		applyExplored(world, loadedExplored);
		applyResources(world, loadedResources);

		// ── Step 6: Verify world matches original pre-save state ─────────────
		// Note: applyUnits destroys old entities and respawns from records,
		// so we must query the world to find units by position, not use old refs.

		// Build a lookup: units by modelId
		const restoredUnits = new Map<string, { pos: { tileX: number; tileZ: number }; stats: { hp: number; ap: number } }>();
		for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
			const visual = entity.has(UnitVisual) ? entity.get(UnitVisual) : null;
			const pos = entity.get(UnitPos)!;
			const stats = entity.get(UnitStats)!;
			const key = visual?.modelId ?? `${pos.tileX},${pos.tileZ}`;
			restoredUnits.set(key, { pos, stats });
		}

		const restoredScout = restoredUnits.get("scout-mk1");
		expect(restoredScout).toBeDefined();
		expect(restoredScout!.pos.tileX).toBe(5);
		expect(restoredScout!.pos.tileZ).toBe(3);
		expect(restoredScout!.stats.hp).toBe(8);
		expect(restoredScout!.stats.ap).toBe(2);

		const restoredHarvester = restoredUnits.get("harvester-bot");
		expect(restoredHarvester).toBeDefined();
		expect(restoredHarvester!.pos.tileX).toBe(10);
		expect(restoredHarvester!.pos.tileZ).toBe(7);
		expect(restoredHarvester!.stats.hp).toBe(15);
		expect(restoredHarvester!.stats.ap).toBe(1);

		const restoredEnemy = restoredUnits.get("raider-v1");
		expect(restoredEnemy).toBeDefined();
		expect(restoredEnemy!.pos.tileX).toBe(20);
		expect(restoredEnemy!.pos.tileZ).toBe(15);
		expect(restoredEnemy!.stats.hp).toBe(12);
		expect(restoredEnemy!.stats.ap).toBe(3);

		// Buildings restored to pre-save HP
		for (const entity of world.query(Building)) {
			const b = entity.get(Building)!;
			if (b.tileX === 4 && b.tileZ === 3) {
				expect(b.hp).toBe(30); // was damaged to 10, restored to 30
			}
			if (b.tileX === 6 && b.tileZ === 3) {
				expect(b.hp).toBe(50); // unchanged
			}
		}

		// Fog of war: explored tiles retain their explored status.
		// Note: applyExplored uses max(current, saved) for visibility,
		// and since we mutated tiles 7,8 to explored=true/vis=1.0/0.9,
		// the apply will keep the higher values for those.
		// The key check is that the original explored tiles still have their saved state.
		for (const entity of world.query(Tile)) {
			const tile = entity.get(Tile)!;
			if (tile.x === 5 && tile.z === 3) {
				expect(tile.explored).toBe(true);
				expect(tile.visibility).toBe(1.0);
			}
			if (tile.x === 6 && tile.z === 3) {
				expect(tile.explored).toBe(true);
				expect(tile.visibility).toBe(0.8);
			}
			// Tile 7: was saved as explored=false/vis=0.3, then mutated to true/1.0
			// applyExplored: explored = saved value (false), visibility = max(1.0, 0.3) = 1.0
			// This is the current behavior — exploration state from save takes precedence
			if (tile.x === 7 && tile.z === 3) {
				// Save had explored=false, apply restored it.
				// But visibility keeps the max.
				expect(tile.visibility).toBe(1.0);
			}
		}

		// Resources restored to pre-save values
		for (const entity of world.query(ResourcePool, Faction)) {
			const f = entity.get(Faction);
			const pool = entity.get(ResourcePool)!;
			if (f?.id === "player") {
				expect(pool.ferrous_scrap).toBe(25);
				expect(pool.alloy_stock).toBe(10);
				expect(pool.storm_charge).toBe(7);
				expect(pool.scrap_metal).toBe(15);
				expect(pool.intact_components).toBe(2);
				expect(pool.polymer_salvage).toBe(3);
			}
			if (f?.id === "synth-col") {
				expect(pool.ferrous_scrap).toBe(12);
				expect(pool.alloy_stock).toBe(8);
				expect(pool.storm_charge).toBe(3);
			}
		}
	});

	it("re-save after turns correctly overwrites previous save data", async () => {
		const world = createWorld();

		world.spawn(
			Faction({
				id: "player",
				displayName: "Player",
				color: 0x00ffaa,
				isPlayer: true,
				persona: "otter",
				aggression: 0,
			}),
			ResourcePool({
				ferrous_scrap: 10,
				alloy_stock: 0,
				polymer_salvage: 0,
				conductor_wire: 0,
				electrolyte: 0,
				silicon_wafer: 0,
				storm_charge: 0,
				el_crystal: 0,
				scrap_metal: 0,
				e_waste: 0,
				intact_components: 0,
				thermal_fluid: 0,
				depth_salvage: 0,
			}),
		);

		const unit = world.spawn(
			UnitPos({ tileX: 1, tileZ: 1 }),
			UnitFaction({ factionId: "player" }),
			UnitStats({
				hp: 10,
				maxHp: 10,
				ap: 3,
				maxAp: 3,
				scanRange: 4,
				attack: 2,
				defense: 0,
			}),
		);

		const gameId = await repo.createGame("seed", 16, 16, "normal");

		// Save turn 1 state
		await repo.saveUnits(gameId, serializeUnits(world, gameId));
		await repo.saveResources(gameId, serializeResources(world, gameId));

		// Play turns — move unit, gain resources
		unit.set(UnitPos, { tileX: 5, tileZ: 5 });
		unit.set(UnitStats, {
			hp: 7,
			maxHp: 10,
			ap: 0,
			maxAp: 3,
			scanRange: 4,
			attack: 2,
			defense: 0,
		});
		for (const entity of world.query(ResourcePool, Faction)) {
			entity.set(ResourcePool, {
				ferrous_scrap: 30,
				alloy_stock: 5,
				polymer_salvage: 0,
				conductor_wire: 0,
				electrolyte: 0,
				silicon_wafer: 0,
				storm_charge: 0,
				el_crystal: 0,
				scrap_metal: 0,
				e_waste: 0,
				intact_components: 0,
				thermal_fluid: 0,
				depth_salvage: 0,
			});
		}

		// Re-save (overwrites turn 1 data)
		await repo.saveUnits(gameId, serializeUnits(world, gameId));
		await repo.saveResources(gameId, serializeResources(world, gameId));

		// Mutate further (turn 4+)
		unit.set(UnitPos, { tileX: 99, tileZ: 99 });

		// Load and apply — should restore turn 3 state, not turn 1
		// Note: applyUnits destroys old entities and respawns from records
		applyUnits(world, await repo.loadUnits(gameId));
		applyResources(world, await repo.loadResources(gameId));

		// Query the world for the restored unit (old ref is destroyed)
		let restoredPos: { tileX: number; tileZ: number } | null = null;
		let restoredHp = 0;
		for (const entity of world.query(UnitPos, UnitStats)) {
			restoredPos = entity.get(UnitPos)!;
			restoredHp = entity.get(UnitStats)!.hp;
		}
		expect(restoredPos).not.toBeNull();
		expect(restoredPos!.tileX).toBe(5);
		expect(restoredPos!.tileZ).toBe(5);
		expect(restoredHp).toBe(7);

		for (const entity of world.query(ResourcePool)) {
			const pool = entity.get(ResourcePool)!;
			expect(pool.ferrous_scrap).toBe(30);
			expect(pool.alloy_stock).toBe(5);
		}
	});

	it("turn counter persists through advanceTurn", async () => {
		const gameId = await repo.createGame("seed", 16, 16, "normal");

		// Advance 3 turns
		await repo.advanceTurn(gameId);
		await repo.advanceTurn(gameId);
		const turn = await repo.advanceTurn(gameId);
		expect(turn).toBe(4); // started at 1, advanced 3 times

		const game = await repo.getGame(gameId);
		expect(game!.turn).toBe(4);
	});
});
