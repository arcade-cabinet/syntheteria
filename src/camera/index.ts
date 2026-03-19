/**
 * src/camera — game camera subpackage.
 *
 * SphereOrbitCamera: sphere world orbit camera (Planetary Annihilation style).
 *
 * Use CameraControls (via controlsRef) for programmatic moves (panTo, snapTo, etc.)
 */

export { SphereOrbitCamera } from "./SphereOrbitCamera";
export type { CameraControls } from "./types";

export {
	registerCameraControls,
	unregisterCameraControls,
	getCameraControls,
} from "./cameraStore";

export {
	CUTAWAY_START_DISTANCE,
	CUTAWAY_END_DISTANCE,
	updateCutaway,
	getCutawayPlane,
	getCutawayY,
	isCutawayActive,
} from "./cutawayStore";
