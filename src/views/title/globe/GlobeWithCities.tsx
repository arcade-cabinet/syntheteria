/**
 * GlobeWithCities — ecumenopolis globe with progressive lattice growth.
 * Extracted from TitleMenuScene for reuse in the persistent globe.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { globeFragmentShader, globeVertexShader } from "./shaders";

export function GlobeWithCities({ growth = 0 }: { growth?: number }) {
	const meshRef = useRef<THREE.Mesh>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uGrowth: { value: 0 },
		}),
		[],
	);

	useFrame((state) => {
		if (meshRef.current) {
			uniforms.uTime.value = state.clock.elapsedTime;
			uniforms.uGrowth.value = growth;
			meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
		}
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[2.5, 64, 64]} />
			<shaderMaterial
				vertexShader={globeVertexShader}
				fragmentShader={globeFragmentShader}
				uniforms={uniforms}
			/>
		</mesh>
	);
}
