// ─── Mock Rapier (WASM can't load in Node) ──────────────────────────────────

jest.mock("@dimforge/rapier3d-compat", () => {
	class MockRay {
		origin: { x: number; y: number; z: number };
		dir: { x: number; y: number; z: number };
		constructor(
			origin: { x: number; y: number; z: number },
			dir: { x: number; y: number; z: number },
		) {
			this.origin = origin;
			this.dir = dir;
		}
	}

	return {
		default: { Ray: MockRay },
		Ray: MockRay,
	};
});

import {
	castSelectionRay,
	clearColliderEntityMap,
	getEntityForCollider,
	registerColliderEntity,
	unregisterColliderEntity,
} from "../raycastUtils.ts";

// ─── Mock Helpers ───────────────────────────────────────────────────────────

interface MockCollider {
	handle: number;
	castRayAndGetNormal: ReturnType<typeof jest.fn>;
}

function makeMockCollider(
	handle: number,
	normal = { x: 0, y: 1, z: 0 },
): MockCollider {
	return {
		handle,
		castRayAndGetNormal: jest.fn().mockReturnValue({ normal }),
	};
}

function makeMockWorld(
	hit: { timeOfImpact: number; collider: MockCollider } | null,
) {
	return {
		castRay: jest.fn().mockReturnValue(hit),
	} as unknown as import("@dimforge/rapier3d-compat").World;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("collider entity registry", () => {
	beforeEach(() => {
		clearColliderEntityMap();
	});

	it("registers and retrieves entity by collider handle", () => {
		registerColliderEntity(42, "entity_abc");
		expect(getEntityForCollider(42)).toBe("entity_abc");
	});

	it("returns undefined for unregistered handle", () => {
		expect(getEntityForCollider(999)).toBeUndefined();
	});

	it("unregisters a collider handle", () => {
		registerColliderEntity(7, "entity_xyz");
		unregisterColliderEntity(7);
		expect(getEntityForCollider(7)).toBeUndefined();
	});

	it("clearColliderEntityMap removes all mappings", () => {
		registerColliderEntity(1, "a");
		registerColliderEntity(2, "b");
		clearColliderEntityMap();
		expect(getEntityForCollider(1)).toBeUndefined();
		expect(getEntityForCollider(2)).toBeUndefined();
	});
});

describe("castSelectionRay", () => {
	beforeEach(() => {
		clearColliderEntityMap();
	});

	it("returns hit data when ray hits a registered entity", () => {
		const collider = makeMockCollider(10, { x: 0, y: 1, z: 0 });
		const world = makeMockWorld({ timeOfImpact: 5.0, collider });
		registerColliderEntity(10, "entity_ore_deposit");

		const result = castSelectionRay(
			world,
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			50,
		);

		expect(result).not.toBeNull();
		expect(result!.entityId).toBe("entity_ore_deposit");
		expect(result!.distance).toBe(5.0);
		// point = origin + dir * distance = (0, 1, 0) + (0, 0, -1) * 5 = (0, 1, -5)
		expect(result!.point).toEqual({ x: 0, y: 1, z: -5 });
		expect(result!.normal).toEqual({ x: 0, y: 1, z: 0 });
	});

	it("returns null on miss (castRay returns null)", () => {
		const world = makeMockWorld(null);

		const result = castSelectionRay(
			world,
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			50,
		);

		expect(result).toBeNull();
	});

	it("returns null when distance exceeds maxDistance", () => {
		const collider = makeMockCollider(10);
		const world = makeMockWorld({ timeOfImpact: 60.0, collider });
		registerColliderEntity(10, "entity_far");

		const result = castSelectionRay(
			world,
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			50,
		);

		expect(result).toBeNull();
	});

	it("returns null when collider not in entity registry", () => {
		const collider = makeMockCollider(99);
		const world = makeMockWorld({ timeOfImpact: 3.0, collider });
		// Deliberately NOT registering collider 99

		const result = castSelectionRay(
			world,
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			50,
		);

		expect(result).toBeNull();
	});

	it("computes hit point correctly for diagonal ray", () => {
		const collider = makeMockCollider(5, { x: 0, y: 1, z: 0 });
		const world = makeMockWorld({ timeOfImpact: 10.0, collider });
		registerColliderEntity(5, "entity_diag");

		const result = castSelectionRay(
			world,
			{ x: 1, y: 2, z: 3 },
			{ x: 0.5, y: -0.5, z: 0.5 },
			50,
		);

		expect(result).not.toBeNull();
		// point = (1, 2, 3) + (0.5, -0.5, 0.5) * 10 = (6, -3, 8)
		expect(result!.point.x).toBeCloseTo(6);
		expect(result!.point.y).toBeCloseTo(-3);
		expect(result!.point.z).toBeCloseTo(8);
	});

	it("uses default maxDistance from config when not provided", () => {
		const collider = makeMockCollider(1);
		const world = makeMockWorld({ timeOfImpact: 45.0, collider });
		registerColliderEntity(1, "entity_within_default");

		// Default maxDistance is 50 (from config/rendering.json)
		const result = castSelectionRay(
			world,
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
		);

		expect(result).not.toBeNull();
		expect(result!.entityId).toBe("entity_within_default");
	});

	it("falls back to up-normal when castRayAndGetNormal returns null", () => {
		const collider = makeMockCollider(3);
		collider.castRayAndGetNormal.mockReturnValue(null);
		const world = makeMockWorld({ timeOfImpact: 2.0, collider });
		registerColliderEntity(3, "entity_no_normal");

		const result = castSelectionRay(
			world,
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
			50,
		);

		expect(result).not.toBeNull();
		expect(result!.normal).toEqual({ x: 0, y: 1, z: 0 });
	});
});
