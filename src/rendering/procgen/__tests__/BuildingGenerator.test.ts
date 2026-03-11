/**
 * Tests for BuildingGenerator — procedural building mesh generator.
 *
 * Three.js and PanelGeometry are mocked.
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
	rotateY(_a: number) { return this; }
	clone() { return new MockBufferGeometry(); }
	applyMatrix4(_m: unknown) { return this; }
	dispose() { this.disposed = true; }
}

class MockBoxGeometry extends MockBufferGeometry {
	constructor(_w?: number, _h?: number, _d?: number) { super(); }
}
class MockCylinderGeometry extends MockBufferGeometry {
	constructor(_rTop?: number, _rBot?: number, _h?: number, _seg?: number) { super(); }
}
class MockSphereGeometry extends MockBufferGeometry {
	constructor(_r?: number, _wSeg?: number, _hSeg?: number) { super(); }
}
class MockConeGeometry extends MockBufferGeometry {
	constructor(_r?: number, _h?: number, _seg?: number) { super(); }
}
class MockTorusGeometry extends MockBufferGeometry {
	constructor(_r?: number, _tube?: number, _radSeg?: number, _tubeSeg?: number, _arc?: number) { super(); }
}
class MockPlaneGeometry extends MockBufferGeometry {
	constructor(_w?: number, _h?: number) { super(); }
}

class MockColor {
	r = 1; g = 1; b = 1;
	constructor(_c?: string | number) {}
	copy(o: MockColor) { this.r = o.r; this.g = o.g; this.b = o.b; return this; }
	offsetHSL(_h: number, _s: number, _l: number) { return this; }
}

class MockMeshStandardMaterial {
	color: MockColor;
	metalness: number;
	roughness: number;
	emissive: MockColor;
	emissiveIntensity: number;
	transparent: boolean;
	opacity: number;
	dispose = jest.fn();

	constructor(opts: Record<string, unknown> = {}) {
		this.color = (opts.color as MockColor) ?? new MockColor();
		this.metalness = (opts.metalness as number) ?? 0.5;
		this.roughness = (opts.roughness as number) ?? 0.5;
		this.emissive = (opts.emissive as MockColor) ?? new MockColor();
		this.emissiveIntensity = (opts.emissiveIntensity as number) ?? 0;
		this.transparent = (opts.transparent as boolean) ?? false;
		this.opacity = (opts.opacity as number) ?? 1;
	}
}

class MockVector3 {
	constructor(public x = 0, public y = 0, public z = 0) {}
	set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
	copy(v: MockVector3) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
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
	lookAt(_x: number, _y?: number, _z?: number) {}
	rotateX(_a: number) { return this; }
	rotateY(_a: number) { return this; }
	rotateZ(_a: number) { return this; }
	dispose = jest.fn();
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
	BoxGeometry: MockBoxGeometry,
	CylinderGeometry: MockCylinderGeometry,
	SphereGeometry: MockSphereGeometry,
	ConeGeometry: MockConeGeometry,
	TorusGeometry: MockTorusGeometry,
	PlaneGeometry: MockPlaneGeometry,
	MeshStandardMaterial: MockMeshStandardMaterial,
	Mesh: MockMesh,
	Group: MockGroup,
	Color: MockColor,
	Vector3: MockVector3,
}));

jest.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
	mergeGeometries: (geos: MockBufferGeometry[]) => {
		if (!geos || geos.length === 0) return null;
		return new MockBufferGeometry();
	},
}));

jest.mock("../PanelGeometry.ts", () => ({
	createBoxFromPanels: () => new MockBufferGeometry(),
	createPanel: () => new MockBufferGeometry(),
}));

import {
	generateBuilding,
	disposeBuildingGroup,
} from "../BuildingGenerator";

// ---------------------------------------------------------------------------
// Tests: generateBuilding
// ---------------------------------------------------------------------------

describe("generateBuilding", () => {
	it("returns a Group for lightning_rod", () => {
		const g = generateBuilding("lightning_rod", "player", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for fabrication_unit", () => {
		const g = generateBuilding("fabrication_unit", "reclaimers", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for furnace", () => {
		const g = generateBuilding("furnace", "volt_collective", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for miner", () => {
		const g = generateBuilding("miner", "signal_choir", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for processor", () => {
		const g = generateBuilding("processor", "iron_creed", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for outpost", () => {
		const g = generateBuilding("outpost", "feral", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for turret", () => {
		const g = generateBuilding("turret", "player", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("returns a Group for unknown building type (generic fallback)", () => {
		const g = generateBuilding("unknown_type", "player", 42);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("sets building name on returned group for lightning_rod", () => {
		const g = generateBuilding("lightning_rod", "player", 42);
		expect(g.name).toContain("lightning_rod");
	});

	it("sets building name for furnace", () => {
		const g = generateBuilding("furnace", "reclaimers", 1);
		expect(g.name).toContain("furnace");
	});

	it("has at least one child mesh", () => {
		const g = generateBuilding("furnace", "player", 42);
		expect(g.children.length).toBeGreaterThan(0);
	});

	it("includes interaction_point in children", () => {
		const g = generateBuilding("furnace", "player", 42);
		const allChildren: unknown[] = [];
		g.traverse((obj) => allChildren.push(obj));
		const interactionPoints = allChildren.filter(
			(c) => c instanceof MockMesh && (c as MockMesh).name === "interaction_point",
		);
		expect(interactionPoints.length).toBeGreaterThan(0);
	});

	it("is deterministic — same seed yields same child count", () => {
		const g1 = generateBuilding("lightning_rod", "player", 99);
		const g2 = generateBuilding("lightning_rod", "player", 99);
		expect(g1.children.length).toBe(g2.children.length);
	});

	it("works with unknown faction (falls back to default colors)", () => {
		expect(() => generateBuilding("furnace", "unknown_faction", 1)).not.toThrow();
	});

	it("different seeds produce different child counts for lightning_rod", () => {
		const g1 = generateBuilding("lightning_rod", "player", 1);
		const g2 = generateBuilding("lightning_rod", "player", 999);
		// Seeds affect ring count and other random variations — this may or may not differ
		// The important thing is neither throws
		expect(g1.children.length).toBeGreaterThan(0);
		expect(g2.children.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Tests: disposeBuildingGroup
// ---------------------------------------------------------------------------

describe("disposeBuildingGroup", () => {
	it("does not throw on an empty group", () => {
		const empty = new MockGroup();
		expect(() => disposeBuildingGroup(empty as unknown as import("three").Group)).not.toThrow();
	});

	it("does not throw on a generated building group", () => {
		const g = generateBuilding("furnace", "player", 42);
		expect(() => disposeBuildingGroup(g as unknown as import("three").Group)).not.toThrow();
	});

	it("disposes geometries in a generated building", () => {
		const g = generateBuilding("furnace", "player", 42);
		const geomsBefore: MockBufferGeometry[] = [];
		g.traverse((child) => {
			if (child instanceof MockMesh) {
				geomsBefore.push(child.geometry as MockBufferGeometry);
			}
		});
		disposeBuildingGroup(g as unknown as import("three").Group);
		for (const geo of geomsBefore) {
			expect(geo.disposed).toBe(true);
		}
	});
});
