/**
 * AI diagnostics — debug logging for evaluator arbitration.
 */

import type { GoalEvaluator } from "yuka";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";

let _diagnosticsEnabled = false;

export function enableAIDiagnostics(enabled: boolean): void {
	_diagnosticsEnabled = enabled;
}

export function isAIDiagnosticsEnabled(): boolean {
	return _diagnosticsEnabled;
}

/**
 * Log which evaluator won arbitration for a given agent.
 * Called from the AI turn system after arbitrate().
 */
export function logEvaluatorChoice(
	agent: SyntheteriaAgent,
	evaluators: GoalEvaluator<SyntheteriaAgent>[],
): void {
	if (!_diagnosticsEnabled) return;

	const names = [
		"Attack",
		"Chase",
		"Harvest",
		"Expand",
		"Build",
		"Research",
		"Scout",
		"FloorMine",
		"Evade",
		"Interpose",
		"Wormhole",
		"Idle",
	];
	const scores: string[] = [];
	let bestIdx = 0;
	let bestScore = -1;

	for (let i = 0; i < evaluators.length; i++) {
		const desirability = evaluators[i].calculateDesirability(agent);
		const bias = evaluators[i].characterBias;
		const effective = desirability * bias;
		scores.push(
			`${names[i] ?? `E${i}`}=${effective.toFixed(2)}(d=${desirability.toFixed(2)}*b=${bias.toFixed(2)})`,
		);
		if (effective > bestScore) {
			bestScore = effective;
			bestIdx = i;
		}
	}

	console.log(
		`[AI] ${agent.factionId} unit@(${agent.tileX},${agent.tileZ}): ` +
			`CHOSE ${names[bestIdx] ?? `E${bestIdx}`} | ${scores.join(" ")}`,
	);
}
