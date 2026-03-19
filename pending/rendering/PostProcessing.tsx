/**
 * Post-Processing — renderer tone mapping + vignette overlay.
 *
 * Vignette is a screen-space mesh in the main R3F scene with renderOrder=999
 * and depthTest=false — R3F renders it last automatically. No manual render
 * loop, no separate overlay scene, no useFrame priority hacks.
 */

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

const VERT = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.999, 1.0);
	}
`;

const FRAG = `
	uniform float uIntensity;
	uniform float uSmoothness;
	uniform vec3 uTint;
	varying vec2 vUv;
	void main() {
		vec2 center = vUv - 0.5;
		float dist = length(center) * 1.414;
		float vignette = smoothstep(1.0 - uSmoothness, 1.0, dist);
		gl_FragColor = vec4(uTint, vignette * uIntensity);
	}
`;

export function PostProcessing() {
	const { gl } = useThree();

	useEffect(() => {
		gl.toneMapping = THREE.ACESFilmicToneMapping;
		gl.toneMappingExposure = 1.1;
		gl.outputColorSpace = THREE.SRGBColorSpace;
	}, [gl]);

	return (
		<mesh renderOrder={999} frustumCulled={false}>
			<planeGeometry args={[2, 2]} />
			<shaderMaterial
				transparent
				depthTest={false}
				depthWrite={false}
				uniforms={{
					uIntensity: { value: 0.35 },
					uSmoothness: { value: 0.45 },
					uTint: { value: new THREE.Color(0.02, 0.04, 0.06) },
				}}
				vertexShader={VERT}
				fragmentShader={FRAG}
			/>
		</mesh>
	);
}
