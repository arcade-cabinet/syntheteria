/**
 * BuildingRenderer — renders faction buildings + cult structures as GLB models.
 *
 * Uses drei useGLTF + Clone — proper R3F declarative pattern.
 * Fog of war gated — only renders on explored tiles.
 */

import { Clone, Sparkles, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { type ReactNode, Suspense, useMemo, useRef } from "react";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import { Building, type BuildingType } from "../ecs/traits/building";
import { CultStructure, type CultStructureType } from "../ecs/traits/cult";
import { getAllBuildingModelUrls, resolveBuildingModelUrl } from "./modelPaths";
import { sphereModelPlacement } from "./spherePlacement";
import { buildExploredSet, isTileExplored } from "./tileVisibility";

// Preload all building + cult models
for (const url of getAllBuildingModelUrls()) {
	useGLTF.preload(url);
}

// ─── Sparkle configs per building/structure type ─────────────────────────────

type SparkleStyle = "amber" | "red" | null;

function getSparkleStyle(
	buildingType?: BuildingType,
	cultType?: CultStructureType,
): SparkleStyle {
	if (buildingType === "storm_transmitter") return "amber";
	if (cultType === "breach_altar") return "red";
	return null;
}

const SPARKLE_CONFIG = {
	amber: { color: "#f6a623", count: 30, size: 3, speed: 1.2 },
	red: { color: "#cc2222", count: 25, size: 3.5, speed: 0.8 },
} as const;

// ─── Single building model ───────────────────────────────────────────────────

function BuildingModel({
	url,
	tileX,
	tileZ,
	sparkle,
	useSphere,
	boardWidth,
	boardHeight,
}: {
	url: string;
	tileX: number;
	tileZ: number;
	sparkle: SparkleStyle;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
}) {
	const { scene } = useGLTF(url);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const maxExtent = Math.max(size.x, size.y, size.z);
		const s = maxExtent > 0 ? (TILE_SIZE_M * 0.9) / maxExtent : 1;
		return { scale: s, yOffset: -box.min.y * s };
	}, [scene]);

	if (useSphere && boardWidth && boardHeight) {
		const sp = sphereModelPlacement(tileX, tileZ, boardWidth, boardHeight, yOffset);
		const sparklePos: [number, number, number] = sphereModelPlacement(tileX, tileZ, boardWidth, boardHeight, yOffset + TILE_SIZE_M * 0.5).position;
		return (
			<>
				<Clone
					object={scene}
					position={sp.position}
					quaternion={sp.quaternion}
					scale={scale}
					castShadow
					receiveShadow
				/>
				{sparkle && (
					<Sparkles
						count={SPARKLE_CONFIG[sparkle].count}
						scale={[TILE_SIZE_M * 0.8, TILE_SIZE_M * 1.2, TILE_SIZE_M * 0.8]}
						position={sparklePos}
						size={SPARKLE_CONFIG[sparkle].size}
						speed={SPARKLE_CONFIG[sparkle].speed}
						color={SPARKLE_CONFIG[sparkle].color}
						opacity={0.8}
					/>
				)}
			</>
		);
	}

	const worldX = tileX * TILE_SIZE_M;
	const worldZ = tileZ * TILE_SIZE_M;

	return (
		<>
			<Clone
				object={scene}
				position={[worldX, yOffset, worldZ]}
				scale={scale}
				castShadow
				receiveShadow
			/>
			{sparkle && (
				<Sparkles
					count={SPARKLE_CONFIG[sparkle].count}
					scale={[TILE_SIZE_M * 0.8, TILE_SIZE_M * 1.2, TILE_SIZE_M * 0.8]}
					position={[worldX, yOffset + TILE_SIZE_M * 0.5, worldZ]}
					size={SPARKLE_CONFIG[sparkle].size}
					speed={SPARKLE_CONFIG[sparkle].speed}
					color={SPARKLE_CONFIG[sparkle].color}
					opacity={0.8}
				/>
			)}
		</>
	);
}

// ─── Distance culling ─────────────────────────────────────────────────────────

/** Camera distance beyond which building models are hidden to save GPU. */
const BUILDING_CULL_DISTANCE = 70;

function BuildingCullGroup({ children }: { children: ReactNode }) {
	const groupRef = useRef<THREE.Group>(null);
	const camera = useThree((s) => s.camera);

	useFrame(() => {
		if (!groupRef.current) return;
		groupRef.current.visible = camera.position.length() < BUILDING_CULL_DISTANCE;
	});

	return <group ref={groupRef}>{children}</group>;
}

// ─── Main renderer ───────────────────────────────────────────────────────────

type BuildingRendererProps = {
	world: World;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
};

export function BuildingRenderer({ world, useSphere, boardWidth, boardHeight }: BuildingRendererProps) {
	const instances = useMemo(() => {
		const explored = buildExploredSet(world);
		const result: Array<{
			url: string;
			tileX: number;
			tileZ: number;
			sparkle: SparkleStyle;
		}> = [];

		for (const entity of world.query(Building)) {
			const b = entity.get(Building);
			if (!b || !b.modelId) continue;
			if (!isTileExplored(explored, b.tileX, b.tileZ)) continue;
			const url = resolveBuildingModelUrl(b.modelId);
			if (!url) continue;
			result.push({
				url,
				tileX: b.tileX,
				tileZ: b.tileZ,
				sparkle: getSparkleStyle(b.buildingType as BuildingType),
			});
		}

		for (const entity of world.query(CultStructure)) {
			const cs = entity.get(CultStructure);
			if (!cs || !cs.modelId) continue;
			if (!isTileExplored(explored, cs.tileX, cs.tileZ)) continue;
			const url = resolveBuildingModelUrl(cs.modelId);
			if (!url) continue;
			result.push({
				url,
				tileX: cs.tileX,
				tileZ: cs.tileZ,
				sparkle: getSparkleStyle(
					undefined,
					cs.structureType as CultStructureType,
				),
			});
		}

		return result;
	}, [world]);

	return (
		<BuildingCullGroup>
			{instances.map((inst) => (
				<ModelErrorBoundary key={`${inst.tileX},${inst.tileZ}`} name={inst.url}>
					<Suspense fallback={null}>
						<BuildingModel
							url={inst.url}
							tileX={inst.tileX}
							tileZ={inst.tileZ}
							sparkle={inst.sparkle}
							useSphere={useSphere}
							boardWidth={boardWidth}
							boardHeight={boardHeight}
						/>
					</Suspense>
				</ModelErrorBoundary>
			))}
		</BuildingCullGroup>
	);
}
