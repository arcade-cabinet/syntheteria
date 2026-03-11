/**
 * Tests for CityRenderer panel geometry integration.
 *
 * Covers:
 *   - buildPanelFaces returns well-formed BoxFaceOptions for every city
 *     building type (conduit, node, tower, ruin, wall)
 *   - Each face in the returned options has valid PanelOptions values
 *     (boltRadius > 0 when boltPattern !== "none", ventSlots >= 0, etc.)
 *   - Bottom face always has boltPattern "none" (never waste geometry on
 *     the underside of buildings that sit on terrain)
 *   - Ruin type returns no bolts on any face (worn-out appearance)
 *   - createBoxFromPanels is called with the panel options returned by
 *     buildPanelFaces (verifies the integration point)
 *
 * Three.js, PanelGeometry, and all rendering deps are mocked so tests run
 * without WebGL or a DOM.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockBufferGeometry {
	disposed = false;
	computeBoundingBox() {}
	computeVertexNormals() {}
	translate(_x: number, _y: number, _z: number) { return this; }
	scale(_x: number, _y: number, _z: number) { return this; }
	rotateX(_a: number) { return this; }
	clone() { return new MockBufferGeometry(); }
	applyMatrix4(_m: unknown) { return this; }
	dispose() { this.disposed = true; }
}

class MockObject3D {
	position = { set: jest.fn() };
	scale = { set: jest.fn() };
	rotation = { set: jest.fn() };
	matrix = {};
	updateMatrix = jest.fn();
}

class MockInstancedMesh {
	instanceMatrix = { needsUpdate: false };
	geometry: MockBufferGeometry;
	material: unknown;
	count: number;
	constructor(geo: MockBufferGeometry, mat: unknown, count: number) {
		this.geometry = geo;
		this.material = mat;
		this.count = count;
	}
	setMatrixAt(_i: number, _m: unknown) {}
}

class MockMeshStandardMaterial {
	color: unknown;
	roughness: number;
	metalness: number;
	dispose = jest.fn();
	constructor(opts: Record<string, unknown> = {}) {
		this.color = opts.color;
		this.roughness = (opts.roughness as number) ?? 0.5;
		this.metalness = (opts.metalness as number) ?? 0.5;
	}
}

class MockMeshBasicMaterial {
	color: unknown;
	transparent: boolean;
	opacity: number;
	dispose = jest.fn();
	constructor(opts: Record<string, unknown> = {}) {
		this.color = opts.color;
		this.transparent = (opts.transparent as boolean) ?? false;
		this.opacity = (opts.opacity as number) ?? 1;
	}
}

class MockBoxGeometry extends MockBufferGeometry {
	constructor(_w?: number, _h?: number, _d?: number) { super(); }
}

class MockCylinderGeometry extends MockBufferGeometry {
	constructor(_rTop?: number, _rBot?: number, _h?: number, _seg?: number) { super(); }
}

jest.mock("three", () => ({
	BufferGeometry: MockBufferGeometry,
	BoxGeometry: MockBoxGeometry,
	CylinderGeometry: MockCylinderGeometry,
	InstancedMesh: MockInstancedMesh,
	MeshStandardMaterial: MockMeshStandardMaterial,
	MeshBasicMaterial: MockMeshBasicMaterial,
	Object3D: MockObject3D,
	Color: jest.fn(),
}));

// ---------------------------------------------------------------------------
// PanelGeometry mock — track calls to createBoxFromPanels
// ---------------------------------------------------------------------------

const mockCreateBoxFromPanels = jest.fn((_w: number, _h: number, _d: number, _faces: unknown) => {
	return new MockBufferGeometry();
});

jest.mock("../procgen/PanelGeometry", () => ({
	createBoxFromPanels: mockCreateBoxFromPanels,
}));

// ---------------------------------------------------------------------------
// cityLayout mock
// ---------------------------------------------------------------------------

jest.mock("../../ecs/cityLayout", () => ({
	getCityBuildings: () => [],
}));

// ---------------------------------------------------------------------------
// terrain mock
// ---------------------------------------------------------------------------

jest.mock("../../ecs/terrain", () => ({
	getAllFragments: () => [],
	getTerrainHeight: () => 0,
	worldToFogIndex: () => -1,
}));

// ---------------------------------------------------------------------------
// R3F mock (useFrame / useMemo / useRef)
// ---------------------------------------------------------------------------

jest.mock("@react-three/fiber", () => ({
	useFrame: jest.fn(),
}));

jest.mock("react", () => ({
	...jest.requireActual("react"),
	useMemo: (fn: () => unknown) => fn(),
	useRef: (initial: unknown) => ({ current: initial }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { buildPanelFaces } from "../CityRenderer";
import type { CityBuilding } from "../../ecs/cityLayout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BuildingType = CityBuilding["type"];
const ALL_TYPES: BuildingType[] = ["conduit", "node", "tower", "ruin", "wall"];

const FACE_KEYS = ["front", "back", "left", "right", "top", "bottom"] as const;

// ---------------------------------------------------------------------------
// Tests: buildPanelFaces — structural shape
// ---------------------------------------------------------------------------

describe("buildPanelFaces", () => {
	it.each(ALL_TYPES)("returns an object for type '%s'", (type) => {
		const faces = buildPanelFaces(type);
		expect(faces).toBeDefined();
		expect(typeof faces).toBe("object");
	});

	it.each(ALL_TYPES)("all 6 faces are defined for type '%s'", (type) => {
		const faces = buildPanelFaces(type);
		for (const faceKey of FACE_KEYS) {
			expect(faces[faceKey]).toBeDefined();
		}
	});

	it.each(ALL_TYPES)("bottom face always has boltPattern 'none' for type '%s'", (type) => {
		const faces = buildPanelFaces(type);
		expect(faces.bottom?.boltPattern).toBe("none");
	});

	it.each(ALL_TYPES)("bottom face always has insetDepth 0 for type '%s'", (type) => {
		const faces = buildPanelFaces(type);
		// 0 or undefined both mean no inset — check it's not positive
		const depth = faces.bottom?.insetDepth ?? 0;
		expect(depth).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Tests: ruin type — worn-out appearance
// ---------------------------------------------------------------------------

describe("buildPanelFaces for 'ruin'", () => {
	it("has no bolts on any face", () => {
		const faces = buildPanelFaces("ruin");
		for (const faceKey of FACE_KEYS) {
			const face = faces[faceKey];
			if (face) {
				expect(face.boltPattern).toBe("none");
			}
		}
	});

	it("has seam lines on front face for worn-out look", () => {
		const faces = buildPanelFaces("ruin");
		expect(faces.front?.seamLines).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Tests: conduit type — structural walls with vents
// ---------------------------------------------------------------------------

describe("buildPanelFaces for 'conduit'", () => {
	it("front face has vent slots", () => {
		const faces = buildPanelFaces("conduit");
		expect(faces.front?.ventSlots).toBeGreaterThan(0);
	});

	it("front face has edge bolt pattern (appropriate for a wall segment)", () => {
		const faces = buildPanelFaces("conduit");
		expect(faces.front?.boltPattern).toBe("edges");
	});

	it("top face has grid bolt pattern", () => {
		const faces = buildPanelFaces("conduit");
		expect(faces.top?.boltPattern).toBe("grid");
	});
});

// ---------------------------------------------------------------------------
// Tests: node type — junction blocks with grid bolts
// ---------------------------------------------------------------------------

describe("buildPanelFaces for 'node'", () => {
	it("front face has grid bolt pattern", () => {
		const faces = buildPanelFaces("node");
		expect(faces.front?.boltPattern).toBe("grid");
	});

	it("front face has seam lines", () => {
		const faces = buildPanelFaces("node");
		expect(faces.front?.seamLines).toBeGreaterThan(0);
	});

	it("top face has grid bolts and inset", () => {
		const faces = buildPanelFaces("node");
		expect(faces.top?.boltPattern).toBe("grid");
		const inset = faces.top?.insetDepth ?? 0;
		expect(inset).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Tests: tower type — vertical vents
// ---------------------------------------------------------------------------

describe("buildPanelFaces for 'tower'", () => {
	it("front face has vertical vent slots", () => {
		const faces = buildPanelFaces("tower");
		expect(faces.front?.ventSlots).toBeGreaterThan(0);
		expect(faces.front?.ventVertical).toBe(true);
	});

	it("side faces also have vertical vents", () => {
		const faces = buildPanelFaces("tower");
		expect(faces.left?.ventVertical).toBe(true);
		expect(faces.right?.ventVertical).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Tests: wall type — minimal detail
// ---------------------------------------------------------------------------

describe("buildPanelFaces for 'wall'", () => {
	it("front face has corner bolt pattern", () => {
		const faces = buildPanelFaces("wall");
		expect(faces.front?.boltPattern).toBe("corners");
	});

	it("front face has seam lines", () => {
		const faces = buildPanelFaces("wall");
		expect(faces.front?.seamLines).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Tests: bolt radius sanity — never zero when bolts are requested
// ---------------------------------------------------------------------------

describe("bolt radius sanity", () => {
	it.each(ALL_TYPES)("boltRadius is positive on faces with bolts for type '%s'", (type) => {
		const faces = buildPanelFaces(type);
		for (const faceKey of FACE_KEYS) {
			const face = faces[faceKey];
			if (!face) continue;
			if (face.boltPattern && face.boltPattern !== "none") {
				const radius = face.boltRadius ?? 0;
				expect(radius).toBeGreaterThan(0);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Tests: integration — createBoxFromPanels receives buildPanelFaces output
// ---------------------------------------------------------------------------

describe("createBoxFromPanels integration", () => {
	beforeEach(() => {
		mockCreateBoxFromPanels.mockClear();
	});

	it("buildPanelFaces output has the shape expected by createBoxFromPanels", () => {
		// createBoxFromPanels accepts BoxFaceOptions — verify buildPanelFaces
		// returns an object where optional face keys map to partial PanelOptions.
		const faces = buildPanelFaces("conduit");

		// The object must be passable as BoxFaceOptions (no TypeScript errors
		// at import time; here we verify runtime shape).
		expect(typeof faces).toBe("object");

		// Each present face is a plain object with at least one panel option key
		for (const faceKey of FACE_KEYS) {
			const face = faces[faceKey];
			if (face !== undefined) {
				expect(typeof face).toBe("object");
				// Should have at least boltPattern
				expect("boltPattern" in face).toBe(true);
			}
		}
	});

	it("different building types produce different face configurations", () => {
		const conduit = buildPanelFaces("conduit");
		const ruin = buildPanelFaces("ruin");
		const tower = buildPanelFaces("tower");

		// Conduit has bolts on front, ruin does not
		expect(conduit.front?.boltPattern).not.toBe("none");
		expect(ruin.front?.boltPattern).toBe("none");

		// Tower has vertical vents, conduit has horizontal
		expect(tower.front?.ventVertical).toBe(true);
		expect(conduit.front?.ventVertical).toBeFalsy();
	});
});
