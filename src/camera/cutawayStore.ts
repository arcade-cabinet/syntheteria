/**
 * cutawayStore — module-level state for dollhouse cutaway clipping.
 *
 * When the camera zooms close enough, geometry above cutawayY is clipped
 * so the player can see into multi-level structures without pushing
 * through ceilings. The depth layer baseY values (0, 1, 2) define
 * natural slice boundaries.
 *
 * Usage:
 *   - IsometricCamera updates cutawayY each frame based on zoom distance
 *   - Renderers read the clipping plane via getCutawayPlane()
 *   - The plane normal is (0, -1, 0) — clips everything ABOVE cutawayY
 */

import * as THREE from "three";

/** Camera distance below which cutaway begins. */
export const CUTAWAY_START_DISTANCE = 35;

/** Camera distance at maximum cutaway (lowest slice). */
export const CUTAWAY_END_DISTANCE = 20;

/** Maximum Y height when cutaway is fully off (no clipping). */
const CUTAWAY_OFF_Y = 100;

/** Y slice boundaries matching depth layer baseY values.
 *  At moderate zoom: cut at layer 2 (Y=2). At close zoom: cut at layer 1 (Y=1).
 *  At closest: cut at layer 0 ceiling (Y=0.5). */
const SLICE_LEVELS = [3.0, 2.0, 1.0, 0.5];

/** The global clipping plane — reused every frame (no allocation). */
const cutawayPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUTAWAY_OFF_Y);

/** Current cutaway Y threshold. Infinity = no cutaway. */
let currentCutawayY = CUTAWAY_OFF_Y;

/**
 * Update cutaway based on camera distance from target.
 * Called each frame by the camera component.
 */
export function updateCutaway(cameraDistance: number): void {
	if (cameraDistance >= CUTAWAY_START_DISTANCE) {
		// No cutaway at far zoom
		currentCutawayY = CUTAWAY_OFF_Y;
	} else if (cameraDistance <= CUTAWAY_END_DISTANCE) {
		// Maximum cutaway — lowest slice
		currentCutawayY = SLICE_LEVELS[SLICE_LEVELS.length - 1];
	} else {
		// Interpolate between slice levels based on zoom
		const t = 1 - (cameraDistance - CUTAWAY_END_DISTANCE) /
			(CUTAWAY_START_DISTANCE - CUTAWAY_END_DISTANCE);
		// t goes from 0 (far) to 1 (close)
		const sliceIndex = Math.min(
			SLICE_LEVELS.length - 1,
			Math.floor(t * SLICE_LEVELS.length),
		);
		currentCutawayY = SLICE_LEVELS[sliceIndex];
	}

	cutawayPlane.constant = currentCutawayY;
}

/** Get the current clipping plane. Shared reference — do not modify. */
export function getCutawayPlane(): THREE.Plane {
	return cutawayPlane;
}

/** Get the current cutaway Y value. */
export function getCutawayY(): number {
	return currentCutawayY;
}

/** Whether cutaway is currently active (clipping something). */
export function isCutawayActive(): boolean {
	return currentCutawayY < CUTAWAY_OFF_Y;
}
