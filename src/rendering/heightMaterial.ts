/**
 * Height-only shader material for BoardRenderer (Layer 1).
 *
 * Renders elevation-displaced geometry with curvature, fixed directional
 * lighting (perpetual daylight — near-zenith artificial sun), and fog.
 * No biome patterns — those belong to Layer 2.
 *
 * Board lighting is decoupled from the day/night orbit (StormSky keeps it).
 */

import * as THREE from "three";
import FRAG from "./glsl/heightFrag.glsl";
import VERT from "./glsl/heightVert.glsl";

/**
 * Fixed zenith sun direction — perpetual harsh artificial daylight.
 * Robots under the storm don't do day/night. Sun is always near-zenith.
 */
const ZENITH_SUN_DIR = new THREE.Vector3(0.05, 0.98, 0.05).normalize();
const ZENITH_SUN_COLOR = new THREE.Color(1.0, 0.97, 0.92);

export function makeHeightMaterial(
	boardCenterX = 0,
	boardCenterZ = 0,
	_dayAngle = 0.8,
	_season = 0,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			THREE.UniformsLib.fog,
			{
				uBoardCenter: { value: new THREE.Vector2(boardCenterX, boardCenterZ) },
				uCurve: { value: 0.0008 },
				uBoardWidth: { value: 0 },
				uSunDir: { value: ZENITH_SUN_DIR.clone() },
				uSunColor: { value: ZENITH_SUN_COLOR.clone() },
			},
		]),
		vertexShader: VERT,
		fragmentShader: FRAG,
		fog: true,
		side: THREE.FrontSide,
	});
}

/**
 * No-op — board lighting is fixed at perpetual daylight (no day/night orbit).
 * Kept for API compatibility with BoardRenderer which calls this on turn advance.
 */
export function updateHeightChronometry(
	_material: THREE.ShaderMaterial,
	_dayAngle: number,
	_season: number,
): void {
	// Intentionally empty — sun position is fixed at zenith for the board.
}
