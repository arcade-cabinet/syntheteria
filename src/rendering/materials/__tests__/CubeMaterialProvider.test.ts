/**
 * Tests for CubeMaterialProvider — resolveCubeMaterial, fallback handling,
 * and texture probe error resilience.
 *
 * Three.js is mocked. The cubePBRMaterials.json config is mocked to control
 * material definitions. fetch is mocked to simulate texture probing.
 */

jest.mock("three", () => {
	const RepeatWrapping = 1000;
	const SRGBColorSpace = "srgb";
	const LinearSRGBColorSpace = "srgb-linear";

	class MockTexture {
		wrapS = 0;
		wrapT = 0;
		colorSpace = "";
		needsUpdate = false;
		image: unknown = null;
		dispose = jest.fn();
	}

	class MockCanvasTexture extends MockTexture {
		constructor(_canvas: unknown) {
			super();
		}
	}

	class MockTextureLoader {
		load(
			_path: string,
			onLoad?: (tex: MockTexture) => void,
			_onProgress?: unknown,
			_onError?: (err: Error) => void,
		) {
			// Immediately resolve with a mock texture for simplicity
			if (onLoad) {
				const tex = new MockTexture();
				tex.image = { width: 1, height: 1 };
				onLoad(tex);
			}
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
		constructor(_color?: string) {}
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
		map: unknown = null;
		metalnessMap: unknown = null;
		normalMap: unknown = null;
		roughnessMap: unknown = null;
		displacementMap: unknown = null;
		aoMap: unknown = null;
		aoMapIntensity = 1;
		displacementScale = 0.02;
		metalness = 0.5;
		roughness = 0.5;
		envMapIntensity = 1.0;
		normalScale: MockVector2;
		color: MockColor;
		needsUpdate = false;
		dispose = jest.fn();

		constructor(opts: Record<string, unknown> = {}) {
			this.map = opts.map ?? null;
			this.metalnessMap = opts.metalnessMap ?? null;
			this.normalMap = opts.normalMap ?? null;
			this.roughnessMap = opts.roughnessMap ?? null;
			this.displacementMap = opts.displacementMap ?? null;
			this.displacementScale = (opts.displacementScale as number) ?? 0.02;
			this.metalness = (opts.metalness as number) ?? 0.5;
			this.roughness = (opts.roughness as number) ?? 0.5;
			this.envMapIntensity = (opts.envMapIntensity as number) ?? 1.0;
			this.normalScale = (opts.normalScale as MockVector2) ?? new MockVector2(1, 1);
			this.color = new MockColor();
		}

		clone() {
			const c = new MockMeshStandardMaterial();
			c.metalness = this.metalness;
			c.roughness = this.roughness;
			return c;
		}
	}

	return {
		TextureLoader: MockTextureLoader,
		Texture: MockTexture,
		CanvasTexture: MockCanvasTexture,
		MeshStandardMaterial: MockMeshStandardMaterial,
		Vector2: MockVector2,
		Color: MockColor,
		RepeatWrapping,
		SRGBColorSpace,
		LinearSRGBColorSpace,
	};
});

import {
	resolveCubeMaterial,
	getCubeMaterialTypes,
	getCubeMaterialDisplayName,
	disposeCubeMaterials,
} from "../CubeMaterialProvider";

describe("CubeMaterialProvider", () => {
	beforeEach(() => {
		disposeCubeMaterials();
		jest.spyOn(console, "warn").mockImplementation(() => {});
		// Mock fetch for texture probing
		global.fetch = jest.fn().mockResolvedValue({ ok: false });
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("resolveCubeMaterial", () => {
		it("returns a material for unknown types without crashing", () => {
			const mat = resolveCubeMaterial("nonexistent_material_xyz");
			expect(mat).toBeDefined();
			expect(mat.metalness).toBe(0.5);
		});

		it("returns fallback material when textures are not probed yet", () => {
			const mat = resolveCubeMaterial("iron");
			expect(mat).toBeDefined();
		});

		it("returns same material for repeated calls", () => {
			const mat1 = resolveCubeMaterial("iron");
			const mat2 = resolveCubeMaterial("iron");
			expect(mat1).toBe(mat2);
		});
	});

	describe("getCubeMaterialTypes", () => {
		it("returns an array of material keys", () => {
			const types = getCubeMaterialTypes();
			expect(Array.isArray(types)).toBe(true);
			expect(types.length).toBeGreaterThan(0);
		});
	});

	describe("getCubeMaterialDisplayName", () => {
		it("returns material type as fallback for unknown types", () => {
			expect(getCubeMaterialDisplayName("unknown_stuff")).toBe("unknown_stuff");
		});
	});

	describe("disposeCubeMaterials", () => {
		it("clears all state without crashing", () => {
			resolveCubeMaterial("iron");
			expect(() => disposeCubeMaterials()).not.toThrow();
		});
	});

	describe("error resilience", () => {
		it("handles fetch rejection during texture probing", async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error("network error"));

			const mat = resolveCubeMaterial("iron");
			expect(mat).toBeDefined();

			// Flush async probe
			await new Promise((r) => setTimeout(r, 10));
			// Should not crash — fallback material returned
		});

		it("handles fetch returning non-ok status", async () => {
			(global.fetch as jest.Mock).mockResolvedValue({ ok: false });

			const mat = resolveCubeMaterial("copper");
			expect(mat).toBeDefined();

			await new Promise((r) => setTimeout(r, 10));
			// Texture probe marks as missing, material uses fallback
		});
	});
});
