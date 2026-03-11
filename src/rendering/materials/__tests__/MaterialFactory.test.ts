/**
 * Tests for MaterialFactory texture loading, caching, and error handling.
 *
 * Three.js is mocked to isolate the factory logic from WebGL rendering.
 */

// Track load callbacks for simulating success/failure
type LoadCallback = (texture: MockTexture) => void;
type ErrorCallback = (error: Error) => void;

interface MockTexture {
	wrapS: number;
	wrapT: number;
	colorSpace: string;
	needsUpdate: boolean;
	image: unknown;
	dispose: jest.Mock;
}

const loadRequests: Array<{
	path: string;
	onLoad: LoadCallback;
	onError: ErrorCallback;
}> = [];

jest.mock("three", () => {
	const RepeatWrapping = 1000;
	const SRGBColorSpace = "srgb";
	const LinearSRGBColorSpace = "srgb-linear";

	class MockTextureClass implements MockTexture {
		wrapS = 0;
		wrapT = 0;
		colorSpace = "";
		needsUpdate = false;
		image: unknown = null;
		dispose = jest.fn();
	}

	class MockCanvasTexture extends MockTextureClass {
		constructor(_canvas: unknown) {
			super();
		}
	}

	class MockTextureLoader {
		load(
			path: string,
			onLoad: LoadCallback,
			_onProgress: undefined,
			onError: ErrorCallback,
		) {
			loadRequests.push({ path, onLoad, onError });
		}
	}

	class MockVector2 {
		x: number;
		y: number;
		constructor(x = 0, y = 0) {
			this.x = x;
			this.y = y;
		}
	}

	class MockColor {
		r = 1;
		g = 1;
		b = 1;
		copy(other: MockColor) {
			this.r = other.r;
			this.g = other.g;
			this.b = other.b;
			return this;
		}
		multiply(other: MockColor) {
			this.r *= other.r;
			this.g *= other.g;
			this.b *= other.b;
			return this;
		}
	}

	class MockMeshStandardMaterial {
		map: unknown;
		metalnessMap: unknown;
		normalMap: unknown;
		roughnessMap: unknown;
		displacementMap: unknown;
		displacementScale: number;
		metalness: number;
		roughness: number;
		envMapIntensity: number;
		normalScale: MockVector2;
		color: MockColor;
		dispose = jest.fn();

		constructor(opts: Record<string, unknown> = {}) {
			this.map = opts.map;
			this.metalnessMap = opts.metalnessMap;
			this.normalMap = opts.normalMap;
			this.roughnessMap = opts.roughnessMap;
			this.displacementMap = opts.displacementMap;
			this.displacementScale = (opts.displacementScale as number) ?? 0.02;
			this.metalness = (opts.metalness as number) ?? 0.5;
			this.roughness = (opts.roughness as number) ?? 0.5;
			this.envMapIntensity = (opts.envMapIntensity as number) ?? 1.0;
			this.normalScale = (opts.normalScale as MockVector2) ?? new MockVector2(1, 1);
			this.color = new MockColor();
		}

		clone() {
			const cloned = new MockMeshStandardMaterial();
			cloned.metalness = this.metalness;
			cloned.roughness = this.roughness;
			cloned.color = new MockColor();
			cloned.color.copy(this.color);
			return cloned;
		}
	}

	return {
		TextureLoader: MockTextureLoader,
		Texture: MockTextureClass,
		CanvasTexture: MockCanvasTexture,
		MeshStandardMaterial: MockMeshStandardMaterial,
		Vector2: MockVector2,
		Color: MockColor,
		RepeatWrapping,
		SRGBColorSpace,
		LinearSRGBColorSpace,
	};
});

import { MaterialFactory, type PBRTextureSet } from "../MaterialFactory";

function makeTextureSet(prefix = "textures/iron"): PBRTextureSet {
	return {
		color: `${prefix}/Color.jpg`,
		metalness: `${prefix}/Metalness.jpg`,
		normal: `${prefix}/Normal.jpg`,
		roughness: `${prefix}/Roughness.jpg`,
	};
}

function resolveAllPendingLoads() {
	while (loadRequests.length > 0) {
		const req = loadRequests.shift()!;
		const tex: MockTexture = {
			wrapS: 1000,
			wrapT: 1000,
			colorSpace: req.path.includes("Color") ? "srgb" : "srgb-linear",
			needsUpdate: false,
			image: { width: 1, height: 1 },
			dispose: jest.fn(),
		};
		req.onLoad(tex);
	}
}

function rejectAllPendingLoads() {
	while (loadRequests.length > 0) {
		const req = loadRequests.shift()!;
		req.onError(new Error(`Failed to load: ${req.path}`));
	}
}

describe("MaterialFactory", () => {
	let factory: MaterialFactory;

	beforeEach(() => {
		loadRequests.length = 0;
		factory = new MaterialFactory();
		jest.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		factory.dispose();
		jest.restoreAllMocks();
	});

	describe("createMaterial (sync with placeholders)", () => {
		it("returns a material immediately", () => {
			const mat = factory.createMaterial("iron", makeTextureSet());
			expect(mat).toBeDefined();
			expect(mat.map).toBeDefined();
		});

		it("returns cached material on second call", () => {
			const mat1 = factory.createMaterial("iron", makeTextureSet());
			const mat2 = factory.createMaterial("iron", makeTextureSet());
			expect(mat1).toBe(mat2);
		});

		it("applies material options", () => {
			const mat = factory.createMaterial("iron", makeTextureSet(), {
				metalness: 0.9,
				roughness: 0.2,
			});
			expect(mat.metalness).toBe(0.9);
			expect(mat.roughness).toBe(0.2);
		});
	});

	describe("createMaterialAsync", () => {
		it("resolves after textures load", async () => {
			const promise = factory.createMaterialAsync("iron", makeTextureSet());
			resolveAllPendingLoads();
			const mat = await promise;
			expect(mat).toBeDefined();
		});

		it("returns cached material on second async call", async () => {
			const promise1 = factory.createMaterialAsync("iron", makeTextureSet());
			resolveAllPendingLoads();
			const mat1 = await promise1;

			const mat2 = await factory.createMaterialAsync("iron", makeTextureSet());
			expect(mat1).toBe(mat2);
		});

		it("handles texture load failures with fallback", async () => {
			const promise = factory.createMaterialAsync("broken", makeTextureSet("textures/missing"));
			rejectAllPendingLoads();
			const mat = await promise;
			expect(mat).toBeDefined();
			expect(console.warn).toHaveBeenCalled();
		});
	});

	describe("loadTextureSync error handling", () => {
		it("logs warning on texture load failure without crashing", async () => {
			factory.createMaterial("broken", makeTextureSet("textures/missing"));
			// Reject all pending loads to simulate texture failure
			rejectAllPendingLoads();
			// Allow microtasks to flush
			await new Promise((r) => setTimeout(r, 0));
			expect(console.warn).toHaveBeenCalled();
		});
	});

	describe("createVariant", () => {
		it("throws if base material not found", () => {
			expect(() =>
				factory.createVariant("nonexistent", "variant", {}),
			).toThrow(/base material/);
		});

		it("creates variant from existing material", () => {
			factory.createMaterial("iron", makeTextureSet());
			const variant = factory.createVariant("iron", "iron_rusty", {
				roughnessAdd: 0.2,
			});
			expect(variant).toBeDefined();
			expect(variant).not.toBe(factory.getMaterial("iron"));
		});

		it("caches variant for reuse", () => {
			factory.createMaterial("iron", makeTextureSet());
			const v1 = factory.createVariant("iron", "iron_rusty", {});
			const v2 = factory.createVariant("iron", "iron_rusty", {});
			expect(v1).toBe(v2);
		});

		it("clamps roughness to 0-1 range", () => {
			factory.createMaterial("iron", makeTextureSet());
			const variant = factory.createVariant("iron", "iron_super_rough", {
				roughnessAdd: 10,
			});
			expect(variant.roughness).toBeLessThanOrEqual(1);
		});
	});

	describe("getMaterial", () => {
		it("returns undefined for unknown name", () => {
			expect(factory.getMaterial("nonexistent")).toBeUndefined();
		});

		it("returns created material", () => {
			const mat = factory.createMaterial("iron", makeTextureSet());
			expect(factory.getMaterial("iron")).toBe(mat);
		});
	});

	describe("dispose", () => {
		it("clears all caches", () => {
			factory.createMaterial("iron", makeTextureSet());
			factory.dispose();
			expect(factory.getMaterial("iron")).toBeUndefined();
		});
	});
});
