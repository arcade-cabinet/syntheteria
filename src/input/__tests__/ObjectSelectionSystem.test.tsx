import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock Rapier (WASM can't load in Node) ──────────────────────────────────

vi.mock("@dimforge/rapier3d-compat", () => {
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

// ─── Mock Three.js ──────────────────────────────────────────────────────────

vi.mock("three", () => {
	class Vector3 {
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
		copy(v: { x: number; y: number; z: number }) {
			this.x = v.x;
			this.y = v.y;
			this.z = v.z;
			return this;
		}
		sub(v: { x: number; y: number; z: number }) {
			this.x -= v.x;
			this.y -= v.y;
			this.z -= v.z;
			return this;
		}
		dot(v: { x: number; y: number; z: number }) {
			return this.x * v.x + this.y * v.y + this.z * v.z;
		}
		multiplyScalar(s: number) {
			this.x *= s;
			this.y *= s;
			this.z *= s;
			return this;
		}
		add(v: { x: number; y: number; z: number }) {
			this.x += v.x;
			this.y += v.y;
			this.z += v.z;
			return this;
		}
		distanceTo(v: { x: number; y: number; z: number }) {
			const dx = this.x - v.x;
			const dy = this.y - v.y;
			const dz = this.z - v.z;
			return Math.sqrt(dx * dx + dy * dy + dz * dz);
		}
	}

	class Raycaster {
		far = 100;
		set() {}
		intersectObjects() {
			return [];
		}
	}

	return { Vector3, Raycaster };
});

// ─── Mock R3F hooks ─────────────────────────────────────────────────────────

vi.mock("@react-three/fiber", () => ({
	useThree: vi.fn(() => ({
		camera: {},
		gl: { domElement: document.createElement("canvas") },
		scene: { children: [] },
	})),
	useFrame: vi.fn(),
}));

// ─── Mock ECS world (all entity arrays empty) ──────────────────────────────

vi.mock("../../ecs/world", () => ({
	belts: [],
	buildings: [],
	getActivePlayerBot: vi.fn(),
	hackables: [],
	items: [],
	miners: [],
	otters: [],
	processors: [],
	signalRelays: [],
	units: [],
	wires: [],
}));

// ─── Mock Physics ───────────────────────────────────────────────────────────

vi.mock("../../physics/PhysicsWorld", () => ({
	getPhysicsWorld: vi.fn(),
	isPhysicsInitialized: vi.fn(),
}));

// ─── Mock raycastUtils ──────────────────────────────────────────────────────

vi.mock("../raycastUtils", () => ({
	castSelectionRay: vi.fn(),
	SELECTION_RAY_MAX_DISTANCE: 50,
	registerColliderEntity: vi.fn(),
	unregisterColliderEntity: vi.fn(),
	clearColliderEntityMap: vi.fn(),
	getEntityForCollider: vi.fn(),
}));

// ─── Mock selectionState ────────────────────────────────────────────────────

vi.mock("../selectionState", () => ({
	setSelected: vi.fn(),
	getSelected: vi.fn(),
	onSelectionChange: vi.fn(),
	_resetSelectionState: vi.fn(),
}));

// ─── Imports (after mocks, vitest hoists vi.mock above these) ───────────────

import { handleSelectionClick } from "../ObjectSelectionSystem.tsx";
import { castSelectionRay } from "../raycastUtils.ts";
import { setSelected } from "../selectionState.ts";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("handleSelectionClick", () => {
	const mockWorld = {} as import("@dimforge/rapier3d-compat").World;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls setSelected with entity ID when ray hits a registered entity", () => {
		vi.mocked(castSelectionRay).mockReturnValue({
			entityId: "ore_deposit_1",
			point: { x: 0, y: 0, z: -5 },
			normal: { x: 0, y: 1, z: 0 },
			distance: 5,
		});

		handleSelectionClick(
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			mockWorld,
		);

		expect(castSelectionRay).toHaveBeenCalledWith(
			mockWorld,
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
		);
		expect(setSelected).toHaveBeenCalledWith("ore_deposit_1");
	});

	it("calls setSelected(null) when ray misses (no hit)", () => {
		vi.mocked(castSelectionRay).mockReturnValue(null);

		handleSelectionClick(
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			mockWorld,
		);

		expect(castSelectionRay).toHaveBeenCalled();
		expect(setSelected).toHaveBeenCalledWith(null);
	});

	it("calls setSelected(null) when physics world is null", () => {
		handleSelectionClick(
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			null,
		);

		expect(castSelectionRay).not.toHaveBeenCalled();
		expect(setSelected).toHaveBeenCalledWith(null);
	});

	it("passes camera position and direction to castSelectionRay", () => {
		vi.mocked(castSelectionRay).mockReturnValue(null);

		const cameraPos = { x: 10, y: 2, z: -5 };
		const cameraDir = { x: 0.5, y: -0.3, z: -0.8 };

		handleSelectionClick(cameraPos, cameraDir, mockWorld);

		expect(castSelectionRay).toHaveBeenCalledWith(
			mockWorld,
			cameraPos,
			cameraDir,
		);
	});

	it("selects different entities on successive clicks", () => {
		vi.mocked(castSelectionRay)
			.mockReturnValueOnce({
				entityId: "cube_1",
				point: { x: 1, y: 0, z: -3 },
				normal: { x: 0, y: 1, z: 0 },
				distance: 3,
			})
			.mockReturnValueOnce({
				entityId: "cube_2",
				point: { x: 2, y: 0, z: -4 },
				normal: { x: 0, y: 1, z: 0 },
				distance: 4,
			});

		handleSelectionClick({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, mockWorld);
		handleSelectionClick({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, mockWorld);

		expect(setSelected).toHaveBeenCalledTimes(2);
		expect(setSelected).toHaveBeenNthCalledWith(1, "cube_1");
		expect(setSelected).toHaveBeenNthCalledWith(2, "cube_2");
	});

	it("mobile tap uses same handleSelectionClick function as desktop click", () => {
		// Both desktop click and mobile tap call the same handleSelectionClick.
		// Verify the function works identically regardless of caller.
		vi.mocked(castSelectionRay).mockReturnValue({
			entityId: "furnace_7",
			point: { x: 3, y: 0, z: -2 },
			normal: { x: 0, y: 1, z: 0 },
			distance: 2,
		});

		handleSelectionClick(
			{ x: 0, y: 1, z: 0 },
			{ x: 0, y: 0, z: -1 },
			mockWorld,
		);

		expect(setSelected).toHaveBeenCalledWith("furnace_7");
	});
});
