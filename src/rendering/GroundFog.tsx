import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import weatherConfig from "../config/weather.json";
import { getStormIntensity } from "../systems/power";
import { getWorldDimensions } from "../world/sectorCoordinates";

/**
 * Ground Fog Renderer
 *
 * Instanced translucent planes at ground level for atmospheric depth.
 * Opacity scales with storm intensity and fogDensity from the active storm profile.
 * Planes slowly drift in wind direction (north → south, matching storm origin).
 *
 * Pure renderer — reads storm intensity per frame, no game logic.
 * Fog density config comes from weather.json stormProfiles.
 */

const FOG_PATCH_COUNT = 40;
const FOG_Y = 0.15;
const FOG_DRIFT_SPEED = 0.3;
const FOG_PATCH_MIN_SCALE = 2.0;
const FOG_PATCH_MAX_SCALE = 5.0;

/** Simple seeded PRNG for deterministic fog placement. */
function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return s / 2147483647;
	};
}

export function GroundFog() {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const { camera } = useThree();

	const { geometry, material, patchData } = useMemo(() => {
		const geo = new THREE.PlaneGeometry(1, 1);
		geo.rotateX(-Math.PI / 2); // Lay flat on xz plane

		const mat = new THREE.MeshBasicMaterial({
			color: new THREE.Color(0.05, 0.05, 0.08),
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
			depthWrite: false,
		});

		// Generate deterministic patch positions across the world
		const dims = getWorldDimensions();
		const rng = seededRandom(4207);
		const patches: Array<{
			x: number;
			z: number;
			scale: number;
			phase: number;
		}> = [];

		for (let i = 0; i < FOG_PATCH_COUNT; i++) {
			patches.push({
				x: rng() * dims.width - dims.width * 0.1,
				z: rng() * dims.height - dims.height * 0.1,
				scale:
					FOG_PATCH_MIN_SCALE +
					rng() * (FOG_PATCH_MAX_SCALE - FOG_PATCH_MIN_SCALE),
				phase: rng() * Math.PI * 2,
			});
		}

		return { geometry: geo, material: mat, patchData: patches };
	}, []);

	// Update instance matrices and opacity each frame
	useFrame((_, delta) => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const stormIntensity = getStormIntensity();
		// Get fog density from the volatile profile as a baseline
		// (actual profile selection would come from world session)
		const baseFogDensity = weatherConfig.stormProfiles.volatile.fogDensity;
		const fogOpacity = baseFogDensity * stormIntensity * 0.35;

		material.opacity = Math.min(fogOpacity, 0.25);

		const dummy = new THREE.Object3D();
		const cameraX = camera.position.x;
		const cameraZ = camera.position.z;

		for (let i = 0; i < patchData.length; i++) {
			const patch = patchData[i];

			// Drift south (positive Z) over time
			patch.z += FOG_DRIFT_SPEED * delta * (0.5 + stormIntensity * 0.5);

			// Wrap around when drifting too far from camera
			const dims = getWorldDimensions();
			if (patch.z > cameraZ + dims.height * 0.6) {
				patch.z -= dims.height * 1.2;
			}

			// Gentle breathing scale
			const breathe =
				1.0 + 0.1 * Math.sin(patch.phase + performance.now() * 0.001);
			const s = patch.scale * breathe;

			dummy.position.set(patch.x, FOG_Y, patch.z);
			dummy.scale.set(s, 1, s * 0.7);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
		}

		mesh.instanceMatrix.needsUpdate = true;
	});

	return (
		<instancedMesh
			ref={meshRef}
			args={[geometry, material, FOG_PATCH_COUNT]}
			frustumCulled={false}
		/>
	);
}
