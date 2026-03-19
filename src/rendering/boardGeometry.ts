/**
 * Shared board geometry builder — used by both BoardRenderer (Layer 1)
 * and BiomeRenderer (Layer 2).
 *
 * Builds a subdivided mesh covering the board + ghost tiles, with bilinear
 * elevation displacement stored as a per-vertex attribute.
 */

import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import { sampleElevation } from "../ecs/terrain/elevationSampler";
import { FLOOR_INDEX_MAP } from "../ecs/terrain/types";

/**
 * SEGS=3 → 16 verts/tile — smooth enough for curvature + height blending.
 * Higher = smoother terrain edges but more geometry.
 */
export const SEGS = 3;

/**
 * GHOST — extra tile rows/cols rendered beyond each board edge.
 *
 * These tiles are not part of the game logic — they are purely visual.
 * The floor shader is position-based FBM noise, so it extends naturally.
 * Elevation at ghost tiles is clamped to the nearest board edge (tileElevY
 * already clamps). The fog hides the ghost region, making the board appear
 * seamlessly endless when panning.
 */
export const GHOST = 30;

/**
 * Curvature radius for the cylindrical board shape.
 * R = 0.5 / uCurve. With uCurve=0.0008, R=625.
 * Baked into geometry so the mesh IS curved, not flat-with-shader-hack.
 */
const CURVE_STRENGTH = 0.0008;

export function buildBoardGeometry(board: GeneratedBoard): THREE.BufferGeometry {
	const { width, height } = board.config;

	const renderW = width + 2 * GHOST;
	const renderH = height + 2 * GHOST;
	const totalTiles = renderW * renderH;

	const vertsPerTile = (SEGS + 1) * (SEGS + 1);
	const trisPerTile = SEGS * SEGS * 2;

	const verts = new Float32Array(totalTiles * vertsPerTile * 3);
	const uvs = new Float32Array(totalTiles * vertsPerTile * 2);
	const elevations = new Float32Array(totalTiles * vertsPerTile);
	const floorIndices = new Float32Array(totalTiles * vertsPerTile);
	const idxs = new Uint32Array(totalTiles * trisPerTile * 3);

	// Board center in world coords — curvature origin
	const cx = (width / 2) * TILE_SIZE_M;
	const cz = (height / 2) * TILE_SIZE_M;
	const R = 0.5 / Math.max(CURVE_STRENGTH, 0.0001);

	let vi = 0;
	let ui = 0;
	let ei = 0;
	let fii = 0;
	let ii = 0;

	for (let tz = -GHOST; tz < height + GHOST; tz++) {
		for (let tx = -GHOST; tx < width + GHOST; tx++) {
			const wx0 = (tx - 0.5) * TILE_SIZE_M;
			const wz0 = (tz - 0.5) * TILE_SIZE_M;
			const step = TILE_SIZE_M / SEGS;

			const baseVert = vi / 3;

			for (let r = 0; r <= SEGS; r++) {
				for (let c = 0; c <= SEGS; c++) {
					const vx = wx0 + c * step;
					const vz = wz0 + r * step;

					// Cylindrical curvature baked into geometry —
					// the mesh IS curved, not flat with a shader displacement.
					const offX = vx - cx;
					const offZ = vz - cz;
					const curveY = (Math.cos(offX / R) * R - R) + (Math.cos(offZ / R) * R - R);

					verts[vi++] = vx;
					verts[vi++] = curveY; // CURVED, not flat
					verts[vi++] = vz;

					uvs[ui++] = c / SEGS;
					uvs[ui++] = 1 - r / SEGS;

					// Bilinear elevation at this vertex position
					elevations[ei++] = sampleElevation(board, vx, vz);
				}
			}

			// Floor index for this tile — same value for every vertex in the tile
			const clampedTx = Math.max(0, Math.min(width - 1, tx));
			const clampedTz = Math.max(0, Math.min(height - 1, tz));
			const isGhost = tx < 0 || tx >= width || tz < 0 || tz >= height;
			const ft = isGhost ? "void_pit" : (board.tiles[clampedTz]?.[clampedTx]?.floorType ?? "void_pit");
			const cellIdx = FLOOR_INDEX_MAP[ft] ?? 8;
			for (let fi = 0; fi < vertsPerTile; fi++) {
				floorIndices[fii++] = cellIdx;
			}

			// CCW triangles
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
	geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
	geometry.setAttribute("elevation", new THREE.BufferAttribute(elevations, 1));
	geometry.setAttribute("floorIndex", new THREE.BufferAttribute(floorIndices, 1));
	geometry.setIndex(new THREE.BufferAttribute(idxs, 1));
	geometry.computeVertexNormals();

	return geometry;
}
