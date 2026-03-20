/**
 * pathPreview — renderer-agnostic A* path preview state for move hover.
 *
 * BoardInput (R3F) and PathRenderer subscribe to the same store. Phaser board
 * input can call these without importing `view/`.
 */

export interface PathPoint {
	tileX: number;
	tileZ: number;
	elevation: number;
}

let currentPath: PathPoint[] = [];
let pathVersion = 0;
const pathListeners = new Set<() => void>();

function notifyPathListeners(): void {
	for (const fn of pathListeners) fn();
}

/** Set preview path when hovering a reachable destination tile. */
export function setPreviewPath(path: PathPoint[]): void {
	currentPath = path;
	pathVersion++;
	notifyPathListeners();
}

/** Clear preview (deselect, leave tile, confirm move). */
export function clearPreviewPath(): void {
	if (currentPath.length === 0) return;
	currentPath = [];
	pathVersion++;
	notifyPathListeners();
}

export function getPreviewPath(): PathPoint[] {
	return currentPath;
}

export function getPathVersion(): number {
	return pathVersion;
}

export function subscribePathState(fn: () => void): () => void {
	pathListeners.add(fn);
	return () => pathListeners.delete(fn);
}
