/**
 * Diplomacy System — Inter-faction relations, trade, and alliances.
 *
 * Each faction pair has a standing value (-100 to +100) that determines
 * their relationship: hostile, unfriendly, neutral, cordial, or allied.
 *
 * Standing changes from gameplay events (combat, trade, territory
 * encroachment, hacking). Trade offers can be proposed and accepted/rejected.
 */

import diplomacyConfig from "../config/diplomacy.json";
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
	return diplomacyConfig.factions[
		factionId
	] as FactionProfile;
}

export function getAllFactionProfiles(): Record<
	DiplomacyFactionId,
	FactionProfile
> {
	return diplomacyConfig.factions as Record<
		DiplomacyFactionId,
		FactionProfile
	>;
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

/**
 * Reset diplomacy state — call on new game.
 */
export function resetDiplomacy() {
	standings.clear();
	pendingTrades.length = 0;
	recentEvents.length = 0;
	nextTradeId = 1;
	notify();
}
