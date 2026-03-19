/**
 * BiomeRenderer — Layer 2: biome surface textures painted on top of the
 * height mesh (Layer 1).
 *
 * Uses the same sphere geometry as BoardRenderer but a different
 * ShaderMaterial — the procedural floor shader from
 * src/terrain/floorShader.ts with alpha blending enabled.
 */

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import {
	makeFloorShaderMaterial,
	updateFloorShaderChronometry,
} from "../terrain/floorShader";
import { buildSphereGeometry } from "./boardGeometry";

type BiomeRendererProps = {
	board: GeneratedBoard;
	/** Orbital illuminator azimuth [0, 2π] — from chronometry.turnToChronometry(). */
	dayAngle?: number;
	/** Orbital year progress [0, 1] — from chronometry.turnToChronometry(). */
	season?: number;
};

export function BiomeRenderer({
	board,
	dayAngle = 0.8,
	season = 0,
}: BiomeRendererProps) {
	const { scene } = useThree();
	const meshRef = useRef<THREE.Mesh | null>(null);
	const boardCenterX = Math.floor(board.config.width / 2) * TILE_SIZE_M;
	const boardCenterZ = Math.floor(board.config.height / 2) * TILE_SIZE_M;
	const boardWidth = board.config.width * TILE_SIZE_M;
	const materialRef = useRef<THREE.ShaderMaterial>(
		makeFloorShaderMaterial(board.config.seed, boardCenterX, boardCenterZ),
	);

	// Set boardWidth for shader uniform
	useEffect(() => {
		materialRef.current.uniforms.uBoardWidth.value = boardWidth;
	}, [boardWidth]);

	// Update sun direction and color whenever the game turn advances.
	useEffect(() => {
		updateFloorShaderChronometry(materialRef.current, dayAngle, season);
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
