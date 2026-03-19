/**
 * terrainRenderer — builds the vertex-colored flat-shaded terrain mesh.
 *
 * Takes a GeneratedBoard and creates a Three.js mesh with:
 * - Per-vertex colors from FloorType → color lookup
 * - Elevation from tile data
 * - MeshStandardMaterial with vertexColors + flatShading (POC recipe)
 * - Deep water plane underneath
 *
 * Pattern from poc-roboforming.html buildTerrain().
 */

import * as THREE from "three";
import type { GeneratedBoard, TileData } from "../../board";
import type { FloorType } from "../../terrain";

// ---------------------------------------------------------------------------
// FloorType → terrain color lookup
// ---------------------------------------------------------------------------

const FLOOR_COLORS: Record<FloorType, THREE.Color> = {
	void_pit: new THREE.Color(0x0a0a12),
	structural_mass: new THREE.Color(0x7f8c8d),
	abyssal_platform: new THREE.Color(0x2c3e50),
	transit_deck: new THREE.Color(0x5a5a5a),
	durasteel_span: new THREE.Color(0x8a8a90),
	collapsed_zone: new THREE.Color(0x6b5b3a),
	dust_district: new THREE.Color(0xc2b280),
	bio_district: new THREE.Color(0x5daa3e),
	aerostructure: new THREE.Color(0x4a6fa5),
};

const DEFAULT_COLOR = new THREE.Color(0x444455);

// ---------------------------------------------------------------------------
// Elevation → Y offset
// ---------------------------------------------------------------------------

const ELEVATION_Y: Record<number, number> = {
	[-1]: -0.5, // pits / void
	0: 0.0, // ground level
	1: 1.0, // hills
	2: 2.0, // mountains
};

const TILE_SIZE = 2; // world units per tile

// ---------------------------------------------------------------------------
// Build terrain mesh
// ---------------------------------------------------------------------------

export function buildTerrainMesh(board: GeneratedBoard): THREE.Group {
	const { width, height } = board.config;
	const group = new THREE.Group();

	// Main terrain
	const segments = width * 2;
	const segmentsZ = height * 2;
	const geo = new THREE.PlaneGeometry(
		width * TILE_SIZE,
		height * TILE_SIZE,
		segments,
		segmentsZ,
	);
	geo.rotateX(-Math.PI / 2);
	geo.translate((width * TILE_SIZE) / 2, 0, (height * TILE_SIZE) / 2);

	const posAttr = geo.attributes.position;
	const colors: number[] = [];
	const tmpColor = new THREE.Color();

	for (let i = 0; i < posAttr.count; i++) {
		const vx = posAttr.getX(i);
		const vz = posAttr.getZ(i);

		// Map vertex position to tile grid
		let gx = Math.floor(vx / TILE_SIZE);
		let gz = Math.floor(vz / TILE_SIZE);
		gx = Math.max(0, Math.min(width - 1, gx));
		gz = Math.max(0, Math.min(height - 1, gz));

		const tile: TileData = board.tiles[gz]?.[gx] ?? {
			x: gx,
			z: gz,
			elevation: 0 as const,
			passable: true,
			floorType: "structural_mass" as FloorType,
			resourceMaterial: null,
			resourceAmount: 0,
		};

		// Elevation + subtle noise
		const baseY = ELEVATION_Y[tile.elevation] ?? 0;
		const noiseY =
			(Math.sin(vx * 0.4) + Math.cos(vz * 0.4)) * 0.15;
		posAttr.setY(i, baseY + (tile.elevation >= 0 ? noiseY : 0));

		// Vertex color from floor type
		const baseColor = FLOOR_COLORS[tile.floorType] ?? DEFAULT_COLOR;
		tmpColor.copy(baseColor);
		// Subtle noise variation
		tmpColor.multiplyScalar(1 - noiseY * 0.15);
		colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
	}

	geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	geo.computeVertexNormals();

	const mat = new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness: 0.9,
		flatShading: true,
	});

	const terrainMesh = new THREE.Mesh(geo, mat);
	terrainMesh.receiveShadow = true;
	group.add(terrainMesh);

	// Deep water plane (below terrain)
	const waterGeo = new THREE.PlaneGeometry(
		width * TILE_SIZE * 2,
		height * TILE_SIZE * 2,
	);
	waterGeo.rotateX(-Math.PI / 2);
	const waterMat = new THREE.MeshStandardMaterial({
		color: 0x001122,
		emissive: 0x000511,
		roughness: 0.1,
		transparent: true,
		opacity: 0.8,
	});
	const water = new THREE.Mesh(waterGeo, waterMat);
	water.position.set(
		(width * TILE_SIZE) / 2,
		-0.6,
		(height * TILE_SIZE) / 2,
	);
	group.add(water);

	return group;
}

/**
 * Tile grid coordinates → world position.
 */
export function tileToWorld(
	tileX: number,
	tileZ: number,
): { x: number; y: number; z: number } {
	return {
		x: tileX * TILE_SIZE + TILE_SIZE / 2,
		y: 0,
		z: tileZ * TILE_SIZE + TILE_SIZE / 2,
	};
}

/**
 * World position → tile grid coordinates.
 */
export function worldToTile(
	worldX: number,
	worldZ: number,
): { x: number; z: number } {
	return {
		x: Math.floor(worldX / TILE_SIZE),
		z: Math.floor(worldZ / TILE_SIZE),
	};
}

export { TILE_SIZE };
