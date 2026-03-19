import { AIFaction } from "../../ecs/traits";
import { world } from "../../ecs/world";

import {
	getAIFaction,
	initAIFactionEntities,
	setAIFactionPhase,
} from "../aiCivilization";

afterEach(() => {
	for (const e of [...world.entities]) {
		if (e.isAlive()) e.destroy();
	}
});

describe("AIFaction Koota entities (T18)", () => {
	it("initAIFactionEntities spawns 4 faction entities", () => {
		initAIFactionEntities();
		const entities = Array.from(world.query(AIFaction));
		expect(entities).toHaveLength(4);
		const ids = entities.map((e) => e.get(AIFaction)!.factionId);
		expect(ids).toContain("reclaimers");
		expect(ids).toContain("volt_collective");
		expect(ids).toContain("signal_choir");
		expect(ids).toContain("iron_creed");
	});

	it("getAIFaction returns trait data for a faction", () => {
		initAIFactionEntities();
		const trait = getAIFaction("reclaimers");
		expect(trait).not.toBeNull();
		expect(trait!.factionId).toBe("reclaimers");
		expect(trait!.phase).toBe("dormant");
	});

	it("setAIFactionPhase updates the phase on the entity", () => {
		initAIFactionEntities();
		setAIFactionPhase("volt_collective", "active");
		const trait = getAIFaction("volt_collective");
		expect(trait!.phase).toBe("active");
	});

	it("getAIFaction returns null for unknown faction", () => {
		initAIFactionEntities();
		expect(getAIFaction("unknown_faction")).toBeNull();
	});
});
