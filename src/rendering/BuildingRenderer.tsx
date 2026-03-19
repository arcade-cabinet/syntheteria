/**
 * BuildingRenderer — renders faction buildings + cult structures as GLB models.
 *
 * Uses drei useGLTF + Clone — proper R3F declarative pattern.
 * Fog of war gated — only renders on explored tiles.
 */

import { Clone, Sparkles, useGLTF } from "@react-three/drei";
import type { World } from "koota";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import { Building, type BuildingType } from "../ecs/traits/building";
import { CultStructure, type CultStructureType } from "../ecs/traits/cult";
import { getAllBuildingModelUrls, resolveBuildingModelUrl } from "./modelPaths";
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
}: {
	url: string;
	tileX: number;
	tileZ: number;
	sparkle: SparkleStyle;
}) {
	const { scene } = useGLTF(url);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const maxExtent = Math.max(size.x, size.y, size.z);
		const s = maxExtent > 0 ? (TILE_SIZE_M * 0.9) / maxExtent : 1;
		return { scale: s, yOffset: -box.min.y * s };
	}, [scene]);

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

// ─── Main renderer ───────────────────────────────────────────────────────────

type BuildingRendererProps = {
	world: World;
};

export function BuildingRenderer({ world }: BuildingRendererProps) {
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
		<>
			{instances.map((inst) => (
				<Suspense key={`${inst.tileX},${inst.tileZ}`} fallback={null}>
					<BuildingModel
						url={inst.url}
						tileX={inst.tileX}
						tileZ={inst.tileZ}
						sparkle={inst.sparkle}
					/>
				</Suspense>
			))}
		</>
	);
}
