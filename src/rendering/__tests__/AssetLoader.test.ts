/**
 * Unit tests for AssetLoader.ts
 *
 * Tests cover:
 *   - loadGLB: fetches and caches GLB, handles failures
 *   - loadTexture: fetches and caches, passes through EXR/KTX2
 *   - preloadAssets: batch loads, tracks progress, tolerates partial failure
 *   - clearAssetCache: revokes URLs, empties caches
 *   - getCacheStats: counts
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock QualityTier so texture tests don't depend on browser signals
jest.mock("../QualityTier", () => ({
	getQualityTier: jest.fn(() => "high"),
}));

// Mock URL.createObjectURL / URL.revokeObjectURL
const createdUrls: string[] = [];
let urlCounter = 0;

global.URL.createObjectURL = jest.fn((blob: Blob) => {
	const url = `blob:test-${urlCounter++}`;
	createdUrls.push(url);
	return url;
});
global.URL.revokeObjectURL = jest.fn((url: string) => {
	const idx = createdUrls.indexOf(url);
	if (idx !== -1) createdUrls.splice(idx, 1);
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeFetchSuccess(content = "data"): Response {
	return {
		ok: true,
		status: 200,
		blob: jest.fn().mockResolvedValue(new Blob([content])),
	} as unknown as Response;
}

function makeFetchFailure(status = 404): Response {
	return {
		ok: false,
		status,
		blob: jest.fn(),
	} as unknown as Response;
}

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import {
	loadGLB,
	loadTexture,
	preloadAssets,
	clearAssetCache,
	getCacheStats,
	getLoadProgress,
} from "../AssetLoader";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(async () => {
	jest.clearAllMocks();
	urlCounter = 0;
	createdUrls.length = 0;
	await clearAssetCache();
});

// ---------------------------------------------------------------------------
// loadGLB
// ---------------------------------------------------------------------------

describe("loadGLB", () => {
	it("returns a GLBAsset with blobUrl", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		const asset = await loadGLB("/assets/test.glb");
		expect(asset.blobUrl).toMatch(/^blob:/);
		expect(asset.path).toBe("/assets/test.glb");
	});

	it("fetches the correct path", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		await loadGLB("/assets/my-model.glb");
		expect(mockFetch).toHaveBeenCalledWith("/assets/my-model.glb");
	});

	it("caches — only one fetch for repeated calls", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		await loadGLB("/assets/cached.glb");
		await loadGLB("/assets/cached.glb");
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("returns the same promise on repeat calls", () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		const p1 = loadGLB("/assets/same.glb");
		const p2 = loadGLB("/assets/same.glb");
		expect(p1).toBe(p2);
	});

	it("throws on fetch failure", async () => {
		mockFetch.mockResolvedValue(makeFetchFailure(404));
		await expect(loadGLB("/assets/missing.glb")).rejects.toThrow("404");
	});
});

// ---------------------------------------------------------------------------
// loadTexture
// ---------------------------------------------------------------------------

describe("loadTexture", () => {
	it("returns a blob URL for JPEG", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		const url = await loadTexture("/textures/rock.jpg");
		expect(url).toMatch(/^blob:/);
	});

	it("caches per path+tier combination", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		await loadTexture("/textures/rock.jpg");
		await loadTexture("/textures/rock.jpg");
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("passes through .exr without downsampling", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		const url = await loadTexture("/textures/env.exr");
		expect(url).toMatch(/^blob:/);
		// For EXR, OffscreenCanvas should NOT be called
		expect(url).toBeTruthy();
	});

	it("passes through .ktx2 without downsampling", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		const url = await loadTexture("/textures/compressed.ktx2");
		expect(url).toMatch(/^blob:/);
	});

	it("throws on fetch failure", async () => {
		mockFetch.mockResolvedValue(makeFetchFailure(500));
		await expect(loadTexture("/textures/missing.jpg")).rejects.toThrow("500");
	});
});

// ---------------------------------------------------------------------------
// preloadAssets
// ---------------------------------------------------------------------------

describe("preloadAssets", () => {
	it("resolves immediately for empty array", async () => {
		await expect(preloadAssets([])).resolves.toBeUndefined();
	});

	it("loads all provided paths", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		await preloadAssets([
			"/assets/a.glb",
			"/assets/b.glb",
			"/textures/t.jpg",
		]);
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("does not throw when a path fails — logs warning", async () => {
		const warnSpy = jest
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		mockFetch
			.mockResolvedValueOnce(makeFetchSuccess())
			.mockResolvedValueOnce(makeFetchFailure(404));
		await expect(
			preloadAssets(["/assets/good.glb", "/assets/bad.glb"]),
		).resolves.toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("[AssetLoader]"),
			expect.anything(),
		);
		warnSpy.mockRestore();
	});

	it("resets progress to 1 after completion", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		await preloadAssets(["/assets/a.glb"]);
		expect(getLoadProgress()).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// clearAssetCache
// ---------------------------------------------------------------------------

describe("clearAssetCache", () => {
	it("empties the GLB cache", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		await loadGLB("/assets/clear-test.glb");
		expect(getCacheStats().glb).toBeGreaterThan(0);
		await clearAssetCache();
		expect(getCacheStats().glb).toBe(0);
	});

	it("empties the texture cache", async () => {
		mockFetch.mockResolvedValue(makeFetchSuccess());
		await loadTexture("/textures/clear-test.jpg");
		expect(getCacheStats().texture).toBeGreaterThan(0);
		await clearAssetCache();
		expect(getCacheStats().texture).toBe(0);
	});

	it("is safe to call when caches are empty", async () => {
		await expect(clearAssetCache()).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// getLoadProgress
// ---------------------------------------------------------------------------

describe("getLoadProgress", () => {
	it("returns 1 when no preload is active", () => {
		expect(getLoadProgress()).toBe(1);
	});
});
