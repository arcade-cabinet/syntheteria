/**
 * LightningEffect — jagged bolt overlay with additive blending.
 * Extracted from TitleMenuScene for reuse in the persistent globe.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { cinematicState } from "../../rendering/globe/cinematicState";
import { lightningFragmentShader, lightningVertexShader } from "../../rendering/globe/shaders";

export function LightningEffect() {
	const _meshRef = useRef<THREE.Mesh>(null);
	const flashRef = useRef(0);
	const boltStartRef = useRef(new THREE.Vector2(0, 0.8));
	const boltEndRef = useRef(new THREE.Vector2(0, -0.8));

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uFlash: { value: 0 },
			uBoltStart: { value: new THREE.Vector2(0, 0.8) },
			uBoltEnd: { value: new THREE.Vector2(0, -0.8) },
		}),
		[],
	);

	useFrame((state) => {
		uniforms.uTime.value = state.clock.elapsedTime;

		// Random bolt triggering — ~3% chance per frame, scaled by cinematic frequency
		const threshold = 1 - 0.03 * cinematicState.lightningFreq;
		if (Math.random() > threshold) {
			flashRef.current = 1;
			const angle = Math.random() * Math.PI * 2;
			const radius = 0.6 + Math.random() * 0.3;
			boltStartRef.current.set(
				Math.cos(angle) * radius,
				Math.sin(angle) * radius,
			);
			boltEndRef.current.set(
				Math.cos(angle + Math.PI) * (radius * 0.3),
				Math.sin(angle + Math.PI) * (radius * 0.3),
			);
		} else {
			flashRef.current *= 0.85;
		}

		uniforms.uFlash.value = flashRef.current;
		uniforms.uBoltStart.value.copy(boltStartRef.current);
		uniforms.uBoltEnd.value.copy(boltEndRef.current);
	});

	return (
		<mesh position={[0, 0, 2]}>
			<planeGeometry args={[15, 15]} />
			<shaderMaterial
				vertexShader={lightningVertexShader}
				fragmentShader={lightningFragmentShader}
				uniforms={uniforms}
				transparent
				blending={THREE.AdditiveBlending}
				depthWrite={false}
			/>
		</mesh>
	);
}
