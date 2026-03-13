/**
 * ConstructionRenderer — visual overlay for buildings under construction.
 *
 * Reads from constructionVisualization.ts to render staged construction:
 *   - Foundation: wireframe footprint on ground, low opacity
 *   - Shell: partial walls rising (scaleY from 0 to 0.6), translucent
 *   - Interior: nearly full structure (scaleY 0.85), more opaque
 *   - Operational: full scale, emissive glow pulse (handled by BuildingMesh)
 *
 * Also renders a floating progress bar above each construction site.
 * Emits construction_stage particles on stage transitions.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import {
	type BuildingConstructionState,
	type ConstructionStageId,
	getAllConstructionStates,
	getConstructionProgress,
	STAGE_VISUAL_CONFIG,
} from "../systems/constructionVisualization";
import { Identity, WorldPosition, Building } from "../ecs/traits";
import { buildings } from "../ecs/world";
import { pushEffect } from "./particles/effectEvents";

const BAR_WIDTH = 1.4;
const BAR_HEIGHT = 0.08;
const BAR_Y_OFFSET = 2.5;

const BG_COLOR = new THREE.Color(0x1a1a1a);
const FILL_COLOR = new THREE.Color(0xf6c56a);

interface ConstructionVisual {
	entityId: string;
	stage: ConstructionStageId;
	progress: number;
	x: number;
	y: number;
	z: number;
}

function findBuildingPosition(
	entityId: string,
): { x: number; y: number; z: number } | null {
	for (const bldg of buildings) {
		if (bldg.get(Identity)?.id === entityId) {
			const pos = bldg.get(WorldPosition);
			if (pos) return { x: pos.x, y: pos.y, z: pos.z };
		}
	}
	return null;
}

const STAGE_SCALE_Y: Record<ConstructionStageId, number> = {
	foundation: 0.15,
	shell: 0.5,
	interior: 0.8,
	operational: 1.0,
};

const STAGE_COLOR: Record<ConstructionStageId, number> = {
	foundation: 0x4a6670,
	shell: 0x5a7a8a,
	interior: 0x7a9aaa,
	operational: 0xffffff,
};

function ConstructionOverlay({ visual }: { visual: ConstructionVisual }) {
	const groupRef = useRef<THREE.Group>(null);
	const matRef = useRef<THREE.MeshStandardMaterial>(null);

	const config = STAGE_VISUAL_CONFIG[visual.stage];
	const targetScaleY = STAGE_SCALE_Y[visual.stage];
	const color = STAGE_COLOR[visual.stage];

	useFrame(({ clock }) => {
		if (!groupRef.current) return;

		// Animate scale Y toward target
		const currentY = groupRef.current.scale.y;
		const newY = currentY + (targetScaleY - currentY) * 0.05;
		groupRef.current.scale.y = newY;

		if (matRef.current) {
			// Pulse emissive during construction
			matRef.current.emissiveIntensity =
				config.emissiveIntensity +
				0.05 * Math.sin(clock.elapsedTime * 3);
			matRef.current.opacity = config.opacity;
		}
	});

	const fillWidth = BAR_WIDTH * Math.max(0.01, visual.progress);

	return (
		<group position={[visual.x, visual.y, visual.z]}>
			{/* Construction ghost overlay */}
			<group ref={groupRef} scale={[1, targetScaleY, 1]}>
				<mesh position={[0, 0.8, 0]}>
					<boxGeometry args={[1.6, 1.6, 1.6]} />
					<meshStandardMaterial
						ref={matRef}
						color={color}
						emissive={0xf6c56a}
						emissiveIntensity={config.emissiveIntensity}
						transparent
						opacity={config.opacity}
						wireframe={config.wireframe}
						side={THREE.DoubleSide}
						depthWrite={false}
					/>
				</mesh>
			</group>

			{/* Progress bar */}
			<group position={[0, BAR_Y_OFFSET, 0]}>
				<mesh>
					<planeGeometry args={[BAR_WIDTH, BAR_HEIGHT]} />
					<meshBasicMaterial
						color={BG_COLOR}
						transparent
						opacity={0.7}
						side={THREE.DoubleSide}
					/>
				</mesh>
				<mesh position={[(fillWidth - BAR_WIDTH) / 2, 0, 0.001]}>
					<planeGeometry args={[fillWidth, BAR_HEIGHT * 0.8]} />
					<meshBasicMaterial
						color={FILL_COLOR}
						transparent
						opacity={0.9}
						side={THREE.DoubleSide}
					/>
				</mesh>
			</group>
		</group>
	);
}

export function ConstructionRenderer() {
	const [visuals, setVisuals] = useState<ConstructionVisual[]>([]);
	const prevStagesRef = useRef<Map<string, ConstructionStageId>>(new Map());

	useFrame(() => {
		const states = getAllConstructionStates();
		const newVisuals: ConstructionVisual[] = [];
		const currentStages = new Map<string, ConstructionStageId>();

		for (const state of states) {
			const pos = findBuildingPosition(state.entityId);
			if (!pos) continue;

			currentStages.set(state.entityId, state.currentStage);

			// Detect stage transitions for particle effects
			const prevStage = prevStagesRef.current.get(state.entityId);
			if (prevStage && prevStage !== state.currentStage) {
				pushEffect({
					type: "construction_stage",
					x: pos.x,
					y: pos.y,
					z: pos.z,
					intensity: 0.7,
				});
			}

			newVisuals.push({
				entityId: state.entityId,
				stage: state.currentStage,
				progress: getConstructionProgress(state.entityId),
				x: pos.x,
				y: pos.y,
				z: pos.z,
			});
		}

		prevStagesRef.current = currentStages;
		setVisuals(newVisuals);
	});

	if (visuals.length === 0) return null;

	return (
		<>
			{visuals.map((visual) => (
				<ConstructionOverlay
					key={`construction-${visual.entityId}`}
					visual={visual}
				/>
			))}
		</>
	);
}
