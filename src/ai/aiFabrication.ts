/**
 * AI fabrication subsystem -- queues units at idle motor pools.
 *
 * Uses pickAITrack to select the best robot specialization track
 * based on faction personality and researched techs.
 */

import type { World } from "koota";
import { type RobotClass, TRACK_REGISTRY } from "../robots";
import { getResearchState, queueFabrication } from "../systems";
import {
	BotFabricator,
	Building,
	Faction,
	Powered,
	ResourcePool,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../traits";
import { isCultFactionId } from "./aiHelpers";
import { pickAITrack, pickAITrackVersion } from "./trackSelection";

// ---------------------------------------------------------------------------
// Fabrication priority
// ---------------------------------------------------------------------------

/**
 * Compute fabrication priority based on current faction composition.
 * Workers and scouts come first if count is low, then military units.
 */
export function computeFabPriority(
	world: World,
	factionId: string,
): RobotClass[] {
	// Count existing units by class
	const counts: Record<string, number> = {
		worker: 0,
		scout: 0,
		infantry: 0,
		cavalry: 0,
		ranged: 0,
		support: 0,
	};
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const f = e.get(UnitFaction);
		const v = e.get(UnitStats);
		if (!f || f.factionId !== factionId || !v) continue;
		// Determine class from attack/defense/scanRange
		// Workers have 0 attack, scouts have high scanRange
		if (v.attack === 0) counts.worker++;
		else if (v.scanRange >= 6) counts.scout++;
		else if (v.mp >= 4) counts.cavalry++;
		else if (v.attackRange >= 2 || v.attack >= 4) counts.ranged++;
		else if (v.attack >= 2) counts.infantry++;
		else counts.support++;
	}

	const priority: RobotClass[] = [];

	// Workers first if < 2
	if (counts.worker < 2) priority.push("worker");
	// Scouts if < 2
	if (counts.scout < 2) priority.push("scout");
	// Then military
	priority.push("infantry", "cavalry", "ranged", "support");
	// Finally workers/scouts if already have enough
	if (counts.worker >= 2) priority.push("worker");
	if (counts.scout >= 2) priority.push("scout");

	return priority;
}

// ---------------------------------------------------------------------------
// Fabrication execution
// ---------------------------------------------------------------------------

/**
 * For each AI faction, find powered motor pools with open slots and queue
 * units. NEVER leave a motor pool idle when resources are available.
 * Fills ALL available slots aggressively — no per-pool cap when resources
 * are sufficient.
 */
export function runAiFabrication(world: World, factionIds: string[]): void {
	// Build gate and v2 tech maps from the track registry
	const gateTechIds = new Map<string, string>();
	const v2TechIds = new Map<string, string>();
	for (const [trackId, entry] of TRACK_REGISTRY) {
		gateTechIds.set(trackId, entry.gateTechId);
		if (entry.v2TechId) v2TechIds.set(trackId, entry.v2TechId);
	}

	for (const factionId of factionIds) {
		if (factionId === "player") continue;
		if (isCultFactionId(factionId)) continue;

		// Get researched techs for this faction
		const researchState = getResearchState(world, factionId);
		const researched = new Set(researchState?.researchedTechs ?? []);

		// Dynamic priority based on current composition
		const fabPriority = computeFabPriority(world, factionId);

		// Sum total resources for this faction to determine aggression level
		let totalResources = 0;
		for (const e of world.query(Faction, ResourcePool)) {
			const f = e.get(Faction);
			if (f?.id !== factionId) continue;
			const r = e.get(ResourcePool);
			if (!r) continue;
			for (const val of Object.values(r as Record<string, number>)) {
				if (typeof val === "number") totalResources += val;
			}
		}

		// When resources > 100, fill all slots; otherwise limit to 1 per pool
		const aggressive = totalResources > 100;

		// Find powered motor pools with open slots
		for (const e of world.query(Building, BotFabricator, Powered)) {
			const b = e.get(Building);
			const fab = e.get(BotFabricator);
			if (!b || !fab || b.factionId !== factionId) continue;

			const maxSlots = aggressive
				? fab.fabricationSlots - fab.queueSize
				: Math.min(1, fab.fabricationSlots - fab.queueSize);
			let openSlots = maxSlots;
			while (openSlots > 0) {
				let queued = false;
				for (const robotClass of fabPriority) {
					const trackId = pickAITrack(
						factionId,
						robotClass,
						researched,
						gateTechIds,
					);
					const trackVersion = pickAITrackVersion(
						trackId,
						researched,
						v2TechIds,
					);

					const result = queueFabrication(
						world,
						e,
						robotClass,
						trackId,
						trackVersion,
					);
					if (result.ok) {
						queued = true;
						openSlots--;
						break;
					}
					if (result.ok === false && result.reason === "cannot_afford")
						continue;
					if (result.ok === false && result.reason === "pop_cap") {
						openSlots = 0;
						break;
					}
					openSlots = 0;
					break;
				}
				if (!queued) break;
			}
		}
	}
}
