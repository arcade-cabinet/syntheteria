/**
 * PlacementPreview — translucent ghost cube showing where a held cube will snap.
 *
 * Only visible when the player is holding a cube. Each frame, casts a ray
 * from the camera center through the Rapier physics world, feeds the hit
 * into getPlacementPreview(), and renders a translucent 0.5m cube at the
 * resulting snap position.
 *
 * Green (valid) or red (invalid) depending on placement rules.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { castRay, isPhysicsInitialized } from "../physics/PhysicsWorld";
import { getOccupiedSlots } from "../systems/cubePlacement";
import { getPlacementPreview } from "../systems/cubeStacking";
import { getHeldCube } from "../systems/grabber";
import { GRID_SIZE } from "../systems/gridSnap";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_COLOR = new THREE.Color(0x00ff00);
const INVALID_COLOR = new THREE.Color(0xff0000);
const GHOST_OPACITY = 0.4;

/** Max raycast distance for placement (meters). */
const MAX_PLACEMENT_RANGE = 5.0;

// ---------------------------------------------------------------------------
// Shared geometry + materials (created once, reused)
// ---------------------------------------------------------------------------

const ghostGeometry = new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE);

const validMaterial = new THREE.MeshStandardMaterial({
	color: VALID_COLOR,
	transparent: true,
	opacity: GHOST_OPACITY,
	depthWrite: false,
});

const invalidMaterial = new THREE.MeshStandardMaterial({
	color: INVALID_COLOR,
	transparent: true,
	opacity: GHOST_OPACITY,
	depthWrite: false,
});

// ---------------------------------------------------------------------------
// Reusable THREE.js objects (avoid per-frame allocations)
// ---------------------------------------------------------------------------

const _direction = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a translucent ghost cube at the grid-snapped placement position.
 *
 * The mesh is always mounted but toggled via `visible`. Position, material,
 * and visibility are updated imperatively in useFrame to avoid React
 * re-renders.
 */
export function PlacementPreview() {
	const meshRef = useRef<THREE.Mesh>(null);
	const camera = useThree((state) => state.camera);

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		// Hide unless holding a cube and physics is ready
		if (getHeldCube() === null || !isPhysicsInitialized()) {
			mesh.visible = false;
			return;
		}

		// Cast ray from camera center (screen center = forward direction)
		camera.getWorldDirection(_direction);

		const hit = castRay(
			camera.position.x,
			camera.position.y,
			camera.position.z,
			_direction.x,
			_direction.y,
			_direction.z,
			MAX_PLACEMENT_RANGE,
		);

		// No surface in range
		if (hit === null) {
			mesh.visible = false;
			return;
		}

		// Compute placement preview with grid snap + validation
		const preview = getPlacementPreview(
			{ point: hit.point, normal: hit.normal },
			getOccupiedSlots(),
			MAX_PLACEMENT_RANGE,
		);

		if (preview === null) {
			mesh.visible = false;
			return;
		}

		// Position the ghost cube
		mesh.position.set(
			preview.worldPosition.x,
			preview.worldPosition.y,
			preview.worldPosition.z,
		);

		// Swap material based on validity
		mesh.material = preview.valid ? validMaterial : invalidMaterial;

		mesh.visible = true;
	});

	return (
		<mesh
			ref={meshRef}
			geometry={ghostGeometry}
			material={validMaterial}
			visible={false}
			renderOrder={999}
		/>
	);
}
