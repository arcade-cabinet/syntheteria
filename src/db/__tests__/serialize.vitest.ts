import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import {
	Building,
	Faction,
	ResourcePool,
	Tile,
	TileHighlight,
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../../traits";
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

describe("ECS serialization round-trip", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	describe("serializeUnits / applyUnits", () => {
		it("serializes unit position, stats, faction, and modelId", () => {
			world.spawn(
				UnitPos({ tileX: 5, tileZ: 3 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({ hp: 8, maxHp: 10, ap: 2, maxAp: 3, scanRange: 4 }),
				UnitVisual({ modelId: "sentinel-mk1", scale: 1.0, facingAngle: 0 }),
			);

			const records = serializeUnits(world, "g1");
			expect(records.length).toBe(1);
			expect(records[0].tileX).toBe(5);
			expect(records[0].tileZ).toBe(3);
			expect(records[0].factionId).toBe("player");
			expect(records[0].hp).toBe(8);
			expect(records[0].maxHp).toBe(10);
			expect(records[0].ap).toBe(2);
			expect(records[0].maxAp).toBe(3);
			expect(records[0].modelId).toBe("sentinel-mk1");
			expect(records[0].gameId).toBe("g1");
		});

		it("replaces existing units with saved records", () => {
			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({ hp: 10, maxHp: 10, ap: 3, maxAp: 3, scanRange: 4 }),
			);

			const records = [
				{
					id: "saved-1",
					gameId: "g1",
					factionId: "player",
					tileX: 7,
					tileZ: 9,
					hp: 4,
					maxHp: 10,
					ap: 1,
					maxAp: 3,
					mp: 2,
					maxMp: 3,
					modelId: "infantry",
				},
			];

			applyUnits(world, records);

			// Old entity was destroyed, new one spawned from records
			const units = [...world.query(UnitPos, UnitFaction, UnitStats)];
			expect(units.length).toBe(1);
			const pos = units[0]!.get(UnitPos)!;
			expect(pos.tileX).toBe(7);
			expect(pos.tileZ).toBe(9);
			const stats = units[0]!.get(UnitStats)!;
			expect(stats.hp).toBe(4);
			expect(stats.ap).toBe(1);
		});

		it("round-trips through serialize then apply", () => {
			world.spawn(
				UnitPos({ tileX: 12, tileZ: 8 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({ hp: 5, maxHp: 10, ap: 0, maxAp: 3, scanRange: 4 }),
				UnitVisual({ modelId: "scout", scale: 1.0, facingAngle: 0 }),
			);

			const records = serializeUnits(world, "g1");

			// Apply saved state (destroys existing, respawns from records)
			applyUnits(world, records);

			const units = [...world.query(UnitPos, UnitFaction, UnitStats)];
			expect(units.length).toBe(1);
			const pos = units[0]!.get(UnitPos)!;
			expect(pos.tileX).toBe(12);
			expect(pos.tileZ).toBe(8);
			const stats = units[0]!.get(UnitStats)!;
			expect(stats.hp).toBe(5);
			expect(stats.ap).toBe(0);
		});
	});

	describe("serializeBuildings / applyBuildings", () => {
		it("serializes building type, faction, position, and HP", () => {
			world.spawn(
				Building({
					tileX: 4,
					tileZ: 6,
					buildingType: "storm_transmitter",
					factionId: "player",
					hp: 30,
					maxHp: 50,
					modelId: "",
				}),
			);

			const records = serializeBuildings(world, "g1");
			expect(records.length).toBe(1);
			expect(records[0].tileX).toBe(4);
			expect(records[0].tileZ).toBe(6);
			expect(records[0].type).toBe("storm_transmitter");
			expect(records[0].factionId).toBe("player");
			expect(records[0].hp).toBe(30);
			expect(records[0].maxHp).toBe(50);
		});

		it("applies saved building HP onto existing entities by position", () => {
			world.spawn(
				Building({
					tileX: 4,
					tileZ: 6,
					buildingType: "storm_transmitter",
					factionId: "player",
					hp: 50,
					maxHp: 50,
					modelId: "",
				}),
			);

			applyBuildings(world, [
				{
					id: "b-different",
					gameId: "g1",
					factionId: "player",
					tileX: 4,
					tileZ: 6,
					type: "storm_transmitter",
					hp: 20,
					maxHp: 50,
				},
			]);

			for (const entity of world.query(Building)) {
				const b = entity.get(Building)!;
				expect(b.hp).toBe(20);
			}
		});
	});

	describe("serializeExplored / applyExplored", () => {
		it("serializes only explored or partially visible tiles", () => {
			world.spawn(
				Tile({
					x: 0,
					z: 0,
					elevation: 0,
					passable: true,
					explored: true,
					visibility: 1.0,
				}),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
			);
			world.spawn(
				Tile({
					x: 1,
					z: 0,
					elevation: 0,
					passable: true,
					explored: false,
					visibility: 0.5,
				}),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
			);
			world.spawn(
				Tile({
					x: 2,
					z: 0,
					elevation: 0,
					passable: true,
					explored: false,
					visibility: 0,
				}),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
			);

			const records = serializeExplored(world, "g1");
			// Only tiles with explored=true or visibility > 0 are serialized
			expect(records.length).toBe(2);
			expect(records.find((r) => r.tileX === 0)?.explored).toBe(true);
			expect(records.find((r) => r.tileX === 1)?.visibility).toBe(0.5);
		});

		it("applies explored state and never reduces visibility", () => {
			const entity = world.spawn(
				Tile({
					x: 3,
					z: 3,
					elevation: 0,
					passable: true,
					explored: false,
					visibility: 0.8,
				}),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
			);

			applyExplored(world, [
				{ gameId: "g1", tileX: 3, tileZ: 3, explored: true, visibility: 0.5 },
			]);

			const tile = entity.get(Tile)!;
			expect(tile.explored).toBe(true);
			// visibility should be max(0.8, 0.5) = 0.8
			expect(tile.visibility).toBe(0.8);
		});

		it("applies higher visibility from save", () => {
			const entity = world.spawn(
				Tile({
					x: 0,
					z: 0,
					elevation: 0,
					passable: true,
					explored: false,
					visibility: 0.2,
				}),
				TileHighlight({ emissive: 0, color: 0x00ffaa, reason: "none" }),
			);

			applyExplored(world, [
				{ gameId: "g1", tileX: 0, tileZ: 0, explored: true, visibility: 1.0 },
			]);

			const tile = entity.get(Tile)!;
			expect(tile.explored).toBe(true);
			expect(tile.visibility).toBe(1.0);
		});
	});

	describe("serializeResources / applyResources", () => {
		it("serializes non-zero resources per faction", () => {
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
					iron_ore: 10,
					steel: 5,
					timber: 0,
					circuits: 0,
					coal: 0,
					glass: 0,
					fuel: 0,
					quantum_crystal: 0,
					stone: 3,
					sand: 0,
					alloy: 0,
				}),
			);

			const records = serializeResources(world, "g1");
			// Only non-zero: iron_ore=10, steel=5, stone=3
			expect(records.length).toBe(3);
			expect(records.find((r) => r.material === "iron_ore")?.amount).toBe(10);
			expect(records.find((r) => r.material === "steel")?.amount).toBe(5);
			expect(records.find((r) => r.material === "stone")?.amount).toBe(3);
		});

		it("applies saved resource amounts onto faction pools", () => {
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
					iron_ore: 0,
					steel: 0,
					timber: 0,
					circuits: 0,
					coal: 0,
					glass: 0,
					fuel: 0,
					quantum_crystal: 0,
					stone: 0,
					sand: 0,
					alloy: 0,
				}),
			);

			applyResources(world, [
				{
					gameId: "g1",
					factionId: "player",
					material: "iron_ore",
					amount: 42,
				},
				{
					gameId: "g1",
					factionId: "player",
					material: "fuel",
					amount: 7,
				},
			]);

			for (const entity of world.query(ResourcePool, Faction)) {
				const pool = entity.get(ResourcePool)!;
				expect(pool.iron_ore).toBe(42);
				expect(pool.fuel).toBe(7);
				// Others remain 0
				expect(pool.steel).toBe(0);
			}
		});
	});
});
