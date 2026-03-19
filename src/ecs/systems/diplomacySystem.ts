/**
 * Diplomacy system — granular standings, relation drift, trade, break penalties.
 *
 * Standing: -100 to +100, derives 3-state relation (hostile/neutral/ally).
 *   - Attacking shifts standing negative (unit_attacked = -20).
 *   - Standing decays toward 0 each turn (STANDING_DECAY_PER_TURN).
 *   - Peace drift: hostile → neutral after PEACE_DRIFT_TURNS without aggression.
 *
 * AI personality:
 *   - Volt Collective: accepts alliances easily
 *   - Iron Creed: never allies
 *   - Signal Choir: accepts then backstabs after N turns
 *   - Reclaimers: normal diplomacy
 *
 * Trade: allied factions share harvest income (TRADE_INCOME_SHARE_PERCENT).
 * Break penalties: breaking an agreement penalizes standing with ALL factions.
 * Event history: recent diplomacy events kept for UI display.
 *
 * Allied factions:
 *   - AI won't attack allied units/buildings
 *   - Share fog of war (allied unit scan reveals tiles for player)
 */

import type { World } from "koota";
import {
	getRelation,
	getStanding,
	modifyStanding,
	setRelation,
	setStanding,
	type RelationType,
} from "../factions/relations";
import { pushToast } from "./toastNotifications";
import { UnitFaction, UnitPos, UnitStats } from "../traits/unit";
import { revealFog } from "./fogRevealSystem";
import {
	BREAK_ALLIANCE_PENALTY,
	BREAK_TRADE_PENALTY,
	DIPLOMACY_BACKSTAB_DELAY,
	DIPLOMACY_PEACE_DRIFT_TURNS,
	STANDING_CHANGES,
	STANDING_DECAY_PER_TURN,
	STANDING_DISPLAY,
	STANDING_THRESHOLDS,
	TRADE_INCOME_SHARE_PERCENT,
} from "../../config/gameDefaults";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StandingLevel =
	| "hostile"
	| "unfriendly"
	| "neutral"
	| "cordial"
	| "allied";

export interface DiplomacyEvent {
	type: string;
	factionA: string;
	factionB: string;
	turnNumber: number;
	standingChange: number;
}

export interface TradeIncome {
	factionId: string;
	incomeShared: number;
}

/** AI diplomacy personality — how each faction responds to alliance proposals. */
export interface DiplomacyPersonality {
	acceptsAlliance: boolean;
	willBackstab: boolean;
	backstabDelay: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DIPLOMACY_PERSONALITY: Record<string, DiplomacyPersonality> = {
	reclaimers: { acceptsAlliance: true, willBackstab: false, backstabDelay: 0 },
	volt_collective: { acceptsAlliance: true, willBackstab: false, backstabDelay: 0 },
	signal_choir: { acceptsAlliance: true, willBackstab: true, backstabDelay: DIPLOMACY_BACKSTAB_DELAY },
	iron_creed: { acceptsAlliance: false, willBackstab: false, backstabDelay: 0 },
};

const ALL_DIPLOMACY_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
] as const;

// ─── Module State ────────────────────────────────────────────────────────────

/** Track last aggression turn per faction pair. */
const lastAggressionTurn = new Map<string, number>();

/** Track when alliances were formed (for backstab timer). */
const allianceFormedTurn = new Map<string, number>();

/** Recent diplomacy events for UI display. */
const recentEvents: DiplomacyEvent[] = [];

const MAX_RECENT_EVENTS = 20;

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function pairKey(a: string, b: string): string {
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ─── Standing Queries ────────────────────────────────────────────────────────

/**
 * Get the standing level label for two factions.
 */
export function getStandingLevel(
	world: World,
	factionA: string,
	factionB: string,
): StandingLevel {
	const value = getStanding(world, factionA, factionB);
	if (value <= STANDING_THRESHOLDS.hostile) return "hostile";
	if (value <= STANDING_THRESHOLDS.unfriendly) return "unfriendly";
	if (value <= STANDING_THRESHOLDS.neutral) return "neutral";
	if (value <= STANDING_THRESHOLDS.cordial) return "cordial";
	return "allied";
}

/**
 * Get standing display info (label, color, value) for UI.
 */
export function getStandingDisplay(
	world: World,
	factionA: string,
	factionB: string,
): { label: string; color: string; value: number } {
	const value = getStanding(world, factionA, factionB);
	const level = getStandingLevel(world, factionA, factionB);
	const display = STANDING_DISPLAY[level];
	return { label: display.label, color: display.color, value };
}

// ─── Diplomacy Events ────────────────────────────────────────────────────────

function recordDiplomacyEvent(
	world: World,
	type: string,
	factionA: string,
	factionB: string,
	turnNumber: number,
	delta: number,
) {
	modifyStanding(world, factionA, factionB, delta);
	recentEvents.push({ type, factionA, factionB, turnNumber, standingChange: delta });
	if (recentEvents.length > MAX_RECENT_EVENTS) {
		recentEvents.shift();
	}
	notify();
}

/**
 * Apply a standard diplomacy event by type name.
 */
export function applyDiplomacyEvent(
	world: World,
	eventType: keyof typeof STANDING_CHANGES,
	factionA: string,
	factionB: string,
	turnNumber: number,
): void {
	const delta = STANDING_CHANGES[eventType];
	recordDiplomacyEvent(world, eventType, factionA, factionB, turnNumber, delta);
}

/**
 * Get recent diplomacy events for UI display.
 */
export function getRecentDiplomacyEvents(): readonly DiplomacyEvent[] {
	return recentEvents;
}

/**
 * Subscribe to diplomacy state changes.
 */
export function subscribeDiplomacy(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

// ─── Aggression & Relations ──────────────────────────────────────────────────

/**
 * Record an act of aggression between two factions.
 * Attacking always makes a faction hostile immediately.
 * If breaking an alliance, applies break penalty to ALL factions.
 */
export function recordAggression(
	world: World,
	attackerFaction: string,
	defenderFaction: string,
	currentTurn: number,
): void {
	if (attackerFaction === defenderFaction) return;
	const key = pairKey(attackerFaction, defenderFaction);
	lastAggressionTurn.set(key, currentTurn);

	const current = getRelation(world, attackerFaction, defenderFaction);
	if (current === "ally") {
		// Breaking an alliance — apply break penalty to ALL factions
		applyBreakPenalty(world, attackerFaction, defenderFaction, currentTurn, true);
		// Force hostile regardless of what the penalty math produced
		setRelation(world, attackerFaction, defenderFaction, "hostile");
		setStanding(world, attackerFaction, defenderFaction, -60);
		allianceFormedTurn.delete(key);
		const label = defenderFaction.replace(/_/g, " ").toUpperCase();
		pushToast("combat", `${label}: ALLIANCE BROKEN`, "AGGRESSION DETECTED");
	} else if (current === "neutral") {
		// Aggression immediately shifts to hostile
		setRelation(world, attackerFaction, defenderFaction, "hostile");
		setStanding(world, attackerFaction, defenderFaction, -60);
		const label = defenderFaction.replace(/_/g, " ").toUpperCase();
		pushToast("combat", `${label}: HOSTILE`, "AGGRESSION DETECTED");
		recentEvents.push({
			type: "unit_attacked",
			factionA: attackerFaction,
			factionB: defenderFaction,
			turnNumber: currentTurn,
			standingChange: STANDING_CHANGES.unit_attacked,
		});
		if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
		notify();
	}
	// Already hostile — push standing deeper negative but preserve hostile relation
	if (current === "hostile") {
		// Use raw standing modification that won't flip the relation
		for (const e of world.query(FactionRelation)) {
			const r = e.get(FactionRelation);
			if (!r) continue;
			if (
				(r.factionA === attackerFaction && r.factionB === defenderFaction) ||
				(r.factionA === defenderFaction && r.factionB === attackerFaction)
			) {
				const newStanding = Math.max(-100, r.standing + STANDING_CHANGES.unit_attacked);
				e.set(FactionRelation, { ...r, standing: newStanding });
				break;
			}
		}
	}
}

/**
 * Attempt to propose an alliance between player and an AI faction.
 * Returns true if accepted.
 */
export function proposeAlliance(
	world: World,
	playerFaction: string,
	aiFaction: string,
	currentTurn: number,
): boolean {
	const personality = DIPLOMACY_PERSONALITY[aiFaction];
	if (!personality || !personality.acceptsAlliance) return false;

	const current = getRelation(world, playerFaction, aiFaction);
	if (current === "hostile") return false; // Can't ally while hostile

	setRelation(world, playerFaction, aiFaction, "ally");
	// Also boost standing to allied range
	setStanding(world, playerFaction, aiFaction, 60);
	const key = pairKey(playerFaction, aiFaction);
	allianceFormedTurn.set(key, currentTurn);

	const factionLabel = aiFaction.replace(/_/g, " ").toUpperCase();
	pushToast("system", `${factionLabel}: ALLIANCE FORMED`, "SHARED FOG AND TRADE ACTIVE");

	// Small standing boost with the proposed faction
	recentEvents.push({
		type: "alliance_proposed",
		factionA: playerFaction,
		factionB: aiFaction,
		turnNumber: currentTurn,
		standingChange: STANDING_CHANGES.alliance_proposed,
	});
	if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
	notify();

	return true;
}

/**
 * Declare war on a faction. Sets relation to hostile and standing to -60.
 */
export function declareWar(
	world: World,
	attackerFaction: string,
	defenderFaction: string,
	currentTurn: number,
): void {
	const currentRelation = getRelation(world, attackerFaction, defenderFaction);
	if (currentRelation === "ally") {
		// Breaking alliance — apply penalty
		applyBreakPenalty(world, attackerFaction, defenderFaction, currentTurn, true);
	} else {
		setStanding(world, attackerFaction, defenderFaction, -60);
	}
	setRelation(world, attackerFaction, defenderFaction, "hostile");
	const key = pairKey(attackerFaction, defenderFaction);
	lastAggressionTurn.set(key, currentTurn);
	allianceFormedTurn.delete(key);
}

// ─── Break Penalty ───────────────────────────────────────────────────────────

/**
 * Apply reputation penalty to ALL factions when an agreement is broken.
 * The broken-with faction receives double the penalty.
 */
export function applyBreakPenalty(
	world: World,
	brokenFaction: string,
	brokenWith: string,
	turnNumber: number,
	isAlliance: boolean,
): void {
	const penalty = isAlliance ? BREAK_ALLIANCE_PENALTY : BREAK_TRADE_PENALTY;

	for (const df of ALL_DIPLOMACY_FACTIONS) {
		if (df === brokenFaction) continue;
		if (df === brokenWith) {
			recordDiplomacyEvent(
				world,
				"agreement_broken",
				brokenFaction,
				df,
				turnNumber,
				penalty * 2,
			);
		} else {
			recordDiplomacyEvent(
				world,
				"agreement_broken",
				brokenFaction,
				df,
				turnNumber,
				penalty,
			);
		}
	}
}

// ─── Trade Income ────────────────────────────────────────────────────────────

/**
 * Calculate trade income from allied factions.
 * Each ally shares a percentage of their harvest with you.
 */
export function calculateTradeIncome(
	world: World,
	factionHarvests: Map<string, number>,
): TradeIncome[] {
	const incomes: TradeIncome[] = [];
	const shareFraction = TRADE_INCOME_SHARE_PERCENT / 100;

	// Check all unique pairs
	const factions = [...factionHarvests.keys()];
	for (let i = 0; i < factions.length; i++) {
		for (let j = i + 1; j < factions.length; j++) {
			const a = factions[i]!;
			const b = factions[j]!;
			if (getRelation(world, a, b) !== "ally") continue;

			const harvestA = factionHarvests.get(a) ?? 0;
			const harvestB = factionHarvests.get(b) ?? 0;

			if (harvestB > 0) {
				incomes.push({
					factionId: a,
					incomeShared: Math.floor(harvestB * shareFraction),
				});
			}
			if (harvestA > 0) {
				incomes.push({
					factionId: b,
					incomeShared: Math.floor(harvestA * shareFraction),
				});
			}
		}
	}

	return incomes;
}

// ─── Per-Turn Diplomacy ──────────────────────────────────────────────────────

/**
 * Run diplomacy phase at end of each turn.
 * - Standing decay toward 0.
 * - Peace drift: hostile → neutral after PEACE_DRIFT_TURNS without aggression.
 * - Signal Choir backstab check.
 */
export function runDiplomacy(
	world: World,
	currentTurn: number,
	factionIds: string[],
): void {
	// Standing decay — all pairs drift toward 0
	for (const e of world.query(FactionRelation)) {
		const r = e.get(FactionRelation);
		if (!r) continue;
		if (r.standing > 0) {
			const newStanding = Math.max(0, r.standing - STANDING_DECAY_PER_TURN);
			e.set(FactionRelation, {
				...r,
				standing: newStanding,
				relation: r.relation, // don't auto-change relation from decay alone
			});
		} else if (r.standing < 0) {
			const newStanding = Math.min(0, r.standing + STANDING_DECAY_PER_TURN);
			e.set(FactionRelation, {
				...r,
				standing: newStanding,
				relation: r.relation, // don't auto-change relation from decay alone
			});
		}
	}

	// Check all faction pairs for peace drift and backstab
	for (let i = 0; i < factionIds.length; i++) {
		for (let j = i + 1; j < factionIds.length; j++) {
			const a = factionIds[i]!;
			const b = factionIds[j]!;
			const key = pairKey(a, b);
			const relation = getRelation(world, a, b);

			// Peace drift: hostile → neutral after PEACE_DRIFT_TURNS without aggression
			if (relation === "hostile") {
				const lastAggression = lastAggressionTurn.get(key) ?? 0;
				if (currentTurn - lastAggression >= DIPLOMACY_PEACE_DRIFT_TURNS) {
					setRelation(world, a, b, "neutral");
					setStanding(world, a, b, 0);
				}
			}

			// Backstab check: Signal Choir breaks alliance after delay
			if (relation === "ally") {
				const formed = allianceFormedTurn.get(key);
				if (formed != null) {
					const aPersonality = DIPLOMACY_PERSONALITY[a];
					const bPersonality = DIPLOMACY_PERSONALITY[b];

					if (aPersonality?.willBackstab && currentTurn - formed >= aPersonality.backstabDelay) {
						setRelation(world, a, b, "hostile");
						setStanding(world, a, b, -60);
						allianceFormedTurn.delete(key);
						lastAggressionTurn.set(key, currentTurn);
						pushToast("combat", `${a.replace(/_/g, " ").toUpperCase()}: ALLIANCE BROKEN`, "BACKSTAB DETECTED");
					} else if (bPersonality?.willBackstab && currentTurn - formed >= bPersonality.backstabDelay) {
						setRelation(world, a, b, "hostile");
						setStanding(world, a, b, -60);
						allianceFormedTurn.delete(key);
						lastAggressionTurn.set(key, currentTurn);
						pushToast("combat", `${b.replace(/_/g, " ").toUpperCase()}: ALLIANCE BROKEN`, "BACKSTAB DETECTED");
					}
				}
			}
		}
	}
}

// ─── Fog Sharing ─────────────────────────────────────────────────────────────

/**
 * Share fog of war from allied faction units.
 * Allied units reveal tiles within their scan range for the player.
 */
export function shareAlliedFog(world: World, playerFaction: string): void {
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const faction = e.get(UnitFaction);
		const pos = e.get(UnitPos);
		const stats = e.get(UnitStats);
		if (!faction || !pos || !stats) continue;
		if (faction.factionId === playerFaction) continue;

		if (getRelation(world, playerFaction, faction.factionId) === "ally") {
			revealFog(world, pos.tileX, pos.tileZ, stats.scanRange);
		}
	}
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Check if two factions are allies.
 */
export function isAlly(world: World, factionA: string, factionB: string): boolean {
	return getRelation(world, factionA, factionB) === "ally";
}

/**
 * Get the diplomacy personality for an AI faction.
 */
export function getDiplomacyPersonality(factionId: string): DiplomacyPersonality | null {
	return DIPLOMACY_PERSONALITY[factionId] ?? null;
}

// Need to import the trait for standing decay iteration
import { FactionRelation } from "../traits/faction";

/** Reset module state — for tests. */
export function _resetDiplomacy(): void {
	lastAggressionTurn.clear();
	allianceFormedTurn.clear();
	recentEvents.length = 0;
	listeners.clear();
}
