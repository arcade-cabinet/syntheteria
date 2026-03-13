import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import weatherConfig from "../config/weather.json";
import { getStormIntensity } from "../systems/power";
import { getWeatherSnapshot } from "../systems/weather";

/**
 * Storm-reactive scene lighting driven by the weather chronometer.
 *
 * There is no sun in Syntheteria — the sky is a perpetual hypercane.
 * The wormhole at zenith is the primary light source (purple-white).
 * Its glow cycle defines "day" and "night":
 *   - Day: brighter ambient + directional from wormhole
 *   - Night: dim purple-blue, nearly dark
 * Storm intensity adds surge brightness on top of the base day/night curve.
 * Lightning flashes are handled separately by LightningSystem.
 */

const _ambientColor = new THREE.Color();
const _directionalColor = new THREE.Color();
const surgeConfig = weatherConfig.wormholeCycle.surgeTint;
const _surgeTint = new THREE.Color(
	surgeConfig.color[0],
	surgeConfig.color[1],
	surgeConfig.color[2],
);

export function StormLighting() {
	const ambientRef = useRef<THREE.AmbientLight>(null);
	const directionalRef = useRef<THREE.DirectionalLight>(null);

	useFrame(() => {
		const weather = getWeatherSnapshot();
		const stormIntensity = getStormIntensity();

		if (ambientRef.current) {
			// Ambient intensity from weather system (day/night + storm boost)
			ambientRef.current.intensity = weather.ambientIntensity;

			// Ambient color from weather system, shifted by storm intensity
			const [r, g, b] = weather.ambientColor;
			_ambientColor.setRGB(r, g, b);

			// Storm surge adds warm purple tint
			if (stormIntensity > surgeConfig.threshold) {
				const surgeRange = 1.0 - surgeConfig.threshold;
				const surgeFactor =
					(stormIntensity - surgeConfig.threshold) / surgeRange;
				_ambientColor.lerp(_surgeTint, surgeFactor * surgeConfig.blendStrength);
			}

			ambientRef.current.color.copy(_ambientColor);
		}

		if (directionalRef.current) {
			// Wormhole directional — driven by weather system day/night cycle
			directionalRef.current.intensity = weather.directionalIntensity;

			// Color from config
			const [dr, dg, db] = weather.directionalColor;
			_directionalColor.setRGB(dr, dg, db);
			directionalRef.current.color.copy(_directionalColor);
		}
	});

	return (
		<>
			<ambientLight ref={ambientRef} intensity={0.3} color={0x111122} />
			<directionalLight
				ref={directionalRef}
				position={[0, 40, -15]}
				intensity={0.4}
				color={0x7744aa}
				castShadow
			/>
		</>
	);
}
