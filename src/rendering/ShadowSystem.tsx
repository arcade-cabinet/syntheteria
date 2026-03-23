/**
 * Shadow System — Directional light with shadow maps for structures.
 *
 * Replaces the basic directional light in App.tsx with one configured
 * for shadow casting. Shadow map uses a moderate resolution (1024)
 * to maintain performance while giving buildings visible shadows.
 *
 * Only structures cast shadows — floor cells and particles do not.
 * The shadow camera frustum follows the main camera position to
 * keep shadows visible in the current viewport.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const SHADOW_MAP_SIZE = 1024;
const SHADOW_CAMERA_SIZE = 30;
const SHADOW_BIAS = -0.001;
const SHADOW_NORMAL_BIAS = 0.02;

export function ShadowSystem() {
	const lightRef = useRef<THREE.DirectionalLight>(null);
	const { camera } = useThree();

	// Configure shadow properties on mount
	useEffect(() => {
		const light = lightRef.current;
		if (!light) return;

		light.castShadow = true;
		light.shadow.mapSize.width = SHADOW_MAP_SIZE;
		light.shadow.mapSize.height = SHADOW_MAP_SIZE;
		light.shadow.bias = SHADOW_BIAS;
		light.shadow.normalBias = SHADOW_NORMAL_BIAS;

		const shadowCam = light.shadow.camera as THREE.OrthographicCamera;
		shadowCam.left = -SHADOW_CAMERA_SIZE;
		shadowCam.right = SHADOW_CAMERA_SIZE;
		shadowCam.top = SHADOW_CAMERA_SIZE;
		shadowCam.bottom = -SHADOW_CAMERA_SIZE;
		shadowCam.near = 0.5;
		shadowCam.far = 60;
		shadowCam.updateProjectionMatrix();
	}, []);

	// Move shadow camera to follow the main camera
	useFrame(() => {
		const light = lightRef.current;
		if (!light) return;

		// Shadow light follows camera X/Z but stays at fixed Y offset
		const camPos = camera.position;
		light.position.set(camPos.x + 8, 20, camPos.z + 10);
		light.target.position.set(camPos.x, 0, camPos.z);
		light.target.updateMatrixWorld();
	});

	return (
		<>
			<directionalLight
				ref={lightRef}
				intensity={1.2}
				color={0x8be6ff}
				castShadow
			/>
			{/* Shadow-receiving ground plane */}
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, -0.01, 0]}
				receiveShadow
			>
				<planeGeometry args={[200, 200]} />
				<shadowMaterial opacity={0.2} />
			</mesh>
		</>
	);
}
