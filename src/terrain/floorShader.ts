/**
 * PBR floor shader for BoardRenderer.
 *
 * Samples from the AmbientCG texture atlas (5 maps: Color, Normal, Roughness,
 * Metalness, Opacity) to render 8 ecumenopolis surface types with real PBR
 * materials — normals, roughness, metalness, and grating opacity cutout.
 *
 * Atlas: 3x3 grid (3072x3072), 1024px per cell:
 *   0: Metal032 (mountain)    1: Metal038 (grassland)     2: Concrete007 (grassland)
 *   3: Concrete034 (ruins)    4: Asphalt004 (desert)      5: Metal025 (forest)
 *   6: Metal036 (hills)       7: Grate001 (wetland)       8: water (solid black)
 */

import * as THREE from "three";
import { seedToFloat } from "./cluster";
import FRAG from "./glsl/floorFrag.glsl";
import VERT from "./glsl/floorVert.glsl";

/** Fixed zenith sun — perpetual harsh artificial daylight under the storm. */
const ZENITH_SUN_DIR = new THREE.Vector3(0.05, 0.98, 0.05).normalize();
const ZENITH_SUN_COLOR = new THREE.Color(1.0, 0.97, 0.92);

const ATLAS_BASE = "/assets/textures/";

function loadAtlasTexture(filename: string): THREE.Texture {
	const tex = new THREE.TextureLoader().load(ATLAS_BASE + filename);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.minFilter = THREE.LinearMipmapLinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.anisotropy = 4;
	tex.colorSpace = filename.includes("color")
		? THREE.SRGBColorSpace
		: THREE.LinearSRGBColorSpace;
	return tex;
}

export function makeFloorShaderMaterial(
	seed: string,
	boardCenterX = 0,
	boardCenterZ = 0,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			THREE.UniformsLib.fog,
			{
				uSeed: { value: seedToFloat(seed) },
				uBoardCenter: { value: new THREE.Vector2(boardCenterX, boardCenterZ) },
				uCurve: { value: 0.0008 },
				uBoardWidth: { value: 0 },
				uSunDir: { value: ZENITH_SUN_DIR.clone() },
				uSunColor: { value: ZENITH_SUN_COLOR.clone() },
				uColorAtlas: { value: loadAtlasTexture("floor_atlas_color.jpg") },
				uNormalAtlas: { value: loadAtlasTexture("floor_atlas_normal.jpg") },
				uRoughnessAtlas: {
					value: loadAtlasTexture("floor_atlas_roughness.jpg"),
				},
				uMetalnessAtlas: {
					value: loadAtlasTexture("floor_atlas_metalness.jpg"),
				},
				uOpacityAtlas: { value: loadAtlasTexture("floor_atlas_opacity.jpg") },
			},
		]),
		vertexShader: VERT,
		fragmentShader: FRAG,
		fog: true,
		side: THREE.FrontSide,
		transparent: true,
		depthWrite: false,
	});
}

/**
 * No-op — board lighting is fixed at perpetual daylight (no day/night orbit).
 */
export function updateFloorShaderChronometry(
	_material: THREE.ShaderMaterial,
	_dayAngle: number,
	_season: number,
): void {
	// Intentionally empty — sun position is fixed at zenith.
}
