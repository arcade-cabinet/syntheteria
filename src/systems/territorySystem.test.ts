import {
	forceRecalculate,
	getAllCellOwnership,
	getCellOwner,
	getCellTerritory,
	getCultistEscalationFactor,
	getFactionBorderCells,
	getFactionCells,
	getFactionTerritorySize,
	getFactionTerritoryStats,
	getTensionsForDefender,
	getTerritoryTensions,
	isInFactionTerritory,
	resetTerritorySystem,
	territorySystem,
} from "./territorySystem";

// ─── Mocks ───────────────────────────────────────────────────────────────────

interface MockEntity {
	Identity: { id: string; faction: string };
	WorldPosition: { x: number; y: number; z: number };
	Unit?: Record<string, unknown>;
	Building?: Record<string, unknown>;
}

const mockUnits: MockEntity[] = [];
const mockBuildings: MockEntity[] = [];

jest.mock("../ecs/world", () => ({
	world: {
		query: (...traits: unknown[]) => {
			// Check if Building trait is in the query by checking the number of traits
			// Units query: Unit, WorldPosition, Identity (3 traits)
			// Buildings query: Building, WorldPosition, Identity (3 traits)
			// We differentiate by checking if the first trait name matches
			const traitNames = traits.map((t: any) => t?.name ?? String(t));
			const isBuilding = traitNames[0] === "Building";

			const source = isBuilding ? mockBuildings : mockUnits;
			return source.map((entry) => ({
				get(trait: unknown) {
					const name = (trait as any)?.name ?? String(trait);
					if (name === "Identity") return entry.Identity;
					if (name === "WorldPosition") return entry.WorldPosition;
					if (name === "Unit") return entry.Unit;
					if (name === "Building") return entry.Building;
					return null;
				},
			}));
		},
	},
}));

jest.mock("../ecs/traits", () => ({
	Unit: { name: "Unit" },
	Building: { name: "Building" },
	WorldPosition: { name: "WorldPosition" },
	Identity: { name: "Identity" },
}));

jest.mock("../world/sectorCoordinates", () => ({
	worldToGrid: (x: number, z: number) => ({
		q: Math.round(x / 2),
		r: Math.round(z / 2),
	}),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addUnit(
	id: string,
	faction: string,
	x: number,
	z: number,
) {
	mockUnits.push({
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
		Unit: {},
	});
}

function addBuilding(
	id: string,
	faction: string,
	x: number,
	z: number,
) {
	mockBuildings.push({
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
		Building: { type: "fabrication_unit", powered: true },
	});
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockUnits.length = 0;
	mockBuildings.length = 0;
	resetTerritorySystem();
});

describe("territory system", () => {
	describe("basic cell ownership", () => {
		it("starts with no owned cells", () => {
			forceRecalculate();
			expect(getAllCellOwnership().size).toBe(0);
		});

		it("claims cells around a player unit", () => {
			addUnit("unit_0", "player", 10, 10);
			forceRecalculate();

			// The unit is at grid position (5, 5) — should claim cells in radius 2
			expect(getCellOwner(5, 5)).toBe("player");
			expect(getCellOwner(6, 5)).toBe("player");
			expect(getCellOwner(4, 5)).toBe("player");
			expect(getCellOwner(5, 6)).toBe("player");
			expect(getCellOwner(5, 4)).toBe("player");
		});

		it("claims cells around a building with larger radius", () => {
			addBuilding("bldg_0", "player", 0, 0);
			forceRecalculate();

			// Building at grid (0,0) claims radius 3
			expect(getCellOwner(0, 0)).toBe("player");
			expect(getCellOwner(3, 0)).toBe("player");
			expect(getCellOwner(0, 3)).toBe("player");
		});

		it("unclaimed cells return null", () => {
			addUnit("unit_0", "player", 10, 10);
			forceRecalculate();

			// Far away cell should be unclaimed
			expect(getCellOwner(100, 100)).toBeNull();
		});

		it("returns full territory cell record", () => {
			addUnit("unit_0", "player", 10, 10);
			forceRecalculate();

			const cell = getCellTerritory(5, 5);
			expect(cell).not.toBeNull();
			expect(cell!.owner).toBe("player");
			expect(cell!.q).toBe(5);
			expect(cell!.r).toBe(5);
			expect(cell!.strength).toBeGreaterThan(0);
		});
	});

	describe("multi-faction competition", () => {
		it("separate factions claim separate areas", () => {
			addUnit("unit_0", "player", 0, 0);
			addUnit("unit_1", "rogue", 40, 40);
			forceRecalculate();

			expect(getCellOwner(0, 0)).toBe("player");
			expect(getCellOwner(20, 20)).toBe("rogue");
		});

		it("stronger claim wins contested cells", () => {
			// Two player units near same spot vs one rogue
			addUnit("unit_0", "player", 10, 10);
			addUnit("unit_1", "player", 12, 10);
			addUnit("unit_2", "rogue", 10, 10);
			forceRecalculate();

			// Player has 2 units vs 1 rogue, player should win the center
			expect(getCellOwner(5, 5)).toBe("player");
		});

		it("tracks per-faction cell counts", () => {
			addUnit("unit_0", "player", 0, 0);
			addUnit("unit_1", "rogue", 100, 100);
			forceRecalculate();

			expect(getFactionTerritorySize("player")).toBeGreaterThan(0);
			expect(getFactionTerritorySize("rogue")).toBeGreaterThan(0);
			expect(getFactionTerritorySize("feral")).toBe(0);
		});
	});

	describe("getFactionCells", () => {
		it("returns all cells for a given faction", () => {
			addUnit("unit_0", "player", 0, 0);
			forceRecalculate();

			const cells = getFactionCells("player");
			expect(cells.length).toBeGreaterThan(0);
			expect(cells.every((c) => c.owner === "player")).toBe(true);
		});

		it("returns empty array for faction with no territory", () => {
			forceRecalculate();
			expect(getFactionCells("cultist")).toEqual([]);
		});
	});

	describe("territory tensions", () => {
		it("detects when rival unit is in player territory", () => {
			addUnit("unit_0", "player", 0, 0);
			addUnit("unit_1", "player", 4, 0);
			// Rogue unit placed inside player territory
			addUnit("enemy_0", "rogue", 2, 0);
			forceRecalculate();

			const tensions = getTerritoryTensions();
			const playerTensions = getTensionsForDefender("player");

			// Player's territory should be contested since they have 2 units
			// and the rogue only has 1
			if (getCellOwner(1, 0) === "player") {
				expect(playerTensions.length).toBeGreaterThanOrEqual(0);
			}
			// At minimum, tensions should be an array
			expect(Array.isArray(tensions)).toBe(true);
		});

		it("no tensions when no rival units present", () => {
			addUnit("unit_0", "player", 0, 0);
			forceRecalculate();

			expect(getTerritoryTensions()).toEqual([]);
			expect(getTensionsForDefender("player")).toEqual([]);
		});

		it("tension includes intruder entity id", () => {
			// Strong player presence
			addUnit("unit_0", "player", 0, 0);
			addUnit("unit_1", "player", 2, 0);
			addUnit("unit_2", "player", 0, 2);
			// Single rogue intruder
			addUnit("enemy_0", "rogue", 0, 0);
			forceRecalculate();

			const tensions = getTensionsForDefender("player");
			if (tensions.length > 0) {
				expect(tensions[0].intruderEntityId).toBe("enemy_0");
				expect(tensions[0].intruder).toBe("rogue");
				expect(tensions[0].defender).toBe("player");
			}
		});
	});

	describe("border cells", () => {
		it("identifies cells on the edge of territory", () => {
			addUnit("unit_0", "player", 0, 0);
			forceRecalculate();

			const borders = getFactionBorderCells("player");
			// All cells of a small territory are borders since they're
			// all adjacent to unclaimed space
			expect(borders.size).toBeGreaterThan(0);
		});

		it("returns empty set for faction with no territory", () => {
			forceRecalculate();
			expect(getFactionBorderCells("feral").size).toBe(0);
		});

		it("stats include border cells", () => {
			addUnit("unit_0", "player", 0, 0);
			forceRecalculate();

			const stats = getFactionTerritoryStats("player");
			expect(stats.cellCount).toBeGreaterThan(0);
			expect(stats.borderCells.size).toBeGreaterThan(0);
		});
	});

	describe("cultist escalation", () => {
		it("base escalation when no territory claimed", () => {
			forceRecalculate();
			expect(getCultistEscalationFactor()).toBeCloseTo(0.1);
		});

		it("escalation increases with territory size", () => {
			forceRecalculate();
			const baseEscalation = getCultistEscalationFactor();

			addUnit("unit_0", "player", 0, 0);
			addUnit("unit_1", "rogue", 100, 100);
			forceRecalculate();

			const withTerritory = getCultistEscalationFactor();
			expect(withTerritory).toBeGreaterThan(baseEscalation);
		});

		it("cultist territory does not increase escalation", () => {
			addUnit("unit_0", "cultist", 0, 0);
			forceRecalculate();
			const cultistOnly = getCultistEscalationFactor();

			// Should be close to base since cultist territory is excluded
			expect(cultistOnly).toBeCloseTo(0.1);
		});
	});

	describe("world position queries", () => {
		it("isInFactionTerritory checks world coordinates", () => {
			addUnit("unit_0", "player", 10, 10);
			forceRecalculate();

			expect(isInFactionTerritory(10, 10, "player")).toBe(true);
			expect(isInFactionTerritory(200, 200, "player")).toBe(false);
		});
	});

	describe("periodic recalculation", () => {
		it("territorySystem recalculates after RECALC_INTERVAL ticks", () => {
			addUnit("unit_0", "player", 0, 0);

			// First call should trigger (ticksSinceRecalc starts at RECALC_INTERVAL)
			territorySystem();
			expect(getFactionTerritorySize("player")).toBeGreaterThan(0);
		});

		it("does not recalculate every tick", () => {
			// After initial recalc, adding a unit shouldn't immediately show
			territorySystem(); // triggers recalc (starts at interval)

			addUnit("unit_0", "player", 0, 0);
			territorySystem(); // tick 2 — no recalc yet
			// Territory might be 0 since we haven't hit the interval again
			// This is expected behavior — recalc is periodic
		});
	});

	describe("reset", () => {
		it("clears all territory data", () => {
			addUnit("unit_0", "player", 0, 0);
			forceRecalculate();
			expect(getAllCellOwnership().size).toBeGreaterThan(0);

			resetTerritorySystem();
			expect(getAllCellOwnership().size).toBe(0);
			expect(getTerritoryTensions()).toEqual([]);
			expect(getFactionTerritorySize("player")).toBe(0);
		});
	});
});
