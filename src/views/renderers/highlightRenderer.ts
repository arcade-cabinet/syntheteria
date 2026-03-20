/**
 * highlightRenderer — renders tile highlights for reachable moves and attack targets.
 *
 * Maintains a pool of flat plane meshes with emissive transparent material.
 * showHighlights() positions planes at the given tile coordinates.
 * clearHighlights() hides all planes.
 *
 * Planes sit at y = 0.05 (just above terrain, below fog and selection ring).
 */

import * as THREE from "three";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

const INITIAL_POOL_SIZE = 64;
const HIGHLIGHT_Y = 0.05;

let pool: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>[] = [];
let parentScene: THREE.Scene | null = null;
let sharedMaterial: THREE.MeshStandardMaterial | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createHighlightPlane(): THREE.Mesh<
	THREE.PlaneGeometry,
	THREE.MeshStandardMaterial
> {
	if (!sharedMaterial) {
		sharedMaterial = new THREE.MeshStandardMaterial({
			color: 0x00ff88,
			emissive: 0x00ff88,
			emissiveIntensity: 0.6,
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
	}

	const geo = new THREE.PlaneGeometry(1.6, 1.6);
	geo.rotateX(-Math.PI / 2);

	const mesh = new THREE.Mesh(geo, sharedMaterial.clone());
	mesh.position.y = HIGHLIGHT_Y;
	mesh.visible = false;
	mesh.renderOrder = 5;
	return mesh;
}

function ensurePoolSize(count: number): void {
	while (pool.length < count) {
		const plane = createHighlightPlane();
		if (parentScene) parentScene.add(plane);
		pool.push(plane);
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the highlight system and pre-allocate the mesh pool.
 */
export function createHighlightRenderer(scene: THREE.Scene): void {
	parentScene = scene;
	pool = [];

	for (let i = 0; i < INITIAL_POOL_SIZE; i++) {
		const plane = createHighlightPlane();
		plane.visible = false;
		scene.add(plane);
		pool.push(plane);
	}
}

/**
 * Show highlight planes at the given tile coordinates with the specified color.
 * Grows the pool automatically if needed.
 */
export function showHighlights(
	tiles: { x: number; z: number }[],
	color: number,
): void {
	// First hide all
	clearHighlights();

	// Grow pool if necessary
	ensurePoolSize(tiles.length);

	const threeColor = new THREE.Color(color);

	for (let i = 0; i < tiles.length; i++) {
		const tile = tiles[i];
		const mesh = pool[i];
		const worldPos = tileToWorld(tile.x, tile.z);

		mesh.position.x = worldPos.x;
		mesh.position.z = worldPos.z;
		mesh.position.y = HIGHLIGHT_Y;

		// Update color per-call (allows different colors for move vs attack)
		mesh.material.color.copy(threeColor);
		mesh.material.emissive.copy(threeColor);
		mesh.visible = true;
	}
}

/**
 * Hide all highlight planes.
 */
export function clearHighlights(): void {
	for (const mesh of pool) {
		mesh.visible = false;
	}
}
