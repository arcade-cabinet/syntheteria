/**
 * Tests for the race selection system.
 *
 * Tests cover:
 * - Available factions list
 * - Faction preview data
 * - Map preset selection
 * - Starting resources selection
 * - Setup finalization
 * - AI faction assignment
 * - Validation of invalid selections
 * - Post-finalization lockout
 */

jest.mock("../../../config", () => ({
	config: {
		civilizations: {
				reclaimers: {
					name: "Reclaimers",
					description: "Scavenger economy",
					style: "rusted iron",
					governorBias: "+Economy",
					accentColor: "#8B4513",
					uniqueAbilities: {
						salvageEfficiency: { name: "Salvage Efficiency" },
						scrapRadar: { name: "Scrap Radar" },
					},
					uniqueUnit: "salvage_drone",
					uniqueBuilding: "scrap_processor",
					researchSpeedMultiplier: 0.8,
					harvestSpeedMultiplier: 1.3,
					buildCostMultiplier: 0.9,
				},
				volt_collective: {
					name: "Volt Collective",
					description: "Lightning aggressors",
					style: "chrome + heat-blue",
					governorBias: "+Military",
					accentColor: "#00BFFF",
					uniqueAbilities: {
						overcharge: { name: "Overcharge" },
						chainLightning: { name: "Chain Lightning" },
					},
					uniqueUnit: "shock_trooper",
					uniqueBuilding: "tesla_tower",
					researchSpeedMultiplier: 1.0,
					harvestSpeedMultiplier: 0.9,
					buildCostMultiplier: 1.1,
				},
				signal_choir: {
					name: "Signal Choir",
					description: "Hive-mind hackers",
					style: "anodized aluminum",
					governorBias: "+Research",
					accentColor: "#7B68EE",
					uniqueAbilities: {
						networkSync: { name: "Network Sync" },
						dataSiphon: { name: "Data Siphon" },
					},
					uniqueUnit: "signal_drone",
					uniqueBuilding: "relay_nexus",
					researchSpeedMultiplier: 1.5,
					harvestSpeedMultiplier: 0.8,
					buildCostMultiplier: 1.0,
				},
				iron_creed: {
					name: "Iron Creed",
					description: "Fortress builders",
					style: "brushed steel",
					governorBias: "+Defense",
					accentColor: "#708090",
					uniqueAbilities: {
						fortify: { name: "Fortify" },
						ironWill: { name: "Iron Will" },
					},
					uniqueUnit: "siege_bot",
					uniqueBuilding: "bastion",
					researchSpeedMultiplier: 0.9,
					harvestSpeedMultiplier: 1.0,
					buildCostMultiplier: 0.8,
				},
		},
		mapPresets: {
			standard: {
				name: "Standard",
				description: "Balanced game",
				worldSize: 200,
				oreAbundance: 1.0,
				aiOpponents: 4,
			},
			marathon: {
				name: "Marathon",
				description: "Large map, slow pace",
				worldSize: 400,
				oreAbundance: 0.7,
				aiOpponents: 4,
			},
			duel: {
				name: "Duel",
				description: "Small map, 1v1",
				worldSize: 100,
				oreAbundance: 1.5,
				aiOpponents: 2,
			},
		},
	},
}));

import {
	finalizeSetup,
	getAvailableFactions,
	getCurrentSelections,
	getFactionPreview,
	getMapPresets,
	isSetupFinalized,
	resetRaceSelection,
	selectFaction,
	selectMapPreset,
	selectStartingResources,
	setMapSeed,
} from "../raceSelection";

beforeEach(() => {
	resetRaceSelection();
});

// ---------------------------------------------------------------------------
// Available factions
// ---------------------------------------------------------------------------

describe("available factions", () => {
	it("returns all 4 factions", () => {
		const factions = getAvailableFactions();
		expect(factions).toHaveLength(4);
	});

	it("includes faction stats", () => {
		const factions = getAvailableFactions();
		const reclaimers = factions.find((f) => f.id === "reclaimers")!;

		expect(reclaimers.name).toBe("Reclaimers");
		expect(reclaimers.researchSpeedMultiplier).toBe(0.8);
		expect(reclaimers.harvestSpeedMultiplier).toBe(1.3);
		expect(reclaimers.buildCostMultiplier).toBe(0.9);
		expect(reclaimers.uniqueAbilities).toHaveLength(2);
		expect(reclaimers.uniqueUnit).toBe("salvage_drone");
		expect(reclaimers.accentColor).toBe("#8B4513");
	});

	it("getFactionPreview returns single faction", () => {
		const preview = getFactionPreview("signal_choir");
		expect(preview).not.toBeNull();
		expect(preview!.name).toBe("Signal Choir");
		expect(preview!.researchSpeedMultiplier).toBe(1.5);
	});

	it("getFactionPreview returns null for invalid ID", () => {
		expect(getFactionPreview("nonexistent")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Map presets
// ---------------------------------------------------------------------------

describe("map presets", () => {
	it("returns all presets", () => {
		const presets = getMapPresets();
		expect(presets).toHaveLength(3);
	});

	it("includes preset details", () => {
		const presets = getMapPresets();
		const marathon = presets.find((p) => p.id === "marathon")!;
		expect(marathon.mapSize).toBe(400);
		expect(marathon.resourceDensity).toBe(0.7);
	});
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe("faction selection", () => {
	it("selects a valid faction", () => {
		expect(selectFaction("reclaimers")).toBe(true);
		expect(getCurrentSelections().faction).toBe("reclaimers");
	});

	it("rejects invalid faction", () => {
		expect(selectFaction("nonexistent")).toBe(false);
		expect(getCurrentSelections().faction).toBeNull();
	});

	it("allows changing selection", () => {
		selectFaction("reclaimers");
		selectFaction("iron_creed");
		expect(getCurrentSelections().faction).toBe("iron_creed");
	});
});

describe("map preset selection", () => {
	it("defaults to standard", () => {
		expect(getCurrentSelections().mapPreset).toBe("standard");
	});

	it("selects a valid preset", () => {
		expect(selectMapPreset("marathon")).toBe(true);
		expect(getCurrentSelections().mapPreset).toBe("marathon");
	});

	it("rejects invalid preset", () => {
		expect(selectMapPreset("nonexistent")).toBe(false);
	});
});

describe("starting resources", () => {
	it("defaults to normal", () => {
		expect(getCurrentSelections().startingResources).toBe("normal");
	});

	it("selects valid tier", () => {
		expect(selectStartingResources("generous")).toBe(true);
		expect(getCurrentSelections().startingResources).toBe("generous");
	});

	it("rejects invalid tier", () => {
		expect(selectStartingResources("invalid")).toBe(false);
	});
});

describe("map seed", () => {
	it("sets custom seed", () => {
		setMapSeed(12345);
		expect(getCurrentSelections().seed).toBe(12345);
	});
});

// ---------------------------------------------------------------------------
// Finalization
// ---------------------------------------------------------------------------

describe("setup finalization", () => {
	it("returns null if no faction selected", () => {
		expect(finalizeSetup()).toBeNull();
	});

	it("returns complete setup when faction selected", () => {
		selectFaction("reclaimers");
		selectMapPreset("duel");
		selectStartingResources("sparse");
		setMapSeed(42);

		const setup = finalizeSetup();
		expect(setup).not.toBeNull();
		expect(setup!.playerFaction).toBe("reclaimers");
		expect(setup!.mapPreset).toBe("duel");
		expect(setup!.startingResources).toBe("sparse");
		expect(setup!.seed).toBe(42);
	});

	it("assigns remaining factions as AI", () => {
		selectFaction("signal_choir");
		const setup = finalizeSetup()!;

		expect(setup.aiFactions).toHaveLength(3);
		expect(setup.aiFactions).toContain("reclaimers");
		expect(setup.aiFactions).toContain("volt_collective");
		expect(setup.aiFactions).toContain("iron_creed");
		expect(setup.aiFactions).not.toContain("signal_choir");
	});

	it("marks setup as finalized", () => {
		selectFaction("reclaimers");
		finalizeSetup();
		expect(isSetupFinalized()).toBe(true);
	});

	it("prevents changes after finalization", () => {
		selectFaction("reclaimers");
		finalizeSetup();

		expect(selectFaction("iron_creed")).toBe(false);
		expect(selectMapPreset("marathon")).toBe(false);
		expect(selectStartingResources("generous")).toBe(false);
	});

	it("returns null on second finalization", () => {
		selectFaction("reclaimers");
		finalizeSetup();
		expect(finalizeSetup()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetRaceSelection", () => {
	it("clears all state", () => {
		selectFaction("reclaimers");
		selectMapPreset("duel");
		finalizeSetup();

		resetRaceSelection();

		expect(getCurrentSelections().faction).toBeNull();
		expect(getCurrentSelections().mapPreset).toBe("standard");
		expect(isSetupFinalized()).toBe(false);
	});

	it("allows re-finalization after reset", () => {
		selectFaction("reclaimers");
		finalizeSetup();
		resetRaceSelection();

		selectFaction("iron_creed");
		const setup = finalizeSetup();
		expect(setup).not.toBeNull();
		expect(setup!.playerFaction).toBe("iron_creed");
	});
});
