/**
 * Validation tests for config/technology.json
 *
 * Ensures structural integrity of the full tech tree:
 * - All 32 race-specific techs present (8 per race)
 * - 19 universal shared techs
 * - No circular prerequisite dependencies
 * - Every prerequisite references an existing tech
 * - Tier ordering is valid (prerequisites from lower or equal tiers)
 * - No duplicate tech IDs
 * - Cost scaling is monotonically increasing by tier
 * - All techs have a valid "source" field (patron or local)
 * - Patron techs are tier 1-2, local techs are tier 3+
 * - Colonization model fields in researchMechanics
 * - All unlocks reference identifiers (no empty strings)
 */

import techConfig from "../technology.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const allRaces = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

type Race = (typeof allRaces)[number];

interface TechNode {
	id: string;
	name: string;
	tier: number;
	researchCost: number;
	prerequisites: string[];
	effects: {
		unlocks: string[];
		bonuses: Record<string, unknown>;
	};
	description: string;
	source?: string;
	race: string | null;
	cost?: {
		cubes: Record<string, number>;
		researchTime: number;
	};
}

// techTree is a flat array; filter by race field
function getUniversalTechs(): TechNode[] {
	return (techConfig.techTree as unknown as TechNode[]).filter(
		(t) => t.race === null,
	);
}

function getRaceTechs(race: Race): TechNode[] {
	return (techConfig.techTree as unknown as TechNode[]).filter(
		(t) => t.race === race,
	);
}

function getAllTechs(): TechNode[] {
	return techConfig.techTree as unknown as TechNode[];
}

function getAllTechIds(): string[] {
	return getAllTechs().map((t) => t.id);
}

// ---------------------------------------------------------------------------
// Structural validation
// ---------------------------------------------------------------------------

describe("technology.json structure", () => {
	it("has 5 tier definitions", () => {
		expect(techConfig.tiers).toHaveLength(5);
	});

	it("tier names are defined and unique", () => {
		const names = techConfig.tiers.map((t) => t.name);
		expect(new Set(names).size).toBe(names.length);
		for (const name of names) {
			expect(name).toBeTruthy();
		}
	});

	it("tier costs are monotonically increasing", () => {
		for (let i = 1; i < techConfig.tiers.length; i++) {
			expect(techConfig.tiers[i].cost).toBeGreaterThanOrEqual(
				techConfig.tiers[i - 1].cost,
			);
		}
	});

	it("has universal techs", () => {
		expect(getUniversalTechs().length).toBeGreaterThan(0);
	});

	it("has race-specific techs for all 4 races", () => {
		for (const race of allRaces) {
			expect(getRaceTechs(race).length).toBeGreaterThan(0);
		}
	});

	it("has factionResearchBonuses for all races", () => {
		for (const race of allRaces) {
			expect(techConfig.factionResearchBonuses[race]).toBeDefined();
			expect(typeof techConfig.factionResearchBonuses[race]).toBe("number");
			expect(techConfig.factionResearchBonuses[race]).toBeGreaterThan(0);
		}
	});

	it("has researchMechanics config", () => {
		expect(techConfig.researchMechanics).toBeDefined();
	});

	it("techTree is a flat array", () => {
		expect(Array.isArray(techConfig.techTree)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Race-specific tech counts
// ---------------------------------------------------------------------------

describe("race-specific tech counts", () => {
	it.each(allRaces)("%s has exactly 8 unique techs", (race) => {
		const techs = getRaceTechs(race);
		expect(techs).toHaveLength(8);
	});

	it("total race-specific techs is 32", () => {
		const total = allRaces.reduce(
			(sum, race) => sum + getRaceTechs(race).length,
			0,
		);
		expect(total).toBe(32);
	});

	it("universal techs total 19", () => {
		expect(getUniversalTechs()).toHaveLength(19);
	});

	it("total tech count is 51 (19 universal + 32 race-specific)", () => {
		expect(getAllTechs()).toHaveLength(51);
	});
});

// ---------------------------------------------------------------------------
// No duplicate IDs
// ---------------------------------------------------------------------------

describe("no duplicate tech IDs", () => {
	it("all tech IDs are unique across all branches", () => {
		const ids = getAllTechIds();
		const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
		expect(duplicates).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe("required fields", () => {
	it("every tech has id, name, tier, researchCost, prerequisites, effects, description", () => {
		for (const tech of getAllTechs()) {
			expect(tech.id).toBeTruthy();
			expect(tech.name).toBeTruthy();
			expect(typeof tech.tier).toBe("number");
			expect(tech.tier).toBeGreaterThanOrEqual(1);
			expect(tech.tier).toBeLessThanOrEqual(5);
			expect(typeof tech.researchCost).toBe("number");
			expect(tech.researchCost).toBeGreaterThan(0);
			expect(Array.isArray(tech.prerequisites)).toBe(true);
			expect(tech.effects).toBeDefined();
			expect(Array.isArray(tech.effects.unlocks)).toBe(true);
			expect(tech.description).toBeTruthy();
			expect(tech.description.length).toBeGreaterThan(10);
		}
	});

	it("race-specific techs have a race field matching a valid race", () => {
		const validRaces = new Set<string>(allRaces);
		for (const race of allRaces) {
			for (const tech of getRaceTechs(race)) {
				expect(validRaces.has(tech.race as string)).toBe(true);
				expect(tech.race).toBe(race);
			}
		}
	});

	it("race-specific techs have cube cost and researchTime", () => {
		for (const race of allRaces) {
			for (const tech of getRaceTechs(race)) {
				expect(tech.cost).toBeDefined();
				expect(tech.cost).not.toBeNull();
				const cost = tech.cost!;
				expect(cost.cubes).toBeDefined();
				const materials = Object.keys(cost.cubes);
				expect(materials.length).toBeGreaterThan(0);
				for (const amount of Object.values(cost.cubes)) {
					expect(amount as number).toBeGreaterThan(0);
				}
				expect(cost.researchTime).toBeGreaterThan(0);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Prerequisite validity
// ---------------------------------------------------------------------------

describe("prerequisite validity", () => {
	const allIds = new Set(getAllTechIds());

	it("every prerequisite references an existing tech ID", () => {
		const missing: string[] = [];
		for (const tech of getAllTechs()) {
			for (const prereq of tech.prerequisites) {
				if (!allIds.has(prereq)) {
					missing.push(`${tech.id} -> ${prereq}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});

	it("tier 1 universal techs have no prerequisites", () => {
		const tier1 = getUniversalTechs().filter((t) => t.tier === 1);
		for (const tech of tier1) {
			expect(tech.prerequisites).toEqual([]);
		}
	});

	it("tier 2+ techs have at least one prerequisite", () => {
		for (const tech of getAllTechs()) {
			if (tech.tier >= 2) {
				expect(tech.prerequisites.length).toBeGreaterThan(0);
			}
		}
	});

	it("race-specific techs only reference universal or same-race techs as prerequisites", () => {
		const violations: string[] = [];
		const universalIds = new Set(getUniversalTechs().map((t) => t.id));

		for (const race of allRaces) {
			const raceTechIds = new Set(getRaceTechs(race).map((t) => t.id));

			for (const tech of getRaceTechs(race)) {
				for (const prereq of tech.prerequisites) {
					if (!raceTechIds.has(prereq) && !universalIds.has(prereq)) {
						violations.push(
							`${race}/${tech.id} references cross-race prereq: ${prereq}`,
						);
					}
				}
			}
		}
		expect(violations).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// No circular dependencies
// ---------------------------------------------------------------------------

describe("no circular dependencies", () => {
	it("prerequisite graph is acyclic (DAG)", () => {
		const techs = getAllTechs();

		// Kahn's algorithm for topological sort
		const inDegree = new Map<string, number>();
		const adjacency = new Map<string, string[]>();

		for (const tech of techs) {
			if (!inDegree.has(tech.id)) inDegree.set(tech.id, 0);
			if (!adjacency.has(tech.id)) adjacency.set(tech.id, []);

			for (const prereq of tech.prerequisites) {
				if (!adjacency.has(prereq)) adjacency.set(prereq, []);
				adjacency.get(prereq)!.push(tech.id);
				inDegree.set(tech.id, (inDegree.get(tech.id) ?? 0) + 1);
			}
		}

		const queue: string[] = [];
		for (const [id, degree] of inDegree) {
			if (degree === 0) queue.push(id);
		}

		let visited = 0;
		while (queue.length > 0) {
			const current = queue.shift()!;
			visited++;
			for (const neighbor of adjacency.get(current) ?? []) {
				const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
				inDegree.set(neighbor, newDegree);
				if (newDegree === 0) queue.push(neighbor);
			}
		}

		const totalTechs = techs.length;
		if (visited !== totalTechs) {
			const inCycle = techs
				.filter((t) => (inDegree.get(t.id) ?? 0) > 0)
				.map((t) => t.id);
			fail(`Circular dependency detected involving: ${inCycle.join(", ")}`);
		}

		expect(visited).toBe(totalTechs);
	});
});

// ---------------------------------------------------------------------------
// Tier ordering
// ---------------------------------------------------------------------------

describe("tier ordering", () => {
	it("prerequisites come from equal or lower tiers", () => {
		const violations: string[] = [];
		const techMap = new Map(getAllTechs().map((t) => [t.id, t]));

		for (const tech of getAllTechs()) {
			for (const prereqId of tech.prerequisites) {
				const prereq = techMap.get(prereqId);
				if (prereq && prereq.tier > tech.tier) {
					violations.push(
						`${tech.id} (tier ${tech.tier}) requires ${prereqId} (tier ${prereq.tier})`,
					);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Research cost scaling
// ---------------------------------------------------------------------------

describe("research cost scaling", () => {
	it("average research cost increases with tier", () => {
		const techs = getAllTechs();
		const tierCosts = new Map<number, number[]>();

		for (const tech of techs) {
			if (!tierCosts.has(tech.tier)) tierCosts.set(tech.tier, []);
			tierCosts.get(tech.tier)!.push(tech.researchCost);
		}

		const tierAvgs = new Map<number, number>();
		for (const [tier, costs] of tierCosts) {
			tierAvgs.set(tier, costs.reduce((a, b) => a + b, 0) / costs.length);
		}

		const sortedTiers = [...tierAvgs.keys()].sort((a, b) => a - b);
		for (let i = 1; i < sortedTiers.length; i++) {
			const prevAvg = tierAvgs.get(sortedTiers[i - 1])!;
			const currAvg = tierAvgs.get(sortedTiers[i])!;
			expect(currAvg).toBeGreaterThan(prevAvg);
		}
	});
});

// ---------------------------------------------------------------------------
// Description quality
// ---------------------------------------------------------------------------

describe("description quality", () => {
	it("no tech has a placeholder description", () => {
		const placeholders = ["TODO", "TBD", "placeholder", "...", "FIXME"];
		for (const tech of getAllTechs()) {
			for (const ph of placeholders) {
				expect(tech.description.toLowerCase()).not.toContain(ph.toLowerCase());
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Research mechanics config
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Source field validation (Colonization model)
// ---------------------------------------------------------------------------

describe("source field (Colonization model)", () => {
	it("every tech has a source field", () => {
		const missing: string[] = [];
		for (const tech of getAllTechs()) {
			if (!tech.source) {
				missing.push(tech.id);
			}
		}
		expect(missing).toEqual([]);
	});

	it('source is either "patron" or "local"', () => {
		const invalid: string[] = [];
		for (const tech of getAllTechs()) {
			if (tech.source !== "patron" && tech.source !== "local") {
				invalid.push(`${tech.id}: ${tech.source}`);
			}
		}
		expect(invalid).toEqual([]);
	});

	it("tier 1-2 techs have source=patron (blueprints from home planet)", () => {
		const violations: string[] = [];
		for (const tech of getAllTechs()) {
			if (tech.tier <= 2 && tech.source !== "patron") {
				violations.push(
					`${tech.id} (tier ${tech.tier}) has source=${tech.source}`,
				);
			}
		}
		expect(violations).toEqual([]);
	});

	it("tier 3+ techs have source=local (researched on-planet)", () => {
		const violations: string[] = [];
		for (const tech of getAllTechs()) {
			if (tech.tier >= 3 && tech.source !== "local") {
				violations.push(
					`${tech.id} (tier ${tech.tier}) has source=${tech.source}`,
				);
			}
		}
		expect(violations).toEqual([]);
	});

	it("patron techs exist (at least 1)", () => {
		const patronTechs = getAllTechs().filter((t) => t.source === "patron");
		expect(patronTechs.length).toBeGreaterThan(0);
	});

	it("local techs exist (at least 1)", () => {
		const localTechs = getAllTechs().filter((t) => t.source === "local");
		expect(localTechs.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Research mechanics config
// ---------------------------------------------------------------------------

describe("researchMechanics", () => {
	it("has valid research mechanics config", () => {
		const m = techConfig.researchMechanics;
		expect(m.baseResearchRate).toBeGreaterThan(0);
		expect(m.researchBuildingBonus).toBeGreaterThan(0);
		expect(m.maxParallelResearch).toBeGreaterThanOrEqual(1);
		expect(m.signalChoirParallelResearch).toBeGreaterThan(
			m.maxParallelResearch,
		);
		expect(m.raceTechsRequireRaceMatch).toBe(true);
		expect(m.universalTechsAvailableToAll).toBe(true);
	});

	it("has Colonization model fields", () => {
		const m = techConfig.researchMechanics as Record<string, unknown>;
		expect(m.patronTechDeliveryMethod).toBe("otter_hologram");
		expect(m.patronTechRequiresShipment).toBe(true);
		expect(m.localTechRequiresResearchBuilding).toBe(true);
		expect(m.independenceUnlocksAllLocalTech).toBe(true);
		expect(m.patronSatisfactionThresholdForTech).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Unlock reference integrity
// ---------------------------------------------------------------------------

describe("unlock references", () => {
	it("no tech unlocks have empty strings", () => {
		const empty: string[] = [];
		for (const tech of getAllTechs()) {
			for (const unlock of tech.effects.unlocks) {
				if (!unlock || unlock.trim() === "") {
					empty.push(tech.id);
				}
			}
		}
		expect(empty).toEqual([]);
	});

	it("every tech unlocks at least one thing", () => {
		const noUnlocks: string[] = [];
		for (const tech of getAllTechs()) {
			if (tech.effects.unlocks.length === 0) {
				noUnlocks.push(tech.id);
			}
		}
		expect(noUnlocks).toEqual([]);
	});
});
