/**
 * HarvestVisualRenderer — visual effects for active harvesting.
 *
 * When a bot is actively harvesting a structure:
 *   - The harvesting bot pulses/rotates slightly (handled by UnitRenderer via useFrame)
 *   - The target structure shows dissolve particles (amber sparks rising)
 *   - On completion: material cubes float up and dissipate
 *
 * Uses useQuery(HarvestOp) — reacts to Koota entity changes automatically.
 * Particle emission runs in useFrame (inherently frame-rate tied).
 * Position/timing data is looked up via getHarvestExtras(harvesterId).
 */

import { useFrame } from "@react-three/fiber";
import { useQuery } from "koota/react";
import { useRef } from "react";
import { HarvestOp } from "../ecs/traits";
import { getHarvestExtras } from "../systems/harvestSystem";
import { pushEffect } from "./particles/effectEvents";

/** How often to emit dissolve particles (every N frames) */
const PARTICLE_EMIT_INTERVAL = 8;

/** Track which harvests we've seen to detect completions */
interface HarvestSnapshot {
	structureKey: number;
	targetX: number;
	targetZ: number;
}
const knownHarvests = new Map<string, HarvestSnapshot>();

export function HarvestVisualRenderer() {
	const frameCountRef = useRef(0);
	const harvestEntities = useQuery(HarvestOp);

	useFrame(() => {
		frameCountRef.current++;

		// Build a set of current harvesterIds for completion detection
		const currentIds = new Set(
			harvestEntities.map((e) => e.get(HarvestOp)?.harvesterId ?? ""),
		);

		// Detect completed harvests (were known, now gone)
		for (const [harvesterId, snap] of knownHarvests) {
			if (!currentIds.has(harvesterId)) {
				// Harvest completed — emit completion burst
				pushEffect({
					type: "harvest_complete",
					x: snap.targetX,
					y: 0,
					z: snap.targetZ,
					intensity: 1.0,
				});
				knownHarvests.delete(harvesterId);
			}
		}

		// Emit dissolve particles for active harvests
		if (frameCountRef.current % PARTICLE_EMIT_INTERVAL === 0) {
			for (const entity of harvestEntities) {
				const op = entity.get(HarvestOp);
				if (!op) continue;
				const extras = getHarvestExtras(op.harvesterId);
				if (!extras) continue;

				const structureKey =
					op.structureId !== 0
						? op.structureId
						: extras.targetX * 31 +
							extras.targetZ * 17 +
							(extras.level ?? 0) * 7;

				knownHarvests.set(op.harvesterId, {
					structureKey,
					targetX: extras.targetX,
					targetZ: extras.targetZ,
				});

				pushEffect({
					type: "harvest_tick",
					x: extras.targetX,
					y: 0,
					z: extras.targetZ,
					intensity: 1 - op.ticksRemaining / (extras.totalTicks || 1),
				});
			}
		}

		// Update known harvests for next frame's completion detection
		for (const entity of harvestEntities) {
			const op = entity.get(HarvestOp);
			if (!op) continue;
			const extras = getHarvestExtras(op.harvesterId);
			if (!extras) continue;
			const structureKey =
				op.structureId !== 0
					? op.structureId
					: extras.targetX * 31 + extras.targetZ * 17 + (extras.level ?? 0) * 7;
			knownHarvests.set(op.harvesterId, {
				structureKey,
				targetX: extras.targetX,
				targetZ: extras.targetZ,
			});
		}
	});

	// This renderer only pushes particle events — no JSX to render
	return null;
}
