/**
 * Camera package — public types.
 *
 * CameraControls is the imperative API surface exposed via useCameraControls().
 * Components mount TopDownCamera into the R3F Canvas; the ref gives them
 * programmatic control without needing to reach inside the component.
 */

export interface CameraControls {
	/**
	 * Smoothly pan the orbit target to (x, 0, z) in world space.
	 * Uses damping — call each frame or let it coast.
	 */
	panTo(x: number, z: number): void;

	/**
	 * Instantly snap camera target to (x, 0, z) — no lerp.
	 * Use for initial placement or scene cuts.
	 */
	snapTo(x: number, z: number): void;

	/**
	 * Set the camera distance from target (zoom level).
	 * Clamped to [MIN_ZOOM, MAX_ZOOM] internally.
	 */
	setZoom(distance: number): void;

	/**
	 * Reset to default position centred on (x, z).
	 * Restores default elevation angle and distance.
	 */
	reset(centerX: number, centerZ: number): void;
}
