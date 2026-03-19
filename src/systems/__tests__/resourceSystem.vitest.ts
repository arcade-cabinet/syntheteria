import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { Faction } from "../../traits/faction";
import { ResourcePool } from "../../traits/resource";
import {
	addResources,
	canAfford,
	getPlayerResources,
	spendResources,
} from "../resourceSystem";

describe("resourceSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	function spawnFaction(
		id: string,
		isPlayer: boolean,
		pool: Partial<Record<string, number>> = {},
	) {
		return world.spawn(
			Faction({
				id,
				displayName: id,
				color: 0xffffff,
				persona: "otter",
				isPlayer,
				aggression: 0,
			}),
			ResourcePool(pool),
		);
	}

	describe("getPlayerResources", () => {
		it("returns player pool", () => {
			spawnFaction("player", true, { scrap_metal: 10, ferrous_scrap: 5 });
			spawnFaction("reclaimers", false, { scrap_metal: 20 });

			const res = getPlayerResources(world);
			expect(res).not.toBeNull();
			expect(res?.scrap_metal).toBe(10);
			expect(res?.ferrous_scrap).toBe(5);
		});

		it("returns null when no player faction exists", () => {
			spawnFaction("reclaimers", false, { scrap_metal: 20 });
			expect(getPlayerResources(world)).toBeNull();
		});
	});

	describe("addResources", () => {
		it("increases material count", () => {
			const entity = spawnFaction("player", true, { scrap_metal: 10 });

			addResources(world, "player", "scrap_metal", 5);

			const pool = entity.get(ResourcePool);
			expect(pool?.scrap_metal).toBe(15);
		});

		it("adds to zero-valued material", () => {
			const entity = spawnFaction("player", true);

			addResources(world, "player", "el_crystal", 3);

			const pool = entity.get(ResourcePool);
			expect(pool?.el_crystal).toBe(3);
		});

		it("does nothing for nonexistent faction", () => {
			spawnFaction("player", true, { scrap_metal: 10 });

			addResources(world, "nonexistent", "scrap_metal", 5);

			// Player resources unchanged
			const res = getPlayerResources(world);
			expect(res?.scrap_metal).toBe(10);
		});
	});

	describe("spendResources", () => {
		it("decreases material and returns true", () => {
			const entity = spawnFaction("player", true, { scrap_metal: 10 });

			const result = spendResources(world, "player", "scrap_metal", 3);

			expect(result).toBe(true);
			expect(entity.get(ResourcePool)?.scrap_metal).toBe(7);
		});

		it("returns false when insufficient", () => {
			const entity = spawnFaction("player", true, { scrap_metal: 2 });

			const result = spendResources(world, "player", "scrap_metal", 5);

			expect(result).toBe(false);
			// Pool unchanged
			expect(entity.get(ResourcePool)?.scrap_metal).toBe(2);
		});

		it("allows spending exact amount", () => {
			const entity = spawnFaction("player", true, { scrap_metal: 5 });

			const result = spendResources(world, "player", "scrap_metal", 5);

			expect(result).toBe(true);
			expect(entity.get(ResourcePool)?.scrap_metal).toBe(0);
		});

		it("returns false for nonexistent faction", () => {
			spawnFaction("player", true, { scrap_metal: 10 });

			expect(spendResources(world, "nonexistent", "scrap_metal", 1)).toBe(
				false,
			);
		});
	});

	describe("canAfford", () => {
		it("returns true when faction has enough", () => {
			spawnFaction("player", true, { scrap_metal: 10, ferrous_scrap: 5 });

			expect(
				canAfford(world, "player", { scrap_metal: 5, ferrous_scrap: 3 }),
			).toBe(true);
		});

		it("returns false when any material is insufficient", () => {
			spawnFaction("player", true, { scrap_metal: 10, ferrous_scrap: 1 });

			expect(
				canAfford(world, "player", { scrap_metal: 5, ferrous_scrap: 3 }),
			).toBe(false);
		});

		it("returns true for empty cost", () => {
			spawnFaction("player", true);
			expect(canAfford(world, "player", {})).toBe(true);
		});

		it("returns false for nonexistent faction", () => {
			expect(canAfford(world, "nonexistent", { scrap_metal: 1 })).toBe(false);
		});
	});
});
