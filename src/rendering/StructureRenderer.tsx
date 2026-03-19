/**
 * StructureRenderer — Layer 3: instanced GLB models for walls, columns,
 * doors, and staircases at structural_mass tile boundaries.
 *
 * Uses GLB models from structures/ for visual quality.
 *
 * Placement logic:
 *   - Walls on structural edges (where structural_mass meets non-structural)
 *   - Columns at corners shared by 2+ structural tiles
 *   - Doors at BSP block doorway gaps
 *   - Staircases at elevation transitions (0 <-> 1)
 *
 * Fog of war gated — only renders on explored tiles.
 */

import { Clone, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { TILE_SIZE_M } from "../board/grid";
import type { GeneratedBoard } from "../board/types";
import { seedToFloat } from "../ecs/terrain/cluster";
import {
	getAllStructureModelUrls,
	resolveStructureModelUrl,
	STRUCTURE_COLUMN_MODELS,
	STRUCTURE_ROOF_CORNER_MODELS,
	STRUCTURE_ROOF_MODELS,
	STRUCTURE_STAIRCASE_MODEL,
	STRUCTURE_WALL_MODELS,
	STRUCTURE_WINDOW_WALL_MODELS,
} from "./modelPaths";
import {
	type ColumnPosition,
	type StructuralEdge,
	getColumnPositions,
	getInteriorTiles,
	getStructuralEdges,
} from "./structureHelpers";
import { sphereModelPlacement, sphereModelPlacementWithRotation, worldToTileCoords } from "./spherePlacement";
import { buildExploredSet } from "./tileVisibility";

// Preload all structure models
for (const url of getAllStructureModelUrls()) {
	useGLTF.preload(url);
}

/**
 * Darken structure GLB materials to look like weathered industrial metal/concrete.
 * The asset models are bright/white — under the scene's strong HDRI + ambient
 * lighting they wash out. This adjusts color, metalness, roughness in-place
 * on the cloned scene graph so structures read as dark architectural mass.
 */
function applyIndustrialMaterials(root: THREE.Object3D): void {
	root.traverse((child) => {
		if (!(child instanceof THREE.Mesh)) return;
		const mat = child.material;
		if (!mat || !(mat instanceof THREE.MeshStandardMaterial)) return;
		// Darken the base color — multiply toward dark grey
		mat.color.multiplyScalar(0.35);
		// Industrial metal: moderate metalness, high roughness
		mat.metalness = Math.max(mat.metalness, 0.4);
		mat.roughness = Math.max(mat.roughness, 0.7);
	});
}

// ---------------------------------------------------------------------------
// Edge rotation — rotate wall/door to face the correct direction
// ---------------------------------------------------------------------------

const EDGE_ROTATIONS: Record<string, number> = {
	north: 0,           // face -Z
	south: Math.PI,     // face +Z
	east: -Math.PI / 2, // face +X
	west: Math.PI / 2,  // face -X
};

// ---------------------------------------------------------------------------
// Ramp edge collection (same as DepthRenderer)
// ---------------------------------------------------------------------------

const DIRECTIONS: [number, number][] = [
	[0, -1], // North
	[0, 1],  // South
	[1, 0],  // East
	[-1, 0], // West
];

interface RampEdge {
	wx: number;
	wz: number;
	dx: number;
	dz: number;
}

function collectRampEdges(board: GeneratedBoard, explored?: Set<string>): RampEdge[] {
	const { width, height } = board.config;
	const edges: RampEdge[] = [];
	const seen = new Set<string>();

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]![x]!;
			if (!tile.passable || tile.elevation !== 0) continue;
			if (explored && !explored.has(`${x},${z}`)) continue;

			for (const [dx, dz] of DIRECTIONS) {
				const nx = x + dx;
				const nz = z + dz;
				if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
				const neighbor = board.tiles[nz]![nx]!;
				if (!neighbor.passable || neighbor.elevation !== 1) continue;
				if (explored && !explored.has(`${nx},${nz}`)) continue;

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
	return edges;
}

const RAMP_ROTATIONS: Record<string, number> = {
	"0,1": 0,
	"0,-1": Math.PI,
	"1,0": -Math.PI / 2,
	"-1,0": Math.PI / 2,
};

// ---------------------------------------------------------------------------
// Deterministic model picker (seed-based, no Math.random)
// ---------------------------------------------------------------------------

function pickModel(models: readonly string[], seed: string, x: number, z: number): string {
	const hash = seedToFloat(seed + String(x * 31 + z * 17));
	const idx = Math.floor(hash * models.length) % models.length;
	return models[idx]!;
}

/** ~20% of wall edges get a windowed variant for variety. */
function isWindowWall(seed: string, x: number, z: number, edge: string): boolean {
	const hash = seedToFloat(seed + edge + String(x * 13 + z * 7));
	return hash < 0.2;
}

// ---------------------------------------------------------------------------
// Instance data computation (pure, no React)
// ---------------------------------------------------------------------------

interface WallInstance {
	url: string;
	wx: number;
	wz: number;
	rotation: number;
	key: string;
}

interface ColumnInstance {
	url: string;
	wx: number;
	wz: number;
	key: string;
}

interface StaircaseInstance {
	url: string;
	wx: number;
	wz: number;
	rotation: number;
	key: string;
}

function computeWallInstances(
	edges: StructuralEdge[],
	seed: string,
): WallInstance[] {
	return edges.map((e) => {
		const half = TILE_SIZE_M / 2;
		const cx = e.x * TILE_SIZE_M;
		const cz = e.z * TILE_SIZE_M;

		let wx = cx;
		let wz = cz;
		switch (e.edge) {
			case "north": wz = cz - half; break;
			case "south": wz = cz + half; break;
			case "west":  wx = cx - half; break;
			case "east":  wx = cx + half; break;
		}

		const models = isWindowWall(seed, e.x, e.z, e.edge)
			? STRUCTURE_WINDOW_WALL_MODELS
			: STRUCTURE_WALL_MODELS;
		const modelPath = pickModel(models, seed, e.x, e.z);

		return {
			url: resolveStructureModelUrl(modelPath),
			wx,
			wz,
			rotation: EDGE_ROTATIONS[e.edge] ?? 0,
			key: `wall-${e.x}-${e.z}-${e.edge}`,
		};
	});
}

function computeColumnInstances(
	positions: ColumnPosition[],
	seed: string,
): ColumnInstance[] {
	return positions.map((p, i) => {
		const modelPath = pickModel(STRUCTURE_COLUMN_MODELS, seed, Math.round(p.x), Math.round(p.z));
		return {
			url: resolveStructureModelUrl(modelPath),
			wx: p.x,
			wz: p.z,
			key: `col-${p.x.toFixed(1)}-${p.z.toFixed(1)}`,
		};
	});
}

function computeStaircaseInstances(
	rampEdges: RampEdge[],
): StaircaseInstance[] {
	const url = resolveStructureModelUrl(STRUCTURE_STAIRCASE_MODEL);
	return rampEdges.map((edge) => ({
		url,
		wx: edge.wx,
		wz: edge.wz,
		rotation: RAMP_ROTATIONS[`${edge.dx},${edge.dz}`] ?? 0,
		key: `stair-${edge.wx.toFixed(1)}-${edge.wz.toFixed(1)}`,
	}));
}

// ---------------------------------------------------------------------------
// Roof instances — placed atop structural_mass tiles
// ---------------------------------------------------------------------------

/** Camera distance above which roofs are visible. Below this, roofs are hidden
 *  so the player can see into building interiors at surface level. */
const ROOF_SHOW_DISTANCE = 55;

/** Roof tile height — placed at the top of walls. */
const ROOF_Y = 2.8;

interface RoofInstance {
	url: string;
	wx: number;
	wz: number;
	key: string;
}

function computeRoofInstances(
	board: GeneratedBoard,
	seed: string,
	explored?: Set<string>,
): RoofInstance[] {
	const interiorTiles = getInteriorTiles(board, explored);
	const allRoofs = [...STRUCTURE_ROOF_MODELS, ...STRUCTURE_ROOF_CORNER_MODELS];
	return interiorTiles.map((tile) => {
		const modelPath = pickModel(allRoofs, seed, tile.x, tile.z);
		return {
			url: resolveStructureModelUrl(modelPath),
			wx: tile.x * TILE_SIZE_M,
			wz: tile.z * TILE_SIZE_M,
			key: `roof-${tile.x}-${tile.z}`,
		};
	});
}

// ---------------------------------------------------------------------------
// GLB model components
// ---------------------------------------------------------------------------

function WallModel({ url, wx, wz, rotation, useSphere, boardWidth, boardHeight }: { url: string; wx: number; wz: number; rotation: number; useSphere?: boolean; boardWidth?: number; boardHeight?: number }) {
	const { scene } = useGLTF(url);
	const ref = useRef<THREE.Group>(null);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const scaleX = TILE_SIZE_M / (size.x || 1);
		const s = scaleX;
		return { scale: s, yOffset: -box.min.y * s };
	}, [scene]);

	useEffect(() => {
		if (ref.current) applyIndustrialMaterials(ref.current);
	}, []);

	if (useSphere && boardWidth && boardHeight) {
		const tile = worldToTileCoords(wx, wz, TILE_SIZE_M);
		const sp = sphereModelPlacementWithRotation(tile.tileX, tile.tileZ, boardWidth, boardHeight, rotation, yOffset);
		return (
			<Clone
				ref={ref}
				object={scene}
				position={sp.position}
				quaternion={sp.quaternion}
				scale={scale}
				castShadow
				receiveShadow
			/>
		);
	}

	return (
		<Clone
			ref={ref}
			object={scene}
			position={[wx, yOffset, wz]}
			rotation={[0, rotation, 0]}
			scale={scale}
			castShadow
			receiveShadow
		/>
	);
}

function ColumnModel({ url, wx, wz, useSphere, boardWidth, boardHeight }: { url: string; wx: number; wz: number; useSphere?: boolean; boardWidth?: number; boardHeight?: number }) {
	const { scene } = useGLTF(url);
	const ref = useRef<THREE.Group>(null);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const maxExtent = Math.max(size.x, size.y, size.z);
		const s = maxExtent > 0 ? (TILE_SIZE_M * 0.4) / maxExtent : 1;
		return { scale: s, yOffset: -box.min.y * s };
	}, [scene]);

	useEffect(() => {
		if (ref.current) applyIndustrialMaterials(ref.current);
	}, []);

	if (useSphere && boardWidth && boardHeight) {
		const tile = worldToTileCoords(wx, wz, TILE_SIZE_M);
		const sp = sphereModelPlacement(tile.tileX, tile.tileZ, boardWidth, boardHeight, yOffset);
		return (
			<Clone
				ref={ref}
				object={scene}
				position={sp.position}
				quaternion={sp.quaternion}
				scale={scale}
				castShadow
			/>
		);
	}

	return (
		<Clone
			ref={ref}
			object={scene}
			position={[wx, yOffset, wz]}
			scale={scale}
			castShadow
		/>
	);
}

function StaircaseModel({ url, wx, wz, rotation, useSphere, boardWidth, boardHeight }: { url: string; wx: number; wz: number; rotation: number; useSphere?: boolean; boardWidth?: number; boardHeight?: number }) {
	const { scene } = useGLTF(url);
	const ref = useRef<THREE.Group>(null);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const scaleX = TILE_SIZE_M / (size.x || 1);
		const s = scaleX;
		return { scale: s, yOffset: -box.min.y * s };
	}, [scene]);

	useEffect(() => {
		if (ref.current) applyIndustrialMaterials(ref.current);
	}, []);

	if (useSphere && boardWidth && boardHeight) {
		const tile = worldToTileCoords(wx, wz, TILE_SIZE_M);
		const sp = sphereModelPlacementWithRotation(tile.tileX, tile.tileZ, boardWidth, boardHeight, rotation, yOffset);
		return (
			<Clone
				ref={ref}
				object={scene}
				position={sp.position}
				quaternion={sp.quaternion}
				scale={scale}
				castShadow
				receiveShadow
			/>
		);
	}

	return (
		<Clone
			ref={ref}
			object={scene}
			position={[wx, yOffset, wz]}
			rotation={[0, rotation, 0]}
			scale={scale}
			castShadow
			receiveShadow
		/>
	);
}

function RoofModel({ url, wx, wz, useSphere, boardWidth, boardHeight }: { url: string; wx: number; wz: number; useSphere?: boolean; boardWidth?: number; boardHeight?: number }) {
	const { scene } = useGLTF(url);
	const ref = useRef<THREE.Group>(null);
	const camera = useThree((s) => s.camera);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const s = TILE_SIZE_M / (size.x || 1);
		return { scale: s, yOffset: -box.min.y * s + ROOF_Y };
	}, [scene]);

	useEffect(() => {
		if (ref.current) applyIndustrialMaterials(ref.current);
	}, []);

	// Toggle visibility based on camera distance — hide roofs at close zoom
	useFrame(() => {
		if (!ref.current) return;
		const camDist = camera.position.length();
		ref.current.visible = camDist > ROOF_SHOW_DISTANCE;
	});

	if (useSphere && boardWidth && boardHeight) {
		const tile = worldToTileCoords(wx, wz, TILE_SIZE_M);
		const sp = sphereModelPlacement(tile.tileX, tile.tileZ, boardWidth, boardHeight, yOffset);
		return (
			<Clone
				ref={ref}
				object={scene}
				position={sp.position}
				quaternion={sp.quaternion}
				scale={scale}
				receiveShadow
			/>
		);
	}

	return (
		<Clone
			ref={ref}
			object={scene}
			position={[wx, yOffset, wz]}
			scale={scale}
			receiveShadow
		/>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type StructureRendererProps = {
	board: GeneratedBoard;
	world?: World;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
};

export function StructureRenderer({ board, world, useSphere, boardWidth, boardHeight }: StructureRendererProps) {
	const instances = useMemo(() => {
		const explored = world ? buildExploredSet(world) : undefined;
		const seed = board.config.seed;

		const edges = getStructuralEdges(board, explored);
		const columns = getColumnPositions(board, explored);
		const ramps = collectRampEdges(board, explored);

		return {
			walls: computeWallInstances(edges, seed),
			columns: computeColumnInstances(columns, seed),
			staircases: computeStaircaseInstances(ramps),
			roofs: computeRoofInstances(board, seed, explored),
		};
	}, [board, world]);

	return (
		<>
			{instances.walls.map((w) => (
				<ModelErrorBoundary key={w.key} name={w.url}>
					<Suspense fallback={null}>
						<WallModel url={w.url} wx={w.wx} wz={w.wz} rotation={w.rotation} useSphere={useSphere} boardWidth={boardWidth} boardHeight={boardHeight} />
					</Suspense>
				</ModelErrorBoundary>
			))}
			{instances.columns.map((c) => (
				<ModelErrorBoundary key={c.key} name={c.url}>
					<Suspense fallback={null}>
						<ColumnModel url={c.url} wx={c.wx} wz={c.wz} useSphere={useSphere} boardWidth={boardWidth} boardHeight={boardHeight} />
					</Suspense>
				</ModelErrorBoundary>
			))}
			{instances.staircases.map((s) => (
				<ModelErrorBoundary key={s.key} name={s.url}>
					<Suspense fallback={null}>
						<StaircaseModel url={s.url} wx={s.wx} wz={s.wz} rotation={s.rotation} useSphere={useSphere} boardWidth={boardWidth} boardHeight={boardHeight} />
					</Suspense>
				</ModelErrorBoundary>
			))}
			{instances.roofs.map((r) => (
				<ModelErrorBoundary key={r.key} name={r.url}>
					<Suspense fallback={null}>
						<RoofModel url={r.url} wx={r.wx} wz={r.wz} useSphere={useSphere} boardWidth={boardWidth} boardHeight={boardHeight} />
					</Suspense>
				</ModelErrorBoundary>
			))}
		</>
	);
}
