import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getStormIntensity } from "../systems/power";
import { getWeatherSnapshot, getWormholeGlow } from "../systems/weather";
import { getLightningFrequency } from "./stormVisuals";

/**
 * Perpetual hypercane sky dome with wormhole day/night cycle.
 *
 * The sun is permanently occluded. The wormhole's energy output cycle
 * defines "day" (bright purple glow) and "night" (dim, nearly dark).
 *
 * uWormholeGlow [0, 1] controls the wormhole brightness — this IS the
 * day/night cycle. uStormIntensity controls cloud churn, lightning frequency,
 * and color grade on top of the base day/night.
 *
 * Storm intensity (from power.ts) controls:
 * - cloud churn speed and brightness
 * - wormhole pulse rate and glow radius
 * - lightning flash frequency
 * - overall color grade (blue-gray calm → red-violet cataclysmic)
 */

export function StormSky() {
	const materialRef = useRef<THREE.ShaderMaterial>(null);

	useFrame(({ clock }) => {
		if (materialRef.current) {
			const weather = getWeatherSnapshot();
			const intensity = getStormIntensity();
			materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
			materialRef.current.uniforms.uStormIntensity.value = intensity;
			materialRef.current.uniforms.uWormholeGlow.value = getWormholeGlow();
			materialRef.current.uniforms.uCloudSpeed.value =
				weather.stormVisuals.cloudSpeed;
			materialRef.current.uniforms.uSkyTintShift.value =
				weather.stormVisuals.skyTintShift;
			// Lightning frequency from stormVisuals pure logic
			materialRef.current.uniforms.uLightningFreq.value =
				getLightningFrequency(intensity);
		}
	});

	return (
		<mesh>
			<sphereGeometry args={[200, 32, 32]} />
			<shaderMaterial
				ref={materialRef}
				side={THREE.BackSide}
				depthWrite={false}
				uniforms={{
					uTime: { value: 0 },
					uStormIntensity: { value: 0.7 },
					uWormholeGlow: { value: 0.5 },
					uCloudSpeed: { value: 0.08 },
					uSkyTintShift: { value: 0.3 },
					uLightningFreq: { value: 2 },
				}}
				vertexShader={`
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
				fragmentShader={`
          uniform float uTime;
          uniform float uStormIntensity;
          uniform float uWormholeGlow;
          uniform float uCloudSpeed;
          uniform float uSkyTintShift;
          uniform float uLightningFreq;
          varying vec3 vPosition;

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

          // Fractal brownian motion for richer cloud detail
          float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
              value += amplitude * noise(p);
              p *= 2.1;
              amplitude *= 0.5;
            }
            return value;
          }

          void main() {
            vec3 dir = normalize(vPosition);
            float si = uStormIntensity;
            float wg = uWormholeGlow; // 0 = night (dim), 1 = day (bright)

            // Cloud speed from weather config, boosted by storm intensity
            float speed = uCloudSpeed + si * uCloudSpeed;
            float t = uTime * speed;

            // Multi-octave storm clouds
            float clouds = fbm(dir.xz * 3.0 + t * vec2(1.0, 0.7));
            float detail = fbm(dir.xz * 8.0 - t * vec2(0.5, 1.2));
            float stormPattern = clouds * 0.6 + detail * 0.4;

            // Storm color grade — uSkyTintShift controls how much the profile
            // shifts from cool blue toward warm red-violet
            vec3 darkCloud = mix(
              vec3(0.01, 0.015, 0.03),   // blue-dark (calm)
              vec3(0.04, 0.01, 0.03),    // red-dark (cataclysmic)
              uSkyTintShift * smoothstep(0.3, 1.0, si)
            );
            vec3 lightCloud = mix(
              vec3(0.06, 0.06, 0.12),    // blue-gray (calm)
              vec3(0.14, 0.06, 0.10),    // warm purple (cataclysmic)
              uSkyTintShift * smoothstep(0.3, 1.0, si)
            );
            vec3 stormColor = mix(darkCloud, lightCloud, stormPattern);

            // Day/night modulation — clouds are dimmer at "night" (low wormhole glow)
            float dayNightBrightness = 0.3 + wg * 0.7;
            stormColor *= dayNightBrightness;

            // Brighten clouds during surges
            stormColor *= 0.7 + si * 0.5;

            // Wormhole glow at zenith — size and brightness driven by day/night cycle
            float zenithDist = length(dir.xz);
            float glowRadius = 0.20 + wg * 0.15 + si * 0.08;
            float wormholeGlowFactor = smoothstep(glowRadius, 0.0, zenithDist);
            float pulseRate = 0.6 + si * 0.8;
            float pulse = 0.5 + 0.5 * sin(uTime * pulseRate);

            // Wormhole color: brighter during "day", dimmer at "night"
            vec3 wormholeDay = vec3(0.35, 0.1, 0.55);
            vec3 wormholeNight = vec3(0.08, 0.02, 0.12);
            vec3 wormholeCore = mix(wormholeNight, wormholeDay, wg) * (0.4 + si * 0.6);
            vec3 wormholeEdge = vec3(0.1, 0.3, 0.5) * wg * smoothstep(0.0, glowRadius * 0.8, zenithDist);
            vec3 wormholeColor = (wormholeCore + wormholeEdge) * wormholeGlowFactor * (0.5 + 0.5 * pulse);

            // Wormhole tendrils during high intensity
            float tendril = 0.0;
            if (si > 0.8) {
              float angle = atan(dir.x, dir.z);
              float tendrilNoise = noise(vec2(angle * 3.0, uTime * 0.3));
              tendril = smoothstep(0.5, 0.0, zenithDist) * tendrilNoise * (si - 0.8) * 2.0;
            }
            vec3 tendrilColor = vec3(0.2, 0.05, 0.35) * tendril * wg;

            // Lightning flashes — frequency from stormVisuals getLightningFrequency
            float flashRate = max(1.0, uLightningFreq);
            float flash = step(0.994 - si * 0.004, hash(vec2(floor(uTime * flashRate), 0.0)));
            // Flash illuminates clouds in the direction of the strike
            float flashAngle = hash(vec2(floor(uTime * flashRate), 1.0)) * 6.28;
            float flashDir = smoothstep(1.5, 0.0, length(dir.xz - vec2(cos(flashAngle), sin(flashAngle)) * 0.4));
            vec3 flashColor = vec3(0.5, 0.55, 0.9) * flash * flashDir * (0.2 + si * 0.3);

            // Horizon glow — faint, modulated by day/night
            float horizonGlowFactor = smoothstep(0.1, 0.0, abs(dir.y)) * (0.02 + wg * 0.04);
            vec3 horizonColor = vec3(0.05, 0.08, 0.12) * horizonGlowFactor;

            gl_FragColor = vec4(
              stormColor + wormholeColor + tendrilColor + flashColor + horizonColor,
              1.0
            );
          }
        `}
			/>
		</mesh>
	);
}
