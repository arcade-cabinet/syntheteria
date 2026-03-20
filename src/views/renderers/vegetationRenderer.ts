/**
 * vegetationRenderer — CivRev2/Polytopia-style forest canopy for bio_district tiles.
 *
 * For each bio_district tile on the board:
 * - One canopy blob mesh (IcosahedronGeometry, vertex-colored dark green,
 *   slightly randomized per tile via seeded noise)
 * - 2-3 small cone trunks poking through the canopy for silhouette variety
 *
 * Canopy covers ~80% of tile area, height ~0.8 units.
 * MeshStandardMaterial with flatShading for consistency with terrain.
 *
 * Pattern: createXxxRenderer(scene, board) → called in WorldScene.create().
 * NO React — pure Three.js.
 */

import * as THREE from "three";
import type { GeneratedBoard } from "../../board";
import { seededRng } from "../../board";
import { TILE_SIZE, tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Canopy covers ~80% of tile width. */
const CANOPY_RADIUS = (TILE_SIZE * 0.8) / 2;
const CANOPY_HEIGHT = 0.8;
const CANOPY_DETAIL = 1; // icosahedron subdivision level

/** Base canopy color — dark green with variation. */
const CANOPY_BASE_COLOR = new THREE.Color(0x2d7a1e);
const CANOPY_LIGHT_COLOR = new THREE.Color(0x4da83a);

/** Trunk dimensions. */
const TRUNK_RADIUS = 0.06;
const TRUNK_HEIGHT = 0.5;
const TRUNK_COLOR = new THREE.Color(0x3d2817);

/** Maximum number of accent trunks per tile. */
const MIN_TRUNKS = 2;
const MAX_TRUNKS = 3;

// ---------------------------------------------------------------------------
// Seeded hash for per-tile determinism
// ---------------------------------------------------------------------------

function tileHash(x: number, z: number, layer: number): number {
	let h = 2166136261;
	h ^= x;
	h = Math.imul(h, 16777619);
	h ^= z;
	h = Math.imul(h, 16777619);
	h ^= layer;
	h = Math.imul(h, 16777619);
	return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Build a single canopy blob
// ---------------------------------------------------------------------------

function buildCanopyMesh(
	tx: number,
	tz: number,
): THREE.Mesh {
	const geo = new THREE.IcosahedronGeometry(CANOPY_RADIUS, CANOPY_DETAIL);

	// Squash vertically to make an oblate dome
	const posAttr = geo.attributes.position;
	for (let i = 0; i < posAttr.count; i++) {
		const y = posAttr.getY(i);
		// Flatten: scale Y to 50% of radius → height ~0.8 * radius
		posAttr.setY(i, y * 0.5);

		// Seeded per-vertex jitter for organic feel
		const jitter = tileHash(tx * 100 + i, tz * 100 + i, 0) * 0.15 - 0.075;
		posAttr.setX(i, posAttr.getX(i) + jitter);
		posAttr.setZ(i, posAttr.getZ(i) + jitter);
		posAttr.setY(i, posAttr.getY(i) + jitter * 0.5);
	}

	// Per-vertex coloring — mix dark/light green
	const colors: number[] = [];
	const tmpColor = new THREE.Color();
	for (let i = 0; i < posAttr.count; i++) {
		const t = tileHash(tx + i * 3, tz + i * 7, 1);
		tmpColor.copy(CANOPY_BASE_COLOR).lerp(CANOPY_LIGHT_COLOR, t);
		colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
	}
	geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	geo.computeVertexNormals();

	const mat = new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness: 0.85,
		flatShading: true,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

// ---------------------------------------------------------------------------
// Build accent trunk cones
// ---------------------------------------------------------------------------

function buildTrunkMeshes(
	tx: number,
	tz: number,
	trunkCount: number,
): THREE.Mesh[] {
	const mat = new THREE.MeshStandardMaterial({
		color: TRUNK_COLOR,
		roughness: 0.95,
		flatShading: true,
	});

	const trunks: THREE.Mesh[] = [];
	for (let i = 0; i < trunkCount; i++) {
		const geo = new THREE.ConeGeometry(TRUNK_RADIUS, TRUNK_HEIGHT, 5);
		const mesh = new THREE.Mesh(geo, mat);
		mesh.castShadow = true;

		// Offset within tile — spread across canopy area
		const angle = tileHash(tx, tz, 10 + i) * Math.PI * 2;
		const dist = tileHash(tx, tz, 20 + i) * CANOPY_RADIUS * 0.6;
		mesh.position.set(
			Math.cos(angle) * dist,
			CANOPY_HEIGHT * 0.3 + TRUNK_HEIGHT / 2,
			Math.sin(angle) * dist,
		);

		trunks.push(mesh);
	}

	return trunks;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan the board for bio_district tiles and place canopy + trunks.
 * Call once in WorldScene.create().
 */
export function createVegetationRenderer(
	scene: THREE.Scene,
	board: GeneratedBoard,
): void {
	const { width, height } = board.config;
	const rng = seededRng(board.config.seed + "_veg");

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]?.[x];
			if (!tile || tile.floorType !== "bio_district") continue;

			const pos = tileToWorld(x, z);
			const group = new THREE.Group();

			// --- Canopy blob ---
			const canopy = buildCanopyMesh(x, z);
			// Slight Y offset so canopy sits above terrain
			canopy.position.y = CANOPY_HEIGHT * 0.5;
			// Per-tile rotation for variety
			canopy.rotation.y = tileHash(x, z, 50) * Math.PI * 2;
			// Per-tile scale variation +-10%
			const scaleFactor = 0.9 + tileHash(x, z, 60) * 0.2;
			canopy.scale.setScalar(scaleFactor);
			group.add(canopy);

			// --- Accent trunks ---
			const trunkCount =
				MIN_TRUNKS + Math.floor(tileHash(x, z, 70) * (MAX_TRUNKS - MIN_TRUNKS + 1));
			const trunks = buildTrunkMeshes(x, z, trunkCount);
			for (const trunk of trunks) {
				group.add(trunk);
			}

			group.position.set(pos.x, pos.y, pos.z);
			scene.add(group);
		}
	}
}
