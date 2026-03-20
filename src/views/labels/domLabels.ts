/**
 * domLabels — projects 3D world positions to screen-space for DOM label positioning.
 *
 * This module does NOT create DOM elements. React creates them; this module
 * positions them by projecting world coordinates through the camera.
 *
 * CivRev2-style DOM labels over in-canvas text.
 *
 * Pure Three.js math — no React dependency.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A DOM element paired with a 3D world position.
 * React creates and owns the element; this module just moves it.
 */
export interface DomMarker {
	element: HTMLElement;
	worldPos: THREE.Vector3;
}

// ---------------------------------------------------------------------------
// Reusable scratch vector (avoids allocation per marker per frame)
// ---------------------------------------------------------------------------

const _projected = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Project each marker's worldPos through the camera and set CSS transform
 * to position the DOM element on screen.
 *
 * Markers behind the camera (NDC z > 1) are hidden.
 */
export function updateDomLabels(
	markers: DomMarker[],
	camera: THREE.Camera,
	canvasWidth: number,
	canvasHeight: number,
): void {
	for (const marker of markers) {
		_projected.copy(marker.worldPos);
		_projected.project(camera);

		// Behind camera — hide
		if (_projected.z > 1) {
			marker.element.style.display = "none";
			continue;
		}

		// NDC → screen pixels
		const screenX = ((_projected.x + 1) / 2) * canvasWidth;
		const screenY = ((1 - _projected.y) / 2) * canvasHeight;

		marker.element.style.display = "";
		marker.element.style.transform = `translate(-50%, -100%) translate(${screenX}px, ${screenY}px)`;
	}
}
