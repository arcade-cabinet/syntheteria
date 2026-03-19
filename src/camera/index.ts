/**
 * src/camera — game camera subpackage.
 *
 * SphereOrbitCamera: sphere world orbit camera (Planetary Annihilation style).
 *
 * Use CameraControls (via controlsRef) for programmatic moves (panTo, snapTo, etc.)
 */

export {
	getCameraControls,
	registerCameraControls,
	unregisterCameraControls,
} from "./cameraStore";
export {
	CUTAWAY_END_DISTANCE,
	CUTAWAY_START_DISTANCE,
	getCutawayPlane,
	getCutawayY,
	isCutawayActive,
	updateCutaway,
} from "./cutawayStore";
export { SphereOrbitCamera } from "./SphereOrbitCamera";
export type { CameraControls } from "./types";
