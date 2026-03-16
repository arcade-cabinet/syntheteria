import { FactionStanding } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	getStandingTrait,
	initFactionStandings,
	modifyStandingTrait,
} from "../diplomacy";

afterEach(() => {
	for (const e of [...world.entities]) {
		if (e.isAlive()) e.destroy();
	}
});

describe("FactionStanding Koota entities (T20)", () => {
	it("initFactionStandings spawns N*(N-1) entities for N factions", () => {
		initFactionStandings(["reclaimers", "volt_collective", "signal_choir"]);
		const entities = Array.from(world.query(FactionStanding));
		// 3 factions → 3*2 = 6 ordered pairs
		expect(entities).toHaveLength(6);
	});

	it("getStandingTrait returns 0 initially", () => {
		initFactionStandings(["reclaimers", "volt_collective"]);
		expect(getStandingTrait("reclaimers", "volt_collective")).toBe(0);
		expect(getStandingTrait("volt_collective", "reclaimers")).toBe(0);
	});

	it("modifyStandingTrait updates standing on entity", () => {
		initFactionStandings(["reclaimers", "volt_collective"]);
		modifyStandingTrait("reclaimers", "volt_collective", 20);
		expect(getStandingTrait("reclaimers", "volt_collective")).toBe(20);
	});

	it("modifyStandingTrait clamps to [-100, 100]", () => {
		initFactionStandings(["reclaimers", "volt_collective"]);
		modifyStandingTrait("reclaimers", "volt_collective", 200);
		expect(getStandingTrait("reclaimers", "volt_collective")).toBe(100);
		modifyStandingTrait("reclaimers", "volt_collective", -300);
		expect(getStandingTrait("reclaimers", "volt_collective")).toBe(-100);
	});

	it("getStandingTrait returns 0 for unknown faction pair", () => {
		initFactionStandings(["reclaimers"]);
		expect(getStandingTrait("reclaimers", "unknown")).toBe(0);
	});
});
