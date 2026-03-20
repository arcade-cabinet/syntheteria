/**
 * fogRenderer — renders fog of war overlay on the terrain.
 *
 * Builds a single plane mesh covering the full board. Per-vertex alpha
 * is driven by the explored set: unexplored tiles get 0.7 black overlay,
 * explored tiles are fully transparent.
 *
 * The mesh sits at y = 0.1 (just above terrain surface).
 */

import type { World } from "koota";
import * as THREE from "three";
import { buildExploredSet, isTileExplored } from "../../../rendering";
import { TILE_SIZE } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let fogMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null =
	null;
let boardWidth = 0;
let boardHeight = 0;

// ---------------------------------------------------------------------------
// Fog plane builder
// ---------------------------------------------------------------------------

/**
 * Create and add the fog of war overlay mesh to the scene.
 * One vertex per tile corner — alpha is set per-vertex.
 */
export function createFogRenderer(scene: THREE.Scene, world: World): void {
	// Read board dimensions from the explored set scan.
	// We need to iterate tiles to find max x/z.
	const explored = buildExploredSet(world);
	let maxX = 0;
	let maxZ = 0;

	// Parse keys like "x,z" to find board extent
	for (const key of explored) {
		const [sx, sz] = key.split(",");
		const tx = Number.parseInt(sx, 10);
		const tz = Number.parseInt(sz, 10);
		if (tx > maxX) maxX = tx;
		if (tz > maxZ) maxZ = tz;
	}

	// Fall back if no tiles explored yet — world size is unknown, use 64x64
	boardWidth = maxX > 0 ? maxX + 1 : 64;
	boardHeight = maxZ > 0 ? maxZ + 1 : 64;

	const geo = new THREE.PlaneGeometry(
		boardWidth * TILE_SIZE,
		boardHeight * TILE_SIZE,
		boardWidth,
		boardHeight,
	);
	geo.rotateX(-Math.PI / 2);
	geo.translate((boardWidth * TILE_SIZE) / 2, 0, (boardHeight * TILE_SIZE) / 2);

	// Per-vertex alpha via vertex colors (rgb = black, a via opacity blending)
	const posAttr = geo.attributes.position;
	const colors = new Float32Array(posAttr.count * 4);

	for (let i = 0; i < posAttr.count; i++) {
		const vx = posAttr.getX(i);
		const vz = posAttr.getZ(i);

		const tileX = Math.max(
			0,
			Math.min(boardWidth - 1, Math.floor(vx / TILE_SIZE)),
		);
		const tileZ = Math.max(
			0,
			Math.min(boardHeight - 1, Math.floor(vz / TILE_SIZE)),
		);

		const visible = isTileExplored(explored, tileX, tileZ);

		// RGBA — black with alpha 0.7 for unexplored, 0 for explored
		colors[i * 4] = 0; // R
		colors[i * 4 + 1] = 0; // G
		colors[i * 4 + 2] = 0; // B
		colors[i * 4 + 3] = visible ? 0 : 0.7; // A
	}

	geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));

	const mat = new THREE.MeshBasicMaterial({
		vertexColors: true,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});

	fogMesh = new THREE.Mesh(geo, mat);
	fogMesh.position.y = 0.1;
	fogMesh.renderOrder = 10; // render after terrain
	scene.add(fogMesh);
}

// ---------------------------------------------------------------------------
// Update fog alpha from current explored state
// ---------------------------------------------------------------------------

/**
 * Rebuild vertex alpha from the current explored set.
 * Call once per turn (not every frame).
 */
export function updateFog(world: World): void {
	if (!fogMesh) return;

	const explored = buildExploredSet(world);
	const geo = fogMesh.geometry;
	const posAttr = geo.attributes.position;
	const colorAttr = geo.attributes.color;

	if (!colorAttr) return;

	for (let i = 0; i < posAttr.count; i++) {
		const vx = posAttr.getX(i);
		const vz = posAttr.getZ(i);

		const tileX = Math.max(
			0,
			Math.min(boardWidth - 1, Math.floor(vx / TILE_SIZE)),
		);
		const tileZ = Math.max(
			0,
			Math.min(boardHeight - 1, Math.floor(vz / TILE_SIZE)),
		);

		const visible = isTileExplored(explored, tileX, tileZ);
		colorAttr.setW(i, visible ? 0 : 0.7);
	}

	colorAttr.needsUpdate = true;
}
