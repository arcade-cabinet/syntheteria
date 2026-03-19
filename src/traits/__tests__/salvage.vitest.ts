import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SalvageProp } from "../salvage";

describe("SalvageProp trait", () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
	});
	afterEach(() => {
		world.destroy();
	});

	it("has correct defaults", () => {
		const e = world.spawn(SalvageProp);
		const s = e.get(SalvageProp)!;
		expect(s.tileX).toBe(0);
		expect(s.tileZ).toBe(0);
		expect(s.salvageType).toBe("debris");
		expect(s.modelId).toBe("");
		expect(s.harvestDuration).toBe(5);
		expect(s.hp).toBe(30);
		expect(s.maxHp).toBe(30);
		expect(s.consumed).toBe(false);
	});

	it("spawns with custom values", () => {
		const e = world.spawn(
			SalvageProp({
				tileX: 5,
				tileZ: 3,
				salvageType: "container",
				modelId: "props_chest",
				hp: 20,
				maxHp: 20,
				harvestDuration: 4,
			}),
		);
		const s = e.get(SalvageProp)!;
		expect(s.salvageType).toBe("container");
		expect(s.modelId).toBe("props_chest");
		expect(s.hp).toBe(20);
		expect(s.harvestDuration).toBe(4);
	});

	it("consumed flag toggles", () => {
		const e = world.spawn(SalvageProp);
		expect(e.get(SalvageProp)!.consumed).toBe(false);
		e.set(SalvageProp, { consumed: true });
		expect(e.get(SalvageProp)!.consumed).toBe(true);
	});
});
