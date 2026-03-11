/**
 * Unit tests for PerceptionSystem — cone-of-sight vision checks for bot AI.
 *
 * Tests cover:
 * - initPerceptionObstacles: obstacle initialization from city buildings
 * - addPerceptionObstacle: dynamic obstacle addition
 * - getPerceptionObstacles: obstacle list retrieval
 * - canSee: two-entity visibility checks
 * - getVisibleEntities: multi-entity visibility scanning
 * - clearVisionCache / clearAllVisionCaches: cleanup
 * - getFOVForEntity (via canSee/getVisibleEntities): FOV varies by unit type
 * - getEntityDirection (via canSee/getVisibleEntities): direction from navigation
 * - Edge cases: missing positions, empty entity lists, self-visibility
 */

// ---------------------------------------------------------------------------
// Mock config — must appear before import
// ---------------------------------------------------------------------------

jest.mock("../../../config", () => ({
	config: {
		enemies: {
			perception: {
				defaultFOV: 120,
				scoutFOV: 180,
				heavyFOV: 90,
				defaultRange: 15,
				cameraRangeBonus: 10,
				memoryDuration: 30,
				threatThreshold: 0.5,
			},
		},
		weather: {
			states: {
				clear: { visibilityRange: 1.0, movementSpeedModifier: 1.0, damageModifier: 0.0, powerGenerationModifier: 1.0, lightningStrikeChance: 0.0 },
				overcast: { visibilityRange: 0.7, movementSpeedModifier: 1.0, damageModifier: 0.0, powerGenerationModifier: 0.8, lightningStrikeChance: 0.0 },
				storm: { visibilityRange: 0.4, movementSpeedModifier: 0.8, damageModifier: 0.0, powerGenerationModifier: 1.5, lightningStrikeChance: 0.05 },
				electromagnetic_surge: { visibilityRange: 0.3, movementSpeedModifier: 0.6, damageModifier: 0.0, powerGenerationModifier: 2.5, lightningStrikeChance: 0.15 },
				acid_rain: { visibilityRange: 0.5, movementSpeedModifier: 0.7, damageModifier: 2.0, powerGenerationModifier: 0.9, lightningStrikeChance: 0.02 },
			},
			transitionIntervalTicks: 600,
			transitionWeights: {
				clear: { clear: 40, overcast: 35, storm: 10, electromagnetic_surge: 5, acid_rain: 10 },
				overcast: { clear: 25, overcast: 30, storm: 25, electromagnetic_surge: 5, acid_rain: 15 },
				storm: { clear: 10, overcast: 20, storm: 30, electromagnetic_surge: 20, acid_rain: 20 },
				electromagnetic_surge: { clear: 15, overcast: 20, storm: 30, electromagnetic_surge: 20, acid_rain: 15 },
				acid_rain: { clear: 20, overcast: 25, storm: 20, electromagnetic_surge: 10, acid_rain: 25 },
			},
			stormIntensityDecayRate: 0.01,
			stormIntensityGrowthRate: 0.02,
			forecastAccuracyDecay: 0.15,
			acidRainDamagePerTick: 0.5,
			acidRainProtectionTypes: ["shelter", "acid_shield"],
		},
	},
}));

// ---------------------------------------------------------------------------
// Mock cityLayout — avoid generating the full procedural city
// ---------------------------------------------------------------------------

const mockGetCityBuildings = jest.fn().mockReturnValue([]);

jest.mock("../../ecs/cityLayout.ts", () => ({
	getCityBuildings: (...args: unknown[]) => mockGetCityBuildings(...args),
}));

// ---------------------------------------------------------------------------
// Mock yuka — avoid full Yuka dependency in unit tests
// ---------------------------------------------------------------------------

// We need a minimal mock of Yuka's GameEntity, Vision, and Vector3.
// This allows us to test our wrapper logic without Yuka's internals.

class MockVector3 {
	x: number;
	y: number;
	z: number;
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	set(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	}
	copy(v: MockVector3) {
		this.x = v.x;
		this.y = v.y;
		this.z = v.z;
		return this;
	}
	subVectors(a: MockVector3, b: MockVector3) {
		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;
		return this;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
	normalize() {
		const l = this.length();
		if (l > 0) {
			this.x /= l;
			this.y /= l;
			this.z /= l;
		}
		return this;
	}
	dot(v: MockVector3) {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	}
}

class MockQuaternion {
	x = 0;
	y = 0;
	z = 0;
	w = 1;
	lookAt(eye: MockVector3, target: MockVector3, _up: MockVector3) {
		// Store forward direction implicitly for Vision.visible() checks.
		// We store the normalized forward as quaternion xyzw (not a real quaternion).
		const dx = target.x - eye.x;
		const dy = target.y - eye.y;
		const dz = target.z - eye.z;
		const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
		if (len > 0) {
			this.x = dx / len;
			this.y = dy / len;
			this.z = dz / len;
		}
		return this;
	}
}

class MockGameEntity {
	position = new MockVector3();
	rotation = new MockQuaternion();
	boundingRadius = 0;
}

class MockVision {
	owner: MockGameEntity | null;
	fieldOfView = Math.PI * 2;
	range = 15;
	obstacles: MockGameEntity[] = [];

	constructor(owner: MockGameEntity) {
		this.owner = owner;
	}

	/**
	 * Simplified cone-of-sight check:
	 * 1. Distance check against range
	 * 2. Angle check against fieldOfView (half-angle)
	 * 3. No obstacle occlusion in the mock (simplifies testing)
	 */
	visible(point: MockVector3): boolean {
		if (!this.owner) return false;

		const dx = point.x - this.owner.position.x;
		const dy = point.y - this.owner.position.y;
		const dz = point.z - this.owner.position.z;
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

		// Range check
		if (dist > this.range) return false;
		if (dist < 0.001) return true; // same position

		// Angle check using forward direction stored in rotation
		const fx = this.owner.rotation.x;
		const fy = this.owner.rotation.y;
		const fz = this.owner.rotation.z;

		// Normalize direction to target
		const nx = dx / dist;
		const ny = dy / dist;
		const nz = dz / dist;

		// Dot product for angle
		const dot = fx * nx + fy * ny + fz * nz;
		const halfFOV = this.fieldOfView / 2;
		const cosHalfFOV = Math.cos(halfFOV);

		return dot >= cosHalfFOV;
	}
}

jest.mock("yuka", () => ({
	GameEntity: MockGameEntity,
	Vision: MockVision,
	Vector3: MockVector3,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
	initPerceptionObstacles,
	addPerceptionObstacle,
	getPerceptionObstacles,
	canSee,
	getVisibleEntities,
	clearVisionCache,
	clearAllVisionCaches,
	getVisibleEnemyPiles,
	computePileDetectionRange,
} from "../PerceptionSystem.ts";
import type { CubePile } from "../../systems/cubePileTracker.ts";

import type { Entity, Vec3 } from "../../ecs/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

/** Create a minimal entity suitable for perception tests. */
function makeEntity(overrides: Partial<Entity> & { id: string }): Entity {
	return {
		faction: "player",
		worldPosition: pos(0, 0, 0),
		...overrides,
	} as Entity;
}

function makeUnitEntity(
	id: string,
	position: Vec3,
	unitType: "maintenance_bot" | "utility_drone" | "fabrication_unit" = "maintenance_bot",
	opts: {
		hasCamera?: boolean;
		navigation?: Entity["navigation"];
	} = {},
): Entity {
	const components = [];
	if (opts.hasCamera) {
		components.push({ name: "camera", functional: true, material: "electronic" as const });
	}
	return makeEntity({
		id,
		worldPosition: position,
		unit: {
			type: unitType,
			displayName: id,
			speed: 2,
			selected: false,
			components,
		},
		navigation: opts.navigation,
	});
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	clearAllVisionCaches();
	mockGetCityBuildings.mockReturnValue([]);
	initPerceptionObstacles();
});

// ---------------------------------------------------------------------------
// initPerceptionObstacles
// ---------------------------------------------------------------------------

describe("initPerceptionObstacles", () => {
	it("clears previous obstacles and rebuilds from city buildings", () => {
		mockGetCityBuildings.mockReturnValue([
			{ x: 10, z: 20, halfW: 2, halfD: 3, height: 6, type: "conduit" as const },
		]);
		initPerceptionObstacles();

		const obstacles = getPerceptionObstacles();
		expect(obstacles.length).toBe(1);
	});

	it("creates obstacles centered at building position with correct bounding radius", () => {
		mockGetCityBuildings.mockReturnValue([
			{ x: 5, z: 15, halfW: 2, halfD: 4, height: 8, type: "node" as const },
		]);
		initPerceptionObstacles();

		const obstacles = getPerceptionObstacles();
		expect(obstacles[0].position.x).toBe(5);
		expect(obstacles[0].position.y).toBe(4); // height / 2
		expect(obstacles[0].position.z).toBe(15);
		expect(obstacles[0].boundingRadius).toBe(4); // max(halfW, halfD) = max(2, 4)
	});

	it("handles empty building list", () => {
		mockGetCityBuildings.mockReturnValue([]);
		initPerceptionObstacles();

		const obstacles = getPerceptionObstacles();
		expect(obstacles.length).toBe(0);
	});

	it("re-initializing clears old obstacles", () => {
		mockGetCityBuildings.mockReturnValue([
			{ x: 1, z: 1, halfW: 1, halfD: 1, height: 2, type: "tower" as const },
			{ x: 2, z: 2, halfW: 1, halfD: 1, height: 2, type: "tower" as const },
		]);
		initPerceptionObstacles();
		expect(getPerceptionObstacles().length).toBe(2);

		mockGetCityBuildings.mockReturnValue([
			{ x: 3, z: 3, halfW: 1, halfD: 1, height: 2, type: "ruin" as const },
		]);
		initPerceptionObstacles();
		expect(getPerceptionObstacles().length).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// addPerceptionObstacle
// ---------------------------------------------------------------------------

describe("addPerceptionObstacle", () => {
	it("adds a dynamic obstacle to the list", () => {
		const before = getPerceptionObstacles().length;
		addPerceptionObstacle(10, 20, 2, 3, 6);
		expect(getPerceptionObstacles().length).toBe(before + 1);
	});

	it("positions the obstacle correctly", () => {
		addPerceptionObstacle(10, 20, 2, 3, 8);

		const obstacles = getPerceptionObstacles();
		const last = obstacles[obstacles.length - 1];
		expect(last.position.x).toBe(10);
		expect(last.position.y).toBe(4); // height / 2
		expect(last.position.z).toBe(20);
	});

	it("sets bounding radius to max of halfW and halfD", () => {
		addPerceptionObstacle(0, 0, 5, 3, 4);

		const obstacles = getPerceptionObstacles();
		const last = obstacles[obstacles.length - 1];
		expect(last.boundingRadius).toBe(5);

		addPerceptionObstacle(0, 0, 2, 7, 4);
		const last2 = obstacles[obstacles.length - 1];
		expect(last2.boundingRadius).toBe(7);
	});
});

// ---------------------------------------------------------------------------
// canSee — basic visibility
// ---------------------------------------------------------------------------

describe("canSee — basic visibility", () => {
	it("returns true when target is within range and FOV", () => {
		// Observer at origin looking forward (+Z by default)
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		// Target directly ahead at reasonable distance
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("returns false when target is beyond range", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		// defaultRange = 15, target at 20
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 20) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(false);
	});

	it("returns false when observer entity not found", () => {
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 5) });

		const result = canSee("nonexistent", "target", [target]);
		expect(result).toBe(false);
	});

	it("returns false when target entity not found", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));

		const result = canSee("observer", "nonexistent", [observer]);
		expect(result).toBe(false);
	});

	it("returns false when observer has no worldPosition", () => {
		const observer = makeEntity({ id: "observer", worldPosition: undefined });
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 5) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(false);
	});

	it("returns false when target has no worldPosition", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		const target = makeEntity({ id: "target", worldPosition: undefined });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canSee — FOV by unit type
// ---------------------------------------------------------------------------

describe("canSee — FOV by unit type", () => {
	it("utility_drone (scout) has wide FOV and can see targets at wider angles", () => {
		// Scout FOV = 180 degrees -> half = 90 degrees
		// A target at 80 degrees off-axis should be visible
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "utility_drone");
		// Target at an angle: at (10, 0, 2) relative to observer facing +Z
		// angle = atan2(10, 2) ~= 78.7 degrees
		const target = makeEntity({ id: "target", worldPosition: pos(10, 0, 2) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("fabrication_unit (heavy) has narrow FOV and misses wide-angle targets", () => {
		// Heavy FOV = 90 degrees -> half = 45 degrees
		// A target at 50 degrees off-axis should NOT be visible
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "fabrication_unit");
		// Target at angle > 45 degrees: at (5, 0, 3) -> angle ~= 59 degrees
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 3) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(false);
	});

	it("maintenance_bot (default) uses default FOV", () => {
		// Default FOV = 120 degrees -> half = 60 degrees
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot");
		// Target at ~45 degrees: at (5, 0, 5) -> atan2(5,5) = 45 degrees < 60
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 5) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("entity without unit type defaults to default FOV", () => {
		const observer = makeEntity({
			id: "observer",
			worldPosition: pos(0, 0, 0),
		});
		// Target directly ahead — should be visible with default FOV
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// canSee — camera range bonus
// ---------------------------------------------------------------------------

describe("canSee — camera range bonus", () => {
	it("entity with functional camera has extended range", () => {
		// defaultRange = 15, cameraRangeBonus = 10, total = 25
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot", {
			hasCamera: true,
		});
		// Target at distance 20 — beyond default range but within camera range
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 20) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("entity without camera uses default range", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot", {
			hasCamera: false,
		});
		// Target at distance 20 — beyond default range of 15
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 20) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canSee — entity direction from navigation
// ---------------------------------------------------------------------------

describe("canSee — entity direction from navigation", () => {
	it("uses navigation path direction when entity is moving", () => {
		// Entity at origin, navigation path going +X (east)
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot", {
			navigation: {
				path: [{ x: 10, y: 0, z: 0 }],
				pathIndex: 0,
				moving: true,
			},
		});
		// Target directly east (in the direction of movement)
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 0) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("uses default +Z direction when entity is not moving", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot", {
			navigation: {
				path: [{ x: 10, y: 0, z: 0 }],
				pathIndex: 0,
				moving: false, // not moving — should use default +Z
			},
		});
		// Target directly north (+Z) — should be visible with default direction
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("uses default +Z direction when no navigation component", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot");
		// Target directly ahead in +Z
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getVisibleEntities
// ---------------------------------------------------------------------------

describe("getVisibleEntities", () => {
	it("returns IDs of all visible entities", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		const visible1 = makeEntity({ id: "v1", worldPosition: pos(0, 0, 5) });
		const visible2 = makeEntity({ id: "v2", worldPosition: pos(0, 0, 10) });

		const result = getVisibleEntities("observer", [observer, visible1, visible2]);
		expect(result).toContain("v1");
		expect(result).toContain("v2");
	});

	it("excludes the observer itself", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		const result = getVisibleEntities("observer", [observer, target]);
		expect(result).not.toContain("observer");
		expect(result).toContain("target");
	});

	it("excludes entities beyond range (distance pre-check)", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		// defaultRange = 15, target at distance 20
		const farTarget = makeEntity({ id: "far", worldPosition: pos(0, 0, 20) });

		const result = getVisibleEntities("observer", [observer, farTarget]);
		expect(result).not.toContain("far");
	});

	it("excludes entities without worldPosition", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		const noPos = makeEntity({ id: "nopos", worldPosition: undefined });

		const result = getVisibleEntities("observer", [observer, noPos]);
		expect(result).not.toContain("nopos");
	});

	it("returns empty array when observer not found", () => {
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 5) });

		const result = getVisibleEntities("nonexistent", [target]);
		expect(result).toEqual([]);
	});

	it("returns empty array when observer has no worldPosition", () => {
		const observer = makeEntity({ id: "observer", worldPosition: undefined });
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 5) });

		const result = getVisibleEntities("observer", [observer, target]);
		expect(result).toEqual([]);
	});

	it("returns empty array when entity list is empty", () => {
		const result = getVisibleEntities("observer", []);
		expect(result).toEqual([]);
	});

	it("handles large entity lists", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		const entities: Entity[] = [observer];

		// Create 100 entities in a line ahead
		for (let i = 0; i < 100; i++) {
			entities.push(makeEntity({ id: `e-${i}`, worldPosition: pos(0, 0, i * 0.1 + 0.1) }));
		}

		const result = getVisibleEntities("observer", entities);
		// All entities within range should be visible (those within 15 units)
		expect(result.length).toBeGreaterThan(0);
		expect(result.length).toBeLessThanOrEqual(100);
	});
});

// ---------------------------------------------------------------------------
// clearVisionCache
// ---------------------------------------------------------------------------

describe("clearVisionCache", () => {
	it("clears cached vision for a specific entity", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		// Trigger vision creation
		canSee("observer", "target", [observer, target]);

		// Clear should not throw
		clearVisionCache("observer");

		// Should still work after clearing (recreates vision)
		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("is a no-op for unknown entity", () => {
		clearVisionCache("nonexistent");
		// Should not throw
	});
});

// ---------------------------------------------------------------------------
// clearAllVisionCaches
// ---------------------------------------------------------------------------

describe("clearAllVisionCaches", () => {
	it("clears all cached visions", () => {
		const obs1 = makeUnitEntity("obs1", pos(0, 0, 0));
		const obs2 = makeUnitEntity("obs2", pos(10, 0, 0));
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		canSee("obs1", "target", [obs1, obs2, target]);
		canSee("obs2", "target", [obs1, obs2, target]);

		clearAllVisionCaches();

		// Should still work after clearing
		const result = canSee("obs1", "target", [obs1, obs2, target]);
		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("observer and target at same position", () => {
		const observer = makeUnitEntity("observer", pos(5, 0, 5));
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 5) });

		const result = canSee("observer", "target", [observer, target]);
		// Same position -> distance ~0 -> should be visible
		expect(result).toBe(true);
	});

	it("observer looking away from target with narrow FOV", () => {
		// Fabrication unit (heavy) with 90 degree FOV, facing +Z
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "fabrication_unit");
		// Target directly behind (-Z)
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, -5) });

		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(false);
	});

	it("target at exact range boundary", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		// Target at exactly 15 units (defaultRange)
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 15) });

		// At exact boundary — depends on > vs >= in distance check
		// The pre-check uses dx*dx + dz*dz > rangeSq, so exactly at boundary passes pre-check
		// Vision.visible() uses dist > this.range which excludes exact boundary
		// Either way this tests the boundary
		canSee("observer", "target", [observer, target]);
		// No assertion on result — just verify it doesn't crash at boundary
	});

	it("handles entities with mapFragment", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		(observer as Entity).mapFragment = { fragmentId: "frag-1" };
		const target = makeEntity({
			id: "target",
			worldPosition: pos(0, 0, 5),
			mapFragment: { fragmentId: "frag-2" },
		});

		// mapFragment should not affect vision
		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("getVisibleEntities uses XZ distance pre-check (Y is ignored)", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0));
		// Target at XZ distance within range but high Y
		const target = makeEntity({ id: "target", worldPosition: pos(0, 100, 5) });

		// XZ distance is 5 (within range), so it passes the pre-check
		// Vision.visible will do full 3D distance check
		const result = getVisibleEntities("observer", [observer, target]);
		// Should attempt visibility check (passes XZ pre-filter)
		// Whether it's actually visible depends on 3D distance in Vision.visible()
		// With our mock, distance = sqrt(0 + 10000 + 25) ~= 100, which is > 15
		expect(result).not.toContain("target");
	});

	it("navigation with pathIndex beyond path length is clamped", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot", {
			navigation: {
				path: [{ x: 0, y: 0, z: 10 }],
				pathIndex: 999, // beyond path length
				moving: true,
			},
		});
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		// Should not crash — pathIndex is clamped to path.length - 1
		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("navigation with empty path uses default direction", () => {
		const observer = makeUnitEntity("observer", pos(0, 0, 0), "maintenance_bot", {
			navigation: {
				path: [],
				pathIndex: 0,
				moving: true,
			},
		});
		const target = makeEntity({ id: "target", worldPosition: pos(0, 0, 5) });

		// Empty path -> default +Z direction -> target at +Z should be visible
		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});

	it("navigation target at same position as observer uses default direction", () => {
		const observer = makeUnitEntity("observer", pos(5, 0, 5), "maintenance_bot", {
			navigation: {
				path: [{ x: 5, y: 0, z: 5 }], // same as observer position
				pathIndex: 0,
				moving: true,
			},
		});
		// Target directly ahead in +Z from observer
		const target = makeEntity({ id: "target", worldPosition: pos(5, 0, 10) });

		// Direction to waypoint is zero-length -> falls back to default +Z
		const result = canSee("observer", "target", [observer, target]);
		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Pile perception (§6.4 — wealth attracts raids)
// ---------------------------------------------------------------------------

function makePile(
	pileId: string,
	ownerFaction: string,
	cubeCount: number,
	totalEconomicValue: number,
	cx: number,
	cz: number,
): CubePile {
	return {
		pileId,
		center: { x: cx, y: 0, z: cz },
		cubeCount,
		materialBreakdown: {},
		totalEconomicValue,
		ownerFaction,
		topY: 0,
	};
}

describe("computePileDetectionRange", () => {
	it("returns baseRange when cubeCount is 0", () => {
		expect(computePileDetectionRange(20, 0)).toBe(20);
	});

	it("scales with cubeCount using PILE_SIZE_SCALE = 0.05", () => {
		// effectiveRange = 20 * (1 + 10 * 0.05) = 20 * 1.5 = 30
		expect(computePileDetectionRange(20, 10)).toBeCloseTo(30);
	});

	it("doubling cubeCount doubles the additional range (linear scaling)", () => {
		const r10 = computePileDetectionRange(10, 10); // 10 * 1.5 = 15
		const r20 = computePileDetectionRange(10, 20); // 10 * 2.0 = 20
		expect(r20 - 10).toBeCloseTo(2 * (r10 - 10));
	});

	it("large piles have significantly extended detection range", () => {
		const small = computePileDetectionRange(20, 5);  // 20 * 1.25 = 25
		const large = computePileDetectionRange(20, 40); // 20 * 3.0 = 60
		expect(large).toBeGreaterThan(small * 2);
	});
});

describe("getVisibleEnemyPiles", () => {
	it("returns empty array when no enemy piles are provided", () => {
		const result = getVisibleEnemyPiles({ x: 0, z: 0 }, 20, []);
		expect(result).toEqual([]);
	});

	it("returns pile within effective detection range", () => {
		// baseRange=20, cubeCount=10 → effectiveRange = 20 * 1.5 = 30
		// pile at distance 25 → should be visible
		const piles = [makePile("p1", "enemy", 10, 100, 25, 0)];
		const result = getVisibleEnemyPiles({ x: 0, z: 0 }, 20, piles);

		expect(result.length).toBe(1);
		expect(result[0].pile.pileId).toBe("p1");
	});

	it("excludes pile beyond effective detection range", () => {
		// baseRange=20, cubeCount=1 → effectiveRange = 20 * 1.05 = 21
		// pile at distance 30 → beyond range
		const piles = [makePile("p1", "enemy", 1, 100, 30, 0)];
		const result = getVisibleEnemyPiles({ x: 0, z: 0 }, 20, piles);

		expect(result).toEqual([]);
	});

	it("larger pile can be detected from farther away (wealth makes you visible)", () => {
		const observer = { x: 0, z: 0 };
		const baseRange = 10;

		// Small pile at distance 12 — with 1 cube: range = 10 * 1.05 = 10.5 → NOT visible
		const smallPile = makePile("small", "enemy", 1, 50, 12, 0);
		// Large pile at distance 12 — with 20 cubes: range = 10 * 2.0 = 20 → visible
		const largePile = makePile("large", "enemy", 20, 500, 12, 0);

		const resultSmall = getVisibleEnemyPiles(observer, baseRange, [smallPile]);
		const resultLarge = getVisibleEnemyPiles(observer, baseRange, [largePile]);

		expect(resultSmall).toEqual([]);
		expect(resultLarge.length).toBe(1);
	});

	it("excludes piles with value below threshold (5)", () => {
		const piles = [makePile("p1", "enemy", 10, 4, 5, 0)]; // value=4 < threshold=5
		const result = getVisibleEnemyPiles({ x: 0, z: 0 }, 50, piles);
		expect(result).toEqual([]);
	});

	it("sorts visible piles by economic value descending", () => {
		const piles = [
			makePile("cheap", "enemy", 5, 20, 5, 0),
			makePile("expensive", "enemy", 5, 200, 5, 0),
			makePile("medium", "enemy", 5, 100, 5, 0),
		];

		const result = getVisibleEnemyPiles({ x: 0, z: 0 }, 50, piles);

		expect(result.length).toBe(3);
		expect(result[0].pile.totalEconomicValue).toBe(200);
		expect(result[1].pile.totalEconomicValue).toBe(100);
		expect(result[2].pile.totalEconomicValue).toBe(20);
	});

	it("includes effectiveRange and distance in each result", () => {
		const piles = [makePile("p1", "enemy", 10, 100, 15, 0)];
		const result = getVisibleEnemyPiles({ x: 0, z: 0 }, 20, piles);

		expect(result.length).toBe(1);
		expect(result[0].effectiveRange).toBeCloseTo(30); // 20 * 1.5
		expect(result[0].distance).toBeCloseTo(15);
	});

	it("handles multiple visible piles from non-origin observer", () => {
		const observer = { x: 100, z: 100 };
		const piles = [
			makePile("near", "enemy", 10, 50, 115, 100), // distance = 15
			makePile("far", "enemy", 10, 50, 150, 100),  // distance = 50
		];
		// baseRange=20, cubeCount=10 → effectiveRange = 30
		// near (dist=15): visible; far (dist=50): NOT visible
		const result = getVisibleEnemyPiles(observer, 20, piles);

		expect(result.length).toBe(1);
		expect(result[0].pile.pileId).toBe("near");
	});

	it("exact boundary pile at effectiveRange is included", () => {
		// effectiveRange = 10 * (1 + 10 * 0.05) = 15, pile at exactly dist=15
		const piles = [makePile("p1", "enemy", 10, 100, 15, 0)];
		const result = getVisibleEnemyPiles({ x: 0, z: 0 }, 10, piles);
		expect(result.length).toBe(1);
	});
});
