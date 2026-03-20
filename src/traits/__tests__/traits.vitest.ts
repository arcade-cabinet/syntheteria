import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TileFloor } from "../../terrain/traits";
import { Board } from "../../traits/board";
import { Building } from "../../traits/building";
import { Faction, FactionRelation } from "../../traits/faction";
import { ResourceDeposit } from "../../traits/resource";
import { Tile, TileHighlight } from "../../traits/tile";
import {
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "../../traits/unit";

describe("Tile traits", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("spawns with defaults", () => {
		const e = world.spawn(Tile);
		const t = e.get(Tile)!;
		expect(t.x).toBe(0);
		expect(t.z).toBe(0);
		expect(t.elevation).toBe(0);
		expect(t.passable).toBe(true);
	});

	it("spawns with initial values", () => {
		const e = world.spawn(Tile({ x: 5, z: 3, elevation: 2, passable: false }));
		const t = e.get(Tile)!;
		expect(t.x).toBe(5);
		expect(t.z).toBe(3);
		expect(t.elevation).toBe(2);
		expect(t.passable).toBe(false);
	});

	it("sets and gets values", () => {
		const e = world.spawn(Tile);
		e.set(Tile, {
			x: 10,
			z: 20,
			elevation: 1,
			passable: false,
		});
		const t = e.get(Tile)!;
		expect(t.x).toBe(10);
		expect(t.z).toBe(20);
		expect(t.elevation).toBe(1);
	});

	it("removes trait", () => {
		const e = world.spawn(Tile);
		expect(e.has(Tile)).toBe(true);
		e.remove(Tile);
		expect(e.has(Tile)).toBe(false);
	});

	it("TileFloor defaults", () => {
		const e = world.spawn(TileFloor);
		const f = e.get(TileFloor)!;
		expect(f.floorType).toBe("durasteel_span");
		expect(f.mineable).toBe(false);
		expect(f.hardness).toBe(0);
		expect(f.resourceAmount).toBe(0);
	});

	it("TileFloor spawns with values", () => {
		const e = world.spawn(
			TileFloor({
				floorType: "collapsed_zone",
				mineable: true,
				hardness: 1,
				resourceMaterial: "scrap_metal",
				resourceAmount: 2,
			}),
		);
		const f = e.get(TileFloor)!;
		expect(f.floorType).toBe("collapsed_zone");
		expect(f.mineable).toBe(true);
		expect(f.resourceMaterial).toBe("scrap_metal");
		expect(f.resourceAmount).toBe(2);
	});

	it("TileHighlight defaults", () => {
		const e = world.spawn(TileHighlight);
		const h = e.get(TileHighlight)!;
		expect(h.emissive).toBe(0.0);
		expect(h.color).toBe(0x00ffaa);
		expect(h.reason).toBe("none");
	});
});

describe("Board trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("spawns with defaults", () => {
		const e = world.spawn(Board);
		const b = e.get(Board)!;
		expect(b.width).toBe(0);
		expect(b.height).toBe(0);
		expect(b.seed).toBe("");
		expect(b.tileSizeM).toBe(2.0);
		expect(b.turn).toBe(1);
	});

	it("sets values", () => {
		const e = world.spawn(
			Board({ width: 16, height: 16, seed: "abc", tileSizeM: 1.0, turn: 5 }),
		);
		const b = e.get(Board)!;
		expect(b.width).toBe(16);
		expect(b.seed).toBe("abc");
		expect(b.turn).toBe(5);
	});
});

describe("Unit traits", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("UnitPos defaults", () => {
		const e = world.spawn(UnitPos);
		const p = e.get(UnitPos)!;
		expect(p.tileX).toBe(0);
		expect(p.tileZ).toBe(0);
	});

	it("UnitMove defaults", () => {
		const e = world.spawn(UnitMove);
		const m = e.get(UnitMove)!;
		expect(m.progress).toBe(0.0);
		expect(m.mpCost).toBe(1);
	});

	it("UnitFaction defaults", () => {
		const e = world.spawn(UnitFaction);
		expect(e.get(UnitFaction)!.factionId).toBe("");
	});

	it("UnitStats defaults", () => {
		const e = world.spawn(UnitStats);
		const s = e.get(UnitStats)!;
		expect(s.hp).toBe(10);
		expect(s.maxHp).toBe(10);
		expect(s.ap).toBe(2);
		expect(s.maxAp).toBe(2);
		expect(s.mp).toBe(3);
		expect(s.maxMp).toBe(3);
		expect(s.scanRange).toBe(4);
	});

	it("UnitVisual defaults", () => {
		const e = world.spawn(UnitVisual);
		const v = e.get(UnitVisual)!;
		expect(v.modelId).toBe("");
		expect(v.scale).toBe(1.0);
		expect(v.facingAngle).toBe(0.0);
	});

	it("removes UnitMove from entity", () => {
		const e = world.spawn(UnitPos, UnitMove, UnitStats);
		expect(e.has(UnitMove)).toBe(true);
		e.remove(UnitMove);
		expect(e.has(UnitMove)).toBe(false);
		expect(e.has(UnitPos)).toBe(true);
	});
});

describe("Faction traits", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("Faction defaults", () => {
		const e = world.spawn(Faction);
		const f = e.get(Faction)!;
		expect(f.id).toBe("");
		expect(f.persona).toBe("otter");
		expect(f.isPlayer).toBe(false);
	});

	it("FactionRelation defaults", () => {
		const e = world.spawn(FactionRelation);
		const r = e.get(FactionRelation)!;
		expect(r.factionA).toBe("");
		expect(r.relation).toBe("neutral");
	});
});

describe("ResourceDeposit trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("defaults", () => {
		const e = world.spawn(ResourceDeposit);
		const r = e.get(ResourceDeposit)!;
		expect(r.material).toBe("scrap_metal");
		expect(r.amount).toBe(0);
		expect(r.depleted).toBe(false);
	});

	it("spawns with values", () => {
		const e = world.spawn(
			ResourceDeposit({
				tileX: 2,
				tileZ: 3,
				material: "thermal_fluid",
				amount: 50,
				depleted: false,
			}),
		);
		const r = e.get(ResourceDeposit)!;
		expect(r.material).toBe("thermal_fluid");
		expect(r.amount).toBe(50);
	});
});

describe("Building trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("defaults", () => {
		const e = world.spawn(Building);
		const b = e.get(Building)!;
		expect(b.buildingType).toBe("storage_hub");
		expect(b.hp).toBe(50);
		expect(b.factionId).toBe("");
	});

	it("spawns with values", () => {
		const e = world.spawn(
			Building({
				tileX: 1,
				tileZ: 1,
				buildingType: "synthesizer",
				factionId: "player",
				hp: 60,
				maxHp: 60,
			}),
		);
		const b = e.get(Building)!;
		expect(b.buildingType).toBe("synthesizer");
		expect(b.factionId).toBe("player");
		expect(b.hp).toBe(60);
	});
});
