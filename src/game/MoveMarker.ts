/**
 * MoveMarker — temporary visual ring at click-to-move destination.
 *
 * Shows a blue torus at the world position where the player clicked
 * to issue a move command. Fades out and self-disposes after 1.5s.
 */

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

let activeMarker: Mesh | null = null;
let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Show a temporary move-destination ring at (worldX, worldZ).
 * Disposes any previous marker before creating a new one.
 */
export function showMoveMarker(
	scene: Scene,
	worldX: number,
	worldZ: number,
): void {
	// Remove existing marker
	if (activeMarker) {
		activeMarker.dispose();
		activeMarker = null;
	}
	if (fadeTimeout) {
		clearTimeout(fadeTimeout);
	}

	// Create ring at destination
	const ring = MeshBuilder.CreateTorus(
		"move-marker",
		{
			diameter: 2,
			thickness: 0.15,
			tessellation: 24,
		},
		scene,
	);
	ring.position = new Vector3(worldX, 0.2, worldZ);
	ring.isPickable = false;

	const mat = new StandardMaterial("move-marker-mat", scene);
	mat.diffuseColor = new Color3(0.3, 0.7, 1);
	mat.emissiveColor = new Color3(0.15, 0.35, 0.5);
	mat.alpha = 0.8;
	ring.material = mat;

	activeMarker = ring;

	// Fade out and dispose after 1.5s
	fadeTimeout = setTimeout(() => {
		if (activeMarker) {
			activeMarker.dispose();
			activeMarker = null;
		}
	}, 1500);
}
