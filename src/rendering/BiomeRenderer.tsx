/**
 * BiomeRenderer — Layer 2: biome surface textures painted on top of the
 * height mesh (Layer 1).
 *
 * Uses the same geometry as BoardRenderer (shared buildBoardGeometry) but
 * a different ShaderMaterial — the procedural floor shader from
 * src/ecs/terrain/floorShader.ts with alpha blending enabled.
 *
 * Positioned at Y=0.001 to avoid z-fighting with the height mesh.
 * transparent + depthWrite:false ensures proper layering.
 */

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import {
	makeFloorShaderMaterial,
	updateFloorShaderChronometry,
} from "../ecs/terrain/floorShader";
import { buildBoardGeometry, buildSphereGeometry } from "./boardGeometry";

type BiomeRendererProps = {
	board: GeneratedBoard;
	/** Orbital illuminator azimuth [0, 2π] — from chronometry.turnToChronometry(). */
	dayAngle?: number;
	/** Orbital year progress [0, 1] — from chronometry.turnToChronometry(). */
	season?: number;
	/** When true, project the board onto a sphere instead of a flat plane. */
	useSphere?: boolean;
};

export function BiomeRenderer({
	board,
	dayAngle = 0.8,
	season = 0,
	useSphere = false,
}: BiomeRendererProps) {
	const { scene } = useThree();
	const meshRef = useRef<THREE.Mesh | null>(null);
	const boardCenterX = Math.floor(board.config.width / 2) * TILE_SIZE_M;
	const boardCenterZ = Math.floor(board.config.height / 2) * TILE_SIZE_M;
	const boardWidth = board.config.width * TILE_SIZE_M;
	const materialRef = useRef<THREE.ShaderMaterial>(
		makeFloorShaderMaterial(
			board.config.seed,
			boardCenterX,
			boardCenterZ,
		),
	);

	// Set boardWidth for cylindrical curvature calculation
	useEffect(() => {
		materialRef.current.uniforms.uBoardWidth.value = boardWidth;
	}, [boardWidth]);

	// Update sun direction and color whenever the game turn advances.
	useEffect(() => {
		updateFloorShaderChronometry(materialRef.current, dayAngle, season);
	}, [dayAngle, season]);

	useEffect(() => {
		const geometry = useSphere
			? buildSphereGeometry(board)
			: buildBoardGeometry(board);
		const mesh = new THREE.Mesh(geometry, materialRef.current);
		if (!useSphere) {
			mesh.position.y = 0.001; // tiny offset to avoid z-fighting with height mesh
		}
		mesh.receiveShadow = true;
		scene.add(mesh);
		meshRef.current = mesh;

		return () => {
			scene.remove(mesh);
			geometry.dispose();
			meshRef.current = null;
		};
	}, [board, scene, useSphere]);

	useEffect(() => {
		return () => {
			materialRef.current.dispose();
		};
	}, []);

	return null;
}
