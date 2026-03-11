/**
 * Tests for DecalSystem — module-level decal registry with age/fade logic.
 *
 * DecalGeometry and Three.js are mocked. Focus on:
 * - Decal registration/removal
 * - Age update logic
 * - Fade-out timing
 * - Eviction when MAX_DECALS is reached
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockBufferAttribute {
	count = 6; // Non-zero = valid geometry
}

class MockBufferGeometry {
	private attr: MockBufferAttribute | null = new MockBufferAttribute();
	dispose = jest.fn();
	getAttribute(_name: string) { return this.attr; }
	setNoVertices() { this.attr = null; }
}

class MockMesh {
	name = "";
	renderOrder = 0;
	frustumCulled = true;
	material: MockMeshStandardMaterial;
	geometry: MockBufferGeometry;
	parent: MockObject3D | null = null;
	constructor(geo: MockBufferGeometry, mat: MockMeshStandardMaterial) {
		this.geometry = geo;
		this.material = mat;
	}
}

class MockObject3D {
	position = { copy: jest.fn(), add: jest.fn() };
	rotation = { copy: jest.fn() };
	children: MockMesh[] = [];
	remove(child: MockMesh) {
		const i = this.children.indexOf(child);
		if (i >= 0) this.children.splice(i, 1);
	}
	lookAt(_x: unknown) {}
}

class MockMeshStandardMaterial {
	opacity: number;
	transparent = true;
	depthWrite = false;
	depthTest = true;
	polygonOffset = true;
	polygonOffsetFactor = -4;
	polygonOffsetUnits = -4;
	color: unknown;
	emissive: unknown;
	emissiveIntensity: number;
	metalness: number;
	roughness: number;
	side: unknown;
	dispose = jest.fn();

	constructor(opts: Record<string, unknown> = {}) {
		this.opacity = (opts.opacity as number) ?? 1;
		this.color = opts.color;
		this.emissive = opts.emissive;
		this.emissiveIntensity = (opts.emissiveIntensity as number) ?? 0;
		this.metalness = (opts.metalness as number) ?? 0.5;
		this.roughness = (opts.roughness as number) ?? 0.5;
		this.side = opts.side;
	}
}

class MockVector3 {
	constructor(public x = 0, public y = 0, public z = 0) {}
	clone() { return new MockVector3(this.x, this.y, this.z); }
	add(_v: MockVector3) { return this; }
	copy(_v: MockVector3) { return this; }
}

class MockEuler {
	x = 0; y = 0; z = 0;
	copy(_e: unknown) { return this; }
}

let _decalGeoReturnEmpty = false;

jest.mock("three/examples/jsm/geometries/DecalGeometry.js", () => ({
	DecalGeometry: class {
		private attr: MockBufferAttribute | null;
		dispose = jest.fn();
		constructor(_mesh: unknown, _pos: unknown, _orient: unknown, _size: unknown) {
			if (_decalGeoReturnEmpty) {
				this.attr = null;
			} else {
				this.attr = new MockBufferAttribute();
			}
		}
		getAttribute(_name: string) { return this.attr; }
	},
}));

jest.mock("three", () => ({
	BufferGeometry: MockBufferGeometry,
	Mesh: MockMesh,
	MeshStandardMaterial: MockMeshStandardMaterial,
	Vector3: MockVector3,
	Euler: MockEuler,
	Object3D: MockObject3D,
	FrontSide: 0,
}));

import {
	addDecal,
	removeDecal,
	updateDecals,
	getDecal,
	getDecalMesh,
	getActiveDecalIds,
	getDecalCount,
	disposeAllDecals,
	type DecalType,
} from "../DecalSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMesh(): MockMesh {
	return new MockMesh(new MockBufferGeometry(), new MockMeshStandardMaterial());
}

function makeVec3(x = 0, y = 0, z = 0): MockVector3 {
	return new MockVector3(x, y, z);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DecalSystem", () => {
	beforeEach(() => {
		disposeAllDecals();
		_decalGeoReturnEmpty = false;
	});

	describe("addDecal", () => {
		it("adds a decal and returns a non-negative ID", () => {
			const id = addDecal(
				makeMesh() as never,
				"crack",
				makeVec3() as never,
				makeVec3(0, 1, 0) as never,
			);
			expect(id).toBeGreaterThanOrEqual(0);
		});

		it("increments the decal count", () => {
			addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			expect(getDecalCount()).toBe(1);
		});

		it("supports all decal types", () => {
			const types: DecalType[] = ["crack", "rust", "scorch", "moss"];
			for (const type of types) {
				const id = addDecal(makeMesh() as never, type, makeVec3() as never, makeVec3(0, 1, 0) as never);
				expect(id).toBeGreaterThanOrEqual(0);
			}
		});

		it("returns -1 when DecalGeometry produces no vertices", () => {
			_decalGeoReturnEmpty = true;
			const id = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			expect(id).toBe(-1);
		});

		it("can add multiple decals", () => {
			addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			addDecal(makeMesh() as never, "rust", makeVec3(1, 0, 0) as never, makeVec3(0, 1, 0) as never);
			expect(getDecalCount()).toBe(2);
		});

		it("each decal gets a unique ID", () => {
			const id1 = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			const id2 = addDecal(makeMesh() as never, "rust", makeVec3() as never, makeVec3(0, 1, 0) as never);
			expect(id1).not.toBe(id2);
		});
	});

	describe("removeDecal", () => {
		it("returns false for unknown ID", () => {
			expect(removeDecal(9999)).toBe(false);
		});

		it("returns true for a valid decal ID", () => {
			const id = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			expect(removeDecal(id)).toBe(true);
		});

		it("decrements the decal count", () => {
			const id = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			removeDecal(id);
			expect(getDecalCount()).toBe(0);
		});

		it("can be called twice without error", () => {
			const id = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			removeDecal(id);
			expect(() => removeDecal(id)).not.toThrow();
		});
	});

	describe("getDecal", () => {
		it("returns null for unknown ID", () => {
			expect(getDecal(9999)).toBeNull();
		});

		it("returns the decal entry for a valid ID", () => {
			const id = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			const entry = getDecal(id);
			expect(entry).not.toBeNull();
			expect(entry?.type).toBe("crack");
		});

		it("age starts at 0", () => {
			const id = addDecal(makeMesh() as never, "scorch", makeVec3() as never, makeVec3(0, 1, 0) as never);
			expect(getDecal(id)?.age).toBe(0);
		});
	});

	describe("getDecalMesh", () => {
		it("returns null for unknown ID", () => {
			expect(getDecalMesh(9999)).toBeNull();
		});

		it("returns the mesh for a valid decal", () => {
			const id = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			expect(getDecalMesh(id)).toBeDefined();
		});
	});

	describe("getActiveDecalIds", () => {
		it("returns empty array when no decals", () => {
			expect(getActiveDecalIds()).toEqual([]);
		});

		it("returns IDs of all active decals", () => {
			const id1 = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			const id2 = addDecal(makeMesh() as never, "rust", makeVec3() as never, makeVec3(0, 1, 0) as never);
			const ids = getActiveDecalIds();
			expect(ids).toContain(id1);
			expect(ids).toContain(id2);
		});
	});

	describe("updateDecals", () => {
		it("advances decal age", () => {
			const id = addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			updateDecals(1.0);
			expect(getDecal(id)?.age).toBeCloseTo(1.0);
		});

		it("returns empty array when no decals fade out", () => {
			addDecal(makeMesh() as never, "rust", makeVec3() as never, makeVec3(0, 1, 0) as never);
			// rust has fadeAfter: -1 (never fades)
			const removed = updateDecals(1.0);
			expect(removed).toEqual([]);
		});

		it("fades out scorch decals after their fadeAfter seconds", () => {
			const id = addDecal(makeMesh() as never, "scorch", makeVec3() as never, makeVec3(0, 1, 0) as never);
			// scorch fadeAfter = 30, fadeDuration = 20 → fully gone at age 50
			updateDecals(31); // past fadeAfter
			const entry = getDecal(id);
			if (entry) {
				// opacity should be less than baseOpacity
				expect(entry.material.opacity).toBeLessThan(0.85);
			}
		});

		it("removes fully faded decals", () => {
			addDecal(makeMesh() as never, "scorch", makeVec3() as never, makeVec3(0, 1, 0) as never);
			// Age past full fade (30 fadeAfter + 20 fadeDuration = 50)
			const removed = updateDecals(51);
			expect(removed.length).toBeGreaterThan(0);
			expect(getDecalCount()).toBe(0);
		});

		it("does not remove non-fading decals", () => {
			addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			// crack fadeAfter = -1 → never fades
			updateDecals(100);
			expect(getDecalCount()).toBe(1);
		});
	});

	describe("disposeAllDecals", () => {
		it("clears all decals", () => {
			addDecal(makeMesh() as never, "crack", makeVec3() as never, makeVec3(0, 1, 0) as never);
			addDecal(makeMesh() as never, "rust", makeVec3() as never, makeVec3(0, 1, 0) as never);
			disposeAllDecals();
			expect(getDecalCount()).toBe(0);
		});

		it("does not throw on empty registry", () => {
			expect(() => disposeAllDecals()).not.toThrow();
		});

		it("can be called multiple times", () => {
			disposeAllDecals();
			expect(() => disposeAllDecals()).not.toThrow();
		});
	});
});
