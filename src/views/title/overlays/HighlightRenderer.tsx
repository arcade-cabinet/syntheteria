/**
 * HighlightRenderer — renders emissive overlays on highlighted tiles.
 *
 * Queries the ECS world each frame for entities with TileHighlight.emissive > 0,
 * and maintains a pool of thin plane meshes positioned above the tile surface.
 *
 * Supports both flat board and sphere placement via useSphere prop.
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
	ELEVATION_STEP_M,
	sphereModelPlacement,
	TILE_SIZE_M,
} from "../../../board";
import { Tile, TileHighlight } from "../../../traits";

type HighlightRendererProps = {
	world: World;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
};

const HIGHLIGHT_Y_OFFSET = 0.02;
const HIGHLIGHT_SIZE = TILE_SIZE_M * 0.95;

function makeHighlightMesh(): THREE.Mesh {
	const geometry = new THREE.PlaneGeometry(HIGHLIGHT_SIZE, HIGHLIGHT_SIZE);
	geometry.rotateX(-Math.PI / 2);
	const material = new THREE.MeshStandardMaterial({
		transparent: true,
		opacity: 0.7,
		depthWrite: false,
		emissive: new THREE.Color(0x00ffaa),
		emissiveIntensity: 1.0,
		color: 0x000000,
		side: THREE.DoubleSide,
	});
	return new THREE.Mesh(geometry, material);
}

export function HighlightRenderer({
	world,
	useSphere,
	boardWidth,
	boardHeight,
}: HighlightRendererProps) {
	const { scene } = useThree();
	const poolRef = useRef<Map<string, THREE.Mesh>>(new Map());

	// Dispose on unmount
	useEffect(() => {
		return () => {
			for (const mesh of poolRef.current.values()) {
				scene.remove(mesh);
				mesh.geometry.dispose();
				(mesh.material as THREE.MeshStandardMaterial).dispose();
			}
			poolRef.current.clear();
		};
	}, [scene]);

	useFrame(() => {
		const pool = poolRef.current;
		const activeKeys = new Set<string>();

		for (const entity of world.query(Tile, TileHighlight)) {
			const highlight = entity.get(TileHighlight);
			if (!highlight || highlight.emissive <= 0) continue;

			const tile = entity.get(Tile);
			if (!tile) continue;

			const key = `${tile.x},${tile.z}`;
			activeKeys.add(key);

			let mesh = pool.get(key);
			if (!mesh) {
				mesh = makeHighlightMesh();
				scene.add(mesh);
				pool.set(key, mesh);
			}

			if (useSphere && boardWidth && boardHeight) {
				// Sphere placement: position on curved surface with tangent orientation
				const yOff = tile.elevation * ELEVATION_STEP_M + HIGHLIGHT_Y_OFFSET;
				const sp = sphereModelPlacement(
					tile.x,
					tile.z,
					boardWidth,
					boardHeight,
					yOff,
				);
				mesh.position.set(sp.position[0], sp.position[1], sp.position[2]);
				mesh.quaternion.set(
					sp.quaternion[0],
					sp.quaternion[1],
					sp.quaternion[2],
					sp.quaternion[3],
				);
			} else {
				// Flat board placement
				const wx = tile.x * TILE_SIZE_M;
				const wy = tile.elevation * ELEVATION_STEP_M + HIGHLIGHT_Y_OFFSET;
				const wz = tile.z * TILE_SIZE_M;
				mesh.position.set(wx, wy, wz);
				mesh.quaternion.identity();
			}

			const mat = mesh.material as THREE.MeshStandardMaterial;
			mat.emissive.setHex(highlight.color);
			mat.emissiveIntensity = highlight.emissive;
			mesh.visible = true;
		}

		// Remove stale highlights
		for (const [key, mesh] of pool) {
			if (!activeKeys.has(key)) {
				scene.remove(mesh);
				mesh.geometry.dispose();
				(mesh.material as THREE.MeshStandardMaterial).dispose();
				pool.delete(key);
			}
		}
	});

	return null;
}
