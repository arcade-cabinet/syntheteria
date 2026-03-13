import { PlayerGovernor } from "./PlayerGovernor";

// ─── Mock State ──────────────────────────────────────────────────────────────

interface MockUnitState {
	Identity: { id: string; faction: string };
	WorldPosition: { x: number; y: number; z: number };
	Unit: {
		type: string;
		components: Array<{ name: string; functional: boolean; material: string }>;
	};
}

interface MockBuildingState {
	Identity: { id: string; faction: string };
	WorldPosition: { x: number; y: number; z: number };
	Building: { type: string; powered: boolean; operational: boolean };
}

const mockUnits: MockUnitState[] = [];
const mockBuildings: MockBuildingState[] = [];
const mockTurnStates = new Map<
	string,
	{
		entityId: string;
		actionPoints: number;
		maxActionPoints: number;
		movementPoints: number;
		maxMovementPoints: number;
		activated: boolean;
	}
>();

let mockStartHarvestResult = true;
const mockMoveCommands: Array<{ entityId: string; target: { x: number; y: number; z: number } }> =
	[];
const mockAPSpent: Array<{ entityId: string; cost: number }> = [];
const mockMPSpent: Array<{ entityId: string; cost: number }> = [];

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("../../ecs/world", () => {
	function createEntityAccessor(entry: MockUnitState | MockBuildingState) {
		return {
			get(trait: unknown) {
				const name = (trait as any)?.name ?? String(trait);
				if (name === "Identity") return (entry as any).Identity;
				if (name === "WorldPosition") return (entry as any).WorldPosition;
				if (name === "Unit") return (entry as any).Unit;
				if (name === "Building") return (entry as any).Building;
				return null;
			},
		};
	}

	return {
		world: {
			entities: [],
			query: (...traits: unknown[]) => {
				const traitNames = traits.map((t: any) => t?.name ?? String(t));
				if (traitNames.includes("Building") && !traitNames.includes("Unit")) {
					return mockBuildings.map(createEntityAccessor);
				}
				return mockUnits.map(createEntityAccessor);
			},
		},
		units: {
			[Symbol.iterator]: () => mockUnits.map((entry) => createEntityAccessor(entry))[Symbol.iterator](),
		},
		buildings: {
			[Symbol.iterator]: () => mockBuildings.map((entry) => createEntityAccessor(entry))[Symbol.iterator](),
		},
	};
});

jest.mock("../../ecs/traits", () => ({
	Unit: { name: "Unit" },
	Building: { name: "Building" },
	WorldPosition: { name: "WorldPosition" },
	Identity: { name: "Identity" },
}));

jest.mock("../../world/sectorCoordinates", () => ({
	worldToGrid: (x: number, z: number) => ({
		q: Math.round(x / 2),
		r: Math.round(z / 2),
	}),
	gridToWorld: (q: number, r: number) => ({
		x: q * 2,
		y: 0,
		z: r * 2,
	}),
}));

jest.mock("../../bots/commandProfiles", () => ({
	getBotCommandProfile: (unitType: string) => ({
		canMove: true,
		canAttack: unitType === "field_fighter" || unitType === "mecha_golem",
		canHarvest: unitType === "fabrication_unit",
		canRepair: unitType === "maintenance_bot",
		canSurvey: true,
	}),
}));

jest.mock("../../systems/turnSystem", () => ({
	getUnitTurnState: (entityId: string) => mockTurnStates.get(entityId) ?? null,
	hasActionPoints: (entityId: string) =>
		(mockTurnStates.get(entityId)?.actionPoints ?? 0) > 0,
	hasMovementPoints: (entityId: string) =>
		(mockTurnStates.get(entityId)?.movementPoints ?? 0) > 0,
	spendActionPoint: (entityId: string, cost: number) => {
		const state = mockTurnStates.get(entityId);
		if (state && state.actionPoints >= cost) {
			state.actionPoints -= cost;
			mockAPSpent.push({ entityId, cost });
			return true;
		}
		return false;
	},
	spendMovementPoints: (entityId: string, cost: number) => {
		const state = mockTurnStates.get(entityId);
		if (state && state.movementPoints >= cost) {
			state.movementPoints -= cost;
			mockMPSpent.push({ entityId, cost });
			return true;
		}
		return false;
	},
}));

jest.mock("../../systems/harvestSystem", () => ({
	isStructureConsumed: () => false,
	startHarvest: (
		harvesterId: string,
		structureId: number,
		modelId: string,
		modelFamily: string,
		targetX: number,
		targetZ: number,
	) => mockStartHarvestResult,
}));

jest.mock("../../systems/resourcePools", () => ({
	isHarvestable: (family: string) => family !== "floor",
	getResourcePoolForModel: () => ({
		label: "Structure",
		harvestDuration: 60,
		consumedOnHarvest: true,
		yields: [{ resource: "heavy_metals", min: 3, max: 5 }],
	}),
}));

jest.mock("../../world/session", () => ({
	getActiveWorldSession: () => ({
		sectorStructures: [
			{
				id: 1,
				q: 5,
				r: 5,
				model_id: "wall_01",
				placement_layer: "wall",
				offset_x: 0,
				offset_z: 0,
			},
			{
				id: 2,
				q: 6,
				r: 5,
				model_id: "pipe_01",
				placement_layer: "pipe",
				offset_x: 0,
				offset_z: 0,
			},
		],
	}),
}));

jest.mock("../../world/structuralSpace", () => ({
	getSectorCell: (q: number, r: number) => ({
		q,
		r,
		passable: true,
		discovery_state: q > 10 ? 0 : 2, // Cells beyond q=10 are undiscovered
	}),
}));

jest.mock("../../systems/territorySystem", () => ({
	getTensionsForDefender: () => [],
}));

jest.mock("../../ecs/seed", () => ({
	gameplayRandom: () => 0.5,
}));

jest.mock("../core/WorldAIService", () => ({
	issueMoveCommand: (entityId: string, target: { x: number; y: number; z: number }) => {
		mockMoveCommands.push({ entityId, target });
		return true;
	},
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addUnit(
	id: string,
	faction: string,
	unitType: string,
	x: number,
	z: number,
	components?: MockUnitState["Unit"]["components"],
) {
	mockUnits.push({
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
		Unit: {
			type: unitType,
			components: components ?? [
				{ name: "processor", functional: true, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
			],
		},
	});
}

function addBuilding(id: string, faction: string, type: string, x: number, z: number) {
	mockBuildings.push({
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
		Building: { type, powered: true, operational: true },
	});
}

function addTurnState(entityId: string, ap: number, mp: number) {
	mockTurnStates.set(entityId, {
		entityId,
		actionPoints: ap,
		maxActionPoints: 2,
		movementPoints: mp,
		maxMovementPoints: 3,
		activated: false,
	});
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockUnits.length = 0;
	mockBuildings.length = 0;
	mockTurnStates.clear();
	mockMoveCommands.length = 0;
	mockAPSpent.length = 0;
	mockMPSpent.length = 0;
	mockStartHarvestResult = true;
});

describe("PlayerGovernor", () => {
	describe("construction", () => {
		it("creates a governor for a faction", () => {
			const governor = new PlayerGovernor("player");
			expect(governor.factionId).toBe("player");
		});

		it("works for rival factions", () => {
			const governor = new PlayerGovernor("rogue");
			expect(governor.factionId).toBe("rogue");
		});
	});

	describe("executeTurn", () => {
		it("returns empty decisions when no units exist", () => {
			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.factionId).toBe("player");
			expect(result.turnNumber).toBe(1);
			expect(result.decisions).toEqual([]);
		});

		it("skips units with no AP or MP remaining", () => {
			addUnit("unit_0", "player", "mecha_scout", 0, 0);
			addTurnState("unit_0", 0, 0);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions).toEqual([]);
		});

		it("only processes units from its own faction", () => {
			addUnit("unit_0", "player", "mecha_scout", 0, 0);
			addUnit("enemy_0", "rogue", "mecha_scout", 0, 0);
			addTurnState("unit_0", 2, 3);
			addTurnState("enemy_0", 2, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			// Should only have decisions for player units
			expect(result.decisions.every((d) => d.entityId === "unit_0")).toBe(true);
		});
	});

	describe("scout decisions", () => {
		it("scouts explore toward unexplored cells", () => {
			addUnit("unit_0", "player", "mecha_scout", 0, 0);
			addTurnState("unit_0", 0, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("explore");
			expect(mockMoveCommands.length).toBe(1);
			expect(mockMPSpent.length).toBe(1);
		});

		it("does not explore without MP", () => {
			addUnit("unit_0", "player", "mecha_scout", 0, 0);
			addTurnState("unit_0", 2, 0);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions).toEqual([]);
		});
	});

	describe("fabricator decisions", () => {
		it("harvests nearby structures when in range with AP", () => {
			// Unit at (10,10), structure at grid (5,5) = world (10,10)
			addUnit("unit_0", "player", "fabrication_unit", 10, 10);
			addTurnState("unit_0", 2, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("harvest");
			expect(mockAPSpent.length).toBe(1);
		});

		it("moves toward harvest targets when out of range", () => {
			// Unit within scan range but outside harvest range of structures
			// Structures are at world (10,10) and (12,10), unit at (20,10)
			addUnit("unit_0", "player", "fabrication_unit", 20, 10);
			addTurnState("unit_0", 2, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("move_to_harvest");
			expect(mockMoveCommands.length).toBe(1);
		});

		it("falls back to exploration if no harvest targets", () => {
			// Unit very far from any structures
			addUnit("unit_0", "player", "fabrication_unit", 200, 200);
			addTurnState("unit_0", 0, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			// Should explore since no harvestable targets are in range
			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("explore");
		});
	});

	describe("striker decisions", () => {
		it("moves toward hostiles when detected", () => {
			addUnit("unit_0", "player", "field_fighter", 0, 0);
			addUnit("enemy_0", "rogue", "field_fighter", 8, 0);
			addTurnState("unit_0", 2, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			const decision = result.decisions[0];
			expect(decision.action).toBe("move_to_attack");
			expect(mockMoveCommands.length).toBe(1);
		});

		it("attacks when hostile is in melee range", () => {
			addUnit("unit_0", "player", "field_fighter", 0, 0);
			addUnit("enemy_0", "rogue", "field_fighter", 2, 0);
			addTurnState("unit_0", 2, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("attack");
			expect(mockAPSpent.length).toBe(1);
		});

		it("explores when no hostiles around", () => {
			addUnit("unit_0", "player", "field_fighter", 0, 0);
			addTurnState("unit_0", 0, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("explore");
		});
	});

	describe("guardian decisions", () => {
		it("engages nearby hostiles", () => {
			addUnit("unit_0", "player", "mecha_golem", 0, 0);
			addUnit("enemy_0", "rogue", "field_fighter", 2, 0);
			addTurnState("unit_0", 2, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("defend_attack");
		});

		it("positions near buildings when idle", () => {
			addUnit("unit_0", "player", "mecha_golem", 0, 0);
			addBuilding("bldg_0", "player", "lightning_rod", 20, 20);
			addTurnState("unit_0", 0, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("position_defense");
			expect(mockMoveCommands.length).toBe(1);
		});
	});

	describe("technician decisions", () => {
		it("repairs nearby damaged allies", () => {
			addUnit("unit_0", "player", "maintenance_bot", 0, 0);
			addUnit("unit_1", "player", "mecha_scout", 2, 0, [
				{ name: "camera", functional: false, material: "electronic" },
				{ name: "legs", functional: true, material: "metal" },
			]);
			addTurnState("unit_0", 2, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			// Technician should attempt repair (closest damaged ally in range)
			expect(result.decisions.length).toBeGreaterThanOrEqual(1);
			const techDecision = result.decisions.find(
				(d) => d.entityId === "unit_0",
			);
			expect(techDecision).toBeDefined();
			expect(techDecision!.action).toBe("repair");
		});

		it("explores when no damaged allies nearby", () => {
			addUnit("unit_0", "player", "maintenance_bot", 0, 0);
			addTurnState("unit_0", 0, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("explore");
		});
	});

	describe("hauler decisions", () => {
		it("explores since transport is not implemented", () => {
			addUnit("unit_0", "player", "utility_drone", 0, 0);
			addTurnState("unit_0", 0, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			expect(result.decisions.length).toBe(1);
			expect(result.decisions[0].action).toBe("explore");
		});
	});

	describe("turn result", () => {
		it("includes faction ID and turn number", () => {
			const governor = new PlayerGovernor("rogue");
			const result = governor.executeTurn(42);

			expect(result.factionId).toBe("rogue");
			expect(result.turnNumber).toBe(42);
		});

		it("processes multiple units in role priority order", () => {
			// Add units in reverse priority order
			addUnit("unit_0", "player", "utility_drone", 0, 0);
			addUnit("unit_1", "player", "mecha_scout", 10, 10);
			addUnit("unit_2", "player", "field_fighter", 20, 20);
			addTurnState("unit_0", 0, 3);
			addTurnState("unit_1", 0, 3);
			addTurnState("unit_2", 0, 3);

			const governor = new PlayerGovernor("player");
			const result = governor.executeTurn(1);

			// Should have decisions for all 3 units
			expect(result.decisions.length).toBe(3);

			// Scout should be processed first (explore), then striker, then hauler
			expect(result.decisions[0].entityId).toBe("unit_1"); // scout
			expect(result.decisions[1].entityId).toBe("unit_2"); // striker
			expect(result.decisions[2].entityId).toBe("unit_0"); // hauler
		});
	});
});
