/**
 * FogOfWarRenderer — Layer 5: semi-transparent dark fog over unexplored tiles.
 *
 * Uses the same geometry as the board (buildBoardGeometry) with matching
 * cylindrical curvature so the fog hugs the terrain surface exactly.
 *
 * Visibility is driven by a DataTexture where each texel's R channel
 * encodes exploration state: 0 = fully fogged, 255 = fully explored.
 * Player units reveal tiles within their scanRange on placement and
 * after movement.
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import { UnitFaction, UnitPos, UnitStats } from "../ecs/traits/unit";
import { buildBoardGeometry } from "./boardGeometry";
import FRAG from "./glsl/fogOfWarFrag.glsl";
import VERT from "./glsl/fogOfWarVert.glsl";

type FogOfWarRendererProps = {
	board: GeneratedBoard;
	world: World;
};

// ---------------------------------------------------------------------------
// Visibility texture management
// ---------------------------------------------------------------------------

/**
 * Create a blank visibility DataTexture sized to the board.
 * All texels start at 0 (fully fogged).
 */
function createVisibilityTexture(
	width: number,
	height: number,
): THREE.DataTexture {
	const data = new Uint8Array(width * height * 4);
	// RGBA — all 0 = fully fogged
	const tex = new THREE.DataTexture(
		data,
		width,
		height,
		THREE.RGBAFormat,
		THREE.UnsignedByteType,
	);
	tex.magFilter = THREE.LinearFilter;
	tex.minFilter = THREE.LinearFilter;
	tex.wrapS = THREE.ClampToEdgeWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.needsUpdate = true;
	return tex;
}

/**
 * Gradient visibility by distance from nearest explored tile.
 * Returns a 0–255 visibility value for the given BFS distance.
 *
 * Distance bands (from explored edge):
 *   0       → 255 (explored tile itself — handled before calling this)
 *   1–3     → 153–102 (40–60% fog → 60–40% visible)
 *   4–8     → 102–38  (60–85% fog → 40–15% visible)
 *   8+      → 0       (100% fog)
 */
export function gradientVisForDistance(dist: number): number {
	if (dist <= 0) return 255;
	if (dist <= 3) {
		// Linear interpolation: dist 1 → 153, dist 3 → 102
		const t = (dist - 1) / 2; // 0 at dist=1, 1 at dist=3
		return Math.round(153 - t * 51);
	}
	if (dist <= 8) {
		// Linear interpolation: dist 4 → 102, dist 8 → 38
		const t = (dist - 4) / 4; // 0 at dist=4, 1 at dist=8
		return Math.round(102 - t * 64);
	}
	return 0;
}

/** Maximum BFS distance for fog gradient expansion. */
export const MAX_GRADIENT_DIST = 8;

/**
 * Update visibility texture from current ECS state.
 *
 * Two passes:
 * 1. Unit scanRange pass — full/gradient visibility around player units
 * 2. Explored-edge gradient pass — BFS from all explored tiles outward,
 *    setting partial visibility so unexplored terrain fades gradually
 *    instead of cutting off at a hard edge.
 */
export function updateVisibility(
	world: World,
	boardWidth: number,
	boardHeight: number,
	texture: THREE.DataTexture,
): void {
	const data = texture.image.data as Uint8Array;

	// Collect all player unit positions + scan ranges
	const reveals: { x: number; z: number; range: number }[] = [];
	for (const entity of world.query(UnitPos, UnitFaction, UnitStats)) {
		const faction = entity.get(UnitFaction);
		if (!faction || (faction.factionId !== "player" && faction.factionId !== "")) continue;
		const pos = entity.get(UnitPos);
		const stats = entity.get(UnitStats);
		if (!pos || !stats) continue;
		reveals.push({ x: pos.tileX, z: pos.tileZ, range: stats.scanRange });
	}

	// ── Pass 1: unit scanRange visibility ─────────────────────────────────
	for (let tz = 0; tz < boardHeight; tz++) {
		for (let tx = 0; tx < boardWidth; tx++) {
			let maxVis = 0;

			for (const rev of reveals) {
				const dist = Math.abs(tx - rev.x) + Math.abs(tz - rev.z); // Manhattan
				if (dist <= rev.range) {
					// Full visibility within 60% of range, gradient falloff beyond
					const innerRange = rev.range * 0.6;
					if (dist <= innerRange) {
						maxVis = 255;
					} else {
						const t = (dist - innerRange) / (rev.range - innerRange);
						const vis = Math.round((1 - t) * 255);
						maxVis = Math.max(maxVis, vis);
					}
				}
				if (maxVis >= 255) break;
			}

			const idx = (tz * boardWidth + tx) * 4;
			// Keep explored tiles visible — never re-fog (max with existing)
			const existing = data[idx]!;
			const finalVis = Math.max(existing, maxVis);
			data[idx] = finalVis;     // R
			data[idx + 1] = finalVis; // G
			data[idx + 2] = finalVis; // B
			data[idx + 3] = 255;      // A
		}
	}

	// ── Pass 2: BFS gradient from explored edges ──────────────────────────
	// Seed the BFS with all tiles that have any visibility (explored or
	// partially visible from unit scanRange). Expand outward up to
	// MAX_GRADIENT_DIST tiles, setting gradient visibility on unexplored
	// tiles so terrain fades smoothly into darkness.

	const totalTiles = boardWidth * boardHeight;
	const distField = new Int8Array(totalTiles); // -1 = unvisited
	distField.fill(-1);

	// BFS queue: [tileIndex, distance]
	const queue: number[] = [];
	let qHead = 0;

	// Seed: all tiles with visibility > 0
	for (let i = 0; i < totalTiles; i++) {
		if (data[i * 4]! > 0) {
			distField[i] = 0;
			queue.push(i);
		}
	}

	// 4-connected BFS expansion
	const dx = [-1, 1, 0, 0];
	const dz = [0, 0, -1, 1];

	while (qHead < queue.length) {
		const idx = queue[qHead]!;
		qHead++;
		const d = distField[idx]!;
		if (d >= MAX_GRADIENT_DIST) continue;

		const tx = idx % boardWidth;
		const tz = (idx - tx) / boardWidth;

		for (let dir = 0; dir < 4; dir++) {
			const nx = tx + dx[dir]!;
			const nz = tz + dz[dir]!;
			if (nx < 0 || nx >= boardWidth || nz < 0 || nz >= boardHeight) continue;

			const ni = nz * boardWidth + nx;
			if (distField[ni] !== -1) continue; // already visited

			const nd = d + 1;
			distField[ni] = nd;

			const gradientVis = gradientVisForDistance(nd);
			if (gradientVis > 0) {
				const pi = ni * 4;
				const existing = data[pi]!;
				if (gradientVis > existing) {
					data[pi] = gradientVis;
					data[pi + 1] = gradientVis;
					data[pi + 2] = gradientVis;
					// data[pi + 3] already 255 or will be set
					data[pi + 3] = 255;
				}
			}

			if (nd < MAX_GRADIENT_DIST) {
				queue.push(ni);
			}
		}
	}

	texture.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

function makeFogMaterial(
	boardCenterX: number,
	boardCenterZ: number,
	boardWidth: number,
	boardHeight: number,
	visibilityTexture: THREE.DataTexture,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uVisibility: { value: visibilityTexture },
			uBoardSize: { value: new THREE.Vector2(boardWidth, boardHeight) },
			uTileSize: { value: TILE_SIZE_M },
			uBoardCenter: { value: new THREE.Vector2(boardCenterX, boardCenterZ) },
			uCurve: { value: 0.0008 },
			uBoardWidth: { value: boardWidth * TILE_SIZE_M },
		},
		vertexShader: VERT,
		fragmentShader: FRAG,
		transparent: true,
		depthWrite: false,
		side: THREE.FrontSide,
	});
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FogOfWarRenderer({ board, world }: FogOfWarRendererProps) {
	const { scene } = useThree();
	const meshRef = useRef<THREE.Mesh | null>(null);
	const textureRef = useRef<THREE.DataTexture | null>(null);
	const materialRef = useRef<THREE.ShaderMaterial | null>(null);
	const lastRevealKeyRef = useRef("");

	const { width, height } = board.config;
	const boardCenterX = Math.floor(width / 2) * TILE_SIZE_M;
	const boardCenterZ = Math.floor(height / 2) * TILE_SIZE_M;
	const boardWidth = width * TILE_SIZE_M;

	// Build geometry, texture, material, and mesh
	useEffect(() => {
		const visTex = createVisibilityTexture(width, height);
		textureRef.current = visTex;

		const material = makeFogMaterial(
			boardCenterX,
			boardCenterZ,
			width,
			height,
			visTex,
		);
		materialRef.current = material;

		// Set boardWidth for curvature
		material.uniforms.uBoardWidth.value = boardWidth;

		const geometry = buildBoardGeometry(board);
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.y = 0.002; // above biome layer, below structures
		mesh.renderOrder = 10; // ensure fog renders after terrain
		scene.add(mesh);
		meshRef.current = mesh;

		// Initial visibility update
		updateVisibility(world, width, height, visTex);

		return () => {
			scene.remove(mesh);
			geometry.dispose();
			material.dispose();
			visTex.dispose();
			meshRef.current = null;
			textureRef.current = null;
			materialRef.current = null;
		};
	}, [board, world, scene, boardCenterX, boardCenterZ, boardWidth, width, height]);

	// Update visibility every frame when player unit positions change.
	// Uses useFrame instead of setInterval for immediate fog reveal on movement.
	useFrame(() => {
		if (!textureRef.current) return;

		const parts: string[] = [];
		for (const entity of world.query(UnitPos, UnitFaction)) {
			const faction = entity.get(UnitFaction);
			if (!faction || (faction.factionId !== "player" && faction.factionId !== "")) continue;
			const pos = entity.get(UnitPos);
			if (!pos) continue;
			parts.push(`${pos.tileX},${pos.tileZ}`);
		}
		const key = parts.sort().join(";");

		if (key !== lastRevealKeyRef.current) {
			lastRevealKeyRef.current = key;
			updateVisibility(world, width, height, textureRef.current!);
		}
	});

	return null;
}
