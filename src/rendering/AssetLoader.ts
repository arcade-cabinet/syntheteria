/**
 * Asset lazy loading utilities for Syntheteria.
 *
 * Provides:
 *   - loadGLB(path)         — load a GLB model asynchronously (cached)
 *   - loadTexture(path)     — load a texture (cached, quality-tier aware)
 *   - preloadAssets(paths)  — batch preload a list of asset paths
 *   - getLoadProgress()     — 0-1 progress of current preload batch
 *
 * All loads are cached by path so repeated calls are instant.
 * Quality tier affects texture resolution: on "low" tier, textures at
 * 1024+ resolution are downsampled to 512 via an offscreen canvas.
 *
 * Integration: wrap scene sections in React <Suspense fallback={...}>.
 * Call preloadAssets() on game start to warm the cache for critical assets.
 */

import { getQualityTier } from "./QualityTier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GLBAsset {
	/** The raw fetch response blob URL for use with Three.js GLTFLoader. */
	blobUrl: string;
	/** Original path for cache key. */
	path: string;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const glbCache = new Map<string, Promise<GLBAsset>>();
const textureCache = new Map<string, Promise<string>>();

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

let totalPreloads = 0;
let completedPreloads = 0;

/**
 * Get 0-1 progress of the current preload batch.
 * Returns 1 when no preload is active.
 */
export function getLoadProgress(): number {
	if (totalPreloads === 0) return 1;
	return Math.min(completedPreloads / totalPreloads, 1);
}

// ---------------------------------------------------------------------------
// GLB loading
// ---------------------------------------------------------------------------

/**
 * Load a GLB model by path. Returns a cached promise on repeat calls.
 * The returned blobUrl can be passed to Three.js GLTFLoader.
 *
 * @param path - Absolute or relative path to the .glb file.
 */
export function loadGLB(path: string): Promise<GLBAsset> {
	const cached = glbCache.get(path);
	if (cached) return cached;

	const promise = fetch(path)
		.then((res) => {
			if (!res.ok) throw new Error(`Failed to load GLB: ${path} (${res.status})`);
			return res.blob();
		})
		.then((blob) => {
			const blobUrl = URL.createObjectURL(blob);
			return { blobUrl, path } satisfies GLBAsset;
		});

	glbCache.set(path, promise);
	return promise;
}

// ---------------------------------------------------------------------------
// Texture loading (quality-tier aware)
// ---------------------------------------------------------------------------

/**
 * Load a texture by path. Returns a cached object URL.
 * On "low" quality tier, textures wider than MAX_LOW_TEXTURE_SIZE are
 * downsampled via an offscreen canvas before being cached.
 *
 * @param path - Path to image file (.jpg, .png, .webp, .exr, .ktx2).
 */
export function loadTexture(path: string): Promise<string> {
	const cacheKey = `${path}::${getQualityTier()}`;
	const cached = textureCache.get(cacheKey);
	if (cached) return cached;

	const promise = fetch(path)
		.then((res) => {
			if (!res.ok)
				throw new Error(`Failed to load texture: ${path} (${res.status})`);
			return res.blob();
		})
		.then(async (blob) => {
			const tier = getQualityTier();

			// EXR / KTX2 are passed through — Three.js handles these natively
			if (
				path.endsWith(".exr") ||
				path.endsWith(".ktx2") ||
				path.endsWith(".basis")
			) {
				return URL.createObjectURL(blob);
			}

			// For low tier, downsample large textures
			if (tier === "low") {
				return downsampleTexture(blob, 512);
			}
			if (tier === "medium") {
				return downsampleTexture(blob, 1024);
			}

			return URL.createObjectURL(blob);
		});

	textureCache.set(cacheKey, promise);
	return promise;
}

/**
 * Downsample an image blob to maxSize × maxSize using OffscreenCanvas.
 * Falls through to a plain object URL if OffscreenCanvas is unavailable
 * (e.g. in Jest / non-browser environments).
 */
async function downsampleTexture(
	blob: Blob,
	maxSize: number,
): Promise<string> {
	if (typeof OffscreenCanvas === "undefined") {
		// Non-browser environment (tests, SSR): return original blob
		return URL.createObjectURL(blob);
	}

	const bitmap = await createImageBitmap(blob);
	const w = Math.min(bitmap.width, maxSize);
	const h = Math.min(bitmap.height, maxSize);

	const canvas = new OffscreenCanvas(w, h);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		bitmap.close();
		return URL.createObjectURL(blob);
	}

	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();

	const outBlob = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
	return URL.createObjectURL(outBlob);
}

// ---------------------------------------------------------------------------
// Batch preload
// ---------------------------------------------------------------------------

/**
 * Preload a list of asset paths concurrently. Progress is tracked via
 * getLoadProgress(). GLB and texture paths are auto-detected by extension.
 *
 * @param paths - Array of asset paths to warm into the cache.
 * @returns Promise that resolves when all assets are loaded (or failed).
 */
export async function preloadAssets(paths: string[]): Promise<void> {
	if (paths.length === 0) return;

	totalPreloads = paths.length;
	completedPreloads = 0;

	const promises = paths.map((path) => {
		const isGLB = path.endsWith(".glb") || path.endsWith(".gltf");
		const loader = isGLB ? loadGLB(path) : loadTexture(path);

		return loader
			.catch((err) => {
				// Log but don't fail the whole batch on one missing asset
				console.warn(`[AssetLoader] Failed to preload: ${path}`, err);
			})
			.finally(() => {
				completedPreloads++;
			});
	});

	await Promise.allSettled(promises);

	// Reset after batch completes
	totalPreloads = 0;
	completedPreloads = 0;
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

/**
 * Revoke cached object URLs and clear caches. Call when unloading a scene
 * to avoid memory leaks.
 */
export async function clearAssetCache(): Promise<void> {
	for (const promise of glbCache.values()) {
		const asset = await promise.catch(() => null);
		if (asset) URL.revokeObjectURL(asset.blobUrl);
	}
	glbCache.clear();

	for (const promise of textureCache.values()) {
		const url = await promise.catch(() => null);
		if (url) URL.revokeObjectURL(url);
	}
	textureCache.clear();
}

/**
 * Get current cache sizes (for debugging / dev tools).
 */
export function getCacheStats(): { glb: number; texture: number } {
	return { glb: glbCache.size, texture: textureCache.size };
}
