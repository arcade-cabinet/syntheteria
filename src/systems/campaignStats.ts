/**
 * Campaign Statistics Tracking
 *
 * Tracks persistent campaign-wide metrics that accumulate over the course
 * of a game session. Updated at the end of each turn or when relevant
 * events occur (harvest, combat, hacking, building).
 *
 * Displayed in the slide-out detail panel.
 *
 * Ported from pending/systems/campaignStats.ts — zero external deps.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CampaignStats {
	/** Total turns elapsed */
	turnsElapsed: number;
	/** Number of structures harvested for materials */
	structuresHarvested: number;
	/** Total materials gathered by type */
	materialsGathered: Record<string, number>;
	/** Cells discovered / total cells generated */
	cellsDiscovered: number;
	totalCells: number;
	/** Units fabricated during this campaign */
	unitsBuilt: number;
	/** Units destroyed/lost */
	unitsLost: number;
	/** Hostile units hacked/captured */
	unitsHacked: number;
	/** Structures built (lightning rods, fabricators, relays, etc.) */
	structuresBuilt: number;
	/** Cultist waves survived without total loss */
	cultistIncursionsSurvived: number;
	/** Total cultist units eliminated */
	cultistsDestroyed: number;
	/** Buildings lost to enemy attacks */
	buildingsDestroyed: number;
	/** Times hit by cultist lightning calls */
	lightningStrikesReceived: number;
	/** Total combat encounters */
	totalCombatEngagements: number;
	/** Largest territory held at any point (cells) */
	peakTerritorySize: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

let stats: CampaignStats = createDefaultStats();

/** Per-faction combat kill counter — survives individual unit death. */
let factionKills = new Map<string, number>();

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function createDefaultStats(): CampaignStats {
	return {
		turnsElapsed: 0,
		structuresHarvested: 0,
		materialsGathered: {},
		cellsDiscovered: 0,
		totalCells: 0,
		unitsBuilt: 0,
		unitsLost: 0,
		unitsHacked: 0,
		structuresBuilt: 0,
		cultistIncursionsSurvived: 0,
		cultistsDestroyed: 0,
		buildingsDestroyed: 0,
		lightningStrikesReceived: 0,
		totalCombatEngagements: 0,
		peakTerritorySize: 0,
	};
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getCampaignStats(): CampaignStats {
	return stats;
}

export function subscribeCampaignStats(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function recordTurnEnd() {
	stats = { ...stats, turnsElapsed: stats.turnsElapsed + 1 };
	notify();
}

export function recordStructureHarvested() {
	stats = {
		...stats,
		structuresHarvested: stats.structuresHarvested + 1,
	};
	notify();
}

export function recordMaterialGathered(type: string, amount: number) {
	const prev = stats.materialsGathered[type] ?? 0;
	stats = {
		...stats,
		materialsGathered: { ...stats.materialsGathered, [type]: prev + amount },
	};
	notify();
}

export function recordCellDiscovered(discovered: number, total: number) {
	stats = { ...stats, cellsDiscovered: discovered, totalCells: total };
	notify();
}

export function recordUnitBuilt() {
	stats = { ...stats, unitsBuilt: stats.unitsBuilt + 1 };
	notify();
}

export function recordUnitLost() {
	stats = { ...stats, unitsLost: stats.unitsLost + 1 };
	notify();
}

export function recordUnitHacked() {
	stats = { ...stats, unitsHacked: stats.unitsHacked + 1 };
	notify();
}

export function recordStructureBuilt() {
	stats = { ...stats, structuresBuilt: stats.structuresBuilt + 1 };
	notify();
}

export function recordIncursionSurvived() {
	stats = {
		...stats,
		cultistIncursionsSurvived: stats.cultistIncursionsSurvived + 1,
	};
	notify();
}

export function recordCultistDestroyed() {
	stats = {
		...stats,
		cultistsDestroyed: stats.cultistsDestroyed + 1,
	};
	notify();
}

export function recordBuildingDestroyed() {
	stats = {
		...stats,
		buildingsDestroyed: stats.buildingsDestroyed + 1,
	};
	notify();
}

export function recordLightningStrike() {
	stats = {
		...stats,
		lightningStrikesReceived: stats.lightningStrikesReceived + 1,
	};
	notify();
}

export function recordCombatEngagement() {
	stats = {
		...stats,
		totalCombatEngagements: stats.totalCombatEngagements + 1,
	};
	notify();
}

/**
 * Record a combat kill credited to a faction.
 * Persists even after the killing unit is destroyed.
 */
export function recordCombatKill(factionId: string) {
	factionKills.set(factionId, (factionKills.get(factionId) ?? 0) + 1);
	notify();
}

/**
 * Get the per-faction kill counts.
 */
export function getCombatKills(): ReadonlyMap<string, number> {
	return factionKills;
}

export function updateTerritorySize(currentSize: number) {
	if (currentSize > stats.peakTerritorySize) {
		stats = { ...stats, peakTerritorySize: currentSize };
		notify();
	}
}

export function setCampaignStats(next: Partial<CampaignStats>) {
	stats = { ...stats, ...next };
	notify();
}

/**
 * Serialize campaign stats for persistence.
 */
export function serializeCampaignStats(): CampaignStats {
	return { ...stats };
}

/**
 * Rehydrate campaign stats from persisted data.
 */
export function rehydrateCampaignStats(saved: CampaignStats) {
	stats = { ...createDefaultStats(), ...saved };
	notify();
}

export function resetCampaignStats() {
	stats = createDefaultStats();
	factionKills = new Map<string, number>();
	notify();
}
