/**
 * @jest-environment jsdom
 *
 * Tests for TerrainMaterial — procedural terrain PBR for machine-planet zones.
 *
 * THREE.CanvasTexture is mocked. Tests cover:
 * - All zone variants (foundry, slag, cable, processor)
 * - Fallback for unknown zones
 * - Cache behavior
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
	color: unknown;
	dispose = jest.fn();

	constructor(opts: Record<string, unknown> = {}) {
		this.map = (opts.map as MockCanvasTexture) ?? null;
		this.emissiveMap = (opts.emissiveMap as MockCanvasTexture) ?? null;
		this.emissive = (opts.emissive as MockColor) ?? null;
		this.emissiveIntensity = (opts.emissiveIntensity as number) ?? 0;
		this.roughness = (opts.roughness as number) ?? 0.5;
		this.metalness = (opts.metalness as number) ?? 0.5;
		this.color = opts.color ?? null;
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

describe("createTerrainMaterial", () => {
	it("returns a MeshStandardMaterial for foundry zone", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("foundry");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("returns a MeshStandardMaterial for slag zone", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("slag");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("returns a MeshStandardMaterial for cable zone", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("cable");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("returns a MeshStandardMaterial for processor zone", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("processor");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("returns a MeshStandardMaterial for unknown zone (fallback)", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("unknown_zone");
		expect(mat).toBeInstanceOf(MockMeshStandardMaterial);
	});

	it("slag zone has emissiveMap (heat-glow cracks)", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("slag");
		expect(mat.emissiveMap).toBeDefined();
	});

	it("slag zone has emissiveIntensity > 0", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("slag");
		expect(mat.emissiveIntensity).toBeGreaterThan(0);
	});

	it("foundry zone has no emissiveMap", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat = createTerrainMaterial("foundry");
		expect(mat.emissiveMap).toBeNull();
	});

	it("returns cached instance on second call (same zone)", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat1 = createTerrainMaterial("foundry");
		const mat2 = createTerrainMaterial("foundry");
		expect(mat1).toBe(mat2);
	});

	it("returns different instances for different zones", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const foundry = createTerrainMaterial("foundry");
		const slag = createTerrainMaterial("slag");
		expect(foundry).not.toBe(slag);
	});

	it("unknown zone is cached after first call", async () => {
		const { createTerrainMaterial } = await import("../TerrainMaterial");
		const mat1 = createTerrainMaterial("unknown_zone");
		const mat2 = createTerrainMaterial("unknown_zone");
		expect(mat1).toBe(mat2);
	});
});
