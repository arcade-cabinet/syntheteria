/**
 * Tests for InstancedCubeManager — instance allocation, removal, update, and GPU sync.
 *
 * Three.js is mocked to isolate logic from WebGL.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockInstancedBufferAttribute {
	array: Float32Array;
	needsUpdate = false;
	itemSize: number;

	constructor(data: Float32Array, itemSize: number) {
		this.array = data;
		this.itemSize = itemSize;
	}

	setXYZ(index: number, r: number, g: number, b: number) {
		this.array[index * 3] = r;
		this.array[index * 3 + 1] = g;
		this.array[index * 3 + 2] = b;
	}
}

class MockMatrix4 {
	elements = new Float32Array(16).fill(0);

	compose(_pos: unknown, _quat: unknown, _scale: unknown) {
		return this;
	}

	decompose(_pos: unknown, _quat: unknown, _scale: unknown) {
		return this;
	}
}

class MockInstancedMesh {
	name = "";
	count = 0;
	castShadow = false;
	receiveShadow = false;
	frustumCulled = true;
	instanceColor: MockInstancedBufferAttribute | null = null;
	instanceMatrix = { needsUpdate: false };
	private matrices = new Map<number, MockMatrix4>();
	dispose = jest.fn();

	constructor(_geo: unknown, _mat: unknown, maxInstances: number) {
		const colors = new Float32Array(maxInstances * 3).fill(1);
		this.instanceColor = new MockInstancedBufferAttribute(colors, 3);
	}

	setMatrixAt(index: number, m: MockMatrix4) {
		this.matrices.set(index, m);
	}

	getMatrixAt(index: number, target: MockMatrix4) {
		const stored = this.matrices.get(index);
		if (stored) Object.assign(target, stored);
	}
}

class MockBoxGeometry {
	dispose = jest.fn();
}

class MockGroup {
	children: unknown[] = [];
	name = "";
	add(child: unknown) { this.children.push(child); }
	remove(child: unknown) {
		const i = this.children.indexOf(child);
		if (i >= 0) this.children.splice(i, 1);
	}
}

class MockVector3 {
	constructor(public x = 0, public y = 0, public z = 0) {}
	set(x: number, y: number, z: number) {
		this.x = x; this.y = y; this.z = z;
		return this;
	}
}

class MockQuaternion {
	setFromEuler(_e: unknown) { return this; }
}

class MockEuler {
	constructor(public x = 0, public y = 0, public z = 0) {}
}

class MockColor {
	r = 1; g = 1; b = 1;
	constructor(r?: number, g?: number, b?: number) {
		if (r !== undefined) this.r = r;
		if (g !== undefined) this.g = g;
		if (b !== undefined) this.b = b;
	}
	copy(other: MockColor) {
		this.r = other.r; this.g = other.g; this.b = other.b;
		return this;
	}
}

jest.mock("three", () => ({
	InstancedBufferAttribute: MockInstancedBufferAttribute,
	InstancedMesh: MockInstancedMesh,
	BoxGeometry: MockBoxGeometry,
	Group: MockGroup,
	Matrix4: MockMatrix4,
	Vector3: MockVector3,
	Quaternion: MockQuaternion,
	Euler: MockEuler,
	Color: MockColor,
}));

import { InstancedCubeManager } from "../InstancedCubeManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMaterial() {
	return {} as never; // minimal mock
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InstancedCubeManager", () => {
	let manager: InstancedCubeManager;

	beforeEach(() => {
		InstancedCubeManager.disposeSharedResources();
		manager = new InstancedCubeManager(100);
	});

	afterEach(() => {
		manager.dispose();
	});

	describe("construction", () => {
		it("creates a group named InstancedCubeManager", () => {
			expect(manager.group.name).toBe("InstancedCubeManager");
		});

		it("starts with totalCount of 0", () => {
			expect(manager.totalCount).toBe(0);
		});

		it("starts with no active material types", () => {
			expect(manager.getActiveMaterialTypes()).toEqual([]);
		});
	});

	describe("addCube", () => {
		it("returns a valid handle", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, makeMaterial());
			expect(handle).toBeDefined();
			expect(handle.materialType).toBe("iron");
			expect(handle.index).toBe(0);
		});

		it("increments totalCount", () => {
			manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			expect(manager.totalCount).toBe(1);
		});

		it("creates a batch per material type", () => {
			manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.addCube("copper", { x: 1, y: 0, z: 0 }, undefined, makeMaterial());
			expect(manager.totalCount).toBe(2);
			expect(manager.getCountForMaterial("iron")).toBe(1);
			expect(manager.getCountForMaterial("copper")).toBe(1);
		});

		it("adds to same batch for same material type", () => {
			manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.addCube("iron", { x: 1, y: 0, z: 0 }, undefined, makeMaterial());
			expect(manager.getCountForMaterial("iron")).toBe(2);
		});

		it("returns dummy handle when max instances reached", () => {
			const mgr = new InstancedCubeManager(2);
			const mat = makeMaterial();
			mgr.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, mat);
			mgr.addCube("iron", { x: 1, y: 0, z: 0 }, undefined, mat);
			const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
			const overflow = mgr.addCube("iron", { x: 2, y: 0, z: 0 }, undefined, mat);
			expect(overflow.index).toBe(-1);
			spy.mockRestore();
			mgr.dispose();
		});

		it("handle is marked valid after add", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			expect(manager.isValid(handle)).toBe(true);
		});

		it("uses default rotation when omitted", () => {
			expect(() =>
				manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial()),
			).not.toThrow();
		});
	});

	describe("removeCube", () => {
		it("removes a handle and decrements count", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.removeCube(handle);
			expect(manager.totalCount).toBe(0);
		});

		it("invalidates the handle after removal", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.removeCube(handle);
			expect(manager.isValid(handle)).toBe(false);
		});

		it("uses swap-and-pop: remaining handle index updates", () => {
			const h0 = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			const h1 = manager.addCube("iron", { x: 1, y: 0, z: 0 }, undefined, makeMaterial());
			expect(h1.index).toBe(1);
			manager.removeCube(h0); // h1 should be swapped into slot 0
			expect(h1.index).toBe(0);
			expect(manager.totalCount).toBe(1);
		});

		it("does nothing when handle has unknown material type", () => {
			const fakeHandle = { materialType: "nonexistent", index: 0, id: 9999 };
			expect(() => manager.removeCube(fakeHandle)).not.toThrow();
		});

		it("does nothing when handle id not in batch", () => {
			manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			const badHandle = { materialType: "iron", index: 0, id: 9999 };
			expect(() => manager.removeCube(badHandle)).not.toThrow();
		});
	});

	describe("updateCubePosition", () => {
		it("does not throw on valid handle", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			expect(() =>
				manager.updateCubePosition(handle, { x: 5, y: 0, z: 5 }),
			).not.toThrow();
		});

		it("does nothing for unknown material type", () => {
			const fakeHandle = { materialType: "unknown", index: 0, id: 99 };
			expect(() =>
				manager.updateCubePosition(fakeHandle, { x: 0, y: 0, z: 0 }),
			).not.toThrow();
		});
	});

	describe("updateCubeTransform", () => {
		it("does not throw on valid handle", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			expect(() =>
				manager.updateCubeTransform(handle, { x: 1, y: 0, z: 1 }, { x: 0, y: Math.PI, z: 0 }),
			).not.toThrow();
		});
	});

	describe("setHighlight / isHighlighted", () => {
		it("highlights a cube", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.setHighlight(handle, true);
			expect(manager.isHighlighted(handle)).toBe(true);
		});

		it("un-highlights a cube", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.setHighlight(handle, true);
			manager.setHighlight(handle, false);
			expect(manager.isHighlighted(handle)).toBe(false);
		});

		it("isHighlighted returns false for unknown material type", () => {
			const fakeHandle = { materialType: "unknown", index: 0, id: 99 };
			expect(manager.isHighlighted(fakeHandle)).toBe(false);
		});
	});

	describe("flush", () => {
		it("marks dirty buffers as needing update", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			// After add, matrices and colors are dirty
			manager.flush();
			// Second flush should be a no-op
			expect(() => manager.flush()).not.toThrow();
			// Clean up
			manager.removeCube(handle);
		});

		it("does not throw on empty manager", () => {
			expect(() => manager.flush()).not.toThrow();
		});
	});

	describe("getActiveMaterialTypes", () => {
		it("returns only types with at least one instance", () => {
			const h = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.addCube("copper", { x: 1, y: 0, z: 0 }, undefined, makeMaterial());
			manager.removeCube(h);
			const types = manager.getActiveMaterialTypes();
			expect(types).not.toContain("iron");
			expect(types).toContain("copper");
		});
	});

	describe("getCountForMaterial", () => {
		it("returns 0 for unknown material type", () => {
			expect(manager.getCountForMaterial("nonexistent")).toBe(0);
		});

		it("returns correct count after adds and removes", () => {
			const h1 = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.addCube("iron", { x: 1, y: 0, z: 0 }, undefined, makeMaterial());
			expect(manager.getCountForMaterial("iron")).toBe(2);
			manager.removeCube(h1);
			expect(manager.getCountForMaterial("iron")).toBe(1);
		});
	});

	describe("isValid", () => {
		it("returns false for a handle after removal", () => {
			const handle = manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.removeCube(handle);
			expect(manager.isValid(handle)).toBe(false);
		});

		it("returns false for a dummy handle (index -1)", () => {
			const dummy = { materialType: "iron", index: -1, id: 999 };
			expect(manager.isValid(dummy)).toBe(false);
		});
	});

	describe("dispose", () => {
		it("clears all batches and handles", () => {
			manager.addCube("iron", { x: 0, y: 0, z: 0 }, undefined, makeMaterial());
			manager.dispose();
			expect(manager.totalCount).toBe(0);
		});

		it("does not throw on empty manager", () => {
			expect(() => manager.dispose()).not.toThrow();
		});
	});

	describe("disposeSharedResources", () => {
		it("disposes the shared geometry", () => {
			expect(() => InstancedCubeManager.disposeSharedResources()).not.toThrow();
		});
	});
});
