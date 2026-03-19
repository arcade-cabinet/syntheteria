/**
 * Interpose steering for support units.
 *
 * Adapts Yuka's InterposeBehavior to discrete tile-grid movement.
 * A support unit positions itself at the midpoint between an ally
 * and a threat, acting as a shield/buffer. This is the COMPANION
 * bot's primary defensive behavior.
 *
 * In our turn-based grid system, we compute the midpoint between
 * the threatened ally and the nearest threat, then pick the neighbor
 * tile closest to that midpoint.
 */

import type { TilePos } from "./flockingSteering";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnitInfo {
	entityId: number;
	x: number;
	z: number;
	hp: number;
	factionId: string;
}

// ---------------------------------------------------------------------------
// Core interpose computation
// ---------------------------------------------------------------------------

/**
 * Find the ally most in need of protection.
 *
 * Criteria:
 *   1. Ally has an enemy within attack range (under immediate threat)
 *   2. Prefer lowest HP ally (most vulnerable)
 *   3. Must be within the support unit's scan range
 *
 * @param supportX - Support unit's tile X.
 * @param supportZ - Support unit's tile Z.
 * @param scanRange - Support unit's scan range.
 * @param allies - Friendly units (same faction).
 * @param enemies - Hostile units within visibility.
 * @returns The ally to protect and the threat to interpose against, or null.
 */
export function findInterposeTarget(
	supportX: number,
	supportZ: number,
	scanRange: number,
	allies: UnitInfo[],
	enemies: UnitInfo[],
): { ally: UnitInfo; threat: UnitInfo } | null {
	if (allies.length === 0 || enemies.length === 0) return null;

	let bestAlly: UnitInfo | null = null;
	let bestThreat: UnitInfo | null = null;
	let bestScore = -Infinity;

	for (const ally of allies) {
		// Skip self
		const distToAlly = Math.abs(supportX - ally.x) + Math.abs(supportZ - ally.z);
		if (distToAlly === 0) continue;
		if (distToAlly > scanRange) continue;

		// Find nearest enemy to this ally
		let nearestEnemy: UnitInfo | null = null;
		let nearestEnemyDist = Infinity;
		for (const enemy of enemies) {
			const dist = Math.abs(ally.x - enemy.x) + Math.abs(ally.z - enemy.z);
			if (dist < nearestEnemyDist) {
				nearestEnemyDist = dist;
				nearestEnemy = enemy;
			}
		}

		if (!nearestEnemy) continue;

		// Score: prioritize allies under immediate threat (enemy within 3 tiles)
		// and with lower HP
		const threatProximity = nearestEnemyDist <= 3 ? 100 : 0;
		const hpUrgency = 100 - ally.hp * 10; // Lower HP = higher urgency
		const distPenalty = distToAlly * 2; // Prefer closer allies

		const score = threatProximity + hpUrgency - distPenalty;

		if (score > bestScore) {
			bestScore = score;
			bestAlly = ally;
			bestThreat = nearestEnemy;
		}
	}

	if (!bestAlly || !bestThreat) return null;
	return { ally: bestAlly, threat: bestThreat };
}

/**
 * Compute the interpose position — midpoint between ally and threat.
 *
 * Like Yuka's InterposeBehavior, we find the point between the two
 * entities where the support unit should position itself.
 */
export function computeInterposePoint(
	ally: TilePos,
	threat: TilePos,
): TilePos {
	return {
		x: Math.round((ally.x + threat.x) / 2),
		z: Math.round((ally.z + threat.z) / 2),
	};
}

/**
 * Pick the best tile for a support unit to interpose between ally and threat.
 *
 * @param unitPos - Support unit's current position.
 * @param ally - The ally to protect.
 * @param threat - The threat to interpose against.
 * @param candidates - Available neighbor tiles.
 * @returns Best tile to move to, or null.
 */
export function pickInterposeTile(
	unitPos: TilePos,
	ally: TilePos,
	threat: TilePos,
	candidates: TilePos[],
): TilePos | null {
	if (candidates.length === 0) return null;
	if (candidates.length === 1) return candidates[0];

	const midpoint = computeInterposePoint(ally, threat);

	// Direction toward midpoint
	const dx = midpoint.x - unitPos.x;
	const dz = midpoint.z - unitPos.z;
	const len = Math.sqrt(dx * dx + dz * dz);

	if (len < 0.001) {
		// Already at midpoint — stay put (return closest candidate to current pos)
		return candidates[0];
	}

	const dirX = dx / len;
	const dirZ = dz / len;

	let bestTile = candidates[0];
	let bestScore = -Infinity;

	for (const tile of candidates) {
		const tdx = tile.x - unitPos.x;
		const tdz = tile.z - unitPos.z;
		const tLen = Math.sqrt(tdx * tdx + tdz * tdz);
		if (tLen === 0) continue;

		// Score by alignment with direction to midpoint
		const dot = (tdx / tLen) * dirX + (tdz / tLen) * dirZ;

		// Bonus for being close to the midpoint itself
		const distToMid = Math.abs(tile.x - midpoint.x) + Math.abs(tile.z - midpoint.z);
		const midBonus = 1 / (1 + distToMid);

		const score = dot + midBonus * 0.5;

		if (score > bestScore) {
			bestScore = score;
			bestTile = tile;
		}
	}

	return bestTile;
}

/**
 * Compute interpose desirability for the GOAP evaluator.
 *
 * High when a nearby ally is threatened and the support unit can help.
 * Zero when no allies are threatened or no enemies visible.
 */
export function computeInterposeDesirability(
	supportX: number,
	supportZ: number,
	scanRange: number,
	allies: UnitInfo[],
	enemies: UnitInfo[],
): number {
	const target = findInterposeTarget(
		supportX,
		supportZ,
		scanRange,
		allies,
		enemies,
	);
	if (!target) return 0;

	// Check if the threat is close to the ally (immediate danger)
	const threatDist =
		Math.abs(target.ally.x - target.threat.x) +
		Math.abs(target.ally.z - target.threat.z);

	// Higher desirability when ally is under immediate threat
	if (threatDist <= 2) return 0.9;
	if (threatDist <= 4) return 0.7;
	return 0.4;
}
