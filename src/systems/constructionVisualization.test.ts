import {
	_reset,
	advanceConstructionTurn,
	BUILDING_STAGE_TURNS,
	getAllConstructionStates,
	getBuildingConstructionState,
	getConstructionOverlayData,
	getConstructionProgress,
	getConstructionVisualConfig,
	isBuildingUnderConstruction,
	STAGE_VISUAL_CONFIG,
	startBuildingConstruction,
} from "./constructionVisualization";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../ecs/traits", () => ({
	Building: "Building",
	Identity: "Identity",
	WorldPosition: "WorldPosition",
}));

const mockBuildings: any[] = [];
jest.mock("../ecs/world", () => ({
	buildings: {
		[Symbol.iterator]: () => mockBuildings[Symbol.iterator](),
		get length() {
			return mockBuildings.length;
		},
	},
}));

function makeBuilding(id: string, type: string, x: number, z: number) {
	const state = {
		type,
		powered: false,
		operational: false,
	};
	return {
		get: (trait: string) => {
			if (trait === "Identity") return { id };
			if (trait === "Building") return state;
			if (trait === "WorldPosition") return { x, y: 0, z };
			return null;
		},
		set: (_trait: string, val: any) => {
			Object.assign(state, val);
		},
		_state: state,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	_reset();
	mockBuildings.length = 0;
});

describe("constructionVisualization", () => {
	describe("STAGE_VISUAL_CONFIG", () => {
		it("has configs for all 4 stages", () => {
			expect(Object.keys(STAGE_VISUAL_CONFIG)).toEqual([
				"foundation",
				"shell",
				"interior",
				"operational",
			]);
		});

		it("foundation is translucent with wireframe", () => {
			const config = STAGE_VISUAL_CONFIG.foundation;
			expect(config.opacity).toBe(0.4);
			expect(config.wireframe).toBe(true);
			expect(config.progress).toBe(0.25);
		});

		it("operational is fully opaque with no wireframe", () => {
			const config = STAGE_VISUAL_CONFIG.operational;
			expect(config.opacity).toBe(1.0);
			expect(config.wireframe).toBe(false);
			expect(config.progress).toBe(1.0);
		});

		it("progress increases through stages", () => {
			const stages = [
				"foundation",
				"shell",
				"interior",
				"operational",
			] as const;
			for (let i = 1; i < stages.length; i++) {
				expect(STAGE_VISUAL_CONFIG[stages[i]!].progress).toBeGreaterThan(
					STAGE_VISUAL_CONFIG[stages[i - 1]!].progress,
				);
			}
		});
	});

	describe("BUILDING_STAGE_TURNS", () => {
		it("defines stage turns for all 8 building types", () => {
			expect(Object.keys(BUILDING_STAGE_TURNS)).toHaveLength(8);
		});

		it("lightning_rod is instant (all zeros)", () => {
			const turns = BUILDING_STAGE_TURNS.lightning_rod!;
			expect(
				turns.foundation + turns.shell + turns.interior + turns.operational,
			).toBe(0);
		});

		it("motor_pool takes 7 total turns", () => {
			const turns = BUILDING_STAGE_TURNS.motor_pool!;
			expect(
				turns.foundation + turns.shell + turns.interior + turns.operational,
			).toBe(7);
		});
	});

	describe("startBuildingConstruction", () => {
		it("skips instant buildings (lightning_rod)", () => {
			startBuildingConstruction("bldg_0", "lightning_rod");
			expect(getBuildingConstructionState("bldg_0")).toBeNull();
			expect(isBuildingUnderConstruction("bldg_0")).toBe(false);
		});

		it("starts staged construction for motor_pool", () => {
			startBuildingConstruction("bldg_1", "motor_pool");
			const state = getBuildingConstructionState("bldg_1");
			expect(state).not.toBeNull();
			expect(state!.currentStage).toBe("foundation");
			expect(state!.turnsRemaining).toBe(2);
			expect(state!.totalTurns).toBe(7);
		});

		it("is tracked in under-construction list", () => {
			startBuildingConstruction("bldg_1", "motor_pool");
			expect(isBuildingUnderConstruction("bldg_1")).toBe(true);
			expect(getAllConstructionStates()).toHaveLength(1);
		});

		it("ignores unknown building types", () => {
			startBuildingConstruction("bldg_x", "unknown_type");
			expect(getBuildingConstructionState("bldg_x")).toBeNull();
		});
	});

	describe("advanceConstructionTurn", () => {
		it("decrements turns remaining", () => {
			startBuildingConstruction("bldg_1", "defense_turret");
			// defense_turret foundation = 1 turn
			advanceConstructionTurn(); // 1→0
			const state = getBuildingConstructionState("bldg_1");
			expect(state!.turnsRemaining).toBe(0);
			expect(state!.currentStage).toBe("foundation");

			advanceConstructionTurn(); // advance to shell (2 turns)
			const state2 = getBuildingConstructionState("bldg_1");
			expect(state2!.currentStage).toBe("shell");
			expect(state2!.turnsRemaining).toBe(2);
		});

		it("advances through all stages to completion", () => {
			startBuildingConstruction("bldg_1", "relay_tower");
			// relay_tower: foundation=1, shell=1, interior=0, operational=0 → total 2
			const bldg = makeBuilding("bldg_1", "relay_tower", 5, 5);
			mockBuildings.push(bldg);

			advanceConstructionTurn(); // foundation 1→0
			advanceConstructionTurn(); // advance to shell (1 turn)
			advanceConstructionTurn(); // shell 1→0
			advanceConstructionTurn(); // advance to interior (0 turns)
			advanceConstructionTurn(); // advance to operational (0 turns)
			advanceConstructionTurn(); // finalize

			expect(isBuildingUnderConstruction("bldg_1")).toBe(false);
			// Building should be powered now
			expect((bldg as any)._state.powered).toBe(true);
			expect((bldg as any)._state.operational).toBe(true);
		});

		it("processes multiple buildings independently", () => {
			startBuildingConstruction("bldg_1", "relay_tower");
			startBuildingConstruction("bldg_2", "motor_pool");
			expect(getAllConstructionStates()).toHaveLength(2);

			advanceConstructionTurn();
			const s1 = getBuildingConstructionState("bldg_1");
			const s2 = getBuildingConstructionState("bldg_2");
			// They should be in different states
			expect(s1).not.toBeNull();
			expect(s2).not.toBeNull();
		});
	});

	describe("getConstructionProgress", () => {
		it("returns 1.0 for non-tracked buildings", () => {
			expect(getConstructionProgress("nonexistent")).toBe(1.0);
		});

		it("returns 0 at start of construction", () => {
			startBuildingConstruction("bldg_1", "motor_pool");
			// At foundation stage with 2 turns remaining, 0 completed
			expect(getConstructionProgress("bldg_1")).toBe(0);
		});

		it("increases as turns advance", () => {
			startBuildingConstruction("bldg_1", "motor_pool");
			const p0 = getConstructionProgress("bldg_1");
			advanceConstructionTurn();
			const p1 = getConstructionProgress("bldg_1");
			expect(p1).toBeGreaterThan(p0);
		});
	});

	describe("getConstructionVisualConfig", () => {
		it("returns null for non-tracked buildings", () => {
			expect(getConstructionVisualConfig("nonexistent")).toBeNull();
		});

		it("returns foundation config at start", () => {
			startBuildingConstruction("bldg_1", "motor_pool");
			const config = getConstructionVisualConfig("bldg_1");
			expect(config).not.toBeNull();
			expect(config!.wireframe).toBe(true);
			expect(config!.opacity).toBe(0.4);
		});
	});

	describe("getConstructionOverlayData", () => {
		it("returns empty for no constructions", () => {
			expect(getConstructionOverlayData()).toEqual([]);
		});

		it("includes position from building entity", () => {
			startBuildingConstruction("bldg_1", "motor_pool");
			mockBuildings.push(makeBuilding("bldg_1", "motor_pool", 15, 25));
			const overlays = getConstructionOverlayData();
			expect(overlays).toHaveLength(1);
			expect(overlays[0]!.position).toEqual({ x: 15, y: 0, z: 25 });
			expect(overlays[0]!.stageLabel).toBe("Foundation");
		});

		it("returns null position when entity is missing", () => {
			startBuildingConstruction("bldg_1", "motor_pool");
			const overlays = getConstructionOverlayData();
			expect(overlays[0]!.position).toBeNull();
		});
	});
});
