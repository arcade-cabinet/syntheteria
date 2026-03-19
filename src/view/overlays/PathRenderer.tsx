/**
 * PathRenderer — glowing path line through corridors on move hover.
 *
 * When a player selects a unit and hovers a reachable destination, this
 * draws a glowing line mesh on the ground connecting the tiles along the
 * A* shortest path. Uses a module-level path store (same pattern as
 * hoverState and toastNotifications) that BoardInput updates during hover.
 *
 * The line is a flat ribbon of quads connecting tile centers, with an
 * emissive material for the glow effect.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../../board/grid";
import { ELEVATION_STEP_M } from "../../config/gameDefaults";

// ---------------------------------------------------------------------------
// Path state store (module-level, same pattern as hoverState)
// ---------------------------------------------------------------------------

export interface PathPoint {
	tileX: number;
	tileZ: number;
	elevation: number;
}

let currentPath: PathPoint[] = [];
let pathVersion = 0;
const pathListeners = new Set<() => void>();

function notifyPathListeners() {
	for (const fn of pathListeners) fn();
}

/**
 * Set the preview path. Called by BoardInput when a unit is selected
 * and the player hovers over a reachable tile.
 */
export function setPreviewPath(path: PathPoint[]): void {
	currentPath = path;
	pathVersion++;
	notifyPathListeners();
}

/**
 * Clear the preview path. Called when the unit is deselected,
 * when the hover leaves a reachable tile, or when a move is confirmed.
 */
export function clearPreviewPath(): void {
	if (currentPath.length === 0) return;
	currentPath = [];
	pathVersion++;
	notifyPathListeners();
}

export function getPreviewPath(): PathPoint[] {
	return currentPath;
}

export function getPathVersion(): number {
	return pathVersion;
}

export function subscribePathState(fn: () => void): () => void {
	pathListeners.add(fn);
	return () => pathListeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Path line geometry
// ---------------------------------------------------------------------------

/** Width of the path ribbon in world units. */
const PATH_WIDTH = 0.12;

/** Height above floor for path ribbon. */
const PATH_Y_OFFSET = 0.03;

/** Emissive color for path glow. */
const PATH_COLOR = 0x00ffaa;

/** Emissive intensity. */
const PATH_EMISSIVE_INTENSITY = 1.2;

/** Opacity. */
const PATH_OPACITY = 0.7;

function buildPathGeometry(path: PathPoint[]): THREE.BufferGeometry | null {
	if (path.length < 2) return null;

	// Each segment between consecutive path points is a quad (4 verts, 6 indices)
	const segmentCount = path.length - 1;
	const positions = new Float32Array(segmentCount * 4 * 3);
	const normals = new Float32Array(segmentCount * 4 * 3);
	const indices = new Uint32Array(segmentCount * 6);

	const halfW = PATH_WIDTH / 2;

	for (let i = 0; i < segmentCount; i++) {
		const from = path[i];
		const to = path[i + 1];

		const fx = from.tileX * TILE_SIZE_M;
		const fz = from.tileZ * TILE_SIZE_M;
		const fy = from.elevation * ELEVATION_STEP_M + PATH_Y_OFFSET;

		const tx = to.tileX * TILE_SIZE_M;
		const tz = to.tileZ * TILE_SIZE_M;
		const ty = to.elevation * ELEVATION_STEP_M + PATH_Y_OFFSET;

		// Direction vector from → to
		const dx = tx - fx;
		const dz = tz - fz;
		const len = Math.sqrt(dx * dx + dz * dz);
		if (len === 0) continue;

		// Perpendicular vector (for ribbon width)
		const px = (-dz / len) * halfW;
		const pz = (dx / len) * halfW;

		const vBase = i * 4;
		const pOff = vBase * 3;

		// 4 vertices of the quad: from-left, from-right, to-right, to-left
		positions[pOff] = fx + px;
		positions[pOff + 1] = fy;
		positions[pOff + 2] = fz + pz;
		positions[pOff + 3] = fx - px;
		positions[pOff + 4] = fy;
		positions[pOff + 5] = fz - pz;
		positions[pOff + 6] = tx - px;
		positions[pOff + 7] = ty;
		positions[pOff + 8] = tz - pz;
		positions[pOff + 9] = tx + px;
		positions[pOff + 10] = ty;
		positions[pOff + 11] = tz + pz;

		// Normals — all pointing up
		for (let v = 0; v < 4; v++) {
			normals[pOff + v * 3] = 0;
			normals[pOff + v * 3 + 1] = 1;
			normals[pOff + v * 3 + 2] = 0;
		}

		// Indices — two triangles
		const iOff = i * 6;
		indices[iOff] = vBase;
		indices[iOff + 1] = vBase + 1;
		indices[iOff + 2] = vBase + 2;
		indices[iOff + 3] = vBase;
		indices[iOff + 4] = vBase + 2;
		indices[iOff + 5] = vBase + 3;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));

	return geometry;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PathRenderer() {
	const { scene } = useThree();
	const meshRef = useRef<THREE.Mesh | null>(null);
	const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
	const lastVersionRef = useRef(-1);

	useEffect(() => {
		const material = new THREE.MeshStandardMaterial({
			color: 0x000000,
			emissive: PATH_COLOR,
			emissiveIntensity: PATH_EMISSIVE_INTENSITY,
			transparent: true,
			opacity: PATH_OPACITY,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		materialRef.current = material;

		return () => {
			if (meshRef.current) {
				scene.remove(meshRef.current);
				meshRef.current.geometry.dispose();
				meshRef.current = null;
			}
			material.dispose();
			materialRef.current = null;
		};
	}, [scene]);

	useFrame(() => {
		const version = getPathVersion();
		if (version === lastVersionRef.current) return;
		lastVersionRef.current = version;

		// Remove old mesh
		if (meshRef.current) {
			scene.remove(meshRef.current);
			meshRef.current.geometry.dispose();
			meshRef.current = null;
		}

		const path = getPreviewPath();
		const geometry = buildPathGeometry(path);
		if (!geometry || !materialRef.current) return;

		const mesh = new THREE.Mesh(geometry, materialRef.current);
		mesh.renderOrder = 8; // above territory, below UI
		scene.add(mesh);
		meshRef.current = mesh;
	});

	return null;
}
