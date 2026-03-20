import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	Building,
	Faction,
	Powered,
	PowerGrid,
	ResourcePool,
} from "../../traits";
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
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			const result = queueSynthesis(world, synth.id(), "steel_smelting");

			expect(result).toBe(true);
			expect(synth.has(SynthesisQueue)).toBe(true);
			const sq = synth.get(SynthesisQueue);
			expect(sq?.recipeId).toBe("steel_smelting");
			expect(sq?.ticksRemaining).toBe(3);
		});

		it("spends input resources on queue", () => {
			const faction = spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			queueSynthesis(world, synth.id(), "steel_smelting");

			const pool = faction.get(ResourcePool);
			expect(pool?.iron_ore).toBe(7);
			expect(pool?.coal).toBe(3);
		});

		it("fails when resources are insufficient", () => {
			spawnFaction(world, "player", true, {
				iron_ore: 1,
				coal: 0,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			const result = queueSynthesis(world, synth.id(), "steel_smelting");

			expect(result).toBe(false);
			expect(synth.has(SynthesisQueue)).toBe(false);
		});

		it("fails on unpowered synthesizer", () => {
			spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", false);

			const result = queueSynthesis(world, synth.id(), "steel_smelting");

			expect(result).toBe(false);
		});

		it("fails on non-synthesizer building", () => {
			spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
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

			const result = queueSynthesis(world, turret.id(), "steel_smelting");

			expect(result).toBe(false);
		});

		it("fails with invalid recipe id", () => {
			spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			const result = queueSynthesis(world, synth.id(), "nonexistent_recipe");

			expect(result).toBe(false);
		});

		it("fails when synthesizer already has queued conversion", () => {
			spawnFaction(world, "player", true, {
				iron_ore: 20,
				coal: 10,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);

			queueSynthesis(world, synth.id(), "steel_smelting");
			const result = queueSynthesis(world, synth.id(), "steel_smelting");

			expect(result).toBe(false);
		});
	});

	describe("runSynthesis", () => {
		it("ticks down over 3 turns then completes", () => {
			const faction = spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "steel_smelting");

			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(true);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(2);
			expect(faction.get(ResourcePool)?.steel).toBe(0);

			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(true);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(1);
			expect(faction.get(ResourcePool)?.steel).toBe(0);

			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(false);
			expect(faction.get(ResourcePool)?.steel).toBe(2);
		});

		it("does not process on unpowered synthesizer", () => {
			const faction = spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "steel_smelting");

			synth.remove(Powered);

			runSynthesis(world);

			const pool = faction.get(ResourcePool);
			expect(pool?.steel).toBe(0);
			expect(synth.has(SynthesisQueue)).toBe(true);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(3);
		});

		it("concrete_mixing converts stone + sand to concrete", () => {
			const faction = spawnFaction(world, "player", true, {
				stone: 10,
				sand: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "concrete_mixing");

			runSynthesis(world);
			runSynthesis(world);
			runSynthesis(world);

			const pool = faction.get(ResourcePool);
			expect(pool?.concrete).toBe(2);
			expect(pool?.stone).toBe(8);
			expect(pool?.sand).toBe(4);
		});

		it("resumes ticking when power is restored", () => {
			const faction = spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "steel_smelting");

			runSynthesis(world);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(2);

			synth.remove(Powered);
			runSynthesis(world);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(2);

			synth.add(Powered);
			runSynthesis(world);
			expect(synth.get(SynthesisQueue)?.ticksRemaining).toBe(1);

			runSynthesis(world);
			expect(synth.has(SynthesisQueue)).toBe(false);
			expect(faction.get(ResourcePool)?.steel).toBe(2);
		});

		it("removes SynthesisQueue after completion", () => {
			spawnFaction(world, "player", true, {
				iron_ore: 10,
				coal: 5,
			});
			const synth = spawnSynthesizer(world, 5, 5, "player", true);
			queueSynthesis(world, synth.id(), "steel_smelting");

			expect(synth.has(SynthesisQueue)).toBe(true);

			runSynthesis(world);
			runSynthesis(world);
			runSynthesis(world);

			expect(synth.has(SynthesisQueue)).toBe(false);
		});
	});
});
