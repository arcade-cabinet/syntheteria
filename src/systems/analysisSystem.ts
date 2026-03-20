/**
 * Analysis system — Analysis Nodes accelerate nearby building upgrades.
 * Replaces the old research point accumulation system.
 *
 * Each powered Analysis Node reduces upgrade turnsRemaining by an
 * acceleration factor for buildings within its signal range.
 * Diminishing returns: first node = 25%, two = 40%, three+ = 50%.
 */
import type { World } from "koota";
import { Building, Powered, SignalNode } from "../traits";
import type { BuildingUpgradeJob } from "./buildingUpgradeSystem";
import { getBuildingUpgradeJob } from "./buildingUpgradeSystem";

function manhattan(x1: number, z1: number, x2: number, z2: number): number {
	return Math.abs(x1 - x2) + Math.abs(z1 - z2);
}

/**
 * Compute the acceleration factor from N analysis nodes.
 * 1 node = 0.25, 2 = 0.40, 3+ = 0.50 (diminishing returns).
 */
export function analysisAcceleration(nodeCount: number): number {
	if (nodeCount <= 0) return 0;
	if (nodeCount === 1) return 0.25;
	if (nodeCount === 2) return 0.4;
	return 0.5;
}

/**
 * Run analysis acceleration for all factions.
 * For each building with an active upgrade job, count powered Analysis Nodes
 * in range and apply a one-time per-turn reduction to turnsRemaining.
 */
export function runAnalysisAcceleration(world: World): void {
	const analysisNodes: Array<{
		tileX: number;
		tileZ: number;
		range: number;
		factionId: string;
	}> = [];
	for (const e of world.query(Building, Powered, SignalNode)) {
		const b = e.get(Building);
		if (!b || b.buildingType !== "analysis_node") continue;
		const sig = e.get(SignalNode);
		if (!sig) continue;
		analysisNodes.push({
			tileX: b.tileX,
			tileZ: b.tileZ,
			range: sig.range,
			factionId: b.factionId,
		});
	}

	if (analysisNodes.length === 0) return;

	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b) continue;

		const job: BuildingUpgradeJob | null = getBuildingUpgradeJob(e.id());
		if (!job || job.turnsRemaining <= 1) continue;

		let nodeCount = 0;
		for (const node of analysisNodes) {
			if (node.factionId !== b.factionId) continue;
			if (manhattan(b.tileX, b.tileZ, node.tileX, node.tileZ) <= node.range) {
				nodeCount++;
			}
		}

		if (nodeCount > 0) {
			const accel = analysisAcceleration(nodeCount);
			const reduction = Math.max(1, Math.floor(job.turnsRemaining * accel));
			job.turnsRemaining = Math.max(1, job.turnsRemaining - reduction);
		}
	}
}
