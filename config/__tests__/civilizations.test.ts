import civsConfig from "../civilizations.json";

describe("civilizations.json", () => {
	const factionIds = ["reclaimers", "volt_collective", "signal_choir", "iron_creed"] as const;

	it("has all 4 factions", () => {
		for (const id of factionIds) {
			expect(civsConfig[id]).toBeDefined();
		}
	});

	it("each faction has required identity fields", () => {
		for (const id of factionIds) {
			const civ = civsConfig[id];
			expect(typeof civ.name).toBe("string");
			expect(typeof civ.description).toBe("string");
			expect(civ.description.length).toBeGreaterThan(20);
			expect(typeof civ.color).toBe("string");
			expect(civ.color).toMatch(/^#[0-9a-fA-F]{6}$/);
			expect(typeof civ.accentColor).toBe("string");
		}
	});

	it("each faction has governor bias with all 6 categories", () => {
		const biasKeys = ["economy", "mining", "military", "defense", "research", "expansion"];
		for (const id of factionIds) {
			for (const key of biasKeys) {
				const bias = civsConfig[id].governorBias as Record<string, number>;
				expect(typeof bias[key]).toBe("number");
				expect(bias[key]).toBeGreaterThan(0);
			}
		}
	});

	it("each faction has unique abilities", () => {
		for (const id of factionIds) {
			const abilities = Object.entries(civsConfig[id].uniqueAbilities);
			expect(abilities.length).toBeGreaterThanOrEqual(2);
			for (const [, ability] of abilities) {
				expect(typeof ability.name).toBe("string");
				expect(typeof ability.description).toBe("string");
			}
		}
	});

	it("each faction has a unique unit and building", () => {
		for (const id of factionIds) {
			expect(typeof civsConfig[id].uniqueUnit.type).toBe("string");
			expect(typeof civsConfig[id].uniqueUnit.name).toBe("string");
			expect(typeof civsConfig[id].uniqueBuilding.type).toBe("string");
			expect(typeof civsConfig[id].uniqueBuilding.name).toBe("string");
		}
	});

	it("unique unit types are distinct", () => {
		const unitTypes = factionIds.map((id) => civsConfig[id].uniqueUnit.type);
		expect(new Set(unitTypes).size).toBe(factionIds.length);
	});

	it("each faction has speed multipliers", () => {
		for (const id of factionIds) {
			expect(typeof civsConfig[id].researchSpeedMultiplier).toBe("number");
			expect(typeof civsConfig[id].harvestSpeedMultiplier).toBe("number");
			expect(typeof civsConfig[id].buildCostMultiplier).toBe("number");
		}
	});

	it("reclaimers excel at economy, iron_creed at defense", () => {
		expect(civsConfig.reclaimers.governorBias.economy).toBeGreaterThan(1);
		expect(civsConfig.iron_creed.governorBias.defense).toBeGreaterThan(1);
	});

	it("governor weights match RACES.md canonical values", () => {
		// Reclaimers: economy=1.2, mining=1.3 (RACES.md §Governor GOAP Weights)
		expect(civsConfig.reclaimers.governorBias.economy).toBeCloseTo(1.2, 1);
		expect(civsConfig.reclaimers.governorBias.mining).toBeCloseTo(1.3, 1);
		// Volt Collective: military=1.5, expansion=1.3
		expect(civsConfig.volt_collective.governorBias.military).toBeCloseTo(1.5, 1);
		expect(civsConfig.volt_collective.governorBias.expansion).toBeCloseTo(1.3, 1);
		// Signal Choir: research=1.5
		expect(civsConfig.signal_choir.governorBias.research).toBeCloseTo(1.5, 1);
		// Iron Creed: defense=1.5, expansion=0.7
		expect(civsConfig.iron_creed.governorBias.defense).toBeCloseTo(1.5, 1);
		expect(civsConfig.iron_creed.governorBias.expansion).toBeCloseTo(0.7, 1);
	});
});
