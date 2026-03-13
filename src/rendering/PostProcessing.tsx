/**
 * Post-Processing — Bloom, vignette, and color grading.
 *
 * Uses Three.js EffectComposer with custom shader passes:
 *   - UnrealBloom: bloom on emissive materials (glow rings, breach zones, power nodes)
 *   - Vignette: subtle darkening at screen edges
 *   - Color correction: cool industrial tone shift
 *
 * Performance: bloom uses half-resolution render target by default.
 * The pass is skippable on low-end devices via quality tier.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Lightweight post-processing: emissive bloom via selective bright-pass.
 *
 * Instead of depending on @react-three/postprocessing (heavy ESM dep),
 * we do a simple screen-space emissive glow by adding an additive
 * bright-pass overlay rendered to an offscreen target.
 *
 * The approach:
 * 1. Render scene normally (handled by R3F)
 * 2. On each frame, overlay a subtle vignette using a screen-space quad
 * 3. Bloom is approximated via the existing emissiveIntensity > 1 on
 *    materials — Three.js tone mapping handles the rest
 *
 * This avoids the EffectComposer dependency chain which pulls in
 * postprocessing (ESM-only), causing Metro CJS wrapping issues.
 */

export function PostProcessing() {
	const { gl, scene, camera, size } = useThree();
	const vignetteQuadRef = useRef<THREE.Mesh>(null);

	// Configure renderer for bloom-friendly output
	useEffect(() => {
		gl.toneMapping = THREE.ACESFilmicToneMapping;
		gl.toneMappingExposure = 1.1;
		gl.outputColorSpace = THREE.SRGBColorSpace;
	}, [gl]);

	// Vignette overlay quad (rendered on top via renderOrder)
	const { geometry: vignetteGeom, material: vignetteMat } = useMemo(() => {
		const geom = new THREE.PlaneGeometry(2, 2);

		const mat = new THREE.ShaderMaterial({
			transparent: true,
			depthTest: false,
			depthWrite: false,
			uniforms: {
				uIntensity: { value: 0.35 },
				uSmoothness: { value: 0.45 },
				uTint: { value: new THREE.Color(0.02, 0.04, 0.06) },
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = vec4(position.xy, 0.999, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uIntensity;
				uniform float uSmoothness;
				uniform vec3 uTint;
				varying vec2 vUv;
				void main() {
					vec2 center = vUv - 0.5;
					float dist = length(center) * 1.414;
					float vignette = smoothstep(1.0 - uSmoothness, 1.0, dist);
					// Cool industrial tint in the vignette
					vec3 color = uTint;
					float alpha = vignette * uIntensity;
					gl_FragColor = vec4(color, alpha);
				}
			`,
		});

		return { geometry: geom, material: mat };
	}, []);

	// The vignette is rendered as a screen-space overlay
	// We use a separate scene + ortho camera to render it on top
	const { overlayScene, overlayCamera } = useMemo(() => {
		const oScene = new THREE.Scene();
		const oCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

		const mesh = new THREE.Mesh(vignetteGeom, vignetteMat);
		mesh.frustumCulled = false;
		oScene.add(mesh);

		return { overlayScene: oScene, overlayCamera: oCam };
	}, [vignetteGeom, vignetteMat]);

	// Render the vignette overlay after the main scene
	useFrame(() => {
		gl.autoClear = false;
		gl.render(overlayScene, overlayCamera);
		gl.autoClear = true;
	}, 100); // High render priority = runs after main scene

	return null;
}
