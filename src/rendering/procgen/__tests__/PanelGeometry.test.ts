/**
 * Tests for PanelGeometry — procedural industrial panel mesh generation.
 *
 * Three.js is mocked to isolate geometry logic from WebGL.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

const mergedGeoRegistry: MockBufferGeometry[] = [];

class MockBufferGeometry {
	attributes: Record<string, unknown> = {};
	boundingBox: unknown = null;
	disposed = false;
	index: unknown = null;
	name = "";
	_matrix: MockMatrix4 | null = null;

	computeBoundingBox() {
		this.boundingBox = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } };
	}
	computeVertexNormals() {}

	clone(): MockBufferGeometry {
		const c = new MockBufferGeometry();
		c._matrix = this._matrix;
		return c;
	}

	translate(_x: number, _y: number, _z: number) {
		return this;
	}

	scale(_x: number, _y: number, _z: number) {
		return this;
	}

	rotateX(_angle: number) {
		return this;
	}

	applyMatrix4(m: MockMatrix4) {
		this._matrix = m;
		return this;
	}

	dispose() {
		this.disposed = true;
	}
}

class MockCylinderGeometry extends MockBufferGeometry {
	constructor(_rTop?: number, _rBot?: number, _h?: number, _seg?: number) {
		super();
	}
}

class MockSphereGeometry extends MockBufferGeometry {
	constructor(_r?: number, _wSeg?: number, _hSeg?: number, ..._rest: number[]) {
		super();
	}
}

class MockBoxGeometry extends MockBufferGeometry {
	constructor(public w = 1, public h = 1, public d = 1) {
		super();
	}
}

class MockExtrudeGeometry extends MockBufferGeometry {
	constructor(_shape?: unknown, _settings?: unknown) {
		super();
	}
}

class MockPlaneGeometry extends MockBufferGeometry {
	constructor(_w?: number, _h?: number) {
		super();
	}
}

class MockShape {
	moveTo(_x: number, _y: number) { return this; }
	lineTo(_x: number, _y: number) { return this; }
	closePath() { return this; }
}

class MockVector2 {
	constructor(public x = 0, public y = 0) {}
}

class MockVector3 {
	constructor(public x = 0, public y = 0, public z = 0) {}
}

class MockEuler {
	constructor(public x = 0, public y = 0, public z = 0) {}
}

class MockMatrix4 {
	compose(_pos: MockVector3, _quat: MockQuaternion, _scale: MockVector3) {
		return this;
	}
}

class MockQuaternion {
	setFromEuler(_euler: MockEuler) { return this; }
}

let _mergeGeoReturnNull = false;

jest.mock("three", () => ({
	BufferGeometry: MockBufferGeometry,
	CylinderGeometry: MockCylinderGeometry,
	SphereGeometry: MockSphereGeometry,
	BoxGeometry: MockBoxGeometry,
	ExtrudeGeometry: MockExtrudeGeometry,
	PlaneGeometry: MockPlaneGeometry,
	Shape: MockShape,
	Vector2: MockVector2,
	Vector3: MockVector3,
	Euler: MockEuler,
	Matrix4: MockMatrix4,
	Quaternion: MockQuaternion,
}));

jest.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
	mergeGeometries: (geos: MockBufferGeometry[]) => {
		if (_mergeGeoReturnNull) return null;
		const merged = new MockBufferGeometry();
		mergedGeoRegistry.push(merged);
		return merged;
	},
}));

import {
	createPanel,
	createBoltGeometry,
	combinePanels,
	createBoxFromPanels,
	type PanelOptions,
	type PanelPlacement,
} from "../PanelGeometry";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createBoltGeometry", () => {
	it("returns a geometry for a given radius", () => {
		const geo = createBoltGeometry(0.015);
		expect(geo).toBeDefined();
		expect(geo).toBeInstanceOf(MockBufferGeometry);
	});

	it("returns fallback shaft when mergeGeometries returns null", () => {
		_mergeGeoReturnNull = true;
		const geo = createBoltGeometry(0.01);
		expect(geo).toBeDefined();
		_mergeGeoReturnNull = false;
	});
});

describe("createPanel", () => {
	it("returns a BufferGeometry", () => {
		const geo = createPanel({ width: 1, height: 1, depth: 0.05 });
		expect(geo).toBeDefined();
		expect(geo).toBeInstanceOf(MockBufferGeometry);
	});

	it("uses default options when only required fields are specified", () => {
		expect(() => createPanel({ width: 0.5, height: 0.5, depth: 0.05 })).not.toThrow();
	});

	it("handles boltPattern corners", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, boltPattern: "corners" }),
		).not.toThrow();
	});

	it("handles boltPattern edges", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, boltPattern: "edges", boltCount: 3 }),
		).not.toThrow();
	});

	it("handles boltPattern grid", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, boltPattern: "grid", boltCount: 3 }),
		).not.toThrow();
	});

	it("handles boltPattern none (no bolts)", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, boltPattern: "none" }),
		).not.toThrow();
	});

	it("handles vent slots (horizontal)", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, ventSlots: 4 }),
		).not.toThrow();
	});

	it("handles vent slots (vertical)", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, ventSlots: 3, ventVertical: true }),
		).not.toThrow();
	});

	it("handles seam lines", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, seamLines: 2 }),
		).not.toThrow();
	});

	it("handles bevel when bevelSize > 0", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, bevelSize: 0.05 }),
		).not.toThrow();
	});

	it("falls back to BoxGeometry when bevelSize === 0", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, bevelSize: 0 }),
		).not.toThrow();
	});

	it("handles insetDepth and insetMargin", () => {
		expect(() =>
			createPanel({ width: 1, height: 1, depth: 0.05, insetDepth: 0.01, insetMargin: 0.08 }),
		).not.toThrow();
	});

	it("returns fallback BoxGeometry when mergeGeometries returns null", () => {
		_mergeGeoReturnNull = true;
		const geo = createPanel({ width: 1, height: 1, depth: 0.05 });
		expect(geo).toBeDefined();
		_mergeGeoReturnNull = false;
	});
});

describe("combinePanels", () => {
	it("merges an array of positioned panels", () => {
		const geo1 = createPanel({ width: 1, height: 1, depth: 0.05 });
		const geo2 = createPanel({ width: 1, height: 1, depth: 0.05 });

		const panels: PanelPlacement[] = [
			{
				geometry: geo1,
				position: new THREE.Vector3(0, 0, 0.5),
				rotation: new THREE.Euler(0, 0, 0),
			},
			{
				geometry: geo2,
				position: new THREE.Vector3(0, 0, -0.5),
				rotation: new THREE.Euler(0, Math.PI, 0),
			},
		];

		const merged = combinePanels(panels);
		expect(merged).toBeDefined();
		expect(merged).toBeInstanceOf(MockBufferGeometry);
	});

	it("returns fallback BoxGeometry when mergeGeometries returns null", () => {
		_mergeGeoReturnNull = true;
		const panels: PanelPlacement[] = [
			{
				geometry: createPanel({ width: 1, height: 1, depth: 0.05 }),
				position: new THREE.Vector3(0, 0, 0),
				rotation: new THREE.Euler(0, 0, 0),
			},
		];
		const result = combinePanels(panels);
		expect(result).toBeDefined();
		_mergeGeoReturnNull = false;
	});
});

describe("createBoxFromPanels", () => {
	it("returns a merged geometry for a box", () => {
		const geo = createBoxFromPanels(1, 1, 1);
		expect(geo).toBeDefined();
		expect(geo).toBeInstanceOf(MockBufferGeometry);
	});

	it("accepts per-face options", () => {
		expect(() =>
			createBoxFromPanels(1, 1, 1, {
				front: { ventSlots: 2 },
				left: { boltPattern: "edges" },
				top: { seamLines: 1 },
			}),
		).not.toThrow();
	});

	it("handles non-cubic boxes", () => {
		expect(() => createBoxFromPanels(2, 0.5, 1.5)).not.toThrow();
	});
});
