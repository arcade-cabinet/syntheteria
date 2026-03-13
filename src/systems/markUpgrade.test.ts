import {
	_reset,
	canUpgradeUnit,
	getAllUpgradeJobs,
	getUpgradeJob,
	getUpgradeTurns,
	isUnitDocked,
	markUpgradeTurnTick,
	startMarkUpgrade,
} from "./markUpgrade";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../ecs/traits", () => ({
	Building: "Building",
	Identity: "Identity",
	Unit: "Unit",
}));

const mockUnits: any[] = [];
const mockBuildings: any[] = [];

jest.mock("../ecs/world", () => ({
	units: {
		[Symbol.iterator]: () => mockUnits[Symbol.iterator](),
		get length() { return mockUnits.length; },
	},
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

jest.mock("./motorPool", () => ({
	canMotorPoolUpgradeMark: jest.fn(
		(_mpId: string, targetMark: number) => targetMark <= 3,
	),
	getMarkUpgradeCost: jest.fn((currentMark: number) => {
		const table: Record<number, any> = {
			1: {
				fromMark: 1,
				toMark: 2,
				costs: [
					{ type: "ferrousScrap", amount: 10 },
					{ type: "siliconWafer", amount: 4 },
				],
			},
			2: {
				fromMark: 2,
				toMark: 3,
				costs: [
					{ type: "ferrousScrap", amount: 20 },
					{ type: "siliconWafer", amount: 8 },
					{ type: "conductorWire", amount: 6 },
				],
			},
			3: {
				fromMark: 3,
				toMark: 4,
				costs: [
					{ type: "ferrousScrap", amount: 30 },
					{ type: "siliconWafer", amount: 12 },
					{ type: "conductorWire", amount: 10 },
					{ type: "elCrystal", amount: 2 },
				],
			},
			4: {
				fromMark: 4,
				toMark: 5,
				costs: [
					{ type: "ferrousScrap", amount: 50 },
					{ type: "siliconWafer", amount: 20 },
					{ type: "conductorWire", amount: 16 },
					{ type: "elCrystal", amount: 6 },
				],
			},
		};
		return table[currentMark] ?? null;
	}),
	getMotorPoolState: jest.fn((_id: string) => ({
		motorPoolEntityId: _id,
		tier: "elite",
		queue: [],
	})),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(id: string, markLevel: number) {
	return {
		get: (trait: string) => {
			if (trait === "Identity") return { id };
			if (trait === "Unit") return { type: "mecha_scout", markLevel };
			return null;
		},
		set: jest.fn(),
	};
}

function makeBuilding(id: string, powered: boolean) {
	return {
		get: (trait: string) => {
			if (trait === "Identity") return { id };
			if (trait === "Building")
				return { type: "motor_pool", powered, operational: powered };
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
	mockUnits.length = 0;
	mockBuildings.length = 0;
	setResources({});
});

describe("markUpgrade", () => {
	describe("getUpgradeTurns", () => {
		it("returns 2 turns for Mark II", () => {
			expect(getUpgradeTurns(2)).toBe(2);
		});

		it("returns 4 turns for Mark III", () => {
			expect(getUpgradeTurns(3)).toBe(4);
		});

		it("returns 8 turns for Mark IV", () => {
			expect(getUpgradeTurns(4)).toBe(8);
		});

		it("returns 8 turns for Mark V", () => {
			expect(getUpgradeTurns(5)).toBe(8);
		});

		it("returns 0 for invalid target mark", () => {
			expect(getUpgradeTurns(1)).toBe(0);
			expect(getUpgradeTurns(6)).toBe(0);
		});
	});

	describe("canUpgradeUnit", () => {
		it("returns possible for valid upgrade", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			const result = canUpgradeUnit("unit_0", "mp_0");
			expect(result.possible).toBe(true);
		});

		it("rejects unit already upgrading", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");
			const result = canUpgradeUnit("unit_0", "mp_0");
			expect(result.possible).toBe(false);
			expect(result.reason).toBe("Unit already upgrading");
		});

		it("rejects non-existent unit", () => {
			const result = canUpgradeUnit("nonexistent", "mp_0");
			expect(result.possible).toBe(false);
			expect(result.reason).toBe("Unit not found");
		});

		it("rejects unit at max mark", () => {
			mockUnits.push(makeUnit("unit_0", 5));
			const result = canUpgradeUnit("unit_0", "mp_0");
			expect(result.possible).toBe(false);
			expect(result.reason).toBe("Already at maximum Mark");
		});

		it("rejects when resources are insufficient", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 1 });
			const result = canUpgradeUnit("unit_0", "mp_0");
			expect(result.possible).toBe(false);
			expect(result.reason).toBe("Insufficient resources");
		});
	});

	describe("startMarkUpgrade", () => {
		it("starts upgrade and docks the unit", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			const result = startMarkUpgrade("unit_0", "mp_0");
			expect(result).toBe(true);
			expect(isUnitDocked("unit_0")).toBe(true);
		});

		it("creates a job with correct turn count", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");
			const job = getUpgradeJob("unit_0");
			expect(job).not.toBeNull();
			expect(job!.targetMark).toBe(2);
			expect(job!.turnsRemaining).toBe(2);
			expect(job!.totalTurns).toBe(2);
		});

		it("creates longer job for higher marks", () => {
			mockUnits.push(makeUnit("unit_0", 2));
			setResources({
				ferrousScrap: 100,
				siliconWafer: 100,
				conductorWire: 100,
			});
			startMarkUpgrade("unit_0", "mp_0");
			const job = getUpgradeJob("unit_0");
			expect(job!.turnsRemaining).toBe(4);
			expect(job!.targetMark).toBe(3);
		});

		it("fails when canUpgradeUnit fails", () => {
			// No unit registered
			const result = startMarkUpgrade("unit_0", "mp_0");
			expect(result).toBe(false);
			expect(isUnitDocked("unit_0")).toBe(false);
		});

		it("spends resources on start", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");
			const { spendResource } = require("./resources");
			expect(spendResource).toHaveBeenCalledWith("ferrousScrap", 10);
			expect(spendResource).toHaveBeenCalledWith("siliconWafer", 4);
		});
	});

	describe("isUnitDocked", () => {
		it("returns false for non-upgrading unit", () => {
			expect(isUnitDocked("unit_0")).toBe(false);
		});

		it("returns true for upgrading unit", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");
			expect(isUnitDocked("unit_0")).toBe(true);
		});
	});

	describe("getAllUpgradeJobs", () => {
		it("returns empty array when no jobs", () => {
			expect(getAllUpgradeJobs()).toEqual([]);
		});

		it("returns all active jobs", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			mockUnits.push(makeUnit("unit_1", 2));
			setResources({
				ferrousScrap: 200,
				siliconWafer: 200,
				conductorWire: 200,
			});
			startMarkUpgrade("unit_0", "mp_0");
			startMarkUpgrade("unit_1", "mp_1");
			expect(getAllUpgradeJobs()).toHaveLength(2);
		});
	});

	describe("markUpgradeTurnTick", () => {
		it("decrements turns remaining when motor pool is powered", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			mockBuildings.push(makeBuilding("mp_0", true));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");

			markUpgradeTurnTick();

			const job = getUpgradeJob("unit_0");
			expect(job!.turnsRemaining).toBe(1);
		});

		it("does not decrement when motor pool is unpowered", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			mockBuildings.push(makeBuilding("mp_0", false));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");

			markUpgradeTurnTick();

			const job = getUpgradeJob("unit_0");
			expect(job!.turnsRemaining).toBe(2);
		});

		it("completes upgrade and updates unit mark level", () => {
			const unit = makeUnit("unit_0", 1);
			mockUnits.push(unit);
			mockBuildings.push(makeBuilding("mp_0", true));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");

			// Mark I→II takes 2 turns
			markUpgradeTurnTick();
			markUpgradeTurnTick();

			// Job should be removed after completion
			expect(getUpgradeJob("unit_0")).toBeNull();
			expect(isUnitDocked("unit_0")).toBe(false);

			// Unit's mark level should have been updated
			expect(unit.set).toHaveBeenCalledWith(
				"Unit",
				expect.objectContaining({ markLevel: 2 }),
			);
		});

		it("does not complete if motor pool loses power mid-upgrade", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			const building = makeBuilding("mp_0", true);
			mockBuildings.push(building);
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");

			// First tick succeeds (powered)
			markUpgradeTurnTick();
			expect(getUpgradeJob("unit_0")!.turnsRemaining).toBe(1);

			// Swap to unpowered building
			mockBuildings.length = 0;
			mockBuildings.push(makeBuilding("mp_0", false));

			// Second tick should not progress (unpowered)
			markUpgradeTurnTick();
			expect(getUpgradeJob("unit_0")!.turnsRemaining).toBe(1);
		});

		it("handles multiple concurrent upgrades independently", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			mockUnits.push(makeUnit("unit_1", 2));
			mockBuildings.push(makeBuilding("mp_0", true));
			mockBuildings.push(makeBuilding("mp_1", true));
			setResources({
				ferrousScrap: 200,
				siliconWafer: 200,
				conductorWire: 200,
			});

			startMarkUpgrade("unit_0", "mp_0"); // 2 turns
			startMarkUpgrade("unit_1", "mp_1"); // 4 turns

			markUpgradeTurnTick();

			expect(getUpgradeJob("unit_0")!.turnsRemaining).toBe(1);
			expect(getUpgradeJob("unit_1")!.turnsRemaining).toBe(3);

			markUpgradeTurnTick();

			// unit_0 completes, unit_1 still going
			expect(getUpgradeJob("unit_0")).toBeNull();
			expect(getUpgradeJob("unit_1")!.turnsRemaining).toBe(2);
		});

		it("skips upgrade if motor pool building is missing", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			// No building registered in mockBuildings
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");

			markUpgradeTurnTick();

			// Should not have progressed
			expect(getUpgradeJob("unit_0")!.turnsRemaining).toBe(2);
		});
	});

	describe("resetMarkUpgradeState", () => {
		it("clears all active upgrades", () => {
			mockUnits.push(makeUnit("unit_0", 1));
			setResources({ ferrousScrap: 100, siliconWafer: 100 });
			startMarkUpgrade("unit_0", "mp_0");
			expect(getAllUpgradeJobs()).toHaveLength(1);

			_reset();

			expect(getAllUpgradeJobs()).toHaveLength(0);
			expect(isUnitDocked("unit_0")).toBe(false);
		});
	});
});
