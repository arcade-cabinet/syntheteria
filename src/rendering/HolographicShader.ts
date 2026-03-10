/**
 * Custom Three.js ShaderMaterial for holographic projections.
 *
 * Vertex shader billboards the quad (always faces camera) and adds a subtle
 * vertical float oscillation. Fragment shader composites:
 *   - Cyan-green (#00ffaa) colour tint
 *   - Translucent base alpha (~0.7)
 *   - Scrolling horizontal scan lines
 *   - Fresnel-like edge glow
 *   - Flickering opacity driven by a per-entity seed
 *   - Occasional horizontal glitch / interference bands
 *
 * The material is double-sided, transparent, and writes no depth so it
 * composites cleanly over the scene.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// GLSL sources
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
	vUv = uv;

	// Billboard: extract camera-right and camera-up from the modelView matrix,
	// then rebuild the position so the quad always faces the camera.
	vec3 cameraRight = vec3(
		modelViewMatrix[0][0],
		modelViewMatrix[1][0],
		modelViewMatrix[2][0]
	);
	vec3 cameraUp = vec3(
		modelViewMatrix[0][1],
		modelViewMatrix[1][1],
		modelViewMatrix[2][1]
	);

	// Subtle vertical float oscillation (±0.04 world units, 1.5 Hz)
	float floatOffset = sin(time * 1.5) * 0.04;

	vec3 billboardPos =
		cameraRight * position.x +
		cameraUp    * (position.y + floatOffset);

	vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
	mvPosition.xyz += billboardPos;

	gl_Position = projectionMatrix * mvPosition;

	// Approximate normal/viewDir for Fresnel — treat billboard as facing camera.
	vNormal  = normalize(vec3(0.0, 0.0, 1.0));
	vViewDir = normalize(-mvPosition.xyz);
}
`;

const fragmentShader = /* glsl */ `
uniform float time;
uniform float opacity;
uniform float flickerSeed;
uniform sampler2D baseTexture;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

// Simple pseudo-random hash (0..1) from a 2D input.
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
	// --- Base colour from texture ---
	vec4 texColor = texture2D(baseTexture, vUv);

	// Tint towards cyan-green (#00ffaa ≈ 0.0, 1.0, 0.67)
	vec3 tint = vec3(0.0, 1.0, 0.667);
	vec3 color = mix(texColor.rgb, tint, 0.55);

	// Start with base translucency.
	float alpha = texColor.a * 0.7 * opacity;

	// --- Scan lines (horizontal, scrolling upward) ---
	float scanLine = sin(vUv.y * 80.0 + time * 2.0) * 0.5 + 0.5;
	// Subtle darkening in scan-line troughs.
	color *= 0.92 + 0.08 * scanLine;

	// --- Edge glow (Fresnel approximation) ---
	float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.0) * 0.5;
	color += tint * fresnel;

	// --- Flicker (per-entity randomised opacity wobble) ---
	float flickerTime = time * 6.0 + flickerSeed * 100.0;
	float flicker = hash(vec2(floor(flickerTime), flickerSeed));
	// Keep flicker subtle: 0.92 .. 1.0
	alpha *= 0.92 + 0.08 * flicker;

	// --- Interference / glitch bands ---
	// Every ~2 seconds a thin band appears at a pseudo-random y position.
	float bandCycle = floor(time * 0.5 + flickerSeed);
	float bandY     = hash(vec2(bandCycle, flickerSeed * 3.7));
	float bandDist  = abs(vUv.y - bandY);
	float band      = 1.0 - smoothstep(0.0, 0.025, bandDist);
	// Brighten the band and shift colour slightly.
	color = mix(color, vec3(0.3, 1.0, 0.8), band * 0.6);
	alpha = mix(alpha, min(alpha + 0.15, 1.0), band);

	// Discard fully-transparent fragments so the hologram silhouette is clean.
	if (alpha < 0.01) discard;

	gl_FragColor = vec4(color, alpha);
}
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new ShaderMaterial configured for holographic projection rendering.
 * Optionally pass an initial base texture (e.g. the otter sprite sheet frame).
 */
export function createHolographicMaterial(
	baseTexture?: THREE.Texture,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			time: { value: 0.0 },
			opacity: { value: 1.0 },
			flickerSeed: { value: Math.random() },
			baseTexture: {
				value: baseTexture ?? new THREE.Texture(),
			},
		},
		vertexShader,
		fragmentShader,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
}

/**
 * Update the per-frame uniforms on an existing holographic material.
 */
export function updateHolographicMaterial(
	material: THREE.ShaderMaterial,
	time: number,
	opacity: number,
	flickerSeed: number,
): void {
	material.uniforms.time.value = time;
	material.uniforms.opacity.value = opacity;
	material.uniforms.flickerSeed.value = flickerSeed;
}
