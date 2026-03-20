/**
 * Board geometry — sphere projection of the tile grid.
 *
 * buildSphereGeometry() — maps the tile grid onto a SphereGeometry via
 *                         equirectangular projection (lat/long)
 *
 * Coordinate helpers:
 *   tileToSpherePos(x, z, W, H, R) — grid coords → 3D sphere position
 *   spherePosToTile(pos, W, H, R)  — 3D sphere position → grid coords
 *   sphereRadius(W, H)             — board dimensions → sphere radius
 */

import * as THREE from "three";
import { FLOOR_INDEX_MAP, sampleElevation } from "../../terrain";
import { TILE_SIZE_M } from "../grid";
import type { GeneratedBoard } from "../types";

/**
 * SEGS=3 → 16 verts/tile — smooth enough for curvature + height blending.
 * Higher = smoother terrain edges but more geometry.
 */
export const SEGS = 3;

// ===========================================================================
// Sphere geometry — equirectangular projection of the tile grid
// ===========================================================================

/**
 * Compute the sphere radius for a given board size.
 *
 * The height dimension maps to PI radians of latitude (pole-to-pole),
 * so: H * TILE_SIZE_M = PI * R → R = H * TILE_SIZE_M / PI.
 *
 * This ensures each tile subtends the same angular height on the sphere,
 * and the full board wraps pole-to-pole vertically.
 */
export function sphereRadius(boardWidth: number, boardHeight: number): number {
	return (boardHeight * TILE_SIZE_M) / Math.PI;
}

/**
 * Convert tile grid coordinates to a 3D position on the sphere surface.
 *
 * Uses equirectangular projection:
 *   x → longitude (0..2*PI wrapping east-west)
 *   z → latitude  (PI/2 at z=0 → -PI/2 at z=H, north pole to south pole)
 *
 * The +0.5 offset centers the coordinate at the tile's midpoint.
 */
export function tileToSpherePos(
	tileX: number,
	tileZ: number,
	boardWidth: number,
	boardHeight: number,
	radius: number,
): { x: number; y: number; z: number } {
	// Longitude: tile x maps to [0, 2*PI), wrapping east-west
	const lon = ((tileX + 0.5) / boardWidth) * Math.PI * 2;
	// Latitude: tile z=0 → north pole (PI/2), z=H → south pole (-PI/2)
	const lat = Math.PI / 2 - ((tileZ + 0.5) / boardHeight) * Math.PI;

	const cosLat = Math.cos(lat);
	return {
		x: radius * cosLat * Math.cos(lon),
		y: radius * Math.sin(lat),
		z: radius * cosLat * Math.sin(lon),
	};
}

/**
 * Convert a 3D sphere-surface position back to tile grid coordinates.
 *
 * Inverse of tileToSpherePos. The position is normalized to the sphere
 * surface before conversion — the input need not be exactly at radius R.
 *
 * Returns clamped integer tile coordinates within [0, W) and [0, H).
 */
export function spherePosToTile(
	pos: { x: number; y: number; z: number },
	boardWidth: number,
	boardHeight: number,
	_radius: number,
): { x: number; z: number } {
	// Normalize to unit sphere for lat/lon extraction
	const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
	const nx = pos.x / len;
	const ny = pos.y / len;
	const nz = pos.z / len;

	// Latitude: asin(ny) → [-PI/2, PI/2]
	const lat = Math.asin(Math.max(-1, Math.min(1, ny)));
	// Longitude: atan2(nz, nx) → [-PI, PI], remap to [0, 2*PI)
	let lon = Math.atan2(nz, nx);
	if (lon < 0) lon += Math.PI * 2;

	// Invert the projection:
	// lon = ((tileX + 0.5) / W) * 2*PI → tileX = lon * W / (2*PI) - 0.5
	// lat = PI/2 - ((tileZ + 0.5) / H) * PI → tileZ = (PI/2 - lat) * H / PI - 0.5
	const tileX = Math.round((lon * boardWidth) / (Math.PI * 2) - 0.5);
	const tileZ = Math.round(((Math.PI / 2 - lat) * boardHeight) / Math.PI - 0.5);

	return {
		x: Math.max(0, Math.min(boardWidth - 1, tileX)),
		z: Math.max(0, Math.min(boardHeight - 1, tileZ)),
	};
}

/**
 * Build a SphereGeometry from the board's tile grid.
 *
 * Maps each tile to a patch on the sphere via equirectangular projection.
 * Each tile is subdivided into SEGS x SEGS quads (same as flat geometry)
 * for smooth curvature and elevation blending.
 *
 * Vertex attributes:
 *   position  — 3D point on sphere surface
 *   uv        — per-tile-quad UV (for PBR atlas sampling)
 *   normal    — outward from sphere center
 *   elevation — bilinear interpolation of tile elevations (radial offset)
 *   floorIndex — atlas cell index for the tile's FloorType
 */
export function buildSphereGeometry(
	board: GeneratedBoard,
): THREE.BufferGeometry {
	const { width, height } = board.config;
	const R = sphereRadius(width, height);

	const totalTiles = width * height;
	const vertsPerTile = (SEGS + 1) * (SEGS + 1);
	const trisPerTile = SEGS * SEGS * 2;

	const verts = new Float32Array(totalTiles * vertsPerTile * 3);
	const normals = new Float32Array(totalTiles * vertsPerTile * 3);
	const uvs = new Float32Array(totalTiles * vertsPerTile * 2);
	const elevations = new Float32Array(totalTiles * vertsPerTile);
	const floorIndices = new Float32Array(totalTiles * vertsPerTile);
	const idxs = new Uint32Array(totalTiles * trisPerTile * 3);

	let vi = 0; // vertex position write index
	let ni = 0; // normal write index
	let ui = 0; // uv write index
	let ei = 0; // elevation write index
	let fii = 0; // floorIndex write index
	let ii = 0; // index buffer write index

	for (let tz = 0; tz < height; tz++) {
		for (let tx = 0; tx < width; tx++) {
			const baseVert = vi / 3;

			for (let r = 0; r <= SEGS; r++) {
				for (let c = 0; c <= SEGS; c++) {
					// Fractional tile coordinate for this vertex
					const fracX = tx + c / SEGS;
					const fracZ = tz + r / SEGS;

					// Equirectangular projection to sphere
					const lon = (fracX / width) * Math.PI * 2;
					const lat = Math.PI / 2 - (fracZ / height) * Math.PI;
					const cosLat = Math.cos(lat);

					// Normal = outward unit vector
					const nx = cosLat * Math.cos(lon);
					const ny = Math.sin(lat);
					const nz = cosLat * Math.sin(lon);

					// Elevation: sample from the board at this world position
					// (using flat-space coordinates for the elevation sampler)
					const worldX = fracX * TILE_SIZE_M;
					const worldZ = fracZ * TILE_SIZE_M;
					const elev = sampleElevation(board, worldX, worldZ);

					// Displace along the normal by elevation
					const rDisp = R + elev;
					verts[vi++] = nx * rDisp;
					verts[vi++] = ny * rDisp;
					verts[vi++] = nz * rDisp;

					normals[ni++] = nx;
					normals[ni++] = ny;
					normals[ni++] = nz;

					// Per-quad UV for PBR atlas sampling (same as flat geometry)
					uvs[ui++] = c / SEGS;
					uvs[ui++] = 1 - r / SEGS;

					elevations[ei++] = elev;
				}
			}

			// Floor index for this tile
			const ft = board.tiles[tz]?.[tx]?.floorType ?? "void_pit";
			const cellIdx = FLOOR_INDEX_MAP[ft] ?? 8;
			for (let fi = 0; fi < vertsPerTile; fi++) {
				floorIndices[fii++] = cellIdx;
			}

			// CCW triangles (same winding as flat geometry)
			const row = SEGS + 1;
			for (let r = 0; r < SEGS; r++) {
				for (let c = 0; c < SEGS; c++) {
					const tl = baseVert + r * row + c;
					const tr = tl + 1;
					const bl = tl + row;
					const br = bl + 1;
					idxs[ii++] = tl;
					idxs[ii++] = bl;
					idxs[ii++] = tr;
					idxs[ii++] = tr;
					idxs[ii++] = bl;
					idxs[ii++] = br;
				}
			}
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(verts, 3));
	geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
	geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
	geometry.setAttribute("elevation", new THREE.BufferAttribute(elevations, 1));
	geometry.setAttribute(
		"floorIndex",
		new THREE.BufferAttribute(floorIndices, 1),
	);
	geometry.setIndex(new THREE.BufferAttribute(idxs, 1));

	return geometry;
}
