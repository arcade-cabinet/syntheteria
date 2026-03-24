/**
 * Perpetual storm sky with pulsating wormhole effect.
 *
 * Multi-octave FBM clouds, animated wormhole vortex at zenith,
 * forked lightning bolts, and horizon glow. The sky dome follows
 * the camera so it always surrounds the player.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const STORM_VERT = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const STORM_FRAG = /* glsl */ `
uniform float uTime;
varying vec3 vWorldDir;

// --- Noise primitives ---

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = rot * p * 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldDir);

  // Elevation: 0 at horizon, 1 at zenith
  float elev = max(dir.y, 0.0);

  // --- Cloud layers (FBM) ---
  vec2 uv = dir.xz / (dir.y + 0.15);
  float clouds = fbm(uv * 1.5 + uTime * 0.04);
  float detail = fbm(uv * 4.0 - uTime * 0.07);
  float stormMix = clouds * 0.6 + detail * 0.4;

  vec3 darkCloud  = vec3(0.03, 0.03, 0.06);
  vec3 midCloud   = vec3(0.10, 0.08, 0.16);
  vec3 lightCloud = vec3(0.18, 0.14, 0.25);
  vec3 stormColor = mix(darkCloud, mix(midCloud, lightCloud, stormMix), stormMix);

  // Darken near horizon for depth
  stormColor *= smoothstep(0.0, 0.25, elev) * 0.7 + 0.3;

  // --- Wormhole vortex at zenith ---
  float zenithDist = length(dir.xz);
  float vortex = smoothstep(0.35, 0.0, zenithDist);

  // Swirling rotation
  float angle = atan(dir.z, dir.x) + uTime * 0.3;
  float spiral = sin(angle * 5.0 + zenithDist * 20.0 - uTime * 2.0) * 0.5 + 0.5;
  float vortexPattern = vortex * (0.6 + 0.4 * spiral);

  float pulse = 0.6 + 0.4 * sin(uTime * 0.8);
  vec3 innerGlow = vec3(0.5, 0.15, 0.8);
  vec3 outerGlow = vec3(0.2, 0.05, 0.4);
  vec3 wormholeColor = mix(outerGlow, innerGlow, vortex) * vortexPattern * pulse;

  // --- Lightning flashes ---
  // Multiple independent flash "channels" for variety
  float flash1 = step(0.993, hash(vec2(floor(uTime * 3.0), 1.0)));
  float flash2 = step(0.995, hash(vec2(floor(uTime * 5.0), 2.0)));
  float flashDir1 = noise(dir.xz * 8.0 + floor(uTime * 3.0));
  float flashDir2 = noise(dir.xz * 12.0 + floor(uTime * 5.0));

  // Flashes illuminate clouds directionally
  vec3 flashColor = vec3(0.7, 0.8, 1.0) * (
    flash1 * smoothstep(0.4, 0.7, flashDir1) * 0.6 +
    flash2 * smoothstep(0.5, 0.8, flashDir2) * 0.4
  );

  // --- Horizon glow (distant city/storm reflection) ---
  float horizonBand = smoothstep(0.15, 0.02, elev);
  vec3 horizonGlow = vec3(0.12, 0.06, 0.15) * horizonBand;

  // --- Combine ---
  vec3 color = stormColor + wormholeColor + flashColor + horizonGlow;
  gl_FragColor = vec4(color, 1.0);
}
`;

export function StormSky() {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const meshRef = useRef<THREE.Mesh>(null);

	useFrame(({ clock, camera }) => {
		if (materialRef.current) {
			materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
		}
		// Keep sky dome centered on camera so it never clips
		if (meshRef.current) {
			meshRef.current.position.copy(camera.position);
		}
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[400, 32, 32]} />
			<shaderMaterial
				ref={materialRef}
				side={THREE.BackSide}
				depthWrite={false}
				uniforms={{
					uTime: { value: 0 },
				}}
				vertexShader={STORM_VERT}
				fragmentShader={STORM_FRAG}
			/>
		</mesh>
	);
}
