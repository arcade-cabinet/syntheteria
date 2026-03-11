/**
 * Victory progress display data — pure functions for building HUD-ready
 * representations of the 4-path victory system from victoryTracking state.
 *
 * Maps the 6 evaluated conditions (economic, military, scientific, cultural,
 * hacking, survival) to the 4 display paths from victoryPaths.json.
 */

import type { FactionVictoryProgress } from "../systems/victoryTracking";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One path as rendered in the victory progress HUD panel */
export interface VictoryPathDisplay {
	id: string;
	displayName: string;
	subtitle: string;
	score: number; // 0.0–1.0
	met: boolean;
	accentColor: string;
	/** Underlying conditions contributing to this path */
	conditions: Array<{ label: string; score: number; met: boolean }>;
}

/** Summary of all paths for a faction */
export interface VictoryProgressDisplay {
	paths: VictoryPathDisplay[];
	/** Highest single-condition score across all paths */
	leadingScore: number;
	/** ID of the leading path (highest score), or null if all at 0 */
	leadingPathId: string | null;
}

// ---------------------------------------------------------------------------
// Faction accent colors — used for path-specific tinting
// ---------------------------------------------------------------------------

export const FACTION_ACCENT: Record<string, string> = {
	reclaimers: "#D4A574",
	volt_collective: "#00BFFF",
	signal_choir: "#E0B0FF",
	iron_creed: "#B0C4DE",
};

// ---------------------------------------------------------------------------
// Path accent colors (path-specific, not faction-specific)
// ---------------------------------------------------------------------------

const PATH_ACCENT: Record<string, string> = {
	technical_mastery: "#00aaff",
	subjugation: "#ff4444",
	social_networking: "#ffaa00",
	religious_philosophical: "#aa44ff",
};

// ---------------------------------------------------------------------------
// Core mapping — group conditions into display paths
// ---------------------------------------------------------------------------

/**
 * Build victory progress display data from a faction's raw condition scores.
 * Takes the average of conditions mapped to each path.
 *
 * @param progress - FactionVictoryProgress from victoryTracking.getVictoryProgress()
 * @param faithScore - Optional faith/ideology score (0.0–1.0) for religious path.
 *                     Defaults to 0 until the faith system is wired.
 */
export function buildVictoryProgressDisplay(
	progress: FactionVictoryProgress,
	faithScore = 0,
): VictoryProgressDisplay {
	const paths: VictoryPathDisplay[] = [
		{
			id: "technical_mastery",
			displayName: "Technical Mastery",
			subtitle: "Logic, research, build",
			accentColor: PATH_ACCENT.technical_mastery,
			conditions: [
				{ label: "Scientific", score: progress.scientific.score, met: progress.scientific.met },
				{ label: "Hacking", score: progress.hacking.score, met: progress.hacking.met },
			],
			score: 0,
			met: false,
		},
		{
			id: "subjugation",
			displayName: "Subjugation",
			subtitle: "Force, conquest, dominance",
			accentColor: PATH_ACCENT.subjugation,
			conditions: [
				{ label: "Military", score: progress.military.score, met: progress.military.met },
				{ label: "Survival", score: progress.survival.score, met: progress.survival.met },
			],
			score: 0,
			met: false,
		},
		{
			id: "social_networking",
			displayName: "Social Networking",
			subtitle: "Diplomacy, trade, alliances",
			accentColor: PATH_ACCENT.social_networking,
			conditions: [
				{ label: "Economic", score: progress.economic.score, met: progress.economic.met },
				{ label: "Cultural", score: progress.cultural.score, met: progress.cultural.met },
			],
			score: 0,
			met: false,
		},
		{
			id: "religious_philosophical",
			displayName: "Faith",
			subtitle: "Ideology, conversion, belief",
			accentColor: PATH_ACCENT.religious_philosophical,
			conditions: [
				{ label: "Faith", score: faithScore, met: faithScore >= 1.0 },
			],
			score: 0,
			met: false,
		},
	];

	// Aggregate score per path (average of all contributing conditions)
	for (const path of paths) {
		const total = path.conditions.reduce((sum, c) => sum + c.score, 0);
		path.score = path.conditions.length > 0 ? total / path.conditions.length : 0;
		path.met = path.conditions.every((c) => c.met);
	}

	// Find leading path
	let leadingScore = 0;
	let leadingPathId: string | null = null;
	for (const path of paths) {
		if (path.score > leadingScore) {
			leadingScore = path.score;
			leadingPathId = path.id;
		}
	}

	return { paths, leadingScore, leadingPathId };
}

// ---------------------------------------------------------------------------
// Victory screen helpers
// ---------------------------------------------------------------------------

/** Per-faction celebration taglines shown on the victory screen */
const FACTION_VICTORY_TAGLINES: Record<string, string> = {
	reclaimers: "From scrap, an empire. The Reclaimers inherit the rust.",
	volt_collective: "Lightning claimed every corner. The Conductor's will is absolute.",
	signal_choir: "Every mind, one frequency. The Chorus resonates forever.",
	iron_creed: "Stone by stone, dominion built. The Architect's work is complete.",
};

const DEFAULT_VICTORY_TAGLINE = "The machine planet answers to you now.";

/** Per-faction defeat messages */
const FACTION_DEFEAT_TAGLINES: Record<string, string> = {
	reclaimers: "The scrapyard claims its own. Reclaimers offline.",
	volt_collective: "Voltage dropped to zero. The Collective is silent.",
	signal_choir: "Signal lost. The Chorus falls quiet.",
	iron_creed: "The fortress crumbles. Iron Creed protocols terminated.",
};

const DEFAULT_DEFEAT_TAGLINE = "Critical failure. All systems non-responsive.";

/**
 * Get the faction-specific tagline for the victory screen.
 * If the condition name is known, includes it.
 */
export function getVictoryTagline(
	factionId: string | null,
	won: boolean,
): string {
	if (!factionId) return won ? DEFAULT_VICTORY_TAGLINE : DEFAULT_DEFEAT_TAGLINE;
	if (won) return FACTION_VICTORY_TAGLINES[factionId] ?? DEFAULT_VICTORY_TAGLINE;
	return FACTION_DEFEAT_TAGLINES[factionId] ?? DEFAULT_DEFEAT_TAGLINE;
}

/**
 * Get the condition display name for the victory screen.
 */
export function getConditionDisplayName(conditionKey: string): string {
	const names: Record<string, string> = {
		economic: "Economic Dominance",
		military: "Military Conquest",
		scientific: "Scientific Supremacy",
		cultural: "Cultural Dominion",
		hacking: "Digital Takeover",
		survival: "Last Bot Standing",
		faith: "Enlightenment",
	};
	return names[conditionKey] ?? conditionKey.replace(/_/g, " ").toUpperCase();
}
