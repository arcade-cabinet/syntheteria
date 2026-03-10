/**
 * Held cube position synchronization.
 *
 * When the player is holding a cube (via the grabber system), this
 * module updates the cube's position to track the camera with a
 * configurable forward and downward offset.
 *
 * Also provides a carry speed multiplier — holding a cube slows the
 * player down.
 *
 * Uses callback-based API: callers provide getHeldCube and setCubePosition
 * so this module stays decoupled from the ECS and physics layers.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface CameraState {
	position: Vec3;
	forward: Vec3;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Forward offset distance in meters (cube floats this far ahead of camera). */
export const CARRY_FORWARD_OFFSET = 1.5;

/** Downward offset in meters (cube hangs this far below camera center). */
export const CARRY_DOWN_OFFSET = 0.3;

/** Default speed multiplier when carrying a cube (from botMovement.json). */
export const DEFAULT_CARRY_SPEED_MULTIPLIER = 0.6;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Update the held cube's world position to follow the camera.
 *
 * If getHeldCube returns null, no update is performed.
 * Otherwise, the cube is positioned at:
 *   camera.position + camera.forward * CARRY_FORWARD_OFFSET - (0, CARRY_DOWN_OFFSET, 0)
 *
 * @param camera - current camera state (position + forward direction)
 * @param getHeldCube - returns the held cube ID or null
 * @param setCubePosition - callback to set a cube's world position
 */
export function updateHeldCubePosition(
	camera: CameraState,
	getHeldCube: () => string | null,
	setCubePosition: (id: string, pos: Vec3) => void,
): void {
	const cubeId = getHeldCube();
	if (cubeId === null) {
		return;
	}

	const pos: Vec3 = {
		x: camera.position.x + camera.forward.x * CARRY_FORWARD_OFFSET,
		y:
			camera.position.y +
			camera.forward.y * CARRY_FORWARD_OFFSET -
			CARRY_DOWN_OFFSET,
		z: camera.position.z + camera.forward.z * CARRY_FORWARD_OFFSET,
	};

	setCubePosition(cubeId, pos);
}

/**
 * Get the movement speed multiplier based on carry state.
 *
 * @param isCarrying - whether the player is currently holding a cube
 * @param multiplier - optional custom multiplier (defaults to DEFAULT_CARRY_SPEED_MULTIPLIER)
 * @returns 1.0 if not carrying, otherwise the carry multiplier
 */
export function getCarrySpeedMultiplier(
	isCarrying: boolean,
	multiplier: number = DEFAULT_CARRY_SPEED_MULTIPLIER,
): number {
	if (!isCarrying) {
		return 1.0;
	}
	return multiplier;
}
