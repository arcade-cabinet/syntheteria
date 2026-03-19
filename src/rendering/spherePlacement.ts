/**
 * Sphere model placement utilities.
 *
 * Computes position and orientation for placing 3D models on the
 * sphere surface. Models are positioned at the tile's GPS coordinate
 * on the sphere and oriented so their local Y-up aligns with the
 * sphere's outward normal at that point.
 */

import * as THREE from "three";
import { tileToSpherePos, sphereRadius } from "./boardGeometry";

const _up = new THREE.Vector3(0, 1, 0);
const _normal = new THREE.Vector3();
const _fallbackAxis = new THREE.Vector3(0, 0, 1);

/**
 * Compute the 3D position and orientation quaternion for a model
 * at tile (tileX, tileZ) on the sphere surface.
 *
 * @param tileX  Tile X coordinate (can be fractional for lerped positions)
 * @param tileZ  Tile Z coordinate (can be fractional for lerped positions)
 * @param boardWidth  Board width in tiles
 * @param boardHeight Board height in tiles
 * @param yOffset  Local Y offset (e.g., to sit the model on the surface)
 * @returns { position, quaternion } for use in R3F JSX
 */
export function sphereModelPlacement(
	tileX: number,
	tileZ: number,
	boardWidth: number,
	boardHeight: number,
	yOffset = 0,
): { position: [number, number, number]; quaternion: [number, number, number, number] } {
	const R = sphereRadius(boardWidth, boardHeight);
	const pos = tileToSpherePos(tileX, tileZ, boardWidth, boardHeight, R);

	// Normal = outward from sphere center (normalized position)
	const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
	_normal.set(pos.x / len, pos.y / len, pos.z / len);

	// Offset along normal for yOffset (e.g., model base sitting on surface)
	const px = pos.x + _normal.x * yOffset;
	const py = pos.y + _normal.y * yOffset;
	const pz = pos.z + _normal.z * yOffset;

	// Quaternion: rotate from default Y-up to sphere normal
	// Handle degenerate cases: normal near Y-up (identity) or near -Y-up (180° flip)
	const dot = _up.dot(_normal);
	let q: THREE.Quaternion;
	if (dot < -0.9999) {
		// Near south pole — 180° rotation around Z axis
		q = new THREE.Quaternion().setFromAxisAngle(_fallbackAxis, Math.PI);
	} else {
		q = new THREE.Quaternion().setFromUnitVectors(_up, _normal);
	}

	return {
		position: [px, py, pz],
		quaternion: [q.x, q.y, q.z, q.w],
	};
}

/**
 * Compute the quaternion that orients a model's Y-up to match the sphere
 * normal at a given tile position, with an additional Y-axis rotation
 * (e.g., for walls that face a specific direction).
 */
export function sphereModelPlacementWithRotation(
	tileX: number,
	tileZ: number,
	boardWidth: number,
	boardHeight: number,
	yRotation: number,
	yOffset = 0,
): { position: [number, number, number]; quaternion: [number, number, number, number] } {
	const R = sphereRadius(boardWidth, boardHeight);
	const pos = tileToSpherePos(tileX, tileZ, boardWidth, boardHeight, R);

	const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
	_normal.set(pos.x / len, pos.y / len, pos.z / len);

	const px = pos.x + _normal.x * yOffset;
	const py = pos.y + _normal.y * yOffset;
	const pz = pos.z + _normal.z * yOffset;

	// First: align Y-up to sphere normal (handle degenerate near-pole cases)
	const dot = _up.dot(_normal);
	const qSurface = dot < -0.9999
		? new THREE.Quaternion().setFromAxisAngle(_fallbackAxis, Math.PI)
		: new THREE.Quaternion().setFromUnitVectors(_up, _normal);
	// Then: apply Y-axis rotation in the model's local frame
	const qYaw = new THREE.Quaternion().setFromAxisAngle(_normal, yRotation);
	const q = qYaw.multiply(qSurface);

	return {
		position: [px, py, pz],
		quaternion: [q.x, q.y, q.z, q.w],
	};
}

/**
 * Convert flat world-space coordinates (wx, wz) to tile coordinates
 * for sphere placement. Used by renderers that compute positions in
 * world space (e.g., StructureRenderer wall positions).
 */
export function worldToTileCoords(
	wx: number,
	wz: number,
	tileSizeM: number,
): { tileX: number; tileZ: number } {
	return {
		tileX: wx / tileSizeM,
		tileZ: wz / tileSizeM,
	};
}
