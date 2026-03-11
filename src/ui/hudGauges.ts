/**
 * hudGauges.ts — Pure functions for HUD gauge rendering.
 *
 * These are extracted from components so they can be unit tested.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GaugeSegment {
	/** 0..1 fill ratio */
	fill: number;
	/** CSS color string */
	color: string;
	/** Accessible label */
	label: string;
}

export interface XPBarInfo {
	/** 0..1 progress within current level */
	levelProgress: number;
	level: number;
	xpCurrent: number;
	xpToNext: number;
	label: string;
}

// ─── Health gauge ─────────────────────────────────────────────────────────────

/**
 * Build a health gauge segment.
 *
 * Green when healthy (>60%), amber when injured (30–60%), red when critical (<30%).
 */
export function buildHealthGauge(health: number, maxHealth: number): GaugeSegment {
	const fill = maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;
	let color: string;
	if (fill > 0.6) {
		color = "#00ff88";
	} else if (fill > 0.3) {
		color = "#ffaa00";
	} else {
		color = "#ff4444";
	}
	return {
		fill,
		color,
		label: `Health: ${Math.round(health)} / ${Math.round(maxHealth)}`,
	};
}

// ─── Powder gauge ─────────────────────────────────────────────────────────────

/**
 * Build a powder gauge segment.
 *
 * Color represents how full the bot is. Ready-to-compress when full.
 */
export function buildPowderGauge(
	powderCurrent: number,
	powderCapacity: number,
	powderType: string,
): GaugeSegment {
	const fill =
		powderCapacity > 0 ? Math.max(0, Math.min(1, powderCurrent / powderCapacity)) : 0;
	// Gold when full (ready to compress), amber when partial, dim when empty
	const color = fill >= 1.0 ? "#ffdd00" : fill > 0.1 ? "#ffaa00" : "#ffaa0033";
	const typeLabel = powderType ? ` (${powderType.replace(/_/g, " ")})` : "";
	return {
		fill,
		color,
		label: `Powder${typeLabel}: ${powderCurrent.toFixed(1)} / ${powderCapacity}`,
	};
}

// ─── XP bar ──────────────────────────────────────────────────────────────────

/**
 * Build the XP bar display info.
 *
 * @param totalXP - cumulative XP earned.
 * @param xpToNextLevel - XP needed to reach next level.
 * @param level - current player level.
 */
export function buildXPBarInfo(
	totalXP: number,
	xpToNextLevel: number,
	level: number,
): XPBarInfo {
	// XP earned within this level = totalXP - XP required to reach current level
	// For simplicity the level formula is: level = floor(sqrt(totalXP / 100))
	// XP required to reach level L: L*L*100
	const xpForCurrentLevel = level * level * 100;
	const xpForNextLevel = (level + 1) * (level + 1) * 100;
	const xpWithinLevel = totalXP - xpForCurrentLevel;
	const xpNeeded = xpForNextLevel - xpForCurrentLevel;
	const levelProgress = xpNeeded > 0 ? Math.max(0, Math.min(1, xpWithinLevel / xpNeeded)) : 1;

	return {
		levelProgress,
		level,
		xpCurrent: Math.max(0, xpWithinLevel),
		xpToNext: xpToNextLevel,
		label: `Level ${level} — ${Math.round(xpWithinLevel)} / ${xpNeeded} XP`,
	};
}

// ─── Gauge fill percentage ────────────────────────────────────────────────────

/**
 * Convert a 0..1 fill ratio to a CSS percentage string.
 * Clamped to [0, 100].
 */
export function fillToCSSPercent(fill: number): string {
	return `${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%`;
}
