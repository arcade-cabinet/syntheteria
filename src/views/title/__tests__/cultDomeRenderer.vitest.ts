import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CultStructure } from "../../../traits";
import {
	buildCultDomeData,
	type CultDomeData,
	SECT_DOME_COLORS,
} from "../renderers/CultDomeRenderer";

describe("CultDomeRenderer", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	function spawnAltar(
		x: number,
		z: number,
		faction: string,
		corruptionRadius = 3,
	) {
		return world.spawn(
			CultStructure({
				tileX: x,
				tileZ: z,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 40,
				maxHp: 40,
				corruptionRadius,
				spawnsUnits: true,
				spawnInterval: 3,
			}),
		);
	}

	function spawnStronghold(x: number, z: number, corruptionRadius = 8) {
		return world.spawn(
			CultStructure({
				tileX: x,
				tileZ: z,
				structureType: "cult_stronghold",
				modelId: "stronghold",
				hp: 100,
				maxHp: 100,
				corruptionRadius,
				spawnsUnits: true,
				spawnInterval: 2,
			}),
		);
	}

	it("returns dome data for each cult POI (altar and stronghold)", () => {
		spawnAltar(5, 5, "static_remnants");
		spawnStronghold(20, 20);

		const domes = buildCultDomeData(world, 44, 44);
		expect(domes.length).toBe(2);
	});

	it("does not create domes for non-POI cult structures", () => {
		world.spawn(
			CultStructure({
				tileX: 3,
				tileZ: 3,
				structureType: "human_shelter",
				modelId: "shelter",
				hp: 20,
				maxHp: 20,
				corruptionRadius: 0,
				spawnsUnits: false,
				spawnInterval: 0,
			}),
		);

		const domes = buildCultDomeData(world, 44, 44);
		expect(domes.length).toBe(0);
	});

	it("does not create domes for destroyed structures (hp=0)", () => {
		world.spawn(
			CultStructure({
				tileX: 5,
				tileZ: 5,
				structureType: "breach_altar",
				modelId: "altar",
				hp: 0,
				maxHp: 40,
				corruptionRadius: 3,
				spawnsUnits: true,
				spawnInterval: 3,
			}),
		);

		const domes = buildCultDomeData(world, 44, 44);
		expect(domes.length).toBe(0);
	});

	it("dome radius matches corruption radius", () => {
		spawnAltar(10, 10, "null_monks", 5);

		const domes = buildCultDomeData(world, 44, 44);
		expect(domes[0].radius).toBe(5);
	});

	it("has correct sect colors defined", () => {
		expect(SECT_DOME_COLORS.static_remnants).toBeDefined();
		expect(SECT_DOME_COLORS.null_monks).toBeDefined();
		expect(SECT_DOME_COLORS.lost_signal).toBeDefined();
	});
});
