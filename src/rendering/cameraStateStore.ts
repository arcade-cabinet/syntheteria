/**
 * Camera state — writable without R3F. TopDownCamera (web) syncs here.
 * R3F-only; no Filament/snapshot.
 */

export interface SceneCamera {
	position: [number, number, number];
	target?: [number, number, number];
	fov: number;
	near: number;
	far: number;
}

let current: SceneCamera = {
	position: [0, 20, 20],
	target: [0, 0, 0],
	fov: 45,
	near: 0.1,
	far: 2000,
};

export function getCameraState(): SceneCamera {
	return { ...current };
}

export function setCameraState(state: SceneCamera): void {
	current = { ...state };
}
