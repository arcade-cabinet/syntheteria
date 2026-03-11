/**
 * @jest-environment jsdom
 *
 * Tests for CircuitMaterial — procedural circuit board PBR material.
 *
 * THREE.CanvasTexture is mocked. Tests cover:
 * - Material construction (powered / unpowered)
 * - Caching behavior
 * - Emissive glow when powered
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

class MockColor {
	r = 1; g = 1; b = 1;
	constructor(_c?: string | number) {}
}

class MockMeshStandardMaterial {
	map: MockCanvasTexture | null;
	emissiveMap: MockCanvasTexture | null;
	emissive: MockColor | null;
	emissiveIntensity: number;
	roughness: number;
	metalness: number;
	dispose = jest.fn();

	constructor(opts: Record<string, unknown> = {}) {
		this.map = (opts.map as MockCanvasTexture) ?? null;
		this.emissiveMap = (opts.emissiveMap as MockCanvasTexture) ?? null;
		this.emissive = (opts.emissive as MockColor) ?? null;
		this.emissiveIntensity = (opts.emissiveIntensity as number) ?? 0;
		this.roughness = (opts.roughness as number) ?? 0.5;
		this.metalness = (opts.metalness as number) ?? 0.5;
	}
}

jest.mock("three", () => ({
	MeshStandardMaterial: MockMeshStandardMaterial,
	CanvasTexture: MockCanvasTexture,
	Color: MockColor,
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

describe("createCircuitMaterial (unpowered)", () => {
	it("returns a MeshStandardMaterial", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial(false);
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("has a map texture", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial(false);
		expect(mat.map).toBeDefined();
	});

	it("does not have emissiveMap when unpowered", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial(false);
		expect(mat.emissiveMap).toBeNull();
	});

	it("emissiveIntensity is 0 when unpowered", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial(false);
		expect(mat.emissiveIntensity).toBe(0);
	});

	it("returns cached instance on second call", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat1 = createCircuitMaterial(false);
		const mat2 = createCircuitMaterial(false);
		expect(mat1).toBe(mat2);
	});
});

describe("createCircuitMaterial (powered)", () => {
	it("returns a MeshStandardMaterial", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial(true);
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("has an emissiveMap when powered", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial(true);
		expect(mat.emissiveMap).toBeDefined();
	});

	it("has emissiveIntensity > 0 when powered", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial(true);
		expect(mat.emissiveIntensity).toBeGreaterThan(0);
	});

	it("has a different instance from unpowered", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const powered = createCircuitMaterial(true);
		const unpowered = createCircuitMaterial(false);
		expect(powered).not.toBe(unpowered);
	});

	it("returns cached instance on second call (powered)", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat1 = createCircuitMaterial(true);
		const mat2 = createCircuitMaterial(true);
		expect(mat1).toBe(mat2);
	});
});

describe("createCircuitMaterial (default arg)", () => {
	it("defaults to unpowered", async () => {
		const { createCircuitMaterial } = await import("../CircuitMaterial");
		const mat = createCircuitMaterial();
		expect(mat.emissiveIntensity).toBe(0);
	});
});
