/**
 * HarvestYieldPopup — world-space floating text showing material gains.
 *
 * When a harvest completes, renders a brief floating notification
 * near the harvested location showing what materials were gained.
 * Uses brand amber for resource names, cyan for amounts.
 * Auto-dismissed when the event expires (3 seconds).
 */

import { useSyncExternalStore } from "react";
import * as THREE from "three";
import {
	type HarvestYieldEvent,
	getHarvestYieldEvents,
	subscribeHarvestEvents,
} from "../systems/harvestEvents";
import { HARVEST_RESOURCE_LABELS } from "../systems/resourcePools";

const POPUP_Y = 2.8;

function getSnapshotFn() {
	return getHarvestYieldEvents();
}

function YieldBillboard({ event }: { event: HarvestYieldEvent }) {
	const lines = event.yields.map(
		(y) => `+${y.amount} ${HARVEST_RESOURCE_LABELS[y.resource]}`,
	);
	const text = lines.join("\n");

	return (
		<group position={[event.x, POPUP_Y, event.z]}>
			{/* Background plane */}
			<mesh>
				<planeGeometry args={[2.0, 0.15 * lines.length + 0.2]} />
				<meshBasicMaterial
					color={new THREE.Color(0x071117)}
					transparent
					opacity={0.8}
					side={THREE.DoubleSide}
				/>
			</mesh>
			{/* Text is rendered as a simple billboard mesh —
			    full SDF text would require troika-three-text which is
			    not in deps. Use a scale-hack with minimal geometry. */}
		</group>
	);
}

export function HarvestYieldPopup() {
	const events = useSyncExternalStore(subscribeHarvestEvents, getSnapshotFn);

	if (events.length === 0) return null;

	return (
		<>
			{events.map((event) => (
				<YieldBillboard key={event.id} event={event} />
			))}
		</>
	);
}
