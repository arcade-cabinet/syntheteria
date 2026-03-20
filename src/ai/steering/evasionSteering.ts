/**
 * Evasion steering for faction units.
 *
 * When a faction unit is outnumbered by nearby cult enemies, it should
 * flee rather than stand and die. This module computes the flee direction
 * by averaging the vectors away from all nearby threats, weighted by
 * proximity (closer threats push harder).
 *
 * Integrates into the GOAP evaluator system as an EvadeEvaluator.
 */

export interface ThreatPos {
	x: number;
	z: number;
}

/**
 * Count how many threats are within a given radius of a position.
 */
export function countThreatsInRadius(
	unitX: number,
	unitZ: number,
	threats: ThreatPos[],
	radius: number,
): number {
	let count = 0;
	for (const t of threats) {
		const dist = Math.abs(unitX - t.x) + Math.abs(unitZ - t.z);
		if (dist <= radius) count++;
	}
	return count;
}

/**
 * Count how many allies are within a given radius of a position.
 */
export function countAlliesInRadius(
	unitX: number,
	unitZ: number,
	allies: ThreatPos[],
	radius: number,
): number {
	let count = 0;
	for (const a of allies) {
		const dist = Math.abs(unitX - a.x) + Math.abs(unitZ - a.z);
		if (dist <= radius && (a.x !== unitX || a.z !== unitZ)) count++;
	}
	return count;
}

/**
 * Compute a flee direction vector away from nearby threats.
 *
 * Each threat contributes a repulsion vector inversely proportional
 * to its distance. The result is a direction the unit should move
 * to escape the threat cluster.
 *
 * @returns Normalized flee direction (dx, dz), or (0, 0) if no threats.
 */
export function computeFleeDirection(
	unitX: number,
	unitZ: number,
	threats: ThreatPos[],
	fleeRadius: number,
): { dx: number; dz: number } {
	let fleeDx = 0;
	let fleeDz = 0;

	for (const t of threats) {
		const dx = unitX - t.x;
		const dz = unitZ - t.z;
		const dist = Math.abs(dx) + Math.abs(dz);
		if (dist > fleeRadius || dist === 0) continue;

		// Inverse distance weighting — closer threats push harder
		const weight = 1 / dist;
		fleeDx += Math.sign(dx) * weight;
		fleeDz += Math.sign(dz) * weight;
	}

	const len = Math.sqrt(fleeDx * fleeDx + fleeDz * fleeDz);
	if (len < 0.001) return { dx: 0, dz: 0 };

	return { dx: fleeDx / len, dz: fleeDz / len };
}

/**
 * Determine whether a faction unit should evade based on local force ratio.
 *
 * A unit should flee when:
 *   - There are cult enemies within scan range
 *   - The unit is outnumbered (threats > allies within scan range)
 *   - The unit's HP is below 50%
 *
 * @returns A desirability score 0-1 for evasion.
 */
export function computeEvadeDesirability(
	unitX: number,
	unitZ: number,
	hp: number,
	maxHp: number,
	scanRange: number,
	cultThreats: ThreatPos[],
	friendlyAllies: ThreatPos[],
): number {
	const nearbyThreats = countThreatsInRadius(
		unitX,
		unitZ,
		cultThreats,
		scanRange,
	);
	if (nearbyThreats === 0) return 0;

	const nearbyAllies = countAlliesInRadius(
		unitX,
		unitZ,
		friendlyAllies,
		scanRange,
	);

	// Force ratio: how outnumbered are we?
	// +1 to include self in ally count
	const allyCount = nearbyAllies + 1;
	const ratio = nearbyThreats / allyCount;

	// HP factor: low HP increases flee desire
	const hpFraction = maxHp > 0 ? hp / maxHp : 1;
	const hpPenalty = hpFraction < 0.5 ? 0.3 * (1 - hpFraction / 0.5) : 0;

	// Outnumbered 2:1 → base 0.7, 3:1 → 0.85, 1:1 → 0.2
	let base: number;
	if (ratio >= 3) {
		base = 0.85;
	} else if (ratio >= 2) {
		base = 0.5 + (ratio - 2) * 0.35;
	} else if (ratio > 1) {
		base = 0.2 + (ratio - 1) * 0.3;
	} else {
		// Not outnumbered — only flee if very low HP
		base = 0;
	}

	return Math.min(1, base + hpPenalty);
}
