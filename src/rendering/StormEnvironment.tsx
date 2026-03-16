/**
 * Storm Environment — HDRI-based environment lighting with storm reactivity.
 *
 * Loads the approaching_storm HDRI and uses it as the scene environment map
 * for PBR reflections. The environment intensity is modulated by storm
 * intensity and wormhole glow (day/night cycle).
 *
 * This does NOT replace StormLighting (which provides ambient + directional
 * lights). This adds environment map reflections for PBR materials.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { getStormIntensity } from "../systems/power";
import { getWormholeGlow } from "../systems/weather";
import { getStormVisualProfile } from "./stormVisuals";

/** Relative path to the HDRI — loaded via three's texture loader */
const HDRI_PATH = "/assets/hdri/polyhaven/approaching_storm_1k.hdr";

/**
 * Environment intensity range:
 * - Night (wormhole glow 0): very dim reflections
 * - Day (wormhole glow 1): moderate reflections
 * - Storm surge adds a slight boost
 */
const ENV_INTENSITY_MIN = 0.05;
const ENV_INTENSITY_MAX = 0.35;
const STORM_BOOST = 0.1;

export function StormEnvironment() {
	const { gl, scene } = useThree();
	const envMapRef = useRef<THREE.Texture | null>(null);

	useEffect(() => {
		const pmremGenerator = new THREE.PMREMGenerator(gl);
		pmremGenerator.compileEquirectangularShader();

		const loader = new HDRLoader();
		loader.load(HDRI_PATH, (texture) => {
			const envMap = pmremGenerator.fromEquirectangular(texture).texture;
			scene.environment = envMap;
			envMapRef.current = envMap;
			texture.dispose();
			pmremGenerator.dispose();
		});

		return () => {
			if (envMapRef.current) {
				envMapRef.current.dispose();
				envMapRef.current = null;
			}
			scene.environment = null;
		};
	}, [gl, scene]);

	useFrame(() => {
		if (!scene.environment) return;

		const wormholeGlow = getWormholeGlow();
		const stormIntensity = getStormIntensity();

		// Day/night drives base environment intensity
		const baseIntensity =
			ENV_INTENSITY_MIN +
			wormholeGlow * (ENV_INTENSITY_MAX - ENV_INTENSITY_MIN);

		// Storm surge adds a boost, amplified during surge profile
		const profile = getStormVisualProfile(stormIntensity);
		const surgeMultiplier = profile === "surge" ? 1.5 : 1.0;
		const finalIntensity =
			baseIntensity + stormIntensity * STORM_BOOST * surgeMultiplier;

		scene.environmentIntensity = finalIntensity;
	});

	return null;
}
