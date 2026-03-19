/**
 * World lighting setup — the exact recipe from poc-roboforming.html.
 *
 * Ambient 0x223344 @ 0.6, directional 0xaaccff @ 0.8,
 * FogExp2 0x050a0f @ 0.012, NO tone mapping.
 *
 * See docs/RENDERING_VISION.md for the full lighting specification.
 */

import * as THREE from "three";

export function setupWorldLighting(scene: THREE.Scene): void {
	// Remove any default lights
	const existing = scene.children.filter(
		(c) => (c as THREE.Light).isLight,
	);
	for (const l of existing) scene.remove(l);

	// Deep blue-grey ambient — prevents pure-black shadows
	scene.add(new THREE.AmbientLight(0x223344, 0.6));

	// Cool blue-white directional sun
	const sun = new THREE.DirectionalLight(0xaaccff, 0.8);
	sun.position.set(10, 50, 20);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -40;
	sun.shadow.camera.right = 40;
	sun.shadow.camera.top = 40;
	sun.shadow.camera.bottom = -40;
	scene.add(sun);

	// Near-black fog for depth
	scene.fog = new THREE.FogExp2(0x050a0f, 0.012);
}

/**
 * Add colored accent point lights at specific world positions.
 * Cyan near roboformed areas, magenta near cult zones.
 */
export function addAccentLight(
	scene: THREE.Scene,
	color: number,
	x: number,
	y: number,
	z: number,
	intensity = 1,
	distance = 30,
): THREE.PointLight {
	const light = new THREE.PointLight(color, intensity, distance);
	light.position.set(x, y, z);
	scene.add(light);
	return light;
}
