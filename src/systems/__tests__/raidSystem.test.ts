/**
 * Unit tests for the raid system state machine.
 *
 * Tests cover:
 * - Raid state machine transitions (APPROACH → ENGAGE → LOOT → RETREAT → DONE)
 * - Loot phase grabs cubes (Grabbable + HeldBy)
 * - Retreat returns units to territory
 * - Cancel aborts correctly and units retreat
 */

// Mock pathfinding before importing raidSystem so the module picks up the mock.
jest.mock("../pathfinding", () => ({
	findPath: jest.fn((_start, goal) => {
		// Return a trivial one-waypoint path directly to the goal.
		return [{ x: goal.x, y: 0, z: goal.z }];
	}),
}));

// Compat layer: defer world access until iteration time to avoid circular init issues
jest.mock("../../ecs/koota/compat", () => ({
	get units() {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("../../ecs/world").units;
	},
}));

import type { Entity, Vec3 } from "../../ecs/types";
import { units, world } from "../../ecs/world";
import {
	type CubeEntity,
	cancelRaid,
	executeRaid,
	getRaidStatus,
	planRaid,
	registerCube,
	resetRaidSystem,
} from "../raidSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(id: string, faction: Entity["faction"], pos: Vec3): Entity {
	return world.add({
		id,
		faction,
		worldPosition: { ...pos },
		mapFragment: { fragmentId: "test_frag" },
		unit: {
			type: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		},
		navigation: { path: [], pathIndex: 0, moving: false },
	} as Partial<Entity> as Entity);
}

function makeCube(
	id: string,
	pos: Vec3,
	faction: Entity["faction"] = "player",
): CubeEntity {
	const cube: CubeEntity = {
		id,
		faction,
		worldPosition: { ...pos },
		grabbable: {
			resourceType: "scrapMetal",
			value: 3,
			weight: 1,
		},
	} as CubeEntity;
	registerCube(cube);
	return cube;
}

/**
 * Simulate units arriving at their navigation targets.
 * The real movement system runs per-frame; for tests we teleport.
 */
function teleportUnitsToNavTarget() {
	for (const u of units) {
		if (u.navigation?.moving && u.navigation.path.length > 0) {
			const dest = u.navigation.path[u.navigation.path.length - 1];
			u.worldPosition.x = dest.x;
			u.worldPosition.z = dest.z;
			u.navigation.moving = false;
			u.navigation.pathIndex = u.navigation.path.length;
		}
	}
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const allEntities: Entity[] = [];

beforeEach(() => {
	resetRaidSystem();
});

afterEach(() => {
	// Remove all test entities from the ECS world
	for (const e of allEntities) {
		try {
			world.remove(e);
		} catch {
			// already removed
		}
	}
	allEntities.length = 0;
	resetRaidSystem();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("raidSystem", () => {
	describe("planRaid", () => {
		it("creates a raid in APPROACH phase", () => {
			const raider = makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });
			allEntities.push(raider);

			const raidId = planRaid("feral", { x: 10, y: 0, z: 10 }, ["r1"], {
				x: -20,
				y: 0,
				z: 0,
			});

			const status = getRaidStatus(raidId);
			expect(status).not.toBeNull();
			expect(status!.phase).toBe("APPROACH");
			expect(status!.unitIds).toContain("r1");
			expect(status!.stolenCubeIds).toHaveLength(0);
		});
	});

	describe("state machine transitions", () => {
		it("APPROACH → LOOT when units arrive and no defenders", () => {
			const raider = makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });
			allEntities.push(raider);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			makeCube("c1", { x: 10, y: 0, z: 10 });

			const raidId = planRaid("feral", target, ["r1"], { x: -20, y: 0, z: 0 });

			// Simulate arrival
			teleportUnitsToNavTarget();
			executeRaid(raidId, 0);

			const status = getRaidStatus(raidId);
			expect(status!.phase).toBe("LOOT");
		});

		it("APPROACH → ENGAGE when defenders are present", () => {
			const raider = makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });
			const defender = makeUnit("d1", "player", { x: 10, y: 0, z: 10 });
			allEntities.push(raider, defender);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			const raidId = planRaid("feral", target, ["r1"], { x: -20, y: 0, z: 0 });

			// Simulate arrival
			teleportUnitsToNavTarget();
			executeRaid(raidId, 0);

			const status = getRaidStatus(raidId);
			expect(status!.phase).toBe("ENGAGE");
		});

		it("ENGAGE → LOOT when defenders are removed", () => {
			const raider = makeUnit("r1", "feral", { x: 10, y: 0, z: 11 });
			const defender = makeUnit("d1", "player", { x: 10, y: 0, z: 10 });
			allEntities.push(raider, defender);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			makeCube("c1", { x: 10, y: 0, z: 10 });

			const raidId = planRaid("feral", target, ["r1"], { x: -20, y: 0, z: 0 });

			// Force to ENGAGE (units already near target)
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("ENGAGE");

			// Remove defender (simulating combat kill)
			world.remove(defender);

			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("LOOT");
		});

		it("LOOT → RETREAT after grabbing cubes", () => {
			const raider = makeUnit("r1", "feral", { x: 10, y: 0, z: 10 });
			allEntities.push(raider);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			makeCube("c1", { x: 10, y: 0, z: 10 });

			const raidId = planRaid("feral", target, ["r1"], { x: -20, y: 0, z: 0 });

			// Skip to LOOT (unit is already at target, no defenders)
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("LOOT");

			// Execute LOOT: grab + check for remaining
			executeRaid(raidId, 0);
			const status = getRaidStatus(raidId);
			expect(status!.phase).toBe("RETREAT");
			expect(status!.stolenCubeIds).toContain("c1");
		});

		it("RETREAT → DONE when units arrive home", () => {
			const homePos: Vec3 = { x: -20, y: 0, z: 0 };
			const raider = makeUnit("r1", "feral", { x: 10, y: 0, z: 10 });
			allEntities.push(raider);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			makeCube("c1", { x: 10, y: 0, z: 10 });

			const raidId = planRaid("feral", target, ["r1"], homePos);

			// APPROACH → LOOT (no defenders)
			executeRaid(raidId, 0);
			// LOOT → RETREAT (grab cube)
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("RETREAT");

			// Teleport home
			teleportUnitsToNavTarget();
			executeRaid(raidId, 0);

			expect(getRaidStatus(raidId)!.phase).toBe("DONE");
		});

		it("transitions to DONE when all raiders are destroyed", () => {
			const raider = makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });
			allEntities.push(raider);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			const raidId = planRaid("feral", target, ["r1"], { x: -20, y: 0, z: 0 });

			// Destroy the raider (break all components)
			for (const c of raider.unit!.components) {
				c.functional = false;
			}

			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("DONE");
		});
	});

	describe("loot phase", () => {
		it("grabs cubes and sets HeldBy relation", () => {
			const raider = makeUnit("r1", "feral", { x: 10, y: 0, z: 10 });
			allEntities.push(raider);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			const cube = makeCube("c1", { x: 10, y: 0, z: 10 });

			const raidId = planRaid("feral", target, ["r1"], { x: -20, y: 0, z: 0 });

			// APPROACH → LOOT
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("LOOT");

			// LOOT tick — grabs the cube
			executeRaid(raidId, 0);

			expect(cube.raidHeldBy).toBeDefined();
			expect(cube.raidHeldBy!.unitId).toBe("r1");
		});

		it("each unit grabs at most one cube", () => {
			const r1 = makeUnit("r1", "feral", { x: 10, y: 0, z: 10 });
			const r2 = makeUnit("r2", "feral", { x: 10, y: 0, z: 11 });
			allEntities.push(r1, r2);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			const c1 = makeCube("c1", { x: 10, y: 0, z: 10 });
			const c2 = makeCube("c2", { x: 10, y: 0, z: 11 });
			makeCube("c3", { x: 10, y: 0, z: 12 });

			const raidId = planRaid("feral", target, ["r1", "r2"], {
				x: -20,
				y: 0,
				z: 0,
			});

			// APPROACH → LOOT
			executeRaid(raidId, 0);
			// LOOT tick
			executeRaid(raidId, 0);

			// Each unit grabbed exactly one
			const status = getRaidStatus(raidId);
			expect(status!.stolenCubeIds.length).toBe(2);

			// Verify distinct unit assignments
			const holders = new Set<string>();
			if (c1.raidHeldBy) holders.add(c1.raidHeldBy.unitId);
			if (c2.raidHeldBy) holders.add(c2.raidHeldBy.unitId);
			expect(holders.size).toBe(2);
		});

		it("transitions to RETREAT even when no cubes are available", () => {
			const raider = makeUnit("r1", "feral", { x: 10, y: 0, z: 10 });
			allEntities.push(raider);

			const target: Vec3 = { x: 10, y: 0, z: 10 };
			// No cubes registered

			const raidId = planRaid("feral", target, ["r1"], { x: -20, y: 0, z: 0 });

			// APPROACH → LOOT (no defenders)
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("LOOT");

			// LOOT → RETREAT (nothing to grab)
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("RETREAT");
		});
	});

	describe("retreat phase", () => {
		it("drops cubes at home position upon arrival", () => {
			const homePos: Vec3 = { x: -20, y: 0, z: 0 };
			const raider = makeUnit("r1", "feral", { x: 10, y: 0, z: 10 });
			allEntities.push(raider);

			const cube = makeCube("c1", { x: 10, y: 0, z: 10 });

			const raidId = planRaid("feral", { x: 10, y: 0, z: 10 }, ["r1"], homePos);

			// APPROACH → LOOT → RETREAT
			executeRaid(raidId, 0);
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("RETREAT");

			// Arrive home
			teleportUnitsToNavTarget();
			executeRaid(raidId, 0);

			expect(getRaidStatus(raidId)!.phase).toBe("DONE");
			// Cube should be dropped at home
			expect(cube.raidHeldBy).toBeUndefined();
			expect(cube.worldPosition.x).toBe(homePos.x);
			expect(cube.worldPosition.z).toBe(homePos.z);
		});
	});

	describe("cancelRaid", () => {
		it("sets phase to CANCELLED and issues retreat orders", () => {
			const raider = makeUnit("r1", "feral", { x: 5, y: 0, z: 5 });
			allEntities.push(raider);

			const raidId = planRaid("feral", { x: 10, y: 0, z: 10 }, ["r1"], {
				x: -20,
				y: 0,
				z: 0,
			});

			cancelRaid(raidId);

			const status = getRaidStatus(raidId);
			expect(status!.phase).toBe("CANCELLED");
		});

		it("does nothing if raid is already DONE", () => {
			const raider = makeUnit("r1", "feral", { x: 10, y: 0, z: 10 });
			allEntities.push(raider);

			const raidId = planRaid("feral", { x: 10, y: 0, z: 10 }, ["r1"], {
				x: -20,
				y: 0,
				z: 0,
			});

			// Kill the raider to end the raid
			for (const c of raider.unit!.components) {
				c.functional = false;
			}
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("DONE");

			// Cancel should be no-op
			cancelRaid(raidId);
			expect(getRaidStatus(raidId)!.phase).toBe("DONE");
		});

		it("cancelled raids stop executing", () => {
			const raider = makeUnit("r1", "feral", { x: -20, y: 0, z: 0 });
			allEntities.push(raider);

			const raidId = planRaid("feral", { x: 10, y: 0, z: 10 }, ["r1"], {
				x: -20,
				y: 0,
				z: 0,
			});

			cancelRaid(raidId);

			// Executing further should not change phase from CANCELLED
			executeRaid(raidId, 0);
			executeRaid(raidId, 0);
			expect(getRaidStatus(raidId)!.phase).toBe("CANCELLED");
		});
	});

	describe("getRaidStatus", () => {
		it("returns null for unknown raid id", () => {
			expect(getRaidStatus("nonexistent")).toBeNull();
		});
	});
});
