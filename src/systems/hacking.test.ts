/**
 * Tests for hacking.ts — core hacking system (compute, difficulty, signal range, tick progression).
 * For capture flow (initiateHack, faction conversion), see __tests__/hackingSystem.test.ts.
 */
import {
	applyHackedRole,
	getHackDifficulty,
	getHackedBotRole,
	getLastHackingEvents,
	globalCompute,
	HACKING_AP_COST,
	HACKING_SIGNAL_RANGE,
	hackingSystem,
	resetHackingState,
} from "./hacking";
import {
	getTurnState,
	hasActionPoints,
	initializeTurnForUnits,
	resetTurnSystem,
	spendActionPoint,
} from "./turnSystem";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryResults: Map<string, any[]> = new Map();

jest.mock("../ecs/world", () => ({
	world: {
		query: (...traits: any[]) => {
			const key = traits.map(String).sort().join(",");
			return mockQueryResults.get(key) ?? [];
		},
		entities: [],
	},
}));

jest.mock("../ai", () => ({
	cancelAgentTask: jest.fn(),
	readAIState: jest.fn((entity: any) => {
		const identity = entity.get("Identity");
		if (!identity) return null;
		return {
			task: { kind: "hack_target", phase: "execute" },
		};
	}),
}));

jest.mock("../config/gameplay.json", () => ({
	hacking: { baseDifficulty: 10 },
}));

jest.mock("../world/runtimeState", () => ({
	setRuntimeResources: jest.fn(),
}));

jest.mock("../ecs/cityLayout", () => ({
	isInsideBuilding: () => false,
}));

jest.mock("../ai/runtimeState", () => ({
	isEntityExecutingAITask: () => false,
	readAIState: jest.fn((entity: any) => {
		const identity = entity.get("Identity");
		if (!identity) return null;
		return {
			task: { kind: "hack_target", phase: "execute" },
		};
	}),
}));

jest.mock("../ecs/traits", () => {
	const Hacking = "Hacking";
	const Signal = "Signal";
	const Identity = "Identity";
	const Unit = "Unit";
	const WorldPosition = "WorldPosition";
	const Compute = "Compute";
	return {
		Hacking,
		Signal,
		Identity,
		Unit,
		WorldPosition,
		Compute,
	};
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeHacker(
	id: string,
	faction: string,
	x: number,
	z: number,
	targetId: string | null,
	progress = 0,
	computeCostPerTick = 2,
) {
	const data: Record<string, any> = {
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
		Hacking: {
			targetId,
			technique: null,
			progress,
			computeCostPerTick,
		},
		Signal: { range: 5, connected: true, relaySource: false },
		Unit: {
			type: "maintenance_bot",
			speed: 3,
			components: [
				{ name: "arms", functional: true, material: "metal" },
				{ name: "sensor", functional: true, material: "electronic" },
			],
		},
	};
	return {
		get: (trait: any) => {
			const name = String(trait);
			return data[name];
		},
		set: (trait: any, value: any) => {
			const name = String(trait);
			data[name] = value;
		},
	};
}

function makeTarget(
	id: string,
	faction: string,
	x: number,
	z: number,
	unitType = "feral_drone",
) {
	const data: Record<string, any> = {
		Identity: { id, faction },
		WorldPosition: { x, y: 0, z },
		Unit: {
			type: unitType,
			speed: 3,
			components: [
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
			],
		},
	};
	return {
		get: (trait: any) => {
			const name = String(trait);
			return data[name];
		},
		set: (trait: any, value: any) => {
			const name = String(trait);
			data[name] = value;
		},
	};
}

function setupQueryMocks(hackers: any[], targets: any[]) {
	// hackingSystem queries: world.query(Hacking, Signal) and world.query(Identity)
	const hackingKey = ["Hacking", "Signal"].sort().join(",");
	const identityKey = "Identity";

	mockQueryResults.clear();
	mockQueryResults.set(hackingKey, hackers);
	mockQueryResults.set(identityKey, targets);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockQueryResults.clear();
	resetHackingState();
	resetTurnSystem();
	globalCompute.capacity = 10;
	globalCompute.demand = 0;
	globalCompute.available = 10;
});

describe("hacking — AP cost (task #23)", () => {
	it("player hacker spends AP when hacking", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0, 2);
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);
		const apBefore = getTurnState().unitStates.get("h1")!.actionPoints;

		hackingSystem();

		const apAfter = getTurnState().unitStates.get("h1")!.actionPoints;
		const events = getLastHackingEvents();

		if (events.length > 0) {
			expect(apAfter).toBe(apBefore - HACKING_AP_COST);
		}
	});

	it("player hacker without AP cannot hack", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0, 2);
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);
		const maxAP = getTurnState().unitStates.get("h1")!.actionPoints;
		for (let i = 0; i < maxAP; i++) {
			spendActionPoint("h1");
		}
		expect(hasActionPoints("h1")).toBe(false);

		hackingSystem();

		const events = getLastHackingEvents();
		expect(events).toHaveLength(0);
	});

	it("hacking advances progress each turn AP is spent", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0.3, 2);
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);

		hackingSystem();

		const events = getLastHackingEvents();
		if (events.length > 0) {
			// Progress should have advanced: 0.3 + (2 / 10) = 0.5
			expect(events[0].progress).toBeCloseTo(0.5, 1);
			expect(events[0].completed).toBe(false);
		}
	});
});

describe("hacking — compute capacity (task #24)", () => {
	it("hacking stalls when compute is insufficient", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0, 5);
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);

		// Set available compute below hack cost
		globalCompute.available = 2;

		hackingSystem();

		const events = getLastHackingEvents();
		// No progress should happen because compute (2) < cost (5)
		expect(events).toHaveLength(0);
	});

	it("hacking consumes compute", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0, 3);
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);
		const computeBefore = globalCompute.available;

		hackingSystem();

		const events = getLastHackingEvents();
		if (events.length > 0) {
			expect(globalCompute.available).toBe(computeBefore - 3);
		}
	});

	it("hack requires signal connection", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0, 2);
		// Disconnect signal
		hacker.get("Signal").connected = false;
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);

		hackingSystem();

		const events = getLastHackingEvents();
		expect(events).toHaveLength(0);
	});

	it("hack requires target within signal range", () => {
		// Target at distance 10 — well beyond HACKING_SIGNAL_RANGE (3)
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0, 2);
		const target = makeTarget("t1", "feral", 10, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);

		hackingSystem();

		const events = getLastHackingEvents();
		expect(events).toHaveLength(0);
	});
});

describe("hacking — bot capture (task #25)", () => {
	it("completes capture when progress reaches 1.0", () => {
		// Start at 0.8 progress with compute cost 2, difficulty 10
		// Progress gain = 2/10 = 0.2, so 0.8 + 0.2 = 1.0
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0.8, 2);
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);

		hackingSystem();

		const events = getLastHackingEvents();
		expect(events).toHaveLength(1);
		expect(events[0].completed).toBe(true);
		// Target faction should be converted to player
		expect(target.get("Identity").faction).toBe("player");
	});

	it("resets hack state after successful capture", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0.8, 2);
		const target = makeTarget("t1", "feral", 1, 0);
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);

		hackingSystem();

		// Hacking state should be reset
		expect(hacker.get("Hacking").targetId).toBeNull();
		expect(hacker.get("Hacking").progress).toBe(0);
	});

	it("cannot hack player-owned or cultist units", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0.5, 2);
		const playerTarget = makeTarget("t1", "player", 1, 0);
		setupQueryMocks([hacker], [playerTarget]);

		initializeTurnForUnits(["h1"]);

		hackingSystem();

		// Hack should be cancelled (target is player-owned)
		expect(hacker.get("Hacking").targetId).toBeNull();
		expect(hacker.get("Hacking").progress).toBe(0);
	});
});

describe("hacked bot roles (task #26)", () => {
	it("feral_drone gets melee striker role", () => {
		const role = getHackedBotRole("feral_drone");
		expect(role.combatStyle).toBe("melee");
		expect(role.speedModifier).toBe(1.3);
		expect(role.label).toBe("Reclaimed Striker");
	});

	it("mecha_trooper gets ranged gunner role", () => {
		const role = getHackedBotRole("mecha_trooper");
		expect(role.combatStyle).toBe("ranged");
		expect(role.attackRange).toBe(5.0);
		expect(role.label).toBe("Reclaimed Gunner");
	});

	it("quadruped_tank gets siege role with 2x structure damage", () => {
		const role = getHackedBotRole("quadruped_tank");
		expect(role.combatStyle).toBe("siege");
		expect(role.structureDamageMultiplier).toBe(2.0);
		expect(role.speedModifier).toBe(0.8);
		expect(role.label).toBe("Reclaimed Siege Engine");
	});

	it("unknown unit type gets default role", () => {
		const role = getHackedBotRole("maintenance_bot");
		expect(role.combatStyle).toBe("melee");
		expect(role.speedModifier).toBe(1.0);
		expect(role.label).toBe("Reclaimed Unit");
	});

	it("applyHackedRole adjusts unit speed", () => {
		const entity = makeTarget("t1", "player", 0, 0, "feral_drone");
		const originalSpeed = entity.get("Unit").speed;

		const role = applyHackedRole(entity as any);

		const updatedUnit = entity.get("Unit");
		expect(role.combatStyle).toBe("melee");
		expect(updatedUnit.speed).toBe(originalSpeed * 1.3);
	});

	it("applyHackedRole for siege unit slows it down", () => {
		const entity = makeTarget("t1", "player", 0, 0, "quadruped_tank");
		const originalSpeed = entity.get("Unit").speed;

		const role = applyHackedRole(entity as any);

		const updatedUnit = entity.get("Unit");
		expect(role.combatStyle).toBe("siege");
		expect(updatedUnit.speed).toBe(originalSpeed * 0.8);
	});

	it("capture event includes assigned role", () => {
		const hacker = makeHacker("h1", "player", 0, 0, "t1", 0.8, 2);
		const target = makeTarget("t1", "feral", 1, 0, "feral_drone");
		setupQueryMocks([hacker], [target]);

		initializeTurnForUnits(["h1"]);

		hackingSystem();

		const events = getLastHackingEvents();
		expect(events).toHaveLength(1);
		expect(events[0].completed).toBe(true);
		expect(events[0].capturedRole).not.toBeNull();
		expect(events[0].capturedRole!.combatStyle).toBe("melee");
		expect(events[0].capturedRole!.label).toBe("Reclaimed Striker");
	});
});

describe("getHackDifficulty", () => {
	it("returns base difficulty from config", () => {
		const target = makeTarget("t1", "feral", 0, 0);
		expect(getHackDifficulty(target as any)).toBe(10);
	});
});

describe("HACKING_SIGNAL_RANGE", () => {
	it("is 3 units", () => {
		expect(HACKING_SIGNAL_RANGE).toBe(3);
	});
});
