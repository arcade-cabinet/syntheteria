/**
 * SalvageRenderer — Layer 4: GLB models for harvestable salvage props.
 *
 * Uses drei useGLTF + Clone — proper R3F declarative pattern.
 * Each model type is preloaded. Instances are Clone'd per position.
 * Fog of war gated — only renders on explored tiles.
 */

import { Clone, Sparkles, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { type ReactNode, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../../board";
import { SalvageProp, type SalvageType } from "../../traits";
import { ModelErrorBoundary } from "../ModelErrorBoundary";
import { getAllSalvageModelUrls, resolveSalvageModelUrl } from "../../rendering";
import { sphereModelPlacement } from "../../rendering";
import { buildExploredSet, isTileExplored } from "../../rendering";

// Lazy preload to avoid circular dep at module init
let _salvagePreloaded = false;
function ensureSalvageModelsPreloaded() {
	if (_salvagePreloaded) return;
	_salvagePreloaded = true;
	for (const url of getAllSalvageModelUrls()) {
		useGLTF.preload(url);
	}
}

// ─── Single salvage model instance ───────────────────────────────────────────

function SalvageModel({
	url,
	tileX,
	tileZ,
	hasCyanSparkle,
	useSphere,
	boardWidth,
	boardHeight,
}: {
	url: string;
	tileX: number;
	tileZ: number;
	hasCyanSparkle: boolean;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
}) {
	const { scene } = useGLTF(url);

	const { scale, yOffset } = useMemo(() => {
		const box = new THREE.Box3().setFromObject(scene);
		const size = box.getSize(new THREE.Vector3());
		const maxExtent = Math.max(size.x, size.y, size.z);
		const s = maxExtent > 0 ? (TILE_SIZE_M * 0.8) / maxExtent : 1;
		return { scale: s, yOffset: -box.min.y * s };
	}, [scene]);

	if (useSphere && boardWidth && boardHeight) {
		const sp = sphereModelPlacement(
			tileX,
			tileZ,
			boardWidth,
			boardHeight,
			yOffset,
		);
		const sparklePos: [number, number, number] = sphereModelPlacement(
			tileX,
			tileZ,
			boardWidth,
			boardHeight,
			yOffset + TILE_SIZE_M * 0.3,
		).position;
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
				{hasCyanSparkle && (
					<Sparkles
						count={20}
						scale={[TILE_SIZE_M * 0.6, TILE_SIZE_M * 0.8, TILE_SIZE_M * 0.6]}
						position={sparklePos}
						size={2.5}
						speed={0.4}
						color="#44ddff"
						opacity={0.7}
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
			{hasCyanSparkle && (
				<Sparkles
					count={20}
					scale={[TILE_SIZE_M * 0.6, TILE_SIZE_M * 0.8, TILE_SIZE_M * 0.6]}
					position={[worldX, yOffset + TILE_SIZE_M * 0.3, worldZ]}
					size={2.5}
					speed={0.4}
					color="#44ddff"
					opacity={0.7}
				/>
			)}
		</>
	);
}

// ─── Distance culling ─────────────────────────────────────────────────────────

/** Camera distance beyond which salvage models are hidden to save GPU. */
const SALVAGE_CULL_DISTANCE = 50;

function SalvageCullGroup({ children }: { children: ReactNode }) {
	const groupRef = useRef<THREE.Group>(null);
	const camera = useThree((s) => s.camera);

	useFrame(() => {
		if (!groupRef.current) return;
		groupRef.current.visible = camera.position.length() < SALVAGE_CULL_DISTANCE;
	});

	return <group ref={groupRef}>{children}</group>;
}

// ─── Main renderer ───────────────────────────────────────────────────────────

type SalvageRendererProps = {
	world: World;
	useSphere?: boolean;
	boardWidth?: number;
	boardHeight?: number;
};

export function SalvageRenderer({
	world,
	useSphere,
	boardWidth,
	boardHeight,
}: SalvageRendererProps) {
	ensureSalvageModelsPreloaded();
	const instances = useMemo(() => {
		const explored = buildExploredSet(world);
		const result: Array<{
			url: string;
			tileX: number;
			tileZ: number;
			hasCyanSparkle: boolean;
		}> = [];

		for (const entity of world.query(SalvageProp)) {
			const prop = entity.get(SalvageProp);
			if (!prop || prop.consumed) continue;
			if (!isTileExplored(explored, prop.tileX, prop.tileZ)) continue;

			const url = resolveSalvageModelUrl(prop.modelId);
			if (!url) continue;
			result.push({
				url,
				tileX: prop.tileX,
				tileZ: prop.tileZ,
				hasCyanSparkle: prop.salvageType === "power_cell",
			});
		}

		return result;
	}, [world]);

	return (
		<SalvageCullGroup>
			{instances.map((inst) => (
				<ModelErrorBoundary key={`${inst.tileX},${inst.tileZ}`} name={inst.url}>
					<Suspense fallback={null}>
						<SalvageModel
							url={inst.url}
							tileX={inst.tileX}
							tileZ={inst.tileZ}
							hasCyanSparkle={inst.hasCyanSparkle}
							useSphere={useSphere}
							boardWidth={boardWidth}
							boardHeight={boardHeight}
						/>
					</Suspense>
				</ModelErrorBoundary>
			))}
		</SalvageCullGroup>
	);
}
