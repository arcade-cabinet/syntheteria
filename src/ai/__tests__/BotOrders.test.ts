/**
 * Unit tests for BotOrders — order types and BotContext utility functions.
 *
 * BotOrders.ts defines the discriminated union of order types issued by
 * CivilizationGovernor to individual bots. Since it's primarily type
 * definitions, these tests verify:
 * - All BotOrderType constants have correct string values
 * - Order objects conform to their expected shapes
 * - Discriminated union works correctly for type narrowing
 *
 * Also tests BotContext utility functions:
 * - distanceSqXZ: squared XZ distance between Vec3 positions
 * - summarizeComponents: aggregate component health from part list
 */

import {
	BotOrderType,
	type BotOrder,
	type PatrolAreaOrder,
	type AttackTargetOrder,
	type GuardPositionOrder,
	type GatherResourcesOrder,
	type ReturnToBaseOrder,
	type FollowOrder,
} from "../BotOrders.ts";
import {
	distanceSqXZ,
	summarizeComponents,
	type BotContext,
	type NearbyEntity,
	type ComponentStatus,
} from "../BotContext.ts";
import type { Vec3 } from "../../ecs/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pos(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

// ===========================================================================
// BotOrderType constants
// ===========================================================================

describe("BotOrderType constants", () => {
	it("PATROL_AREA has correct value", () => {
		expect(BotOrderType.PATROL_AREA).toBe("patrol_area");
	});

	it("ATTACK_TARGET has correct value", () => {
		expect(BotOrderType.ATTACK_TARGET).toBe("attack_target");
	});

	it("GUARD_POSITION has correct value", () => {
		expect(BotOrderType.GUARD_POSITION).toBe("guard_position");
	});

	it("GATHER_RESOURCES has correct value", () => {
		expect(BotOrderType.GATHER_RESOURCES).toBe("gather_resources");
	});

	it("RETURN_TO_BASE has correct value", () => {
		expect(BotOrderType.RETURN_TO_BASE).toBe("return_to_base");
	});

	it("FOLLOW has correct value", () => {
		expect(BotOrderType.FOLLOW).toBe("follow");
	});

	it("has exactly 6 order types", () => {
		const keys = Object.keys(BotOrderType);
		expect(keys).toHaveLength(6);
	});

	it("all values are unique strings", () => {
		const values = Object.values(BotOrderType);
		const unique = new Set(values);
		expect(unique.size).toBe(values.length);
	});
});

// ===========================================================================
// Order object construction
// ===========================================================================

describe("PatrolAreaOrder", () => {
	it("can be constructed with required fields", () => {
		const order: PatrolAreaOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(10, 0, 20),
			radius: 15,
		};

		expect(order.type).toBe("patrol_area");
		expect(order.center).toEqual({ x: 10, y: 0, z: 20 });
		expect(order.radius).toBe(15);
	});

	it("accepts any positive radius", () => {
		const order: PatrolAreaOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(0, 0, 0),
			radius: 0.001,
		};
		expect(order.radius).toBeCloseTo(0.001);
	});

	it("preserves 3D center position including Y", () => {
		const order: PatrolAreaOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(10, 5, 20),
			radius: 15,
		};
		expect(order.center.y).toBe(5);
	});
});

describe("AttackTargetOrder", () => {
	it("can be constructed with required fields", () => {
		const order: AttackTargetOrder = {
			type: BotOrderType.ATTACK_TARGET,
			targetId: "enemy-42",
		};

		expect(order.type).toBe("attack_target");
		expect(order.targetId).toBe("enemy-42");
	});

	it("accepts any string as targetId", () => {
		const order: AttackTargetOrder = {
			type: BotOrderType.ATTACK_TARGET,
			targetId: "",
		};
		expect(order.targetId).toBe("");
	});
});

describe("GuardPositionOrder", () => {
	it("can be constructed with required fields", () => {
		const order: GuardPositionOrder = {
			type: BotOrderType.GUARD_POSITION,
			position: pos(5, 0, 5),
			radius: 10,
		};

		expect(order.type).toBe("guard_position");
		expect(order.position).toEqual({ x: 5, y: 0, z: 5 });
		expect(order.radius).toBe(10);
	});

	it("accepts zero radius", () => {
		const order: GuardPositionOrder = {
			type: BotOrderType.GUARD_POSITION,
			position: pos(0, 0, 0),
			radius: 0,
		};
		expect(order.radius).toBe(0);
	});
});

describe("GatherResourcesOrder", () => {
	it("can be constructed with required fields", () => {
		const order: GatherResourcesOrder = {
			type: BotOrderType.GATHER_RESOURCES,
			depositId: "ore-vein-99",
		};

		expect(order.type).toBe("gather_resources");
		expect(order.depositId).toBe("ore-vein-99");
	});
});

describe("ReturnToBaseOrder", () => {
	it("can be constructed with only type field", () => {
		const order: ReturnToBaseOrder = {
			type: BotOrderType.RETURN_TO_BASE,
		};

		expect(order.type).toBe("return_to_base");
	});

	it("is the simplest order type (no additional data)", () => {
		const order: ReturnToBaseOrder = {
			type: BotOrderType.RETURN_TO_BASE,
		};
		const keys = Object.keys(order);
		expect(keys).toEqual(["type"]);
	});
});

describe("FollowOrder", () => {
	it("can be constructed with required fields", () => {
		const order: FollowOrder = {
			type: BotOrderType.FOLLOW,
			targetId: "leader-bot-1",
		};

		expect(order.type).toBe("follow");
		expect(order.targetId).toBe("leader-bot-1");
	});
});

// ===========================================================================
// Discriminated union (BotOrder)
// ===========================================================================

describe("BotOrder discriminated union", () => {
	it("can narrow PatrolAreaOrder by type", () => {
		const order: BotOrder = {
			type: BotOrderType.PATROL_AREA,
			center: pos(10, 0, 10),
			radius: 15,
		};

		if (order.type === BotOrderType.PATROL_AREA) {
			// TypeScript narrows to PatrolAreaOrder
			expect(order.center).toBeDefined();
			expect(order.radius).toBeDefined();
		} else {
			fail("Should have matched PATROL_AREA");
		}
	});

	it("can narrow AttackTargetOrder by type", () => {
		const order: BotOrder = {
			type: BotOrderType.ATTACK_TARGET,
			targetId: "target",
		};

		if (order.type === BotOrderType.ATTACK_TARGET) {
			expect(order.targetId).toBe("target");
		} else {
			fail("Should have matched ATTACK_TARGET");
		}
	});

	it("can narrow GuardPositionOrder by type", () => {
		const order: BotOrder = {
			type: BotOrderType.GUARD_POSITION,
			position: pos(0, 0, 0),
			radius: 5,
		};

		if (order.type === BotOrderType.GUARD_POSITION) {
			expect(order.position).toBeDefined();
			expect(order.radius).toBeDefined();
		} else {
			fail("Should have matched GUARD_POSITION");
		}
	});

	it("can narrow GatherResourcesOrder by type", () => {
		const order: BotOrder = {
			type: BotOrderType.GATHER_RESOURCES,
			depositId: "deposit",
		};

		if (order.type === BotOrderType.GATHER_RESOURCES) {
			expect(order.depositId).toBe("deposit");
		} else {
			fail("Should have matched GATHER_RESOURCES");
		}
	});

	it("can narrow ReturnToBaseOrder by type", () => {
		const order: BotOrder = {
			type: BotOrderType.RETURN_TO_BASE,
		};

		if (order.type === BotOrderType.RETURN_TO_BASE) {
			// ReturnToBaseOrder has no extra fields
			expect(order.type).toBe("return_to_base");
		} else {
			fail("Should have matched RETURN_TO_BASE");
		}
	});

	it("can narrow FollowOrder by type", () => {
		const order: BotOrder = {
			type: BotOrderType.FOLLOW,
			targetId: "leader",
		};

		if (order.type === BotOrderType.FOLLOW) {
			expect(order.targetId).toBe("leader");
		} else {
			fail("Should have matched FOLLOW");
		}
	});

	it("switch statement covers all order types exhaustively", () => {
		const orders: BotOrder[] = [
			{ type: BotOrderType.PATROL_AREA, center: pos(), radius: 10 },
			{ type: BotOrderType.ATTACK_TARGET, targetId: "t1" },
			{ type: BotOrderType.GUARD_POSITION, position: pos(), radius: 5 },
			{ type: BotOrderType.GATHER_RESOURCES, depositId: "d1" },
			{ type: BotOrderType.RETURN_TO_BASE },
			{ type: BotOrderType.FOLLOW, targetId: "l1" },
		];

		const types: string[] = [];
		for (const order of orders) {
			switch (order.type) {
				case BotOrderType.PATROL_AREA:
					types.push("patrol");
					break;
				case BotOrderType.ATTACK_TARGET:
					types.push("attack");
					break;
				case BotOrderType.GUARD_POSITION:
					types.push("guard");
					break;
				case BotOrderType.GATHER_RESOURCES:
					types.push("gather");
					break;
				case BotOrderType.RETURN_TO_BASE:
					types.push("return");
					break;
				case BotOrderType.FOLLOW:
					types.push("follow");
					break;
			}
		}

		expect(types).toEqual([
			"patrol",
			"attack",
			"guard",
			"gather",
			"return",
			"follow",
		]);
	});
});

// ===========================================================================
// distanceSqXZ (from BotContext)
// ===========================================================================

describe("distanceSqXZ", () => {
	it("returns 0 for same position", () => {
		expect(distanceSqXZ(pos(5, 0, 5), pos(5, 0, 5))).toBe(0);
	});

	it("computes squared distance on X axis", () => {
		expect(distanceSqXZ(pos(0, 0, 0), pos(3, 0, 0))).toBe(9);
	});

	it("computes squared distance on Z axis", () => {
		expect(distanceSqXZ(pos(0, 0, 0), pos(0, 0, 4))).toBe(16);
	});

	it("computes squared distance on both X and Z", () => {
		// 3^2 + 4^2 = 25
		expect(distanceSqXZ(pos(0, 0, 0), pos(3, 0, 4))).toBe(25);
	});

	it("ignores Y component completely", () => {
		// Only XZ matters; Y = 100 vs Y = 0 should not affect distance
		expect(distanceSqXZ(pos(0, 0, 0), pos(3, 100, 4))).toBe(25);
		expect(distanceSqXZ(pos(0, 50, 0), pos(3, 200, 4))).toBe(25);
	});

	it("is symmetric (a-to-b equals b-to-a)", () => {
		const a = pos(3, 0, 7);
		const b = pos(10, 0, 2);
		expect(distanceSqXZ(a, b)).toBe(distanceSqXZ(b, a));
	});

	it("handles negative coordinates", () => {
		// (-3-3)^2 + (-4-4)^2 = 36 + 64 = 100
		expect(distanceSqXZ(pos(-3, 0, -4), pos(3, 0, 4))).toBe(100);
	});

	it("handles very large coordinates", () => {
		const d = distanceSqXZ(pos(0, 0, 0), pos(1000, 0, 1000));
		expect(d).toBe(2_000_000);
	});

	it("handles fractional coordinates", () => {
		// (0.5)^2 + (0.5)^2 = 0.25 + 0.25 = 0.5
		const d = distanceSqXZ(pos(0, 0, 0), pos(0.5, 0, 0.5));
		expect(d).toBeCloseTo(0.5);
	});

	it("returns exact 0 for origin-to-origin", () => {
		expect(distanceSqXZ(pos(0, 0, 0), pos(0, 0, 0))).toBe(0);
	});

	it("returns exact 0 when X and Z match but Y differs", () => {
		expect(distanceSqXZ(pos(5, 0, 10), pos(5, 999, 10))).toBe(0);
	});
});

// ===========================================================================
// summarizeComponents (from BotContext)
// ===========================================================================

describe("summarizeComponents", () => {
	it("returns zero-values for empty component list", () => {
		const result = summarizeComponents([]);

		expect(result.total).toBe(0);
		expect(result.functional).toBe(0);
		expect(result.healthRatio).toBe(0);
		expect(result.hasArms).toBe(false);
		expect(result.hasCamera).toBe(false);
		expect(result.hasLegs).toBe(false);
	});

	it("counts total and functional components", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "camera", functional: true },
			{ name: "legs", functional: false },
			{ name: "antenna", functional: true },
		];

		const result = summarizeComponents(components);

		expect(result.total).toBe(4);
		expect(result.functional).toBe(3);
	});

	it("computes healthRatio as functional/total", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "camera", functional: false },
			{ name: "legs", functional: true },
			{ name: "antenna", functional: false },
		];

		const result = summarizeComponents(components);

		expect(result.healthRatio).toBeCloseTo(0.5);
	});

	it("returns healthRatio 1.0 when all components functional", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "camera", functional: true },
			{ name: "legs", functional: true },
		];

		const result = summarizeComponents(components);

		expect(result.healthRatio).toBe(1.0);
	});

	it("returns healthRatio 0.0 when all components broken", () => {
		const components = [
			{ name: "arms", functional: false },
			{ name: "camera", functional: false },
			{ name: "legs", functional: false },
		];

		const result = summarizeComponents(components);

		expect(result.healthRatio).toBe(0.0);
	});

	it("detects functional arms", () => {
		const components = [
			{ name: "arms", functional: true },
			{ name: "camera", functional: false },
		];

		const result = summarizeComponents(components);

		expect(result.hasArms).toBe(true);
		expect(result.hasCamera).toBe(false);
	});

	it("detects functional camera", () => {
		const components = [
			{ name: "camera", functional: true },
			{ name: "legs", functional: false },
		];

		const result = summarizeComponents(components);

		expect(result.hasCamera).toBe(true);
		expect(result.hasLegs).toBe(false);
	});

	it("detects functional legs", () => {
		const components = [
			{ name: "legs", functional: true },
			{ name: "arms", functional: false },
		];

		const result = summarizeComponents(components);

		expect(result.hasLegs).toBe(true);
		expect(result.hasArms).toBe(false);
	});

	it("reports hasArms false when arms exist but are broken", () => {
		const components = [{ name: "arms", functional: false }];

		const result = summarizeComponents(components);

		expect(result.hasArms).toBe(false);
	});

	it("reports hasCamera false when camera exists but is broken", () => {
		const components = [{ name: "camera", functional: false }];

		const result = summarizeComponents(components);

		expect(result.hasCamera).toBe(false);
	});

	it("reports hasLegs false when legs exist but are broken", () => {
		const components = [{ name: "legs", functional: false }];

		const result = summarizeComponents(components);

		expect(result.hasLegs).toBe(false);
	});

	it("reports false for arms/camera/legs when none present", () => {
		const components = [
			{ name: "antenna", functional: true },
			{ name: "sensor", functional: true },
		];

		const result = summarizeComponents(components);

		expect(result.hasArms).toBe(false);
		expect(result.hasCamera).toBe(false);
		expect(result.hasLegs).toBe(false);
	});

	it("handles multiple arms components (at least one functional)", () => {
		const components = [
			{ name: "arms", functional: false },
			{ name: "arms", functional: true },
		];

		const result = summarizeComponents(components);

		expect(result.hasArms).toBe(true);
		expect(result.total).toBe(2);
		expect(result.functional).toBe(1);
	});

	it("handles single component", () => {
		const components = [{ name: "legs", functional: true }];

		const result = summarizeComponents(components);

		expect(result.total).toBe(1);
		expect(result.functional).toBe(1);
		expect(result.healthRatio).toBe(1.0);
		expect(result.hasLegs).toBe(true);
	});

	it("handles many components correctly", () => {
		const components = Array.from({ length: 100 }, (_, i) => ({
			name: i % 3 === 0 ? "arms" : i % 3 === 1 ? "camera" : "legs",
			functional: i % 2 === 0,
		}));

		const result = summarizeComponents(components);

		expect(result.total).toBe(100);
		expect(result.functional).toBe(50);
		expect(result.healthRatio).toBeCloseTo(0.5);
		// At least one of each type should be functional
		expect(result.hasArms).toBe(true);
		expect(result.hasCamera).toBe(true);
		expect(result.hasLegs).toBe(true);
	});

	it("handles unknown component names (they count toward total/functional but not arms/camera/legs)", () => {
		const components = [
			{ name: "thruster", functional: true },
			{ name: "drill", functional: true },
			{ name: "shield", functional: false },
		];

		const result = summarizeComponents(components);

		expect(result.total).toBe(3);
		expect(result.functional).toBe(2);
		expect(result.hasArms).toBe(false);
		expect(result.hasCamera).toBe(false);
		expect(result.hasLegs).toBe(false);
	});

	it("produces correct healthRatio for 1 out of 3 functional", () => {
		const components = [
			{ name: "arms", functional: false },
			{ name: "camera", functional: true },
			{ name: "legs", functional: false },
		];

		const result = summarizeComponents(components);

		expect(result.healthRatio).toBeCloseTo(1 / 3);
	});
});

// ===========================================================================
// NearbyEntity interface shape
// ===========================================================================

describe("NearbyEntity interface", () => {
	it("can be constructed with all required fields", () => {
		const entity: NearbyEntity = {
			id: "entity-1",
			position: pos(10, 0, 20),
			distanceSq: 500,
			faction: "cultist",
		};

		expect(entity.id).toBe("entity-1");
		expect(entity.position).toEqual({ x: 10, y: 0, z: 20 });
		expect(entity.distanceSq).toBe(500);
		expect(entity.faction).toBe("cultist");
	});

	it("sorting by distanceSq gives closest-first order", () => {
		const entities: NearbyEntity[] = [
			{ id: "far", position: pos(100, 0, 0), distanceSq: 10000, faction: "rogue" },
			{ id: "close", position: pos(2, 0, 0), distanceSq: 4, faction: "rogue" },
			{ id: "mid", position: pos(10, 0, 0), distanceSq: 100, faction: "rogue" },
		];

		const sorted = [...entities].sort((a, b) => a.distanceSq - b.distanceSq);

		expect(sorted[0].id).toBe("close");
		expect(sorted[1].id).toBe("mid");
		expect(sorted[2].id).toBe("far");
	});
});

// ===========================================================================
// ComponentStatus interface shape
// ===========================================================================

describe("ComponentStatus interface", () => {
	it("can be constructed with all required fields", () => {
		const status: ComponentStatus = {
			total: 4,
			functional: 3,
			healthRatio: 0.75,
			hasArms: true,
			hasCamera: true,
			hasLegs: false,
		};

		expect(status.total).toBe(4);
		expect(status.functional).toBe(3);
		expect(status.healthRatio).toBe(0.75);
		expect(status.hasArms).toBe(true);
		expect(status.hasCamera).toBe(true);
		expect(status.hasLegs).toBe(false);
	});
});
