import { FactionResearch } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	completeResearch,
	getCompletedTechs,
	initFactionResearchEntities,
} from "../techTree";

afterEach(() => {
	for (const e of [...world.entities]) {
		if (e.isAlive()) e.destroy();
	}
});

describe("FactionResearch Koota entities (T19)", () => {
	it("initFactionResearchEntities spawns one entity per faction", () => {
		initFactionResearchEntities(["reclaimers", "volt_collective"]);
		const entities = Array.from(world.query(FactionResearch));
		expect(entities).toHaveLength(2);
		const ids = entities.map((e) => e.get(FactionResearch)!.factionId);
		expect(ids).toContain("reclaimers");
		expect(ids).toContain("volt_collective");
	});

	it("getCompletedTechs returns empty array initially", () => {
		initFactionResearchEntities(["reclaimers"]);
		expect(getCompletedTechs("reclaimers")).toEqual([]);
	});

	it("completeResearch adds tech to completedTechsJson", () => {
		initFactionResearchEntities(["reclaimers"]);
		completeResearch("reclaimers", "mining_efficiency");
		const techs = getCompletedTechs("reclaimers");
		expect(techs).toContain("mining_efficiency");
	});

	it("completeResearch accumulates multiple techs", () => {
		initFactionResearchEntities(["iron_creed"]);
		completeResearch("iron_creed", "tech_a");
		completeResearch("iron_creed", "tech_b");
		const techs = getCompletedTechs("iron_creed");
		expect(techs).toHaveLength(2);
		expect(techs).toContain("tech_a");
		expect(techs).toContain("tech_b");
	});

	it("getCompletedTechs returns empty for unknown faction", () => {
		initFactionResearchEntities(["reclaimers"]);
		expect(getCompletedTechs("unknown")).toEqual([]);
	});
});
