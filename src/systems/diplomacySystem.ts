/**
 * Diplomacy system — manages inter-faction relations, opinion scores,
 * stance derivation, trade proposals, and AI diplomacy decisions.
 *
 * Each faction pair has an independent opinion score (-100 to +100).
 * Stance is derived from configurable thresholds. Opinion decays toward
 * neutral over time. AI factions propose trades/alliances based on stance
 * and governor bias.
 *
 * All tunables sourced from config/diplomacy.json via the centralized config index.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiplomacyStance =
	| "hostile"
	| "unfriendly"
	| "neutral"
	| "friendly"
	| "allied";

export interface FactionRelation {
	factionA: string;
	factionB: string;
	opinion: number; // -100 to 100
	stance: DiplomacyStance;
}

export interface TradeProposal {
	id: string;
	from: string;
	to: string;
	offer: Record<string, number>;
	request: Record<string, number>;
	createdTick: number;
	status: "pending" | "accepted" | "rejected";
}

export type OpinionModifierKey = keyof typeof config.diplomacy.opinionModifiers;

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const diplomacyCfg = config.diplomacy;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Key: "factionA::factionB" (alphabetically sorted). Value: opinion score. */
const opinions = new Map<string, number>();

/** Active and historical trade proposals. */
const tradeProposals: TradeProposal[] = [];

/** Last tick each faction proposed a trade (cooldown tracking). */
const lastProposalTick = new Map<string, number>();

let nextProposalId = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pairKey(factionA: string, factionB: string): string {
	return factionA < factionB
		? `${factionA}::${factionB}`
		: `${factionB}::${factionA}`;
}

function clampOpinion(value: number): number {
	return Math.max(-100, Math.min(100, value));
}

/**
 * Derive stance from opinion score. Thresholds are the LOWER bounds of each
 * stance. We check from highest to lowest. A stance applies when the opinion
 * is at or above the threshold (and below the next higher threshold).
 *
 * allied:     opinion >= 60
 * friendly:   opinion >= 30
 * neutral:    opinion >= 0  (but also the range from unfriendly upper bound)
 * unfriendly: opinion > hostile threshold (> -50) and < neutral threshold (< 0)
 * hostile:    opinion <= -50
 *
 * The stanceThresholds define the boundary where you cross INTO that stance:
 * hostile: -50 means at -50 or below you are hostile
 * unfriendly: -20 means from above -50 to below 0 you are unfriendly
 *   (but the threshold -20 is not used as a >= check — see below)
 *
 * Actually, rethinking: the simplest correct interpretation:
 *   hostile:     opinion <= stanceThresholds.hostile
 *   unfriendly:  hostile < opinion < neutral (0)
 *   neutral:     0 <= opinion < friendly
 *   friendly:    friendly <= opinion < allied
 *   allied:      opinion >= allied
 */
function deriveStance(opinion: number): DiplomacyStance {
	const thresholds = diplomacyCfg.relations.stanceThresholds;

	if (opinion >= thresholds.allied) return "allied";
	if (opinion >= thresholds.friendly) return "friendly";
	if (opinion >= thresholds.neutral) return "neutral";
	if (opinion > thresholds.hostile) return "unfriendly";
	return "hostile";
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/**
 * Get the relation between two factions.
 * Returns opinion score and derived stance.
 */
export function getRelation(factionA: string, factionB: string): FactionRelation {
	const key = pairKey(factionA, factionB);
	const opinion = opinions.get(key) ?? 0;
	return {
		factionA,
		factionB,
		opinion,
		stance: deriveStance(opinion),
	};
}

/**
 * Get all faction relations as an array.
 */
export function getAllRelations(): FactionRelation[] {
	const result: FactionRelation[] = [];
	for (const [key, opinion] of opinions.entries()) {
		const [factionA, factionB] = key.split("::");
		result.push({
			factionA,
			factionB,
			opinion,
			stance: deriveStance(opinion),
		});
	}
	return result;
}

/**
 * Get all pending trade proposals.
 */
export function getActiveTradeProposals(): TradeProposal[] {
	return tradeProposals.filter((p) => p.status === "pending");
}

// ---------------------------------------------------------------------------
// Public API — Mutations
// ---------------------------------------------------------------------------

/**
 * Modify the opinion between two factions by a named modifier key.
 * The modifier value comes from config/diplomacy.json.
 */
export function modifyOpinion(
	factionA: string,
	factionB: string,
	modifier: OpinionModifierKey,
): void {
	const key = pairKey(factionA, factionB);
	const current = opinions.get(key) ?? 0;
	const delta =
		diplomacyCfg.opinionModifiers[modifier as keyof typeof diplomacyCfg.opinionModifiers];
	opinions.set(key, clampOpinion(current + delta));
}

/**
 * Directly adjust opinion by a numeric amount (for custom events).
 */
export function adjustOpinion(
	factionA: string,
	factionB: string,
	amount: number,
): void {
	const key = pairKey(factionA, factionB);
	const current = opinions.get(key) ?? 0;
	opinions.set(key, clampOpinion(current + amount));
}

/**
 * Create a trade proposal from one faction to another.
 * Returns the proposal ID, or null if on cooldown.
 */
export function proposeTrade(
	from: string,
	to: string,
	offer: Record<string, number>,
	request: Record<string, number>,
	currentTick = 0,
): string | null {
	const lastTick = lastProposalTick.get(from) ?? -Infinity;
	if (currentTick - lastTick < diplomacyCfg.tradeProposalCooldown) {
		return null; // On cooldown
	}

	const id = `trade_${nextProposalId++}`;
	tradeProposals.push({
		id,
		from,
		to,
		offer,
		request,
		createdTick: currentTick,
		status: "pending",
	});
	lastProposalTick.set(from, currentTick);
	return id;
}

/**
 * Accept a pending trade proposal. Both factions gain opinion.
 */
export function acceptTrade(proposalId: string): boolean {
	const proposal = tradeProposals.find(
		(p) => p.id === proposalId && p.status === "pending",
	);
	if (!proposal) return false;

	proposal.status = "accepted";
	modifyOpinion(proposal.from, proposal.to, "tradeDeal");
	return true;
}

/**
 * Reject a pending trade proposal. No opinion change.
 */
export function rejectTrade(proposalId: string): boolean {
	const proposal = tradeProposals.find(
		(p) => p.id === proposalId && p.status === "pending",
	);
	if (!proposal) return false;

	proposal.status = "rejected";
	return true;
}

// ---------------------------------------------------------------------------
// Opinion decay
// ---------------------------------------------------------------------------

/**
 * Decay all opinions toward neutral (0) by the configured decay rate.
 * Called internally by diplomacySystem each check interval.
 */
export function decayOpinions(): void {
	for (const [key, opinion] of opinions.entries()) {
		if (opinion === 0) continue;
		const decayAmount = diplomacyCfg.decayRate * Math.abs(opinion);
		if (opinion > 0) {
			opinions.set(key, Math.max(0, opinion - decayAmount));
		} else {
			opinions.set(key, Math.min(0, opinion + decayAmount));
		}
	}
}

// ---------------------------------------------------------------------------
// AI diplomacy decisions
// ---------------------------------------------------------------------------

const AI_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
];

/**
 * AI faction proposes trades to factions with friendly+ stance.
 * Called internally by diplomacySystem.
 */
function aiProposeTrades(currentTick: number): void {
	for (const faction of AI_FACTIONS) {
		for (const other of AI_FACTIONS) {
			if (faction === other) continue;

			const relation = getRelation(faction, other);
			if (relation.stance === "friendly" || relation.stance === "allied") {
				proposeTrade(
					faction,
					other,
					{ scrapMetal: 10 },
					{ eWaste: 5 },
					currentTick,
				);
			}
		}

		// Also consider proposing to player if friendly
		const playerRelation = getRelation(faction, "player");
		if (
			playerRelation.stance === "friendly" ||
			playerRelation.stance === "allied"
		) {
			proposeTrade(
				faction,
				"player",
				{ scrapMetal: 10 },
				{ eWaste: 5 },
				currentTick,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Main system tick
// ---------------------------------------------------------------------------

/**
 * Run AI diplomacy decisions. Called once per simulation tick.
 * Checks are only performed at the configured interval.
 */
export function diplomacySystem(currentTick: number): void {
	if (currentTick % diplomacyCfg.checkInterval !== 0) return;

	// Decay opinions toward neutral
	decayOpinions();

	// AI factions propose trades
	aiProposeTrades(currentTick);
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Clear all diplomacy state. Primarily for testing.
 */
export function resetDiplomacy(): void {
	opinions.clear();
	tradeProposals.length = 0;
	lastProposalTick.clear();
	nextProposalId = 0;
}
