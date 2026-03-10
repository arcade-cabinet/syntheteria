/**
 * Tests for the economy simulation system.
 *
 * Tests cover:
 * - Default economy creation for new factions
 * - Production/consumption recording and flush
 * - Trade import/export tracking and balance
 * - GDP calculation (cubes + buildings + territory)
 * - Health score calculation (0-100)
 * - Faction ranking by economic power
 * - Snapshot history and trimming
 * - Update interval gating
 * - Reset clears all state
 * - Edge cases: zero production, zero consumption, massive values
 */

jest.mock("../../../config", () => ({
	config: {
		diplomacy: {
			relations: {
				defaultStance: "neutral",
				stances: [
					"hostile",
					"unfriendly",
					"neutral",
					"friendly",
					"allied",
				],
				stanceThresholds: {
					hostile: -50,
					unfriendly: -20,
					neutral: 0,
					friendly: 30,
					allied: 60,
				},
			},
			opinionModifiers: {
				tradeDeal: 15,
				brokenTrade: -25,
				attackedUs: -40,
				sharedEnemy: 10,
				territoryInfringement: -15,
				cubeGift: 5,
				allianceProposal: 20,
				betrayal: -60,
			},
			tradeRatios: {
				scrapMetal_to_eWaste: 2,
				eWaste_to_intactComponents: 3,
				scrapMetal_to_intactComponents: 5,
			},
			checkInterval: 300,
			decayRate: 0.01,
			tradeProposalCooldown: 600,
		},
	},
}));

import {
	economySimulation,
	getEconomy,
	getAllEconomies,
	getSnapshots,
	getUpdateInterval,
	rankFactions,
	recordConsumption,
	recordExport,
	recordImport,
	recordProduction,
	resetEconomy,
	setUpdateInterval,
	updateBuildingCount,
	updateStockpile,
	updateTerritoryCount,
} from "../economySimulation";

beforeEach(() => {
	resetEconomy();
});

// ---------------------------------------------------------------------------
// Default economy
// ---------------------------------------------------------------------------

describe("default economy", () => {
	it("returns zero-state economy for unknown faction", () => {
		const econ = getEconomy("reclaimers");
		expect(econ.faction).toBe("reclaimers");
		expect(econ.gdp).toBe(0);
		expect(econ.cubeStockpile).toBe(0);
		expect(econ.cubeValue).toBe(0);
		expect(econ.buildingCount).toBe(0);
		expect(econ.territoryCount).toBe(0);
		expect(econ.productionRate).toBe(0);
		expect(econ.consumptionRate).toBe(0);
		expect(econ.tradeImports).toBe(0);
		expect(econ.tradeExports).toBe(0);
		expect(econ.tradeBalance).toBe(0);
		expect(econ.healthScore).toBe(50);
		expect(econ.lastUpdated).toBe(0);
	});

	it("getAllEconomies returns empty when no factions registered", () => {
		expect(getAllEconomies()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Stockpile updates
// ---------------------------------------------------------------------------

describe("stockpile tracking", () => {
	it("updates cube stockpile and value", () => {
		updateStockpile("reclaimers", 25, 500);
		const econ = getEconomy("reclaimers");
		expect(econ.cubeStockpile).toBe(25);
		expect(econ.cubeValue).toBe(500);
	});

	it("overwrites previous stockpile values", () => {
		updateStockpile("reclaimers", 10, 200);
		updateStockpile("reclaimers", 30, 600);
		const econ = getEconomy("reclaimers");
		expect(econ.cubeStockpile).toBe(30);
		expect(econ.cubeValue).toBe(600);
	});
});

// ---------------------------------------------------------------------------
// Building and territory counts
// ---------------------------------------------------------------------------

describe("building and territory counts", () => {
	it("updates building count", () => {
		updateBuildingCount("iron_creed", 5);
		expect(getEconomy("iron_creed").buildingCount).toBe(5);
	});

	it("updates territory count", () => {
		updateTerritoryCount("volt_collective", 3);
		expect(getEconomy("volt_collective").territoryCount).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// Production and consumption recording
// ---------------------------------------------------------------------------

describe("production and consumption", () => {
	it("records production and flushes on simulation tick", () => {
		recordProduction("reclaimers", 5);
		recordProduction("reclaimers", 3);
		economySimulation(300);
		expect(getEconomy("reclaimers").productionRate).toBe(8);
	});

	it("records consumption and flushes on simulation tick", () => {
		recordConsumption("reclaimers", 4);
		economySimulation(300);
		expect(getEconomy("reclaimers").consumptionRate).toBe(4);
	});

	it("clears accumulators after flush", () => {
		recordProduction("reclaimers", 10);
		economySimulation(300);
		expect(getEconomy("reclaimers").productionRate).toBe(10);

		// Next interval with no new production
		economySimulation(600);
		expect(getEconomy("reclaimers").productionRate).toBe(0);
	});

	it("accumulates across multiple calls before flush", () => {
		recordProduction("iron_creed", 2);
		recordProduction("iron_creed", 3);
		recordProduction("iron_creed", 5);
		economySimulation(300);
		expect(getEconomy("iron_creed").productionRate).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Trade tracking
// ---------------------------------------------------------------------------

describe("trade balance", () => {
	it("records imports and exports", () => {
		recordImport("reclaimers", 10);
		recordExport("reclaimers", 6);
		economySimulation(300);

		const econ = getEconomy("reclaimers");
		expect(econ.tradeImports).toBe(10);
		expect(econ.tradeExports).toBe(6);
		expect(econ.tradeBalance).toBe(4); // net importer
	});

	it("negative trade balance means net exporter", () => {
		recordImport("iron_creed", 3);
		recordExport("iron_creed", 8);
		economySimulation(300);

		const econ = getEconomy("iron_creed");
		expect(econ.tradeBalance).toBe(-5);
	});

	it("zero trade balance when imports equal exports", () => {
		recordImport("volt_collective", 5);
		recordExport("volt_collective", 5);
		economySimulation(300);
		expect(getEconomy("volt_collective").tradeBalance).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// GDP calculation
// ---------------------------------------------------------------------------

describe("GDP calculation", () => {
	it("calculates GDP from cubes + buildings + territory", () => {
		updateStockpile("reclaimers", 10, 200);
		updateBuildingCount("reclaimers", 5);
		updateTerritoryCount("reclaimers", 2);
		economySimulation(300);

		const econ = getEconomy("reclaimers");
		// GDP = cubeValue(200) + buildings(5*10=50) + territory(2*25=50) = 300
		expect(econ.gdp).toBe(300);
	});

	it("GDP is zero for faction with no assets", () => {
		updateStockpile("signal_choir", 0, 0);
		economySimulation(300);
		expect(getEconomy("signal_choir").gdp).toBe(0);
	});

	it("GDP updates each interval", () => {
		updateStockpile("reclaimers", 10, 100);
		economySimulation(300);
		expect(getEconomy("reclaimers").gdp).toBe(100);

		updateStockpile("reclaimers", 20, 400);
		updateBuildingCount("reclaimers", 3);
		economySimulation(600);
		// GDP = 400 + 30 + 0 = 430
		expect(getEconomy("reclaimers").gdp).toBe(430);
	});
});

// ---------------------------------------------------------------------------
// Health score
// ---------------------------------------------------------------------------

describe("health score", () => {
	it("healthy economy: production exceeds consumption", () => {
		updateStockpile("reclaimers", 30, 600);
		updateTerritoryCount("reclaimers", 2);
		recordProduction("reclaimers", 10);
		recordConsumption("reclaimers", 3);
		economySimulation(300);

		const score = getEconomy("reclaimers").healthScore;
		// production ratio: 10/3 = 3.33, score = min(40, round(3.33*20)) = 40
		// stockpile: min(30, round(30/50 * 30)) = 18
		// trade balance: 0 imports, 0 exports -> balanced -> 15
		// territory: min(15, 2*5) = 10
		// total = 40 + 18 + 15 + 10 = 83
		expect(score).toBe(83);
	});

	it("struggling economy: consumption exceeds production", () => {
		updateStockpile("iron_creed", 5, 50);
		recordProduction("iron_creed", 2);
		recordConsumption("iron_creed", 10);
		economySimulation(300);

		const score = getEconomy("iron_creed").healthScore;
		// production ratio: 2/10 = 0.2, score = min(40, round(0.2*20)) = 4
		// stockpile: min(30, round(5/50 * 30)) = 3
		// trade: balanced = 15
		// territory: 0
		// total = 4 + 3 + 15 + 0 = 22
		expect(score).toBe(22);
	});

	it("zero production with zero consumption gives moderate score", () => {
		updateStockpile("signal_choir", 0, 0);
		economySimulation(300);
		const score = getEconomy("signal_choir").healthScore;
		// production 0, consumption 0 -> 20 (no production, no consumption)
		// stockpile 0 -> 0
		// trade balanced -> 15
		// territory 0 -> 0
		// total = 35
		expect(score).toBe(35);
	});

	it("score is clamped between 0 and 100", () => {
		updateStockpile("reclaimers", 100, 5000);
		updateBuildingCount("reclaimers", 20);
		updateTerritoryCount("reclaimers", 10);
		recordProduction("reclaimers", 50);
		recordConsumption("reclaimers", 1);
		economySimulation(300);

		const score = getEconomy("reclaimers").healthScore;
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(100);
	});

	it("max possible health score is 100", () => {
		updateStockpile("reclaimers", 200, 10000);
		updateTerritoryCount("reclaimers", 5);
		recordProduction("reclaimers", 100);
		recordConsumption("reclaimers", 1);
		economySimulation(300);

		// production: min(40, 100/1 * 20) = 40
		// stockpile: min(30, 200/50 * 30) = 30
		// trade: balanced = 15
		// territory: min(15, 5*5) = 15
		// total = 100
		expect(getEconomy("reclaimers").healthScore).toBe(100);
	});
});

// ---------------------------------------------------------------------------
// Faction ranking
// ---------------------------------------------------------------------------

describe("rankFactions", () => {
	it("returns factions sorted by GDP descending", () => {
		updateStockpile("reclaimers", 10, 100);
		updateStockpile("iron_creed", 20, 400);
		updateStockpile("volt_collective", 15, 250);

		economySimulation(300);

		const ranked = rankFactions();
		expect(ranked).toHaveLength(3);
		expect(ranked[0].faction).toBe("iron_creed");
		expect(ranked[1].faction).toBe("volt_collective");
		expect(ranked[2].faction).toBe("reclaimers");
	});

	it("equal GDP factions appear in stable order", () => {
		updateStockpile("reclaimers", 10, 100);
		updateStockpile("iron_creed", 10, 100);
		economySimulation(300);

		const ranked = rankFactions();
		expect(ranked).toHaveLength(2);
		expect(ranked[0].gdp).toBe(ranked[1].gdp);
	});

	it("returns empty array when no factions registered", () => {
		expect(rankFactions()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Update interval
// ---------------------------------------------------------------------------

describe("update interval", () => {
	it("defaults to diplomacy checkInterval", () => {
		expect(getUpdateInterval()).toBe(300);
	});

	it("can be changed", () => {
		setUpdateInterval(100);
		expect(getUpdateInterval()).toBe(100);
	});

	it("only updates on interval ticks", () => {
		updateStockpile("reclaimers", 10, 100);
		recordProduction("reclaimers", 5);

		economySimulation(1); // not on interval
		expect(getEconomy("reclaimers").lastUpdated).toBe(0);

		economySimulation(300); // on interval
		expect(getEconomy("reclaimers").lastUpdated).toBe(300);
	});

	it("respects custom interval", () => {
		setUpdateInterval(50);
		updateStockpile("reclaimers", 10, 100);
		recordProduction("reclaimers", 5);

		economySimulation(25); // not on interval
		expect(getEconomy("reclaimers").productionRate).toBe(0);

		economySimulation(50); // on interval
		expect(getEconomy("reclaimers").productionRate).toBe(5);
	});
});

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

describe("snapshots", () => {
	it("stores a snapshot on each update", () => {
		updateStockpile("reclaimers", 10, 100);
		economySimulation(300);

		const snaps = getSnapshots();
		expect(snaps).toHaveLength(1);
		expect(snaps[0].tick).toBe(300);
		expect(snaps[0].factions).toHaveLength(1);
		expect(snaps[0].factions[0].faction).toBe("reclaimers");
	});

	it("accumulates multiple snapshots", () => {
		updateStockpile("reclaimers", 10, 100);
		economySimulation(300);
		economySimulation(600);

		const snaps = getSnapshots();
		expect(snaps).toHaveLength(2);
		expect(snaps[0].tick).toBe(300);
		expect(snaps[1].tick).toBe(600);
	});

	it("returns copies of snapshots (no mutation)", () => {
		updateStockpile("reclaimers", 10, 100);
		economySimulation(300);

		const snaps = getSnapshots();
		snaps[0].factions[0].gdp = 99999;

		const freshSnaps = getSnapshots();
		expect(freshSnaps[0].factions[0].gdp).toBe(100);
	});

	it("trims snapshots beyond max limit", () => {
		setUpdateInterval(1);
		updateStockpile("reclaimers", 10, 100);

		// Generate 60 snapshots (max is 50)
		for (let i = 1; i <= 60; i++) {
			economySimulation(i);
		}

		const snaps = getSnapshots();
		expect(snaps.length).toBeLessThanOrEqual(50);
		// Oldest snapshot should be trimmed
		expect(snaps[0].tick).toBeGreaterThan(1);
	});
});

// ---------------------------------------------------------------------------
// Multiple factions
// ---------------------------------------------------------------------------

describe("multiple factions", () => {
	it("tracks independent economies per faction", () => {
		updateStockpile("reclaimers", 10, 100);
		updateStockpile("iron_creed", 20, 400);
		recordProduction("reclaimers", 5);
		recordProduction("iron_creed", 12);

		economySimulation(300);

		expect(getEconomy("reclaimers").productionRate).toBe(5);
		expect(getEconomy("iron_creed").productionRate).toBe(12);
		expect(getEconomy("reclaimers").cubeValue).toBe(100);
		expect(getEconomy("iron_creed").cubeValue).toBe(400);
	});

	it("getAllEconomies returns all tracked factions", () => {
		updateStockpile("reclaimers", 10, 100);
		updateStockpile("iron_creed", 20, 400);
		updateStockpile("volt_collective", 15, 250);

		const all = getAllEconomies();
		expect(all).toHaveLength(3);
		const factions = all.map((e) => e.faction).sort();
		expect(factions).toEqual(["iron_creed", "reclaimers", "volt_collective"]);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("production with no consumption has high health", () => {
		updateStockpile("reclaimers", 30, 600);
		updateTerritoryCount("reclaimers", 1);
		recordProduction("reclaimers", 10);
		economySimulation(300);

		const score = getEconomy("reclaimers").healthScore;
		expect(score).toBeGreaterThanOrEqual(60);
	});

	it("consumption with no production has low health", () => {
		updateStockpile("iron_creed", 2, 20);
		recordConsumption("iron_creed", 10);
		economySimulation(300);

		const score = getEconomy("iron_creed").healthScore;
		expect(score).toBeLessThanOrEqual(30);
	});

	it("getEconomy returns a copy (no external mutation)", () => {
		updateStockpile("reclaimers", 10, 100);
		const econ = getEconomy("reclaimers");
		econ.cubeStockpile = 9999;

		expect(getEconomy("reclaimers").cubeStockpile).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetEconomy", () => {
	it("clears all economy state", () => {
		updateStockpile("reclaimers", 10, 100);
		recordProduction("reclaimers", 5);
		economySimulation(300);

		resetEconomy();

		expect(getAllEconomies()).toEqual([]);
		expect(getSnapshots()).toEqual([]);
		expect(getUpdateInterval()).toBe(300); // reset to default
	});

	it("allows fresh start after reset", () => {
		updateStockpile("reclaimers", 50, 1000);
		economySimulation(300);

		resetEconomy();

		updateStockpile("iron_creed", 5, 50);
		economySimulation(300);

		expect(getAllEconomies()).toHaveLength(1);
		expect(getEconomy("iron_creed").cubeValue).toBe(50);
		expect(getEconomy("reclaimers").cubeValue).toBe(0);
	});
});
