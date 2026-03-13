import {
	checkElimination,
	checkSubjugation,
	checkTechnicalSupremacy,
	checkVictoryConditions,
	countFactionUnits,
	getVictoryCondition,
	resetVictoryConditions,
	SUBJUGATION_THRESHOLD,
	TECH_SUPREMACY_MARK_LEVEL,
	TECH_SUPREMACY_UNIT_COUNT,
} from "./victoryConditions";
import type { EconomyFactionId } from "./factionEconomy";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockWorldQueryResults: Map<string, any[]> = new Map();
const mockCellOwnership = new Map<string, any>();
const mockFactionTerritorySizes = new Map<string, number>();

jest.mock("../ecs/traits", () => ({
	Identity: "Identity",
	Unit: "Unit",
	WorldPosition: "WorldPosition",
}));

jest.mock("../ecs/world", () => ({
	world: {
		query: (...traits: any[]) => {
			const key = traits.map(String).sort().join(",");
			return mockWorldQueryResults.get(key) ?? [];
		},
	},
}));

jest.mock("./territorySystem", () => ({
	getAllCellOwnership: () => mockCellOwnership,
	getFactionTerritorySize: (faction: string) =>
		mockFactionTerritorySizes.get(faction) ?? 0,
}));

jest.mock("./turnSystem", () => ({
	getTurnState: () => ({ turnNumber: 10 }),
}));

jest.mock("./factionEconomy", () => ({
	ALL_ECONOMY_FACTIONS: ["player", "rogue", "cultist", "feral"],
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUnitEntity(
	id: string,
	faction: string,
	markLevel = 1,
) {
	return {
		get: (trait: any) => {
			const name = String(trait);
			if (name === "Identity") return { id, faction };
			if (name === "Unit")
				return {
					type: "maintenance_bot",
					markLevel,
					components: [{ name: "arms", functional: true }],
				};
			if (name === "WorldPosition") return { x: 0, y: 0, z: 0 };
			return undefined;
		},
	};
}

function setupUnits(units: any[]) {
	// Both queries used by victory system
	const unitIdentityPos = ["Identity", "Unit", "WorldPosition"]
		.sort()
		.join(",");
	const unitIdentity = ["Identity", "Unit"].sort().join(",");
	mockWorldQueryResults.set(unitIdentityPos, units);
	mockWorldQueryResults.set(unitIdentity, units);
}

function setupTerritory(cells: Array<{ q: number; r: number; owner: string }>) {
	mockCellOwnership.clear();
	mockFactionTerritorySizes.clear();

	const counts = new Map<string, number>();
	for (const cell of cells) {
		const key = `${cell.q},${cell.r}`;
		mockCellOwnership.set(key, cell);
		counts.set(cell.owner, (counts.get(cell.owner) ?? 0) + 1);
	}
	for (const [faction, count] of counts) {
		mockFactionTerritorySizes.set(faction, count);
	}
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockWorldQueryResults.clear();
	mockCellOwnership.clear();
	mockFactionTerritorySizes.clear();
	resetVictoryConditions();
	setupUnits([]);
});

describe("victoryConditions — constants", () => {
	it("subjugation requires 60% territory", () => {
		expect(SUBJUGATION_THRESHOLD).toBe(0.6);
	});

	it("technical supremacy requires 3 Mark V units", () => {
		expect(TECH_SUPREMACY_UNIT_COUNT).toBe(3);
		expect(TECH_SUPREMACY_MARK_LEVEL).toBe(5);
	});
});

describe("countFactionUnits", () => {
	it("returns zero counts when no units exist", () => {
		setupUnits([]);
		const counts = countFactionUnits();
		expect(counts.get("player")).toBe(0);
		expect(counts.get("rogue")).toBe(0);
	});

	it("counts units per faction", () => {
		setupUnits([
			makeUnitEntity("p1", "player"),
			makeUnitEntity("p2", "player"),
			makeUnitEntity("r1", "rogue"),
		]);
		const counts = countFactionUnits();
		expect(counts.get("player")).toBe(2);
		expect(counts.get("rogue")).toBe(1);
		expect(counts.get("cultist")).toBe(0);
	});
});

describe("checkSubjugation", () => {
	it("returns null when no territory exists", () => {
		setupTerritory([]);
		expect(checkSubjugation("player", 10)).toBeNull();
	});

	it("returns null when faction has less than 60%", () => {
		// 5 cells player, 5 cells rogue = 50%
		const cells = [];
		for (let i = 0; i < 5; i++) {
			cells.push({ q: i, r: 0, owner: "player" });
			cells.push({ q: i, r: 1, owner: "rogue" });
		}
		setupTerritory(cells);
		expect(checkSubjugation("player", 10)).toBeNull();
	});

	it("returns victory when faction controls 60%+", () => {
		// 7 cells player, 3 cells rogue = 70%
		const cells = [];
		for (let i = 0; i < 7; i++) {
			cells.push({ q: i, r: 0, owner: "player" });
		}
		for (let i = 0; i < 3; i++) {
			cells.push({ q: i, r: 1, owner: "rogue" });
		}
		setupTerritory(cells);

		const result = checkSubjugation("player", 10);
		expect(result).not.toBeNull();
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("subjugation");
		expect(result!.turnNumber).toBe(10);
	});

	it("detects exactly 60% threshold", () => {
		// 6 cells player, 4 cells rogue = 60%
		const cells = [];
		for (let i = 0; i < 6; i++) {
			cells.push({ q: i, r: 0, owner: "player" });
		}
		for (let i = 0; i < 4; i++) {
			cells.push({ q: i, r: 1, owner: "rogue" });
		}
		setupTerritory(cells);

		const result = checkSubjugation("player", 10);
		expect(result).not.toBeNull();
		expect(result!.type).toBe("subjugation");
	});
});

describe("checkTechnicalSupremacy", () => {
	it("returns null with fewer than 3 Mark V units", () => {
		setupUnits([
			makeUnitEntity("p1", "player", 5),
			makeUnitEntity("p2", "player", 5),
			makeUnitEntity("p3", "player", 3),
		]);
		expect(checkTechnicalSupremacy("player", 10)).toBeNull();
	});

	it("returns victory with 3+ Mark V units", () => {
		setupUnits([
			makeUnitEntity("p1", "player", 5),
			makeUnitEntity("p2", "player", 5),
			makeUnitEntity("p3", "player", 5),
		]);

		const result = checkTechnicalSupremacy("player", 10);
		expect(result).not.toBeNull();
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("technical_supremacy");
	});

	it("counts Mark VI+ as qualifying", () => {
		setupUnits([
			makeUnitEntity("p1", "player", 7),
			makeUnitEntity("p2", "player", 6),
			makeUnitEntity("p3", "player", 5),
		]);

		const result = checkTechnicalSupremacy("player", 10);
		expect(result).not.toBeNull();
	});

	it("does not count other factions' units", () => {
		setupUnits([
			makeUnitEntity("p1", "player", 5),
			makeUnitEntity("p2", "player", 5),
			makeUnitEntity("r1", "rogue", 5), // rogue's unit, not player's
		]);

		expect(checkTechnicalSupremacy("player", 10)).toBeNull();
	});
});

describe("checkElimination", () => {
	it("returns null when other factions have units", () => {
		const counts = new Map<EconomyFactionId, number>([
			["player", 3],
			["rogue", 1],
			["cultist", 0],
			["feral", 0],
		]);
		expect(checkElimination("player", counts, 10)).toBeNull();
	});

	it("returns victory when all other factions have 0 units", () => {
		const counts = new Map<EconomyFactionId, number>([
			["player", 3],
			["rogue", 0],
			["cultist", 0],
			["feral", 0],
		]);

		const result = checkElimination("player", counts, 10);
		expect(result).not.toBeNull();
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("elimination");
	});

	it("any faction can win by elimination", () => {
		const counts = new Map<EconomyFactionId, number>([
			["player", 0],
			["rogue", 2],
			["cultist", 0],
			["feral", 0],
		]);

		const result = checkElimination("rogue", counts, 15);
		expect(result).not.toBeNull();
		expect(result!.winner).toBe("rogue");
	});
});

describe("checkVictoryConditions — integration", () => {
	it("returns null when no victory condition met", () => {
		setupUnits([
			makeUnitEntity("p1", "player"),
			makeUnitEntity("r1", "rogue"),
		]);
		setupTerritory([
			{ q: 0, r: 0, owner: "player" },
			{ q: 1, r: 0, owner: "rogue" },
		]);

		expect(checkVictoryConditions()).toBeNull();
	});

	it("detects player elimination victory", () => {
		setupUnits([
			makeUnitEntity("p1", "player"),
			makeUnitEntity("p2", "player"),
		]);

		const result = checkVictoryConditions();
		expect(result).not.toBeNull();
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("elimination");
	});

	it("persists victory once detected", () => {
		setupUnits([makeUnitEntity("p1", "player")]);

		const first = checkVictoryConditions();
		expect(first).not.toBeNull();

		// Add rogue units — victory should still be the same
		setupUnits([
			makeUnitEntity("p1", "player"),
			makeUnitEntity("r1", "rogue"),
		]);
		const second = checkVictoryConditions();
		expect(second).toBe(first);
	});

	it("getVictoryCondition returns null before check", () => {
		expect(getVictoryCondition()).toBeNull();
	});

	it("getVictoryCondition returns result after check", () => {
		setupUnits([makeUnitEntity("p1", "player")]);
		checkVictoryConditions();
		expect(getVictoryCondition()).not.toBeNull();
	});

	it("resetVictoryConditions clears state", () => {
		setupUnits([makeUnitEntity("p1", "player")]);
		checkVictoryConditions();
		expect(getVictoryCondition()).not.toBeNull();

		resetVictoryConditions();
		expect(getVictoryCondition()).toBeNull();
	});

	it("dead factions cannot win", () => {
		// Rogue has territory but no units
		setupUnits([makeUnitEntity("p1", "player")]);
		setupTerritory([
			{ q: 0, r: 0, owner: "rogue" },
			{ q: 1, r: 0, owner: "rogue" },
			{ q: 2, r: 0, owner: "rogue" },
			{ q: 3, r: 0, owner: "rogue" },
			{ q: 4, r: 0, owner: "rogue" },
			{ q: 5, r: 0, owner: "rogue" },
			{ q: 6, r: 0, owner: "rogue" },
			{ q: 7, r: 0, owner: "player" },
		]);

		const result = checkVictoryConditions();
		// Rogue controls 87.5% of territory but has 0 units — cannot win
		// Player should win by elimination
		expect(result).not.toBeNull();
		expect(result!.winner).toBe("player");
		expect(result!.type).toBe("elimination");
	});
});
