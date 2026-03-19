/**
 * Combat evaluation — army strength comparison before initiating combat.
 *
 * Before attacking, evaluate:
 *   my army strength vs theirs (sum of attack * HP for each unit)
 *   - Attack if strength ratio > ATTACK_THRESHOLD (0.7)
 *   - Retreat if ratio < RETREAT_THRESHOLD (0.3)
 *   - Hold position otherwise
 *
 * This prevents suicide attacks and encourages massing forces.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum strength ratio to initiate an attack. */
const ATTACK_THRESHOLD = 0.7;

/** Below this ratio, units should retreat. */
const RETREAT_THRESHOLD = 0.3;

/** Max distance to consider units as "nearby" for local force evaluation. */
const LOCAL_FORCE_RADIUS = 6;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CombatUnit {
	x: number;
	z: number;
	attack: number;
	hp: number;
	defense: number;
}

export type CombatDecision = "attack" | "retreat" | "hold";

export interface CombatEvalResult {
	decision: CombatDecision;
	/** My total army strength (attack * HP). */
	myStrength: number;
	/** Enemy total army strength (attack * HP). */
	enemyStrength: number;
	/** Ratio: myStrength / enemyStrength. */
	ratio: number;
}

// ---------------------------------------------------------------------------
// Army strength calculation
// ---------------------------------------------------------------------------

/**
 * Compute army strength as sum of (attack * HP) for each unit.
 * Defense adds a 10% bonus per point (effective HP multiplier).
 */
export function computeArmyStrength(units: ReadonlyArray<CombatUnit>): number {
	let strength = 0;
	for (const u of units) {
		const effectiveHp = u.hp * (1 + u.defense * 0.1);
		strength += u.attack * effectiveHp;
	}
	return strength;
}

/**
 * Compute strength of units within LOCAL_FORCE_RADIUS of a position.
 * Used for local tactical decisions (should THIS unit engage?).
 */
export function computeLocalStrength(
	units: ReadonlyArray<CombatUnit>,
	centerX: number,
	centerZ: number,
): number {
	let strength = 0;
	for (const u of units) {
		const dist = Math.abs(u.x - centerX) + Math.abs(u.z - centerZ);
		if (dist <= LOCAL_FORCE_RADIUS) {
			const effectiveHp = u.hp * (1 + u.defense * 0.1);
			strength += u.attack * effectiveHp;
		}
	}
	return strength;
}

// ---------------------------------------------------------------------------
// Combat decision
// ---------------------------------------------------------------------------

/**
 * Evaluate whether to attack, retreat, or hold based on army strength ratio.
 *
 * @param myUnits   Friendly units in the engagement zone
 * @param enemyUnits Enemy units in the engagement zone
 * @returns CombatEvalResult with decision and strength data
 */
export function evaluateCombat(
	myUnits: ReadonlyArray<CombatUnit>,
	enemyUnits: ReadonlyArray<CombatUnit>,
): CombatEvalResult {
	const myStrength = computeArmyStrength(myUnits);
	const enemyStrength = computeArmyStrength(enemyUnits);

	// Avoid division by zero — if enemy has no strength, always attack
	if (enemyStrength === 0) {
		return { decision: "attack", myStrength, enemyStrength, ratio: Infinity };
	}

	// If we have no strength, retreat
	if (myStrength === 0) {
		return { decision: "retreat", myStrength, enemyStrength, ratio: 0 };
	}

	const ratio = myStrength / enemyStrength;

	let decision: CombatDecision;
	if (ratio >= ATTACK_THRESHOLD) {
		decision = "attack";
	} else if (ratio < RETREAT_THRESHOLD) {
		decision = "retreat";
	} else {
		decision = "hold";
	}

	return { decision, myStrength, enemyStrength, ratio };
}

/**
 * Evaluate local combat around a specific unit's position.
 * Considers only units within LOCAL_FORCE_RADIUS.
 */
export function evaluateLocalCombat(
	unitX: number,
	unitZ: number,
	allFriendlies: ReadonlyArray<CombatUnit>,
	allEnemies: ReadonlyArray<CombatUnit>,
): CombatEvalResult {
	const myStrength = computeLocalStrength(allFriendlies, unitX, unitZ);
	const enemyStrength = computeLocalStrength(allEnemies, unitX, unitZ);

	if (enemyStrength === 0) {
		return { decision: "attack", myStrength, enemyStrength, ratio: Infinity };
	}
	if (myStrength === 0) {
		return { decision: "retreat", myStrength, enemyStrength, ratio: 0 };
	}

	const ratio = myStrength / enemyStrength;

	let decision: CombatDecision;
	if (ratio >= ATTACK_THRESHOLD) {
		decision = "attack";
	} else if (ratio < RETREAT_THRESHOLD) {
		decision = "retreat";
	} else {
		decision = "hold";
	}

	return { decision, myStrength, enemyStrength, ratio };
}

// Re-export thresholds for testing
export { ATTACK_THRESHOLD, RETREAT_THRESHOLD, LOCAL_FORCE_RADIUS };
