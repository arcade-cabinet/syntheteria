import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Building, Powered, PowerGrid, Faction, ResourcePool } from "../../traits";
import {
	FUSION_RECIPES,
	queueSynthesis,
	runSynthesis,
	SynthesisQueue,
} from "../synthesisSystem";

function spawnFaction(
	world: ReturnType<typeof createWorld>,
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

function spawnSynthesizer(
	world: ReturnType<typeof createWorld>,
	x: number,
	z: number,
	factionId: string,
	powered: boolean,
) {
	const entity = world.spawn(
		Building({
			tileX: x,
			tileZ: z,
			buildingType: "synthesizer",
			modelId: "test",
			factionId,
			hp: 50,
			maxHp: 50,
		}),
		PowerGrid({
			powerDelta: -2,
			storageCapacity: 0,
			currentCharge: 0,
			powerRadius: 0,
		}),
	);
	if (powered) {
		entity.add(Powered);
	}
	return entity;
}

describe("synthesisSystem", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});

	afterEach(() => {
		world.destroy();
	});

	describe("FUSION_RECIPES", () => {
		it("has at least 5 recipes", () => {
			expect(FUSION_RECIPES.length).toBeGreaterThanOrEqual(5);
		});

		it("every recipe has inputs and outputs", () => {
			for (const recipe of FUSION_RECIPES) {
				expect(Object.keys(recipe.inputs).length).toBeGreaterThan(0);
				expect(Object.keys(recipe.outputs).length).toBeGreaterThan(0);
			}
		});
	});

	describe("queueSynthesis", () => {
		it("queues recipe on powered synthesizer with sufficient resources", () => {
			spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			const result = queueSynthesis(world, synth.id(), "alloy_fusion");

			expect(result).toBe(true);
			expect(synth.has(SynthesisQueue)).toBe(true);
			const sq = synth.get(SynthesisQueue);
			expect(sq?.recipeId).toBe("alloy_fusion");
			expect(sq?.ticksRemaining).toBe(3);
		});

		it("spends input resources on queue", () => {
			const faction = spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			queueSynthesis(world, synth.id(), "alloy_fusion");

			const pool = faction.get(ResourcePool);
			// 10 - 3 ferrous_scrap, 5 - 2 conductor_wire
			expect(pool?.ferrous_scrap).toBe(7);
			expect(pool?.conductor_wire).toBe(3);
		});

		it("fails when resources are insufficient", () => {
			spawnFaction(world, "player", true, {
				ferrous_scrap: 1,
				conductor_wire: 0,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			const result = queueSynthesis(world, synth.id(), "alloy_fusion");

			expect(result).toBe(false);
			expect(synth.has(SynthesisQueue)).toBe(false);
		});

		it("fails on unpowered synthesizer", () => {
			spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", false);

			const result = queueSynthesis(world, synth.id(), "alloy_fusion");

			expect(result).toBe(false);
		});

		it("fails on non-synthesizer building", () => {
			spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const turret = world.spawn(
				Building({
					tileX: 5,
					tileZ: 5,
					buildingType: "defense_turret",
					modelId: "test",
					factionId: "player",
					hp: 50,
					maxHp: 50,
				}),
			);
			turret.add(Powered);

			const result = queueSynthesis(world, turret.id(), "alloy_fusion");

			expect(result).toBe(false);
		});

		it("fails with invalid recipe id", () => {
			spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			const result = queueSynthesis(world, synth.id(), "nonexistent_recipe");

			expect(result).toBe(false);
		});

		it("fails when synthesizer already has queued conversion", () => {
			spawnFaction(world, "player", true, {
				ferrous_scrap: 20,
				conductor_wire: 10,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			queueSynthesis(world, synth.id(), "alloy_fusion");
			const result = queueSynthesis(world, synth.id(), "alloy_fusion");

			expect(result).toBe(false);
		});
	});

	describe("runSynthesis", () => {
		it("ticks down over 3 turns then completes", () => {
			const faction = spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "alloy_fusion");

			// Turn 1: 3 -> 2
			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(true);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(2);
			expect(faction.get(ResourcePool)?.alloy_stock).toBe(0);

			// Turn 2: 2 -> 1
			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(true);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(1);
			expect(faction.get(ResourcePool)?.alloy_stock).toBe(0);

			// Turn 3: 1 -> 0, complete
			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(false);
			expect(faction.get(ResourcePool)?.alloy_stock).toBe(2);
		});

		it("does not process on unpowered synthesizer", () => {
			const faction = spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "alloy_fusion");

			// Remove power before processing
			synth.remove(Powered);

			runSynthesis(world);

			const pool = faction.get(ResourcePool);
			expect(pool?.alloy_stock).toBe(0);
			// Queue should remain with ticks unchanged
			expect(synth.has(SynthesisQueue)).toBe(true);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(3);
		});

		it("polymer_reclamation converts scrap_metal + conductor_wire to polymer_salvage", () => {
			const faction = spawnFaction(world, "player", true, {
				scrap_metal: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "polymer_reclamation");

			// Run 3 turns to complete
			runSynthesis(world);
			runSynthesis(world);
			runSynthesis(world);

			const pool = faction.get(ResourcePool);
			expect(pool?.polymer_salvage).toBe(2);
			expect(pool?.scrap_metal).toBe(8); // 10 - 2
			expect(pool?.conductor_wire).toBe(4); // 5 - 1
		});

		it("resumes ticking when power is restored", () => {
			const faction = spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "alloy_fusion");

			// Turn 1: powered, tick 3 -> 2
			runSynthesis(world);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(2);

			// Turn 2: unpowered, no tick
			synth.remove(Powered);
			runSynthesis(world);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(2);

			// Turn 3: power restored, tick 2 -> 1
			synth.add(Powered);
			runSynthesis(world);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(1);

			// Turn 4: tick 1 -> 0, complete
			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(false);
			expect(faction.get(ResourcePool)?.alloy_stock).toBe(2);
		});

		it("removes SynthesisQueue after completion", () => {
			spawnFaction(world, "player", true, {
				ferrous_scrap: 10,
				conductor_wire: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "alloy_fusion");

			expect(synth.has(SynthesisQueue)).toBe(true);

			// 3 turns to complete
			runSynthesis(world);
			runSynthesis(world);
			runSynthesis(world);

			expect(synth.has(SynthesisQueue)).toBe(false);
		});
	});
});
