import { createWorld, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isPassableFor, movementCost } from "../../board/adjacency";
import type { TileData } from "../../board/types";
import { BIOME_DEFS, TileBiome } from "../../terrain";
import {
	Board,
	CombatResult,
	Tile,
	UnitAttack,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../traits";
import { resolveAttacks } from "../attackSystem";
import { effectiveScanRange, revealFog } from "../fogRevealSystem";

function makeTile(
	biome: string,
	x = 0,
	z = 0,
	elevation = 0 as -1 | 0 | 1 | 2,
): TileData {
	const def = BIOME_DEFS[biome as keyof typeof BIOME_DEFS];
	return {
		x,
		z,
		elevation,
		passable: biome !== "water" && biome !== "mountain",
		biomeType: biome as TileData["biomeType"],
		resourceMaterial: def?.resourceMaterial ?? null,
		resourceAmount: 0,
	};
}

describe("Terrain Tactics", () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	describe("Movement cost reads from BIOME_DEFS", () => {
		it("forest tile has movement cost 1.5", () => {
			const tile = makeTile("forest");
			expect(movementCost(tile)).toBe(1.5);
		});

		it("wetland tile has movement cost 2.0 for light units", () => {
			const tile = makeTile("wetland");
			expect(movementCost(tile, "light")).toBe(2.0);
		});

		it("wetland tile has movement cost 3 for heavy units", () => {
			const tile = makeTile("wetland");
			expect(movementCost(tile, "heavy")).toBe(3);
		});

		it("grassland tile has movement cost 1.0", () => {
			const tile = makeTile("grassland");
			expect(movementCost(tile)).toBe(1.0);
		});

		it("hills tile has movement cost 1.5", () => {
			const tile = makeTile("hills");
			expect(movementCost(tile)).toBe(1.5);
		});

		it("uphill adds elevation difference", () => {
			const tile = makeTile("grassland", 0, 0, 2);
			expect(movementCost(tile, "medium", 0)).toBe(3.0);
		});
	});

	describe("Defense bonus applies in combat", () => {
		it("forest +2 defense reduces damage", () => {
			// Defender on forest tile (defense bonus +2)
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
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

			// Spawn tile entity with forest biome at defender's position
			world.spawn(
				Tile({ x: 1, z: 0, elevation: 0, passable: true }),
				TileBiome({
					biomeType: "forest",
					mineable: true,
					hardness: 3,
					resourceMaterial: null,
					resourceAmount: 0,
					mined: false,
				}),
			);

			// Attacker adjacent
			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 5,
					defense: 0,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			// Need Board entity for turn reading
			world.spawn(Board({ width: 10, height: 10, seed: "test", turn: 1 }));

			resolveAttacks(world);

			// damage = max(1, 5 - (0 + 2)) = 3
			const stats = target.get(UnitStats);
			expect(stats?.hp).toBe(7);
		});

		it("grassland has no defense bonus", () => {
			const target = world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
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

			world.spawn(
				Tile({ x: 1, z: 0, elevation: 0, passable: true }),
				TileBiome({
					biomeType: "grassland",
					mineable: true,
					hardness: 1,
					resourceMaterial: null,
					resourceAmount: 0,
					mined: false,
				}),
			);

			world.spawn(
				UnitPos({ tileX: 0, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 3,
					maxAp: 3,
					scanRange: 4,
					attack: 5,
					defense: 0,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			world.spawn(Board({ width: 10, height: 10, seed: "test", turn: 1 }));

			resolveAttacks(world);

			// damage = max(1, 5 - 0) = 5
			const stats = target.get(UnitStats);
			expect(stats?.hp).toBe(5);
		});
	});

	describe("Vision modifier affects scan range", () => {
		it("hills +2 increases effective scan range", () => {
			world.spawn(
				Tile({ x: 5, z: 5, elevation: 0, passable: true }),
				TileBiome({
					biomeType: "hills",
					mineable: true,
					hardness: 3,
					resourceMaterial: null,
					resourceAmount: 0,
					mined: false,
				}),
			);

			const range = effectiveScanRange(world, 5, 5, 4);
			expect(range).toBe(6);
		});

		it("forest -2 decreases effective scan range", () => {
			world.spawn(
				Tile({ x: 3, z: 3, elevation: 0, passable: true }),
				TileBiome({
					biomeType: "forest",
					mineable: true,
					hardness: 3,
					resourceMaterial: null,
					resourceAmount: 0,
					mined: false,
				}),
			);

			const range = effectiveScanRange(world, 3, 3, 4);
			expect(range).toBe(2);
		});

		it("scan range cannot go below 1", () => {
			world.spawn(
				Tile({ x: 0, z: 0, elevation: 0, passable: true }),
				TileBiome({
					biomeType: "forest",
					mineable: true,
					hardness: 3,
					resourceMaterial: null,
					resourceAmount: 0,
					mined: false,
				}),
			);

			const range = effectiveScanRange(world, 0, 0, 1);
			expect(range).toBe(1);
		});
	});

	describe("Cover blocks ranged attacks from non-adjacent", () => {
		it("ranged attack from distance > 1 is blocked by forest cover", () => {
			const target = world.spawn(
				UnitPos({ tileX: 3, tileZ: 0 }),
				UnitFaction({ factionId: "player" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					scanRange: 4,
					attack: 2,
					defense: 0,
					attackRange: 1,
				}),
			);

			// Forest tile at defender position
			world.spawn(
				Tile({ x: 3, z: 0, elevation: 0, passable: true }),
				TileBiome({
					biomeType: "forest",
					mineable: true,
					hardness: 3,
					resourceMaterial: null,
					resourceAmount: 0,
					mined: false,
				}),
			);

			// Ranged attacker at distance 2
			world.spawn(
				UnitPos({ tileX: 1, tileZ: 0 }),
				UnitFaction({ factionId: "reclaimers" }),
				UnitStats({
					hp: 10,
					maxHp: 10,
					ap: 2,
					maxAp: 2,
					scanRange: 6,
					attack: 5,
					defense: 0,
					attackRange: 3,
				}),
				UnitAttack({ targetEntityId: target.id(), damage: 0 }),
			);

			world.spawn(Board({ width: 10, height: 10, seed: "test", turn: 1 }));

			resolveAttacks(world);

			// Ranged attack at distance 2 should be blocked by forest cover — no damage
			const stats = target.get(UnitStats);
			expect(stats?.hp).toBe(10);
		});
	});

	describe("Environmental drain", () => {
		it("desert has drain of 1", () => {
			expect(BIOME_DEFS.desert.environmentalDrain).toBe(1);
		});

		it("tundra has drain of 1", () => {
			expect(BIOME_DEFS.tundra.environmentalDrain).toBe(1);
		});

		it("grassland has no drain", () => {
			expect(BIOME_DEFS.grassland.environmentalDrain).toBe(0);
		});

		it("forest has no drain", () => {
			expect(BIOME_DEFS.forest.environmentalDrain).toBe(0);
		});
	});

	describe("Amphibious/aerial passability", () => {
		it("water is impassable by default", () => {
			const tile = makeTile("water");
			expect(isPassableFor(tile)).toBe(false);
		});

		it("water is passable for amphibious_recon", () => {
			const tile = makeTile("water");
			expect(isPassableFor(tile, "medium", "amphibious_recon")).toBe(true);
		});

		it("water is passable for marine", () => {
			const tile = makeTile("water");
			expect(isPassableFor(tile, "medium", "marine")).toBe(true);
		});

		it("mountain is passable for aerial_striker", () => {
			const tile = makeTile("mountain");
			expect(isPassableFor(tile, "medium", "aerial_striker")).toBe(true);
		});

		it("mountain is not passable for amphibious_recon", () => {
			const tile = makeTile("mountain");
			expect(isPassableFor(tile, "medium", "amphibious_recon")).toBe(false);
		});

		it("water is passable for aerial_striker", () => {
			const tile = makeTile("water");
			expect(isPassableFor(tile, "medium", "aerial_striker")).toBe(true);
		});
	});
});
