/**
 * FogOfWarRenderer — Layer 5: semi-transparent dark fog over unexplored tiles.
 *
 * Renders on the sphere surface using equirectangular projection.
 * Visibility is driven by a DataTexture where each texel's R channel
 * encodes exploration state: 0 = fully fogged, 255 = fully explored.
 * Player units reveal tiles within their scanRange on placement and
 * after movement.
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { GeneratedBoard } from "../../board/types";
import { UnitFaction, UnitPos, UnitStats } from "../../traits";
import { buildSphereGeometry } from "../../rendering/boardGeometry";
import SPHERE_FRAG from "../../rendering/glsl/fogOfWarSphereFrag.glsl";
import SPHERE_VERT from "../../rendering/glsl/fogOfWarSphereVert.glsl";

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
	// Longitude wraps east-west on sphere so S axis needs RepeatWrapping
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.needsUpdate = true;
	return tex;
}

/**
 * Gradient visibility by distance from nearest explored tile.
 * Returns a 0–255 visibility value for the given BFS distance.
 *
 * Gentle falloff so fog fades gradually over a wide area:
 *   0       → 255 (explored tile itself — handled before calling this)
 *   1–4     → 178–102 (30–60% fog → 70–40% visible)
 *   5–12    → 102–38  (60–85% fog → 40–15% visible)
 *   13–16   → 38–15   (85–94% fog → minimal ambient glow)
 *   16+     → 15      (floor — never fully black, 6% visibility remains)
 */
export function gradientVisForDistance(dist: number): number {
	if (dist <= 0) return 255;
	if (dist <= 4) {
		// Linear interpolation: dist 1 → 178, dist 4 → 102
		const t = (dist - 1) / 3;
		return Math.round(178 - t * 76);
	}
	if (dist <= 12) {
		// Linear interpolation: dist 5 → 102, dist 12 → 38
		const t = (dist - 5) / 7;
		return Math.round(102 - t * 64);
	}
	if (dist <= 16) {
		// Linear interpolation: dist 13 → 38, dist 16 → 15
		const t = (dist - 13) / 3;
		return Math.round(38 - t * 23);
	}
	// Never fully black — minimal ambient glow everywhere
	return 15;
}

/** Maximum BFS distance for fog gradient expansion. */
export const MAX_GRADIENT_DIST = 16;

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
		if (
			!faction ||
			(faction.factionId !== "player" && faction.factionId !== "")
		)
			continue;
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
			data[idx] = finalVis; // R
			data[idx + 1] = finalVis; // G
			data[idx + 2] = finalVis; // B
			data[idx + 3] = 255; // A
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

function makeSphereFogMaterial(
	boardWidth: number,
	boardHeight: number,
	visibilityTexture: THREE.DataTexture,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		uniforms: {
			uVisibility: { value: visibilityTexture },
			uBoardSize: { value: new THREE.Vector2(boardWidth, boardHeight) },
		},
		vertexShader: SPHERE_VERT,
		fragmentShader: SPHERE_FRAG,
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

	// Build geometry, texture, material, and mesh
	useEffect(() => {
		const visTex = createVisibilityTexture(width, height);
		textureRef.current = visTex;

		const material = makeSphereFogMaterial(width, height, visTex);
		materialRef.current = material;

		const geometry = buildSphereGeometry(board);
		const mesh = new THREE.Mesh(geometry, material);
		// Scale slightly outward so fog sits just above terrain surface
		mesh.scale.setScalar(1.001);
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
	}, [board, world, scene, width, height]);

	// Update visibility every frame when player unit positions change.
	// Uses useFrame instead of setInterval for immediate fog reveal on movement.
	useFrame(() => {
		if (!textureRef.current) return;

		const parts: string[] = [];
		for (const entity of world.query(UnitPos, UnitFaction)) {
			const faction = entity.get(UnitFaction);
			if (
				!faction ||
				(faction.factionId !== "player" && faction.factionId !== "")
			)
				continue;
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
