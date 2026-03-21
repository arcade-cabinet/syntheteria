import { createWorld } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { Faction, ResourcePool } from "../../traits";
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
			spawnFaction("player", true, { stone: 10, iron_ore: 5 });
			spawnFaction("reclaimers", false, { stone: 20 });

			const res = getPlayerResources(world);
			expect(res).not.toBeNull();
			expect(res?.stone).toBe(10);
			expect(res?.iron_ore).toBe(5);
		});

		it("returns null when no player faction exists", () => {
			spawnFaction("reclaimers", false, { stone: 20 });
			expect(getPlayerResources(world)).toBeNull();
		});
	});

	describe("addResources", () => {
		it("increases material count", () => {
			const entity = spawnFaction("player", true, { stone: 10 });

			addResources(world, "player", "stone", 5);

			const pool = entity.get(ResourcePool);
			expect(pool?.stone).toBe(15);
		});

		it("adds to zero-valued material", () => {
			const entity = spawnFaction("player", true);

			addResources(world, "player", "quantum_crystal", 3);

			const pool = entity.get(ResourcePool);
			expect(pool?.quantum_crystal).toBe(3);
		});

		it("does nothing for nonexistent faction", () => {
			spawnFaction("player", true, { stone: 10 });

			addResources(world, "nonexistent", "stone", 5);

			// Player resources unchanged
			const res = getPlayerResources(world);
			expect(res?.stone).toBe(10);
		});
	});

	describe("spendResources", () => {
		it("decreases material and returns true", () => {
			const entity = spawnFaction("player", true, { stone: 10 });

			const result = spendResources(world, "player", "stone", 3);

			expect(result).toBe(true);
			expect(entity.get(ResourcePool)?.stone).toBe(7);
		});

		it("returns false when insufficient", () => {
			const entity = spawnFaction("player", true, { stone: 2 });

			const result = spendResources(world, "player", "stone", 5);

			expect(result).toBe(false);
			// Pool unchanged
			expect(entity.get(ResourcePool)?.stone).toBe(2);
		});

		it("allows spending exact amount", () => {
			const entity = spawnFaction("player", true, { stone: 5 });

			const result = spendResources(world, "player", "stone", 5);

			expect(result).toBe(true);
			expect(entity.get(ResourcePool)?.stone).toBe(0);
		});

		it("returns false for nonexistent faction", () => {
			spawnFaction("player", true, { stone: 10 });

			expect(spendResources(world, "nonexistent", "stone", 1)).toBe(false);
		});
	});

	describe("canAfford", () => {
		it("returns true when faction has enough", () => {
			spawnFaction("player", true, { stone: 10, iron_ore: 5 });

			expect(canAfford(world, "player", { stone: 5, iron_ore: 3 })).toBe(true);
		});

		it("returns false when any material is insufficient", () => {
			spawnFaction("player", true, { stone: 10, iron_ore: 1 });

			expect(canAfford(world, "player", { stone: 5, iron_ore: 3 })).toBe(false);
		});

		it("returns true for empty cost", () => {
			spawnFaction("player", true);
			expect(canAfford(world, "player", {})).toBe(true);
		});

		it("returns false for nonexistent faction", () => {
			expect(canAfford(world, "nonexistent", { stone: 1 })).toBe(false);
		});
	});
});
