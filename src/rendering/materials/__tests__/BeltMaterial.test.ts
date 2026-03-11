/**
 * @jest-environment jsdom
 *
 * Tests for BeltMaterial — conveyor belt surface + rail materials with UV animation.
 *
 * THREE.CanvasTexture is mocked so canvas rendering doesn't need a real GPU.
 * document.createElement is available via jest's jsdom environment.
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockCanvasTexture {
	wrapS = 0;
	wrapT = 0;
	offset = { y: 0 };
	dispose = jest.fn();
	constructor(_canvas: unknown) {}
}

class MockVector2 {
	constructor(public x = 0, public y = 0) {}
}

class MockMeshStandardMaterial {
	color: unknown;
	metalness: number;
	roughness: number;
	map: MockCanvasTexture | null;
	normalMap: MockCanvasTexture | null;
	normalScale: MockVector2;
	dispose = jest.fn();

	constructor(opts: Record<string, unknown> = {}) {
		this.color = opts.color;
		this.metalness = (opts.metalness as number) ?? 0.5;
		this.roughness = (opts.roughness as number) ?? 0.5;
		this.map = (opts.map as MockCanvasTexture) ?? null;
		this.normalMap = (opts.normalMap as MockCanvasTexture) ?? null;
		this.normalScale = (opts.normalScale as MockVector2) ?? new MockVector2();
	}
}

jest.mock("three", () => ({
	MeshStandardMaterial: MockMeshStandardMaterial,
	CanvasTexture: MockCanvasTexture,
	Vector2: MockVector2,
	RepeatWrapping: 1,
}));

// ---------------------------------------------------------------------------
// Mock document.createElement("canvas") → stub with fake getContext
// ---------------------------------------------------------------------------

const originalCreateElement = document.createElement.bind(document);

beforeAll(() => {
	jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
		if (tag === "canvas") {
			return {
				width: 0,
				height: 0,
				getContext: () => ({
					fillStyle: "",
					strokeStyle: "",
					lineWidth: 0,
					lineCap: "",
					fillRect: () => {},
					beginPath: () => {},
					moveTo: () => {},
					lineTo: () => {},
					stroke: () => {},
					arc: () => {},
					fill: () => {},
					getImageData: (_x: number, _y: number, w: number, h: number) => ({
						data: new Uint8ClampedArray(w * h * 4),
					}),
					createImageData: (w: number, h: number) => ({
						data: new Uint8ClampedArray(w * h * 4),
					}),
					putImageData: () => {},
					imageData: null,
				}),
			} as unknown as HTMLCanvasElement;
		}
		return originalCreateElement(tag);
	});
});

afterAll(() => {
	jest.restoreAllMocks();
});

// Reset module between tests so cache state is cleared
beforeEach(() => {
	jest.resetModules();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createBeltMaterial", () => {
	it("returns a MeshStandardMaterial", async () => {
		const { createBeltMaterial } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("has low metalness (rubber)", async () => {
		const { createBeltMaterial } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		expect(mat.metalness).toBeLessThan(0.5);
	});

	it("has high roughness (rubber)", async () => {
		const { createBeltMaterial } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		expect(mat.roughness).toBeGreaterThan(0.5);
	});

	it("has a map texture", async () => {
		const { createBeltMaterial } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		expect(mat.map).toBeDefined();
	});

	it("has a normalMap texture", async () => {
		const { createBeltMaterial } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		expect(mat.normalMap).toBeDefined();
	});

	it("returns the same cached instance on second call", async () => {
		const { createBeltMaterial } = await import("../BeltMaterial");
		const mat1 = createBeltMaterial();
		const mat2 = createBeltMaterial();
		expect(mat1).toBe(mat2);
	});
});

describe("createRailMaterial", () => {
	it("returns a MeshStandardMaterial", async () => {
		const { createRailMaterial } = await import("../BeltMaterial");
		const mat = createRailMaterial();
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("has high metalness (chrome rail)", async () => {
		const { createRailMaterial } = await import("../BeltMaterial");
		const mat = createRailMaterial();
		expect(mat.metalness).toBeGreaterThan(0.5);
	});

	it("returns the same cached instance on second call", async () => {
		const { createRailMaterial } = await import("../BeltMaterial");
		const mat1 = createRailMaterial();
		const mat2 = createRailMaterial();
		expect(mat1).toBe(mat2);
	});
});

describe("updateBeltUV", () => {
	it("does not throw", async () => {
		const { createBeltMaterial, updateBeltUV } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		expect(() => updateBeltUV(mat as never, 1.0, 5.0)).not.toThrow();
	});

	it("updates map offset.y", async () => {
		const { createBeltMaterial, updateBeltUV } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		updateBeltUV(mat as never, 1.0, 5.0);
		// offset.y should be fractional: speed * time mod 1
		expect(mat.map?.offset.y).toBeGreaterThanOrEqual(0);
		expect(mat.map?.offset.y).toBeLessThan(1);
	});

	it("wraps offset.y to [0, 1)", async () => {
		const { createBeltMaterial, updateBeltUV } = await import("../BeltMaterial");
		const mat = createBeltMaterial();
		// Large time value — should wrap
		updateBeltUV(mat as never, 2.0, 1000.0);
		expect(mat.map?.offset.y).toBeGreaterThanOrEqual(0);
		expect(mat.map?.offset.y).toBeLessThan(1);
	});
});
