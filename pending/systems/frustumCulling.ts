/**
 * Frustum Culling System — camera-aware visibility filtering.
 *
 * Provides utilities for renderers to determine which objects are
 * within the camera's view frustum before spending draw calls on them.
 *
 * This is a PURE system — no rendering, no Three.js scene graph.
 * Renderers call `updateFrustum()` each frame from their useFrame
 * callback, then use `isInFrustum()` to test world-space positions.
 *
 * Uses a simplified 2D AABB test against the camera's projected
 * ground-plane rectangle — faster than full 3D frustum checks and
 * sufficient for a top-down camera with limited tilt.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FrustumBounds {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

/** Padding in world units beyond the visible frustum to avoid pop-in */
const FRUSTUM_PADDING = 5;

let currentBounds: FrustumBounds = {
	minX: -100,
	maxX: 100,
	minZ: -100,
	maxZ: 100,
};

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Update the frustum bounds from the camera's current state.
 * Call once per frame from a renderer's useFrame callback.
 *
 * @param cameraX - Camera world X position
 * @param cameraZ - Camera world Z position
 * @param cameraHeight - Camera Y height above ground
 * @param fov - Camera field of view in degrees (default 45)
 * @param aspect - Viewport aspect ratio (default 16/9)
 */
export function updateFrustum(
	cameraX: number,
	cameraZ: number,
	cameraHeight: number,
	fov: number = 45,
	aspect: number = 16 / 9,
): void {
	const halfFovRad = ((fov / 2) * Math.PI) / 180;
	const visibleHeight = 2 * cameraHeight * Math.tan(halfFovRad);
	const visibleWidth = visibleHeight * aspect;

	const halfW = visibleWidth / 2 + FRUSTUM_PADDING;
	const halfH = visibleHeight / 2 + FRUSTUM_PADDING;

	currentBounds = {
		minX: cameraX - halfW,
		maxX: cameraX + halfW,
		minZ: cameraZ - halfH,
		maxZ: cameraZ + halfH,
	};

	notify();
}

/**
 * Test if a world-space position is within the current frustum bounds.
 */
export function isInFrustum(worldX: number, worldZ: number): boolean {
	return (
		worldX >= currentBounds.minX &&
		worldX <= currentBounds.maxX &&
		worldZ >= currentBounds.minZ &&
		worldZ <= currentBounds.maxZ
	);
}

/**
 * Test if a world-space AABB overlaps the current frustum bounds.
 */
export function isAABBInFrustum(
	minX: number,
	minZ: number,
	maxX: number,
	maxZ: number,
): boolean {
	return (
		maxX >= currentBounds.minX &&
		minX <= currentBounds.maxX &&
		maxZ >= currentBounds.minZ &&
		minZ <= currentBounds.maxZ
	);
}

/**
 * Get the squared distance from a point to the camera center.
 * Useful for LOD distance calculations without sqrt overhead.
 */
export function distanceSquaredToCamera(
	worldX: number,
	worldZ: number,
): number {
	const cx = (currentBounds.minX + currentBounds.maxX) / 2;
	const cz = (currentBounds.minZ + currentBounds.maxZ) / 2;
	const dx = worldX - cx;
	const dz = worldZ - cz;
	return dx * dx + dz * dz;
}

/**
 * Get the current frustum bounds.
 */
export function getFrustumBounds(): FrustumBounds {
	return currentBounds;
}

/**
 * Subscribe to frustum updates.
 */
export function subscribeFrustum(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Reset frustum state — call on new game.
 */
export function resetFrustum(): void {
	currentBounds = {
		minX: -100,
		maxX: 100,
		minZ: -100,
		maxZ: 100,
	};
	notify();
}
