/**
 * TerritoryOverlayRenderer — subtle faction-colored tint on claimed tiles
 * plus glowing boundary strips at territory edges.
 *
 * Layer 1: DataTexture where each texel encodes the controlling faction's color
 * at 10% opacity. Contested tiles get a striped pattern (alternating texels).
 * Renders as a single transparent plane above the board floor.
 *
 * Layer 2: Glowing faction-colored strips along corridor floors at territory
 * boundaries. Where two adjacent tiles have different controlling factions
 * (or one is claimed and one isn't), a thin emissive strip is drawn.
 *
 * Updates once per second (territory changes only happen at end of turn,
 * not per-frame).
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../../board/grid";
import type { GeneratedBoard } from "../../board/types";
import { FACTION_COLORS } from "../../config/gameDefaults";
import {
	computeTerritory,
	type TerritorySnapshot,
} from "../../systems";
import { buildExploredSet } from "../../rendering/tileVisibility";

type TerritoryOverlayRendererProps = {
	board: GeneratedBoard;
	world: World;
};

/** Texels per tile for territory texture (higher = smoother stripes on contested). */
const TEXELS_PER_TILE = 2;

/** Opacity of territory tint overlay [0-1]. */
const TERRITORY_OPACITY = 0.1;

/** Contested stripe opacity. */
const CONTESTED_OPACITY = 0.08;

/** Width of boundary strip in world units — wide enough to see at game zoom. */
const STRIP_WIDTH = 0.25;

/** Height above floor for boundary strips. */
const STRIP_Y = 0.02;

/** Emissive intensity for boundary strips — bright faction-colored glow. */
const STRIP_EMISSIVE = 2.0;

/** Opacity of boundary strips. */
const STRIP_OPACITY = 0.85;

function hexToRgb(hex: number): [number, number, number] {
	return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
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
	territory: TerritorySnapshot,
	explored: Set<string>,
	boardWidth: number,
	texture: THREE.DataTexture,
): void {
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

// ---------------------------------------------------------------------------
// Boundary strip geometry
// ---------------------------------------------------------------------------

interface BoundaryEdge {
	/** World-space center X of the strip. */
	wx: number;
	/** World-space center Z of the strip. */
	wz: number;
	/** true = horizontal strip (along X axis), false = vertical strip (along Z axis). */
	horizontal: boolean;
	/** Faction color as hex integer. */
	color: number;
}

const CARDINAL_DIRS = [
	{ dx: 1, dz: 0, horizontal: false },
	{ dx: 0, dz: 1, horizontal: true },
];

function collectBoundaryEdges(
	territory: TerritorySnapshot,
	explored: Set<string>,
	boardWidth: number,
	boardHeight: number,
): BoundaryEdge[] {
	const edges: BoundaryEdge[] = [];
	const half = TILE_SIZE_M / 2;

	for (const [key, info] of territory.tiles) {
		if (!explored.has(key)) continue;
		const factionColor = FACTION_COLORS[info.factionId];
		if (factionColor == null) continue;

		const [tx, tz] = key.split(",").map(Number);

		for (const { dx, dz, horizontal } of CARDINAL_DIRS) {
			const nx = tx + dx;
			const nz = tz + dz;
			if (nx < 0 || nx >= boardWidth || nz < 0 || nz >= boardHeight) continue;

			const neighborKey = `${nx},${nz}`;
			const neighborInfo = territory.tiles.get(neighborKey);

			// Boundary: neighbor is unclaimed or different faction
			const neighborFaction = neighborInfo?.factionId;
			if (neighborFaction === info.factionId) continue;

			// Edge sits at the boundary between the two tiles
			const wx = (tx + dx * 0.5) * TILE_SIZE_M;
			const wz = (tz + dz * 0.5) * TILE_SIZE_M;

			edges.push({ wx, wz, horizontal, color: factionColor });

			// If neighbor has a different faction, also draw their color strip
			if (neighborFaction && explored.has(neighborKey)) {
				const neighborColor = FACTION_COLORS[neighborFaction];
				if (neighborColor != null && neighborColor !== factionColor) {
					// Offset slightly so both strips are visible
					const offsetX = horizontal ? 0 : dx > 0 ? STRIP_WIDTH : -STRIP_WIDTH;
					const offsetZ = horizontal
						? dz > 0
							? STRIP_WIDTH
							: -STRIP_WIDTH
						: 0;
					edges.push({
						wx: wx + offsetX,
						wz: wz + offsetZ,
						horizontal,
						color: neighborColor,
					});
				}
			}
		}
	}

	return edges;
}

function buildBoundaryStripGeometry(
	edges: BoundaryEdge[],
): { geometry: THREE.BufferGeometry; colors: Float32Array } | null {
	if (edges.length === 0) return null;

	const vertsPerStrip = 4; // 2 triangles = 4 verts (indexed)
	const indicesPerStrip = 6;
	const total = edges.length;

	const positions = new Float32Array(total * vertsPerStrip * 3);
	const normals = new Float32Array(total * vertsPerStrip * 3);
	const colors = new Float32Array(total * vertsPerStrip * 3);
	const indices = new Uint32Array(total * indicesPerStrip);

	for (let i = 0; i < total; i++) {
		const edge = edges[i];
		const r = ((edge.color >> 16) & 0xff) / 255;
		const g = ((edge.color >> 8) & 0xff) / 255;
		const b = (edge.color & 0xff) / 255;

		const halfLen = TILE_SIZE_M / 2;
		const halfW = STRIP_WIDTH / 2;

		// 4 corner positions of the strip quad
		let x0: number, z0: number, x1: number, z1: number;
		let x2: number, z2: number, x3: number, z3: number;

		if (edge.horizontal) {
			// Strip along X axis
			x0 = edge.wx - halfLen;
			z0 = edge.wz - halfW;
			x1 = edge.wx + halfLen;
			z1 = edge.wz - halfW;
			x2 = edge.wx + halfLen;
			z2 = edge.wz + halfW;
			x3 = edge.wx - halfLen;
			z3 = edge.wz + halfW;
		} else {
			// Strip along Z axis
			x0 = edge.wx - halfW;
			z0 = edge.wz - halfLen;
			x1 = edge.wx + halfW;
			z1 = edge.wz - halfLen;
			x2 = edge.wx + halfW;
			z2 = edge.wz + halfLen;
			x3 = edge.wx - halfW;
			z3 = edge.wz + halfLen;
		}

		const vBase = i * vertsPerStrip;
		const pOff = vBase * 3;

		positions[pOff] = x0;
		positions[pOff + 1] = STRIP_Y;
		positions[pOff + 2] = z0;
		positions[pOff + 3] = x1;
		positions[pOff + 4] = STRIP_Y;
		positions[pOff + 5] = z1;
		positions[pOff + 6] = x2;
		positions[pOff + 7] = STRIP_Y;
		positions[pOff + 8] = z2;
		positions[pOff + 9] = x3;
		positions[pOff + 10] = STRIP_Y;
		positions[pOff + 11] = z3;

		// Normals — all pointing up
		for (let v = 0; v < vertsPerStrip; v++) {
			normals[pOff + v * 3] = 0;
			normals[pOff + v * 3 + 1] = 1;
			normals[pOff + v * 3 + 2] = 0;
		}

		// Per-vertex color
		for (let v = 0; v < vertsPerStrip; v++) {
			colors[pOff + v * 3] = r;
			colors[pOff + v * 3 + 1] = g;
			colors[pOff + v * 3 + 2] = b;
		}

		// Indices — two triangles
		const iOff = i * indicesPerStrip;
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
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));

	return { geometry, colors };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TerritoryOverlayRenderer({
	board,
	world,
}: TerritoryOverlayRendererProps) {
	const { scene } = useThree();
	const meshRef = useRef<THREE.Mesh | null>(null);
	const textureRef = useRef<THREE.DataTexture | null>(null);
	const stripMeshRef = useRef<THREE.Mesh | null>(null);
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
		const territory = computeTerritory(world, width, height);
		const explored = buildExploredSet(world);
		updateTerritoryTexture(territory, explored, width, tex);
		updateBoundaryStrips(territory, explored);

		return () => {
			scene.remove(mesh);
			geometry.dispose();
			material.dispose();
			tex.dispose();
			meshRef.current = null;
			textureRef.current = null;
			removeBoundaryStrips();
		};
	}, [board, world, scene, width, height]);

	function removeBoundaryStrips() {
		if (stripMeshRef.current) {
			scene.remove(stripMeshRef.current);
			stripMeshRef.current.geometry.dispose();
			(stripMeshRef.current.material as THREE.Material).dispose();
			stripMeshRef.current = null;
		}
	}

	function updateBoundaryStrips(
		territory: TerritorySnapshot,
		explored: Set<string>,
	) {
		removeBoundaryStrips();

		const edges = collectBoundaryEdges(territory, explored, width, height);
		const result = buildBoundaryStripGeometry(edges);
		if (!result) return;

		const material = new THREE.MeshStandardMaterial({
			vertexColors: true,
			transparent: true,
			opacity: STRIP_OPACITY,
			depthWrite: false,
			emissive: 0xffffff,
			emissiveIntensity: STRIP_EMISSIVE,
			side: THREE.DoubleSide,
		});

		const mesh = new THREE.Mesh(result.geometry, material);
		mesh.renderOrder = 6; // above territory tint, below fog
		scene.add(mesh);
		stripMeshRef.current = mesh;
	}

	// Update territory overlay once per second (territory only changes at end of turn)
	useFrame((state) => {
		if (!textureRef.current) return;
		const now = state.clock.elapsedTime;
		if (now - lastUpdateRef.current < 1.0) return;
		lastUpdateRef.current = now;

		const territory = computeTerritory(world, width, height);
		const explored = buildExploredSet(world);
		updateTerritoryTexture(territory, explored, width, textureRef.current);
		updateBoundaryStrips(territory, explored);
	});

	return null;
}
