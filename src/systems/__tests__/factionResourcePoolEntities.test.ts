import { FactionResourcePool } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	addFactionResourceKoota,
	getFactionResourcesKoota,
	initFactionResourcePools,
} from "../factionEconomy";

afterEach(() => {
	for (const e of [...world.entities]) {
		if (e.isAlive()) e.destroy();
	}
});

describe("FactionResourcePool Koota entities (T21)", () => {
	it("initFactionResourcePools spawns one entity per faction", () => {
		initFactionResourcePools(["rogue", "cultist", "feral"]);
		const entities = Array.from(world.query(FactionResourcePool));
		expect(entities).toHaveLength(3);
		const ids = entities.map((e) => e.get(FactionResourcePool)!.factionId);
		expect(ids).toContain("rogue");
		expect(ids).toContain("cultist");
		expect(ids).toContain("feral");
	});

	it("getFactionResourcesKoota returns empty object initially", () => {
		initFactionResourcePools(["rogue"]);
		expect(getFactionResourcesKoota("rogue")).toEqual({});
	});

	it("addFactionResourceKoota stores resource amount", () => {
		initFactionResourcePools(["rogue"]);
		addFactionResourceKoota("rogue", "scrapMetal", 5);
		expect(getFactionResourcesKoota("rogue")).toEqual({ scrapMetal: 5 });
	});

	it("addFactionResourceKoota accumulates amounts", () => {
		initFactionResourcePools(["cultist"]);
		addFactionResourceKoota("cultist", "eWaste", 3);
		addFactionResourceKoota("cultist", "eWaste", 7);
		expect(getFactionResourcesKoota("cultist").eWaste).toBe(10);
	});

	it("getFactionResourcesKoota returns empty for unknown faction", () => {
		initFactionResourcePools(["rogue"]);
		expect(getFactionResourcesKoota("unknown")).toEqual({});
	});
});
