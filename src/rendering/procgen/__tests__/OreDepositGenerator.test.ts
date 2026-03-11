/**
 * Tests for OreDepositGenerator — depletion scale logic and generator API.
 *
 * Three.js is mocked. The geometry attribute API is stubbed to support
 * vertex displacement logic.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockAttribute {
	private data: Float32Array;
	needsUpdate = false;
	count: number;

	constructor(count = 12) {
		this.count = count;
		this.data = new Float32Array(count * 3).fill(0.5);
	}
	getX(i: number) { return this.data[i * 3]; }
	getY(i: number) { return this.data[i * 3 + 1]; }
	getZ(i: number) { return this.data[i * 3 + 2]; }
	setX(i: number, v: number) { this.data[i * 3] = v; }
	setY(i: number, v: number) { this.data[i * 3 + 1] = v; }
	setZ(i: number, v: number) { this.data[i * 3 + 2] = v; }
}

class MockBufferGeometry {
	private attrs: Record<string, MockAttribute> = {
		position: new MockAttribute(12),
		normal: new MockAttribute(12),
	};
	disposed = false;

	getAttribute(name: string) { return this.attrs[name]; }
	computeVertexNormals() {}
	computeBoundingBox() {}
	translate(_x: number, _y: number, _z: number) { return this; }
	scale(_x: number, _y: number, _z: number) { return this; }
	rotateX(_a: number) { return this; }
	rotateY(_a: number) { return this; }
	clone() { return new MockBufferGeometry(); }
	applyMatrix4(_m: unknown) { return this; }
	dispose() { this.disposed = true; }
}

class MockSphereGeometry extends MockBufferGeometry {
	constructor(_r?: number, _wSeg?: number, _hSeg?: number) { super(); }
}

class MockBoxGeometry extends MockBufferGeometry {
	constructor(_w?: number, _h?: number, _d?: number) { super(); }
}

class MockCylinderGeometry extends MockBufferGeometry {
	constructor(_rTop?: number, _rBot?: number, _h?: number, _seg?: number) { super(); }
}

class MockOctahedronGeometry extends MockBufferGeometry {
	constructor(_r?: number, _detail?: number) { super(); }
}

class MockExtrudeGeometry extends MockBufferGeometry {
	constructor(_shape?: unknown, _opts?: unknown) { super(); }
}

class MockPlaneGeometry extends MockBufferGeometry {}
class MockCircleGeometry extends MockBufferGeometry {
	constructor(_r?: number, _seg?: number) { super(); }
}
class MockDodecahedronGeometry extends MockBufferGeometry {
	constructor(_r?: number, _detail?: number) { super(); }
}
class MockIcosahedronGeometry extends MockBufferGeometry {
	constructor(_r?: number, _detail?: number) { super(); }
}
class MockTorusGeometry extends MockBufferGeometry {
	constructor(_r?: number, _tube?: number, _radSeg?: number, _tubeSeg?: number) { super(); }
}
class MockConeGeometry extends MockBufferGeometry {
	constructor(_r?: number, _h?: number, _seg?: number) { super(); }
}
class MockTetrahedronGeometry extends MockBufferGeometry {
	constructor(_r?: number, _detail?: number) { super(); }
}

class MockShape {
	moveTo(_x: number, _y: number) { return this; }
	lineTo(_x: number, _y: number) { return this; }
	closePath() { return this; }
}

class MockColor {
	r = 1; g = 1; b = 1;
	constructor(_c?: string | number) {}
	copy(o: MockColor) { this.r = o.r; this.g = o.g; this.b = o.b; return this; }
	offsetHSL(_h: number, _s: number, _l: number) { return this; }
	lerp(_other: MockColor, _t: number) { return this; }
}

class MockMeshStandardMaterial {
	color = new MockColor();
	metalness = 0.5;
	roughness = 0.5;
	emissive = new MockColor();
	emissiveIntensity = 0;
	dispose = jest.fn();
	constructor(_opts: Record<string, unknown> = {}) {}
}

class MockVector2 {
	constructor(public x = 0, public y = 0) {}
}

class MockVector3 {
	constructor(public x = 0, public y = 0, public z = 0) {}
	set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
}

class MockEuler {
	constructor(public x = 0, public y = 0, public z = 0) {}
}

class MockMatrix4 {
	compose(_p: unknown, _q: unknown, _s: unknown) { return this; }
	decompose(_p: unknown, _q: unknown, _s: unknown) { return this; }
}

class MockQuaternion {
	setFromEuler(_e: unknown) { return this; }
}

class MockRotation {
	x = 0; y = 0; z = 0;
	set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
}

class MockMesh {
	name = "";
	material: MockMeshStandardMaterial;
	geometry: MockBufferGeometry;
	position = new MockVector3();
	rotation = new MockRotation();
	dispose = jest.fn();
	lookAt(_x: number, _y?: number, _z?: number) {}
	rotateX(_a: number) { return this; }
	rotateY(_a: number) { return this; }
	rotateZ(_a: number) { return this; }
	constructor(geo?: MockBufferGeometry, mat?: MockMeshStandardMaterial) {
		this.geometry = geo ?? new MockBufferGeometry();
		this.material = mat ?? new MockMeshStandardMaterial();
	}
}

class MockScaleVector extends MockVector3 {
	setScalar(v: number) { this.x = v; this.y = v; this.z = v; return this; }
}

class MockGroup {
	name = "";
	children: (MockMesh | MockGroup)[] = [];
	position = new MockVector3();
	rotation = new MockRotation();
	scale = new MockScaleVector(1, 1, 1);
	add(child: MockMesh | MockGroup) { this.children.push(child); return this; }
	remove(child: MockMesh | MockGroup) {
		const i = this.children.indexOf(child);
		if (i >= 0) this.children.splice(i, 1);
		return this;
	}
	traverse(fn: (obj: unknown) => void) {
		fn(this);
		for (const child of this.children) {
			if (child instanceof MockGroup) child.traverse(fn);
			else fn(child);
		}
	}
}

jest.mock("three", () => ({
	BufferGeometry: MockBufferGeometry,
	SphereGeometry: MockSphereGeometry,
	BoxGeometry: MockBoxGeometry,
	CylinderGeometry: MockCylinderGeometry,
	OctahedronGeometry: MockOctahedronGeometry,
	DodecahedronGeometry: MockDodecahedronGeometry,
	IcosahedronGeometry: MockIcosahedronGeometry,
	ExtrudeGeometry: MockExtrudeGeometry,
	PlaneGeometry: MockPlaneGeometry,
	CircleGeometry: MockCircleGeometry,
	TorusGeometry: MockTorusGeometry,
	ConeGeometry: MockConeGeometry,
	TetrahedronGeometry: MockTetrahedronGeometry,
	Shape: MockShape,
	MeshStandardMaterial: MockMeshStandardMaterial,
	Mesh: MockMesh,
	Group: MockGroup,
	Color: MockColor,
	Vector2: MockVector2,
	Vector3: MockVector3,
	Euler: MockEuler,
	Matrix4: MockMatrix4,
	Quaternion: MockQuaternion,
}));

jest.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
	mergeGeometries: (geos: MockBufferGeometry[]) => {
		if (!geos || geos.length === 0) return null;
		return new MockBufferGeometry();
	},
}));

// Also mock the PanelGeometry import within OreDepositGenerator
jest.mock("../PanelGeometry.ts", () => ({
	createBoxFromPanels: () => new MockBufferGeometry(),
	createPanel: () => new MockBufferGeometry(),
}));

import {
	generateOreDeposit,
	getDepletionScale,
	disposeDepositGroup,
	type DepositSize,
} from "../OreDepositGenerator";

// ---------------------------------------------------------------------------
// Tests: getDepletionScale (pure function)
// ---------------------------------------------------------------------------

describe("getDepletionScale", () => {
	it("returns 1.0 when remaining === max", () => {
		expect(getDepletionScale(100, 100)).toBe(1.0);
	});

	it("returns 0.15 when remaining is 0", () => {
		expect(getDepletionScale(0, 100)).toBe(0.15);
	});

	it("returns 0.15 when max is 0 (guard against division by zero)", () => {
		expect(getDepletionScale(0, 0)).toBe(0.15);
	});

	it("returns intermediate value for partial depletion", () => {
		const scale = getDepletionScale(50, 100);
		expect(scale).toBeGreaterThan(0.15);
		expect(scale).toBeLessThan(1.0);
	});

	it("clamps above 1 when remaining > max", () => {
		// Should not exceed 1.0
		expect(getDepletionScale(150, 100)).toBe(1.0);
	});

	it("clamps below 0 when remaining is negative", () => {
		// Should not go below 0.15
		expect(getDepletionScale(-10, 100)).toBe(0.15);
	});

	it("is monotonically increasing with remaining", () => {
		const s25 = getDepletionScale(25, 100);
		const s50 = getDepletionScale(50, 100);
		const s75 = getDepletionScale(75, 100);
		expect(s25).toBeLessThan(s50);
		expect(s50).toBeLessThan(s75);
	});
});

// ---------------------------------------------------------------------------
// Tests: generateOreDeposit
// ---------------------------------------------------------------------------

describe("generateOreDeposit", () => {
	it("returns a Group for rock", () => {
		const deposit = generateOreDeposit("rock", 42, "medium");
		expect(deposit).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for scrap_iron", () => {
		const deposit = generateOreDeposit("scrap_iron", 42, "medium");
		expect(deposit).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for copper", () => {
		const deposit = generateOreDeposit("copper", 42, "small");
		expect(deposit).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for silicon", () => {
		const deposit = generateOreDeposit("silicon", 1, "large");
		expect(deposit).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for titanium", () => {
		const deposit = generateOreDeposit("titanium", 99, "medium");
		expect(deposit).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for unknown ore type (fallback to rock)", () => {
		const deposit = generateOreDeposit("quantum_crystal", 1, "small");
		expect(deposit).toBeInstanceOf(MockGroup);
	});

	it("handles all size variants", () => {
		const sizes: DepositSize[] = ["small", "medium", "large"];
		for (const size of sizes) {
			expect(() => generateOreDeposit("rock", 1, size)).not.toThrow();
		}
	});

	it("is deterministic — same seed yields same child count", () => {
		const d1 = generateOreDeposit("rock", 42, "medium");
		const d2 = generateOreDeposit("rock", 42, "medium");
		expect(d1.children.length).toBe(d2.children.length);
	});

	it("has at least one child", () => {
		const deposit = generateOreDeposit("copper", 7, "large");
		expect(deposit.children.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Tests: disposeDepositGroup
// ---------------------------------------------------------------------------

describe("disposeDepositGroup", () => {
	it("does not throw on an empty group", () => {
		const empty = new MockGroup();
		expect(() => disposeDepositGroup(empty as unknown as import("three").Group)).not.toThrow();
	});

	it("does not throw on a generated deposit group", () => {
		const deposit = generateOreDeposit("rock", 42, "small");
		expect(() => disposeDepositGroup(deposit as unknown as import("three").Group)).not.toThrow();
	});
});
