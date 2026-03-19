/**
 * cameraStore — module-level camera controls registration.
 *
 * The IsometricCamera registers itself here on mount so external
 * components (Minimap, etc.) can call panTo without R3F context.
 */

import type { CameraControls } from "./types";

let currentControls: CameraControls | null = null;

export function registerCameraControls(ctrl: CameraControls): void {
	currentControls = ctrl;
}

export function unregisterCameraControls(): void {
	currentControls = null;
}

export function getCameraControls(): CameraControls | null {
	return currentControls;
}
