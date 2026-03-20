import { describe, expect, it } from "vitest";
import { CULT_STRUCTURE_DEFS, type CultStructureType } from "../cultStructures";

const ALL_CULT_TYPES: CultStructureType[] = [
	"breach_altar",
	"signal_corruptor",
	"human_shelter",
	"corruption_node",
	"cult_stronghold",
	"bio_farm",
];

describe("CULT_STRUCTURE_DEFS", () => {
	it("contains all 6 cult structure types", () => {
		const keys = Object.keys(CULT_STRUCTURE_DEFS);
		expect(keys).toHaveLength(6);
		for (const type of ALL_CULT_TYPES) {
			expect(CULT_STRUCTURE_DEFS).toHaveProperty(type);
		}
	});

	describe.each(ALL_CULT_TYPES)("%s", (type) => {
		const def = CULT_STRUCTURE_DEFS[type];

		it("has corruptionRadius > 0", () => {
			expect(def.corruptionRadius).toBeGreaterThan(0);
		});

		it("has hp > 0", () => {
			expect(def.hp).toBeGreaterThan(0);
		});

		it("has displayName", () => {
			expect(def.displayName).toBeTruthy();
		});
	});

	describe("breach_altar", () => {
		const def = CULT_STRUCTURE_DEFS.breach_altar;

		it("spawnsUnits is true", () => {
			expect(def.spawnsUnits).toBe(true);
		});

		it("has spawnInterval > 0", () => {
			expect(def.spawnInterval).toBeGreaterThan(0);
		});
	});

	describe("human_shelter", () => {
		it("has modelId main_house", () => {
			expect(CULT_STRUCTURE_DEFS.human_shelter.modelId).toBe("main_house");
		});
	});

	describe("cult_stronghold", () => {
		const def = CULT_STRUCTURE_DEFS.cult_stronghold;

		it("spawnsUnits is true", () => {
			expect(def.spawnsUnits).toBe(true);
		});

		it("has spawnInterval > 0", () => {
			expect(def.spawnInterval).toBeGreaterThan(0);
		});

		it("has modelId main_house_3lv", () => {
			expect(def.modelId).toBe("main_house_3lv");
		});
	});

	describe("bio_farm", () => {
		const def = CULT_STRUCTURE_DEFS.bio_farm;

		it("is a cult structure, not faction-buildable", () => {
			expect(def.displayName).toBe("Bio Farm");
		});

		it("does not spawn units", () => {
			expect(def.spawnsUnits).toBe(false);
		});

		it("uses farm model", () => {
			expect(def.modelId).toBe("farm");
		});
	});
});
