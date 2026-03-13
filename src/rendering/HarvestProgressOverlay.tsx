/**
 * HarvestProgressOverlay — world-space progress bars above harvested structures.
 *
 * Renders a billboard progress bar above each actively-harvested structure.
 * Uses brand amber color for the bar fill (harvest = infrastructure/fabrication).
 * Reads from getActiveHarvests() each frame.
 */

import { useSyncExternalStore } from "react";
import * as THREE from "three";
import { getSnapshot, subscribe } from "../ecs/gameState";
import {
	type ActiveHarvest,
	getActiveHarvests,
} from "../systems/harvestSystem";

const BAR_WIDTH = 1.2;
const BAR_HEIGHT = 0.1;
const BAR_Y_OFFSET = 2.2;

const BG_COLOR = new THREE.Color(0x1a1a1a);
const FILL_COLOR = new THREE.Color(0xf6c56a); // Brand amber

function HarvestBar({ harvest }: { harvest: ActiveHarvest }) {
	const progress = 1 - harvest.ticksRemaining / harvest.totalTicks;
	const fillWidth = BAR_WIDTH * Math.max(0.01, progress);

	return (
		<group position={[harvest.targetX, BAR_Y_OFFSET, harvest.targetZ]}>
			{/* Billboard rotation handled by lookAt in useFrame — simplified: always face up */}
			{/* Background bar */}
			<mesh position={[0, 0, 0]}>
				<planeGeometry args={[BAR_WIDTH, BAR_HEIGHT]} />
				<meshBasicMaterial
					color={BG_COLOR}
					transparent
					opacity={0.7}
					side={THREE.DoubleSide}
				/>
			</mesh>
			{/* Fill bar — aligned left */}
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
	);
}

export function HarvestProgressOverlay() {
	// Re-render on each game tick to track progress
	useSyncExternalStore(subscribe, getSnapshot);
	const harvests = getActiveHarvests();

	if (harvests.length === 0) return null;

	return (
		<>
			{harvests.map((harvest) => (
				<HarvestBar
					key={`harvest-${harvest.structureId}`}
					harvest={harvest}
				/>
			))}
		</>
	);
}
