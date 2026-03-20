/**
 * FuzzyModule for AI situation assessment.
 *
 * Replaces hard threshold checks in evaluators with fuzzy inference.
 * Three input variables (resourceLevel, threatProximity, territorySize)
 * are fuzzified, rules fire to produce output variable (actionDesirability),
 * and the defuzzified result modulates GoalEvaluator scores.
 *
 * Usage per turn:
 *   const scores = assessSituationFuzzy(resources, nearestEnemyDist, territoryPct);
 *   // scores.attackDesirability, scores.harvestDesirability, etc.
 */

import {
	FuzzyAND,
	FuzzyModule,
	FuzzyRule,
	FuzzyVariable,
	LeftShoulderFuzzySet,
	RightShoulderFuzzySet,
	TriangularFuzzySet,
} from "yuka";

// ---------------------------------------------------------------------------
// Module setup — built once, reused every turn
// ---------------------------------------------------------------------------

function buildFuzzyModule(): FuzzyModule {
	const fm = new FuzzyModule();

	// ── Input: Resource Level (0-100 normalized) ────────────────────────
	const resourceLevel = new FuzzyVariable();
	const resLow = new LeftShoulderFuzzySet(0, 15, 35);
	const resMedium = new TriangularFuzzySet(20, 50, 80);
	const resHigh = new RightShoulderFuzzySet(65, 85, 100);
	resourceLevel.add(resLow);
	resourceLevel.add(resMedium);
	resourceLevel.add(resHigh);
	fm.addFLV("resourceLevel", resourceLevel);

	// ── Input: Threat Proximity (0-30 Manhattan distance, lower = closer) ─
	const threatProximity = new FuzzyVariable();
	const threatClose = new LeftShoulderFuzzySet(0, 2, 6);
	const threatMedium = new TriangularFuzzySet(4, 10, 16);
	const threatFar = new RightShoulderFuzzySet(12, 20, 30);
	threatProximity.add(threatClose);
	threatProximity.add(threatMedium);
	threatProximity.add(threatFar);
	fm.addFLV("threatProximity", threatProximity);

	// ── Input: Territory Size (0-100 percent of board) ──────────────────
	const territorySize = new FuzzyVariable();
	const terSmall = new LeftShoulderFuzzySet(0, 5, 20);
	const terMedium = new TriangularFuzzySet(10, 30, 50);
	const terLarge = new RightShoulderFuzzySet(40, 60, 100);
	territorySize.add(terSmall);
	territorySize.add(terMedium);
	territorySize.add(terLarge);
	fm.addFLV("territorySize", territorySize);

	// ── Output: Attack Desirability (0-100) ─────────────────────────────
	const attackDesirability = new FuzzyVariable();
	const atkLow = new LeftShoulderFuzzySet(0, 15, 40);
	const atkMedium = new TriangularFuzzySet(25, 50, 75);
	const atkHigh = new RightShoulderFuzzySet(60, 85, 100);
	attackDesirability.add(atkLow);
	attackDesirability.add(atkMedium);
	attackDesirability.add(atkHigh);
	fm.addFLV("attackDesirability", attackDesirability);

	// ── Output: Harvest Desirability (0-100) ────────────────────────────
	const harvestDesirability = new FuzzyVariable();
	const harvLow = new LeftShoulderFuzzySet(0, 15, 40);
	const harvMedium = new TriangularFuzzySet(25, 50, 75);
	const harvHigh = new RightShoulderFuzzySet(60, 85, 100);
	harvestDesirability.add(harvLow);
	harvestDesirability.add(harvMedium);
	harvestDesirability.add(harvHigh);
	fm.addFLV("harvestDesirability", harvestDesirability);

	// ── Output: Expand Desirability (0-100) ─────────────────────────────
	const expandDesirability = new FuzzyVariable();
	const expLow = new LeftShoulderFuzzySet(0, 15, 40);
	const expMedium = new TriangularFuzzySet(25, 50, 75);
	const expHigh = new RightShoulderFuzzySet(60, 85, 100);
	expandDesirability.add(expLow);
	expandDesirability.add(expMedium);
	expandDesirability.add(expHigh);
	fm.addFLV("expandDesirability", expandDesirability);

	// ── Rules ───────────────────────────────────────────────────────────
	// Attack rules
	fm.addRule(new FuzzyRule(threatClose, atkHigh)); // Close threat → attack high
	fm.addRule(new FuzzyRule(threatMedium, atkMedium)); // Medium threat → attack medium
	fm.addRule(new FuzzyRule(threatFar, atkLow)); // Far threat → attack low
	fm.addRule(new FuzzyRule(new FuzzyAND(threatClose, resHigh), atkHigh)); // Close + rich → attack
	fm.addRule(new FuzzyRule(new FuzzyAND(threatClose, resLow), atkMedium)); // Close + poor → cautious

	// Harvest rules
	fm.addRule(new FuzzyRule(resLow, harvHigh)); // Low resources → harvest high
	fm.addRule(new FuzzyRule(resMedium, harvMedium)); // Medium resources → harvest medium
	fm.addRule(new FuzzyRule(resHigh, harvLow)); // High resources → harvest low
	fm.addRule(new FuzzyRule(new FuzzyAND(resLow, threatFar), harvHigh)); // Poor + safe → harvest aggressively

	// Expand rules
	fm.addRule(new FuzzyRule(terSmall, expHigh)); // Small territory → expand high
	fm.addRule(new FuzzyRule(terMedium, expMedium)); // Medium territory → expand medium
	fm.addRule(new FuzzyRule(terLarge, expLow)); // Large territory → expand low
	fm.addRule(new FuzzyRule(new FuzzyAND(terSmall, threatFar), expHigh)); // Small + safe → expand
	fm.addRule(new FuzzyRule(new FuzzyAND(terSmall, threatClose), expLow)); // Small + danger → don't expand

	return fm;
}

// Singleton module — rules and variables are stateless between fuzzify calls
const _module = buildFuzzyModule();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FuzzyScores {
	attackDesirability: number;
	harvestDesirability: number;
	expandDesirability: number;
}

/**
 * Run fuzzy inference for a faction's current situation.
 *
 * @param totalResources - Normalized resource score (0-100)
 * @param nearestEnemyDist - Manhattan distance to nearest enemy (0-30+)
 * @param territoryPercent - Percentage of board tiles claimed (0-100)
 * @returns Crisp desirability scores (0-100) for attack, harvest, expand
 */
export function assessSituationFuzzy(
	totalResources: number,
	nearestEnemyDist: number,
	territoryPercent: number,
): FuzzyScores {
	// Clamp inputs to valid ranges
	const res = Math.max(0, Math.min(100, totalResources));
	const dist = Math.max(0, Math.min(30, nearestEnemyDist));
	const ter = Math.max(0, Math.min(100, territoryPercent));

	_module.fuzzify("resourceLevel", res);
	_module.fuzzify("threatProximity", dist);
	_module.fuzzify("territorySize", ter);

	return {
		attackDesirability: _module.defuzzify("attackDesirability"),
		harvestDesirability: _module.defuzzify("harvestDesirability"),
		expandDesirability: _module.defuzzify("expandDesirability"),
	};
}
