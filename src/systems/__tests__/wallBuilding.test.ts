/**
 * Unit tests for wall building mechanics.
 *
 * Tests cover:
 * - Wall segment detection from stacked cubes
 * - Material-based wall HP calculation
 * - Wall damage and breach detection
 * - Cover bonus for units behind walls
 * - Edge cases (no cubes, single cube, short lines)
 */

import {
	_resetStackRegistry,
	registerStackedCube,
} from "../cubeStacking";
import {
	MATERIAL_WALL_HP,
	WALL_DEFENSE_BONUS,
	_resetWallBuilding,
	damageWall,
	detectWallSegments,
	getCoverBonus,
	getSegmentAtPosition,
	getWallHpPercent,
	getWallSegment,
	getWallSegments,
	isWallBreach,
} from "../wallBuilding";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetStackRegistry();
	_resetWallBuilding();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register a horizontal line of cubes along X at y=0, z=0. */
function registerXLine(
	startX: number,
	endX: number,
	material = "iron",
	y = 0,
	z = 0,
): void {
	for (let x = startX; x <= endX; x++) {
		registerStackedCube(`cube-${x}-${y}-${z}`, { x, y, z }, material);
	}
}

/** Register a horizontal line of cubes along Z at y=0, x=0. */
function registerZLine(
	startZ: number,
	endZ: number,
	material = "iron",
	y = 0,
	x = 0,
): void {
	for (let z = startZ; z <= endZ; z++) {
		registerStackedCube(`cube-${x}-${y}-${z}`, { x, y, z }, material);
	}
}

// ---------------------------------------------------------------------------
// detectWallSegments — basic detection
// ---------------------------------------------------------------------------

describe("detectWallSegments — basic detection", () => {
	it("detects a horizontal X-axis wall segment of 3 cubes", () => {
		registerXLine(0, 2);
		const segments = detectWallSegments();
		expect(segments).toHaveLength(1);
		expect(segments[0].cubes).toHaveLength(3);
		expect(segments[0].axis).toBe("x");
	});

	it("detects a Z-axis wall segment of 3 cubes", () => {
		registerZLine(0, 2);
		const segments = detectWallSegments();
		expect(segments).toHaveLength(1);
		expect(segments[0].cubes).toHaveLength(3);
		expect(segments[0].axis).toBe("z");
	});

	it("detects a longer wall (5 cubes)", () => {
		registerXLine(0, 4);
		const segments = detectWallSegments();
		expect(segments).toHaveLength(1);
		expect(segments[0].cubes).toHaveLength(5);
	});

	it("does not form a wall segment for 2 cubes (below minimum)", () => {
		registerXLine(0, 1);
		const segments = detectWallSegments();
		expect(segments).toHaveLength(0);
	});

	it("does not form a wall segment for a single cube", () => {
		registerStackedCube("cube-1", { x: 0, y: 0, z: 0 }, "iron");
		const segments = detectWallSegments();
		expect(segments).toHaveLength(0);
	});

	it("returns empty array for empty registry", () => {
		const segments = detectWallSegments();
		expect(segments).toHaveLength(0);
	});

	it("detects multiple separate wall segments", () => {
		// Two separate walls with a gap
		registerXLine(0, 2);
		registerXLine(5, 7);
		const segments = detectWallSegments();
		expect(segments).toHaveLength(2);
	});

	it("detects walls at different Y levels", () => {
		registerXLine(0, 2, "iron", 0);
		registerXLine(0, 2, "iron", 1);
		const segments = detectWallSegments();
		expect(segments).toHaveLength(2);
		const yLevels = segments.map((s) => s.yLevel).sort();
		expect(yLevels).toEqual([0, 1]);
	});
});

// ---------------------------------------------------------------------------
// detectWallSegments — gap handling
// ---------------------------------------------------------------------------

describe("detectWallSegments — gap handling", () => {
	it("splits into two segments when there is a gap", () => {
		// Cubes at x=0,1,2 and x=4,5,6 with gap at x=3
		registerXLine(0, 2);
		registerXLine(4, 6);
		const segments = detectWallSegments();
		expect(segments).toHaveLength(2);
	});

	it("does not form segment if gap makes runs shorter than 3", () => {
		// x=0,1 then gap then x=3,4 — both runs are only 2 long
		registerStackedCube("a", { x: 0, y: 0, z: 0 }, "iron");
		registerStackedCube("b", { x: 1, y: 0, z: 0 }, "iron");
		registerStackedCube("c", { x: 3, y: 0, z: 0 }, "iron");
		registerStackedCube("d", { x: 4, y: 0, z: 0 }, "iron");
		const segments = detectWallSegments();
		expect(segments).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Material HP calculation
// ---------------------------------------------------------------------------

describe("wall segment HP", () => {
	it("calculates HP based on material type", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		expect(segments).toHaveLength(1);
		const expectedHp = (MATERIAL_WALL_HP.iron ?? 100) * 3;
		expect(segments[0].hp).toBe(expectedHp);
		expect(segments[0].maxHp).toBe(expectedHp);
	});

	it("scrap_iron has lower HP than iron", () => {
		registerXLine(0, 2, "scrap_iron");
		const scrapSegments = detectWallSegments();
		_resetStackRegistry();
		_resetWallBuilding();
		registerXLine(0, 2, "iron");
		const ironSegments = detectWallSegments();

		expect(scrapSegments[0].maxHp).toBeLessThan(ironSegments[0].maxHp);
	});

	it("steel has higher HP than iron", () => {
		registerXLine(0, 2, "steel");
		const steelSegments = detectWallSegments();
		_resetStackRegistry();
		_resetWallBuilding();
		registerXLine(0, 2, "iron");
		const ironSegments = detectWallSegments();

		expect(steelSegments[0].maxHp).toBeGreaterThan(ironSegments[0].maxHp);
	});

	it("titanium has highest HP", () => {
		registerXLine(0, 2, "titanium");
		const segments = detectWallSegments();
		const expectedHp = (MATERIAL_WALL_HP.titanium ?? 350) * 3;
		expect(segments[0].maxHp).toBe(expectedHp);
	});

	it("identifies dominant material for mixed-material wall", () => {
		registerStackedCube("c0", { x: 0, y: 0, z: 0 }, "iron");
		registerStackedCube("c1", { x: 1, y: 0, z: 0 }, "iron");
		registerStackedCube("c2", { x: 2, y: 0, z: 0 }, "steel");
		const segments = detectWallSegments();
		expect(segments).toHaveLength(1);
		expect(segments[0].material).toBe("iron"); // 2 iron > 1 steel
	});
});

// ---------------------------------------------------------------------------
// Wall damage
// ---------------------------------------------------------------------------

describe("damageWall", () => {
	it("reduces wall HP", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		const segId = segments[0].id;
		const initialHp = segments[0].hp;

		const result = damageWall(segId, 50);
		expect(result).not.toBeNull();
		expect(result!.remainingHp).toBe(initialHp - 50);
		expect(result!.destroyed).toBe(false);
	});

	it("breaches wall when HP drops below 30%", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		const segId = segments[0].id;
		const damageAmount = segments[0].maxHp * 0.8; // drop to 20%

		const result = damageWall(segId, damageAmount);
		expect(result!.breached).toBe(true);
	});

	it("destroys wall when HP reaches 0", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		const segId = segments[0].id;

		const result = damageWall(segId, segments[0].maxHp);
		expect(result!.destroyed).toBe(true);
		expect(result!.remainingHp).toBe(0);
	});

	it("removes segment from registry on destruction", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		const segId = segments[0].id;

		damageWall(segId, segments[0].maxHp);
		expect(getWallSegment(segId)).toBeUndefined();
		expect(getWallSegments()).toHaveLength(0);
	});

	it("returns null for non-existent segment", () => {
		const result = damageWall("nonexistent_123", 100);
		expect(result).toBeNull();
	});

	it("HP does not go below 0", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		const segId = segments[0].id;

		const result = damageWall(segId, 999999);
		expect(result!.remainingHp).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// isWallBreach
// ---------------------------------------------------------------------------

describe("isWallBreach", () => {
	it("returns false for healthy wall", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		expect(isWallBreach(segments[0].id)).toBe(false);
	});

	it("returns true after heavy damage", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		damageWall(segments[0].id, segments[0].maxHp * 0.8);
		expect(isWallBreach(segments[0].id)).toBe(true);
	});

	it("returns true for non-existent segment", () => {
		expect(isWallBreach("nonexistent")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getWallHpPercent
// ---------------------------------------------------------------------------

describe("getWallHpPercent", () => {
	it("returns 1.0 for undamaged wall", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		expect(getWallHpPercent(segments[0].id)).toBeCloseTo(1.0);
	});

	it("returns correct percentage after damage", () => {
		registerXLine(0, 2, "iron");
		const segments = detectWallSegments();
		damageWall(segments[0].id, segments[0].maxHp / 2);
		expect(getWallHpPercent(segments[0].id)).toBeCloseTo(0.5);
	});

	it("returns 0 for non-existent segment", () => {
		expect(getWallHpPercent("nonexistent")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getSegmentAtPosition
// ---------------------------------------------------------------------------

describe("getSegmentAtPosition", () => {
	it("finds the segment containing a cube at a position", () => {
		registerXLine(0, 2, "iron");
		detectWallSegments();
		const segment = getSegmentAtPosition({ x: 1, y: 0, z: 0 });
		expect(segment).toBeDefined();
		expect(segment!.cubes).toHaveLength(3);
	});

	it("returns undefined for position not in any wall", () => {
		registerXLine(0, 2, "iron");
		detectWallSegments();
		const segment = getSegmentAtPosition({ x: 10, y: 0, z: 10 });
		expect(segment).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getCoverBonus
// ---------------------------------------------------------------------------

describe("getCoverBonus", () => {
	it("returns defense bonus when wall is between position and threat", () => {
		// Wall at x=2,3,4 z=0
		registerXLine(2, 4, "iron", 0, 0);
		detectWallSegments();

		// Position at x=0 z=0, threat coming from +X direction
		const bonus = getCoverBonus(
			{ x: 0, y: 0, z: 0 },
			{ x: 1, z: 0 },
		);
		expect(bonus).toBe(WALL_DEFENSE_BONUS);
	});

	it("returns 0 when no wall is between position and threat", () => {
		registerXLine(10, 12, "iron", 0, 0);
		detectWallSegments();

		const bonus = getCoverBonus(
			{ x: 0, y: 0, z: 0 },
			{ x: -1, z: 0 }, // threat from opposite direction
		);
		expect(bonus).toBe(0);
	});

	it("returns 0 when no walls exist", () => {
		detectWallSegments();
		const bonus = getCoverBonus(
			{ x: 0, y: 0, z: 0 },
			{ x: 1, z: 0 },
		);
		expect(bonus).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Material HP ordering
// ---------------------------------------------------------------------------

describe("MATERIAL_WALL_HP ordering", () => {
	it("scrap_iron < iron < steel < advanced_alloy", () => {
		const scrap = MATERIAL_WALL_HP.scrap_iron ?? 0;
		const iron = MATERIAL_WALL_HP.iron ?? 0;
		const steel = MATERIAL_WALL_HP.steel ?? 0;
		const advanced = MATERIAL_WALL_HP.advanced_alloy ?? 0;
		const titanium = MATERIAL_WALL_HP.titanium ?? 0;

		expect(scrap).toBeLessThan(iron);
		expect(iron).toBeLessThan(titanium);
		expect(titanium).toBeLessThan(steel);
		expect(steel).toBeLessThan(advanced);
	});
});
