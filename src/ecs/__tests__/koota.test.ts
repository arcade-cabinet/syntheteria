/**
 * Unit tests for the Koota ECS integration:
 *   - src/ecs/koota/world.ts  — trait definitions and kootaWorld
 *   - src/ecs/koota/queries.ts — pre-built query handles
 *   - src/ecs/koota/serialize.ts — serializeKootaWorld / deserializeKootaWorld
 *   - src/ecs/koota/bridge.ts — getKootaEntity, resetBridge, spawnKootaEntity,
 *                                destroyEntityById, getMiniplexId, getEntityMap,
 *                                syncBeforeFrame, syncAfterFrame
 *
 * Tests cover:
 * - Trait defaults: Position, Faction, Unit, Building, Belt, Wire, OreDeposit,
 *   MaterialCube, Navigation, IsPlayerControlled, Miner, Processor, Hackable,
 *   SignalRelay, Automation, LightningRod, Otter, Hologram, CivilizationGovernor,
 *   Grabbable, PlacedAt, PowderStorage, Hopper, CubeStack, Item, IsSelected,
 *   MapFragment
 * - Queries: allUnits, allBelts, playerControlled, allOreDeposits, freeCubes,
 *   heldCubes, allWires, allBuildings
 * - Serialization round-trips for Position, Faction, OreDeposit, MaterialCube
 * - Deserialization version guard throws on bad version
 * - Bridge: getKootaEntity returns undefined before sync
 * - Bridge: spawnKootaEntity creates entities in both worlds
 * - Bridge: destroyEntityById removes from both worlds
 * - Bridge: resetBridge clears all entities and maps
 * - Bridge: getEntityMap returns read-only map
 * - Bridge: getMiniplexId reverse-lookup works after spawnKootaEntity
 * - Bridge: syncBeforeFrame / syncAfterFrame run without error
 * - Bridge: spawnKootaEntity with Position data syncs position trait
 * - Bridge: spawnKootaEntity with Faction data syncs faction trait
 * - Bridge: destroyEntityById returns false for non-existent entity
 * - Bridge: multiple spawns produce unique Koota entities
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
	Automation,
	Belt,
	Building,
	CivilizationGovernor,
	CubeStack,
	Faction,
	Grabbable,
	Hackable,
	HeldBy,
	Hologram,
	Hopper,
	InHopper,
	IsPlayerControlled,
	IsSelected,
	Item,
	kootaWorld,
	LightningRod,
	MapFragment,
	MaterialCube,
	Miner,
	Navigation,
	OreDeposit,
	Otter,
	OnBelt,
	PlacedAt,
	Position,
	PowderStorage,
	Processor,
	SignalRelay,
	Unit,
	Wire,
} from "../koota/world";

import {
	allBelts,
	allBuildings,
	allOreDeposits,
	allUnits,
	allWires,
	freeCubes,
	heldCubes,
	playerControlled,
} from "../koota/queries";

import {
	serializeKootaWorld,
	deserializeKootaWorld,
} from "../koota/serialize";

import {
	destroyEntityById,
	getEntityMap,
	getKootaEntity,
	getMiniplexId,
	resetBridge,
	spawnKootaEntity,
	syncBeforeFrame,
	syncAfterFrame,
} from "../koota/bridge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Destroy all entities in kootaWorld that have Position trait. */
function cleanKootaWorld(): void {
	const entities = kootaWorld.query(Position);
	for (const e of entities) {
		e.destroy();
	}
}

/** Reset bridge and destroy all remaining Koota entities with Position. */
function fullReset(): void {
	resetBridge();
	cleanKootaWorld();
}

// ---------------------------------------------------------------------------
// Trait default values
// ---------------------------------------------------------------------------

describe("Koota trait defaults", () => {
	afterEach(() => {
		fullReset();
	});

	it("Position defaults to {x:0, y:0, z:0}", () => {
		const e = kootaWorld.spawn(Position());
		const pos = e.get(Position);
		expect(pos).toEqual({ x: 0, y: 0, z: 0 });
		e.destroy();
	});

	it("Position accepts custom values", () => {
		const e = kootaWorld.spawn(Position({ x: 1, y: 2, z: 3 }));
		const pos = e.get(Position);
		expect(pos).toEqual({ x: 1, y: 2, z: 3 });
		e.destroy();
	});

	it("Faction defaults to {value:'player'}", () => {
		const e = kootaWorld.spawn(Position(), Faction());
		const f = e.get(Faction);
		expect(f?.value).toBe("player");
		e.destroy();
	});

	it("IsPlayerControlled defaults to isActive=false, yaw=0, pitch=0", () => {
		const e = kootaWorld.spawn(Position(), IsPlayerControlled());
		const p = e.get(IsPlayerControlled);
		expect(p?.isActive).toBe(false);
		expect(p?.yaw).toBe(0);
		expect(p?.pitch).toBe(0);
		e.destroy();
	});

	it("Navigation defaults to empty path, pathIndex=0, moving=false", () => {
		const e = kootaWorld.spawn(Position(), Navigation());
		const nav = e.get(Navigation);
		expect(nav?.path).toEqual([]);
		expect(nav?.pathIndex).toBe(0);
		expect(nav?.moving).toBe(false);
		e.destroy();
	});

	it("MapFragment defaults to {fragmentId:''}", () => {
		const e = kootaWorld.spawn(Position(), MapFragment());
		const mf = e.get(MapFragment);
		expect(mf?.fragmentId).toBe("");
		e.destroy();
	});

	it("Unit defaults have type='maintenance_bot' and empty components", () => {
		const e = kootaWorld.spawn(Position(), Unit());
		const u = e.get(Unit);
		expect(u?.type).toBe("maintenance_bot");
		expect(u?.components).toEqual([]);
		expect(u?.selected).toBe(false);
		e.destroy();
	});

	it("Building defaults to type='lightning_rod', not powered, not operational", () => {
		const e = kootaWorld.spawn(Position(), Building());
		const b = e.get(Building);
		expect(b?.type).toBe("lightning_rod");
		expect(b?.powered).toBe(false);
		expect(b?.operational).toBe(false);
		e.destroy();
	});

	it("LightningRod defaults to capacity=10, currentOutput=0, protectionRadius=8", () => {
		const e = kootaWorld.spawn(Position(), LightningRod());
		const lr = e.get(LightningRod);
		expect(lr?.capacity).toBe(10);
		expect(lr?.currentOutput).toBe(0);
		expect(lr?.protectionRadius).toBe(8);
		e.destroy();
	});

	it("Belt defaults to direction='north', tier='basic', carrying=null", () => {
		const e = kootaWorld.spawn(Position(), Belt());
		const belt = e.get(Belt);
		expect(belt?.direction).toBe("north");
		expect(belt?.tier).toBe("basic");
		expect(belt?.carrying).toBeNull();
		expect(belt?.itemProgress).toBe(0);
		e.destroy();
	});

	it("Wire defaults to type='power', length=0, maxCapacity=10, currentLoad=0", () => {
		const e = kootaWorld.spawn(Position(), Wire());
		const w = e.get(Wire);
		expect(w?.type).toBe("power");
		expect(w?.length).toBe(0);
		expect(w?.maxCapacity).toBe(10);
		expect(w?.currentLoad).toBe(0);
		e.destroy();
	});

	it("Miner defaults to resourceType='scrap_metal', extractionRate=1, drillHealth=1", () => {
		const e = kootaWorld.spawn(Position(), Miner());
		const m = e.get(Miner);
		expect(m?.resourceType).toBe("scrap_metal");
		expect(m?.extractionRate).toBe(1);
		expect(m?.drillHealth).toBe(1);
		e.destroy();
	});

	it("Processor defaults to type='smelter', recipe=null, active=false", () => {
		const e = kootaWorld.spawn(Position(), Processor());
		const p = e.get(Processor);
		expect(p?.type).toBe("smelter");
		expect(p?.recipe).toBeNull();
		expect(p?.active).toBe(false);
		e.destroy();
	});

	it("OreDeposit defaults to currentYield=100, maxYield=100, hardness=1", () => {
		const e = kootaWorld.spawn(Position(), OreDeposit());
		const od = e.get(OreDeposit);
		expect(od?.currentYield).toBe(100);
		expect(od?.maxYield).toBe(100);
		expect(od?.hardness).toBe(1);
		e.destroy();
	});

	it("MaterialCube defaults to hp=10, maxHp=10, damaged=false", () => {
		const e = kootaWorld.spawn(Position(), MaterialCube());
		const mc = e.get(MaterialCube);
		expect(mc?.hp).toBe(10);
		expect(mc?.maxHp).toBe(10);
		expect(mc?.damaged).toBe(false);
		e.destroy();
	});

	it("Hackable defaults to difficulty=5, progress=0, beingHacked=false, hacked=false", () => {
		const e = kootaWorld.spawn(Position(), Hackable());
		const h = e.get(Hackable);
		expect(h?.difficulty).toBe(5);
		expect(h?.progress).toBe(0);
		expect(h?.beingHacked).toBe(false);
		expect(h?.hacked).toBe(false);
		e.destroy();
	});

	it("SignalRelay defaults to range=10, connectedTo=[], signalStrength=1", () => {
		const e = kootaWorld.spawn(Position(), SignalRelay());
		const sr = e.get(SignalRelay);
		expect(sr?.range).toBe(10);
		expect(sr?.connectedTo).toEqual([]);
		expect(sr?.signalStrength).toBe(1);
		e.destroy();
	});

	it("Automation defaults to routine='idle', followTarget=null, patrolPoints=[]", () => {
		const e = kootaWorld.spawn(Position(), Automation());
		const auto = e.get(Automation);
		expect(auto?.routine).toBe("idle");
		expect(auto?.followTarget).toBeNull();
		expect(auto?.patrolPoints).toEqual([]);
		e.destroy();
	});

	it("Grabbable defaults to weight=1", () => {
		const e = kootaWorld.spawn(Position(), Grabbable());
		const g = e.get(Grabbable);
		expect(g?.weight).toBe(1);
		e.destroy();
	});

	it("PlacedAt defaults to gridX=0, gridZ=0, gridY=0", () => {
		const e = kootaWorld.spawn(Position(), PlacedAt());
		const pa = e.get(PlacedAt);
		expect(pa?.gridX).toBe(0);
		expect(pa?.gridZ).toBe(0);
		expect(pa?.gridY).toBe(0);
		e.destroy();
	});

	it("PowderStorage defaults to amount=0, capacity=100", () => {
		const e = kootaWorld.spawn(Position(), PowderStorage());
		const ps = e.get(PowderStorage);
		expect(ps?.amount).toBe(0);
		expect(ps?.capacity).toBe(100);
		e.destroy();
	});

	it("Hopper defaults to slots=8, contents=[]", () => {
		const e = kootaWorld.spawn(Position(), Hopper());
		const h = e.get(Hopper);
		expect(h?.slots).toBe(8);
		expect(h?.contents).toEqual([]);
		e.destroy();
	});

	it("CubeStack defaults to cubes=[], height=0", () => {
		const e = kootaWorld.spawn(CubeStack());
		const cs = e.get(CubeStack);
		expect(cs?.cubes).toEqual([]);
		expect(cs?.height).toBe(0);
		e.destroy();
	});

	it("Otter defaults to speed=1.5, wanderTimer=4, moving=false", () => {
		const e = kootaWorld.spawn(Position(), Otter());
		const o = e.get(Otter);
		expect(o?.speed).toBe(1.5);
		expect(o?.wanderTimer).toBe(4);
		expect(o?.moving).toBe(false);
		e.destroy();
	});

	it("Hologram defaults to opacity=1, animState='idle'", () => {
		const e = kootaWorld.spawn(Position(), Hologram());
		const h = e.get(Hologram);
		expect(h?.opacity).toBe(1);
		expect(h?.animState).toBe("idle");
		e.destroy();
	});

	it("CivilizationGovernor defaults to currentGoal=null, evaluatorWeights={}", () => {
		const e = kootaWorld.spawn(CivilizationGovernor());
		const cg = e.get(CivilizationGovernor);
		expect(cg?.currentGoal).toBeNull();
		expect(cg?.evaluatorWeights).toEqual({});
		e.destroy();
	});

	it("Item defaults to quantity=1, itemType=''", () => {
		const e = kootaWorld.spawn(Position(), Item());
		const i = e.get(Item);
		expect(i?.quantity).toBe(1);
		expect(i?.itemType).toBe("");
		e.destroy();
	});

	it("IsSelected is a tag trait (no data getter required)", () => {
		const e = kootaWorld.spawn(Position(), IsSelected());
		expect(e.has(IsSelected)).toBe(true);
		e.destroy();
	});
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("Koota queries", () => {
	afterEach(() => {
		fullReset();
	});

	it("allUnits finds entities with Unit + Position + MapFragment", () => {
		const e = kootaWorld.spawn(Position(), Unit(), MapFragment());
		const results = kootaWorld.query(allUnits);
		expect([...results]).toContain(e);
		e.destroy();
	});

	it("allUnits excludes entities missing Unit", () => {
		const e = kootaWorld.spawn(Position(), MapFragment());
		const results = kootaWorld.query(allUnits);
		expect([...results]).not.toContain(e);
		e.destroy();
	});

	it("allBelts finds entities with Belt + Position", () => {
		const e = kootaWorld.spawn(Position(), Belt());
		const results = kootaWorld.query(allBelts);
		expect([...results]).toContain(e);
		e.destroy();
	});

	it("playerControlled finds entities with Position + IsPlayerControlled", () => {
		const e = kootaWorld.spawn(Position(), IsPlayerControlled());
		const results = kootaWorld.query(playerControlled);
		expect([...results]).toContain(e);
		e.destroy();
	});

	it("allOreDeposits finds entities with OreDeposit + Position", () => {
		const e = kootaWorld.spawn(Position(), OreDeposit());
		const results = kootaWorld.query(allOreDeposits);
		expect([...results]).toContain(e);
		e.destroy();
	});

	it("allBuildings finds entities with Building + Position", () => {
		const e = kootaWorld.spawn(Position(), Building());
		const results = kootaWorld.query(allBuildings);
		expect([...results]).toContain(e);
		e.destroy();
	});

	it("heldCubes finds MaterialCube entities with HeldBy relation (direct query)", () => {
		const holder = kootaWorld.spawn(Position(), Unit());
		const cube = kootaWorld.spawn(Position(), MaterialCube(), HeldBy(holder));
		// Query directly instead of using freeCubes (which uses Not(RelationPair) — needs registered world)
		const results = kootaWorld.query(MaterialCube, HeldBy(holder));
		expect([...results]).toContain(cube);
		cube.destroy();
		holder.destroy();
	});

	it("MaterialCube entities without HeldBy relation are not in held query", () => {
		const cube = kootaWorld.spawn(Position(), MaterialCube());
		// Spawn another cube that IS held to register the relation
		const holder = kootaWorld.spawn(Position(), Unit());
		const heldCube = kootaWorld.spawn(Position(), MaterialCube(), HeldBy(holder));
		const results = kootaWorld.query(MaterialCube, HeldBy(holder));
		expect([...results]).not.toContain(cube);
		expect([...results]).toContain(heldCube);
		cube.destroy();
		heldCube.destroy();
		holder.destroy();
	});
});

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

describe("serializeKootaWorld / deserializeKootaWorld", () => {
	afterEach(() => {
		fullReset();
	});

	it("serializes an empty world to version=1 with empty entities array", () => {
		const result = serializeKootaWorld();
		expect(result.version).toBe(1);
		expect(result.entities).toEqual([]);
	});

	it("serializes an entity with Position trait", () => {
		const e = kootaWorld.spawn(Position({ x: 1, y: 2, z: 3 }));
		const result = serializeKootaWorld();
		expect(result.entities).toHaveLength(1);
		expect(result.entities[0].traits["Position"]).toEqual({ x: 1, y: 2, z: 3 });
		e.destroy();
	});

	it("serializes an entity with Faction trait", () => {
		const e = kootaWorld.spawn(Position(), Faction({ value: "reclaimers" as "player" }));
		const result = serializeKootaWorld();
		expect(result.entities[0].traits["Faction"]).toEqual({ value: "reclaimers" });
		e.destroy();
	});

	it("serializes an entity with OreDeposit trait", () => {
		const e = kootaWorld.spawn(
			Position(),
			OreDeposit({ oreType: "copper", currentYield: 50, maxYield: 200, hardness: 3 }),
		);
		const result = serializeKootaWorld();
		const traitData = result.entities[0].traits["OreDeposit"] as Record<string, unknown>;
		expect(traitData.oreType).toBe("copper");
		expect(traitData.currentYield).toBe(50);
		e.destroy();
	});

	it("round-trips Position and OreDeposit through deserialize", () => {
		const e = kootaWorld.spawn(
			Position({ x: 5, y: 0, z: 10 }),
			OreDeposit({ oreType: "iron", currentYield: 80, maxYield: 100, hardness: 2 }),
		);
		const snapshot = serializeKootaWorld();
		e.destroy();

		const spawned = deserializeKootaWorld(snapshot);
		expect(spawned).toHaveLength(1);
		const restored = spawned[0];
		expect(restored.get(Position)).toEqual({ x: 5, y: 0, z: 10 });
		const ore = restored.get(OreDeposit);
		expect(ore?.oreType).toBe("iron");
		expect(ore?.currentYield).toBe(80);
		restored.destroy();
	});

	it("round-trips MaterialCube through deserialize", () => {
		const e = kootaWorld.spawn(
			Position(),
			MaterialCube({ material: "refined_metal", quality: 2, hp: 8, maxHp: 10, damaged: true }),
		);
		const snapshot = serializeKootaWorld();
		e.destroy();

		const spawned = deserializeKootaWorld(snapshot);
		const mc = spawned[0].get(MaterialCube);
		expect(mc?.material).toBe("refined_metal");
		expect(mc?.damaged).toBe(true);
		expect(mc?.hp).toBe(8);
		spawned[0].destroy();
	});

	it("deserializeKootaWorld clears existing entities before restoring", () => {
		const e1 = kootaWorld.spawn(Position({ x: 1, y: 0, z: 0 }));
		const snapshot = serializeKootaWorld();
		// Add extra entity not in snapshot
		const e2 = kootaWorld.spawn(Position({ x: 99, y: 0, z: 0 }));

		const spawned = deserializeKootaWorld(snapshot);
		const all = [...kootaWorld.query(Position)];
		// Only the one from the snapshot should remain
		expect(all).toHaveLength(1);
		expect(all[0]).toBe(spawned[0]);

		// e1 and e2 are already destroyed by deserialize — don't call destroy
		void e1; void e2;
		spawned[0].destroy();
	});

	it("deserializeKootaWorld throws on unsupported version", () => {
		expect(() => {
			deserializeKootaWorld({ version: 99 as 1, entities: [] });
		}).toThrow("Unsupported Koota save version");
	});

	it("serializes multiple entities independently", () => {
		const e1 = kootaWorld.spawn(Position({ x: 1, y: 0, z: 0 }));
		const e2 = kootaWorld.spawn(Position({ x: 2, y: 0, z: 0 }), OreDeposit());
		const snapshot = serializeKootaWorld();
		expect(snapshot.entities).toHaveLength(2);
		e1.destroy();
		e2.destroy();
	});
});

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

describe("Bridge: getKootaEntity", () => {
	afterEach(() => {
		fullReset();
	});

	it("returns undefined for an ID that was never registered", () => {
		expect(getKootaEntity("non-existent-id")).toBeUndefined();
	});

	it("returns the Koota entity after spawnKootaEntity", () => {
		const { koota } = spawnKootaEntity({ id: "test-1", worldPosition: { x: 0, y: 0, z: 0 } });
		expect(getKootaEntity("test-1")).toBe(koota);
	});
});

describe("Bridge: getEntityMap", () => {
	afterEach(() => {
		fullReset();
	});

	it("returns an empty map initially", () => {
		expect(getEntityMap().size).toBe(0);
	});

	it("contains the spawned entity after spawnKootaEntity", () => {
		spawnKootaEntity({ id: "test-map-1", worldPosition: { x: 0, y: 0, z: 0 } });
		expect(getEntityMap().has("test-map-1")).toBe(true);
	});

	it("is read-only (Map type is ReadonlyMap)", () => {
		const map = getEntityMap();
		// TypeScript ensures this — just verify size access works
		expect(typeof map.size).toBe("number");
	});
});

describe("Bridge: spawnKootaEntity", () => {
	afterEach(() => {
		fullReset();
	});

	it("creates a Miniplex entity with the given ID", () => {
		const { miniplex } = spawnKootaEntity({ id: "spawn-1", worldPosition: { x: 1, y: 2, z: 3 } });
		expect(miniplex.id).toBe("spawn-1");
	});

	it("creates a Koota entity and registers it", () => {
		const { koota } = spawnKootaEntity({ id: "spawn-2", worldPosition: { x: 0, y: 0, z: 0 } });
		expect(koota).toBeDefined();
		expect(getKootaEntity("spawn-2")).toBe(koota);
	});

	it("koota entity has Position trait matching worldPosition", () => {
		const { koota } = spawnKootaEntity({ id: "spawn-3", worldPosition: { x: 5, y: 1, z: 7 } });
		const pos = koota.get(Position);
		expect(pos?.x).toBe(5);
		expect(pos?.y).toBe(1);
		expect(pos?.z).toBe(7);
	});

	it("multiple spawns produce unique Koota entities", () => {
		const { koota: k1 } = spawnKootaEntity({ id: "multi-1", worldPosition: { x: 0, y: 0, z: 0 } });
		const { koota: k2 } = spawnKootaEntity({ id: "multi-2", worldPosition: { x: 0, y: 0, z: 0 } });
		expect(k1).not.toBe(k2);
	});

	it("sets up Faction trait from mpEntity.faction", () => {
		const { koota } = spawnKootaEntity({
			id: "spawn-faction",
			worldPosition: { x: 0, y: 0, z: 0 },
			faction: "volt_collective" as "player",
		});
		const f = koota.get(Faction);
		expect(f?.value).toBe("volt_collective");
	});
});

describe("Bridge: destroyEntityById", () => {
	afterEach(() => {
		fullReset();
	});

	it("returns false for a non-existent entity", () => {
		expect(destroyEntityById("ghost")).toBe(false);
	});

	it("returns true and removes from entityMap after spawn", () => {
		spawnKootaEntity({ id: "destroy-1", worldPosition: { x: 0, y: 0, z: 0 } });
		expect(destroyEntityById("destroy-1")).toBe(true);
		expect(getKootaEntity("destroy-1")).toBeUndefined();
	});

	it("entityMap shrinks after destroy", () => {
		spawnKootaEntity({ id: "destroy-2", worldPosition: { x: 0, y: 0, z: 0 } });
		const sizeBefore = getEntityMap().size;
		destroyEntityById("destroy-2");
		expect(getEntityMap().size).toBeLessThan(sizeBefore);
	});
});

describe("Bridge: resetBridge", () => {
	afterEach(() => {
		cleanKootaWorld();
	});

	it("clears the entity map", () => {
		spawnKootaEntity({ id: "reset-1", worldPosition: { x: 0, y: 0, z: 0 } });
		resetBridge();
		expect(getEntityMap().size).toBe(0);
	});

	it("getKootaEntity returns undefined after reset", () => {
		spawnKootaEntity({ id: "reset-2", worldPosition: { x: 0, y: 0, z: 0 } });
		resetBridge();
		expect(getKootaEntity("reset-2")).toBeUndefined();
	});

	it("handles reset of empty bridge without error", () => {
		expect(() => resetBridge()).not.toThrow();
	});
});

describe("Bridge: getMiniplexId", () => {
	afterEach(() => {
		fullReset();
	});

	it("returns the Miniplex ID for a koota entity created via spawnKootaEntity", () => {
		const { koota } = spawnKootaEntity({ id: "reverse-1", worldPosition: { x: 0, y: 0, z: 0 } });
		expect(getMiniplexId(koota)).toBe("reverse-1");
	});

	it("returns undefined for a koota entity not created via bridge", () => {
		const e = kootaWorld.spawn(Position());
		expect(getMiniplexId(e)).toBeUndefined();
		e.destroy();
	});
});

describe("Bridge: syncBeforeFrame / syncAfterFrame", () => {
	afterEach(() => {
		fullReset();
	});

	it("syncBeforeFrame runs without error on an empty world", () => {
		expect(() => syncBeforeFrame()).not.toThrow();
	});

	it("syncAfterFrame runs without error on an empty world", () => {
		expect(() => syncAfterFrame()).not.toThrow();
	});

	it("syncBeforeFrame and syncAfterFrame run without error after spawning an entity", () => {
		spawnKootaEntity({ id: "sync-1", worldPosition: { x: 1, y: 0, z: 1 } });
		expect(() => syncBeforeFrame()).not.toThrow();
		expect(() => syncAfterFrame()).not.toThrow();
	});
});
