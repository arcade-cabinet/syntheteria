/**
 * HarvestProgressOverlay — world-space progress bars above harvested structures.
 *
 * Renders a billboard progress bar above each actively-harvested structure.
 * Uses brand amber color for the bar fill (harvest = infrastructure/fabrication).
 *
 * Uses useQuery(HarvestOp) — reacts to Koota entity changes automatically.
 * Position/timing data is looked up via getHarvestExtras(harvesterId).
 */

import { useQuery } from "koota/react";
import * as THREE from "three";
import { HarvestOp } from "../ecs/traits";
import { getHarvestExtras } from "../systems/harvestSystem";

const BAR_WIDTH = 1.2;
const BAR_HEIGHT = 0.1;
const BAR_Y_OFFSET = 2.2;

const BG_COLOR = new THREE.Color(0x1a1a1a);
const FILL_COLOR = new THREE.Color(0xf6c56a); // Brand amber

function HarvestBar({
	harvesterId,
	ticksRemaining,
}: {
	harvesterId: string;
	ticksRemaining: number;
}) {
	const extras = getHarvestExtras(harvesterId);
	if (!extras) return null;

	const progress = 1 - ticksRemaining / extras.totalTicks;
	const fillWidth = BAR_WIDTH * Math.max(0.01, progress);

	return (
		<group position={[extras.targetX, BAR_Y_OFFSET, extras.targetZ]}>
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
	const harvestEntities = useQuery(HarvestOp);

	if (harvestEntities.length === 0) return null;

	return (
		<>
			{harvestEntities.map((entity) => {
				const op = entity.get(HarvestOp);
				if (!op) return null;
				return (
					<HarvestBar
						key={`harvest-${op.harvesterId}`}
						harvesterId={op.harvesterId}
						ticksRemaining={op.ticksRemaining}
					/>
				);
			})}
		</>
	);
}
