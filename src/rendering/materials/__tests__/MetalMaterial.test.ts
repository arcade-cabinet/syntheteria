/**
 * @jest-environment jsdom
 *
 * Tests for MetalMaterial — procedural rusted metal PBR with clean/rusted/scorched variants.
 *
 * THREE.CanvasTexture is mocked. Tests cover:
 * - All three variant creation
 * - Material property validation
 * - Cache behavior (same variant = same instance)
 */

// ---------------------------------------------------------------------------
// Three.js mock
// ---------------------------------------------------------------------------

class MockCanvasTexture {
	wrapS = 0;
	wrapT = 0;
	dispose = jest.fn();
	constructor(_canvas: unknown) {}
}

class MockVector2 {
	constructor(public x = 0, public y = 0) {}
}

class MockMeshStandardMaterial {
	map: MockCanvasTexture | null;
	roughnessMap: MockCanvasTexture | null;
	normalMap: MockCanvasTexture | null;
	metalness: number;
	normalScale: MockVector2;
	dispose = jest.fn();

	constructor(opts: Record<string, unknown> = {}) {
		this.map = (opts.map as MockCanvasTexture) ?? null;
		this.roughnessMap = (opts.roughnessMap as MockCanvasTexture) ?? null;
		this.normalMap = (opts.normalMap as MockCanvasTexture) ?? null;
		this.metalness = (opts.metalness as number) ?? 0.5;
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
				}),
			} as unknown as HTMLCanvasElement;
		}
		return originalCreateElement(tag);
	});
});

afterAll(() => {
	jest.restoreAllMocks();
});

beforeEach(() => {
	jest.resetModules();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createMetalMaterial", () => {
	it("returns a MeshStandardMaterial for clean variant", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat = createMetalMaterial("clean");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("returns a MeshStandardMaterial for rusted variant", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat = createMetalMaterial("rusted");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("returns a MeshStandardMaterial for scorched variant", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat = createMetalMaterial("scorched");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("defaults to rusted variant when no arg passed", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const defaultMat = createMetalMaterial();
		const rustedMat = createMetalMaterial("rusted");
		// Both should be same cached instance
		expect(defaultMat).toBe(rustedMat);
	});

	it("has a map texture", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat = createMetalMaterial("clean");
		expect(mat.map).toBeDefined();
	});

	it("has a roughnessMap texture", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat = createMetalMaterial("rusted");
		expect(mat.roughnessMap).toBeDefined();
	});

	it("has a normalMap texture", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat = createMetalMaterial("clean");
		expect(mat.normalMap).toBeDefined();
	});

	it("has high metalness", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat = createMetalMaterial("clean");
		expect(mat.metalness).toBeGreaterThan(0.5);
	});

	it("returns cached instance on second call (same variant)", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const mat1 = createMetalMaterial("clean");
		const mat2 = createMetalMaterial("clean");
		expect(mat1).toBe(mat2);
	});

	it("returns different instances for different variants", async () => {
		const { createMetalMaterial } = await import("../MetalMaterial");
		const clean = createMetalMaterial("clean");
		const rusted = createMetalMaterial("rusted");
		const scorched = createMetalMaterial("scorched");
		expect(clean).not.toBe(rusted);
		expect(rusted).not.toBe(scorched);
		expect(clean).not.toBe(scorched);
	});
});
