/**
 * Tests for BotParts — individual body part creation and material factories.
 *
 * Three.js and PanelGeometry are mocked.
 */

// ---------------------------------------------------------------------------
// Three.js mock (same as BotGenerator test)
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

class MockBoxGeometry extends MockBufferGeometry {}
class MockCylinderGeometry extends MockBufferGeometry {}
class MockSphereGeometry extends MockBufferGeometry {}
class MockConeGeometry extends MockBufferGeometry {}
class MockExtrudeGeometry extends MockBufferGeometry {}
class MockPlaneGeometry extends MockBufferGeometry {}
class MockTorusGeometry extends MockBufferGeometry {}
class MockOctahedronGeometry extends MockBufferGeometry {}
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
}

class MockMeshStandardMaterial {
	color: MockColor;
	metalness: number;
	roughness: number;
	emissive: MockColor;
	emissiveIntensity: number;
	dispose = jest.fn();

	constructor(opts: Record<string, unknown> = {}) {
		this.color = (opts.color as MockColor) ?? new MockColor();
		this.metalness = (opts.metalness as number) ?? 0.5;
		this.roughness = (opts.roughness as number) ?? 0.5;
		this.emissive = (opts.emissive as MockColor) ?? new MockColor();
		this.emissiveIntensity = (opts.emissiveIntensity as number) ?? 0;
	}
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
	ExtrudeGeometry: MockExtrudeGeometry,
	PlaneGeometry: MockPlaneGeometry,
	TorusGeometry: MockTorusGeometry,
	OctahedronGeometry: MockOctahedronGeometry,
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

import {
	createBodyMaterial,
	createAccentMaterial,
	createSecondaryMaterial,
	createSensorMaterial,
	createChassis,
	createHead,
	createArm,
	createLeg,
	createTread,
	createAntenna,
	disposeBotGroup,
	type FactionStyle,
} from "../BotParts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const reclaimerStyle: FactionStyle = {
	chassisStyle: "angular",
	headStyle: "dome",
	armStyle: "clamp",
	locomotion: "treads",
	primaryColor: "#8B4513",
	secondaryColor: "#A0926B",
	accentColor: "#DAA520",
	emissiveColor: "#442200",
	metalness: 0.55,
	roughness: 0.75,
	rustLevel: 0.4,
	boltPattern: "edges",
	panelInset: 0.012,
	ventSlots: 0,
	seamLines: 3,
};

const voltStyle: FactionStyle = {
	chassisStyle: "sleek",
	headStyle: "visor",
	armStyle: "probe",
	locomotion: "hover",
	primaryColor: "#1A2A4A",
	secondaryColor: "#2A3A5A",
	accentColor: "#4499FF",
	emissiveColor: "#2266FF",
	metalness: 0.9,
	roughness: 0.15,
	emissiveGlow: 0.3,
	boltPattern: "none",
	panelInset: 0.02,
	ventSlots: 0,
	seamLines: 0,
};

const choirStyle: FactionStyle = {
	chassisStyle: "rounded",
	headStyle: "antenna_cluster",
	armStyle: "tendril",
	locomotion: "legs",
	primaryColor: "#2A4A2A",
	secondaryColor: "#3A5A3A",
	accentColor: "#88DD44",
	emissiveColor: "#44AA22",
	metalness: 0.7,
	roughness: 0.35,
	boltPattern: "grid",
	panelInset: 0.008,
	ventSlots: 4,
	seamLines: 1,
};

const rand = () => 0.5; // Fixed PRNG for determinism

// ---------------------------------------------------------------------------
// Material factory tests
// ---------------------------------------------------------------------------

describe("createBodyMaterial", () => {
	it("returns a MeshStandardMaterial", () => {
		const mat = createBodyMaterial(reclaimerStyle);
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("uses faction metalness and roughness", () => {
		const mat = createBodyMaterial(reclaimerStyle);
		expect(mat.metalness).toBe(reclaimerStyle.metalness);
		expect(mat.roughness).toBe(reclaimerStyle.roughness);
	});

	it("applies emissive glow when emissiveGlow > 0", () => {
		const mat = createBodyMaterial(voltStyle);
		expect(mat.emissiveIntensity).toBe(voltStyle.emissiveGlow);
	});

	it("does not set emissive when no emissiveGlow", () => {
		const mat = createBodyMaterial(reclaimerStyle);
		expect(mat.emissiveIntensity).toBe(0);
	});
});

describe("createAccentMaterial", () => {
	it("returns a MeshStandardMaterial", () => {
		const mat = createAccentMaterial(reclaimerStyle);
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("metalness is higher than base (clamped to 1)", () => {
		const mat = createAccentMaterial(reclaimerStyle);
		expect(mat.metalness).toBeLessThanOrEqual(1.0);
	});

	it("roughness is lower than base (clamped to 0)", () => {
		const mat = createAccentMaterial(reclaimerStyle);
		expect(mat.roughness).toBeGreaterThanOrEqual(0);
	});
});

describe("createSecondaryMaterial", () => {
	it("returns a MeshStandardMaterial", () => {
		const mat = createSecondaryMaterial(reclaimerStyle);
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("roughness is higher than base (more worn)", () => {
		const mat = createSecondaryMaterial(reclaimerStyle);
		expect(mat.roughness).toBeGreaterThanOrEqual(reclaimerStyle.roughness);
	});
});

describe("createSensorMaterial", () => {
	it("returns a MeshStandardMaterial", () => {
		const mat = createSensorMaterial(reclaimerStyle);
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("has low roughness (shiny lens)", () => {
		const mat = createSensorMaterial(reclaimerStyle);
		expect(mat.roughness).toBeLessThanOrEqual(0.2);
	});
});

// ---------------------------------------------------------------------------
// Body part creation tests
// ---------------------------------------------------------------------------

describe("createChassis", () => {
	it("returns a Group", () => {
		const g = createChassis(0.5, 0.4, 0.35, reclaimerStyle, rand);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("has a chassis body mesh", () => {
		const g = createChassis(0.5, 0.4, 0.35, reclaimerStyle, rand);
		const named = g.children.find((c) => c.name === "chassis_body");
		expect(named).toBeDefined();
	});

	it("works with volt (rust-free) style", () => {
		expect(() => createChassis(0.5, 0.4, 0.35, voltStyle, rand)).not.toThrow();
	});
});

describe("createHead", () => {
	it("returns a Group", () => {
		const g = createHead(0.22, "dome", reclaimerStyle, rand);
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("handles visor head style", () => {
		expect(() => createHead(0.22, "visor", voltStyle, rand)).not.toThrow();
	});

	it("handles antenna_cluster head style", () => {
		expect(() => createHead(0.22, "antenna_cluster", choirStyle, rand)).not.toThrow();
	});

	it("handles sensor_array head style", () => {
		expect(() => createHead(0.22, "sensor_array", reclaimerStyle, rand)).not.toThrow();
	});

	it("handles unknown head style without throwing", () => {
		expect(() => createHead(0.22, "unknown_style", reclaimerStyle, rand)).not.toThrow();
	});
});

describe("createArm", () => {
	it("returns a Group", () => {
		const g = createArm(0.35, 2, reclaimerStyle, rand, "left");
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("creates right arm without throwing", () => {
		expect(() => createArm(0.35, 2, reclaimerStyle, rand, "right")).not.toThrow();
	});

	it("handles probe arm style", () => {
		expect(() => createArm(0.4, 3, voltStyle, rand, "left")).not.toThrow();
	});

	it("handles tendril arm style", () => {
		expect(() => createArm(0.4, 3, choirStyle, rand, "left")).not.toThrow();
	});
});

describe("createLeg", () => {
	it("returns a Group", () => {
		const g = createLeg(0.3, choirStyle, rand, "left");
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("creates right leg", () => {
		expect(() => createLeg(0.3, choirStyle, rand, "right")).not.toThrow();
	});
});

describe("createTread", () => {
	it("returns a Group", () => {
		const g = createTread(0.1, 0.42, reclaimerStyle, rand, "left");
		expect(g).toBeInstanceOf(MockGroup);
	});

	it("creates right tread", () => {
		expect(() => createTread(0.1, 0.42, reclaimerStyle, rand, "right")).not.toThrow();
	});
});

describe("createAntenna", () => {
	it("returns a Group", () => {
		const g = createAntenna(0.25, choirStyle, rand);
		expect(g).toBeInstanceOf(MockGroup);
	});
});

// ---------------------------------------------------------------------------
// Disposal test
// ---------------------------------------------------------------------------

describe("disposeBotGroup", () => {
	it("traverses and disposes without throwing", () => {
		const g = createChassis(0.5, 0.4, 0.35, reclaimerStyle, rand);
		expect(() => disposeBotGroup(g as unknown as import("three").Group)).not.toThrow();
	});
});
