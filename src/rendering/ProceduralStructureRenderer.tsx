/**
 * ProceduralStructureRenderer — Layer 3: procedural walls and columns at
 * structural_mass tile locations.
 *
 * Generates:
 *   1. Wall segments on edges where structural_mass meets non-structural tiles
 *   2. Columns at tile corners where 2+ structural_mass tiles share a corner
 *   3. Interior fill platforms for tiles fully surrounded by structural_mass
 *
 * All geometry merged into single draw calls per material type (same pattern
 * as DepthRenderer / BoardRenderer).
 */

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { World } from "koota";
import * as THREE from "three";
import type { GeneratedBoard } from "../board/types";
import { TILE_SIZE_M } from "../board/grid";
import { seedToFloat } from "../ecs/terrain/cluster";
import { buildExploredSet, isTileExplored } from "./tileVisibility";

type ProceduralStructureRendererProps = {
	board: GeneratedBoard;
	world?: World;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALL_DEPTH = 0.15;
const COLUMN_RADIUS = 0.12;
const COLUMN_SEGMENTS = 6;
const INTERIOR_HEIGHT = 0.3;

const BASE_WALL_HEIGHT = 2.5;
const WALL_HEIGHT_VARIATION = 2.0;

type Edge = "north" | "south" | "east" | "west";

// ---------------------------------------------------------------------------
// Structural tile detection
// ---------------------------------------------------------------------------

function isStructural(board: GeneratedBoard, x: number, z: number): boolean {
	const { width, height } = board.config;
	if (x < 0 || x >= width || z < 0 || z >= height) return false;
	return board.tiles[z][x].floorType === "structural_mass";
}

// ---------------------------------------------------------------------------
// Edge detection — walls at cluster boundaries
// ---------------------------------------------------------------------------

export interface StructuralEdge {
	x: number;
	z: number;
	edge: Edge;
}

/**
 * For each structural_mass tile, emit an edge for each neighbor that is NOT
 * structural_mass (or is out of bounds).
 * When explored set is provided, skip unexplored tiles.
 */
export function getStructuralEdges(board: GeneratedBoard, explored?: Set<string>): StructuralEdge[] {
	const { width, height } = board.config;
	const edges: StructuralEdge[] = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			if (board.tiles[z][x].floorType !== "structural_mass") continue;
			if (explored && !isTileExplored(explored, x, z)) continue;

			// north = -z direction
			if (!isStructural(board, x, z - 1)) {
				edges.push({ x, z, edge: "north" });
			}
			// south = +z direction
			if (!isStructural(board, x, z + 1)) {
				edges.push({ x, z, edge: "south" });
			}
			// west = -x direction
			if (!isStructural(board, x - 1, z)) {
				edges.push({ x, z, edge: "west" });
			}
			// east = +x direction
			if (!isStructural(board, x + 1, z)) {
				edges.push({ x, z, edge: "east" });
			}
		}
	}

	return edges;
}

// ---------------------------------------------------------------------------
// Column placement — corners shared by 2+ structural tiles
// ---------------------------------------------------------------------------

export interface ColumnPosition {
	x: number;
	z: number;
}

/**
 * Place a column at each tile corner where 2+ structural_mass tiles share
 * that corner. Each tile has 4 corners; corners are shared with adjacent tiles.
 *
 * Corner (cx, cz) is shared by tiles:
 *   (cx-1, cz-1), (cx, cz-1), (cx-1, cz), (cx, cz)
 * in tile-grid space. A corner is at the meeting point of those 4 tiles.
 */
export function getColumnPositions(board: GeneratedBoard, explored?: Set<string>): ColumnPosition[] {
	const { width, height } = board.config;
	const positions: ColumnPosition[] = [];

	// Helper: tile must be structural AND explored (if explored set provided)
	function isVisibleStructural(x: number, z: number): boolean {
		if (!isStructural(board, x, z)) return false;
		if (explored && !isTileExplored(explored, x, z)) return false;
		return true;
	}

	// Iterate over all possible corner positions.
	// Corner (cx, cz) in tile-corner-space is at the top-left corner of tile (cx, cz).
	// Range: cx in [0, width], cz in [0, height] — one more than tile count in each axis.
	for (let cz = 0; cz <= height; cz++) {
		for (let cx = 0; cx <= width; cx++) {
			// Count structural tiles sharing this corner
			let count = 0;
			// The 4 tiles sharing corner (cx, cz) are:
			//   (cx-1, cz-1), (cx, cz-1), (cx-1, cz), (cx, cz)
			if (isVisibleStructural(cx - 1, cz - 1)) count++;
			if (isVisibleStructural(cx, cz - 1)) count++;
			if (isVisibleStructural(cx - 1, cz)) count++;
			if (isVisibleStructural(cx, cz)) count++;

			if (count >= 2) {
				// World position: corner (cx, cz) is at world
				// (cx * TILE_SIZE_M - half, cz * TILE_SIZE_M - half)
				// because tile (tx, tz) center is at (tx * TILE_SIZE_M, tz * TILE_SIZE_M)
				// and its top-left corner is at (tx*T - half, tz*T - half).
				// Corner (cx, cz) = top-left of tile (cx, cz) = bottom-right of tile (cx-1, cz-1)
				// = world (cx * T - half, cz * T - half)
				const half = TILE_SIZE_M / 2;
				positions.push({
					x: cx * TILE_SIZE_M - half,
					z: cz * TILE_SIZE_M - half,
				});
			}
		}
	}

	return positions;
}

// ---------------------------------------------------------------------------
// Interior fill detection — tiles fully surrounded by structural_mass
// ---------------------------------------------------------------------------

export function getInteriorTiles(
	board: GeneratedBoard,
	explored?: Set<string>,
): Array<{ x: number; z: number }> {
	const { width, height } = board.config;
	const interior: Array<{ x: number; z: number }> = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			if (board.tiles[z][x].floorType !== "structural_mass") continue;
			if (explored && !isTileExplored(explored, x, z)) continue;

			// All 4 cardinal neighbors must be structural_mass
			if (
				isStructural(board, x - 1, z) &&
				isStructural(board, x + 1, z) &&
				isStructural(board, x, z - 1) &&
				isStructural(board, x, z + 1)
			) {
				interior.push({ x, z });
			}
		}
	}

	return interior;
}

// ---------------------------------------------------------------------------
// Wall height — deterministic from board seed + position
// ---------------------------------------------------------------------------

export function wallHeight(seed: string, tileX: number, tileZ: number): number {
	const s = seedToFloat(seed + String(tileX * 31 + tileZ * 17));
	return BASE_WALL_HEIGHT + s * WALL_HEIGHT_VARIATION;
}

// ---------------------------------------------------------------------------
// Geometry builders
// ---------------------------------------------------------------------------

export interface StructureGeometries {
	walls: THREE.BufferGeometry;
	columns: THREE.BufferGeometry;
	interior: THREE.BufferGeometry;
}

export function buildStructureGeometries(
	board: GeneratedBoard,
	explored?: Set<string>,
): StructureGeometries {
	return {
		walls: buildWallGeometry(board, explored),
		columns: buildColumnsGeometry(board, explored),
		interior: buildInteriorGeometry(board, explored),
	};
}

/**
 * Build merged wall geometry from structural edges.
 */
function buildWallGeometry(board: GeneratedBoard, explored?: Set<string>): THREE.BufferGeometry {
	const edges = getStructuralEdges(board, explored);
	if (edges.length === 0) return new THREE.BufferGeometry();

	const half = TILE_SIZE_M / 2;
	const positions: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];

	for (const e of edges) {
		const cx = e.x * TILE_SIZE_M;
		const cz = e.z * TILE_SIZE_M;
		const h = wallHeight(board.config.seed, e.x, e.z);

		// Each wall is a Box positioned at the edge of the tile.
		// width = TILE_SIZE_M (along edge), depth = WALL_DEPTH (thin), height = h
		switch (e.edge) {
			case "north":
				positions.push({
					x: cx, y: h / 2, z: cz - half,
					sx: TILE_SIZE_M, sy: h, sz: WALL_DEPTH,
				});
				break;
			case "south":
				positions.push({
					x: cx, y: h / 2, z: cz + half,
					sx: TILE_SIZE_M, sy: h, sz: WALL_DEPTH,
				});
				break;
			case "west":
				positions.push({
					x: cx - half, y: h / 2, z: cz,
					sx: WALL_DEPTH, sy: h, sz: TILE_SIZE_M,
				});
				break;
			case "east":
				positions.push({
					x: cx + half, y: h / 2, z: cz,
					sx: WALL_DEPTH, sy: h, sz: TILE_SIZE_M,
				});
				break;
		}
	}

	return mergeScaledBoxes(positions);
}

/**
 * Build merged column geometry from corner positions.
 */
function buildColumnsGeometry(board: GeneratedBoard, explored?: Set<string>): THREE.BufferGeometry {
	const colPositions = getColumnPositions(board, explored);
	if (colPositions.length === 0) return new THREE.BufferGeometry();

	// Column height = 3.5m (tall structural support pillars)
	const columnHeight = 3.5;
	const template = new THREE.CylinderGeometry(
		COLUMN_RADIUS,
		COLUMN_RADIUS,
		columnHeight,
		COLUMN_SEGMENTS,
	);
	const midY = columnHeight / 2;

	const merged = mergeTranslated(
		template,
		colPositions.map((p) => ({ x: p.x, y: midY, z: p.z })),
	);
	template.dispose();
	return merged;
}

/**
 * Build merged interior fill geometry (low raised platforms).
 */
function buildInteriorGeometry(board: GeneratedBoard, explored?: Set<string>): THREE.BufferGeometry {
	const tiles = getInteriorTiles(board, explored);
	if (tiles.length === 0) return new THREE.BufferGeometry();

	const template = new THREE.BoxGeometry(
		TILE_SIZE_M,
		INTERIOR_HEIGHT,
		TILE_SIZE_M,
	);
	const merged = mergeTranslated(
		template,
		tiles.map((t) => ({
			x: t.x * TILE_SIZE_M,
			y: INTERIOR_HEIGHT / 2,
			z: t.z * TILE_SIZE_M,
		})),
	);
	template.dispose();
	return merged;
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

/**
 * Clone a template geometry at each position, merge into one BufferGeometry.
 */
function mergeTranslated(
	template: THREE.BufferGeometry,
	positions: Array<{ x: number; y: number; z: number }>,
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
		}

		if (idxAttr) {
			const iOff = i * triCount;
			for (let j = 0; j < triCount; j++) {
				outIdx[iOff + j] = idxAttr.getX(j) + vBase;
			}
		}
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(outNorm, 3));
	if (triCount > 0) {
		geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
	}

	return geo;
}

/**
 * Build and merge individually-sized boxes (walls have varying dimensions).
 * Each entry specifies position (x,y,z) and scale (sx,sy,sz).
 */
function mergeScaledBoxes(
	boxes: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }>,
): THREE.BufferGeometry {
	if (boxes.length === 0) return new THREE.BufferGeometry();

	// BoxGeometry(1,1,1) as unit template — scale per instance
	const unit = new THREE.BoxGeometry(1, 1, 1);
	const posAttr = unit.getAttribute("position") as THREE.BufferAttribute;
	const normAttr = unit.getAttribute("normal") as THREE.BufferAttribute;
	const idxAttr = unit.getIndex();

	const vpCount = posAttr.count;
	const triCount = idxAttr ? idxAttr.count : 0;
	const total = boxes.length;

	const outPos = new Float32Array(total * vpCount * 3);
	const outNorm = new Float32Array(total * vpCount * 3);
	const outIdx = new Uint32Array(total * triCount);

	for (let i = 0; i < total; i++) {
		const { x, y, z, sx, sy, sz } = boxes[i];
		const vBase = i * vpCount;
		const vOff = vBase * 3;

		for (let v = 0; v < vpCount; v++) {
			const s = v * 3;
			// Scale the unit box vertex, then translate
			outPos[vOff + s] = posAttr.getX(v) * sx + x;
			outPos[vOff + s + 1] = posAttr.getY(v) * sy + y;
			outPos[vOff + s + 2] = posAttr.getZ(v) * sz + z;

			// Normals: for axis-aligned boxes, unit-box normals are correct
			// (they're already ±1 on the appropriate axis)
			outNorm[vOff + s] = normAttr.getX(v);
			outNorm[vOff + s + 1] = normAttr.getY(v);
			outNorm[vOff + s + 2] = normAttr.getZ(v);
		}

		if (idxAttr) {
			const iOff = i * triCount;
			for (let j = 0; j < triCount; j++) {
				outIdx[iOff + j] = idxAttr.getX(j) + vBase;
			}
		}
	}

	unit.dispose();

	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(outNorm, 3));
	if (triCount > 0) {
		geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
	}

	return geo;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

function makeWallMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x1a1e24,
		roughness: 0.7,
		metalness: 0.6,
		side: THREE.FrontSide,
	});
}

function makeColumnMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x1a1e24,
		roughness: 0.7,
		metalness: 0.6,
	});
}

function makeInteriorMaterial(): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color: 0x141820,
		roughness: 0.8,
		metalness: 0.5,
	});
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProceduralStructureRenderer({
	board,
	world,
}: ProceduralStructureRendererProps) {
	const { scene } = useThree();
	const meshesRef = useRef<THREE.Mesh[]>([]);

	useEffect(() => {
		const explored = world ? buildExploredSet(world) : undefined;
		const geoms = buildStructureGeometries(board, explored);

		const wallMat = makeWallMaterial();
		const columnMat = makeColumnMaterial();
		const interiorMat = makeInteriorMaterial();

		const wallMesh = new THREE.Mesh(geoms.walls, wallMat);
		wallMesh.receiveShadow = true;
		wallMesh.castShadow = true;

		const columnMesh = new THREE.Mesh(geoms.columns, columnMat);
		columnMesh.castShadow = true;

		const interiorMesh = new THREE.Mesh(geoms.interior, interiorMat);
		interiorMesh.receiveShadow = true;

		const meshes = [wallMesh, columnMesh, interiorMesh];
		for (const m of meshes) {
			scene.add(m);
		}
		meshesRef.current = meshes;

		return () => {
			for (const m of meshes) {
				scene.remove(m);
				m.geometry.dispose();
				(m.material as THREE.Material).dispose();
			}
			meshesRef.current = [];
		};
	}, [board, world, scene]);

	return null;
}
