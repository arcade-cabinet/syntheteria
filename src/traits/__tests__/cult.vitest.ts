import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CultStructure } from "../cult";

describe("CultStructure trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(CultStructure);
		const c = e.get(CultStructure)!;
		expect(c.tileX).toBe(0);
		expect(c.tileZ).toBe(0);
		expect(c.structureType).toBe("breach_altar");
		expect(c.modelId).toBe("");
		expect(c.hp).toBe(40);
		expect(c.maxHp).toBe(40);
		expect(c.corruptionRadius).toBe(3);
		expect(c.spawnsUnits).toBe(false);
		expect(c.spawnInterval).toBe(0);
	});

	it("spawns with breach_altar type and custom values", () => {
		const e = world.spawn(
			CultStructure({
				structureType: "breach_altar",
				hp: 60,
				maxHp: 60,
				corruptionRadius: 5,
				spawnsUnits: true,
				spawnInterval: 3,
			}),
		);
		const c = e.get(CultStructure)!;
		expect(c.structureType).toBe("breach_altar");
		expect(c.corruptionRadius).toBe(5);
		expect(c.spawnsUnits).toBe(true);
		expect(c.spawnInterval).toBe(3);
	});

	it("corruptionRadius and spawnsUnits fields are independent", () => {
		const e = world.spawn(
			CultStructure({
				structureType: "signal_corruptor",
				corruptionRadius: 8,
				spawnsUnits: false,
			}),
		);
		const c = e.get(CultStructure)!;
		expect(c.corruptionRadius).toBe(8);
		expect(c.spawnsUnits).toBe(false);
	});
});
