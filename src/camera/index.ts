/**
 * src/camera — game camera subpackage.
 *
 * IsometricCamera: legacy flat-board PAN camera (CivRev2 style).
 * SphereOrbitCamera: sphere world orbit camera (Planetary Annihilation style).
 *
 * Use CameraControls (via controlsRef) for programmatic moves (panTo, snapTo, etc.)
 */

export { IsometricCamera } from "./IsometricCamera";
export { SphereOrbitCamera } from "./SphereOrbitCamera";
export type { CameraControls } from "./types";
