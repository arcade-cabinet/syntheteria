/**
 * HarvestVisualRenderer — visual effects for active harvesting.
 *
 * When a bot is actively harvesting a structure:
 *   - The harvesting bot pulses/rotates slightly (handled by UnitRenderer via useFrame)
 *   - The target structure shows dissolve particles (amber sparks rising)
 *   - On completion: material cubes float up and dissipate
 *
 * Reads from getActiveHarvests() and pushes particle effects via effectEvents.
 * This renderer emits harvest_tick particles each frame for active harvests,
 * and harvest_complete bursts when a harvest finishes.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import {
	getActiveHarvests,
	type ActiveHarvest,
} from "../systems/harvestSystem";
import { pushEffect } from "./particles/effectEvents";

/** How often to emit dissolve particles (every N frames) */
const PARTICLE_EMIT_INTERVAL = 8;

/** Track which harvests we've seen to detect completions */
const knownHarvests = new Map<number, ActiveHarvest>();

export function HarvestVisualRenderer() {
	const frameCountRef = useRef(0);

	useFrame(() => {
		frameCountRef.current++;
		const harvests = getActiveHarvests();

		// Detect completed harvests (were known, now gone)
		for (const [structureId, prev] of knownHarvests) {
			const stillActive = harvests.some(
				(h) => h.structureId === structureId,
			);
			if (!stillActive) {
				// Harvest completed — emit completion burst
				pushEffect({
					type: "harvest_complete",
					x: prev.targetX,
					y: 0,
					z: prev.targetZ,
					intensity: 1.0,
				});
				knownHarvests.delete(structureId);
			}
		}

		// Emit dissolve particles for active harvests
		if (frameCountRef.current % PARTICLE_EMIT_INTERVAL === 0) {
			for (const harvest of harvests) {
				knownHarvests.set(harvest.structureId, { ...harvest });

				pushEffect({
					type: "harvest_tick",
					x: harvest.targetX,
					y: 0,
					z: harvest.targetZ,
					intensity:
						1 - harvest.ticksRemaining / harvest.totalTicks,
				});
			}
		}

		// Update known harvests
		for (const harvest of harvests) {
			knownHarvests.set(harvest.structureId, { ...harvest });
		}
	});

	// This renderer only pushes particle events — no JSX to render
	return null;
}
