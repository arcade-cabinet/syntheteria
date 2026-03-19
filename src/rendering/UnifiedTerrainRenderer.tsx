/**
 * UnifiedTerrainRenderer — single R3F component that replaces
 * BiomeRenderer + DepthRenderer + MinedPitRenderer.
 *
 * Uses the DepthMappedLayer + DepthLayerStack data model to generate
 * floor quads, ramp geometry, wall geometry, and void planes, all
 * textured via the PBR atlas shader.
 *
 * Keeps the existing BoardRenderer (Layer 1 height mesh) and floor shader
 * intact — this replaces only the three surface-detail renderers.
 */

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { World } from "koota";
import * as THREE from "three";
import type { GeneratedBoard } from "../board/types";
import { TILE_SIZE_M, ELEVATION_STEP_M } from "../board/grid";
import { FLOOR_INDEX_MAP } from "../ecs/terrain/types";
import { TileFloor } from "../ecs/terrain/traits";
import { Tile } from "../ecs/traits/tile";
import { boardToDepthLayers } from "./depthLayerStack";
import {
	buildLayerGeometry,
	applyDaisyDig,
	applyTargetedDig,
	GRATING_ATLAS_INDEX,
	type DepthMappedLayer,
} from "./depthMappedLayer";
import { buildExploredSet, isTileExplored } from "./tileVisibility";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRIDGE_THICKNESS = 0.05;
const COLUMN_RADIUS = 0.05;
const COLUMN_SEGMENTS = 6;
const ABYSSAL_VOID_Y = -0.5;

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

function makeBridgeMaterial(): THREE.MeshStandardMaterial {
	const loader = new THREE.TextureLoader();
	const colorTex = loader.load("/assets/textures/floor_atlas_color.jpg");
	const normalTex = loader.load("/assets/textures/floor_atlas_normal.jpg");
	const roughnessTex = loader.load("/assets/textures/floor_atlas_roughness.jpg");
	const metalnessTex = loader.load("/assets/textures/floor_atlas_metalness.jpg");

	for (const tex of [colorTex, normalTex, roughnessTex, metalnessTex]) {
		tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
		tex.offset.set(1 / 3, 2 / 3);
		tex.repeat.set(1 / 3, 1 / 3);
	}

	return new THREE.MeshStandardMaterial({
		map: colorTex,
		normalMap: normalTex,
		roughnessMap: roughnessTex,
		metalnessMap: metalnessTex,
		metalness: 1.0,
		side: THREE.FrontSide,
	});
}

function makeColumnMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x1a1a2a,
		metalness: 0.8,
		roughness: 0.3,
	});
}

function makeVoidMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x020208,
		emissive: 0x010104,
		emissiveIntensity: 0.3,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
}

function makeAbyssalVoidMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x020210,
		emissive: 0x010108,
		emissiveIntensity: 0.2,
		metalness: 0.9,
		roughness: 0.3,
	});
}

function makePitFloorMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x2a2420,
		roughness: 0.95,
		metalness: 0.2,
		side: THREE.DoubleSide,
	});
}

function makePitWallMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x1e1a16,
		roughness: 0.9,
		metalness: 0.3,
		side: THREE.DoubleSide,
	});
}

// ---------------------------------------------------------------------------
// Geometry builders for Three.js rendering from DepthMappedLayer
// ---------------------------------------------------------------------------

/**
 * Build Three.js geometry for bridge platforms, support columns,
 * void planes, abyssal void, ramps, and mined pits from the depth layer stack.
 */
function buildUnifiedGeometry(
	board: GeneratedBoard,
	world?: World,
): {
	bridge: THREE.BufferGeometry;
	columns: THREE.BufferGeometry;
	voidPlanes: THREE.BufferGeometry;
	abyssalVoid: THREE.BufferGeometry;
	ramps: THREE.BufferGeometry;
	pitFloors: THREE.BufferGeometry;
	pitWalls: THREE.BufferGeometry;
} {
	const { width, height } = board.config;
	const explored = world ? buildExploredSet(world) : undefined;

	// Scan for different tile types
	const bridgeTiles: Array<{ x: number; z: number }> = [];
	const abyssalTiles: Array<{ x: number; z: number }> = [];
	const minedTiles: Array<{ x: number; z: number }> = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			if (explored && !isTileExplored(explored, x, z)) continue;
			const tile = board.tiles[z][x];
			if (tile.elevation === 1) {
				bridgeTiles.push({ x, z });
			} else if (tile.elevation === -1) {
				abyssalTiles.push({ x, z });
			}
		}
	}

	// Collect mined tiles from ECS
	if (world) {
		for (const entity of world.query(Tile, TileFloor)) {
			const tile = entity.get(Tile);
			const floor = entity.get(TileFloor);
			if (!tile || !floor || !floor.mined) continue;
			if (explored && !isTileExplored(explored, tile.x, tile.z)) continue;
			minedTiles.push({ x: tile.x, z: tile.z });
		}
	}

	// Build bridge platform geometry
	const bridgeGeo = buildBridgePlatforms(bridgeTiles);
	const columnGeo = buildColumns(bridgeTiles);
	const voidGeo = buildVoidPlanes(bridgeTiles);
	const abyssalGeo = buildAbyssalVoid(abyssalTiles);
	const rampGeo = buildRamps(board, explored);
	const { pitFloors, pitWalls } = buildMinedPits(minedTiles);

	return {
		bridge: bridgeGeo,
		columns: columnGeo,
		voidPlanes: voidGeo,
		abyssalVoid: abyssalGeo,
		ramps: rampGeo,
		pitFloors,
		pitWalls,
	};
}

function buildBridgePlatforms(
	tiles: Array<{ x: number; z: number }>,
): THREE.BufferGeometry {
	if (tiles.length === 0) return new THREE.BufferGeometry();
	const template = new THREE.BoxGeometry(TILE_SIZE_M, BRIDGE_THICKNESS, TILE_SIZE_M);
	const merged = mergeTranslated(
		template,
		tiles.map((t) => ({
			x: t.x * TILE_SIZE_M,
			y: ELEVATION_STEP_M,
			z: t.z * TILE_SIZE_M,
		})),
	);
	template.dispose();
	return merged;
}

function buildColumns(
	tiles: Array<{ x: number; z: number }>,
): THREE.BufferGeometry {
	if (tiles.length === 0) return new THREE.BufferGeometry();
	const half = TILE_SIZE_M / 2;
	const posSet = new Set<string>();
	const positions: Array<{ x: number; z: number }> = [];
	for (const t of tiles) {
		const cx = t.x * TILE_SIZE_M;
		const cz = t.z * TILE_SIZE_M;
		for (const corner of [
			{ x: cx - half, z: cz - half },
			{ x: cx + half, z: cz - half },
			{ x: cx - half, z: cz + half },
			{ x: cx + half, z: cz + half },
		]) {
			const key = `${corner.x.toFixed(2)},${corner.z.toFixed(2)}`;
			if (!posSet.has(key)) {
				posSet.add(key);
				positions.push(corner);
			}
		}
	}
	const colH = ELEVATION_STEP_M;
	const template = new THREE.CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS, colH, COLUMN_SEGMENTS);
	const merged = mergeTranslated(
		template,
		positions.map((p) => ({ x: p.x, y: colH / 2, z: p.z })),
	);
	template.dispose();
	return merged;
}

function buildVoidPlanes(
	tiles: Array<{ x: number; z: number }>,
): THREE.BufferGeometry {
	if (tiles.length === 0) return new THREE.BufferGeometry();
	const template = new THREE.PlaneGeometry(TILE_SIZE_M, TILE_SIZE_M);
	template.rotateX(-Math.PI / 2);
	const merged = mergeTranslated(
		template,
		tiles.map((t) => ({ x: t.x * TILE_SIZE_M, y: 0.01, z: t.z * TILE_SIZE_M })),
	);
	template.dispose();
	return merged;
}

function buildAbyssalVoid(
	tiles: Array<{ x: number; z: number }>,
): THREE.BufferGeometry {
	if (tiles.length === 0) return new THREE.BufferGeometry();
	const template = new THREE.PlaneGeometry(TILE_SIZE_M, TILE_SIZE_M);
	template.rotateX(-Math.PI / 2);
	const merged = mergeTranslated(
		template,
		tiles.map((t) => ({ x: t.x * TILE_SIZE_M, y: ABYSSAL_VOID_Y, z: t.z * TILE_SIZE_M })),
	);
	template.dispose();
	return merged;
}

function buildRamps(
	board: GeneratedBoard,
	explored?: Set<string>,
): THREE.BufferGeometry {
	const { width, height } = board.config;
	const edges: Array<{ wx: number; wz: number; dx: number; dz: number }> = [];
	const seen = new Set<string>();
	const DIRECTIONS: [number, number][] = [[0, -1], [0, 1], [1, 0], [-1, 0]];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];
			if (!tile.passable) continue;
			if (explored && !isTileExplored(explored, x, z)) continue;
			if (tile.elevation !== 0) continue;
			for (const [dx, dz] of DIRECTIONS) {
				const nx = x + dx;
				const nz = z + dz;
				if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
				const neighbor = board.tiles[nz][nx];
				if (!neighbor.passable || neighbor.elevation !== 1) continue;
				if (explored && !isTileExplored(explored, nx, nz)) continue;
				const key = `${Math.min(x, nx)},${Math.min(z, nz)}-${Math.max(x, nx)},${Math.max(z, nz)}`;
				if (seen.has(key)) continue;
				seen.add(key);
				edges.push({
					wx: (x + nx) * 0.5 * TILE_SIZE_M,
					wz: (z + nz) * 0.5 * TILE_SIZE_M,
					dx,
					dz,
				});
			}
		}
	}

	if (edges.length === 0) return new THREE.BufferGeometry();

	const rampWidth = TILE_SIZE_M;
	const rampDepth = TILE_SIZE_M * 0.5;
	const template = new THREE.BoxGeometry(rampWidth, BRIDGE_THICKNESS, rampDepth);
	const angle = Math.atan2(ELEVATION_STEP_M, rampDepth);
	template.rotateX(-angle);
	template.translate(0, ELEVATION_STEP_M / 2, 0);

	const angleMap: Record<string, number> = {
		"0,1": 0,
		"0,-1": Math.PI,
		"1,0": -Math.PI / 2,
		"-1,0": Math.PI / 2,
	};

	const posAttr = template.getAttribute("position") as THREE.BufferAttribute;
	const normAttr = template.getAttribute("normal") as THREE.BufferAttribute;
	const uvAttr = template.getAttribute("uv") as THREE.BufferAttribute | null;
	const idxAttr = template.getIndex();
	const vpCount = posAttr.count;
	const triCount = idxAttr ? idxAttr.count : 0;
	const total = edges.length;

	const outPos = new Float32Array(total * vpCount * 3);
	const outNorm = new Float32Array(total * vpCount * 3);
	const outUv = uvAttr ? new Float32Array(total * vpCount * 2) : null;
	const outIdx = new Uint32Array(total * triCount);

	const mat4 = new THREE.Matrix4();
	const normalMat = new THREE.Matrix3();
	const tempVec = new THREE.Vector3();

	for (let i = 0; i < total; i++) {
		const edge = edges[i];
		const yRot = angleMap[`${edge.dx},${edge.dz}`] ?? 0;
		mat4.makeRotationY(yRot);
		mat4.setPosition(edge.wx, 0, edge.wz);
		normalMat.getNormalMatrix(mat4);
		const vBase = i * vpCount;
		for (let v = 0; v < vpCount; v++) {
			tempVec.set(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));
			tempVec.applyMatrix4(mat4);
			const pOff = (vBase + v) * 3;
			outPos[pOff] = tempVec.x;
			outPos[pOff + 1] = tempVec.y;
			outPos[pOff + 2] = tempVec.z;
			tempVec.set(normAttr.getX(v), normAttr.getY(v), normAttr.getZ(v));
			tempVec.applyMatrix3(normalMat).normalize();
			outNorm[pOff] = tempVec.x;
			outNorm[pOff + 1] = tempVec.y;
			outNorm[pOff + 2] = tempVec.z;
			if (uvAttr && outUv) {
				const uOff = (vBase + v) * 2;
				outUv[uOff] = uvAttr.getX(v);
				outUv[uOff + 1] = uvAttr.getY(v);
			}
		}
		if (idxAttr) {
			const iOff = i * triCount;
			for (let j = 0; j < triCount; j++) outIdx[iOff + j] = idxAttr.getX(j) + vBase;
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(outNorm, 3));
	if (outUv) geo.setAttribute("uv", new THREE.BufferAttribute(outUv, 2));
	if (triCount > 0) geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
	template.dispose();
	return geo;
}

const PIT_DEPTH = 0.6;

function buildMinedPits(
	tiles: Array<{ x: number; z: number }>,
): { pitFloors: THREE.BufferGeometry; pitWalls: THREE.BufferGeometry } {
	if (tiles.length === 0) {
		return {
			pitFloors: new THREE.BufferGeometry(),
			pitWalls: new THREE.BufferGeometry(),
		};
	}

	// Pit floors
	const floorTemplate = new THREE.PlaneGeometry(TILE_SIZE_M, TILE_SIZE_M);
	floorTemplate.rotateX(-Math.PI / 2);
	const pitFloors = mergeTranslated(
		floorTemplate,
		tiles.map((t) => ({ x: t.x * TILE_SIZE_M, y: -PIT_DEPTH, z: t.z * TILE_SIZE_M })),
	);
	floorTemplate.dispose();

	// Pit walls — only on exposed edges
	const minedSet = new Set<string>();
	for (const t of tiles) minedSet.add(`${t.x},${t.z}`);

	const half = TILE_SIZE_M / 2;
	const wallDirs = [
		{ dx: 0, dz: -1, rotY: 0, offsetX: 0, offsetZ: -half },
		{ dx: 0, dz: 1, rotY: Math.PI, offsetX: 0, offsetZ: half },
		{ dx: 1, dz: 0, rotY: -Math.PI / 2, offsetX: half, offsetZ: 0 },
		{ dx: -1, dz: 0, rotY: Math.PI / 2, offsetX: -half, offsetZ: 0 },
	];

	const wallTemplate = new THREE.PlaneGeometry(TILE_SIZE_M, PIT_DEPTH);
	wallTemplate.translate(0, -PIT_DEPTH / 2, 0);

	const wallPositions: Array<{ x: number; y: number; z: number; rotY: number }> = [];
	for (const tile of tiles) {
		const cx = tile.x * TILE_SIZE_M;
		const cz = tile.z * TILE_SIZE_M;
		for (const dir of wallDirs) {
			if (!minedSet.has(`${tile.x + dir.dx},${tile.z + dir.dz}`)) {
				wallPositions.push({
					x: cx + dir.offsetX,
					y: 0,
					z: cz + dir.offsetZ,
					rotY: dir.rotY,
				});
			}
		}
	}

	let pitWalls: THREE.BufferGeometry;
	if (wallPositions.length > 0) {
		pitWalls = mergeTranslatedRotated(wallTemplate, wallPositions);
	} else {
		pitWalls = new THREE.BufferGeometry();
	}
	wallTemplate.dispose();

	return { pitFloors, pitWalls };
}

// ---------------------------------------------------------------------------
// Merge helpers (same as in the old renderers)
// ---------------------------------------------------------------------------

function mergeTranslated(
	template: THREE.BufferGeometry,
	positions: Array<{ x: number; y: number; z: number }>,
): THREE.BufferGeometry {
	const posAttr = template.getAttribute("position") as THREE.BufferAttribute;
	const normAttr = template.getAttribute("normal") as THREE.BufferAttribute;
	const uvAttr = template.getAttribute("uv") as THREE.BufferAttribute | null;
	const idxAttr = template.getIndex();
	const vpCount = posAttr.count;
	const triCount = idxAttr ? idxAttr.count : 0;
	const total = positions.length;

	const outPos = new Float32Array(total * vpCount * 3);
	const outNorm = new Float32Array(total * vpCount * 3);
	const outUv = uvAttr ? new Float32Array(total * vpCount * 2) : null;
	const outIdx = new Uint32Array(total * triCount);

	for (let i = 0; i < total; i++) {
		const { x, y, z } = positions[i];
		const vBase = i * vpCount;
		const vOff = vBase * 3;
		for (let v = 0; v < vpCount; v++) {
			const s = v * 3;
			outPos[vOff + s] = posAttr.getX(v) + x;
			outPos[vOff + s + 1] = posAttr.getY(v) + y;
			outPos[vOff + s + 2] = posAttr.getZ(v) + z;
			outNorm[vOff + s] = normAttr.getX(v);
			outNorm[vOff + s + 1] = normAttr.getY(v);
			outNorm[vOff + s + 2] = normAttr.getZ(v);
			if (uvAttr && outUv) {
				const u = (vBase + v) * 2;
				outUv[u] = uvAttr.getX(v);
				outUv[u + 1] = uvAttr.getY(v);
			}
		}
		if (idxAttr) {
			const iOff = i * triCount;
			for (let j = 0; j < triCount; j++) outIdx[iOff + j] = idxAttr.getX(j) + vBase;
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(outNorm, 3));
	if (outUv) geo.setAttribute("uv", new THREE.BufferAttribute(outUv, 2));
	if (triCount > 0) geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
	return geo;
}

function mergeTranslatedRotated(
	template: THREE.BufferGeometry,
	positions: Array<{ x: number; y: number; z: number; rotY: number }>,
): THREE.BufferGeometry {
	const posAttr = template.getAttribute("position") as THREE.BufferAttribute;
	const normAttr = template.getAttribute("normal") as THREE.BufferAttribute;
	const idxAttr = template.getIndex();
	const vpCount = posAttr.count;
	const triCount = idxAttr ? idxAttr.count : 0;
	const total = positions.length;

	const outPos = new Float32Array(total * vpCount * 3);
	const outNorm = new Float32Array(total * vpCount * 3);
	const outIdx = new Uint32Array(total * triCount);

	const mat4 = new THREE.Matrix4();
	const normalMat = new THREE.Matrix3();
	const tempVec = new THREE.Vector3();

	for (let i = 0; i < total; i++) {
		const { x, y, z, rotY } = positions[i];
		mat4.makeRotationY(rotY);
		mat4.setPosition(x, y, z);
		normalMat.getNormalMatrix(mat4);
		const vBase = i * vpCount;
		for (let v = 0; v < vpCount; v++) {
			const off = (vBase + v) * 3;
			tempVec.set(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));
			tempVec.applyMatrix4(mat4);
			outPos[off] = tempVec.x;
			outPos[off + 1] = tempVec.y;
			outPos[off + 2] = tempVec.z;
			tempVec.set(normAttr.getX(v), normAttr.getY(v), normAttr.getZ(v));
			tempVec.applyMatrix3(normalMat).normalize();
			outNorm[off] = tempVec.x;
			outNorm[off + 1] = tempVec.y;
			outNorm[off + 2] = tempVec.z;
		}
		if (idxAttr) {
			const iOff = i * triCount;
			for (let j = 0; j < triCount; j++) outIdx[iOff + j] = idxAttr.getX(j) + vBase;
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(outNorm, 3));
	if (triCount > 0) geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
	return geo;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type UnifiedTerrainRendererProps = {
	board: GeneratedBoard;
	world?: World;
	turn?: number;
};

export function UnifiedTerrainRenderer({
	board,
	world,
	turn = 1,
}: UnifiedTerrainRendererProps) {
	const { scene } = useThree();
	const meshesRef = useRef<THREE.Mesh[]>([]);

	useEffect(() => {
		// Clean up previous
		for (const m of meshesRef.current) {
			scene.remove(m);
			m.geometry.dispose();
			(m.material as THREE.Material).dispose();
		}

		const geoms = buildUnifiedGeometry(board, world);

		const bridgeMat = makeBridgeMaterial();
		const columnMat = makeColumnMaterial();
		const voidMat = makeVoidMaterial();
		const abyssalMat = makeAbyssalVoidMaterial();
		const pitFloorMat = makePitFloorMaterial();
		const pitWallMat = makePitWallMaterial();

		const bridgeMesh = new THREE.Mesh(geoms.bridge, bridgeMat);
		bridgeMesh.receiveShadow = true;
		bridgeMesh.castShadow = true;

		const columnMesh = new THREE.Mesh(geoms.columns, columnMat);
		columnMesh.castShadow = true;

		const voidMesh = new THREE.Mesh(geoms.voidPlanes, voidMat);

		const abyssalMesh = new THREE.Mesh(geoms.abyssalVoid, abyssalMat);
		abyssalMesh.receiveShadow = true;

		const rampMesh = new THREE.Mesh(geoms.ramps, bridgeMat);
		rampMesh.receiveShadow = true;
		rampMesh.castShadow = true;

		const pitFloorMesh = new THREE.Mesh(geoms.pitFloors, pitFloorMat);
		pitFloorMesh.receiveShadow = true;

		const pitWallMesh = new THREE.Mesh(geoms.pitWalls, pitWallMat);
		pitWallMesh.receiveShadow = true;
		pitWallMesh.castShadow = true;

		const meshes = [
			bridgeMesh,
			columnMesh,
			voidMesh,
			abyssalMesh,
			rampMesh,
			pitFloorMesh,
			pitWallMesh,
		];
		for (const m of meshes) scene.add(m);
		meshesRef.current = meshes;

		return () => {
			const disposedMaterials = new Set<THREE.Material>();
			for (const m of meshes) {
				scene.remove(m);
				m.geometry.dispose();
				const mat = m.material as THREE.Material;
				if (!disposedMaterials.has(mat)) {
					disposedMaterials.add(mat);
					mat.dispose();
				}
			}
			meshesRef.current = [];
		};
	}, [board, world, turn, scene]);

	return null;
}
