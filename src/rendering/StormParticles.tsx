import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getStormIntensity } from "../systems/power";
import { getWeatherSnapshot } from "../systems/weather";

/**
 * GPU-driven rain and debris particle system.
 *
 * Rain: elongated cyan-tinted streaks falling at an angle (wind from north).
 * Debris: larger tumbling chunks that appear only during surges (intensity > 0.85).
 *
 * All animation happens in the vertex shader — zero CPU per-particle updates.
 * Particles are positioned relative to the camera so rain always fills the viewport.
 *
 * Weather integration:
 * - uWormholeGlow dims rain visibility at night (wormhole = our sun)
 * - uWindSpeed comes from storm profile config
 * - uRainAlpha range comes from storm profile config
 */

const MAX_RAIN = 2000;
const RAIN_AREA = 60; // world units around camera
const RAIN_HEIGHT = 30;

const rainVertexShader = `
  uniform float uTime;
  uniform float uStormIntensity;
  uniform vec3 uCameraTarget;
  uniform float uWormholeGlow;
  uniform float uWindSpeed;
  uniform float uRainAlphaBase;
  uniform float uRainAlphaStorm;
  attribute float aOffset;
  attribute float aSpeed;
  attribute float aSize;
  varying float vAlpha;

  void main() {
    // Active particle count based on intensity
    float maxActive = 400.0 + uStormIntensity * 1600.0;
    float particleId = aOffset * ${MAX_RAIN.toFixed(1)};
    if (particleId > maxActive) {
      gl_Position = vec4(0.0, -9999.0, 0.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    // Base position in camera-relative space
    float x = sin(aOffset * 127.1 + 0.5) * ${RAIN_AREA.toFixed(1)};
    float z = sin(aOffset * 311.7 + 0.3) * ${RAIN_AREA.toFixed(1)};

    // Falling motion with wrap-around
    float fallSpeed = aSpeed * (12.0 + uStormIntensity * 14.0);
    float y = mod(${RAIN_HEIGHT.toFixed(1)} - (uTime * fallSpeed + aOffset * ${RAIN_HEIGHT.toFixed(1)}), ${RAIN_HEIGHT.toFixed(1)});

    // Wind drift from north — speed from weather config
    float windDrift = uTime * uWindSpeed * aSpeed;
    x += sin(windDrift * 0.3 + aOffset * 10.0) * 1.5;
    z += windDrift * 0.4;

    // Position relative to camera
    vec3 worldPos = vec3(
      uCameraTarget.x + x,
      y,
      uCameraTarget.z + z
    );

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size: elongated streaks — larger when closer, scaled by speed
    float dist = -mvPosition.z;
    gl_PointSize = aSize * (80.0 / max(dist, 1.0)) * (0.5 + uStormIntensity * 0.5);

    // Alpha: fade at edges of rain volume and with distance
    float edgeFade = smoothstep(0.0, 3.0, y) * smoothstep(${RAIN_HEIGHT.toFixed(1)}, ${(RAIN_HEIGHT - 2).toFixed(1)}, y);
    float distFade = smoothstep(${RAIN_AREA.toFixed(1)}, ${(RAIN_AREA * 0.6).toFixed(1)}, length(vec2(x, z)));

    // Alpha: base from storm profile, boosted by storm intensity
    float baseAlpha = uRainAlphaBase + uStormIntensity * (uRainAlphaStorm - uRainAlphaBase);

    // Day/night modulation — rain is less visible when wormhole glow is low
    float dayNightMod = 0.4 + uWormholeGlow * 0.6;

    vAlpha = edgeFade * distFade * baseAlpha * dayNightMod;
  }
`;

const rainFragmentShader = `
  varying float vAlpha;

  void main() {
    // Soft point with cyan tint — matches signal color language
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
    if (alpha < 0.01) discard;

    // Cyan-white rain color
    vec3 color = vec3(0.55, 0.82, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function StormParticles() {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const { camera } = useThree();

	const geometry = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const offsets = new Float32Array(MAX_RAIN);
		const speeds = new Float32Array(MAX_RAIN);
		const sizes = new Float32Array(MAX_RAIN);
		const positions = new Float32Array(MAX_RAIN * 3);

		for (let i = 0; i < MAX_RAIN; i++) {
			offsets[i] = i / MAX_RAIN;
			speeds[i] = 0.6 + Math.random() * 0.8;
			sizes[i] = 1.5 + Math.random() * 2.5;
			// Dummy positions — shader computes real positions
			positions[i * 3] = 0;
			positions[i * 3 + 1] = 0;
			positions[i * 3 + 2] = 0;
		}

		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geo.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 1));
		geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
		geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

		return geo;
	}, []);

	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: rainVertexShader,
				fragmentShader: rainFragmentShader,
				uniforms: {
					uTime: { value: 0 },
					uStormIntensity: { value: 0.7 },
					uCameraTarget: { value: new THREE.Vector3() },
					uWormholeGlow: { value: 0.5 },
					uWindSpeed: { value: 3.0 },
					uRainAlphaBase: { value: 0.15 },
					uRainAlphaStorm: { value: 0.25 },
				},
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[],
	);

	useFrame(({ clock }) => {
		const weather = getWeatherSnapshot();
		material.uniforms.uTime.value = clock.getElapsedTime();
		material.uniforms.uStormIntensity.value = getStormIntensity();
		material.uniforms.uCameraTarget.value.set(
			camera.position.x,
			0,
			camera.position.z,
		);
		// Weather-driven uniforms
		material.uniforms.uWormholeGlow.value = weather.wormholeGlow;
		material.uniforms.uWindSpeed.value =
			weather.stormVisuals.windSpeedBase +
			getStormIntensity() *
				(weather.stormVisuals.windSpeedStorm -
					weather.stormVisuals.windSpeedBase);
		material.uniforms.uRainAlphaBase.value = weather.stormVisuals.rainAlphaBase;
		material.uniforms.uRainAlphaStorm.value =
			weather.stormVisuals.rainAlphaStorm;
	});

	return (
		<points geometry={geometry} material={material} frustumCulled={false} />
	);
}
