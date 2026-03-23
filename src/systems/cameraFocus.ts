/**
 * Camera Focus System — centralized camera target requests.
 *
 * Provides a module-level store that TopDownCamera reads each frame
 * to smoothly pan/zoom to a requested world position.
 *
 * Used by:
 *   - UnitRosterPanel: click a unit -> camera pans to it
 *   - AI turn visualization: camera briefly pans to visible AI actions
 *   - Any system that needs to direct the player's attention
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CameraFocusRequest {
	/** Target world position */
	x: number;
	z: number;
	/** Optional zoom level (camera Y height). Null = keep current. */
	zoom: number | null;
	/** Duration in seconds for the transition (default 0.5) */
	duration: number;
	/** Timestamp when the request was made */
	requestedAt: number;
}

// ─── State ──────────────────────────────────────────────────────────────────

let pendingFocus: CameraFocusRequest | null = null;
let activeFocus: {
	request: CameraFocusRequest;
	startX: number;
	startZ: number;
	startZoom: number;
	elapsed: number;
} | null = null;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Request the camera to smoothly pan to a world position.
 * Calling this while a previous focus is active replaces it.
 */
export function requestCameraFocus(
	x: number,
	z: number,
	zoom: number | null = null,
	duration = 0.5,
) {
	pendingFocus = {
		x,
		z,
		zoom,
		duration,
		requestedAt: performance.now(),
	};
	// Clear any in-progress focus so the new one takes over
	activeFocus = null;
}

/**
 * Called by TopDownCamera each frame. Returns the interpolated target
 * position and zoom if a focus transition is active, or null if idle.
 */
export function updateCameraFocus(
	currentX: number,
	currentZ: number,
	currentZoom: number,
	deltaTime: number,
): { x: number; z: number; zoom: number; done: boolean } | null {
	// Promote pending to active
	if (pendingFocus) {
		activeFocus = {
			request: pendingFocus,
			startX: currentX,
			startZ: currentZ,
			startZoom: currentZoom,
			elapsed: 0,
		};
		pendingFocus = null;
	}

	if (!activeFocus) return null;

	activeFocus.elapsed += deltaTime;
	const { request, startX, startZ, startZoom, elapsed } = activeFocus;
	const t = Math.min(1, elapsed / Math.max(request.duration, 0.01));

	// Smooth ease-out cubic
	const eased = 1 - (1 - t) * (1 - t) * (1 - t);

	const x = startX + (request.x - startX) * eased;
	const z = startZ + (request.z - startZ) * eased;
	const targetZoom = request.zoom ?? currentZoom;
	const zoom = startZoom + (targetZoom - startZoom) * eased;

	const done = t >= 1;
	if (done) {
		activeFocus = null;
	}

	return { x, z, zoom, done };
}

/**
 * Cancel any active or pending camera focus.
 */
export function cancelCameraFocus() {
	pendingFocus = null;
	activeFocus = null;
}

/**
 * Check if a camera focus transition is currently active.
 */
export function isCameraFocusActive(): boolean {
	return activeFocus !== null || pendingFocus !== null;
}

/**
 * Reset for testing.
 */
export function _resetCameraFocus() {
	pendingFocus = null;
	activeFocus = null;
}
