/**
 * Tests for MaterialFactory texture loading, caching, and error handling.
 *
 * Three.js is mocked to isolate the factory logic from WebGL rendering.
 * Config is mocked so createFromSpec / createForFaction tests are
 * deterministic without reading the real JSON files.
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
		constructor(_v?: unknown) {}
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

// ---------------------------------------------------------------------------
// Mock config — deterministic values for createFromSpec / createForFaction
// ---------------------------------------------------------------------------

jest.mock("../../../../config", () => ({
	config: {
		textureMapping: {
			materials: {
				iron: {
					localPath: "textures/materials/iron",
					files: {
						color: "Metal038_1K-JPG_Color.jpg",
						metalness: "Metal038_1K-JPG_Metalness.jpg",
						normal: "Metal038_1K-JPG_NormalGL.jpg",
						roughness: "Metal038_1K-JPG_Roughness.jpg",
						displacement: "Metal038_1K-JPG_Displacement.jpg",
					},
				},
				steel: {
					localPath: "textures/materials/steel",
					files: {
						color: "MetalPlates009_1K-JPG_Color.jpg",
						metalness: "MetalPlates009_1K-JPG_Metalness.jpg",
						normal: "MetalPlates009_1K-JPG_NormalGL.jpg",
						roughness: "MetalPlates009_1K-JPG_Roughness.jpg",
						displacement: "MetalPlates009_1K-JPG_Displacement.jpg",
					},
				},
				// non-metallic: no metalness key → should fall back to color path
				reinforced_concrete: {
					localPath: "textures/materials/reinforced_concrete",
					files: {
						color: "Concrete028_1K-JPG_Color.jpg",
						normal: "Concrete028_1K-JPG_NormalGL.jpg",
						roughness: "Concrete028_1K-JPG_Roughness.jpg",
						displacement: "Concrete028_1K-JPG_Displacement.jpg",
					},
				},
			},
		},
		factionVisuals: {
			reclaimers: {
				primaryColor: "#8B4513",
				accentColor: "#DAA520",
				rustLevel: 0.4,
			},
			volt_collective: {
				primaryColor: "#4169E1",
				accentColor: "#FF4500",
				emissiveGlow: 0.3,
			},
			signal_choir: {
				primaryColor: "#9370DB",
				accentColor: "#00CED1",
				anodized: true,
			},
			iron_creed: {
				primaryColor: "#708090",
				accentColor: "#FFD700",
				brushedMetal: true,
			},
		},
	},
}));

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

	// ---------------------------------------------------------------------------
	// createFromSpec — JSON-driven material creation
	// ---------------------------------------------------------------------------

	describe("createFromSpec", () => {
		it("returns a material for a known textureMapping key", () => {
			const mat = factory.createFromSpec("spec_iron", {
				textureMappingKey: "iron",
			});
			expect(mat).toBeDefined();
		});

		it("returns cached material on second call with same name", () => {
			const mat1 = factory.createFromSpec("spec_iron", {
				textureMappingKey: "iron",
			});
			const mat2 = factory.createFromSpec("spec_iron", {
				textureMappingKey: "iron",
			});
			expect(mat1).toBe(mat2);
		});

		it("applies PBR options from spec", () => {
			const mat = factory.createFromSpec("spec_steel", {
				textureMappingKey: "steel",
				options: { metalness: 0.95, roughness: 0.15 },
			});
			expect(mat.metalness).toBe(0.95);
			expect(mat.roughness).toBe(0.15);
		});

		it("uses texture paths from config.textureMapping", () => {
			factory.createFromSpec("spec_iron2", { textureMappingKey: "iron" });
			// Texture load should have been requested for the config-derived path
			const colorRequest = loadRequests.find((r) =>
				r.path.includes("textures/materials/iron"),
			);
			expect(colorRequest).toBeDefined();
		});

		it("falls back gracefully for unknown textureMapping key", () => {
			const mat = factory.createFromSpec("spec_unknown", {
				textureMappingKey: "nonexistent_material",
			});
			expect(mat).toBeDefined();
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining("nonexistent_material"),
			);
		});

		it("handles non-metallic materials (no metalness file) without crashing", () => {
			const mat = factory.createFromSpec("spec_concrete", {
				textureMappingKey: "reinforced_concrete",
			});
			expect(mat).toBeDefined();
			// Metalness path should fall back to the color path
			const metalnessReq = loadRequests.find(
				(r) =>
					r.path.includes("reinforced_concrete") &&
					r.path.includes("Color.jpg"),
			);
			expect(metalnessReq).toBeDefined();
		});

		it("material is accessible via getMaterial after creation", () => {
			factory.createFromSpec("spec_iron3", { textureMappingKey: "iron" });
			expect(factory.getMaterial("spec_iron3")).toBeDefined();
		});

		it("material is cleared after dispose", () => {
			factory.createFromSpec("spec_iron4", { textureMappingKey: "iron" });
			factory.dispose();
			expect(factory.getMaterial("spec_iron4")).toBeUndefined();
		});
	});

	// ---------------------------------------------------------------------------
	// createForFaction — faction-tinted PBR materials from factionVisuals config
	// ---------------------------------------------------------------------------

	describe("createForFaction", () => {
		it("returns a material for a known faction", () => {
			const mat = factory.createForFaction("reclaimers");
			expect(mat).toBeDefined();
		});

		it("caches the material for reuse", () => {
			const mat1 = factory.createForFaction("reclaimers");
			const mat2 = factory.createForFaction("reclaimers");
			expect(mat1).toBe(mat2);
		});

		it("produces distinct materials for different factions", () => {
			const reclaimer = factory.createForFaction("reclaimers");
			const volt = factory.createForFaction("volt_collective");
			expect(reclaimer).not.toBe(volt);
		});

		it("produces distinct materials for same faction with different texture keys", () => {
			const withIron = factory.createForFaction("reclaimers", "iron");
			const withSteel = factory.createForFaction("reclaimers", "steel");
			expect(withIron).not.toBe(withSteel);
		});

		it("warns and returns a fallback for unknown faction", () => {
			const mat = factory.createForFaction("unknown_faction");
			expect(mat).toBeDefined();
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining("unknown_faction"),
			);
		});

		it("rust-heavy faction (reclaimers) has higher roughness than chrome faction (volt)", () => {
			const reclaimerMat = factory.createForFaction("reclaimers", "iron");
			const voltMat = factory.createForFaction("volt_collective", "iron");
			expect(reclaimerMat.roughness).toBeGreaterThan(voltMat.roughness);
		});

		it("brushedMetal faction (iron_creed) has high metalness", () => {
			const mat = factory.createForFaction("iron_creed");
			expect(mat.metalness).toBeGreaterThanOrEqual(0.8);
		});

		it("anodized faction (signal_choir) has lower roughness than rusted faction", () => {
			const choirMat = factory.createForFaction("signal_choir");
			const reclaimerMat = factory.createForFaction("reclaimers");
			expect(choirMat.roughness).toBeLessThan(reclaimerMat.roughness);
		});

		it("extraOptions override the faction defaults", () => {
			const mat = factory.createForFaction("reclaimers", "iron", {
				metalness: 0.1,
				roughness: 0.99,
			});
			expect(mat.metalness).toBe(0.1);
			expect(mat.roughness).toBe(0.99);
		});

		it("faction material is accessible via getMaterial", () => {
			factory.createForFaction("reclaimers");
			expect(factory.getMaterial("faction_reclaimers_iron")).toBeDefined();
		});

		it("faction material is cleared after dispose", () => {
			factory.createForFaction("volt_collective");
			factory.dispose();
			expect(factory.getMaterial("faction_volt_collective_iron")).toBeUndefined();
		});

		it("creates all four factions without throwing", () => {
			expect(() => {
				factory.createForFaction("reclaimers");
				factory.createForFaction("volt_collective");
				factory.createForFaction("signal_choir");
				factory.createForFaction("iron_creed");
			}).not.toThrow();
		});
	});
});
