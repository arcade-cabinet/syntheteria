/**
 * StormClouds — volumetric storm cloud sphere (BackSide).
 * Extracted from TitleMenuScene for reuse in the persistent globe.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { stormFragmentShader, stormVertexShader } from "./shaders";

export function StormClouds({ radius = 8 }: { radius?: number }) {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uColor1: { value: new THREE.Color(0x020307) },
			uColor2: { value: new THREE.Color(0x0a1428) },
		}),
		[],
	);

	useFrame((state) => {
		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
		}
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[radius, 64, 64]} />
			<shaderMaterial
				vertexShader={stormVertexShader}
				fragmentShader={stormFragmentShader}
				uniforms={uniforms}
				transparent
				side={THREE.BackSide}
				depthWrite={false}
			/>
		</mesh>
	);
}
