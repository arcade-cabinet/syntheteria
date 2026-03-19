/**
 * TerritoryOverlayRenderer — subtle faction-colored tint on claimed tiles.
 *
 * Uses a DataTexture where each texel encodes the controlling faction's color
 * at 10% opacity. Contested tiles get a striped pattern (alternating texels).
 * Renders as a single transparent plane above the board floor.
 *
 * Updates once per second (territory changes only happen at end of turn,
 * not per-frame).
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import { FACTION_COLORS } from "../config/gameDefaults";
import { computeTerritory } from "../ecs/systems/territorySystem";
import { buildExploredSet } from "./tileVisibility";

type TerritoryOverlayRendererProps = {
	board: GeneratedBoard;
	world: World;
};

/** Texels per tile for territory texture (higher = smoother stripes on contested). */
const TEXELS_PER_TILE = 2;

/** Opacity of territory tint overlay [0-1]. */
const TERRITORY_OPACITY = 0.10;

/** Contested stripe opacity. */
const CONTESTED_OPACITY = 0.08;

function hexToRgb(hex: number): [number, number, number] {
	return [
		(hex >> 16) & 0xff,
		(hex >> 8) & 0xff,
		hex & 0xff,
	];
}

function createTerritoryTexture(
	boardWidth: number,
	boardHeight: number,
): THREE.DataTexture {
	const texW = boardWidth * TEXELS_PER_TILE;
	const texH = boardHeight * TEXELS_PER_TILE;
	const data = new Uint8Array(texW * texH * 4);
	// All transparent by default
	const tex = new THREE.DataTexture(
		data,
		texW,
		texH,
		THREE.RGBAFormat,
		THREE.UnsignedByteType,
	);
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestFilter;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.needsUpdate = true;
	return tex;
}

function updateTerritoryTexture(
	world: World,
	boardWidth: number,
	boardHeight: number,
	texture: THREE.DataTexture,
): void {
	const territory = computeTerritory(world, boardWidth, boardHeight);
	const explored = buildExploredSet(world);
	const data = texture.image.data as Uint8Array;
	const texW = boardWidth * TEXELS_PER_TILE;

	// Clear all texels to transparent
	data.fill(0);

	for (const [key, info] of territory.tiles) {
		const [tx, tz] = key.split(",").map(Number);
		// Only show territory on explored tiles
		if (!explored.has(key)) continue;

		const factionColor = FACTION_COLORS[info.factionId];
		if (factionColor == null) continue;
		const [r, g, b] = hexToRgb(factionColor);

		// Fill the texels for this tile
		for (let dy = 0; dy < TEXELS_PER_TILE; dy++) {
			for (let dx = 0; dx < TEXELS_PER_TILE; dx++) {
				const px = tx * TEXELS_PER_TILE + dx;
				const py = tz * TEXELS_PER_TILE + dy;
				const idx = (py * texW + px) * 4;

				if (info.contested) {
					// Striped pattern — only odd rows get color
					if ((dy + dx) % 2 === 0) {
						data[idx] = r;
						data[idx + 1] = g;
						data[idx + 2] = b;
						data[idx + 3] = Math.round(CONTESTED_OPACITY * 255);
					}
					// else: stays transparent (stripe gap)
				} else {
					data[idx] = r;
					data[idx + 1] = g;
					data[idx + 2] = b;
					data[idx + 3] = Math.round(TERRITORY_OPACITY * 255);
				}
			}
		}
	}

	texture.needsUpdate = true;
}

export function TerritoryOverlayRenderer({ board, world }: TerritoryOverlayRendererProps) {
	const { scene } = useThree();
	const meshRef = useRef<THREE.Mesh | null>(null);
	const textureRef = useRef<THREE.DataTexture | null>(null);
	const lastUpdateRef = useRef(0);

	const { width, height } = board.config;

	useEffect(() => {
		const tex = createTerritoryTexture(width, height);
		textureRef.current = tex;

		const geometry = new THREE.PlaneGeometry(
			width * TILE_SIZE_M,
			height * TILE_SIZE_M,
		);
		geometry.rotateX(-Math.PI / 2);

		const material = new THREE.MeshBasicMaterial({
			map: tex,
			transparent: true,
			depthWrite: false,
			side: THREE.FrontSide,
		});

		const mesh = new THREE.Mesh(geometry, material);
		// Position at center of board, slightly above floor
		mesh.position.set(
			(width / 2 - 0.5) * TILE_SIZE_M,
			0.005,
			(height / 2 - 0.5) * TILE_SIZE_M,
		);
		mesh.renderOrder = 5; // above floor, below fog
		scene.add(mesh);
		meshRef.current = mesh;

		// Initial update
		updateTerritoryTexture(world, width, height, tex);

		return () => {
			scene.remove(mesh);
			geometry.dispose();
			material.dispose();
			tex.dispose();
			meshRef.current = null;
			textureRef.current = null;
		};
	}, [board, world, scene, width, height]);

	// Update territory overlay once per second (territory only changes at end of turn)
	useFrame((state) => {
		if (!textureRef.current) return;
		const now = state.clock.elapsedTime;
		if (now - lastUpdateRef.current < 1.0) return;
		lastUpdateRef.current = now;
		updateTerritoryTexture(world, width, height, textureRef.current);
	});

	return null;
}
