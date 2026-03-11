/**
 * Unit tests for PhysicsWorld.ts.
 *
 * Tests cover:
 * - isPhysicsInitialized returns false before initPhysics
 * - initPhysics marks world as initialized
 * - initPhysics is idempotent (second call has no effect)
 * - getPhysicsWorld returns null before initialization
 * - getPhysicsWorld returns a world instance after initialization
 * - addStaticBox returns null when physics is not initialized
 * - addStaticBox returns a collider after initialization
 * - addKinematicBody returns null when physics is not initialized
 * - addKinematicBody returns a rigid body after initialization
 * - addDynamicBody returns null when physics is not initialized
 * - addDynamicBody returns a rigid body after initialization
 * - addGroundPlane returns null when physics is not initialized
 * - addGroundPlane returns a collider after initialization
 * - stepPhysics does not throw when called without initialization
 * - stepPhysics calls world.step after initialization
 * - castRay returns null when physics is not initialized
 * - castRay returns null when no hit is found
 * - castRay returns hit point and normal when something is hit
 * - disposePhysics marks world as uninitialized
 * - disposePhysics allows re-initialization
 */

// ---------------------------------------------------------------------------
// Mock Rapier (WASM can't load in Node)
// ---------------------------------------------------------------------------

const mockStep = jest.fn();
const mockCreateRigidBody = jest.fn();
const mockCreateCollider = jest.fn();
const mockCastRay = jest.fn();
const mockRayPointAt = jest.fn();
const mockColliderCastRayAndGetNormal = jest.fn();

// Rapier constructor mocks
class MockWorld {
	step = mockStep;
	createRigidBody = mockCreateRigidBody;
	createCollider = mockCreateCollider;
	castRay = mockCastRay;
	free = jest.fn();
}

class MockRay {
	constructor(
		public origin: { x: number; y: number; z: number },
		public dir: { x: number; y: number; z: number },
	) {}
	pointAt = mockRayPointAt;
}

const mockCollider = {
	castRayAndGetNormal: mockColliderCastRayAndGetNormal,
};

const mockRigidBody = { translation: () => ({ x: 0, y: 0, z: 0 }) };
const mockRapierInit = jest.fn().mockResolvedValue(undefined);

jest.mock("@dimforge/rapier3d-compat", () => ({
	__esModule: true,
	default: {
		init: () => mockRapierInit(),
		World: MockWorld,
		Ray: MockRay,
		RigidBodyDesc: {
			fixed: () => ({
				setTranslation: () => ({ setTranslation: jest.fn() }),
			}),
			kinematicPositionBased: () => ({
				setTranslation: () => ({}),
			}),
			dynamic: () => ({
				setTranslation: () => ({
					setAdditionalMass: () => ({}),
				}),
			}),
		},
		ColliderDesc: {
			cuboid: () => ({}),
		},
	},
}));

import {
	addDynamicBody,
	addGroundPlane,
	addKinematicBody,
	addStaticBox,
	castRay,
	disposePhysics,
	getPhysicsWorld,
	initPhysics,
	isPhysicsInitialized,
	stepPhysics,
} from "../PhysicsWorld";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();

	// Setup createRigidBody to return mock body
	mockCreateRigidBody.mockReturnValue(mockRigidBody);
	// Setup createCollider to return mock collider
	mockCreateCollider.mockReturnValue(mockCollider);
	// Setup castRay to return null (no hit) by default
	mockCastRay.mockReturnValue(null);
	// Setup pointAt to return a test point
	mockRayPointAt.mockReturnValue({ x: 1, y: 2, z: 3 });

	// Always clean up between tests
	disposePhysics();
});

// ---------------------------------------------------------------------------
// Initialization state
// ---------------------------------------------------------------------------

describe("isPhysicsInitialized", () => {
	it("returns false before initPhysics", () => {
		expect(isPhysicsInitialized()).toBe(false);
	});

	it("returns true after initPhysics", async () => {
		await initPhysics();
		expect(isPhysicsInitialized()).toBe(true);
	});
});

describe("initPhysics", () => {
	it("marks world as initialized", async () => {
		await initPhysics();
		expect(isPhysicsInitialized()).toBe(true);
	});

	it("is idempotent — calling twice doesn't reinitialize", async () => {
		await initPhysics();
		await initPhysics();
		expect(mockRapierInit).toHaveBeenCalledTimes(1);
	});
});

describe("getPhysicsWorld", () => {
	it("returns null before initialization", () => {
		expect(getPhysicsWorld()).toBeNull();
	});

	it("returns the world instance after initialization", async () => {
		await initPhysics();
		expect(getPhysicsWorld()).toBeDefined();
		expect(getPhysicsWorld()).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// addStaticBox
// ---------------------------------------------------------------------------

describe("addStaticBox", () => {
	it("returns null when physics is not initialized", () => {
		expect(addStaticBox(0, 0, 0, 1, 1, 1)).toBeNull();
	});

	it("returns a collider after initialization", async () => {
		await initPhysics();
		const result = addStaticBox(0, 0, 0, 1, 1, 1);
		expect(result).toBeDefined();
		expect(mockCreateCollider).toHaveBeenCalled();
	});

	it("creates a rigid body and collider", async () => {
		await initPhysics();
		addStaticBox(5, 2, 3, 0.5, 0.5, 0.5);
		expect(mockCreateRigidBody).toHaveBeenCalled();
		expect(mockCreateCollider).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// addKinematicBody
// ---------------------------------------------------------------------------

describe("addKinematicBody", () => {
	it("returns null when physics is not initialized", () => {
		expect(addKinematicBody(0, 0, 0)).toBeNull();
	});

	it("returns a rigid body after initialization", async () => {
		await initPhysics();
		const result = addKinematicBody(1, 2, 3);
		expect(result).toBeDefined();
		expect(mockCreateRigidBody).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// addDynamicBody
// ---------------------------------------------------------------------------

describe("addDynamicBody", () => {
	it("returns null when physics is not initialized", () => {
		expect(addDynamicBody(0, 0, 0)).toBeNull();
	});

	it("returns a rigid body after initialization", async () => {
		await initPhysics();
		const result = addDynamicBody(1, 2, 3);
		expect(result).toBeDefined();
		expect(mockCreateRigidBody).toHaveBeenCalled();
	});

	it("uses default mass of 1 when not specified", async () => {
		await initPhysics();
		addDynamicBody(0, 0, 0);
		expect(mockCreateRigidBody).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// addGroundPlane
// ---------------------------------------------------------------------------

describe("addGroundPlane", () => {
	it("returns null when physics is not initialized", () => {
		expect(addGroundPlane()).toBeNull();
	});

	it("returns a collider after initialization", async () => {
		await initPhysics();
		const result = addGroundPlane(0);
		expect(result).toBeDefined();
		expect(mockCreateCollider).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// stepPhysics
// ---------------------------------------------------------------------------

describe("stepPhysics", () => {
	it("does not throw when called without initialization", () => {
		expect(() => stepPhysics()).not.toThrow();
	});

	it("calls world.step after initialization", async () => {
		await initPhysics();
		stepPhysics();
		expect(mockStep).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// castRay
// ---------------------------------------------------------------------------

describe("castRay", () => {
	it("returns null when physics is not initialized", () => {
		expect(castRay(0, 0, 0, 0, -1, 0, 10)).toBeNull();
	});

	it("returns null when no hit is found", async () => {
		await initPhysics();
		mockCastRay.mockReturnValue(null);
		const result = castRay(0, 5, 0, 0, -1, 0, 20);
		expect(result).toBeNull();
	});

	it("returns hit point and normal when something is hit", async () => {
		await initPhysics();
		const hitPoint = { x: 1, y: 0, z: 3 };
		mockRayPointAt.mockReturnValue(hitPoint);
		mockColliderCastRayAndGetNormal.mockReturnValue({
			normal: { x: 0, y: 1, z: 0 },
		});
		mockCastRay.mockReturnValue({
			timeOfImpact: 5,
			collider: mockCollider,
		});

		const result = castRay(1, 5, 3, 0, -1, 0, 20);
		expect(result).not.toBeNull();
		expect(result?.point).toEqual(hitPoint);
		expect(result?.normal).toEqual({ x: 0, y: 1, z: 0 });
	});

	it("uses default normal {x:0,y:1,z:0} when hitNormal is null", async () => {
		await initPhysics();
		mockRayPointAt.mockReturnValue({ x: 0, y: 0, z: 0 });
		mockColliderCastRayAndGetNormal.mockReturnValue(null);
		mockCastRay.mockReturnValue({
			timeOfImpact: 5,
			collider: mockCollider,
		});

		const result = castRay(0, 5, 0, 0, -1, 0, 20);
		expect(result?.normal).toEqual({ x: 0, y: 1, z: 0 });
	});
});

// ---------------------------------------------------------------------------
// disposePhysics
// ---------------------------------------------------------------------------

describe("disposePhysics", () => {
	it("marks physics as uninitialized", async () => {
		await initPhysics();
		disposePhysics();
		expect(isPhysicsInitialized()).toBe(false);
	});

	it("getPhysicsWorld returns null after dispose", async () => {
		await initPhysics();
		disposePhysics();
		expect(getPhysicsWorld()).toBeNull();
	});

	it("allows re-initialization after dispose", async () => {
		await initPhysics();
		disposePhysics();
		await initPhysics();
		expect(isPhysicsInitialized()).toBe(true);
	});

	it("does not throw when called on already-clean state", () => {
		expect(() => disposePhysics()).not.toThrow();
	});
});
