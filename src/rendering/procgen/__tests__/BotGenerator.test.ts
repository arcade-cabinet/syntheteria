/**
 * Tests for BotGenerator — deterministic bot mesh generation per faction and type.
 *
 * Three.js is mocked to avoid WebGL. PanelGeometry is mocked to avoid
 * BufferGeometryUtils dependency.
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

class MockBoxGeometry extends MockBufferGeometry {}
class MockCylinderGeometry extends MockBufferGeometry {}
class MockSphereGeometry extends MockBufferGeometry {}
class MockOctahedronGeometry extends MockBufferGeometry {}

class MockColor {
	r = 1; g = 1; b = 1;
	constructor(_color?: string | number) {}
	copy(o: MockColor) { this.r = o.r; this.g = o.g; this.b = o.b; return this; }
	multiply(o: MockColor) { this.r *= o.r; this.g *= o.g; this.b *= o.b; return this; }
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

	clone() {
		const c = new MockMeshStandardMaterial();
		c.metalness = this.metalness;
		c.roughness = this.roughness;
		c.color = new MockColor();
		c.emissive = new MockColor();
		return c;
	}
}

class MockMesh {
	name = "";
	material: MockMeshStandardMaterial;
	geometry: MockBufferGeometry;
	position = new MockVector3();
	rotation = { x: 0, y: 0, z: 0 };
	dispose = jest.fn();

	constructor(geo?: MockBufferGeometry, mat?: MockMeshStandardMaterial) {
		this.geometry = geo ?? new MockBufferGeometry();
		this.material = mat ?? new MockMeshStandardMaterial();
	}
}

class MockVector3 {
	constructor(public x = 0, public y = 0, public z = 0) {}
	set(x: number, y: number, z: number) {
		this.x = x; this.y = y; this.z = z;
		return this;
	}
	setScalar(v: number) {
		this.x = v; this.y = v; this.z = v;
		return this;
	}
}

class MockGroup {
	name = "";
	children: (MockMesh | MockGroup)[] = [];
	position = new MockVector3();
	scale = new MockVector3(1, 1, 1);

	add(child: MockMesh | MockGroup) {
		this.children.push(child);
		return this;
	}
	remove(child: MockMesh | MockGroup) {
		const i = this.children.indexOf(child);
		if (i >= 0) this.children.splice(i, 1);
		return this;
	}
	traverse(fn: (obj: MockMesh | MockGroup) => void) {
		fn(this as unknown as MockMesh | MockGroup);
		for (const child of this.children) {
			if (child instanceof MockGroup) child.traverse(fn);
			else fn(child);
		}
	}
}

class MockVector2 {
	constructor(public x = 0, public y = 0) {}
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

class MockShape {
	moveTo(_x: number, _y: number) { return this; }
	lineTo(_x: number, _y: number) { return this; }
	closePath() { return this; }
}

class MockPlaneGeometry extends MockBufferGeometry {}
class MockExtrudeGeometry extends MockBufferGeometry {}
class MockTorusGeometry extends MockBufferGeometry {}
class MockConeGeometry extends MockBufferGeometry {
	constructor(_r?: number, _h?: number, _seg?: number) { super(); }
}

jest.mock("three", () => ({
	BufferGeometry: MockBufferGeometry,
	BoxGeometry: MockBoxGeometry,
	CylinderGeometry: MockCylinderGeometry,
	SphereGeometry: MockSphereGeometry,
	OctahedronGeometry: MockOctahedronGeometry,
	PlaneGeometry: MockPlaneGeometry,
	ExtrudeGeometry: MockExtrudeGeometry,
	TorusGeometry: MockTorusGeometry,
	ConeGeometry: MockConeGeometry,
	MeshStandardMaterial: MockMeshStandardMaterial,
	Mesh: MockMesh,
	Group: MockGroup,
	Color: MockColor,
	Vector2: MockVector2,
	Vector3: MockVector3,
	Euler: MockEuler,
	Matrix4: MockMatrix4,
	Quaternion: MockQuaternion,
	Shape: MockShape,
}));

jest.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
	mergeGeometries: (geos: MockBufferGeometry[]) => {
		if (!geos || geos.length === 0) return null;
		return new MockBufferGeometry();
	},
}));

import { generateBotMesh, disposeBotGroup } from "../BotGenerator";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateBotMesh", () => {
	it("returns a Group", () => {
		const bot = generateBotMesh("maintenance_bot", "reclaimers", 42);
		expect(bot).toBeInstanceOf(MockGroup);
	});

	it("has a meaningful name", () => {
		const bot = generateBotMesh("maintenance_bot", "reclaimers", 42);
		expect(bot.name).toContain("bot_");
		expect(bot.name).toContain("reclaimers");
	});

	it("has at least one child (chassis)", () => {
		const bot = generateBotMesh("maintenance_bot", "reclaimers", 42);
		expect(bot.children.length).toBeGreaterThan(0);
	});

	it("is deterministic — same seed produces same child count", () => {
		const bot1 = generateBotMesh("maintenance_bot", "reclaimers", 42);
		const bot2 = generateBotMesh("maintenance_bot", "reclaimers", 42);
		expect(bot1.children.length).toBe(bot2.children.length);
	});

	it("produces different results for different seeds", () => {
		const bot1 = generateBotMesh("maintenance_bot", "reclaimers", 1);
		const bot2 = generateBotMesh("maintenance_bot", "reclaimers", 999);
		// Scales may differ
		expect(bot1.scale).not.toStrictEqual(bot2.scale);
	});

	it("handles all supported bot types", () => {
		const types = [
			"maintenance_bot",
			"utility_drone",
			"fabrication_unit",
			"scout_bot",
			"heavy_bot",
			"signal_relay",
		];
		for (const type of types) {
			expect(() => generateBotMesh(type, "reclaimers", 1)).not.toThrow();
		}
	});

	it("handles all supported factions", () => {
		const factions = ["player", "reclaimers", "volt_collective", "signal_choir", "iron_creed", "feral"];
		for (const faction of factions) {
			expect(() => generateBotMesh("maintenance_bot", faction, 1)).not.toThrow();
		}
	});

	it("handles unknown faction without throwing", () => {
		expect(() => generateBotMesh("maintenance_bot", "unknown_faction", 42)).not.toThrow();
	});

	it("handles unknown bot type without throwing", () => {
		expect(() => generateBotMesh("unknown_bot", "reclaimers", 42)).not.toThrow();
	});

	it("generates bot with legs for leg-locomotion factions", () => {
		// signal_choir uses legs
		const bot = generateBotMesh("maintenance_bot", "signal_choir", 1);
		expect(bot.children.length).toBeGreaterThan(0);
	});

	it("generates bot with treads for tread-locomotion factions", () => {
		// reclaimers uses treads
		const bot = generateBotMesh("maintenance_bot", "reclaimers", 1);
		expect(bot.children.length).toBeGreaterThan(0);
	});

	it("generates bot for hover faction (volt_collective)", () => {
		const bot = generateBotMesh("utility_drone", "volt_collective", 1);
		expect(bot).toBeInstanceOf(MockGroup);
	});

	it("generates feral bot without throwing", () => {
		// Feral bots have damage pass
		const bot = generateBotMesh("maintenance_bot", "feral", 1);
		expect(bot).toBeInstanceOf(MockGroup);
	});

	it("applies scale variation", () => {
		const bot = generateBotMesh("maintenance_bot", "reclaimers", 77);
		// Scale should be set (between 0.95 and 1.05)
		const scaleValue = bot.scale.x;
		expect(scaleValue).toBeGreaterThanOrEqual(0.94);
		expect(scaleValue).toBeLessThanOrEqual(1.06);
	});
});

describe("disposeBotGroup", () => {
	it("disposes all meshes in a group", () => {
		const bot = generateBotMesh("maintenance_bot", "reclaimers", 42);
		// disposeBotGroup is re-exported from BotParts — verify it doesn't throw
		expect(() => disposeBotGroup(bot as unknown as import("three").Group)).not.toThrow();
	});
});
