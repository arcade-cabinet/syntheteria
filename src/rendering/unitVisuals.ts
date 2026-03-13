/**
 * Pure logic for unit visual properties.
 *
 * Badge colors map Mark levels (I–V) to distinct colors.
 * Damage ratio drives visual degradation (desaturation, glow reduction).
 * Cultist identity provides distinct tint for cultist-faction units.
 *
 * All functions are pure — no side effects, no ECS reads.
 */

/** Mark level badge colors: I=white, II=green, III=blue, IV=purple, V=gold */
export const MARK_BADGE_COLORS: Record<number, number> = {
	1: 0xffffff, // white
	2: 0x44ff44, // green
	3: 0x4488ff, // blue
	4: 0xaa44ff, // purple
	5: 0xffd700, // gold
};

/** Roman numeral labels for Mark levels */
export const MARK_LABELS: Record<number, string> = {
	1: "I",
	2: "II",
	3: "III",
	4: "IV",
	5: "V",
};

/** Cultist faction visual tint (red-purple) */
export const CULTIST_TINT = 0xcc2255;

/** Cultist emissive glow color */
export const CULTIST_EMISSIVE = 0x660022;

/** Cultist aura particle color */
export const CULTIST_AURA_COLOR = 0xff2266;

/**
 * Get the badge color for a given Mark level.
 * Returns null for invalid levels (<=0 or >5).
 */
export function getBadgeColor(markLevel: number): number | null {
	if (markLevel < 1 || markLevel > 5) return null;
	return MARK_BADGE_COLORS[markLevel] ?? null;
}

/**
 * Get the Roman numeral label for a given Mark level.
 * Returns null for invalid levels.
 */
export function getBadgeLabel(markLevel: number): string | null {
	if (markLevel < 1 || markLevel > 5) return null;
	return MARK_LABELS[markLevel] ?? null;
}

/**
 * Calculate the damage ratio from a unit's component list.
 * Returns 0.0 (fully functional) to 1.0 (all components broken).
 * Returns 0 if the unit has no components.
 */
export function getDamageRatio(components: { functional: boolean }[]): number {
	if (components.length === 0) return 0;
	const broken = components.filter((c) => !c.functional).length;
	return broken / components.length;
}

/**
 * Determine if a unit should display the cultist visual identity.
 * Cultist and rogue factions get the distinct cultist tint.
 */
export function isCultistVisual(faction: string): boolean {
	return faction === "cultist" || faction === "rogue";
}

/**
 * Get visual degradation parameters based on damage ratio.
 * - opacity: 1.0 at 0 damage, 0.5 at full damage
 * - glowIntensity: 1.0 at 0 damage, 0.1 at full damage
 * - desaturation: 0.0 at 0 damage, 0.8 at full damage
 * - sparking: true when damage ratio >= 0.5
 */
export function getDamageVisuals(damageRatio: number): {
	opacity: number;
	glowIntensity: number;
	desaturation: number;
	sparking: boolean;
} {
	const clamped = Math.max(0, Math.min(1, damageRatio));
	return {
		opacity: 1.0 - clamped * 0.5,
		glowIntensity: 1.0 - clamped * 0.9,
		desaturation: clamped * 0.8,
		sparking: clamped >= 0.5,
	};
}
