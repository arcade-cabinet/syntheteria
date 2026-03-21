/**
 * territoryRenderer — renders faction territory overlay on terrain.
 *
 * Uses colored transparent planes at each faction-controlled tile,
 * positioned slightly above terrain (y = 0.02).
 *
 * Pure Three.js — no React dependency.
 */

import type { World } from "koota";
import * as THREE from "three";
import { FACTION_COLORS } from "../../../config";
import { computeTerritory } from "../../../systems";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERRITORY_Y = 0.02;
const TILE_PLANE_SIZE = 1.8; // slightly smaller than tile to show grid gaps
const TERRITORY_OPACITY = 0.25;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let territoryGroup: THREE.Group | null = null;

// Cache: reuse geometries and materials per faction color
const materialCache = new Map<number, THREE.MeshBasicMaterial>();
const sharedGeometry = new THREE.PlaneGeometry(
	TILE_PLANE_SIZE,
	TILE_PLANE_SIZE,
);
sharedGeometry.rotateX(-Math.PI / 2);

function getMaterial(color: number): THREE.MeshBasicMaterial {
	let mat = materialCache.get(color);
	if (!mat) {
		mat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: TERRITORY_OPACITY,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		materialCache.set(color, mat);
	}
	return mat;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the territory group and add it to the scene.
 * Call once during scene setup.
 */
export function createTerritoryRenderer(scene: THREE.Scene): void {
	territoryGroup = new THREE.Group();
	territoryGroup.name = "territory-overlay";
	scene.add(territoryGroup);
}

/**
 * Recompute and rebuild territory overlay meshes from current ECS state.
 * Call once per turn or when territory changes.
 */
export function updateTerritory(
	world: World,
	boardWidth: number,
	boardHeight: number,
): void {
	if (!territoryGroup) return;

	// Clear previous meshes
	while (territoryGroup.children.length > 0) {
		const child = territoryGroup.children[0];
		territoryGroup.remove(child);
	}

	const snapshot = computeTerritory(world, boardWidth, boardHeight);

	for (const [key, territory] of snapshot.tiles) {
		const [txStr, tzStr] = key.split(",");
		const tx = Number(txStr);
		const tz = Number(tzStr);

		const color = FACTION_COLORS[territory.factionId] ?? 0x888888;
		const mat = getMaterial(color);

		const mesh = new THREE.Mesh(sharedGeometry, mat);
		const pos = tileToWorld(tx, tz);
		mesh.position.set(pos.x, TERRITORY_Y, pos.z);

		// Contested tiles: slightly more transparent
		if (territory.contested) {
			mesh.material = mat.clone();
			(mesh.material as THREE.MeshBasicMaterial).opacity =
				TERRITORY_OPACITY * 0.5;
		}

		territoryGroup.add(mesh);
	}
}
