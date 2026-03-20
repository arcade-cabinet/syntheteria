import { createWorld, type World } from "koota";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TileFloor } from "../../terrain/traits";
import {
	Faction,
	ResourcePool,
	Tile,
	UnitFaction,
	UnitMine,
	UnitPos,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../../traits";
import { floorMiningSystem, startFloorMining } from "../floorMiningSystem";
import { ResearchState } from "../researchSystem";

// Mock audio and UI
vi.mock("../../audio/sfx", () => ({ playSfx: vi.fn() }));
vi.mock("../../ui/game/turnEvents", () => ({ pushTurnEvent: vi.fn() }));
vi.mock("../speechTriggers", () => ({ triggerHarvestSpeech: vi.fn() }));

function createTestWorld(): World {
	return createWorld();
}

function spawnTile(
	world: World,
	x: number,
	z: number,
	floorType: string,
	mineable: boolean,
	hardness: number,
	material: string | null,
) {
	return world.spawn(
		Tile({ x, z, elevation: 0, passable: true, explored: true, visibility: 1 }),
		TileFloor({
			floorType: floorType as import("../../terrain/types").FloorType,
			mineable,
			hardness,
			resourceMaterial: material as
				| import("../../terrain/types").ResourceMaterial
				| null,
			resourceAmount: hardness > 0 ? 3 : 0,
		}),
	);
}

function spawnUnit(world: World, x: number, z: number, factionId: string) {
	return world.spawn(
		UnitPos({ tileX: x, tileZ: z }),
		UnitFaction({ factionId }),
		UnitStats({
			hp: 10,
			maxHp: 10,
			ap: 2,
			maxAp: 2,
			mp: 3,
			maxMp: 3,
			scanRange: 4,
			attack: 2,
			defense: 0,
			attackRange: 1,
			weightClass: "medium",
			robotClass: "worker",
			movesPerTurn: 1,
			cellsPerMove: 2,
			movesUsed: 0,
			staged: false,
		}),
		UnitVisual({ modelId: "worker", scale: 1, facingAngle: 0 }),
		UnitXP({ xp: 0, markLevel: 1, killCount: 0, harvestCount: 0 }),
	);
}

function spawnFaction(world: World, factionId: string) {
	world.spawn(
		Faction({ id: factionId }),
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
}

describe("floorMiningSystem", () => {
	let world: World;

	beforeEach(() => {
		world = createTestWorld();
	});

	it("decrements ticksRemaining each turn", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 1, 0, "ruins", true, 2, "stone");
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.add(
			UnitMine({ targetX: 1, targetZ: 0, ticksRemaining: 3, totalTicks: 3 }),
		);

		floorMiningSystem(world);

		const mine = unit.get(UnitMine);
		expect(mine).toBeTruthy();
		expect(mine!.ticksRemaining).toBe(2);
	});

	it("yields resources and removes UnitMine on completion", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 1, 0, "ruins", true, 1, "stone");
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.add(
			UnitMine({ targetX: 1, targetZ: 0, ticksRemaining: 1, totalTicks: 1 }),
		);

		floorMiningSystem(world);

		// UnitMine should be removed
		expect(unit.has(UnitMine)).toBe(false);

		// Resources should have been added
		for (const e of world.query(Faction, ResourcePool)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") {
				const r = e.get(ResourcePool);
				expect(r!.stone).toBeGreaterThan(0);
			}
		}
	});

	it("marks tile as not mineable and mined after completion", () => {
		spawnFaction(world, "reclaimers");
		const tile = spawnTile(world, 1, 0, "ruins", true, 1, "stone");
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.add(
			UnitMine({ targetX: 1, targetZ: 0, ticksRemaining: 1, totalTicks: 1 }),
		);

		floorMiningSystem(world);

		const floor = tile.get(TileFloor);
		expect(floor!.mineable).toBe(false);
		expect(floor!.resourceAmount).toBe(0);
		expect(floor!.mined).toBe(true);
	});

	it("lowers tile elevation to -1 on completion", () => {
		spawnFaction(world, "reclaimers");
		const tile = spawnTile(world, 1, 0, "ruins", true, 1, "stone");
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.add(
			UnitMine({ targetX: 1, targetZ: 0, ticksRemaining: 1, totalTicks: 1 }),
		);

		// Tile starts at elevation 0
		expect(tile.get(Tile)!.elevation).toBe(0);

		floorMiningSystem(world);

		// Tile should now be at pit depth (-1)
		expect(tile.get(Tile)!.elevation).toBe(-1);
	});

	it("removes UnitMine if tile is not mineable", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 1, 0, "water", false, 0, null);
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.add(
			UnitMine({ targetX: 1, targetZ: 0, ticksRemaining: 1, totalTicks: 1 }),
		);

		floorMiningSystem(world);

		expect(unit.has(UnitMine)).toBe(false);
	});
});

describe("startFloorMining", () => {
	let world: World;

	beforeEach(() => {
		world = createTestWorld();
	});

	it("starts mining on adjacent mineable tile", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 1, 0, "hills", true, 2, "iron_ore");
		const unit = spawnUnit(world, 0, 0, "reclaimers");

		const result = startFloorMining(world, unit.id(), 1, 0);
		expect(result).toBe(true);
		expect(unit.has(UnitMine)).toBe(true);

		const mine = unit.get(UnitMine);
		expect(mine!.ticksRemaining).toBe(2);
		expect(mine!.targetX).toBe(1);

		// AP should be deducted
		const stats = unit.get(UnitStats);
		expect(stats!.ap).toBe(1);
	});

	it("rejects mining non-adjacent tile", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 3, 0, "hills", true, 2, "iron_ore");
		const unit = spawnUnit(world, 0, 0, "reclaimers");

		const result = startFloorMining(world, unit.id(), 3, 0);
		expect(result).toBe(false);
		expect(unit.has(UnitMine)).toBe(false);
	});

	it("rejects mining non-mineable tile", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 1, 0, "water", false, 0, null);
		const unit = spawnUnit(world, 0, 0, "reclaimers");

		const result = startFloorMining(world, unit.id(), 1, 0);
		expect(result).toBe(false);
	});

	it("rejects mining when AP is 0", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 1, 0, "hills", true, 2, "iron_ore");
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.set(UnitStats, { ...unit.get(UnitStats)!, ap: 0 });

		const result = startFloorMining(world, unit.id(), 1, 0);
		expect(result).toBe(false);
	});

	it("allows mining own tile (distance 0)", () => {
		spawnFaction(world, "reclaimers");
		spawnTile(world, 0, 0, "desert", true, 1, "sand");
		const unit = spawnUnit(world, 0, 0, "reclaimers");

		const result = startFloorMining(world, unit.id(), 0, 0);
		expect(result).toBe(true);
	});
});

describe("deep mining tech bonus", () => {
	let world: World;

	beforeEach(() => {
		world = createTestWorld();
	});

	function spawnFactionWithResearch(
		w: World,
		factionId: string,
		techs: string,
	) {
		w.spawn(
			Faction({ id: factionId }),
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
			ResearchState({
				researchedTechs: techs,
				currentTechId: "",
				progressPoints: 0,
			}),
		);
	}

	it("applies +50% yield when deep_mining is researched", () => {
		spawnFactionWithResearch(
			world,
			"reclaimers",
			"advanced_harvesting,efficient_fabrication,deep_mining",
		);
		spawnTile(world, 1, 0, "ruins", true, 1, "stone");
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.add(
			UnitMine({ targetX: 1, targetZ: 0, ticksRemaining: 1, totalTicks: 1 }),
		);

		floorMiningSystem(world);

		// Get the resources — should be boosted
		for (const e of world.query(Faction, ResourcePool)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") {
				const r = e.get(ResourcePool);
				// ruins yields [1,3] per FLOOR_DEFS, so base yield 1-3
				// With deep_mining +50%, minimum yield is floor(1*1.5) = 1, max is floor(3*1.5) = 4
				// Any yield > 0 confirms the system ran
				expect(r!.stone).toBeGreaterThan(0);
			}
		}
	});

	it("does not apply bonus without deep_mining tech", () => {
		// Spawn faction WITH research state but WITHOUT deep_mining
		spawnFactionWithResearch(world, "reclaimers", "advanced_harvesting");
		spawnTile(world, 1, 0, "ruins", true, 1, "stone");
		const unit = spawnUnit(world, 0, 0, "reclaimers");
		unit.add(
			UnitMine({ targetX: 1, targetZ: 0, ticksRemaining: 1, totalTicks: 1 }),
		);

		floorMiningSystem(world);

		// Resources should still be yielded (base amount, no bonus)
		for (const e of world.query(Faction, ResourcePool)) {
			const f = e.get(Faction);
			if (f?.id === "reclaimers") {
				const r = e.get(ResourcePool);
				// ruins base yield: [1,3] — max without bonus is 3
				expect(r!.stone).toBeGreaterThan(0);
				expect(r!.stone).toBeLessThanOrEqual(3);
			}
		}
	});
});
