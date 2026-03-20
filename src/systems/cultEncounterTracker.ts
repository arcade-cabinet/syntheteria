/**
 * @module cultEncounterTracker
 *
 * Tracks which encounter events have fired (one-time triggers).
 *
 * Epoch-aware:
 *   Epochs 1-2 → hostile *human* encounters (same mechanics, different names)
 *   Epoch 3    → EL arrival transition event fires once
 *   Epoch 3+   → cult encounters (existing system)
 *
 * Systems call `fireCultEncounter` — it checks epoch, routes to the
 * appropriate encounter set, and fires toast + turn event once.
 */

import type { World } from "koota";
import { computeEpoch, getCultEncounter, getHumanEncounter } from "../config";
import type { CultEncounterTrigger } from "../config/cultEncounterDefs";
import type { HumanEncounterTrigger } from "../config/humanEncounterDefs";
import { Board, CultStructure } from "../traits";
import { pushTurnEvent } from "../ui/game/turnEvents";
import { pushToast } from "./toastNotifications";

const firedEncounters = new Set<CultEncounterTrigger>();
const firedHumanEncounters = new Set<HumanEncounterTrigger>();
let elArrivalFired = false;

/** Map from cult encounter triggers to human equivalents (Epochs 1-2). */
const CULT_TO_HUMAN_MAP: Partial<
	Record<CultEncounterTrigger, HumanEncounterTrigger>
> = {
	first_cult_sighting: "first_human_sighting",
	first_cult_structure: "human_city_found",
	cult_war_party: "human_attack",
};

/**
 * Attempt to fire a cult encounter. Returns true if it fired (first time),
 * false if already fired or epoch requirement not met.
 *
 * In Epochs 1-2, cult triggers are re-routed to human-themed equivalents.
 * In Epoch 3+, the original cult encounter fires.
 */
export function fireCultEncounter(
	world: World,
	trigger: CultEncounterTrigger,
): boolean {
	if (firedEncounters.has(trigger)) return false;

	const currentTurn = readCurrentTurn(world);
	const epoch = computeEpoch(1, currentTurn);

	if (epoch.number < 3) {
		const humanTrigger = CULT_TO_HUMAN_MAP[trigger];
		if (humanTrigger) {
			return fireHumanEncounter(world, humanTrigger);
		}
		return false;
	}

	const encounter = getCultEncounter(trigger);
	if (!encounter) return false;
	if (epoch.number < encounter.minEpoch) return false;

	firedEncounters.add(trigger);
	pushToast("combat", encounter.title, encounter.toastMessage, 6000);
	pushTurnEvent(`[CULT] ${encounter.title}: ${encounter.description}`);
	return true;
}

/**
 * Fire a human-themed encounter (Epochs 1-2 only). One-time per trigger.
 */
export function fireHumanEncounter(
	world: World,
	trigger: HumanEncounterTrigger,
): boolean {
	if (firedHumanEncounters.has(trigger)) return false;

	const encounter = getHumanEncounter(trigger);
	if (!encounter) return false;

	firedHumanEncounters.add(trigger);
	pushToast("combat", encounter.title, encounter.toastMessage, 6000);
	pushTurnEvent(`[HUMAN] ${encounter.title}: ${encounter.description}`);
	return true;
}

/**
 * Fire the EL arrival transition event — the biggest moment in the game.
 * Call this when epoch transitions to 3. Fires exactly once.
 */
export function fireELArrival(world: World): boolean {
	if (elArrivalFired) return false;
	elArrivalFired = true;

	const encounter = getHumanEncounter("el_arrival");
	if (!encounter) return false;

	pushToast("turn", encounter.title, encounter.toastMessage, 12000);
	pushToast(
		"system",
		"🌀 The Transformation",
		"All hostile human settlements are now converting to the Cult of EL. The EL's noncorporeal influence rewrites their minds.",
		10000,
	);
	pushTurnEvent(`[EL ARRIVAL] ${encounter.title}: ${encounter.description}`);
	return true;
}

/** Check whether the EL arrival event has fired. */
export function hasELArrivalFired(): boolean {
	return elArrivalFired;
}

/** Check if all cult structures are destroyed → fire "all_cults_destroyed". */
export function checkAllCultsDestroyed(world: World): void {
	let hasAliveCultStructure = false;
	for (const e of world.query(CultStructure)) {
		const s = e.get(CultStructure);
		if (s && s.hp > 0) {
			hasAliveCultStructure = true;
			break;
		}
	}
	if (!hasAliveCultStructure) {
		fireCultEncounter(world, "all_cults_destroyed");
	}
}

export function hasFiredEncounter(trigger: CultEncounterTrigger): boolean {
	return firedEncounters.has(trigger);
}

export function hasFiredHumanEncounter(
	trigger: HumanEncounterTrigger,
): boolean {
	return firedHumanEncounters.has(trigger);
}

/** Reset all fired encounter state — for tests and game restart. */
export function _resetCultEncounters(): void {
	firedEncounters.clear();
	firedHumanEncounters.clear();
	elArrivalFired = false;
}

function readCurrentTurn(world: World): number {
	for (const e of world.query(Board)) {
		const b = e.get(Board);
		if (b) return b.turn;
	}
	return 1;
}
