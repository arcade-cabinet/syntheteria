/**
 * Analytics Collector — snapshots ECS world state for DB persistence.
 *
 * Pure functions that read current world state and produce structured data
 * for the analytics DB tables (campaign_statistics, faction_resource_snapshots,
 * turn_snapshots). These are designed to be called at the end of each turn
 * by the persistence layer.
 *
 * No DB dependency — returns plain objects ready for JSON.stringify().
 */

import type { World } from "koota";
import type { FactionSnapshotData } from "../db/types";
import {
	Building,
	Faction,
	ResourcePool,
	UnitFaction,
	UnitStats,
} from "../traits";
import type { CampaignStats } from "./campaignStats";
import { serializeCampaignStats } from "./campaignStats";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TurnSnapshotData {
	factions: FactionSnapshotData[];
}

export interface FactionResourceData {
	factionId: string;
	resources: Record<string, number>;
}

// ─── Resource Materials ─────────────────────────────────────────────────────

const RESOURCE_KEYS = [
	"ferrous_scrap",
	"alloy_stock",
	"polymer_salvage",
	"conductor_wire",
	"electrolyte",
	"silicon_wafer",
	"storm_charge",
	"el_crystal",
	"scrap_metal",
	"e_waste",
	"intact_components",
	"thermal_fluid",
	"depth_salvage",
] as const;

// ─── Collectors ─────────────────────────────────────────────────────────────

/**
 * Collect current campaign statistics (serialized from module-level state).
 */
export function collectCampaignStats(): CampaignStats {
	return serializeCampaignStats();
}

/**
 * Collect per-faction resource snapshots from the ECS world.
 */
export function collectFactionResources(world: World): FactionResourceData[] {
	const result: FactionResourceData[] = [];

	for (const e of world.query(Faction, ResourcePool)) {
		const f = e.get(Faction);
		const pool = e.get(ResourcePool);
		if (!f?.id || !pool) continue;

		const resources: Record<string, number> = {};
		for (const key of RESOURCE_KEYS) {
			const val = pool[key];
			if (val > 0) resources[key] = val;
		}

		result.push({ factionId: f.id, resources });
	}

	return result;
}

/**
 * Collect a per-faction turn snapshot: unit counts, building counts,
 * territory percentage, and resource totals.
 */
export function collectTurnSnapshot(
	world: World,
	totalTiles: number,
): TurnSnapshotData {
	// Count units per faction
	const unitCounts = new Map<string, number>();
	for (const e of world.query(UnitStats, UnitFaction)) {
		const uf = e.get(UnitFaction);
		if (!uf?.factionId) continue;
		unitCounts.set(uf.factionId, (unitCounts.get(uf.factionId) ?? 0) + 1);
	}

	// Count buildings per faction
	const buildingCounts = new Map<string, number>();
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b?.factionId) continue;
		buildingCounts.set(b.factionId, (buildingCounts.get(b.factionId) ?? 0) + 1);
	}

	// Build faction snapshots
	const factions: FactionSnapshotData[] = [];

	for (const e of world.query(Faction, ResourcePool)) {
		const f = e.get(Faction);
		const pool = e.get(ResourcePool);
		if (!f?.id || !pool) continue;

		const resourceTotals: Record<string, number> = {};
		let _total = 0;
		for (const key of RESOURCE_KEYS) {
			const val = pool[key];
			if (val > 0) {
				resourceTotals[key] = val;
				_total += val;
			}
		}

		const buildingCount = buildingCounts.get(f.id) ?? 0;
		// Territory % approximated from building count relative to total tiles
		const territoryPercent =
			totalTiles > 0
				? Math.round((buildingCount / totalTiles) * 100 * 100) / 100
				: 0;

		factions.push({
			factionId: f.id,
			unitCount: unitCounts.get(f.id) ?? 0,
			buildingCount,
			territoryPercent,
			resourceTotals,
		});
	}

	return { factions };
}
