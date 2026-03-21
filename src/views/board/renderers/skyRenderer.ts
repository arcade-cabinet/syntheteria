/**
 * skyRenderer — storm sky backdrop for the Phaser game board.
 *
 * Creates an immersive storm atmosphere so players never see a square
 * floating in space:
 * - Large sky dome (inverted sphere) with storm gradient vertex colors
 * - Horizon ground plane extending beyond the map, fading into fog
 * - Matches the POC lighting recipe mood
 */

import * as THREE from "three";

const TILE_SIZE = 2; // from terrainRenderer

/**
 * Create the storm sky backdrop.
 * Inverted sphere with a vertical gradient:
 * - Bottom: near-black blue (0x050a0f) matching fog color
 * - Middle: dark storm grey (0x0a1520)
 * - Top: slightly lighter storm (0x101828) with hint of wormhole glow
 */
export function createSkyDome(
	scene: THREE.Scene,
	boardWidth: number,
	boardHeight: number,
): void {
	const mapCenterX = (boardWidth * TILE_SIZE) / 2;
	const mapCenterZ = (boardHeight * TILE_SIZE) / 2;
	const radius = Math.max(boardWidth, boardHeight) * TILE_SIZE * 2;

	const geo = new THREE.SphereGeometry(radius, 32, 16);

	const colors = new Float32Array(geo.attributes.position.count * 3);
	const posAttr = geo.attributes.position;
	const bottomColor = new THREE.Color(0x050a0f);
	const midColor = new THREE.Color(0x0a1520);
	const topColor = new THREE.Color(0x101828);

	for (let i = 0; i < posAttr.count; i++) {
		const y = posAttr.getY(i);
		const t = (y / radius + 1) * 0.5; // 0 at bottom, 1 at top
		const color = new THREE.Color();
		if (t < 0.4) {
			color.lerpColors(bottomColor, midColor, t / 0.4);
		} else {
			color.lerpColors(midColor, topColor, (t - 0.4) / 0.6);
		}
		colors[i * 3] = color.r;
		colors[i * 3 + 1] = color.g;
		colors[i * 3 + 2] = color.b;
	}

	geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

	const mat = new THREE.MeshBasicMaterial({
		vertexColors: true,
		side: THREE.BackSide,
		fog: false,
	});

	const dome = new THREE.Mesh(geo, mat);
	dome.position.set(mapCenterX, 0, mapCenterZ);
	dome.renderOrder = -1;
	scene.add(dome);
}

/**
 * Ground plane extending far beyond the map to prevent seeing "nothing"
 * at edges. Uses fog color so it fades seamlessly into the atmosphere.
 */
export function createHorizonPlane(
	scene: THREE.Scene,
	boardWidth: number,
	boardHeight: number,
): void {
	const mapCenterX = (boardWidth * TILE_SIZE) / 2;
	const mapCenterZ = (boardHeight * TILE_SIZE) / 2;
	const extent = Math.max(boardWidth, boardHeight) * TILE_SIZE * 3;

	const geo = new THREE.PlaneGeometry(extent, extent);
	geo.rotateX(-Math.PI / 2);

	const mat = new THREE.MeshStandardMaterial({
		color: 0x060810,
		roughness: 1.0,
		metalness: 0.0,
	});

	const plane = new THREE.Mesh(geo, mat);
	plane.position.set(mapCenterX, -0.5, mapCenterZ);
	plane.receiveShadow = true;
	scene.add(plane);
}
