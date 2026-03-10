/**
 * Visual glow effect for stockpiled cube clusters.
 *
 * Queries all placed cubes (placedCube + worldPosition) and groups them
 * into proximity clusters using a simple grid-based spatial hash.
 * Each cluster renders a soft point light and an emissive ground disc
 * whose intensity and color scale with the cluster's total value and
 * dominant material type.
 *
 * Performance notes:
 * - Cluster computation is cached at module level and recomputed only
 *   when the placed-cube count changes (checked per frame, cheap).
 * - Uses a grid cell size of 4 world units for O(n) clustering.
 * - Point lights use limited distance to avoid lighting the whole scene.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CUBE_MATERIALS, getMaterialValue } from "../config/cubeMaterials.ts";
import type { PlacedCubeEntity } from "../ecs/types.ts";
import { placedCubes } from "../ecs/world.ts";

// --- Cluster types ---

export interface StockpileCluster {
	/** World-space centroid of the cluster */
	center: THREE.Vector3;
	/** Sum of all cube material values in this cluster */
	totalValue: number;
	/** Number of cubes in this cluster */
	cubeCount: number;
	/** Material breakdown: materialId -> count */
	materialCounts: Map<string, number>;
	/** Dominant material ID (most cubes) */
	dominantMaterial: string;
	/** Computed glow color (from dominant material) */
	glowColor: THREE.Color;
	/** Computed glow intensity (scales with value and count) */
	intensity: number;
}

// --- Module-level cluster cache ---

const GRID_CELL_SIZE = 4;

let cachedClusters: StockpileCluster[] = [];
let cachedCubeCount = -1;

function cellKey(x: number, z: number): string {
	const cx = Math.floor(x / GRID_CELL_SIZE);
	const cz = Math.floor(z / GRID_CELL_SIZE);
	return `${cx},${cz}`;
}

/**
 * Recompute clusters from current placed cubes.
 * Uses grid-based spatial hashing: cubes in the same or adjacent cells
 * are merged into one cluster via flood-fill over the grid.
 */
function recomputeClusters(): StockpileCluster[] {
	const cubes = Array.from(placedCubes) as PlacedCubeEntity[];
	if (cubes.length === 0) return [];

	// Group cubes by grid cell
	const cellMap = new Map<string, PlacedCubeEntity[]>();
	for (const cube of cubes) {
		const key = cellKey(cube.worldPosition.x, cube.worldPosition.z);
		let arr = cellMap.get(key);
		if (!arr) {
			arr = [];
			cellMap.set(key, arr);
		}
		arr.push(cube);
	}

	// Flood-fill adjacent cells to form clusters
	const visited = new Set<string>();
	const clusters: StockpileCluster[] = [];

	for (const startKey of cellMap.keys()) {
		if (visited.has(startKey)) continue;

		const clusterCubes: PlacedCubeEntity[] = [];
		const queue = [startKey];
		visited.add(startKey);

		while (queue.length > 0) {
			const key = queue.pop()!;
			const cellCubes = cellMap.get(key);
			if (cellCubes) {
				clusterCubes.push(...cellCubes);
			}

			// Check 8 neighbors + self (already visited)
			const parts = key.split(",");
			const cx = Number(parts[0]);
			const cz = Number(parts[1]);
			for (let dx = -1; dx <= 1; dx++) {
				for (let dz = -1; dz <= 1; dz++) {
					if (dx === 0 && dz === 0) continue;
					const neighborKey = `${cx + dx},${cz + dz}`;
					if (!visited.has(neighborKey) && cellMap.has(neighborKey)) {
						visited.add(neighborKey);
						queue.push(neighborKey);
					}
				}
			}
		}

		if (clusterCubes.length === 0) continue;

		// Compute cluster properties
		let sumX = 0;
		let sumY = 0;
		let sumZ = 0;
		let totalValue = 0;
		const materialCounts = new Map<string, number>();

		for (const cube of clusterCubes) {
			sumX += cube.worldPosition.x;
			sumY += cube.worldPosition.y;
			sumZ += cube.worldPosition.z;

			const matId = cube.placedCube.materialId;
			totalValue += getMaterialValue(matId);
			materialCounts.set(matId, (materialCounts.get(matId) ?? 0) + 1);
		}

		const count = clusterCubes.length;
		const center = new THREE.Vector3(sumX / count, sumY / count, sumZ / count);

		// Find dominant material
		let dominantMaterial = "iron";
		let maxCount = 0;
		for (const [matId, matCount] of materialCounts) {
			if (matCount > maxCount) {
				maxCount = matCount;
				dominantMaterial = matId;
			}
		}

		// Glow color from dominant material
		const matDef = CUBE_MATERIALS[dominantMaterial];
		const glowColor = new THREE.Color(matDef?.glowColor ?? 0xffffff);

		// Intensity scales with sqrt of total value (diminishing returns for huge piles)
		// Range: ~0.3 for a single iron cube to ~3.0 for a large valuable stockpile
		const intensity = Math.min(3.0, 0.3 + Math.sqrt(totalValue) * 0.15);

		clusters.push({
			center,
			totalValue,
			cubeCount: count,
			materialCounts,
			dominantMaterial,
			glowColor,
			intensity,
		});
	}

	return clusters;
}

/**
 * Get current stockpile clusters. Recomputes only when cube count changes.
 */
export function getStockpileClusters(): StockpileCluster[] {
	const currentCount = placedCubes.size;
	if (currentCount !== cachedCubeCount) {
		cachedCubeCount = currentCount;
		cachedClusters = recomputeClusters();
	}
	return cachedClusters;
}

/** Force a cluster recomputation (call when cubes are added/removed). */
export function invalidateStockpileClusters(): void {
	cachedCubeCount = -1;
}

// --- Rendering ---

/** Maximum number of cluster lights to render (performance budget) */
const MAX_CLUSTER_LIGHTS = 16;

function ClusterGlow({ cluster }: { cluster: StockpileCluster }) {
	const lightRef = useRef<THREE.PointLight>(null);
	const discRef = useRef<THREE.Mesh>(null);

	// Pulse animation phase — use center position as seed for variety
	const phase = useMemo(
		() => cluster.center.x * 3.7 + cluster.center.z * 7.3,
		[cluster.center.x, cluster.center.z],
	);

	useFrame(({ clock }) => {
		const t = clock.getElapsedTime();
		// Gentle breathing pulse: 80%-100% of base intensity
		const pulse = 0.9 + 0.1 * Math.sin(t * 1.5 + phase);
		const currentIntensity = cluster.intensity * pulse;

		if (lightRef.current) {
			lightRef.current.intensity = currentIntensity;
			lightRef.current.position.set(
				cluster.center.x,
				cluster.center.y + 1.5,
				cluster.center.z,
			);
		}

		if (discRef.current) {
			discRef.current.position.set(
				cluster.center.x,
				cluster.center.y + 0.05,
				cluster.center.z,
			);
			const mat = discRef.current.material as THREE.MeshBasicMaterial;
			mat.opacity = Math.min(0.4, currentIntensity * 0.12);
		}
	});

	// Disc radius scales with cube count
	const discRadius = Math.min(4, 1.0 + Math.sqrt(cluster.cubeCount) * 0.5);

	return (
		<>
			<pointLight
				ref={lightRef}
				color={cluster.glowColor}
				intensity={cluster.intensity}
				distance={8 + cluster.cubeCount * 0.5}
				decay={2}
				position={[
					cluster.center.x,
					cluster.center.y + 1.5,
					cluster.center.z,
				]}
			/>
			<mesh
				ref={discRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[
					cluster.center.x,
					cluster.center.y + 0.05,
					cluster.center.z,
				]}
			>
				<circleGeometry args={[discRadius, 24]} />
				<meshBasicMaterial
					color={cluster.glowColor}
					transparent
					opacity={0.15}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
		</>
	);
}

/**
 * Renders glow effects beneath stockpile clusters.
 * Queries placed cubes, clusters them by proximity, and renders
 * a point light + emissive disc per cluster.
 */
export function StockpileGlow() {
	const clustersRef = useRef<StockpileCluster[]>([]);

	// Refresh clusters every frame (the getter is cached, so this is cheap)
	useFrame(() => {
		clustersRef.current = getStockpileClusters();
	});

	// For initial render and React reconciliation, compute clusters synchronously
	const initialClusters = useMemo(() => getStockpileClusters(), []);

	// Use the most recent clusters for rendering
	const clusters = clustersRef.current.length > 0
		? clustersRef.current
		: initialClusters;

	// Limit rendered clusters for performance
	const visibleClusters = clusters.slice(0, MAX_CLUSTER_LIGHTS);

	if (visibleClusters.length === 0) return null;

	return (
		<>
			{visibleClusters.map((cluster, i) => (
				<ClusterGlow
					key={`stockpile-glow-${i}-${cluster.center.x.toFixed(1)}-${cluster.center.z.toFixed(1)}`}
					cluster={cluster}
				/>
			))}
		</>
	);
}
