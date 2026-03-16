import {
	BotLOD,
	Identity,
	MapFragment,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { world } from "../ecs/world";
import {
	getLODLevel,
	getLODLevelStateless,
	getLODStats,
	resetBotLOD,
} from "./botLOD";

// Mock dependencies
jest.mock("./zoomTier", () => ({
	getZoomTierState: jest.fn(() => ({
		tier: "tactical",
		transitionProgress: 1,
		transitioning: false,
		previousTier: "tactical",
		networkLineOpacity: 1,
		resourceMarkersVisible: true,
		structureDetail: "full",
		unitDetail: "full",
		cameraHeight: 20,
		cellsAcross: 4.5,
	})),
}));

jest.mock("./frustumCulling", () => ({
	distanceSquaredToCamera: jest.fn(() => 0),
}));

const { getZoomTierState } = jest.mocked(jest.requireMock("./zoomTier"));
const { distanceSquaredToCamera } = jest.mocked(
	jest.requireMock("./frustumCulling"),
);

// Helper: spawn a minimal unit entity with BotLOD trait
function spawnTestUnit(id: string) {
	const entity = world.spawn(
		Identity,
		Unit,
		WorldPosition,
		MapFragment,
		BotLOD,
	);
	entity.set(Identity, { id, faction: "player" });
	entity.set(WorldPosition, { x: 0, y: 0, z: 0 });
	entity.set(MapFragment, { fragmentId: "test" });
	entity.set(Unit, {
		type: "maintenance_bot",
		archetypeId: "field_technician",
		markLevel: 1,
		speechProfile: "mentor",
		displayName: "Test Bot",
		speed: 1,
		selected: false,
		components: [],
	});
	entity.set(BotLOD, { level: "full" });
	return entity;
}

beforeEach(() => {
	// Reset to defaults
	getZoomTierState.mockReturnValue({
		tier: "tactical",
		transitionProgress: 1,
		transitioning: false,
		previousTier: "tactical",
		networkLineOpacity: 1,
		resourceMarkersVisible: true,
		structureDetail: "full",
		unitDetail: "full",
		cameraHeight: 20,
		cellsAcross: 4.5,
	});
	distanceSquaredToCamera.mockReturnValue(0);
});

afterEach(() => {
	for (const e of world.query(BotLOD)) e.destroy();
});

describe("getLODLevel", () => {
	test("returns full for nearby units", () => {
		spawnTestUnit("unit1");
		distanceSquaredToCamera.mockReturnValue(100); // 10 units away
		expect(getLODLevel("unit1", 10, 0)).toBe("full");
	});

	test("returns simplified for mid-range units", () => {
		spawnTestUnit("unit2");
		distanceSquaredToCamera.mockReturnValue(40 * 40); // 40 units
		expect(getLODLevel("unit2", 40, 0)).toBe("simplified");
	});

	test("returns icon for far units", () => {
		spawnTestUnit("unit3");
		distanceSquaredToCamera.mockReturnValue(80 * 80); // 80 units
		expect(getLODLevel("unit3", 80, 0)).toBe("icon");
	});

	test("returns hidden for very far units", () => {
		spawnTestUnit("unit4");
		distanceSquaredToCamera.mockReturnValue(150 * 150); // 150 units
		expect(getLODLevel("unit4", 150, 0)).toBe("hidden");
	});
});

describe("zoom tier override", () => {
	test("world zoom forces hidden", () => {
		spawnTestUnit("unit5");
		getZoomTierState.mockReturnValue({
			tier: "world",
			transitionProgress: 1,
			transitioning: false,
			previousTier: "strategic",
			networkLineOpacity: 0.3,
			resourceMarkersVisible: false,
			structureDetail: "dot",
			unitDetail: "hidden",
			cameraHeight: 80,
			cellsAcross: 22,
		});
		distanceSquaredToCamera.mockReturnValue(0); // Even nearby
		expect(getLODLevel("unit5", 0, 0)).toBe("hidden");
	});

	test("strategic zoom caps at icon", () => {
		spawnTestUnit("unit6");
		getZoomTierState.mockReturnValue({
			tier: "strategic",
			transitionProgress: 1,
			transitioning: false,
			previousTier: "default",
			networkLineOpacity: 0.6,
			resourceMarkersVisible: false,
			structureDetail: "icon",
			unitDetail: "badge",
			cameraHeight: 50,
			cellsAcross: 12,
		});
		distanceSquaredToCamera.mockReturnValue(100); // Nearby
		expect(getLODLevel("unit6", 10, 0)).toBe("icon");
	});

	test("default zoom caps at simplified", () => {
		spawnTestUnit("unit7");
		getZoomTierState.mockReturnValue({
			tier: "default",
			transitionProgress: 1,
			transitioning: false,
			previousTier: "tactical",
			networkLineOpacity: 0.85,
			resourceMarkersVisible: true,
			structureDetail: "silhouette",
			unitDetail: "icon",
			cameraHeight: 30,
			cellsAcross: 7.5,
		});
		distanceSquaredToCamera.mockReturnValue(100); // Nearby
		expect(getLODLevel("unit7", 10, 0)).toBe("simplified");
	});
});

describe("getLODLevelStateless", () => {
	test("returns full for close positions", () => {
		distanceSquaredToCamera.mockReturnValue(25);
		expect(getLODLevelStateless(5, 0)).toBe("full");
	});

	test("returns simplified for mid-range", () => {
		distanceSquaredToCamera.mockReturnValue(45 * 45);
		expect(getLODLevelStateless(45, 0)).toBe("simplified");
	});
});

describe("getLODStats", () => {
	test("tracks LOD distribution", () => {
		spawnTestUnit("a");
		spawnTestUnit("b");

		distanceSquaredToCamera.mockReturnValue(10);
		getLODLevel("a", 0, 0);

		distanceSquaredToCamera.mockReturnValue(50 * 50);
		getLODLevel("b", 50, 0);

		const stats = getLODStats();
		expect(stats.full).toBe(1);
		expect(stats.simplified).toBe(1);
	});
});

describe("resetBotLOD", () => {
	test("resets all unit BotLOD traits to full", () => {
		spawnTestUnit("unit_reset");

		distanceSquaredToCamera.mockReturnValue(50 * 50);
		getLODLevel("unit_reset", 50, 0); // sets to simplified

		resetBotLOD();
		const stats = getLODStats();
		expect(stats.full).toBe(1);
		expect(stats.simplified).toBe(0);
		expect(stats.icon).toBe(0);
		expect(stats.hidden).toBe(0);
	});
});
