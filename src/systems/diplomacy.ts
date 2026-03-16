/**
 * @module diplomacy
 *
 * Inter-faction standing and trade system. Tracks pairwise standing values (-100 to +100)
 * across 5 levels (hostile/unfriendly/neutral/cordial/allied). Standing changes from
 * gameplay events. Supports trade offer lifecycle (propose/accept/reject/expire).
 *
 * @exports DiplomacyFactionId / StandingLevel / FactionProfile / TradeOffer / DiplomacyEvent - Types
 * @exports getStanding / getStandingLevel / getStandingDisplay - Standing queries
 * @exports modifyStanding / applyDiplomacyEvent - Standing mutation
 * @exports proposeTrade / acceptTrade / rejectTrade / expireTradeOffers - Trade lifecycle
 * @exports areAtWar / areAllied - Relationship checks
 * @exports getFactionProfile / getAllFactionProfiles - Config access
 * @exports subscribeDiplomacy / getRecentEvents - Observation and event history
 * @exports resetDiplomacy - Reset for new game
 *
 * @dependencies config/diplomacy.json, factionEconomy (EconomyFactionId), resourcePools (HarvestResource)
 * @consumers DiplomacyModal
 */

import diplomacyConfig from "../config/diplomacy.json";
import { FactionStanding } from "../ecs/traits";
import { world } from "../ecs/world";
import type { EconomyFactionId } from "./factionEconomy";
import type { HarvestResource } from "./resourcePools";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiplomacyFactionId =
	| "reclaimers"
	| "volt_collective"
	| "signal_choir"
	| "iron_creed";

export const ALL_DIPLOMACY_FACTIONS: readonly DiplomacyFactionId[] = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

export type StandingLevel =
	| "hostile"
	| "unfriendly"
	| "neutral"
	| "cordial"
	| "allied";

export interface FactionProfile {
	displayName: string;
	color: string;
	description: string;
	personality: string;
	tradeWillingness: number;
	aggressionBase: number;
}

export interface TradeOffer {
	id: string;
	from: string;
	to: string;
	offering: Array<{ resource: HarvestResource; amount: number }>;
	requesting: Array<{ resource: HarvestResource; amount: number }>;
	turnProposed: number;
	/** Expires after this many turns */
	expiresIn: number;
}

export interface DiplomacyEvent {
	type: string;
	factionA: string;
	factionB: string;
	turnNumber: number;
	standingChange: number;
}

// ─── State ───────────────────────────────────────────────────────────────────

/**
 * Standing between faction pairs. Key format: "factionA:factionB"
 * where factionA < factionB alphabetically.
 */
const standings = new Map<string, number>();
const pendingTrades: TradeOffer[] = [];
const recentEvents: DiplomacyEvent[] = [];
let nextTradeId = 1;
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function pairKey(a: string, b: string): string {
	return a < b ? `${a}:${b}` : `${b}:${a}`;
}

// ─── Config Access ───────────────────────────────────────────────────────────

export function getFactionProfile(
	factionId: DiplomacyFactionId,
): FactionProfile {
	return diplomacyConfig.factions[factionId] as FactionProfile;
}

export function getAllFactionProfiles(): Record<
	DiplomacyFactionId,
	FactionProfile
> {
	return diplomacyConfig.factions as Record<DiplomacyFactionId, FactionProfile>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function subscribeDiplomacy(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Get the standing value between two factions (-100 to +100).
 */
export function getStanding(factionA: string, factionB: string): number {
	if (factionA === factionB) return 100;
	return standings.get(pairKey(factionA, factionB)) ?? 0;
}

/**
 * Get the standing level label for two factions.
 */
export function getStandingLevel(
	factionA: string,
	factionB: string,
): StandingLevel {
	const value = getStanding(factionA, factionB);
	if (value <= -50) return "hostile";
	if (value <= -10) return "unfriendly";
	if (value <= 10) return "neutral";
	if (value <= 50) return "cordial";
	return "allied";
}

/**
 * Get standing display info (label, color) for two factions.
 */
export function getStandingDisplay(
	factionA: string,
	factionB: string,
): { label: string; color: string; value: number } {
	const value = getStanding(factionA, factionB);
	const level = getStandingLevel(factionA, factionB);
	const config =
		diplomacyConfig.standings[level as keyof typeof diplomacyConfig.standings];
	return {
		label: config.label,
		color: config.color,
		value,
	};
}

/**
 * Modify standing between two factions. Clamps to [-100, 100].
 */
export function modifyStanding(
	factionA: string,
	factionB: string,
	delta: number,
	turnNumber: number,
	eventType: string,
) {
	if (factionA === factionB) return;

	const key = pairKey(factionA, factionB);
	const current = standings.get(key) ?? 0;
	const newValue = Math.max(-100, Math.min(100, current + delta));
	standings.set(key, newValue);

	recentEvents.push({
		type: eventType,
		factionA,
		factionB,
		turnNumber,
		standingChange: delta,
	});

	// Keep only last 20 events
	if (recentEvents.length > 20) {
		recentEvents.shift();
	}

	notify();
}

/**
 * Apply a standard standing change event.
 */
export function applyDiplomacyEvent(
	eventType: keyof typeof diplomacyConfig.standingChanges,
	factionA: string,
	factionB: string,
	turnNumber: number,
) {
	const delta = diplomacyConfig.standingChanges[eventType];
	if (delta !== undefined) {
		modifyStanding(factionA, factionB, delta, turnNumber, eventType);
	}
}

/**
 * Get all pending trade offers involving a faction.
 */
export function getPendingTrades(factionId: string): TradeOffer[] {
	return pendingTrades.filter(
		(t) => t.from === factionId || t.to === factionId,
	);
}

/**
 * Propose a trade offer.
 */
export function proposeTrade(offer: Omit<TradeOffer, "id">): TradeOffer {
	const trade: TradeOffer = {
		...offer,
		id: `trade_${nextTradeId++}`,
	};
	pendingTrades.push(trade);
	applyDiplomacyEvent(
		"alliance_proposed",
		offer.from,
		offer.to,
		offer.turnProposed,
	);
	notify();
	return trade;
}

/**
 * Accept a trade offer. Returns false if the offer doesn't exist.
 */
export function acceptTrade(tradeId: string, turnNumber: number): boolean {
	const idx = pendingTrades.findIndex((t) => t.id === tradeId);
	if (idx === -1) return false;

	const trade = pendingTrades[idx];
	pendingTrades.splice(idx, 1);
	applyDiplomacyEvent("trade_completed", trade.from, trade.to, turnNumber);
	notify();
	return true;
}

/**
 * Reject a trade offer. Returns false if the offer doesn't exist.
 */
export function rejectTrade(tradeId: string, turnNumber: number): boolean {
	const idx = pendingTrades.findIndex((t) => t.id === tradeId);
	if (idx === -1) return false;

	const trade = pendingTrades[idx];
	pendingTrades.splice(idx, 1);
	applyDiplomacyEvent("trade_rejected", trade.from, trade.to, turnNumber);
	notify();
	return true;
}

/**
 * Expire old trade offers. Call at the start of each turn.
 */
export function expireTradeOffers(currentTurn: number) {
	for (let i = pendingTrades.length - 1; i >= 0; i--) {
		const trade = pendingTrades[i];
		if (currentTurn - trade.turnProposed >= trade.expiresIn) {
			pendingTrades.splice(i, 1);
		}
	}
	notify();
}

/**
 * Get recent diplomacy events.
 */
export function getRecentEvents(): readonly DiplomacyEvent[] {
	return recentEvents;
}

/**
 * Check if two factions are at war (hostile standing).
 */
export function areAtWar(factionA: string, factionB: string): boolean {
	return getStandingLevel(factionA, factionB) === "hostile";
}

/**
 * Check if two factions are allied.
 */
export function areAllied(factionA: string, factionB: string): boolean {
	return getStandingLevel(factionA, factionB) === "allied";
}

// ─── Gameplay Consequences ────────────────────────────────────────────────────

export interface TradeIncome {
	factionId: string;
	incomeShared: number;
}

export interface WarContestedCell {
	q: number;
	r: number;
	contestingFaction: string;
}

let lastTradeIncomes: TradeIncome[] = [];
let lastContestedCells: WarContestedCell[] = [];

/**
 * Calculate trade income from all trading/allied partners.
 * Returns income shared from each partner based on their harvest output.
 * Share percentage is config-driven via diplomacy.json tradeIncomeSharePercent.
 */
export function calculateTradeIncome(
	factionHarvests: Map<string, number>,
): TradeIncome[] {
	const incomes: TradeIncome[] = [];
	const sharePercent = (diplomacyConfig as Record<string, unknown>)
		.tradeIncomeSharePercent as number;
	const shareFraction = sharePercent / 100;

	for (const [factionA, factionB] of allFactionPairs()) {
		if (!areAllied(factionA, factionB)) continue;

		const harvestA = factionHarvests.get(factionA) ?? 0;
		const harvestB = factionHarvests.get(factionB) ?? 0;

		if (harvestA > 0) {
			incomes.push({
				factionId: factionA,
				incomeShared: Math.floor(harvestA * shareFraction),
			});
		}
		if (harvestB > 0) {
			incomes.push({
				factionId: factionB,
				incomeShared: Math.floor(harvestB * shareFraction),
			});
		}
	}

	lastTradeIncomes = incomes;
	return incomes;
}

/**
 * Get the last calculated trade incomes.
 */
export function getLastTradeIncomes(): TradeIncome[] {
	return lastTradeIncomes;
}

/**
 * Check if fog of war is shared with a faction via alliance.
 * Config-driven via diplomacy.json allianceFogSharing.
 */
export function isFogSharedWith(factionA: string, factionB: string): boolean {
	const fogEnabled = (diplomacyConfig as Record<string, unknown>)
		.allianceFogSharing as boolean;
	if (!fogEnabled) return false;
	return areAllied(factionA, factionB);
}

/**
 * Get all factions that share fog with a given faction (i.e. allies).
 */
export function getAlliedFactions(factionId: string): string[] {
	const allies: string[] = [];
	for (const df of ALL_DIPLOMACY_FACTIONS) {
		if (df === factionId) continue;
		if (areAllied(factionId, df)) {
			allies.push(df);
		}
	}
	return allies;
}

/**
 * Calculate contested border cells during war.
 * Player cells within warBorderContestRadius of enemy territory are contested.
 */
export function calculateContestedCells(
	playerCells: Array<{ q: number; r: number }>,
	factionCells: Map<string, Array<{ q: number; r: number }>>,
	playerFaction: string,
): WarContestedCell[] {
	const contested: WarContestedCell[] = [];
	const radius = (diplomacyConfig as Record<string, unknown>)
		.warBorderContestRadius as number;

	for (const [factionId, cells] of factionCells) {
		if (!areAtWar(playerFaction, factionId)) continue;

		for (const playerCell of playerCells) {
			for (const enemyCell of cells) {
				const dq = playerCell.q - enemyCell.q;
				const dr = playerCell.r - enemyCell.r;
				const dist = Math.abs(dq) + Math.abs(dr);
				if (dist <= radius) {
					contested.push({
						q: playerCell.q,
						r: playerCell.r,
						contestingFaction: factionId,
					});
					break;
				}
			}
		}
	}

	lastContestedCells = contested;
	return contested;
}

/**
 * Get the last calculated contested cells.
 */
export function getLastContestedCells(): WarContestedCell[] {
	return lastContestedCells;
}

/**
 * Apply standing break penalty to all factions when an agreement is broken.
 * The broken-with faction receives double the penalty.
 */
export function applyBreakPenalty(
	brokenFaction: string,
	brokenWith: string,
	turnNumber: number,
	isAlliance: boolean,
) {
	const penalty = isAlliance
		? ((diplomacyConfig as Record<string, unknown>)
				.breakAlliancePenalty as number)
		: ((diplomacyConfig as Record<string, unknown>)
				.breakTradePenalty as number);

	for (const df of ALL_DIPLOMACY_FACTIONS) {
		if (df === brokenFaction) continue;
		if (df === brokenWith) {
			modifyStanding(
				brokenFaction,
				df,
				penalty * 2,
				turnNumber,
				"agreement_broken",
			);
		} else {
			modifyStanding(
				brokenFaction,
				df,
				penalty,
				turnNumber,
				"agreement_broken",
			);
		}
	}
}

/**
 * Diplomacy system tick. Decays standing toward neutral over time.
 * Decay rate is config-driven via diplomacy.json standingDecayPerTurn.
 */
export function diplomacySystemTick(turnNumber: number) {
	const decay = (diplomacyConfig as Record<string, unknown>)
		.standingDecayPerTurn as number;
	if (!decay) return;

	for (const [key, value] of standings) {
		if (value > 0) {
			standings.set(key, Math.max(0, value - decay));
		} else if (value < 0) {
			standings.set(key, Math.min(0, value + decay));
		}
	}
}

/** Helper: iterate all unique faction pairs */
function allFactionPairs(): [string, string][] {
	const pairs: [string, string][] = [];
	for (let i = 0; i < ALL_DIPLOMACY_FACTIONS.length; i++) {
		for (let j = i + 1; j < ALL_DIPLOMACY_FACTIONS.length; j++) {
			pairs.push([ALL_DIPLOMACY_FACTIONS[i], ALL_DIPLOMACY_FACTIONS[j]]);
		}
	}
	return pairs;
}

/**
 * Reset diplomacy state — call on new game.
 */
export function resetDiplomacy() {
	standings.clear();
	pendingTrades.length = 0;
	recentEvents.length = 0;
	nextTradeId = 1;
	lastTradeIncomes = [];
	lastContestedCells = [];
	_standingIndex.clear();
	notify();
}

// ─── Koota entity index (T20) ─────────────────────────────────────────────────

const _standingIndex = new Map<string, ReturnType<typeof world.spawn>>();

function standingKey(factionA: string, factionB: string) {
	return `${factionA}→${factionB}`;
}

/**
 * Spawn FactionStanding entities for all ordered (a→b) pairs in the given list.
 * Idempotent — skips pairs with a live entity already.
 */
export function initFactionStandings(factionIds: string[]): void {
	for (const a of factionIds) {
		for (const b of factionIds) {
			if (a === b) continue;
			const key = standingKey(a, b);
			const existing = _standingIndex.get(key);
			if (existing?.isAlive()) continue;
			const e = world.spawn(FactionStanding);
			e.set(FactionStanding, {
				factionId: a as EconomyFactionId,
				targetFactionId: b as EconomyFactionId,
				standing: 0,
				atWar: false,
				allied: false,
				tradingWith: false,
			});
			_standingIndex.set(key, e);
		}
	}
}

/**
 * Return the standing value between two factions via Koota entity.
 * Returns 0 if no entity exists for the pair.
 */
export function getStandingTrait(factionA: string, factionB: string): number {
	return (
		_standingIndex.get(standingKey(factionA, factionB))?.get(FactionStanding)
			?.standing ?? 0
	);
}

/**
 * Adjust the standing between two factions, clamping to [-100, 100].
 */
export function modifyStandingTrait(
	factionA: string,
	factionB: string,
	delta: number,
): void {
	const entity = _standingIndex.get(standingKey(factionA, factionB));
	if (!entity?.isAlive()) return;
	const cur = entity.get(FactionStanding)!;
	entity.set(FactionStanding, {
		...cur,
		standing: Math.max(-100, Math.min(100, cur.standing + delta)),
	});
}
