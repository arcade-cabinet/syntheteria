/**
 * Tests for the minimap data system.
 */

jest.mock("../../../config", () => ({
	config: {},
}));

import {
	initMinimap,
	setMinimapConfig,
	updateMinimapEntity,
	removeMinimapEntity,
	revealFog,
	isFogRevealed,
	setTerritory,
	generateMinimapData,
	getMinimapStats,
	resetMinimap,
	type MinimapTerrainCell,
} from "../minimapData";

function makeTerrain(resolution: number): MinimapTerrainCell[][] {
	return Array.from({ length: resolution }, (_, z) =>
		Array.from({ length: resolution }, (_, x) => ({
			height: (x + z) / (resolution * 2),
			isWater: false,
		})),
	);
}

function makeTerrainWithWater(
	resolution: number,
	waterCells: [number, number][],
): MinimapTerrainCell[][] {
	const terrain = makeTerrain(resolution);
	for (const [x, z] of waterCells) {
		if (z < resolution && x < resolution) {
			terrain[z][x] = { height: 0, isWater: true };
		}
	}
	return terrain;
}

const smallConfig = {
	resolution: 8,
	worldSize: 80,
	showFog: true,
	showTerritoryBorders: true,
	showHazards: true,
};

beforeEach(() => {
	resetMinimap();
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe("initialization", () => {
	it("initializes with terrain data", () => {
		const terrain = makeTerrain(8);
		initMinimap(smallConfig, terrain);

		const stats = getMinimapStats();
		expect(stats.resolution).toBe(8);
		expect(stats.totalCells).toBe(64);
	});

	it("starts with all fog hidden", () => {
		initMinimap(smallConfig, makeTerrain(8));

		const stats = getMinimapStats();
		expect(stats.revealedCells).toBe(0);
		expect(stats.revealedPercent).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Fog of war
// ---------------------------------------------------------------------------

describe("fog of war", () => {
	it("reveals fog at position", () => {
		initMinimap(smallConfig, makeTerrain(8));
		// Cell size = 80/8 = 10. Position (15, 15) = cell (1,1)
		revealFog(15, 15, 5);

		expect(isFogRevealed(15, 15)).toBe(true);
	});

	it("fog stays revealed", () => {
		initMinimap(smallConfig, makeTerrain(8));
		revealFog(40, 40, 15);

		expect(isFogRevealed(40, 40)).toBe(true);
	});

	it("unrevealed position returns false", () => {
		initMinimap(smallConfig, makeTerrain(8));
		expect(isFogRevealed(40, 40)).toBe(false);
	});

	it("out-of-bounds position returns false", () => {
		initMinimap(smallConfig, makeTerrain(8));
		expect(isFogRevealed(-10, -10)).toBe(false);
		expect(isFogRevealed(1000, 1000)).toBe(false);
	});

	it("reveal updates stats", () => {
		initMinimap(smallConfig, makeTerrain(8));
		revealFog(40, 40, 50); // large radius reveals many cells

		const stats = getMinimapStats();
		expect(stats.revealedCells).toBeGreaterThan(0);
		expect(stats.revealedPercent).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Entity tracking
// ---------------------------------------------------------------------------

describe("entity tracking", () => {
	it("adds entity to minimap", () => {
		initMinimap(smallConfig, makeTerrain(8));
		updateMinimapEntity({
			id: "bot1",
			x: 20,
			z: 30,
			type: "unit",
			faction: "player",
		});

		const stats = getMinimapStats();
		expect(stats.entityCount).toBe(1);
	});

	it("removes entity", () => {
		initMinimap(smallConfig, makeTerrain(8));
		updateMinimapEntity({
			id: "bot1",
			x: 20,
			z: 30,
			type: "unit",
			faction: "player",
		});
		removeMinimapEntity("bot1");

		expect(getMinimapStats().entityCount).toBe(0);
	});

	it("updates entity position", () => {
		initMinimap(smallConfig, makeTerrain(8));
		updateMinimapEntity({
			id: "bot1",
			x: 20,
			z: 30,
			type: "unit",
			faction: "player",
		});
		updateMinimapEntity({
			id: "bot1",
			x: 50,
			z: 60,
			type: "unit",
			faction: "player",
		});

		expect(getMinimapStats().entityCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Minimap generation
// ---------------------------------------------------------------------------

describe("generateMinimapData", () => {
	it("generates correct resolution grid", () => {
		initMinimap(smallConfig, makeTerrain(8));
		const data = generateMinimapData();
		expect(data).toHaveLength(8);
		expect(data[0]).toHaveLength(8);
	});

	it("fog cells render as fog type", () => {
		initMinimap(smallConfig, makeTerrain(8));
		const data = generateMinimapData();
		// All cells should be fog since nothing is revealed
		expect(data[0][0].type).toBe("fog");
	});

	it("revealed terrain renders as terrain", () => {
		initMinimap(smallConfig, makeTerrain(8));
		// Reveal cell (0,0): worldX=5, worldZ=5 in cell size 10
		revealFog(5, 5, 5);
		const data = generateMinimapData();
		expect(data[0][0].type).toBe("terrain");
	});

	it("water renders as water type", () => {
		const terrain = makeTerrainWithWater(8, [[2, 2]]);
		initMinimap(smallConfig, terrain);
		revealFog(25, 25, 15); // reveal area around cell (2,2)
		const data = generateMinimapData();
		expect(data[2][2].type).toBe("water");
	});

	it("player entity renders as player_unit", () => {
		initMinimap(smallConfig, makeTerrain(8));
		revealFog(15, 15, 10);
		updateMinimapEntity({
			id: "bot1",
			x: 15,
			z: 15,
			type: "unit",
			faction: "player",
		});
		const data = generateMinimapData();
		expect(data[1][1].type).toBe("player_unit");
	});

	it("entity in fog is hidden", () => {
		initMinimap(smallConfig, makeTerrain(8));
		updateMinimapEntity({
			id: "bot1",
			x: 15,
			z: 15,
			type: "unit",
			faction: "player",
		});
		const data = generateMinimapData();
		// Still fog because area not revealed
		expect(data[1][1].type).toBe("fog");
	});

	it("entities hidden when fog disabled show", () => {
		initMinimap({ ...smallConfig, showFog: false }, makeTerrain(8));
		updateMinimapEntity({
			id: "bot1",
			x: 15,
			z: 15,
			type: "unit",
			faction: "player",
		});
		const data = generateMinimapData();
		expect(data[1][1].type).toBe("player_unit");
	});

	it("enemy unit renders differently", () => {
		initMinimap({ ...smallConfig, showFog: false }, makeTerrain(8));
		updateMinimapEntity({
			id: "enemy1",
			x: 25,
			z: 25,
			type: "unit",
			faction: "enemy",
		});
		const data = generateMinimapData();
		expect(data[2][2].type).toBe("enemy_unit");
	});

	it("building renders as building type", () => {
		initMinimap({ ...smallConfig, showFog: false }, makeTerrain(8));
		updateMinimapEntity({
			id: "furnace1",
			x: 35,
			z: 35,
			type: "building",
			faction: "player",
		});
		const data = generateMinimapData();
		expect(data[3][3].type).toBe("building");
	});

	it("territory borders render", () => {
		initMinimap({ ...smallConfig, showFog: false }, makeTerrain(8));
		setTerritory(40, 40, 15, "player");

		const data = generateMinimapData();
		// Some cells should be territory_border
		let hasBorder = false;
		for (const row of data) {
			for (const pixel of row) {
				if (pixel.type === "territory_border") {
					hasBorder = true;
					break;
				}
			}
		}
		expect(hasBorder).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

describe("config", () => {
	it("setMinimapConfig updates display options", () => {
		initMinimap(smallConfig, makeTerrain(8));
		setMinimapConfig({ showFog: false });

		// With fog disabled, terrain should show
		const data = generateMinimapData();
		expect(data[0][0].type).not.toBe("fog");
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all minimap state", () => {
		initMinimap(smallConfig, makeTerrain(8));
		updateMinimapEntity({
			id: "bot1",
			x: 10,
			z: 10,
			type: "unit",
			faction: "player",
		});
		revealFog(40, 40, 20);

		resetMinimap();

		const stats = getMinimapStats();
		expect(stats.entityCount).toBe(0);
		expect(stats.resolution).toBe(128); // back to default
	});
});
