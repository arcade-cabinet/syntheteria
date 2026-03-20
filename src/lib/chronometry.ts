/**
 * Chronometry — turn-to-time conversion for Syntheteria (future Earth).
 *
 * The orbital illuminator (artificial sun) circles the ecumenopolis
 * on a controlled schedule. One "day" = 12 game turns. One "year" = 48 turns
 * (4 seasons × 12 turns each).
 *
 * Both the sky and the floor lighting system consume these values:
 *   - dayAngle  → illuminator azimuth position [0, 2π]
 *   - season    → orbital year progress [0, 1]
 *
 * API:
 *   turnToChronometry(turn) → { dayAngle, season }
 *
 * Usage:
 *   import { turnToChronometry } from "../lib/chronometry";
 *   const { dayAngle, season } = turnToChronometry(turn);
 */

import * as THREE from "three";

/** Number of game turns per orbital illuminator cycle (one "day"). */
export const TURNS_PER_DAY = 12;

/** Number of game turns per orbital year (4 seasons). */
export const TURNS_PER_YEAR = 48;

export type Chronometry = {
	/** Orbital illuminator azimuth [0, 2π]. 0 = "east" reference. */
	dayAngle: number;
	/** Orbital year progress [0, 1]. 0=spring, 0.25=summer, 0.5=autumn, 0.75=winter. */
	season: number;
};

/**
 * Convert game turn number to chronometric values.
 *
 * Turn 1 = beginning of spring, illuminator at dayAngle=0.
 */
export function turnToChronometry(turn: number): Chronometry {
	const elapsed = turn - 1;
	const dayAngle = ((elapsed * (Math.PI * 2)) / TURNS_PER_DAY) % (Math.PI * 2);
	const season = (elapsed % TURNS_PER_YEAR) / TURNS_PER_YEAR;
	return { dayAngle, season };
}

// ---------------------------------------------------------------------------
// Illuminator position helpers (shared between sky and floor shader)
// ---------------------------------------------------------------------------

/**
 * Compute the normalized sun direction vector from chronometric values.
 *
 * The orbital illuminator's elevation varies seasonally:
 *   - Summer (season≈0.25): highest elevation (~41°)
 *   - Winter (season≈0.75): lowest elevation (~15°)
 */
export function computeSunDir(dayAngle: number, season: number): THREE.Vector3 {
	// sunElev is the Y component of the unit-sphere sun direction.
	// sin peaks at season=0.25 (summer) → high elevation.
	const sunElev = 0.45 + 0.2 * Math.sin(season * Math.PI * 2);
	const cosElev = Math.sqrt(Math.max(0, 1 - sunElev * sunElev));
	return new THREE.Vector3(
		Math.sin(dayAngle) * cosElev,
		sunElev,
		Math.cos(dayAngle) * cosElev,
	).normalize();
}

/**
 * Compute the orbital illuminator's light color.
 *
 * Machine planet: always cool blue-white (orbital array, not a natural star).
 * Summer adds a tiny warmth; winter is coldest.
 */
export function computeSunColor(season: number): THREE.Color {
	const warmth = 0.5 + 0.5 * Math.sin(season * Math.PI * 2);
	return new THREE.Color(
		0.545 + warmth * 0.08, // 0.545–0.625
		0.82 + warmth * 0.06, //  0.820–0.880
		1.0,
	);
}
