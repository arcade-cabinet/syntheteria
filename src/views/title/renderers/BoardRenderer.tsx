/**
 * BoardRenderer — renders a GeneratedBoard as a single merged mesh.
 *
 * Layer model (CivRev2 armature → flesh → skin approach):
 *
 *   Layer 0 (armature): Logical grid — TileData: x, z, elevation, type.
 *                        Pure data, never rendered directly.
 *
 *   Layer 1 (height):   Geometry with bilinearly-interpolated tile elevation
 *                        as a per-vertex attribute. Vertex shader displaces Y.
 *                        Smooth blending between adjacent tile heights = organic
 *                        terrain (hills rise up, pits bowl down, flat areas flat).
 *
 *   Layer 2 (texture):  Fragment shader blends biome patterns with smoothstep
 *                        transitions — no hard colour edges at type boundaries.
 *                        Planet curvature + exponential fog applied here too.
 *
 *   Layers 3+:          HighlightRenderer, UnitRenderer, BuildingRenderer etc.
 *
 * Single draw call. Each tile subdivided SEGS×SEGS for smooth curvature + height.
 */

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { GeneratedBoard } from "../../../board";
import { buildSphereGeometry, TILE_SIZE_M } from "../../../board";
import {
	makeHeightMaterial,
	updateHeightChronometry,
} from "../materials/heightMaterial";

type BoardRendererProps = {
	board: GeneratedBoard;
	/** Orbital illuminator azimuth [0, 2π] — from chronometry.turnToChronometry(). */
	dayAngle?: number;
	/** Orbital year progress [0, 1] — from chronometry.turnToChronometry(). */
	season?: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BoardRenderer({
	board,
	dayAngle = 0.8,
	season = 0,
}: BoardRendererProps) {
	const { scene } = useThree();
	const meshRef = useRef<THREE.Mesh | null>(null);
	const boardCenterX = Math.floor(board.config.width / 2) * TILE_SIZE_M;
	const boardCenterZ = Math.floor(board.config.height / 2) * TILE_SIZE_M;
	const boardWidth = board.config.width * TILE_SIZE_M;
	const materialRef = useRef<THREE.ShaderMaterial>(
		makeHeightMaterial(boardCenterX, boardCenterZ, dayAngle, season),
	);

	// Set boardWidth for cylindrical curvature calculation
	useEffect(() => {
		materialRef.current.uniforms.uBoardWidth.value = boardWidth;
	}, [boardWidth]);

	// Update sun direction and color whenever the game turn advances.
	useEffect(() => {
		updateHeightChronometry(materialRef.current, dayAngle, season);
	}, [dayAngle, season]);

	useEffect(() => {
		const geometry = buildSphereGeometry(board);
		const mesh = new THREE.Mesh(geometry, materialRef.current);
		mesh.receiveShadow = true;
		scene.add(mesh);
		meshRef.current = mesh;

		return () => {
			scene.remove(mesh);
			geometry.dispose();
			meshRef.current = null;
		};
	}, [board, scene]);

	useEffect(() => {
		return () => {
			materialRef.current.dispose();
		};
	}, []);

	return null;
}
