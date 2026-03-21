/**
 * Hypercane — spiral storm band around the globe equator.
 * Extracted from TitleMenuScene for reuse in the persistent globe.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { cinematicState } from "./cinematicState";
import { hypercaneFragmentShader, hypercaneVertexShader } from "./shaders";

export function Hypercane() {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
		}),
		[],
	);

	useFrame((state) => {
		if (meshRef.current) {
			const intensity = cinematicState.wormholeIntensity;
			uniforms.uTime.value = state.clock.elapsedTime;
			meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * intensity;
		}
	});

	return (
		<mesh ref={meshRef} scale={[3, 0.5, 3]}>
			<cylinderGeometry args={[1, 1.5, 2, 64, 32, true]} />
			<shaderMaterial
				vertexShader={hypercaneVertexShader}
				fragmentShader={hypercaneFragmentShader}
				uniforms={uniforms}
				transparent
				side={THREE.DoubleSide}
				blending={THREE.AdditiveBlending}
				depthWrite={false}
			/>
		</mesh>
	);
}
