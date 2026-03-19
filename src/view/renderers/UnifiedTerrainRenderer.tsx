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
import type { World } from "koota";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ELEVATION_STEP_M, TILE_SIZE_M } from "../../board/grid";
import type { GeneratedBoard } from "../../board/types";
import { TileFloor } from "../../terrain/traits";
import { Tile } from "../../traits";
import { boardToDepthLayers } from "../../rendering/depthLayerStack";
import {
	applyTargetedDig,
	buildLayerGeometry,
	type EdgeDirection,
	type FloorQuad,
	type RampQuad,
	type VoidPlane,
	type WallQuad,
} from "../../rendering/depthMappedLayer";
import { buildExploredSet, isTileExplored } from "../../rendering/tileVisibility";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRIDGE_THICKNESS = 0.05;
const COLUMN_RADIUS = 0.05;
const COLUMN_SEGMENTS = 6;

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

function makeBridgeMaterial(): THREE.MeshStandardMaterial {
	const loader = new THREE.TextureLoader();
	const colorTex = loader.load("/assets/textures/floor_atlas_color.jpg");
	const normalTex = loader.load("/assets/textures/floor_atlas_normal.jpg");
	const roughnessTex = loader.load(
		"/assets/textures/floor_atlas_roughness.jpg",
	);
	const metalnessTex = loader.load(
		"/assets/textures/floor_atlas_metalness.jpg",
	);

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

function makeWallMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x1e1a16,
		roughness: 0.9,
		metalness: 0.3,
		side: THREE.DoubleSide,
	});
}

// ---------------------------------------------------------------------------
// Direction → rotation/offset mapping for ramps and walls
// ---------------------------------------------------------------------------

const DIRECTION_ROTY: Record<EdgeDirection, number> = {
	south: 0,
	north: Math.PI,
	east: -Math.PI / 2,
	west: Math.PI / 2,
};

const DIRECTION_OFFSET: Record<EdgeDirection, { dx: number; dz: number }> = {
	north: { dx: 0, dz: -1 },
	south: { dx: 0, dz: 1 },
	east: { dx: 1, dz: 0 },
	west: { dx: -1, dz: 0 },
};

// ---------------------------------------------------------------------------
// Geometry builders from depth layer descriptors
// ---------------------------------------------------------------------------

function buildFloorGeometry(
	floorQuads: FloorQuad[],
	explored?: Set<string>,
): THREE.BufferGeometry {
	const filtered = explored
		? floorQuads.filter((q) => isTileExplored(explored, q.x, q.z))
		: floorQuads;

	if (filtered.length === 0) return new THREE.BufferGeometry();

	const template = new THREE.PlaneGeometry(TILE_SIZE_M, TILE_SIZE_M);
	template.rotateX(-Math.PI / 2);

	const merged = mergeTranslated(
		template,
		filtered.map((q) => ({
			x: q.x * TILE_SIZE_M,
			y: q.worldY * ELEVATION_STEP_M,
			z: q.z * TILE_SIZE_M,
		})),
	);
	template.dispose();
	return merged;
}

function buildElevatedFloorGeometry(
	floorQuads: FloorQuad[],
	explored?: Set<string>,
): THREE.BufferGeometry {
	const filtered = explored
		? floorQuads.filter((q) => isTileExplored(explored, q.x, q.z))
		: floorQuads;

	if (filtered.length === 0) return new THREE.BufferGeometry();

	const template = new THREE.BoxGeometry(
		TILE_SIZE_M,
		BRIDGE_THICKNESS,
		TILE_SIZE_M,
	);

	const merged = mergeTranslated(
		template,
		filtered.map((q) => ({
			x: q.x * TILE_SIZE_M,
			y: q.worldY * ELEVATION_STEP_M,
			z: q.z * TILE_SIZE_M,
		})),
	);
	template.dispose();
	return merged;
}

function buildColumnGeometry(
	floorQuads: FloorQuad[],
	baseY: number,
	explored?: Set<string>,
): THREE.BufferGeometry {
	const filtered = explored
		? floorQuads.filter((q) => isTileExplored(explored, q.x, q.z))
		: floorQuads;

	if (filtered.length === 0) return new THREE.BufferGeometry();

	const half = TILE_SIZE_M / 2;
	const posSet = new Set<string>();
	const positions: Array<{ x: number; z: number }> = [];

	for (const q of filtered) {
		const cx = q.x * TILE_SIZE_M;
		const cz = q.z * TILE_SIZE_M;
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

	const colH = baseY * ELEVATION_STEP_M;
	if (colH <= 0) return new THREE.BufferGeometry();

	const template = new THREE.CylinderGeometry(
		COLUMN_RADIUS,
		COLUMN_RADIUS,
		colH,
		COLUMN_SEGMENTS,
	);

	const merged = mergeTranslated(
		template,
		positions.map((p) => ({ x: p.x, y: colH / 2, z: p.z })),
	);
	template.dispose();
	return merged;
}

function buildRampGeometryFromQuads(
	rampQuads: RampQuad[],
	baseY: number,
	explored?: Set<string>,
): THREE.BufferGeometry {
	const filtered = explored
		? rampQuads.filter((q) => isTileExplored(explored, q.x, q.z))
		: rampQuads;

	if (filtered.length === 0) return new THREE.BufferGeometry();

	const rampWidth = TILE_SIZE_M;
	const rampDepth = TILE_SIZE_M * 0.5;
	const rampHeight = ELEVATION_STEP_M;
	const template = new THREE.BoxGeometry(
		rampWidth,
		BRIDGE_THICKNESS,
		rampDepth,
	);
	const angle = Math.atan2(rampHeight, rampDepth);
	template.rotateX(-angle);
	template.translate(0, rampHeight / 2, 0);

	const posAttr = template.getAttribute("position") as THREE.BufferAttribute;
	const normAttr = template.getAttribute("normal") as THREE.BufferAttribute;
	const uvAttr = template.getAttribute("uv") as THREE.BufferAttribute | null;
	const idxAttr = template.getIndex();
	const vpCount = posAttr.count;
	const triCount = idxAttr ? idxAttr.count : 0;
	const total = filtered.length;

	const outPos = new Float32Array(total * vpCount * 3);
	const outNorm = new Float32Array(total * vpCount * 3);
	const outUv = uvAttr ? new Float32Array(total * vpCount * 2) : null;
	const outIdx = new Uint32Array(total * triCount);

	const mat4 = new THREE.Matrix4();
	const normalMat = new THREE.Matrix3();
	const tempVec = new THREE.Vector3();

	for (let i = 0; i < total; i++) {
		const ramp = filtered[i];
		const off = DIRECTION_OFFSET[ramp.direction];
		// Position at the midpoint between the deep cell and its neighbor
		const wx = (ramp.x + off.dx * 0.5) * TILE_SIZE_M;
		const wz = (ramp.z + off.dz * 0.5) * TILE_SIZE_M;
		// Base world Y is depth of the deeper cell
		const wy =
			(baseY + (ramp.x === ramp.x ? layer0DepthForRamp(ramp) : 0)) *
			ELEVATION_STEP_M;

		const yRot = DIRECTION_ROTY[ramp.direction];
		mat4.makeRotationY(yRot);
		mat4.setPosition(wx, wy, wz);
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
			for (let j = 0; j < triCount; j++)
				outIdx[iOff + j] = idxAttr.getX(j) + vBase;
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

/** Ramp descriptor is from the deeper cell, depth is always negative. */
function layer0DepthForRamp(_ramp: RampQuad): number {
	return 0; // Ramps on layer 0 sit at ground level; depth offset is in the worldY
}

function buildWallGeometryFromQuads(
	wallQuads: WallQuad[],
	baseY: number,
	explored?: Set<string>,
): THREE.BufferGeometry {
	const filtered = explored
		? wallQuads.filter((q) => isTileExplored(explored, q.x, q.z))
		: wallQuads;

	if (filtered.length === 0) return new THREE.BufferGeometry();

	const half = TILE_SIZE_M / 2;

	const wallPositions: Array<{
		x: number;
		y: number;
		z: number;
		rotY: number;
		h: number;
	}> = [];
	for (const wall of filtered) {
		const cx = wall.x * TILE_SIZE_M;
		const cz = wall.z * TILE_SIZE_M;
		const wallH = wall.depthDiff * ELEVATION_STEP_M;
		const off = DIRECTION_OFFSET[wall.direction];

		wallPositions.push({
			x: cx + off.dx * half,
			y: baseY * ELEVATION_STEP_M,
			z: cz + off.dz * half,
			rotY: DIRECTION_ROTY[wall.direction],
			h: wallH,
		});
	}

	// Build each wall with its specific height
	const geometries: THREE.BufferGeometry[] = [];
	for (const wp of wallPositions) {
		const wallGeo = new THREE.PlaneGeometry(TILE_SIZE_M, wp.h);
		wallGeo.translate(0, -wp.h / 2, 0);

		const mat4 = new THREE.Matrix4();
		mat4.makeRotationY(wp.rotY);
		mat4.setPosition(wp.x, wp.y, wp.z);
		wallGeo.applyMatrix4(mat4);
		geometries.push(wallGeo);
	}

	if (geometries.length === 0) return new THREE.BufferGeometry();

	// Merge all wall geometries
	const merged = mergeGeometries(geometries);
	for (const g of geometries) g.dispose();
	return merged;
}

function buildVoidGeometryFromQuads(
	voidPlanes: VoidPlane[],
	explored?: Set<string>,
): THREE.BufferGeometry {
	const filtered = explored
		? voidPlanes.filter((q) => isTileExplored(explored, q.x, q.z))
		: voidPlanes;

	if (filtered.length === 0) return new THREE.BufferGeometry();

	const template = new THREE.PlaneGeometry(TILE_SIZE_M, TILE_SIZE_M);
	template.rotateX(-Math.PI / 2);

	const merged = mergeTranslated(
		template,
		filtered.map((v) => ({
			x: v.x * TILE_SIZE_M,
			y: v.worldY * ELEVATION_STEP_M,
			z: v.z * TILE_SIZE_M,
		})),
	);
	template.dispose();
	return merged;
}

// ---------------------------------------------------------------------------
// Build from depth layer stack
// ---------------------------------------------------------------------------

function buildFromDepthLayers(
	board: GeneratedBoard,
	world?: World,
): {
	floors: THREE.BufferGeometry;
	elevatedFloors: THREE.BufferGeometry;
	columns: THREE.BufferGeometry;
	ramps: THREE.BufferGeometry;
	walls: THREE.BufferGeometry;
	voidPlanes: THREE.BufferGeometry;
} {
	const explored = world ? buildExploredSet(world) : undefined;
	const stack = boardToDepthLayers(board);

	// Apply mining from ECS state — mined tiles get depth -1 and gravel texture
	if (world && stack.layerCount > 0) {
		const layer0 = stack.getLayer(0);
		for (const entity of world.query(Tile, TileFloor)) {
			const tile = entity.get(Tile);
			const floor = entity.get(TileFloor);
			if (!tile || !floor || !floor.mined) continue;
			applyTargetedDig(layer0, tile.x, tile.z);
		}
	}

	// Collect geometry from all layers
	const allFloors: FloorQuad[] = [];
	const allElevatedFloors: FloorQuad[] = [];
	const allRamps: RampQuad[] = [];
	const allWalls: WallQuad[] = [];
	const allVoids: VoidPlane[] = [];

	let elevatedBaseY = 0;

	for (let i = 0; i < stack.layerCount; i++) {
		const layer = stack.getLayer(i);
		const geo = buildLayerGeometry(layer);

		if (layer.baseY === 0) {
			// Ground layer — floor quads rendered as flat planes
			allFloors.push(...geo.floorQuads);
		} else {
			// Elevated layer — floor quads rendered as box platforms
			allElevatedFloors.push(...geo.floorQuads);
			elevatedBaseY = layer.baseY;
		}

		allRamps.push(...geo.rampQuads);
		allWalls.push(...geo.wallQuads);
		allVoids.push(...geo.voidPlanes);
	}

	return {
		floors: buildFloorGeometry(allFloors, explored),
		elevatedFloors: buildElevatedFloorGeometry(allElevatedFloors, explored),
		columns: buildColumnGeometry(
			allElevatedFloors,
			elevatedBaseY || 1,
			explored,
		),
		ramps: buildRampGeometryFromQuads(allRamps, 0, explored),
		walls: buildWallGeometryFromQuads(allWalls, 0, explored),
		voidPlanes: buildVoidGeometryFromQuads(allVoids, explored),
	};
}

// ---------------------------------------------------------------------------
// Merge helpers
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
			for (let j = 0; j < triCount; j++)
				outIdx[iOff + j] = idxAttr.getX(j) + vBase;
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(outNorm, 3));
	if (outUv) geo.setAttribute("uv", new THREE.BufferAttribute(outUv, 2));
	if (triCount > 0) geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
	return geo;
}

function mergeGeometries(
	geometries: THREE.BufferGeometry[],
): THREE.BufferGeometry {
	if (geometries.length === 0) return new THREE.BufferGeometry();

	let totalVerts = 0;
	let totalIndices = 0;
	for (const g of geometries) {
		const pos = g.getAttribute("position") as THREE.BufferAttribute;
		totalVerts += pos.count;
		const idx = g.getIndex();
		totalIndices += idx ? idx.count : 0;
	}

	const outPos = new Float32Array(totalVerts * 3);
	const outNorm = new Float32Array(totalVerts * 3);
	const outIdx = new Uint32Array(totalIndices);

	let vertOffset = 0;
	let idxOffset = 0;
	for (const g of geometries) {
		const pos = g.getAttribute("position") as THREE.BufferAttribute;
		const norm = g.getAttribute("normal") as THREE.BufferAttribute;
		const idx = g.getIndex();

		for (let v = 0; v < pos.count; v++) {
			const off = (vertOffset + v) * 3;
			outPos[off] = pos.getX(v);
			outPos[off + 1] = pos.getY(v);
			outPos[off + 2] = pos.getZ(v);
			outNorm[off] = norm.getX(v);
			outNorm[off + 1] = norm.getY(v);
			outNorm[off + 2] = norm.getZ(v);
		}

		if (idx) {
			for (let i = 0; i < idx.count; i++) {
				outIdx[idxOffset + i] = idx.getX(i) + vertOffset;
			}
			idxOffset += idx.count;
		}

		vertOffset += pos.count;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(outNorm, 3));
	if (totalIndices > 0) geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
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

		const geoms = buildFromDepthLayers(board, world);

		const bridgeMat = makeBridgeMaterial();
		const columnMat = makeColumnMaterial();
		const voidMat = makeVoidMaterial();
		const wallMat = makeWallMaterial();

		const floorMesh = new THREE.Mesh(geoms.floors, bridgeMat);
		floorMesh.receiveShadow = true;

		const elevatedMesh = new THREE.Mesh(geoms.elevatedFloors, bridgeMat);
		elevatedMesh.receiveShadow = true;
		elevatedMesh.castShadow = true;

		const columnMesh = new THREE.Mesh(geoms.columns, columnMat);
		columnMesh.castShadow = true;

		const rampMesh = new THREE.Mesh(geoms.ramps, bridgeMat);
		rampMesh.receiveShadow = true;
		rampMesh.castShadow = true;

		const wallMesh = new THREE.Mesh(geoms.walls, wallMat);
		wallMesh.receiveShadow = true;
		wallMesh.castShadow = true;

		const voidMesh = new THREE.Mesh(geoms.voidPlanes, voidMat);

		const meshes = [
			floorMesh,
			elevatedMesh,
			columnMesh,
			rampMesh,
			wallMesh,
			voidMesh,
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
