/**
 * Renders terrain per-fragment, each at its display offset.
 * Each fragment gets its own terrain mesh with fog-based vertex visibility.
 * Fragments start clustered and drift apart to their real positions.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { getSnapshot, subscribe } from "../ecs/gameState";
import {
	type FogState,
	getFragment,
	getTerrainHeight,
	WORLD_HALF,
	WORLD_SIZE,
} from "../ecs/terrain";

// Terrain mesh resolution — one vertex per world unit
const MESH_STEP = 1;
const VERTS_PER_AXIS = Math.floor(WORLD_SIZE / MESH_STEP) + 1;

// Color palette — industrial wasteland tones
const COLOR_WATER = new THREE.Color(0x0a2a35);
const COLOR_MUD = new THREE.Color(0x3a3520);
const COLOR_DIRT = new THREE.Color(0x4a4a38);
const COLOR_GROUND = new THREE.Color(0x555540);
const COLOR_RUBBLE = new THREE.Color(0x6a6050);

function getTerrainColor(rawHeight: number): THREE.Color {
	if (rawHeight < 0.15) return COLOR_WATER;
	if (rawHeight < 0.22) return COLOR_MUD;
	if (rawHeight < 0.4) return COLOR_DIRT;
	if (rawHeight < 0.7) return COLOR_GROUND;
	return COLOR_RUBBLE;
}

// Shared geometry data (positions, indices, normals, colors) — built once
let sharedPositions: Float32Array | null = null;
let sharedColors: Float32Array | null = null;
let sharedIndices: Uint32Array | null = null;

// Abstract wireframe shared data
let sharedAbsPositions: Float32Array | null = null;

function ensureSharedGeometry() {
	if (sharedPositions) return;

	const positions: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];

	for (let gz = 0; gz < VERTS_PER_AXIS; gz++) {
		for (let gx = 0; gx < VERTS_PER_AXIS; gx++) {
			const wx = gx * MESH_STEP - WORLD_HALF;
			const wz = gz * MESH_STEP - WORLD_HALF;
			const h = getTerrainHeight(wx, wz);
			const rawH = h / 0.5;

			positions.push(wx, h, wz);
			const color = getTerrainColor(rawH);
			colors.push(color.r, color.g, color.b);
		}
	}

	for (let gz = 0; gz < VERTS_PER_AXIS - 1; gz++) {
		for (let gx = 0; gx < VERTS_PER_AXIS - 1; gx++) {
			const v0 = gz * VERTS_PER_AXIS + gx;
			const v1 = v0 + 1;
			const v2 = v0 + VERTS_PER_AXIS;
			const v3 = v2 + 1;
			indices.push(v0, v2, v1);
			indices.push(v1, v2, v3);
		}
	}

	sharedPositions = new Float32Array(positions);
	sharedColors = new Float32Array(colors);
	sharedIndices = new Uint32Array(indices);

	// Abstract wireframe positions
	const absPos: number[] = [];
	for (let gz = 0; gz < VERTS_PER_AXIS - 1; gz++) {
		for (let gx = 0; gx < VERTS_PER_AXIS - 1; gx++) {
			const wx = gx * MESH_STEP - WORLD_HALF;
			const wz = gz * MESH_STEP - WORLD_HALF;
			const s = MESH_STEP;

			const h00 = getTerrainHeight(wx, wz);
			const h10 = getTerrainHeight(wx + s, wz);
			const h01 = getTerrainHeight(wx, wz + s);
			const h11 = getTerrainHeight(wx + s, wz + s);

			absPos.push(wx, h00, wz, wx + s, h10, wz);
			absPos.push(wx + s, h10, wz, wx + s, h11, wz + s);
			absPos.push(wx + s, h11, wz + s, wx, h01, wz + s);
			absPos.push(wx, h01, wz + s, wx, h00, wz);
		}
	}
	sharedAbsPositions = new Float32Array(absPos);
}

/**
 * Renders terrain for a single fragment at its display offset.
 * Fog controls which vertices are visible.
 */
function FragmentTerrain({ fragmentId }: { fragmentId: string }) {
	const groupRef = useRef<THREE.Group>(null);

	const { detailedGeo, abstractGeo, colorAttr, alphaAttr, absAlphaAttr } =
		useMemo(() => {
			ensureSharedGeometry();

			// Detailed terrain — clone shared data, add per-fragment alpha
			const geo = new THREE.BufferGeometry();
			geo.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(new Float32Array(sharedPositions!), 3),
			);
			const colorAttribute = new THREE.Float32BufferAttribute(
				new Float32Array(sharedColors!),
				3,
			);
			geo.setAttribute("color", colorAttribute);
			const alphaAttribute = new THREE.Float32BufferAttribute(
				new Float32Array(VERTS_PER_AXIS * VERTS_PER_AXIS).fill(0),
				1,
			);
			geo.setAttribute("alpha", alphaAttribute);
			geo.setIndex(
				new THREE.BufferAttribute(new Uint32Array(sharedIndices!), 1),
			);
			geo.computeVertexNormals();

			// Abstract wireframe — clone shared data, add per-fragment alpha
			const absGeo = new THREE.BufferGeometry();
			absGeo.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(
					new Float32Array(sharedAbsPositions!),
					3,
				),
			);
			const absAlpha = new THREE.Float32BufferAttribute(
				new Float32Array(sharedAbsPositions?.length / 3).fill(0),
				1,
			);
			absGeo.setAttribute("alpha", absAlpha);

			return {
				detailedGeo: geo,
				abstractGeo: absGeo,
				colorAttr: colorAttribute,
				alphaAttr: alphaAttribute,
				absAlphaAttr: absAlpha,
			};
		}, []); // eslint-disable-line react-hooks/exhaustive-deps

	useFrame(() => {
		const fragment = getFragment(fragmentId);
		if (!fragment) return;

		// Update group position from display offset
		if (groupRef.current) {
			groupRef.current.position.set(
				fragment.displayOffset.x,
				0,
				fragment.displayOffset.z,
			);
		}

		// Update detailed mesh alpha from this fragment's fog
		const fog = fragment.fog;
		for (let gz = 0; gz < VERTS_PER_AXIS; gz++) {
			for (let gx = 0; gx < VERTS_PER_AXIS; gx++) {
				const vertIdx = gz * VERTS_PER_AXIS + gx;
				const fogIdx = gz * WORLD_SIZE + gx;
				const fogState = (
					fogIdx >= 0 && fogIdx < fog.length ? fog[fogIdx] : 0
				) as FogState;

				if (fogState === 2) {
					alphaAttr.setX(vertIdx, 1.0);
					const wx = gx * MESH_STEP - WORLD_HALF;
					const wz = gz * MESH_STEP - WORLD_HALF;
					const rawH = getTerrainHeight(wx, wz) / 0.5;
					const color = getTerrainColor(rawH);
					colorAttr.setXYZ(vertIdx, color.r, color.g, color.b);
				} else if (fogState === 1) {
					alphaAttr.setX(vertIdx, 0.0);
				} else {
					alphaAttr.setX(vertIdx, 0.0);
				}
			}
		}
		alphaAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;

		// Update abstract wireframe visibility
		let absIdx = 0;
		for (let gz = 0; gz < VERTS_PER_AXIS - 1; gz++) {
			for (let gx = 0; gx < VERTS_PER_AXIS - 1; gx++) {
				const fogIdx = gz * WORLD_SIZE + gx;
				const fogState = (
					fogIdx >= 0 && fogIdx < fog.length ? fog[fogIdx] : 0
				) as FogState;
				const a = fogState === 1 ? 0.6 : 0.0;

				for (let i = 0; i < 8; i++) {
					absAlphaAttr.setX(absIdx++, a);
				}
			}
		}
		absAlphaAttr.needsUpdate = true;
	});

	return (
		<group ref={groupRef}>
			<mesh geometry={detailedGeo}>
				<meshLambertMaterial
					vertexColors
					transparent
					side={THREE.DoubleSide}
					onBeforeCompile={(shader) => {
						shader.vertexShader = shader.vertexShader.replace(
							"void main() {",
							"attribute float alpha;\nvarying float vAlpha;\nvoid main() {\nvAlpha = alpha;",
						);
						shader.fragmentShader = shader.fragmentShader.replace(
							"void main() {",
							"varying float vAlpha;\nvoid main() {",
						);
						shader.fragmentShader = shader.fragmentShader.replace(
							"#include <dithering_fragment>",
							"#include <dithering_fragment>\nif (vAlpha < 0.01) discard;\ngl_FragColor.a *= vAlpha;",
						);
					}}
				/>
			</mesh>

			<lineSegments geometry={abstractGeo}>
				<lineBasicMaterial
					color={0x00ffaa}
					transparent
					onBeforeCompile={(shader) => {
						shader.vertexShader = shader.vertexShader.replace(
							"void main() {",
							"attribute float alpha;\nvarying float vAlpha;\nvoid main() {\nvAlpha = alpha;",
						);
						shader.fragmentShader = shader.fragmentShader.replace(
							"void main() {",
							"varying float vAlpha;\nvoid main() {",
						);
						shader.fragmentShader = shader.fragmentShader.replace(
							"#include <dithering_fragment>",
							"#include <dithering_fragment>\nif (vAlpha < 0.01) discard;\ngl_FragColor.a *= vAlpha;",
						);
					}}
				/>
			</lineSegments>
		</group>
	);
}

export function TerrainRenderer() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<>
			{snap.fragments.map((fragment) => (
				<FragmentTerrain key={fragment.id} fragmentId={fragment.id} />
			))}
		</>
	);
}
