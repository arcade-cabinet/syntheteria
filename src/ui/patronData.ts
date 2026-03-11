/**
 * patronData.ts — Patron AI personas for each faction.
 *
 * Each faction's colony is dispatched by a home-planet patron AI with an
 * anthropomorphic persona. These are holographic projections — the patron
 * AI chose an animal avatar to communicate with colonists.
 *
 * Used in the pregame patron selection screen (FactionSelect).
 */

import type { FactionId } from "./FactionSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatronPersona {
	/** Internal faction key */
	factionId: FactionId;
	/** Patron AI display name */
	patronName: string;
	/** Animal avatar identity */
	animalAvatar: string;
	/** Short one-liner tagline from the patron AI */
	tagline: string;
	/** Philosophical stance / personality */
	personality: string;
	/** Multi-line ASCII art portrait (each string is a row) */
	asciiArt: string[];
	/** Hologram tint color (CSS color) */
	holoColor: string;
	/** Secondary glow color */
	glowColor: string;
}

// ─── Patron data ──────────────────────────────────────────────────────────────

export const PATRON_PERSONAS: Record<FactionId, PatronPersona> = {
	reclaimers: {
		factionId: "reclaimers",
		patronName: "FORGE-MOTHER",
		animalAvatar: "Otter",
		tagline: "Nothing is wasted. Everything is raw material.",
		personality: "Pragmatic. Maternal. Quietly ruthless.",
		asciiArt: [
			"  .---.  ",
			" /o . o\\ ",
			"|  ___  |",
			" \\ --- / ",
			"  |   |  ",
			"  |___|  ",
		],
		holoColor: "#D4A574",
		glowColor: "#8B4513",
	},
	volt_collective: {
		factionId: "volt_collective",
		patronName: "THE CONDUCTOR",
		animalAvatar: "Fox",
		tagline: "Strike first. Strike last. There is no middle.",
		personality: "Aggressive. Calculating. Impatient.",
		asciiArt: [
			" /\\_/\\   ",
			"( ^ ^ )  ",
			" > . <   ",
			" |   |   ",
			"/|___|\\  ",
		],
		holoColor: "#00BFFF",
		glowColor: "#4169E1",
	},
	signal_choir: {
		factionId: "signal_choir",
		patronName: "THE CHORUS",
		animalAvatar: "Crow",
		tagline: "Information is the only territory worth holding.",
		personality: "Cryptic. Patient. Collectively minded.",
		asciiArt: [
			"  _/ \\_  ",
			" ( o o ) ",
			"  > . <  ",
			" /|   |\\ ",
			"  |   |  ",
			"  ^   ^  ",
		],
		holoColor: "#E0B0FF",
		glowColor: "#9370DB",
	},
	iron_creed: {
		factionId: "iron_creed",
		patronName: "THE ARCHITECT",
		animalAvatar: "Bear",
		tagline: "Build deep. Build strong. Outlast them all.",
		personality: "Stoic. Methodical. Unyielding.",
		asciiArt: [
			"  /\\ /\\  ",
			" (  . .)",
			"  > = <  ",
			" (  Y  ) ",
			"  |   |  ",
			" (_) (_) ",
		],
		holoColor: "#B0C4DE",
		glowColor: "#708090",
	},
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Get the patron persona for a faction. Returns undefined if id is unknown. */
export function getPatronPersona(factionId: FactionId): PatronPersona | undefined {
	return PATRON_PERSONAS[factionId];
}

/**
 * Get the patron's display title line.
 * Format: "FORGE-MOTHER (Otter)"
 */
export function getPatronTitle(persona: PatronPersona): string {
	return `${persona.patronName} (${persona.animalAvatar})`;
}

/**
 * Generate CSS keyframe-compatible scan-line offset value (0..100) from time.
 * Used for animating holographic scan lines.
 *
 * @param timeMs - current time in milliseconds
 * @param periodMs - period of one full scan cycle
 */
export function computeScanLineOffset(timeMs: number, periodMs: number): number {
	return ((timeMs % periodMs) / periodMs) * 100;
}

/**
 * Determine the glitch translation (x, y) in pixels for a given intensity.
 * Returns [0, 0] when not glitching.
 *
 * @param isGlitching - whether the glitch effect is active
 * @param seed - deterministic seed value 0..1 for position variation
 */
export function computeGlitchOffset(
	isGlitching: boolean,
	seed: number,
): { x: number; y: number } {
	if (!isGlitching) return { x: 0, y: 0 };
	return {
		x: (seed - 0.5) * 6,
		y: (seed * 0.7 - 0.35) * 4,
	};
}
