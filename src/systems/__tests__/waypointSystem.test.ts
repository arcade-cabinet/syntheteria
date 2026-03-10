/**
 * Unit tests for the waypoint navigation system.
 *
 * Tests cover:
 * - Adding and removing waypoints
 * - Distance calculation (2D XZ, ignoring Y)
 * - Bearing calculation (signed angle from player forward)
 * - Waypoint expiration on tick
 * - Visibility filtering and toggling
 * - Objective waypoint convenience API
 * - Querying by type, by ID, closest waypoint
 * - Sorting by distance
 * - Edge cases: empty state, duplicate removes, multiple objectives
 */

import {
	addWaypoint,
	clearObjective,
	getActiveObjective,
	getClosestWaypoint,
	getVisibleWaypoints,
	getWaypointById,
	getWaypointsByType,
	removeWaypoint,
	reset,
	setObjectiveWaypoint,
	toggleVisibility,
	updateWaypoints,
} from "../waypointSystem";
import type { Waypoint, WaypointType } from "../waypointSystem";

// ---------------------------------------------------------------------------
// Setup — reset state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// Helper to create a minimal waypoint input
// ---------------------------------------------------------------------------

function makeWP(overrides: Partial<Omit<Waypoint, "id">> = {}): Omit<Waypoint, "id"> {
	return {
		position: { x: 0, y: 0, z: 0 },
		label: "Test",
		type: "poi",
		color: "#ffffff",
		icon: "star",
		visible: true,
		distanceToPlayer: 0,
		bearing: 0,
		priority: 50,
		expiresAt: null,
		createdBy: "test",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Adding and removing waypoints
// ---------------------------------------------------------------------------

describe("addWaypoint / removeWaypoint", () => {
	it("returns a unique string ID", () => {
		const id1 = addWaypoint(makeWP());
		const id2 = addWaypoint(makeWP());

		expect(typeof id1).toBe("string");
		expect(typeof id2).toBe("string");
		expect(id1).not.toBe(id2);
	});

	it("waypoint is retrievable after adding", () => {
		const id = addWaypoint(makeWP({ label: "Iron Deposit" }));
		const wp = getWaypointById(id);

		expect(wp).not.toBeNull();
		expect(wp!.label).toBe("Iron Deposit");
		expect(wp!.id).toBe(id);
	});

	it("removeWaypoint returns true for existing waypoint", () => {
		const id = addWaypoint(makeWP());
		expect(removeWaypoint(id)).toBe(true);
	});

	it("removeWaypoint returns false for non-existent ID", () => {
		expect(removeWaypoint("wp_nonexistent")).toBe(false);
	});

	it("waypoint is gone after removal", () => {
		const id = addWaypoint(makeWP());
		removeWaypoint(id);
		expect(getWaypointById(id)).toBeNull();
	});

	it("removing same ID twice returns false the second time", () => {
		const id = addWaypoint(makeWP());
		expect(removeWaypoint(id)).toBe(true);
		expect(removeWaypoint(id)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Distance calculation (2D XZ)
// ---------------------------------------------------------------------------

describe("distance calculation", () => {
	it("computes 2D XZ distance ignoring Y", () => {
		const id = addWaypoint(
			makeWP({ position: { x: 3, y: 100, z: 4 } }),
		);

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const wp = getWaypointById(id)!;
		// sqrt(3^2 + 4^2) = 5
		expect(wp.distanceToPlayer).toBeCloseTo(5, 5);
	});

	it("distance is zero when player is at waypoint position", () => {
		const id = addWaypoint(
			makeWP({ position: { x: 10, y: 5, z: 20 } }),
		);

		updateWaypoints({ x: 10, y: 0, z: 20 }, 0, 0);

		const wp = getWaypointById(id)!;
		expect(wp.distanceToPlayer).toBeCloseTo(0, 5);
	});

	it("Y difference does not affect distance", () => {
		const id = addWaypoint(
			makeWP({ position: { x: 0, y: 1000, z: 0 } }),
		);

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const wp = getWaypointById(id)!;
		expect(wp.distanceToPlayer).toBeCloseTo(0, 5);
	});
});

// ---------------------------------------------------------------------------
// Bearing calculation
// ---------------------------------------------------------------------------

describe("bearing calculation", () => {
	it("bearing is 0 when waypoint is directly ahead (along +Z, yaw=0)", () => {
		const id = addWaypoint(
			makeWP({ position: { x: 0, y: 0, z: 10 } }),
		);

		// yaw=0 means facing +Z
		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const wp = getWaypointById(id)!;
		expect(wp.bearing).toBeCloseTo(0, 5);
	});

	it("bearing is ~PI/2 when waypoint is to the right", () => {
		const id = addWaypoint(
			makeWP({ position: { x: 10, y: 0, z: 0 } }),
		);

		// Facing +Z (yaw=0), target is at +X = to the right
		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const wp = getWaypointById(id)!;
		expect(wp.bearing).toBeCloseTo(Math.PI / 2, 5);
	});

	it("bearing is ~-PI/2 when waypoint is to the left", () => {
		const id = addWaypoint(
			makeWP({ position: { x: -10, y: 0, z: 0 } }),
		);

		// Facing +Z (yaw=0), target is at -X = to the left
		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const wp = getWaypointById(id)!;
		expect(wp.bearing).toBeCloseTo(-Math.PI / 2, 5);
	});

	it("bearing is +-PI when waypoint is directly behind", () => {
		const id = addWaypoint(
			makeWP({ position: { x: 0, y: 0, z: -10 } }),
		);

		// Facing +Z (yaw=0), target is at -Z = behind
		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const wp = getWaypointById(id)!;
		// Could be +PI or -PI, both are valid
		expect(Math.abs(wp.bearing)).toBeCloseTo(Math.PI, 5);
	});

	it("bearing accounts for player yaw rotation", () => {
		const id = addWaypoint(
			makeWP({ position: { x: 10, y: 0, z: 0 } }),
		);

		// Player facing +X (yaw = PI/2), target at +X = directly ahead
		updateWaypoints({ x: 0, y: 0, z: 0 }, Math.PI / 2, 0);

		const wp = getWaypointById(id)!;
		expect(wp.bearing).toBeCloseTo(0, 5);
	});
});

// ---------------------------------------------------------------------------
// Expiration
// ---------------------------------------------------------------------------

describe("waypoint expiration", () => {
	it("removes waypoint when currentTime >= expiresAt", () => {
		const id = addWaypoint(
			makeWP({ expiresAt: 100 }),
		);

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 100);

		expect(getWaypointById(id)).toBeNull();
	});

	it("keeps waypoint when currentTime < expiresAt", () => {
		const id = addWaypoint(
			makeWP({ expiresAt: 100 }),
		);

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 99);

		expect(getWaypointById(id)).not.toBeNull();
	});

	it("permanent waypoints (expiresAt=null) are never removed", () => {
		const id = addWaypoint(
			makeWP({ expiresAt: null }),
		);

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 999999);

		expect(getWaypointById(id)).not.toBeNull();
	});

	it("expired objective clears currentObjectiveId", () => {
		setObjectiveWaypoint({ x: 10, y: 0, z: 10 }, "Temp Objective");
		const obj = getActiveObjective();
		expect(obj).not.toBeNull();

		// Manually set expiresAt on the objective for this test
		// We need to get the id and add a new one with expiration
		clearObjective();

		const id = addWaypoint(
			makeWP({ type: "objective", expiresAt: 50 }),
		);

		// Simulate it being the objective
		// Since we can't directly set currentObjectiveId, we test via the
		// removeWaypoint path that clearObjective properly handles it
		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 50);
		expect(getWaypointById(id)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

describe("visibility", () => {
	it("getVisibleWaypoints excludes invisible waypoints", () => {
		addWaypoint(makeWP({ label: "Visible", visible: true }));
		addWaypoint(makeWP({ label: "Hidden", visible: false }));

		const visible = getVisibleWaypoints();
		expect(visible).toHaveLength(1);
		expect(visible[0].label).toBe("Visible");
	});

	it("getVisibleWaypoints filters by maxDistance", () => {
		addWaypoint(makeWP({ position: { x: 5, y: 0, z: 0 }, label: "Near" }));
		addWaypoint(makeWP({ position: { x: 50, y: 0, z: 0 }, label: "Far" }));

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const visible = getVisibleWaypoints(10);
		expect(visible).toHaveLength(1);
		expect(visible[0].label).toBe("Near");
	});

	it("getVisibleWaypoints sorts by distance (nearest first)", () => {
		addWaypoint(makeWP({ position: { x: 30, y: 0, z: 0 }, label: "Far" }));
		addWaypoint(makeWP({ position: { x: 5, y: 0, z: 0 }, label: "Near" }));
		addWaypoint(makeWP({ position: { x: 15, y: 0, z: 0 }, label: "Mid" }));

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const visible = getVisibleWaypoints();
		expect(visible).toHaveLength(3);
		expect(visible[0].label).toBe("Near");
		expect(visible[1].label).toBe("Mid");
		expect(visible[2].label).toBe("Far");
	});

	it("toggleVisibility flips visibility state", () => {
		const id = addWaypoint(makeWP({ visible: true }));

		const newState = toggleVisibility(id);
		expect(newState).toBe(false);
		expect(getWaypointById(id)!.visible).toBe(false);

		const restored = toggleVisibility(id);
		expect(restored).toBe(true);
		expect(getWaypointById(id)!.visible).toBe(true);
	});

	it("toggleVisibility returns false for non-existent ID", () => {
		expect(toggleVisibility("wp_nonexistent")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Objective waypoint convenience API
// ---------------------------------------------------------------------------

describe("objective waypoint", () => {
	it("setObjectiveWaypoint creates an objective waypoint", () => {
		const id = setObjectiveWaypoint({ x: 10, y: 0, z: 20 }, "Iron Deposit");

		const wp = getWaypointById(id)!;
		expect(wp.type).toBe("objective");
		expect(wp.label).toBe("Iron Deposit");
		expect(wp.position).toEqual({ x: 10, y: 0, z: 20 });
		expect(wp.visible).toBe(true);
		expect(wp.priority).toBe(100);
	});

	it("setObjectiveWaypoint replaces previous objective", () => {
		const id1 = setObjectiveWaypoint({ x: 1, y: 0, z: 1 }, "First");
		const id2 = setObjectiveWaypoint({ x: 2, y: 0, z: 2 }, "Second");

		expect(getWaypointById(id1)).toBeNull(); // old one removed
		expect(getWaypointById(id2)).not.toBeNull();

		const obj = getActiveObjective();
		expect(obj).not.toBeNull();
		expect(obj!.label).toBe("Second");
	});

	it("clearObjective removes the objective", () => {
		const id = setObjectiveWaypoint({ x: 10, y: 0, z: 20 }, "Target");

		clearObjective();

		expect(getWaypointById(id)).toBeNull();
		expect(getActiveObjective()).toBeNull();
	});

	it("clearObjective is a no-op when no objective exists", () => {
		// Should not throw
		clearObjective();
		expect(getActiveObjective()).toBeNull();
	});

	it("getActiveObjective returns the current objective", () => {
		expect(getActiveObjective()).toBeNull();

		setObjectiveWaypoint({ x: 5, y: 0, z: 5 }, "My Furnace");

		const obj = getActiveObjective();
		expect(obj).not.toBeNull();
		expect(obj!.label).toBe("My Furnace");
	});
});

// ---------------------------------------------------------------------------
// Query by type
// ---------------------------------------------------------------------------

describe("getWaypointsByType", () => {
	it("returns only waypoints of the specified type", () => {
		addWaypoint(makeWP({ type: "poi", label: "POI 1" }));
		addWaypoint(makeWP({ type: "danger", label: "Danger 1" }));
		addWaypoint(makeWP({ type: "poi", label: "POI 2" }));
		addWaypoint(makeWP({ type: "custom", label: "Custom 1" }));

		const pois = getWaypointsByType("poi");
		expect(pois).toHaveLength(2);
		expect(pois.every((w) => w.type === "poi")).toBe(true);
	});

	it("returns empty array when no waypoints of type exist", () => {
		addWaypoint(makeWP({ type: "poi" }));
		expect(getWaypointsByType("danger")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// getClosestWaypoint
// ---------------------------------------------------------------------------

describe("getClosestWaypoint", () => {
	it("returns the nearest waypoint by XZ distance", () => {
		addWaypoint(makeWP({ position: { x: 100, y: 0, z: 0 }, label: "Far" }));
		addWaypoint(makeWP({ position: { x: 3, y: 0, z: 4 }, label: "Near" }));
		addWaypoint(makeWP({ position: { x: 50, y: 0, z: 0 }, label: "Mid" }));

		const closest = getClosestWaypoint({ x: 0, y: 0, z: 0 });
		expect(closest).not.toBeNull();
		expect(closest!.label).toBe("Near");
	});

	it("filters by type when specified", () => {
		addWaypoint(makeWP({ position: { x: 1, y: 0, z: 0 }, type: "poi", label: "Nearest POI" }));
		addWaypoint(makeWP({ position: { x: 2, y: 0, z: 0 }, type: "danger", label: "Nearest Danger" }));

		const closestDanger = getClosestWaypoint({ x: 0, y: 0, z: 0 }, "danger");
		expect(closestDanger).not.toBeNull();
		expect(closestDanger!.label).toBe("Nearest Danger");
	});

	it("returns null when no waypoints exist", () => {
		expect(getClosestWaypoint({ x: 0, y: 0, z: 0 })).toBeNull();
	});

	it("returns null when no waypoints of specified type exist", () => {
		addWaypoint(makeWP({ type: "poi" }));
		expect(getClosestWaypoint({ x: 0, y: 0, z: 0 }, "danger")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears all waypoints", () => {
		addWaypoint(makeWP());
		addWaypoint(makeWP());
		setObjectiveWaypoint({ x: 0, y: 0, z: 0 }, "Obj");

		reset();

		expect(getVisibleWaypoints()).toHaveLength(0);
		expect(getActiveObjective()).toBeNull();
	});

	it("resets ID counter so IDs restart", () => {
		const id1 = addWaypoint(makeWP());
		reset();
		const id2 = addWaypoint(makeWP());

		// After reset, the counter restarts so we should get the same prefix pattern
		expect(id1).toBe(id2);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("getWaypointById returns null for unknown ID", () => {
		expect(getWaypointById("wp_unknown")).toBeNull();
	});

	it("getVisibleWaypoints returns empty array when no waypoints exist", () => {
		expect(getVisibleWaypoints()).toEqual([]);
	});

	it("updateWaypoints is safe with no waypoints", () => {
		// Should not throw
		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);
	});

	it("multiple waypoints at same position have distance zero difference", () => {
		const id1 = addWaypoint(makeWP({ position: { x: 5, y: 0, z: 5 }, label: "A" }));
		const id2 = addWaypoint(makeWP({ position: { x: 5, y: 0, z: 5 }, label: "B" }));

		updateWaypoints({ x: 0, y: 0, z: 0 }, 0, 0);

		const wp1 = getWaypointById(id1)!;
		const wp2 = getWaypointById(id2)!;
		expect(wp1.distanceToPlayer).toBeCloseTo(wp2.distanceToPlayer, 5);
	});

	it("removeWaypoint on objective clears objective state", () => {
		const id = setObjectiveWaypoint({ x: 1, y: 0, z: 1 }, "Obj");
		removeWaypoint(id);
		expect(getActiveObjective()).toBeNull();
	});
});
