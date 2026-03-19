/**
 * InfrastructureRenderer — scatter 48+ infrastructure GLB models along
 * corridors, intersections, and building boundaries for visual richness.
 *
 * Non-interactive decoration: pipes, lamps, supports, antennas, cables,
 * monorail segments, gateways. Placed deterministically from board seed.
 *
 * Placement rules:
 *   - Pipes: corridor tiles with exactly one structural_mass neighbor (edge of corridor)
 *   - Lamps: corridor tiles at intersections (3+ passable cardinal neighbors)
 *   - Supports: long corridors (2 opposite passable neighbors, no cross-neighbors)
 *   - Antennas/power: structural_mass tiles at the boundary (has 1+ passable neighbor)
 *   - Gateways: corridor tiles with 2 opposite structural neighbors (doorway openings)
 *
 * Fog of war gated — only renders on explored tiles.
 */

import { Clone, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { type ReactNode, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../../board/grid";
import type { GeneratedBoard } from "../../board/types";
import { seedToFloat } from "../../terrain/cluster";
import { ModelErrorBoundary } from "../ModelErrorBoundary";
import {
	getAllInfraModelUrls,
	INFRA_ANTENNA_MODELS,
	INFRA_GATEWAY_MODELS,
	INFRA_LIGHT_MODELS,
	INFRA_PIPE_MODELS,
	INFRA_POWER_MODELS,
	INFRA_SUPPORT_MODELS,
} from "../../rendering/modelPaths";
import { buildExploredSet } from "../../rendering/tileVisibility";

// Preload all infrastructure models
for (const url of getAllInfraModelUrls()) {
	useGLTF.preload(url);
}

const MODEL_BASE = "/assets/models/";

// ---------------------------------------------------------------------------
// Placement density — only a fraction of eligible tiles get props
// ---------------------------------------------------------------------------

/** Fraction of eligible corridor-edge tiles that get a pipe. */
const PIPE_DENSITY = 0.5;
/** Fraction of intersections that get a lamp. */
const LAMP_DENSITY = 0.7;
/** Fraction of long-corridor tiles that get a support. */
const SUPPORT_DENSITY = 0.3;
/** Fraction of boundary structural tiles that get an antenna/power prop. */
const ANTENNA_DENSITY = 0.16;
/** Fraction of doorway tiles that get a gateway prop. */
const GATEWAY_DENSITY = 0.6;

// ---------------------------------------------------------------------------
// Deterministic model picker
// ---------------------------------------------------------------------------

function pickModel(
	models: readonly string[],
	seed: string,
	x: number,
	z: number,
): string {
	const hash = seedToFloat(seed + String(x * 31 + z * 17));
	const idx = Math.floor(hash * models.length) % models.length;
	return models[idx]!;
}

function shouldPlace(
	density: number,
	seed: string,
	x: number,
	z: number,
	salt: string,
): boolean {
	return seedToFloat(seed + salt + String(x * 53 + z * 37)) < density;
}

// ---------------------------------------------------------------------------
// Cardinal directions and neighbor analysis
// ---------------------------------------------------------------------------

const CARDINALS: [number, number][] = [
	[0, -1],
	[0, 1],
	[1, 0],
	[-1, 0],
];

interface TileAnalysis {
	isPassable: boolean;
	isStructural: boolean;
	passableNeighborCount: number;
	structuralNeighborCount: number;
	/** Directions where neighbor is structural_mass */
	structuralDirs: [number, number][];
	/** Directions where neighbor is passable */
	passableDirs: [number, number][];
}

function analyzeTile(
	x: number,
	z: number,
	board: GeneratedBoard,
): TileAnalysis {
	const { width, height } = board.config;
	const tile = board.tiles[z]?.[x];
	const isPassable = tile?.passable ?? false;
	const isStructural = tile?.floorType === "structural_mass";

	let passableNeighborCount = 0;
	let structuralNeighborCount = 0;
	const structuralDirs: [number, number][] = [];
	const passableDirs: [number, number][] = [];

	for (const [dx, dz] of CARDINALS) {
		const nx = x + dx;
		const nz = z + dz;
		if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
		const neighbor = board.tiles[nz][nx];
		if (neighbor.passable) {
			passableNeighborCount++;
			passableDirs.push([dx, dz]);
		}
		if (neighbor.floorType === "structural_mass") {
			structuralNeighborCount++;
			structuralDirs.push([dx, dz]);
		}
	}

	return {
		isPassable,
		isStructural,
		passableNeighborCount,
		structuralNeighborCount,
		structuralDirs,
		passableDirs,
	};
}

// ---------------------------------------------------------------------------
// Edge rotation — rotate prop to face the structural wall
// ---------------------------------------------------------------------------

function dirToRotation(dx: number, dz: number): number {
	if (dz === -1) return 0; // north
	if (dz === 1) return Math.PI; // south
	if (dx === 1) return -Math.PI / 2; // east
	if (dx === -1) return Math.PI / 2; // west
	return 0;
}

// ---------------------------------------------------------------------------
// Instance data types
// ---------------------------------------------------------------------------

interface InfraInstance {
	url: string;
	wx: number;
	wz: number;
	rotation: number;
	key: string;
}

// ---------------------------------------------------------------------------
// Compute all infrastructure placements
// ---------------------------------------------------------------------------

function computeInfraInstances(
	board: GeneratedBoard,
	explored?: Set<string>,
): InfraInstance[] {
	const { width, height } = board.config;
	const seed = board.config.seed;
	const instances: InfraInstance[] = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			// Skip unexplored tiles
			if (explored && !explored.has(`${x},${z}`)) continue;

			const analysis = analyzeTile(x, z, board);
			const wx = x * TILE_SIZE_M;
			const wz = z * TILE_SIZE_M;

			if (analysis.isPassable) {
				// PIPE: corridor tile with exactly 1 structural neighbor
				if (
					analysis.structuralNeighborCount === 1 &&
					shouldPlace(PIPE_DENSITY, seed, x, z, "pipe")
				) {
					const [dx, dz] = analysis.structuralDirs[0];
					const modelPath = pickModel(INFRA_PIPE_MODELS, seed, x, z);
					instances.push({
						url: MODEL_BASE + modelPath,
						wx,
						wz,
						rotation: dirToRotation(dx, dz),
						key: `pipe-${x}-${z}`,
					});
				}

				// LAMP: intersection with 3+ passable neighbors
				else if (
					analysis.passableNeighborCount >= 3 &&
					shouldPlace(LAMP_DENSITY, seed, x, z, "lamp")
				) {
					const modelPath = pickModel(INFRA_LIGHT_MODELS, seed, x, z);
					instances.push({
						url: MODEL_BASE + modelPath,
						wx,
						wz,
						rotation: seedToFloat(seed + `lr${x},${z}`) * Math.PI * 2,
						key: `lamp-${x}-${z}`,
					});
				}

				// SUPPORT: long corridor (2 passable neighbors on opposite sides)
				else if (
					analysis.passableNeighborCount === 2 &&
					analysis.structuralNeighborCount >= 1
				) {
					const dirs = analysis.passableDirs;
					const isOpposite =
						dirs.length === 2 &&
						dirs[0][0] + dirs[1][0] === 0 &&
						dirs[0][1] + dirs[1][1] === 0;
					if (
						isOpposite &&
						shouldPlace(SUPPORT_DENSITY, seed, x, z, "support")
					) {
						const modelPath = pickModel(INFRA_SUPPORT_MODELS, seed, x, z);
						instances.push({
							url: MODEL_BASE + modelPath,
							wx,
							wz,
							rotation: dirToRotation(dirs[0][0], dirs[0][1]),
							key: `support-${x}-${z}`,
						});
					}
				}

				// GATEWAY: doorway tile (2 structural neighbors on opposite sides)
				if (analysis.structuralNeighborCount === 2) {
					const dirs = analysis.structuralDirs;
					const isOpposite =
						dirs.length === 2 &&
						dirs[0][0] + dirs[1][0] === 0 &&
						dirs[0][1] + dirs[1][1] === 0;
					if (isOpposite && shouldPlace(GATEWAY_DENSITY, seed, x, z, "gate")) {
						const modelPath = pickModel(INFRA_GATEWAY_MODELS, seed, x, z);
						instances.push({
							url: MODEL_BASE + modelPath,
							wx,
							wz,
							rotation: dirToRotation(dirs[0][0], dirs[0][1]),
							key: `gate-${x}-${z}`,
						});
					}
				}
			}

			// ANTENNA / POWER: structural tile at boundary (has passable neighbor)
			if (analysis.isStructural && analysis.passableNeighborCount >= 1) {
				if (shouldPlace(ANTENNA_DENSITY, seed, x, z, "antenna")) {
					const models =
						seedToFloat(seed + `at${x},${z}`) < 0.5
							? INFRA_ANTENNA_MODELS
							: INFRA_POWER_MODELS;
					const modelPath = pickModel(models, seed, x, z);
					const [dx, dz] = analysis.passableDirs[0];
					instances.push({
						url: MODEL_BASE + modelPath,
						wx,
						wz,
						rotation: dirToRotation(dx, dz),
						key: `antenna-${x}-${z}`,
					});
				}
			}
		}
	}

	return instances;
}

// ---------------------------------------------------------------------------
// GLB model component
// ---------------------------------------------------------------------------

function applyIndustrialMaterials(root: THREE.Object3D): void {
	root.traverse((child) => {
		if (!(child instanceof THREE.Mesh)) return;
		const mat = child.material;
		if (!mat || !(mat instanceof THREE.MeshStandardMaterial)) return;
		mat.color.multiplyScalar(0.4);
		mat.metalness = Math.max(mat.metalness, 0.5);
		mat.roughness = Math.max(mat.roughness, 0.65);
	});
}

function InfraModel({
	url,
	wx,
	wz,
	rotation,
}: {
	url: string;
	wx: number;
	wz: number;
	rotation: number;
}) {
	const { scene } = useGLTF(url);
	const ref = useRef<THREE.Group>(null);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		// Scale to fit within 80% of a tile
		const maxExtent = Math.max(size.x, size.y, size.z);
		const s = maxExtent > 0 ? (TILE_SIZE_M * 0.8) / maxExtent : 1;
		return { scale: s, yOffset: -box.min.y * s };
	}, [scene]);

	useEffect(() => {
		if (ref.current) applyIndustrialMaterials(ref.current);
	}, []);

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

// ---------------------------------------------------------------------------
// Distance culling
// ---------------------------------------------------------------------------

/** Camera distance beyond which infrastructure detail is hidden to save GPU. */
const INFRA_CULL_DISTANCE = 40;

function InfraCullGroup({ children }: { children: ReactNode }) {
	const groupRef = useRef<THREE.Group>(null);
	const camera = useThree((s) => s.camera);

	useFrame(() => {
		if (!groupRef.current) return;
		groupRef.current.visible = camera.position.length() < INFRA_CULL_DISTANCE;
	});

	return <group ref={groupRef}>{children}</group>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type InfrastructureRendererProps = {
	board: GeneratedBoard;
	world?: World;
};

export function InfrastructureRenderer({
	board,
	world,
}: InfrastructureRendererProps) {
	const instances = useMemo(() => {
		const explored = world ? buildExploredSet(world) : undefined;
		return computeInfraInstances(board, explored);
	}, [board, world]);

	return (
		<InfraCullGroup>
			{instances.map((inst) => (
				<ModelErrorBoundary key={inst.key} name={inst.url}>
					<Suspense fallback={null}>
						<InfraModel
							url={inst.url}
							wx={inst.wx}
							wz={inst.wz}
							rotation={inst.rotation}
						/>
					</Suspense>
				</ModelErrorBoundary>
			))}
		</InfraCullGroup>
	);
}
