import {
	addFactionResource,
	canFactionAfford,
	getAllFactionResources,
	getFactionResources,
	resetFactionEconomy,
	seedFactionResources,
	spendFactionResource,
} from "./factionEconomy";
import { resetResources } from "./resources";

beforeEach(() => {
	resetResources();
	resetFactionEconomy();
});

describe("per-faction economy", () => {
	it("returns default zero pool for new factions", () => {
		const pool = getFactionResources("rogue");
		expect(pool.ferrousScrap).toBe(0);
		expect(pool.siliconWafer).toBe(0);
	});

	it("adds resources independently per faction", () => {
		addFactionResource("rogue", "ferrousScrap", 10);
		addFactionResource("cultist", "ferrousScrap", 5);
		addFactionResource("player", "ferrousScrap", 3);

		expect(getFactionResources("rogue").ferrousScrap).toBe(10);
		expect(getFactionResources("cultist").ferrousScrap).toBe(5);
		expect(getFactionResources("player").ferrousScrap).toBe(3);
	});

	it("spends from the correct faction pool", () => {
		addFactionResource("rogue", "alloyStock", 8);

		expect(spendFactionResource("rogue", "alloyStock", 5)).toBe(true);
		expect(getFactionResources("rogue").alloyStock).toBe(3);

		// Player pool unchanged
		expect(getFactionResources("player").alloyStock).toBe(0);
	});

	it("returns false when spending more than available", () => {
		addFactionResource("feral", "siliconWafer", 2);
		expect(spendFactionResource("feral", "siliconWafer", 5)).toBe(false);
		expect(getFactionResources("feral").siliconWafer).toBe(2);
	});

	it("canFactionAfford checks multiple cost types", () => {
		addFactionResource("cultist", "ferrousScrap", 10);
		addFactionResource("cultist", "polymerSalvage", 3);

		expect(
			canFactionAfford("cultist", [
				{ type: "ferrousScrap", amount: 5 },
				{ type: "polymerSalvage", amount: 3 },
			]),
		).toBe(true);

		expect(
			canFactionAfford("cultist", [
				{ type: "ferrousScrap", amount: 5 },
				{ type: "polymerSalvage", amount: 4 },
			]),
		).toBe(false);
	});

	it("player pool delegates to global resources module", () => {
		addFactionResource("player", "scrapMetal", 15);
		const pool = getFactionResources("player");
		expect(pool.scrapMetal).toBe(15);

		expect(spendFactionResource("player", "scrapMetal", 10)).toBe(true);
		expect(getFactionResources("player").scrapMetal).toBe(5);
	});

	it("seeds starting resources for a rival faction", () => {
		seedFactionResources("rogue", {
			ferrousScrap: 20,
			alloyStock: 10,
			polymerSalvage: 5,
		});
		const pool = getFactionResources("rogue");
		expect(pool.ferrousScrap).toBe(20);
		expect(pool.alloyStock).toBe(10);
		expect(pool.polymerSalvage).toBe(5);
		expect(pool.siliconWafer).toBe(0);
	});

	it("getAllFactionResources returns pools for all 4 factions", () => {
		addFactionResource("rogue", "ferrousScrap", 1);
		addFactionResource("cultist", "ferrousScrap", 2);
		addFactionResource("feral", "ferrousScrap", 3);

		const all = getAllFactionResources();
		expect(all.size).toBe(4);
		expect(all.get("player")).toBeDefined();
		expect(all.get("rogue")!.ferrousScrap).toBe(1);
		expect(all.get("cultist")!.ferrousScrap).toBe(2);
		expect(all.get("feral")!.ferrousScrap).toBe(3);
	});

	it("resetFactionEconomy clears rival pools", () => {
		addFactionResource("rogue", "ferrousScrap", 50);
		resetFactionEconomy();
		expect(getFactionResources("rogue").ferrousScrap).toBe(0);
	});
});
