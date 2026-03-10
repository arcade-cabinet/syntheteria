/**
 * Unit tests for the cube stacking system (US-013).
 *
 * Tests cover:
 * - getPlacementPreview returns grid coords near raycast hit
 * - Preview snaps to adjacent empty slot when hit slot is occupied
 * - Returns valid:false if canPlaceCube rules fail
 * - Returns null if no surface in range
 * - placeHeldCube drops cube then places at grid position
 * - placeHeldCube returns false if not holding a cube
 * - placeHeldCube returns false if preview is invalid
 */

import { describe, expect, it, vi } from "vitest";
import {
	type PlacementPreview,
	type RaycastHit,
	getPlacementPreview,
	placeHeldCube,
} from "../cubeStacking";
import { gridKey } from "../gridSnap";
import type { CubeEntity, Vec3 } from "../grabber";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Vec3. */
function vec3(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

/** Create a RaycastHit. */
function makeHit(
	point: Vec3,
	normal: Vec3 = vec3(0, 1, 0),
	entityId?: string,
): RaycastHit {
	return { point, normal, entityId };
}

/** Create a CubeEntity for getCubeFn mocking. */
function makeCube(id: string, material = "iron"): CubeEntity {
	return {
		id,
		position: vec3(),
		traits: ["HeldBy"],
		material,
	};
}

/** Build occupied slots set from grid coord tuples. */
function occupied(...coords: [number, number, number][]): Set<string> {
	const set = new Set<string>();
	for (const [x, y, z] of coords) {
		set.add(gridKey({ x, y, z }));
	}
	return set;
}

// ---------------------------------------------------------------------------
// getPlacementPreview — basic snapping
// ---------------------------------------------------------------------------

describe("getPlacementPreview — basic snapping", () => {
	it("returns grid coords near the raycast hit point", () => {
		// Hit at world (0.3, 0.0, 0.3) should snap to grid (1, 0, 1)
		// since 0.3 / 0.5 = 0.6 → round = 1
		const hit = makeHit(vec3(0.3, 0.0, 0.3));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: 1, y: 0, z: 1 });
	});

	it("returns worldPosition matching the snapped grid coord", () => {
		const hit = makeHit(vec3(0.3, 0.0, 0.3));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		// Grid (1, 0, 1) → world (0.5, 0.0, 0.5)
		expect(result!.worldPosition).toEqual({ x: 0.5, y: 0.0, z: 0.5 });
	});

	it("snaps exactly at grid boundaries", () => {
		// Hit at world (0.5, 0.0, 0.5) → grid (1, 0, 1)
		const hit = makeHit(vec3(0.5, 0.0, 0.5));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: 1, y: 0, z: 1 });
	});

	it("handles negative coordinates", () => {
		// Hit at world (-0.3, 0.0, -0.3) → grid (-1, 0, -1)
		const hit = makeHit(vec3(-0.3, 0.0, -0.3));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: -1, y: 0, z: -1 });
	});

	it("returns valid:true at ground level with empty grid", () => {
		const hit = makeHit(vec3(0.5, 0.0, 0.5));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		expect(result!.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getPlacementPreview — adjacent slot snapping
// ---------------------------------------------------------------------------

describe("getPlacementPreview — adjacent slot snapping", () => {
	it("offsets to adjacent empty slot when hit slot is occupied", () => {
		// Grid slot (1, 0, 1) is occupied, normal points up (+Y)
		// Should offset to (1, 1, 1) — stacking on top
		const slots = occupied([1, 0, 1]);
		const hit = makeHit(vec3(0.5, 0.0, 0.5), vec3(0, 1, 0));
		const result = getPlacementPreview(hit, slots);

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: 1, y: 1, z: 1 });
	});

	it("offsets sideways when normal is horizontal", () => {
		// Grid slot (1, 0, 1) is occupied, normal points +X
		// Should offset to (2, 0, 1)
		const slots = occupied([1, 0, 1]);
		const hit = makeHit(vec3(0.5, 0.0, 0.5), vec3(1, 0, 0));
		const result = getPlacementPreview(hit, slots);

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: 2, y: 0, z: 1 });
	});

	it("offsets in negative direction when normal is negative", () => {
		// Grid slot (1, 0, 1) is occupied, normal points -Z
		// Should offset to (1, 0, 0)
		const slots = occupied([1, 0, 1]);
		const hit = makeHit(vec3(0.5, 0.0, 0.5), vec3(0, 0, -1));
		const result = getPlacementPreview(hit, slots);

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: 1, y: 0, z: 0 });
	});

	it("does not offset when hit slot is empty", () => {
		// Grid slot (1, 0, 1) is NOT occupied
		const hit = makeHit(vec3(0.5, 0.0, 0.5), vec3(0, 1, 0));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: 1, y: 0, z: 1 });
	});
});

// ---------------------------------------------------------------------------
// getPlacementPreview — validity checks
// ---------------------------------------------------------------------------

describe("getPlacementPreview — validity checks", () => {
	it("returns valid:false if target slot is occupied after offset", () => {
		// Both (1, 0, 1) and (1, 1, 1) are occupied
		// Hit snaps to (1, 0, 1) → offsets up to (1, 1, 1) → still occupied
		const slots = occupied([1, 0, 1], [1, 1, 1]);
		const hit = makeHit(vec3(0.5, 0.0, 0.5), vec3(0, 1, 0));
		const result = getPlacementPreview(hit, slots);

		expect(result).not.toBeNull();
		expect(result!.valid).toBe(false);
		expect(result!.reason).toBeDefined();
	});

	it("returns valid:false if cube would float (no support below)", () => {
		// Trying to place at y=2 with nothing below
		const hit = makeHit(vec3(0.5, 1.0, 0.5), vec3(0, 1, 0));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		expect(result!.valid).toBe(false);
		expect(result!.reason).toContain("support");
	});

	it("returns valid:true when stacking on top of existing cube", () => {
		// Cube at (1, 0, 1), normal up → target (1, 1, 1), has support below
		const slots = occupied([1, 0, 1]);
		const hit = makeHit(vec3(0.5, 0.0, 0.5), vec3(0, 1, 0));
		const result = getPlacementPreview(hit, slots);

		expect(result).not.toBeNull();
		expect(result!.coord).toEqual({ x: 1, y: 1, z: 1 });
		expect(result!.valid).toBe(true);
	});

	it("returns valid:true at ground level (y=0)", () => {
		const hit = makeHit(vec3(0.0, 0.0, 0.0));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
		expect(result!.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getPlacementPreview — null cases
// ---------------------------------------------------------------------------

describe("getPlacementPreview — null cases", () => {
	it("returns null if hit is null", () => {
		const result = getPlacementPreview(null, new Set());

		expect(result).toBeNull();
	});

	it("returns null if hit point exceeds default max range", () => {
		// Default max range is 5.0, hit at distance ~8.66
		const hit = makeHit(vec3(5, 5, 5));
		const result = getPlacementPreview(hit, new Set());

		expect(result).toBeNull();
	});

	it("returns null if hit point exceeds custom max range", () => {
		const hit = makeHit(vec3(2, 0, 0));
		const result = getPlacementPreview(hit, new Set(), 1.5);

		expect(result).toBeNull();
	});

	it("returns preview if hit is within custom max range", () => {
		const hit = makeHit(vec3(1, 0, 0));
		const result = getPlacementPreview(hit, new Set(), 2.0);

		expect(result).not.toBeNull();
	});

	it("returns preview if hit is within default max range", () => {
		const hit = makeHit(vec3(2, 0, 0));
		const result = getPlacementPreview(hit, new Set());

		expect(result).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// placeHeldCube — success
// ---------------------------------------------------------------------------

describe("placeHeldCube — success", () => {
	it("drops cube then places at grid position", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const getHeldCubeFn = vi.fn(() => "cube_0");
		const dropCubeFn = vi.fn(() => true);
		const placeCubeFn = vi.fn(() => true);
		const getCubeFn = vi.fn(() => makeCube("cube_0", "iron"));

		const result = placeHeldCube(
			preview,
			getHeldCubeFn,
			dropCubeFn,
			placeCubeFn,
			getCubeFn,
		);

		expect(result).toBe(true);
	});

	it("calls dropCubeFn with preview worldPosition", () => {
		const preview: PlacementPreview = {
			coord: { x: 2, y: 0, z: 3 },
			worldPosition: { x: 1.0, y: 0.0, z: 1.5 },
			valid: true,
		};

		const dropCubeFn = vi.fn(() => true);
		const placeCubeFn = vi.fn(() => true);

		placeHeldCube(
			preview,
			() => "cube_0",
			dropCubeFn,
			placeCubeFn,
			() => makeCube("cube_0"),
		);

		expect(dropCubeFn).toHaveBeenCalledOnce();
		expect(dropCubeFn).toHaveBeenCalledWith({ x: 1.0, y: 0.0, z: 1.5 });
	});

	it("calls placeCubeFn with held cube ID, coord, and material", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const placeCubeFn = vi.fn(() => true);

		placeHeldCube(
			preview,
			() => "cube_0",
			() => true,
			placeCubeFn,
			() => makeCube("cube_0", "copper"),
		);

		expect(placeCubeFn).toHaveBeenCalledOnce();
		expect(placeCubeFn).toHaveBeenCalledWith(
			"cube_0",
			{ x: 1, y: 0, z: 1 },
			"copper",
		);
	});

	it("uses material from the cube entity", () => {
		const preview: PlacementPreview = {
			coord: { x: 0, y: 0, z: 0 },
			worldPosition: { x: 0, y: 0, z: 0 },
			valid: true,
		};

		const placeCubeFn = vi.fn(() => true);

		placeHeldCube(
			preview,
			() => "cube_0",
			() => true,
			placeCubeFn,
			() => makeCube("cube_0", "titanium"),
		);

		expect(placeCubeFn).toHaveBeenCalledWith(
			"cube_0",
			expect.any(Object),
			"titanium",
		);
	});

	it("calls drop before place (order matters)", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const callOrder: string[] = [];
		const dropCubeFn = vi.fn(() => {
			callOrder.push("drop");
			return true;
		});
		const placeCubeFn = vi.fn(() => {
			callOrder.push("place");
			return true;
		});

		placeHeldCube(
			preview,
			() => "cube_0",
			dropCubeFn,
			placeCubeFn,
			() => makeCube("cube_0"),
		);

		expect(callOrder).toEqual(["drop", "place"]);
	});
});

// ---------------------------------------------------------------------------
// placeHeldCube — failure: not holding
// ---------------------------------------------------------------------------

describe("placeHeldCube — not holding a cube", () => {
	it("returns false if getHeldCubeFn returns null", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const result = placeHeldCube(
			preview,
			() => null,
			vi.fn(() => true),
			vi.fn(() => true),
			vi.fn(),
		);

		expect(result).toBe(false);
	});

	it("does not call dropCubeFn when not holding", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const dropCubeFn = vi.fn(() => true);

		placeHeldCube(
			preview,
			() => null,
			dropCubeFn,
			vi.fn(() => true),
			vi.fn(),
		);

		expect(dropCubeFn).not.toHaveBeenCalled();
	});

	it("does not call placeCubeFn when not holding", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const placeCubeFn = vi.fn(() => true);

		placeHeldCube(
			preview,
			() => null,
			vi.fn(() => true),
			placeCubeFn,
			vi.fn(),
		);

		expect(placeCubeFn).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// placeHeldCube — failure: invalid preview
// ---------------------------------------------------------------------------

describe("placeHeldCube — invalid preview", () => {
	it("returns false if preview.valid is false", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 5, z: 1 },
			worldPosition: { x: 0.5, y: 2.5, z: 0.5 },
			valid: false,
			reason: "No support below — cube would float",
		};

		const result = placeHeldCube(
			preview,
			() => "cube_0",
			vi.fn(() => true),
			vi.fn(() => true),
			() => makeCube("cube_0"),
		);

		expect(result).toBe(false);
	});

	it("does not call dropCubeFn when preview is invalid", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 5, z: 1 },
			worldPosition: { x: 0.5, y: 2.5, z: 0.5 },
			valid: false,
		};

		const dropCubeFn = vi.fn(() => true);

		placeHeldCube(
			preview,
			() => "cube_0",
			dropCubeFn,
			vi.fn(() => true),
			() => makeCube("cube_0"),
		);

		expect(dropCubeFn).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// placeHeldCube — failure: cube not found
// ---------------------------------------------------------------------------

describe("placeHeldCube — cube not found in registry", () => {
	it("returns false if getCubeFn returns undefined", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const result = placeHeldCube(
			preview,
			() => "cube_0",
			vi.fn(() => true),
			vi.fn(() => true),
			() => undefined,
		);

		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// placeHeldCube — failure: drop fails
// ---------------------------------------------------------------------------

describe("placeHeldCube — drop fails", () => {
	it("returns false if dropCubeFn returns false", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const result = placeHeldCube(
			preview,
			() => "cube_0",
			() => false,
			vi.fn(() => true),
			() => makeCube("cube_0"),
		);

		expect(result).toBe(false);
	});

	it("does not call placeCubeFn if drop fails", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const placeCubeFn = vi.fn(() => true);

		placeHeldCube(
			preview,
			() => "cube_0",
			() => false,
			placeCubeFn,
			() => makeCube("cube_0"),
		);

		expect(placeCubeFn).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// placeHeldCube — failure: place fails
// ---------------------------------------------------------------------------

describe("placeHeldCube — place fails", () => {
	it("returns false if placeCubeFn returns false", () => {
		const preview: PlacementPreview = {
			coord: { x: 1, y: 0, z: 1 },
			worldPosition: { x: 0.5, y: 0.0, z: 0.5 },
			valid: true,
		};

		const result = placeHeldCube(
			preview,
			() => "cube_0",
			() => true,
			() => false,
			() => makeCube("cube_0"),
		);

		expect(result).toBe(false);
	});
});
