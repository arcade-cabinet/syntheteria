import {
	BOT_FABRICATION_RECIPES,
	MOTOR_POOL_TIER_CONFIG,
	MOTOR_POOL_UPGRADE_COSTS,
	_reset,
	getAllMotorPools,
	getMotorPoolState,
	motorPoolTurnTick,
	queueBotFabrication,
	registerMotorPool,
	upgradeMotorPool,
} from "./motorPool";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../bots", () => ({
	getBotDefinition: jest.fn((type: string) => ({
		unitType: type,
		label: `Mock ${type}`,
		baseSpeed: 3,
		defaultAiRole: "player_unit",
	})),
}));

const mockSpawnUnit = jest.fn((_opts?: unknown) => ({}));
jest.mock("../ecs/factory", () => ({
	spawnUnit: (opts: unknown) => mockSpawnUnit(opts),
}));

jest.mock("../ecs/traits", () => ({
	Building: "Building",
	Identity: "Identity",
	MapFragment: "MapFragment",
	WorldPosition: "WorldPosition",
}));

const mockBuildings: any[] = [];
jest.mock("../ecs/world", () => ({
	buildings: {
		[Symbol.iterator]: () => mockBuildings[Symbol.iterator](),
		get length() { return mockBuildings.length; },
	},
}));

const mockResources: Record<string, number> = {};
jest.mock("./resources", () => ({
	getResources: jest.fn(() => ({ ...mockResources })),
	spendResource: jest.fn((type: string, amount: number) => {
		if ((mockResources[type] ?? 0) < amount) return false;
		mockResources[type] = (mockResources[type] ?? 0) - amount;
		return true;
	}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuilding(id: string, type: string, powered: boolean, x: number, z: number) {
	return {
		get: (trait: string) => {
			if (trait === "Identity") return { id };
			if (trait === "Building") return { type, powered, operational: powered };
			if (trait === "WorldPosition") return { x, y: 0, z };
			if (trait === "MapFragment") return { fragmentId: "frag_0" };
			return null;
		},
	};
}

function setResources(values: Record<string, number>) {
	Object.keys(mockResources).forEach((k) => delete mockResources[k]);
	Object.assign(mockResources, values);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	_reset();
	mockBuildings.length = 0;
	mockSpawnUnit.mockClear();
	setResources({});
});

describe("motorPool", () => {
	describe("tier configuration", () => {
		it("basic tier allows 1 queue slot and Mark I bots", () => {
			expect(MOTOR_POOL_TIER_CONFIG.basic).toEqual({
				maxQueue: 1,
				maxMark: 1,
				speedMultiplier: 1.0,
			});
		});

		it("advanced tier allows 2 queue slots and Mark II bots", () => {
			expect(MOTOR_POOL_TIER_CONFIG.advanced).toEqual({
				maxQueue: 2,
				maxMark: 2,
				speedMultiplier: 1.25,
			});
		});

		it("elite tier allows 3 queue slots and Mark III bots", () => {
			expect(MOTOR_POOL_TIER_CONFIG.elite).toEqual({
				maxQueue: 3,
				maxMark: 3,
				speedMultiplier: 1.5,
			});
		});
	});

	describe("registration", () => {
		it("registers a new Motor Pool", () => {
			registerMotorPool("mp_0");
			const state = getMotorPoolState("mp_0");
			expect(state).not.toBeNull();
			expect(state!.tier).toBe("basic");
			expect(state!.queue).toEqual([]);
		});

		it("does not duplicate on re-registration", () => {
			registerMotorPool("mp_0");
			registerMotorPool("mp_0");
			expect(getAllMotorPools()).toHaveLength(1);
		});

		it("returns null for unregistered Motor Pool", () => {
			expect(getMotorPoolState("nonexistent")).toBeNull();
		});
	});

	describe("bot fabrication recipes", () => {
		it("defines recipes for 7 player bot types", () => {
			expect(BOT_FABRICATION_RECIPES).toHaveLength(7);
		});

		it("all recipes have positive costs and build times", () => {
			for (const recipe of BOT_FABRICATION_RECIPES) {
				expect(recipe.buildTurns).toBeGreaterThan(0);
				expect(recipe.costs.length).toBeGreaterThan(0);
				for (const cost of recipe.costs) {
					expect(cost.amount).toBeGreaterThan(0);
				}
			}
		});

		it("includes maintenance_bot as cheapest option", () => {
			const mbRecipe = BOT_FABRICATION_RECIPES.find(
				(r) => r.botType === "maintenance_bot",
			);
			expect(mbRecipe).toBeDefined();
			expect(mbRecipe!.buildTurns).toBe(3);
		});

		it("quadruped_tank is the most expensive", () => {
			const qtRecipe = BOT_FABRICATION_RECIPES.find(
				(r) => r.botType === "quadruped_tank",
			);
			expect(qtRecipe).toBeDefined();
			expect(qtRecipe!.buildTurns).toBe(8);
		});
	});

	describe("queueBotFabrication", () => {
		it("fails for unregistered Motor Pool", () => {
			expect(queueBotFabrication("mp_0", "maintenance_bot")).toBe(false);
		});

		it("fails when resources are insufficient", () => {
			registerMotorPool("mp_0");
			setResources({ ferrousScrap: 1 });
			expect(queueBotFabrication("mp_0", "maintenance_bot")).toBe(false);
		});

		it("succeeds with sufficient resources", () => {
			registerMotorPool("mp_0");
			setResources({ ferrousScrap: 10, alloyStock: 10, conductorWire: 10 });
			expect(queueBotFabrication("mp_0", "maintenance_bot")).toBe(true);
			const state = getMotorPoolState("mp_0");
			expect(state!.queue).toHaveLength(1);
			expect(state!.queue[0]!.botType).toBe("maintenance_bot");
			expect(state!.queue[0]!.turnsRemaining).toBe(3);
		});

		it("basic tier rejects second queue entry", () => {
			registerMotorPool("mp_0");
			setResources({
				ferrousScrap: 100,
				alloyStock: 100,
				conductorWire: 100,
			});
			expect(queueBotFabrication("mp_0", "maintenance_bot")).toBe(true);
			expect(queueBotFabrication("mp_0", "utility_drone")).toBe(false);
		});

		it("advanced tier accepts two queue entries", () => {
			registerMotorPool("mp_0", "advanced");
			setResources({
				ferrousScrap: 100,
				alloyStock: 100,
				conductorWire: 100,
				polymerSalvage: 100,
			});
			expect(queueBotFabrication("mp_0", "maintenance_bot")).toBe(true);
			expect(queueBotFabrication("mp_0", "utility_drone")).toBe(true);
			expect(getMotorPoolState("mp_0")!.queue).toHaveLength(2);
		});

		it("fails for unknown bot type", () => {
			registerMotorPool("mp_0");
			setResources({ ferrousScrap: 100, alloyStock: 100 });
			expect(queueBotFabrication("mp_0", "nonexistent_bot" as any)).toBe(false);
		});
	});

	describe("upgradeMotorPool", () => {
		it("upgrades from basic to advanced", () => {
			registerMotorPool("mp_0");
			setResources({
				ferrousScrap: 20,
				alloyStock: 10,
				siliconWafer: 6,
			});
			expect(upgradeMotorPool("mp_0")).toBe(true);
			expect(getMotorPoolState("mp_0")!.tier).toBe("advanced");
		});

		it("upgrades from advanced to elite", () => {
			registerMotorPool("mp_0", "advanced");
			setResources({
				ferrousScrap: 30,
				alloyStock: 15,
				siliconWafer: 10,
				conductorWire: 8,
			});
			expect(upgradeMotorPool("mp_0")).toBe(true);
			expect(getMotorPoolState("mp_0")!.tier).toBe("elite");
		});

		it("fails to upgrade past elite", () => {
			registerMotorPool("mp_0", "elite");
			setResources({ ferrousScrap: 999, alloyStock: 999 });
			expect(upgradeMotorPool("mp_0")).toBe(false);
		});

		it("fails when resources are insufficient", () => {
			registerMotorPool("mp_0");
			setResources({ ferrousScrap: 1 });
			expect(upgradeMotorPool("mp_0")).toBe(false);
			expect(getMotorPoolState("mp_0")!.tier).toBe("basic");
		});
	});

	describe("motorPoolTurnTick", () => {
		it("does nothing with no Motor Pools", () => {
			motorPoolTurnTick();
			expect(mockSpawnUnit).not.toHaveBeenCalled();
		});

		it("does nothing with empty queue", () => {
			registerMotorPool("mp_0");
			mockBuildings.push(makeBuilding("mp_0", "motor_pool", true, 10, 10));
			motorPoolTurnTick();
			expect(mockSpawnUnit).not.toHaveBeenCalled();
		});

		it("decrements turns remaining each tick", () => {
			registerMotorPool("mp_0");
			setResources({ ferrousScrap: 100, alloyStock: 100, conductorWire: 100 });
			queueBotFabrication("mp_0", "maintenance_bot");
			mockBuildings.push(makeBuilding("mp_0", "motor_pool", true, 10, 10));

			motorPoolTurnTick();
			expect(getMotorPoolState("mp_0")!.queue[0]!.turnsRemaining).toBe(2);
		});

		it("spawns bot when turns reach 0", () => {
			registerMotorPool("mp_0");
			setResources({ ferrousScrap: 100, alloyStock: 100, conductorWire: 100 });
			queueBotFabrication("mp_0", "maintenance_bot");
			mockBuildings.push(makeBuilding("mp_0", "motor_pool", true, 10, 10));

			// Tick 3 times (maintenance_bot buildTurns = 3)
			motorPoolTurnTick();
			motorPoolTurnTick();
			motorPoolTurnTick();

			expect(mockSpawnUnit).toHaveBeenCalledTimes(1);
			expect(mockSpawnUnit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "maintenance_bot",
					x: 12,
					z: 12,
					fragmentId: "frag_0",
				}),
			);
			expect(getMotorPoolState("mp_0")!.queue).toHaveLength(0);
		});

		it("pauses fabrication when Motor Pool is unpowered", () => {
			registerMotorPool("mp_0");
			setResources({ ferrousScrap: 100, alloyStock: 100, conductorWire: 100 });
			queueBotFabrication("mp_0", "maintenance_bot");
			// Unpowered building
			mockBuildings.push(makeBuilding("mp_0", "motor_pool", false, 10, 10));

			motorPoolTurnTick();
			// Should not advance when unpowered
			expect(getMotorPoolState("mp_0")!.queue[0]!.turnsRemaining).toBe(3);
		});

		it("processes queue serially — only first job advances", () => {
			registerMotorPool("mp_0", "advanced");
			setResources({
				ferrousScrap: 100,
				alloyStock: 100,
				conductorWire: 100,
				polymerSalvage: 100,
			});
			queueBotFabrication("mp_0", "maintenance_bot");
			queueBotFabrication("mp_0", "utility_drone");
			mockBuildings.push(makeBuilding("mp_0", "motor_pool", true, 10, 10));

			motorPoolTurnTick();
			const state = getMotorPoolState("mp_0")!;
			expect(state.queue[0]!.turnsRemaining).toBe(2);
			// Second job unchanged
			expect(state.queue[1]!.turnsRemaining).toBe(3);
		});
	});

	describe("upgrade costs", () => {
		it("basic tier has no upgrade cost (it's the starting tier)", () => {
			expect(MOTOR_POOL_UPGRADE_COSTS.basic).toBeNull();
		});

		it("advanced upgrade costs are defined", () => {
			expect(MOTOR_POOL_UPGRADE_COSTS.advanced).toHaveLength(3);
		});

		it("elite upgrade costs are defined and more expensive", () => {
			expect(MOTOR_POOL_UPGRADE_COSTS.elite).toHaveLength(4);
		});
	});
});
